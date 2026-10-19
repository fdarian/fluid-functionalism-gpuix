/**
 * Headless captures of one demo page through gpuix's offscreen test renderer.
 *
 *   bun scripts/screenshots.tsx <slug>      # a file name in src/demos/ or src/pages/, or "showcase"
 *
 * Writes `screenshots/<demo>/initial.png`, then whatever the demo's
 * `scenarios` capture, then `pill.png` with Radius set to Pill, then
 * `compact.png` with Size set to Compact, then `light.png`: the same page
 * after switching the theme with the "Make them yours" select. The window is
 * created Dark with the theme on System; `light.png` asserts the window really
 * flipped to light.
 *
 * Real time, not the test clock: fluid hover measures on timers and motion
 * samples a wall clock, so each step runs frames until they settle.
 */
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@gpuix/solid/testing';
import { App } from '#/app';
import { showcaseScenarios } from '#/home/scenarios';
import {
	type Demo,
	loadDemos,
	loadPages,
	type Page,
	type ShotContext,
} from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { setShapeChoice, setSizeChoice, setThemeChoice } from '#/lib/theme';

const slug = process.argv[2];
const demos = await loadDemos();
const pages = await loadPages(demos);
const names = [
	'showcase',
	...demos.map((demo) => demo.slug),
	...pages.map((page) => page.slug),
];
if (slug === undefined || !names.includes(slug)) {
	console.error(`usage: bun scripts/screenshots.tsx <${names.join('|')}>`);
	process.exit(1);
}
const demo: Demo | Page | undefined = [...demos, ...pages].find(
	(candidate) => candidate.slug === slug,
);

const outDir = new URL(`../screenshots/${slug}/`, import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const FRAME_MS = 16;
const WINDOW_HEIGHT = 780;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({
	width: 1240,
	height: WINDOW_HEIGHT,
	fonts,
	appearance: 'dark',
});
const renderer = test.renderer;
// The App sets the theme choice "System" as `setAppearance('system')`, which hands the window back to the host's own light/dark setting. Captures are meant to be taken from a dark system, so stand in for one: a machine in light mode would otherwise render the "System" theme light.
const setAppearance = renderer.setAppearance.bind(renderer);
renderer.setAppearance = (appearance) =>
	setAppearance(appearance === 'system' ? 'dark' : appearance);

/**
 * Runs the UI for `ms`: each frame flushes the tree and drains native events,
 * so `onMotionComplete` reaches JS and an `AnimatePresence` exit unmounts
 * within one settle. A bare `flush()` never drains them.
 */
async function settle(ms = 400) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(FRAME_MS);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

function centerOf(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined)
		throw new Error(`no element with testId ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no painted bounds for ${testId}`);
	return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

const REVEAL_STEP = 300;

/** The first painted box up the tree from the element: a culled region keeps its own box. */
function paintedBoxAround(testId: string) {
	let element = renderer.findByTestId(testId);
	if (element === undefined)
		throw new Error(`no element with testId ${testId}`);
	for (;;) {
		const bounds = renderer.getElementBounds(element.id);
		if (bounds !== null) return { painted: element.testId === testId, bounds };
		if (element.parentId === null)
			throw new Error(`${testId} and its ancestors have no painted bounds`);
		const parent = renderer.getElement(element.parentId);
		if (parent === undefined)
			throw new Error(`${testId} has no ancestor ${element.parentId}`);
		element = parent;
	}
}

const SCROLL_EDGE_TOLERANCE = 0.5;

function pageScrollMetrics() {
	const scroller = renderer.findByTestId('page-scroller');
	if (scroller === undefined) throw new Error('no page-scroller element');
	const metrics = renderer.getScrollMetrics(scroller.id);
	if (metrics === null)
		throw new Error('the page scroller has no scroll metrics');
	return {
		scrollTop: metrics[1],
		scrollHeight: metrics[3],
		clientHeight: metrics[5],
	};
}

function capture(name: string) {
	renderer.captureScreenshot(`${outDir}${name}.png`);
	console.log(`captured ${slug}/${name}`);
}

const relationKeys = [
	'labelled_by',
	'described_by',
	'controls',
	'owns',
	'details',
	'flow_to',
] as const;

function idOf(testId: string) {
	const id = renderer.findByTestId(testId)?.customProps?.id;
	if (typeof id !== 'string') throw new Error(`${testId} has no id`);
	return id;
}

function ariaNode(target: string) {
	const element = renderer.findByTestId(target);
	const id = element === undefined ? target : idOf(target);
	const tree = renderer.getA11yTree();
	const nodes = tree.nodes ?? {};
	const keyToId = new Map<string, string>();
	for (const [key, node] of Object.entries(nodes)) {
		if (node.aria?.author_id !== undefined)
			keyToId.set(key, node.aria.author_id);
	}
	for (const node of Object.values(nodes)) {
		if (node.aria?.author_id !== id) continue;
		const aria: Record<string, unknown> = { ...node.aria };
		for (const relation of relationKeys) {
			const targets = node.aria[relation];
			if (targets === undefined) continue;
			aria[relation] = targets.map((key) => keyToId.get(key) ?? key);
		}
		const active = node.aria.active_descendant;
		if (active !== undefined)
			aria.active_descendant = keyToId.get(active) ?? active;
		return aria;
	}
	return undefined;
}

function expectAppearance(expected: 'light' | 'dark') {
	const actual = renderer.getAppearance();
	if (actual !== expected) {
		throw new Error(`window appearance: expected ${expected}, got ${actual}`);
	}
}

const shot: ShotContext = {
	idOf,
	aria(target) {
		const aria = ariaNode(target);
		if (aria === undefined)
			throw new Error(`no accessibility node for ${target}`);
		return aria;
	},
	expectAria(target, expected) {
		const aria = shot.aria(target);
		for (const [key, value] of Object.entries(expected)) {
			if (JSON.stringify(aria[key]) !== JSON.stringify(value)) {
				throw new Error(
					`aria ${target}.${key}: expected ${JSON.stringify(value)}, got ${JSON.stringify(aria[key])}`,
				);
			}
		}
	},
	tabStopCount() {
		const frame = renderer.getA11yTree().frame;
		if (frame === undefined) throw new Error('the a11y dump has no frame');
		return frame.tab_stop_count;
	},
	hasAriaNode(target) {
		return ariaNode(target) !== undefined;
	},
	centerOf,
	async reveal(testId) {
		for (let step = 0; step < 100; step++) {
			const box = paintedBoxAround(testId);
			if (box.painted) return;
			const above = box.bounds.y + box.bounds.height / 2 < WINDOW_HEIGHT / 2;
			await shot.scroll(600, 400, 0, above ? -REVEAL_STEP : REVEAL_STEP);
		}
		throw new Error(`${testId} stayed unpainted`);
	},
	async focus(testId) {
		const element = renderer.findByTestId(testId);
		if (element === undefined)
			throw new Error(`no element with testId ${testId}`);
		renderer.focusElement(element.id);
		await settle();
	},
	async hover(testId) {
		const point = centerOf(testId);
		renderer.nativeSimulateMouseMove(point.x, point.y);
		await settle();
	},
	async click(testId) {
		const point = centerOf(testId);
		renderer.nativeSimulateClick(point.x, point.y);
		await settle(600);
	},
	async down(testId) {
		const point = centerOf(testId);
		renderer.nativeSimulateMouseMove(point.x, point.y);
		renderer.nativeSimulateMouseDown(point.x, point.y);
		await settle();
	},
	async up(testId) {
		const point = centerOf(testId);
		renderer.nativeSimulateMouseUp(point.x, point.y);
		await settle();
	},
	async press(keystrokes) {
		renderer.simulateKeystrokes(keystrokes);
		await settle(500);
	},
	async moveTo(x, y) {
		renderer.nativeSimulateMouseMove(x, y);
		await settle();
	},
	async clickAt(x, y) {
		renderer.nativeSimulateClick(x, y);
		await settle();
	},
	async scroll(x, y, deltaX, deltaY) {
		const before = pageScrollMetrics();
		renderer.nativeSimulateScrollWheel(x, y, deltaX, deltaY);
		await settle();
		const after = pageScrollMetrics();
		const max = after.scrollHeight - after.clientHeight;
		return {
			moved: after.scrollTop !== before.scrollTop,
			atEnd:
				deltaY < 0
					? after.scrollTop <= SCROLL_EDGE_TOLERANCE
					: after.scrollTop >= max - SCROLL_EDGE_TOLERANCE,
		};
	},
	settle,
	expectText(text, present) {
		const found = renderer.getAllText().some((line) => line.includes(text));
		if (found !== present) {
			throw new Error(
				`expected "${text}" to be ${present ? 'present' : 'absent'}`,
			);
		}
	},
	capture,
};

// The window starts Dark and the theme stays on "System", so the first captures also prove `createAppearance` feeds the scheme.
expectAppearance('dark');
test.render(() => <App demos={demos} pages={pages} initialPage={slug} />);
// Fluid hover measures on timers after the first frame; 400 ms leaves the first highlight unpainted.
await settle(800);
expectAppearance('dark');
capture('initial');

await (slug === 'showcase' ? showcaseScenarios : demo?.scenarios)?.(shot);

// The same page with Radius on Pill. Set directly: it must work on full pages, which have no Radius select.
setShapeChoice('pill');
await settle(600);
capture('pill');
setShapeChoice('rounded');
await settle(600);

// And with Size on Compact, set directly for the same reason.
setSizeChoice('compact');
await settle(600);
capture('compact');
setSizeChoice('default');
await settle(600);

// Back to a neutral pointer, then flip the theme through the real control.
await shot.moveTo(1180, 700);
if (
	demo !== undefined &&
	'layout' in demo &&
	(demo.layout === 'full' || demo.Rail !== undefined)
) {
	// A full-layout page has no right column, and a page with its own rail has no theme select: neither has a control to drive.
	setThemeChoice('light');
	await settle(600);
} else {
	// A scenario may have scrolled the controls column; the theme select sits at its top.
	await shot.scroll(1080, 300, 0, -100000);
	await shot.click('theme');
	await shot.click('theme-option-light');
}
await shot.moveTo(1180, 700);
expectAppearance('light');
capture('light');

console.log('screenshots written to', outDir);
test.unmount();
process.exit(0);
