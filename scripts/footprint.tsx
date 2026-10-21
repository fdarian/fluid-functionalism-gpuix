/**
 * Headless idle CPU and memory per page.
 *
 *   bun scripts/footprint.tsx [slug...] [--label x] [--settle ms] [--idle ms] [--hz n] [--source]
 *
 * One fresh `scripts/footprint-child.tsx` process per page, sequentially. By
 * default the child is compiled first (`dist/footprint-child`, built like the app)
 * so Bun's transpile cost stays out of the memory numbers; `--source` runs it
 * from source. Without slugs every page is measured. Writes
 * `perf/footprint-<label>.json` and prints a table.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import solidPlugin from '@gpuix/solid/bun-plugin';
import { nativeCjsPlugin } from './native-cjs-plugin';
import { registryPlugin } from './registry-plugin';

const root = join(import.meta.dir, '..');

const args = parseArgs({
	allowPositionals: true,
	options: {
		label: { type: 'string' },
		settle: { type: 'string', default: '3000' },
		idle: { type: 'string', default: '10000' },
		hz: { type: 'string', default: '75' },
		source: { type: 'boolean', default: false },
	},
});
const settleMs = Number(args.values.settle);
const idleMs = Number(args.values.idle);
const hz = Number(args.values.hz);
const mode = args.values.source ? 'source' : 'bundle';
const label =
	args.values.label ?? new Date().toISOString().replace(/[:.]/g, '-');
const BINARY = join(root, 'dist/footprint-child');
const CHILD_SLACK_MS = 60_000;

type PageResult = {
	slug: string;
	windowMs: number;
	cpuPercent: number;
	drawsPerSecond: number;
	layoutsPerSecond: number;
	builtPerSecond: number;
	retainedElements: number;
	heapSizeBytes: number;
	heapCapacityBytes: number;
	heapObjectCount: number;
	jsRssBytes: number;
	jsHeapUsedBytes: number;
	footprintBytes: number;
	rssBytes: number;
	threads: number;
};

function output(command: string[]) {
	const result = Bun.spawnSync(command, { stdout: 'pipe', stderr: 'pipe' });
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

async function measure(slug: string): Promise<PageResult> {
	const flags = [
		'--settle',
		String(settleMs),
		'--idle',
		String(idleMs),
		'--hz',
		String(hz),
	];
	const command =
		mode === 'bundle'
			? [BINARY, slug, ...flags]
			: ['bun', join(root, 'scripts/footprint-child.tsx'), slug, ...flags];
	const child = Bun.spawn(command, {
		cwd: root,
		stdout: 'pipe',
		stderr: 'inherit',
	});
	const deadline = setTimeout(
		() => child.kill(),
		settleMs + idleMs + CHILD_SLACK_MS,
	);
	try {
		const reader = child.stdout.getReader();
		const decoder = new TextDecoder();
		let pending = '';
		for (;;) {
			const chunk = await reader.read();
			if (chunk.done) {
				throw new Error(
					`${slug}: child exited (${child.exitCode}) without a report`,
				);
			}
			pending += decoder.decode(chunk.value, { stream: true });
			const lines = pending.split('\n');
			pending = lines.pop() ?? '';
			const report = lines.find((line) => line.startsWith('FOOTPRINT '));
			if (report === undefined) continue;
			const measured = JSON.parse(report.slice('FOOTPRINT '.length)) as Omit<
				PageResult,
				'footprintBytes' | 'rssBytes' | 'threads'
			>;
			return {
				...measured,
				footprintBytes: physFootprintBytes(child.pid),
				rssBytes: rssBytes(child.pid),
				threads: threadCount(child.pid),
			};
		}
	} finally {
		clearTimeout(deadline);
		child.kill();
		await child.exited;
	}
}

const mb = (bytes: number) => (bytes / 1024 ** 2).toFixed(0);

function printTable(results: PageResult[]) {
	const rows = results.map((result) => [
		result.slug,
		result.cpuPercent.toFixed(1),
		result.drawsPerSecond.toFixed(1),
		result.layoutsPerSecond.toFixed(1),
		result.builtPerSecond.toFixed(0),
		mb(result.footprintBytes),
		mb(result.rssBytes),
		String(result.threads),
		mb(result.heapSizeBytes),
	]);
	const header = [
		'slug',
		'cpu%',
		'draws/s',
		'layouts/s',
		'built/s',
		'footprint MB',
		'rss MB',
		'threads',
		'heap MB',
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
if (mode === 'bundle') await compileChild();

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
			gpuixHead: git(join(root, '../gpuix')),
			mode,
			hz,
			settleMs,
			idleMs,
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
