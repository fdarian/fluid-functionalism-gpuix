/**
 * One page of `scripts/footprint.tsx`, in its own process: mounts the page in the
 * offscreen renderer, runs a frame loop that stands in for a window's display link,
 * and reports what the idle window cost on stdout as one `FOOTPRINT {json}` line.
 *
 *   bun scripts/footprint-child.tsx <slug> [--settle ms] [--idle ms] [--hz n]
 *
 * After the report the process keeps running its frames until the driver kills it,
 * so the driver reads the memory footprint from a process in the state it measured.
 */

import { heapStats } from 'bun:jsc';
import { parseArgs } from 'node:util';
import { createTestRoot } from '@gpuix/solid/testing';
import { App } from '#/app';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';

const args = parseArgs({
	allowPositionals: true,
	options: {
		settle: { type: 'string', default: '3000' },
		idle: { type: 'string', default: '10000' },
		hz: { type: 'string', default: '75' },
	},
});
const slug = args.positionals[0];
if (slug === undefined)
	throw new Error(
		'usage: footprint-child <slug> [--settle ms] [--idle ms] [--hz n]',
	);
const settleMs = Number(args.values.settle);
const idleMs = Number(args.values.idle);
const hz = Number(args.values.hz);

const demos = await loadDemos();
const pages = await loadPages(demos);

const test = createTestRoot({
	width: 1240,
	height: 780,
	fonts,
	appearance: 'dark',
});
const renderer = test.renderer;
// A window has no screen reader attached unless one is running; the test window starts with one, which builds the accessibility tree on every draw.
renderer.setA11yActive(false);
renderer.setInlineDraws(false);

/** One display-link wake: events reach JS, then the window draws if something is dirty. */
function wake() {
	renderer.dispatchNativeEvents();
	renderer.drawFrame();
}

test.render(() => <App demos={demos} pages={pages} initialPage={slug} />);
setInterval(wake, 1000 / hz);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(settleMs);

const cpuStart = process.cpuUsage();
const paintedStart = renderer.getPaintedFrameCount();
const layoutStart = renderer.getLayoutPassCount();
renderer.resetBuildCounters();
const wallStart = performance.now();
await sleep(idleMs);
const wallMs = performance.now() - wallStart;
const cpu = process.cpuUsage(cpuStart);
const painted = renderer.getPaintedFrameCount() - paintedStart;
const layouts = renderer.getLayoutPassCount() - layoutStart;
const built = renderer.getBuildCounters().elementsBuilt;

const seconds = wallMs / 1000;
const heap = heapStats();
const memory = process.memoryUsage();
console.log(
	`FOOTPRINT ${JSON.stringify({
		slug,
		windowMs: wallMs,
		cpuPercent: ((cpu.user + cpu.system) / 1000 / wallMs) * 100,
		drawsPerSecond: painted / seconds,
		layoutsPerSecond: layouts / seconds,
		builtPerSecond: built / seconds,
		retainedElements: renderer.getRetainedElementCount(),
		heapSizeBytes: heap.heapSize,
		heapCapacityBytes: heap.heapCapacity,
		heapObjectCount: heap.objectCount,
		jsRssBytes: memory.rss,
		jsHeapUsedBytes: memory.heapUsed,
	})}`,
);
