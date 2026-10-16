/**
 * Headless captures of one demo page through gpuix's offscreen test renderer.
 *
 *   bun scripts/screenshots.tsx <slug>      # a file name in src/demos/ or src/pages/, or "showcase"
 *
 * Writes `screenshots/<demo>/initial.png`, then whatever the demo's
 * `scenarios` capture, then `light.png`: the same page after switching the
 * theme with the "Make them yours" select.
 *
 * Real time, not the test clock: fluid hover measures on timers and motion
 * samples a wall clock, so each step runs frames until they settle.
 */
import { mkdirSync } from "node:fs";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import {
	type Demo,
	loadDemos,
	loadPages,
	type Page,
	type ShotContext,
} from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const slug = process.argv[2];
const demos = await loadDemos();
const pages = await loadPages(demos);
const names = [
	"showcase",
	...demos.map((demo) => demo.slug),
	...pages.map((page) => page.slug),
];
if (slug === undefined || !names.includes(slug)) {
	console.error(`usage: bun scripts/screenshots.tsx <${names.join("|")}>`);
	process.exit(1);
}
const demo: Demo | Page | undefined = [...demos, ...pages].find(
	(candidate) => candidate.slug === slug,
);

const outDir = new URL(`../screenshots/${slug}/`, import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const FRAME_MS = 16;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

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

function capture(name: string) {
	renderer.captureScreenshot(`${outDir}${name}.png`);
	console.log(`captured ${slug}/${name}`);
}

const relationKeys = [
	"labelled_by",
	"described_by",
	"controls",
	"owns",
	"details",
	"flow_to",
] as const;

function idOf(testId: string) {
	const id = renderer.findByTestId(testId)?.customProps?.id;
	if (typeof id !== "string") throw new Error(`${testId} has no id`);
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
		if (active !== undefined) aria.active_descendant = keyToId.get(active) ?? active;
		return aria;
	}
	return undefined;
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
		// `A11yTreeDump` omits the frame header that the native dump carries.
		const tree = renderer.getA11yTree() as {
			frame?: { tab_stop_count?: number };
		};
		const count = tree.frame?.tab_stop_count;
		if (count === undefined) throw new Error("the frame reports no tab stops");
		return count;
	},
	hasAriaNode(target) {
		return ariaNode(target) !== undefined;
	},
	centerOf,
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
		renderer.nativeSimulateScrollWheel(x, y, deltaX, deltaY);
		await settle();
	},
	async moveHeld(x, y) {
		renderer.nativeSimulateMouseMove(x, y, 0);
		await settle();
	},
	settle,
	expectText(text, present) {
		const found = renderer.getAllText().some((line) => line.includes(text));
		if (found !== present) {
			throw new Error(
				`expected "${text}" to be ${present ? "present" : "absent"}`,
			);
		}
	},
	capture,
};

// The test renderer reports the machine's appearance; pin the scheme so captures are reproducible.
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} initialPage={slug} />);
// Fluid hover measures on timers after the first frame; 400 ms leaves the first highlight unpainted.
await settle(800);
capture("initial");

await demo?.scenarios?.(shot);

// Back to a neutral pointer, then flip the theme through the real control.
await shot.moveTo(1180, 700);
if (demo !== undefined && "layout" in demo && demo.layout === "full") {
	// A full-layout page has no right column, so no theme select to drive.
	setThemeChoice("light");
	await settle(600);
} else {
	await shot.click("theme");
	const lightRow = renderer.findByText("Light");
	if (lightRow === undefined)
		throw new Error("the theme select has no Light row");
	const lightBounds = renderer.getElementBounds(lightRow.id);
	if (lightBounds === null)
		throw new Error("no painted bounds for the Light row");
	renderer.nativeSimulateClick(lightBounds.x + 4, lightBounds.y + 4);
	await settle(600);
}
await shot.moveTo(1180, 700);
capture("light");

console.log("screenshots written to", outDir);
process.exit(0);
