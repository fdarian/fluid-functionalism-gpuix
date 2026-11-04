/**
 * Idle CPU and memory per page, headless or in a real window.
 *
 *   bun scripts/footprint.tsx [slug...] [--label x] [--settle ms] [--idle ms] [--hz n] [--source] [--window] [--tour [--tour-settle ms] [--tour-rounds n]]
 *
 * One fresh `scripts/footprint-child.tsx` process per page, sequentially. By
 * default the child is compiled first (`dist/footprint-child`, built like the app)
 * so Bun's transpile cost stays out of the memory numbers; `--source` runs it
 * from source. Without slugs every page is measured. Writes
 * `perf/footprint-<label>.json` and prints a table (`draw ms` is mean/p90 of the
 * `drawFrame()` calls that built a whole frame, patched frames not among them; `all draw ms` is mean/p90 of every
 * `drawFrame()` call that drew, patched ones included, so it falls when patching replaces whole frames while `draw ms` rises; `js%` the process CPU share outside the native calls (approximate); headless only).
 * `draws/s` counts every frame, patched ones included; `patched/s` and `full/s` split it into ticks gpuix drew by patching the frame before them and
 * frames built whole; `why` is the top two reasons for the whole ones (gpui's `declines` and gpuix's
 * `unpatchable` kinds, as `Reason:count` over the idle window; the JSON has both maps in full). The counters name
 * the reason but not the element: `Outside` does not say which id.
 *
 * `--tour [--tour-settle ms]` measures what a session leaves behind instead: the
 * given start pages (default `introduction`) are each mounted in one child, which
 * then visits every other page (`--tour-rounds n` times) through the app's own `navigate`, returns, and the
 * footprint is read fresh, after the tour, and at every stop (with and without a
 * forced GC). It works headless and with `--window`, and writes the stops to
 * `perf/footprint-<label>.json` under `tours`.
 *
 * `--window` opens each page in a real 1280x780 window instead of the offscreen
 * renderer, with the protocol of the Electron comparison: footprint after the
 * settle time (10 s), then CPU over the idle window (30 s), then footprint again.
 * The window must be visible: an occluded one is flagged `occluded` in the table
 * and the JSON, and the run exits 1. The child runs with `GPUIX_PRESENT_LOG`,
 * which adds one small write per presented frame to the process being measured.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { loadavg, tmpdir, uptime } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import solidPlugin from '@ghia/solid/bun-plugin';
import { nativeCjsPlugin } from './native-cjs-plugin';
import { registryPlugin } from './registry-plugin';

const root = join(import.meta.dir, '..');

const args = parseArgs({
	allowPositionals: true,
	options: {
		label: { type: 'string' },
		settle: { type: 'string' },
		idle: { type: 'string' },
		hz: { type: 'string', default: '75' },
		source: { type: 'boolean', default: false },
		window: { type: 'boolean', default: false },
		tour: { type: 'boolean', default: false },
		'tour-settle': { type: 'string', default: '1500' },
		'tour-rounds': { type: 'string', default: '1' },
	},
});
const windowMode = args.values.window;
const settleMs = Number(args.values.settle ?? (windowMode ? 10_000 : 3000));
const idleMs = Number(args.values.idle ?? (windowMode ? 30_000 : 10_000));
const hz = Number(args.values.hz);
const tourMode = args.values.tour;
const tourSettleMs = Number(args.values['tour-settle']);
const mode = `${args.values.source ? 'source' : 'bundle'}${windowMode ? '-window' : ''}${tourMode ? '-tour' : ''}`;
const label =
	args.values.label ?? new Date().toISOString().replace(/[:.]/g, '-');
const BINARY = join(root, 'dist/footprint-child');
const CHILD_SLACK_MS = 60_000;

type Memory = {
	footprintBytes: number;
	rssBytes: number;
	threads: number;
};

type PageResult = {
	slug: string;
	windowMs: number;
	cpuPercent: number;
	drawsPerSecond: number;
	/** Window mode only: frames that reached the screen. */
	presentedPerSecond: number | null;
	/** Null in window mode, where the live renderer keeps no such counter. */
	layoutsPerSecond: number | null;
	builtPerSecond: number | null;
	/** Frames over the idle window drawn by patching the frame before them, per second. */
	patchedPerSecond: number;
	/** Frames that built and painted the whole window: `drawsPerSecond` less the patched ones. */
	fullPerSecond: number;
	/** Ticks gpui drew whole after the patcher tried, by reason, counted over the idle window. */
	declines: Record<string, number>;
	/** Ticks gpuix did not try to patch, by kind, counted over the idle window. */
	unpatchable: Record<string, number>;
	/** Headless only: wall ms of the `drawFrame()` calls that painted a whole frame; null when none did. */
	drawMsPerFrame: { mean: number; p90: number } | null;
	/** Headless only: wall ms of every `drawFrame()` call that drew, patched frames included; null when none did. */
	allDrawMsPerFrame: { mean: number; p90: number } | null;
	/** Headless only: the share of the CPU time outside `dispatchNativeEvents()` and `drawFrame()`. */
	jsShare: number | null;
	/** Window mode only: nothing was presented before the idle window, or the idle window drew and none of it was shown. A window covered after its first frame, on a page that then draws nothing, looks like a visible still page: not detectable. */
	occluded: boolean | null;
	retainedElements: number | null;
	heapSizeBytes: number;
	heapCapacityBytes: number;
	heapObjectCount: number;
	jsRssBytes: number;
	jsHeapUsedBytes: number;
	footprintBytes: number;
	rssBytes: number;
	threads: number;
	/** Window mode only: the same three, read after the settle time and before the CPU window. */
	settled: Memory | null;
};

/** `/usr/bin/footprint` has hung on a child for 38 minutes with the shared lock held, and a synchronous spawn blocks the child deadline timers, so every spawn has its own limit. */
const SPAWN_LIMIT_MS = 30_000;

function output(command: string[]) {
	const result = Bun.spawnSync(command, {
		stdout: 'pipe',
		stderr: 'pipe',
		timeout: SPAWN_LIMIT_MS,
		killSignal: 'SIGKILL',
	});
	if (result.exitedDueToTimeout) {
		throw new Error(
			`${command.join(' ')} did not finish in ${SPAWN_LIMIT_MS} ms and was killed`,
		);
	}
	if (result.exitCode !== 0) {
		throw new Error(
			`${command.join(' ')} exited with ${result.exitCode}: ${result.stderr.toString()}`,
		);
	}
	return result.stdout.toString();
}

function git(directory: string) {
	return output([
		'git',
		'-C',
		directory,
		'rev-parse',
		'--short',
		'HEAD',
	]).trim();
}

function ghiaNativeVersion() {
	return JSON.parse(
		readFileSync(join(root, 'node_modules/@ghia/native/package.json'), 'utf8'),
	).version;
}

/** Every page the app has: the showcase, the demos and the pages, named by their files as the registry reads them. */
async function allSlugs() {
	const slugs = ['showcase'];
	for (const directory of ['src/demos', 'src/pages']) {
		const files: string[] = [];
		for await (const file of new Bun.Glob('*.tsx').scan({
			cwd: join(root, directory),
		})) {
			files.push(file.slice(0, -'.tsx'.length));
		}
		slugs.push(...files.sort());
	}
	return slugs;
}

async function compileChild() {
	const result = await Bun.build({
		entrypoints: [join(root, 'scripts/footprint-child.tsx')],
		compile: { outfile: BINARY, autoloadBunfig: false },
		plugins: [
			solidPlugin,
			nativeCjsPlugin,
			registryPlugin({ scenarios: false }),
		],
		minify: true,
		define: { 'process.env.FF_PERF': '"0"' },
	});
	for (const log of result.logs) {
		if (!log.message.includes('will always be undefined')) console.log(log);
	}
	if (!result.success) throw new Error('Bun.build failed');
}

const UNITS: Record<string, number> = {
	B: 1,
	KB: 1024,
	MB: 1024 ** 2,
	GB: 1024 ** 3,
};

/** phys_footprint, the figure Activity Monitor calls Memory. */
function physFootprintBytes(pid: number) {
	const text = output(['/usr/bin/footprint', '-p', String(pid)]);
	const match = /Footprint:\s*([\d.]+)\s*(B|KB|MB|GB)\b/.exec(text);
	if (match === null) {
		throw new Error(`no "Footprint:" total in footprint output:\n${text}`);
	}
	return Number(match[1]) * UNITS[match[2]];
}

function rssBytes(pid: number) {
	return Number(output(['ps', '-o', 'rss=', '-p', String(pid)]).trim()) * 1024;
}

/** `ps -M` prints a header and one line per thread. */
function threadCount(pid: number) {
	return (
		output(['ps', '-M', '-p', String(pid)])
			.trim()
			.split('\n').length - 1
	);
}

function memory(pid: number, slug: string): Memory {
	try {
		return readMemory(pid);
	} catch (error) {
		throw new Error(`${slug}: ${(error as Error).message}`);
	}
}

function readMemory(pid: number): Memory {
	return {
		footprintBytes: physFootprintBytes(pid),
		rssBytes: rssBytes(pid),
		threads: threadCount(pid),
	};
}

/** The child's stdout, one line at a time. */
async function* stdoutLines(stream: ReadableStream<Uint8Array>) {
	const decoder = new TextDecoder();
	let pending = '';
	for await (const chunk of stream) {
		pending += decoder.decode(chunk, { stream: true });
		const lines = pending.split('\n');
		pending = lines.pop() ?? '';
		yield* lines;
	}
}

async function measure(slug: string): Promise<PageResult> {
	const flags = ['--settle', String(settleMs), '--idle', String(idleMs)];
	if (windowMode) flags.push('--window');
	else flags.push('--hz', String(hz));
	const command = args.values.source
		? ['bun', join(root, 'scripts/footprint-child.tsx'), slug, ...flags]
		: [BINARY, slug, ...flags];
	const presentLog = join(tmpdir(), `footprint-present-${process.pid}.log`);
	rmSync(presentLog, { force: true });
	const child = Bun.spawn(command, {
		cwd: root,
		stdin: 'pipe',
		stdout: 'pipe',
		stderr: 'inherit',
		env: { ...process.env, GPUIX_PRESENT_LOG: presentLog },
	});
	const deadline = setTimeout(
		() => child.kill(),
		settleMs + idleMs + CHILD_SLACK_MS,
	);
	const lines = stdoutLines(child.stdout);
	async function lineStartingWith(prefix: string) {
		for (;;) {
			const next = await lines.next();
			if (next.done) {
				throw new Error(
					`${slug}: child exited (${child.exitCode}) without a ${prefix.trim()} line`,
				);
			}
			if (next.value.startsWith(prefix)) return next.value.slice(prefix.length);
		}
	}
	try {
		let settled: Memory | null = null;
		if (windowMode) {
			await lineStartingWith('SETTLED');
			settled = memory(child.pid, slug);
			child.stdin.write('go\n');
			await child.stdin.flush();
		}
		const measured = JSON.parse(await lineStartingWith('FOOTPRINT ')) as Omit<
			PageResult,
			keyof Memory | 'settled'
		>;
		return { ...measured, ...memory(child.pid, slug), settled };
	} finally {
		clearTimeout(deadline);
		child.kill();
		await child.exited;
		rmSync(presentLog, { force: true });
	}
}

const mb = (bytes: number) => (bytes / 1024 ** 2).toFixed(0);

type TourStop = Memory & {
	/** `fresh`, `fresh-gc`, `page:<slug>`, `tour` (back on the start page; `tour<n>` after round n, `page<n>:<slug>` in it) or `tour-gc`. */
	stage: string;
	heapSizeBytes: number;
	heapCapacityBytes: number;
	extraMemoryBytes: number;
	heapObjectCount: number;
	/** Headless only. */
	retainedElements: number | null;
};

type TourResult = { slug: string; stops: TourStop[] };

/** One child, one start page: the child stops at each state and the footprint is read there. */
async function measureTour(slug: string): Promise<TourResult> {
	const flags = [
		'--tour',
		'--tour-settle',
		String(tourSettleMs),
		'--tour-rounds',
		args.values['tour-rounds'],
		'--settle',
		String(settleMs),
	];
	if (windowMode) flags.push('--window');
	else flags.push('--hz', String(hz));
	const command = args.values.source
		? ['bun', join(root, 'scripts/footprint-child.tsx'), slug, ...flags]
		: [BINARY, slug, ...flags];
	const presentLog = join(tmpdir(), `footprint-present-${process.pid}.log`);
	rmSync(presentLog, { force: true });
	const child = Bun.spawn(command, {
		cwd: root,
		stdin: 'pipe',
		stdout: 'pipe',
		stderr: 'inherit',
		env: { ...process.env, GPUIX_PRESENT_LOG: presentLog },
	});
	const deadline = setTimeout(() => child.kill(), 30 * 60_000);
	const stops: TourStop[] = [];
	try {
		for await (const line of stdoutLines(child.stdout)) {
			if (line === 'TOUR-DONE') break;
			if (!line.startsWith('STAGE ')) continue;
			const rest = line.slice('STAGE '.length);
			const space = rest.indexOf(' ');
			const reported = JSON.parse(rest.slice(space + 1)) as Omit<
				TourStop,
				keyof Memory | 'stage'
			>;
			stops.push({
				stage: rest.slice(0, space),
				...reported,
				...memory(child.pid, slug),
			});
			child.stdin.write('go\n');
			await child.stdin.flush();
		}
		if (!stops.some((stop) => stop.stage === 'tour-gc')) {
			throw new Error(`${slug}: tour child exited (${child.exitCode}) early`);
		}
		return { slug, stops };
	} finally {
		clearTimeout(deadline);
		child.kill();
		await child.exited;
		rmSync(presentLog, { force: true });
	}
}

function printTour(result: TourResult) {
	const rows = result.stops.map((stop) => [
		stop.stage,
		mb(stop.footprintBytes),
		mb(stop.rssBytes),
		mb(stop.heapSizeBytes),
		mb(stop.extraMemoryBytes),
		String(stop.heapObjectCount),
		perSecond(stop.retainedElements, 0),
		String(stop.threads),
	]);
	const header = [
		'stop',
		'footprint MB',
		'rss MB',
		'heap MB',
		'extra MB',
		'objects',
		'threads',
	];
	const widths = header.map((name, column) =>
		Math.max(name.length, ...rows.map((row) => row[column].length)),
	);
	const line = (row: string[]) =>
		row
			.map((cell, column) =>
				column === 0
					? cell.padEnd(widths[column])
					: cell.padStart(widths[column]),
			)
			.join('  ');
	console.log(`\nstart page ${result.slug}`);
	console.log(line(header));
	for (const row of rows) console.log(line(row));
}

type Column = [name: string, cell: (result: PageResult) => string];

/** Counters with no window-mode source print '-'. */
const perSecond = (value: number | null, digits: number) =>
	value === null ? '-' : value.toFixed(digits);

/** The two most frequent reasons a tick was drawn whole, as `Reason:count`. */
function whyCell(result: PageResult) {
	const reasons = [
		...Object.entries(result.declines),
		...Object.entries(result.unpatchable),
	]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 2);
	return reasons.length === 0
		? '-'
		: reasons.map(([reason, count]) => `${reason}:${count}`).join(', ');
}

function printTable(results: PageResult[]) {
	const windowOnly = (column: Column): Column[] => (windowMode ? [column] : []);
	const columns: Column[] = [
		['slug', (result) => result.slug],
		['cpu%', (result) => result.cpuPercent.toFixed(1)],
		['draws/s', (result) => result.drawsPerSecond.toFixed(1)],
		...windowOnly([
			'shown/s',
			(result) => perSecond(result.presentedPerSecond, 1),
		]),
		['patched/s', (result) => result.patchedPerSecond.toFixed(1)],
		['full/s', (result) => result.fullPerSecond.toFixed(1)],
		['layouts/s', (result) => perSecond(result.layoutsPerSecond, 1)],
		['built/s', (result) => perSecond(result.builtPerSecond, 0)],
		[
			'draw ms',
			(result) =>
				result.drawMsPerFrame === null
					? '-'
					: `${result.drawMsPerFrame.mean.toFixed(1)}/${result.drawMsPerFrame.p90.toFixed(1)}`,
		],
		[
			'all draw ms',
			(result) =>
				result.allDrawMsPerFrame === null
					? '-'
					: `${result.allDrawMsPerFrame.mean.toFixed(1)}/${result.allDrawMsPerFrame.p90.toFixed(1)}`,
		],
		[
			'js%',
			(result) =>
				perSecond(result.jsShare === null ? null : result.jsShare * 100, 0),
		],
		...windowOnly([
			'settled MB',
			(result) =>
				result.settled === null ? '-' : mb(result.settled.footprintBytes),
		]),
		['footprint MB', (result) => mb(result.footprintBytes)],
		['rss MB', (result) => mb(result.rssBytes)],
		['threads', (result) => String(result.threads)],
		['heap MB', (result) => mb(result.heapSizeBytes)],
		...windowOnly(['occluded', (result) => (result.occluded ? 'YES' : 'no')]),
		['why', whyCell],
	];
	const rows = results.map((result) => columns.map(([, cell]) => cell(result)));
	const header = columns.map(([name]) => name);
	const widths = header.map((name, column) =>
		Math.max(name.length, ...rows.map((row) => row[column].length)),
	);
	const line = (row: string[]) =>
		row
			.map((cell, column) =>
				column === 0 || column === row.length - 1
					? cell.padEnd(widths[column])
					: cell.padStart(widths[column]),
			)
			.join('  ')
			.trimEnd();
	console.log(line(header));
	for (const row of rows) console.log(line(row));
}

const slugs = args.positionals.length > 0 ? args.positionals : await allSlugs();
const known = await allSlugs();
for (const slug of slugs) {
	if (!known.includes(slug)) {
		throw new Error(`unknown page ${slug}; pages: ${known.join(', ')}`);
	}
}

mkdirSync(join(root, 'dist'), { recursive: true });
mkdirSync(join(root, 'perf'), { recursive: true });
if (!args.values.source) await compileChild();

if (tourMode) {
	const starts =
		args.positionals.length > 0 ? args.positionals : ['introduction'];
	const tours: TourResult[] = [];
	const uptimeSecondsAtTourStart = uptime();
	const loadavgAtTourStart = loadavg();
	for (const slug of starts) {
		console.error(`touring from ${slug}`);
		tours.push(await measureTour(slug));
	}
	const tourFile = join(root, `perf/footprint-${label}.json`);
	writeFileSync(
		tourFile,
		`${JSON.stringify(
			{
				label,
				date: new Date().toISOString(),
				ffHead: git(root),
				ghiaNative: ghiaNativeVersion(),
				mode,
				hz: windowMode ? null : hz,
				settleMs,
				tourSettleMs,
				uptimeSecondsAtStart: uptimeSecondsAtTourStart,
				loadavgAtStart: loadavgAtTourStart,
				loadavgAtEnd: loadavg(),
				tours,
			},
			null,
			'\t',
		)}\n`,
	);
	for (const tour of tours) printTour(tour);
	console.log(`wrote ${tourFile}`);
	process.exit(0);
}

const uptimeSecondsAtStart = uptime();
const loadavgAtStart = loadavg();
const results: PageResult[] = [];
for (const slug of slugs) {
	console.error(`measuring ${slug} (${results.length + 1}/${slugs.length})`);
	results.push(await measure(slug));
}

const file = join(root, `perf/footprint-${label}.json`);
writeFileSync(
	file,
	`${JSON.stringify(
		{
			label,
			date: new Date().toISOString(),
			ffHead: git(root),
			ghiaNative: ghiaNativeVersion(),
			mode,
			hz: windowMode ? null : hz,
			settleMs,
			idleMs,
			uptimeSecondsAtStart,
			loadavgAtStart,
			loadavgAtEnd: loadavg(),
			pages: results,
		},
		null,
		'\t',
	)}\n`,
);
printTable(results);
console.log(`wrote ${file}`);
const occluded = results.filter((result) => result.occluded);
if (occluded.length > 0) {
	console.error(
		`occluded, numbers not valid: ${occluded.map((result) => result.slug).join(', ')}. Uncover the window (or the display is off) and rerun.`,
	);
	process.exitCode = 1;
}
