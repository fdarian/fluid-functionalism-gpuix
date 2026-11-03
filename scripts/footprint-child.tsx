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
 *
 * With `--tour [--tour-settle ms]` the page is only the starting point: after the
 * settle time the child visits every other page through the app's own `navigate`,
 * each for the tour settle time (`--tour-rounds` times over), returns to the start page and settles again. At
 * each stop it prints `STAGE <name> {json}` and waits for a line on stdin, so the
 * driver reads the footprint of exactly that state. No CPU window is measured.
 */

import { heapStats } from 'bun:jsc';
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { PatchCounters } from '@ghia/native';
import { startFrameLoop } from '@ghia/native/runtime';
import { createRenderer, render } from '@ghia/solid';
import { createTestRoot } from '@ghia/solid/testing';
import { App, CustomizeCard } from '#/app';
import {
	type Demo,
	loadDemos,
	loadPages,
	type Page,
	SHOWCASE_SLUG,
} from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { type PageNav, usePageNav } from '#/lib/page-nav';
import { setThemeChoice } from '#/lib/theme';
import { windowOptions, windowPlacement } from '#/lib/window-options';

const args = parseArgs({
	allowPositionals: true,
	options: {
		settle: { type: 'string', default: '3000' },
		idle: { type: 'string', default: '10000' },
		hz: { type: 'string', default: '75' },
		window: { type: 'boolean', default: false },
		tour: { type: 'boolean', default: false },
		'tour-settle': { type: 'string', default: '1500' },
		'tour-rounds': { type: 'string', default: '1' },
	},
});
const slug = args.positionals[0];
if (slug === undefined)
	throw new Error(
		'usage: footprint-child <slug> [--settle ms] [--idle ms] [--hz n] [--window] [--tour] [--tour-settle ms] [--tour-rounds n]',
	);
const settleMs = Number(args.values.settle);
const idleMs = Number(args.values.idle);
const hz = Number(args.values.hz);
const windowMode = args.values.window;
const tourMode = args.values.tour;
const tourSettleMs = Number(args.values['tour-settle']);
const tourRounds = Number(args.values['tour-rounds']);

/** The width the Electron comparison used: the site's own layout drops its sidebar below 1280. */
const WINDOW_WIDTH = 1280;

/** A draw is counted when it runs and presented a moment later, so a few at the window's edge can be unshown without the window being covered. */
const IN_FLIGHT_DRAWS = 3;

type Counts = {
	/** Every frame drawn, patched ones included. */
	draws: number;
	/** Frames that built and painted the whole window: `draws` less the patched ones. */
	full: number;
	/** Frames that reached the screen; only a real window has any. */
	presented: number | null;
	layouts: number | null;
	built: number | null;
	patch: PatchDelta;
};

/** What the idle window's ticks did, from `getPatchCounters()` read at both ends. */
type PatchDelta = {
	/** Frames drawn by patching the frame before them. */
	patchedFrames: number;
	/** Ticks gpui drew whole after the patcher tried, by reason. */
	declines: Record<string, number>;
	/** Ticks gpuix did not try to patch, by kind. */
	unpatchable: Record<string, number>;
};

type Probe = {
	/** Starts the counts `read` returns. */
	reset(): void;
	read(): Counts;
	retainedElements(): number | null;
	/** Frames presented since the process started. */
	presentedTotal(): number | null;
	/** Time spent inside native calls since `reset`; only the emulated display link can time them. */
	nativeTime(): NativeTime | null;
};

type NativeTime = {
	/** Wall ms of each `drawFrame()` that painted a whole frame. */
	drawMs: number[];
	/** Wall ms of each `drawFrame()` that drew anything, patched frames included. */
	allDrawMs: number[];
	/** Process CPU ms across `dispatchNativeEvents()` and `drawFrame()`, painted or not; the native side's own threads count. */
	nativeCpuMs: number;
};

function reasonDelta(after: string, before: string) {
	const was = JSON.parse(before) as Record<string, number>;
	const delta: Record<string, number> = {};
	for (const [reason, count] of Object.entries(
		JSON.parse(after) as Record<string, number>,
	)) {
		const gained = count - (was[reason] ?? 0);
		if (gained > 0) delta[reason] = gained;
	}
	return delta;
}

function patchDelta(after: PatchCounters, before: PatchCounters): PatchDelta {
	return {
		patchedFrames: after.patchedFrames - before.patchedFrames,
		declines: reasonDelta(after.declines, before.declines),
		unpatchable: reasonDelta(after.unpatchable, before.unpatchable),
	};
}

function mean(values: number[]) {
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], fraction: number) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[
		Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))
	];
}

const loadedDemos = await loadDemos();
const loadedPages = await loadPages(loadedDemos);

/** The navigator of the mounted `App`, taken from inside its tree by the start page's wrapper. */
const tourNav: { current: PageNav | undefined } = { current: undefined };

/**
 * The tour needs the `navigate` that `App` gives the sidebar, and only a component inside the tree can read it. The start page is wrapped to keep it; the showcase, which `App` renders itself, gets a stand-in page entry whose right column keeps the same card.
 */
function withNavCapture(): { demos: Demo[]; pages: Page[] } {
	const demos = loadedDemos.map((demo) =>
		demo.slug === slug
			? {
					...demo,
					Demo: () => {
						tourNav.current = usePageNav();
						return <demo.Demo />;
					},
				}
			: demo,
	);
	const pages = loadedPages.map((page) =>
		page.slug === slug
			? {
					...page,
					Page: () => {
						tourNav.current = usePageNav();
						return <page.Page />;
					},
				}
			: page,
	);
	if (slug === SHOWCASE_SLUG) {
		pages.push({
			slug: SHOWCASE_SLUG,
			title: 'Showcase',
			group: 'Pages',
			order: 0,
			layout: 'docs',
			listed: 'none',
			Page: () => null,
			Rail: () => {
				tourNav.current = usePageNav();
				return <CustomizeCard />;
			},
		});
	}
	return { demos, pages };
}

const mounted = tourMode
	? withNavCapture()
	: { demos: loadedDemos, pages: loadedPages };
const demos = mounted.demos;
const pages = mounted.pages;

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

	let drawMs: number[] = [];
	let allDrawMs: number[] = [];
	let nativeCpuMs = 0;

	/** One display-link wake: events reach JS, then the window draws if something is dirty. */
	function wake() {
		const cpuBefore = process.cpuUsage();
		renderer.dispatchNativeEvents();
		const dispatched = performance.now();
		const paintedBefore = renderer.getPaintedFrameCount();
		const patchedBefore = renderer.getPatchCounters().patchedFrames;
		renderer.drawFrame();
		const end = performance.now();
		const cpuInNative = process.cpuUsage(cpuBefore);
		nativeCpuMs += (cpuInNative.user + cpuInNative.system) / 1000;
		const painted = renderer.getPaintedFrameCount() > paintedBefore;
		if (painted) {
			drawMs.push(end - dispatched);
		}
		if (painted || renderer.getPatchCounters().patchedFrames > patchedBefore) {
			allDrawMs.push(end - dispatched);
		}
	}

	test.render(() => <App demos={demos} pages={pages} initialPage={slug} />);
	setInterval(wake, 1000 / hz);

	let paintedStart = 0;
	let layoutStart = 0;
	let patchStart = renderer.getPatchCounters();
	return {
		reset() {
			patchStart = renderer.getPatchCounters();
			paintedStart = renderer.getPaintedFrameCount();
			layoutStart = renderer.getLayoutPassCount();
			renderer.resetBuildCounters();
			drawMs = [];
			allDrawMs = [];
			nativeCpuMs = 0;
		},
		read: () => {
			const patch = patchDelta(renderer.getPatchCounters(), patchStart);
			// The test renderer's painted-frame count leaves out the frames drawn by patching.
			const full = renderer.getPaintedFrameCount() - paintedStart;
			return {
				draws: full + patch.patchedFrames,
				full,
				presented: null,
				layouts: renderer.getLayoutPassCount() - layoutStart,
				built: renderer.getBuildCounters().elementsBuilt,
				patch,
			};
		},
		retainedElements: () => renderer.getRetainedElementCount(),
		presentedTotal: () => null,
		nativeTime: () => ({ drawMs, allDrawMs, nativeCpuMs }),
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
	renderer.init({
		...windowOptions,
		width: WINDOW_WIDTH,
		...windowPlacement(WINDOW_WIDTH, windowOptions.height),
	});
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
	let patchStart = renderer.getPatchCounters();
	return {
		reset() {
			patchStart = renderer.getPatchCounters();
			drawsStart = renderer.getDebugFrameOverlayStats().frames;
			presentedStart = countPresented(presentLog);
		},
		read: () => {
			const patch = patchDelta(renderer.getPatchCounters(), patchStart);
			// The overlay records a patched frame like any other.
			const draws = renderer.getDebugFrameOverlayStats().frames - drawsStart;
			return {
				draws,
				full: draws - patch.patchedFrames,
				presented: countPresented(presentLog) - presentedStart,
				layouts: null,
				built: null,
				patch,
			};
		},
		retainedElements: () => null,
		presentedTotal: () => countPresented(presentLog),
		nativeTime: () => null,
	};
}

const probe = windowMode ? mountWindow() : mountHeadless();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(settleMs);

function waitForDriver() {
	// The driver reads the footprint now and answers with a line, so its own work stays out of what follows.
	return new Promise((resolve) => process.stdin.once('data', resolve));
}

function memoryNow() {
	const heap = heapStats();
	const memory = process.memoryUsage();
	return {
		heapSizeBytes: heap.heapSize,
		heapCapacityBytes: heap.heapCapacity,
		extraMemoryBytes: heap.extraMemorySize,
		heapObjectCount: heap.objectCount,
		jsRssBytes: memory.rss,
		jsHeapUsedBytes: memory.heapUsed,
		retainedElements: probe.retainedElements(),
	};
}

async function stage(name: string) {
	console.log(`STAGE ${name} ${JSON.stringify(memoryNow())}`);
	await waitForDriver();
}

if (tourMode) {
	const navigator = tourNav.current;
	if (navigator === undefined) {
		throw new Error(`the start page ${slug} did not mount: no navigator`);
	}
	await stage('fresh');
	Bun.gc(true);
	await stage('fresh-gc');
	const visited = [
		SHOWCASE_SLUG,
		...loadedDemos.map((demo) => demo.slug),
		...loadedPages.map((page) => page.slug),
	].filter((other) => other !== slug);
	for (let round = 1; round <= tourRounds; round++) {
		const prefix = round === 1 ? 'page' : `page${round}`;
		for (const other of visited) {
			navigator.navigate(other);
			await sleep(tourSettleMs);
			await stage(`${prefix}:${other}`);
		}
		navigator.navigate(slug);
		await sleep(settleMs);
		await stage(round === 1 ? 'tour' : `tour${round}`);
	}
	Bun.gc(true);
	await stage('tour-gc');
	console.log('TOUR-DONE');
	// Frames keep running until the driver kills the process, like after a page report.
	await new Promise(() => {});
}

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

const cpuMs = (cpu.user + cpu.system) / 1000;
const nativeTime = probe.nativeTime();

const seconds = wallMs / 1000;
const rate = (count: number | null) =>
	count === null ? null : count / seconds;
const heap = heapStats();
const memory = process.memoryUsage();
console.log(
	`FOOTPRINT ${JSON.stringify({
		slug,
		windowMs: wallMs,
		cpuPercent: (cpuMs / wallMs) * 100,
		drawsPerSecond: rate(counts.draws),
		presentedPerSecond: rate(counts.presented),
		layoutsPerSecond: rate(counts.layouts),
		builtPerSecond: rate(counts.built),
		patchedPerSecond: counts.patch.patchedFrames / seconds,
		fullPerSecond: counts.full / seconds,
		declines: counts.patch.declines,
		unpatchable: counts.patch.unpatchable,
		drawMsPerFrame:
			nativeTime === null || nativeTime.drawMs.length === 0
				? null
				: {
						mean: mean(nativeTime.drawMs),
						p90: percentile(nativeTime.drawMs, 0.9),
					},
		allDrawMsPerFrame:
			nativeTime === null || nativeTime.allDrawMs.length === 0
				? null
				: {
						mean: mean(nativeTime.allDrawMs),
						p90: percentile(nativeTime.allDrawMs, 0.9),
					},
		jsShare:
			nativeTime === null ? null : (cpuMs - nativeTime.nativeCpuMs) / cpuMs,
		occluded: windowMode
			? presentedBeforeIdle === 0 ||
				(counts.draws > IN_FLIGHT_DRAWS && counts.presented === 0)
			: null,
		retainedElements: probe.retainedElements(),
		heapSizeBytes: heap.heapSize,
		heapCapacityBytes: heap.heapCapacity,
		heapObjectCount: heap.objectCount,
		jsRssBytes: memory.rss,
		jsHeapUsedBytes: memory.heapUsed,
	})}`,
);
