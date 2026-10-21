/**
 * One page of `scripts/footprint.tsx`, in its own process, reporting what the idle
 * window cost on stdout as one `FOOTPRINT {json}` line.
 *
 *   bun scripts/footprint-child.tsx <slug> [--settle ms] [--idle ms] [--hz n] [--window]
 *
 * By default the page is mounted in the offscreen renderer and a frame loop
 * stands in for a window's display link. With `--window` it is a real 1280x780
 * window on gpuix's own display-link loop, like `src/main.tsx`, and the driver
 * takes part: the child prints `SETTLED` after the settle time, waits for a line
 * on stdin (the driver has read the footprint by then), and only then starts the
 * CPU window. `GPUIX_PRESENT_LOG` must name a file: gpuix appends one line to it
 * per frame that reaches the screen, which is how an occluded window is told
 * from a still one.
 *
 * After the report the process keeps running its frames until the driver kills it,
 * so the driver reads the memory footprint from a process in the state it measured.
 */

import { heapStats } from 'bun:jsc';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { startFrameLoop } from '@gpuix/native/runtime';
import { createRenderer, render } from '@gpuix/solid';
import { createTestRoot } from '@gpuix/solid/testing';
import { App } from '#/app';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { setThemeChoice } from '#/lib/theme';
import { windowOptions } from '#/lib/window-options';

const args = parseArgs({
	allowPositionals: true,
	options: {
		settle: { type: 'string', default: '3000' },
		idle: { type: 'string', default: '10000' },
		hz: { type: 'string', default: '75' },
		window: { type: 'boolean', default: false },
	},
});
const slug = args.positionals[0];
if (slug === undefined)
	throw new Error(
		'usage: footprint-child <slug> [--settle ms] [--idle ms] [--hz n] [--window]',
	);
const settleMs = Number(args.values.settle);
const idleMs = Number(args.values.idle);
const hz = Number(args.values.hz);
const windowMode = args.values.window;

/** The width the Electron comparison used: the site's own layout drops its sidebar below 1280. */
const WINDOW_WIDTH = 1280;

type Counts = {
	draws: number;
	/** Frames that reached the screen; only a real window has any. */
	presented: number | null;
	layouts: number | null;
	built: number | null;
};

type Probe = {
	/** Starts the counts `read` returns. */
	reset(): void;
	read(): Counts;
	retainedElements(): number | null;
	/** Frames presented since the process started. */
	presentedTotal(): number | null;
};

const demos = await loadDemos();
const pages = await loadPages(demos);

function mountHeadless(): Probe {
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

	let paintedStart = 0;
	let layoutStart = 0;
	return {
		reset() {
			paintedStart = renderer.getPaintedFrameCount();
			layoutStart = renderer.getLayoutPassCount();
			renderer.resetBuildCounters();
		},
		read: () => ({
			draws: renderer.getPaintedFrameCount() - paintedStart,
			presented: null,
			layouts: renderer.getLayoutPassCount() - layoutStart,
			built: renderer.getBuildCounters().elementsBuilt,
		}),
		retainedElements: () => renderer.getRetainedElementCount(),
		presentedTotal: () => null,
	};
}

function presentLogPath() {
	const path = process.env.GPUIX_PRESENT_LOG;
	if (path === undefined) {
		throw new Error(
			'--window needs GPUIX_PRESENT_LOG: run scripts/footprint.tsx',
		);
	}
	return path;
}

/** gpuix appends one line per frame that reaches the screen, and only once the first has. */
function countPresented(path: string) {
	if (!existsSync(path)) return 0;
	return readFileSync(path, 'utf8').split('\n').length - 1;
}

function mountWindow(): Probe {
	const presentLog = presentLogPath();
	// The app follows the system appearance; the headless run is dark, so this one is too.
	setThemeChoice('dark');
	const renderer = createRenderer();
	renderer.init({ ...windowOptions, width: WINDOW_WIDTH });
	// The overlay's frame count is the only draw count a live renderer has; hidden, it paints nothing.
	renderer.setDebugFrameOverlay('hidden');
	// gpuix's own loop, paced by the window's display link (no `frameMs`).
	startFrameLoop(renderer, {
		onTerminated: () => process.exit(0),
		onError: (error) => console.error('[footprint] frame error', error),
	});
	render(() => <App demos={demos} pages={pages} initialPage={slug} />, {
		renderer,
	});
	// A window opened behind others is occluded and gets no display link.
	renderer.activateWindow();

	let drawsStart = 0;
	let presentedStart = 0;
	return {
		reset() {
			drawsStart = renderer.getDebugFrameOverlayStats().frames;
			presentedStart = countPresented(presentLog);
		},
		read: () => ({
			draws: renderer.getDebugFrameOverlayStats().frames - drawsStart,
			presented: countPresented(presentLog) - presentedStart,
			layouts: null,
			built: null,
		}),
		retainedElements: () => null,
		presentedTotal: () => countPresented(presentLog),
	};
}

const probe = windowMode ? mountWindow() : mountHeadless();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(settleMs);

let presentedBeforeIdle: number | null = null;
if (windowMode) {
	presentedBeforeIdle = probe.presentedTotal();
	console.log('SETTLED');
	// The driver reads the footprint now and answers with a line, so its own work stays out of the CPU window.
	await new Promise((resolve) => process.stdin.once('data', resolve));
}

probe.reset();
const cpuStart = process.cpuUsage();
const wallStart = performance.now();
await sleep(idleMs);
const wallMs = performance.now() - wallStart;
const cpu = process.cpuUsage(cpuStart);
const counts = probe.read();

const seconds = wallMs / 1000;
const rate = (count: number | null) =>
	count === null ? null : count / seconds;
const heap = heapStats();
const memory = process.memoryUsage();
console.log(
	`FOOTPRINT ${JSON.stringify({
		slug,
		windowMs: wallMs,
		cpuPercent: ((cpu.user + cpu.system) / 1000 / wallMs) * 100,
		drawsPerSecond: rate(counts.draws),
		presentedPerSecond: rate(counts.presented),
		layoutsPerSecond: rate(counts.layouts),
		builtPerSecond: rate(counts.built),
		// Nothing reached the screen: either it never presented, or it drew while idle and none of that was shown.
		occluded: windowMode
			? presentedBeforeIdle === 0 ||
				(counts.draws > 0 && counts.presented === 0)
			: null,
		retainedElements: probe.retainedElements(),
		heapSizeBytes: heap.heapSize,
		heapCapacityBytes: heap.heapCapacity,
		heapObjectCount: heap.objectCount,
		jsRssBytes: memory.rss,
		jsHeapUsedBytes: memory.heapUsed,
	})}`,
);
