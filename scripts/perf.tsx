/**
 * Live frame-time harness on the real window (not the offscreen renderer).
 * `bun scripts/perf.tsx [slug...] [--label name] [--settle ms] [--idle ms] [--sweep ms]
 * [--wait-visible seconds] [--foreground]`
 *
 * Spawns `FF_PERF=1 bun src/main.tsx` (see src/lib/perf.ts), and for every
 * page mounts it, settles, then measures 3 s idle and 3 s of a pointer sweep
 * over the sidebar. Without slugs it measures every page. Writes
 * `perf/<label>.json` and prints a table ranked by sweep draw p95.
 */
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { loadavg } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import type {
	Distribution,
	MountResult,
	PerfMessage,
	PerfPage,
	PerfPhase,
	PerfRequest,
	PhaseResult,
} from '#/lib/perf';

const root = new URL('..', import.meta.url).pathname;

const args = parseArgs({
	allowPositionals: true,
	options: {
		label: { type: 'string' },
		settle: { type: 'string', default: '1500' },
		idle: { type: 'string', default: '3000' },
		sweep: { type: 'string', default: '3000' },
		'wait-visible': { type: 'string', default: '0' },
		foreground: { type: 'boolean', default: false },
	},
});
const settleMs = Number(args.values.settle);
const idleMs = Number(args.values.idle);
const sweepMs = Number(args.values.sweep);
const waitVisibleMs = Number(args.values['wait-visible']) * 1000;
const label =
	args.values.label ?? new Date().toISOString().replace(/[:.]/g, '-');
const REQUEST_TIMEOUT_MS = 60_000;

function releaseAddon(): string {
	const native = resolve(root, 'node_modules/@ghia/native');
	const addon = readdirSync(native).find((file) => file.endsWith('.node'));
	if (addon === undefined) throw new Error(`no .node addon in ${native}`);
	const size = statSync(join(native, addon)).size;
	const targets = resolve(native, 'target');
	const matches: string[] = [];
	for (const file of new Bun.Glob('**/libgpuix_native.{dylib,so}').scanSync({
		cwd: targets,
	})) {
		if (statSync(join(targets, file)).size === size) {
			matches.push(file.includes('/debug/') ? 'debug' : 'release');
		}
	}
	if (matches.includes('debug') && !matches.includes('release')) {
		throw new Error(
			`${addon} is a debug build (same size as target/**/debug): frame times would be meaningless. Rebuild gpuix with build:release.`,
		);
	}
	if (!matches.includes('release')) {
		throw new Error(
			`${addon} matches no cargo release artifact by size; cannot confirm it is a release build`,
		);
	}
	return `${addon} (${size} bytes, same size as the cargo release artifact)`;
}

const addon = releaseAddon();

type ReadyMessage = Extract<PerfMessage, { type: 'ready' }>;

type RequestBody =
	| { type: 'mount'; slug: string }
	| { type: 'activate' }
	| { type: 'measure'; phase: PerfPhase; label: string; ms: number };

type App = {
	ready: ReadyMessage;
	request: <Result>(body: RequestBody) => Promise<Result>;
	/** Metal encode times between the app's begin/end markers for a phase label. */
	encodeSamples: Map<string, number[]>;
	/** Rejects when the app exits on its own. */
	exited: Promise<never>;
	kill: () => void;
};

/** Starts one app window and waits for its harness to report ready. */
async function launchApp(): Promise<App> {
	const encodeSamples = new Map<string, number[]>();
	const pending = new Map<
		number,
		{ resolve: (value: unknown) => void; reject: (error: Error) => void }
	>();
	let activePhase: string | undefined;
	let nextId = 1;
	let onReady: ((message: ReadyMessage) => void) | undefined;
	let earlyReady: ReadyMessage | undefined;

	const child = Bun.spawn(['bun', 'src/main.tsx'], {
		cwd: root,
		env: {
			...process.env,
			FF_PERF: '1',
			GPUIX_BACKGROUND: '1',
			GPUIX_RENDER_STATS: '1',
			FF_PERF_FOREGROUND: args.values.foreground ? '1' : '0',
		},
		stdin: 'ignore',
		stdout: 'inherit',
		stderr: 'pipe',
		ipc(message: PerfMessage) {
			if (message.type === 'ready') {
				if (onReady === undefined) earlyReady = message;
				else onReady(message);
				return;
			}
			const waiter = pending.get(message.id);
			if (waiter === undefined) return;
			pending.delete(message.id);
			if (message.type === 'error') waiter.reject(new Error(message.message));
			else waiter.resolve(message.result);
		},
	});

	function onStderrLine(line: string) {
		const marker = /^\[ffperf\] (begin|end) (.+)$/.exec(line);
		if (marker !== null) {
			if (marker[1] === 'begin') {
				activePhase = marker[2];
				encodeSamples.set(activePhase, []);
			} else {
				activePhase = undefined;
			}
			return;
		}
		const render = /^\[gpuix-render\] .*encode_ms=([\d.]+)/.exec(line);
		if (render !== null) {
			if (activePhase !== undefined) {
				encodeSamples.get(activePhase)?.push(Number(render[1]));
			}
			return;
		}
		console.error(line);
	}

	void (async () => {
		const decoder = new TextDecoder();
		let buffer = '';
		for await (const chunk of child.stderr) {
			buffer += decoder.decode(chunk, { stream: true });
			for (;;) {
				const newline = buffer.indexOf('\n');
				if (newline === -1) break;
				onStderrLine(buffer.slice(0, newline));
				buffer = buffer.slice(newline + 1);
			}
		}
	})();

	const exited = child.exited.then((code): never => {
		for (const waiter of pending.values()) {
			waiter.reject(new Error(`the app exited with code ${code}`));
		}
		throw new Error(`the app exited with code ${code}`);
	});
	exited.catch(() => {});

	const request = <Result,>(body: RequestBody) => {
		const id = nextId++;
		return new Promise<Result>((resolvePromise, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(
					new Error(
						`no reply to ${JSON.stringify(body)} in ${REQUEST_TIMEOUT_MS} ms`,
					),
				);
			}, REQUEST_TIMEOUT_MS);
			pending.set(id, {
				resolve: (value) => {
					clearTimeout(timer);
					resolvePromise(value as Result);
				},
				reject: (error) => {
					clearTimeout(timer);
					reject(error);
				},
			});
			child.send({ id, ...body } satisfies PerfRequest);
		});
	};

	const ready = await Promise.race([
		new Promise<ReadyMessage>((resolveReady) => {
			if (earlyReady !== undefined) resolveReady(earlyReady);
			else onReady = resolveReady;
		}),
		exited,
	]);
	return { ready, request, encodeSamples, exited, kill: () => child.kill() };
}

const sleep = (ms: number) =>
	new Promise<void>((resolvePromise) => setTimeout(resolvePromise, ms));

type EncodedPhase = PhaseResult & {
	/** Metal frames encoded in the phase, from GPUIX_RENDER_STATS. */
	presented: number;
	encode: Distribution | null;
};

function percentile(values: number[], percent: number) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(((sorted.length - 1) * percent) / 100)];
}

function encodeDistribution(values: number[] | undefined): Distribution | null {
	if (values === undefined || values.length === 0) return null;
	return {
		n: values.length,
		p50: percentile(values, 50),
		p95: percentile(values, 95),
		p99: percentile(values, 99),
		max: Math.max(...values),
		mean: values.reduce((sum, value) => sum + value, 0) / values.length,
	};
}

async function measure(
	app: App,
	page: PerfPage,
	phase: PerfPhase,
	ms: number,
): Promise<EncodedPhase> {
	const phaseLabel = `${page.slug}:${phase}`;
	const result = await app.request<PhaseResult>({
		type: 'measure',
		phase,
		label: phaseLabel,
		ms,
	});
	// stderr and IPC are separate pipes: give the last encode lines a moment.
	await sleep(100);
	const encoded = app.encodeSamples.get(phaseLabel);
	if (encoded === undefined) {
		throw new Error(`no begin marker for ${phaseLabel} on stderr`);
	}
	return {
		...result,
		presented: encoded.length,
		encode: encodeDistribution(encoded),
	};
}

type PageResult = {
	slug: string;
	kind: PerfPage['kind'];
	sidebar: boolean;
	retained: number;
	idle: EncodedPhase;
	sweep: EncodedPhase;
};

const MAX_PAGE_ATTEMPTS = 3;

/**
 * One page, fresh: mount, settle, idle, sweep. An occluded window loses its
 * display link, so draws then only happen inside the injected pointer calls,
 * nothing reaches Metal, and the numbers say nothing about the frame loop:
 * `undefined` means that happened and the caller should look again.
 */
async function measurePage(
	app: App,
	page: PerfPage,
): Promise<PageResult | undefined> {
	const mounted = await app.request<MountResult>({
		type: 'mount',
		slug: page.slug,
	});
	await sleep(settleMs);
	const idle = await measure(app, page, 'idle', idleMs);
	const sweep = await measure(app, page, 'sweep', sweepMs);
	if (sweep.frames > 0 && sweep.presented === 0) return undefined;
	return {
		slug: page.slug,
		kind: page.kind,
		sidebar: page.sidebar,
		retained: mounted.retained,
		idle,
		sweep,
	};
}

let app = await launchApp();
const watchdog = setTimeout(
	() => {
		console.error('perf: watchdog fired');
		app.kill();
		process.exit(2);
	},
	3 * 60 * 60 * 1000,
);

try {
	const available = app.ready.pages;
	const requested = args.positionals;
	const pages =
		requested.length === 0
			? available
			: requested.map((slug) => {
					const page = available.find((candidate) => candidate.slug === slug);
					if (page === undefined) {
						throw new Error(
							`unknown slug "${slug}"; known: ${available.map((candidate) => candidate.slug).join(', ')}`,
						);
					}
					return page;
				});
	console.error(`perf: ${pages.length} pages, label ${label}, ${addon}`);

	const results: PageResult[] = [];
	for (const [index, page] of pages.entries()) {
		const occludedUntil = Date.now() + waitVisibleMs;
		let attempts = 0;
		let result: PageResult | undefined;
		while (result === undefined) {
			try {
				result = await Promise.race([measurePage(app, page), app.exited]);
			} catch (error) {
				// A stuck or dead window poisons the next page too: start over.
				attempts++;
				console.error(`perf: ${page.slug}: ${String(error)}`);
				if (attempts >= MAX_PAGE_ATTEMPTS) throw error;
				app.kill();
				app = await launchApp();
				continue;
			}
			if (result !== undefined) break;
			if (Date.now() > occludedUntil) {
				throw new Error(
					`${page.slug}: the window drew but nothing reached Metal: it is occluded (covered by another window, on another Space, or the display is off). Uncover it, or raise --wait-visible.`,
				);
			}
			console.error(`perf: ${page.slug}: window occluded, retrying`);
			if (args.values.foreground) await app.request<null>({ type: 'activate' });
			await sleep(2000);
		}
		results.push(result);
		console.error(
			`perf: ${index + 1}/${pages.length} ${page.slug} sweep draw p95 ${result.sweep.draw?.p95.toFixed(2) ?? '-'} ms`,
		);
	}

	// A page whose sweep drew nothing has no p95 and sorts last.
	const sweepP95 = (result: PageResult) => result.sweep.draw?.p95;
	results.sort((a, b) => {
		const left = sweepP95(a);
		const right = sweepP95(b);
		if (left === undefined) return right === undefined ? 0 : 1;
		if (right === undefined) return -1;
		return right - left;
	});

	mkdirSync(resolve(root, 'perf'), { recursive: true });
	const file = resolve(root, `perf/${label}.json`);
	await Bun.write(
		file,
		`${JSON.stringify(
			{
				label,
				date: new Date().toISOString(),
				loadavgAtEnd: loadavg(),
				addon,
				window: app.ready.window,
				config: { settleMs, idleMs, sweepMs },
				results,
			},
			null,
			'\t',
		)}\n`,
	);
	console.log(renderTable(results));
	console.error(`perf: wrote ${file}`);
} finally {
	clearTimeout(watchdog);
	app.kill();
}

function fmt(value: number | undefined, digits = 2) {
	return value === undefined ? '-' : value.toFixed(digits);
}

function renderTable(results: PageResult[]): string {
	const header = [
		'page',
		'nodes',
		'idle fr',
		'idle draw p50',
		'idle draw p95',
		'idle cpu%',
		'sweep draws/s',
		'sweep present/s',
		'sweep draw p50',
		'sweep draw p95',
		'sweep draw max',
		'sweep tick p95',
		'sweep enc p95',
		'sweep apply ms/s',
		'sweep clock ms/s',
		'sweep cpu%',
	];
	const rows = results.map((result) => {
		const rate = (phase: EncodedPhase, ms: number) =>
			(ms / phase.wallMs) * 1000;
		const cpu = (phase: EncodedPhase) => (phase.cpuMs / phase.wallMs) * 100;
		return [
			result.sidebar ? result.slug : `${result.slug} (no sidebar)`,
			String(result.retained),
			String(result.idle.frames),
			fmt(result.idle.draw?.p50),
			fmt(result.idle.draw?.p95),
			fmt(cpu(result.idle), 1),
			fmt(rate(result.sweep, result.sweep.frames), 1),
			fmt(rate(result.sweep, result.sweep.presented), 1),
			fmt(result.sweep.draw?.p50),
			fmt(result.sweep.draw?.p95),
			fmt(result.sweep.nativeDraw?.max),
			fmt(result.sweep.tick?.p95),
			fmt(result.sweep.encode?.p95),
			fmt(rate(result.sweep, result.sweep.applyMs), 1),
			fmt(rate(result.sweep, result.sweep.intervalMs), 1),
			fmt(cpu(result.sweep), 1),
		];
	});
	return [header, header.map(() => '---'), ...rows]
		.map((row) => `| ${row.join(' | ')} |`)
		.join('\n');
}
