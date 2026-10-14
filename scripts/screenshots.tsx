/**
 * Headless captures of one demo page through gpuix's offscreen test renderer.
 *
 *   bun scripts/screenshots.tsx <demo>      # a file name in src/demos/, or "showcase"
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
import { type Demo, loadDemos, type ShotContext } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";

const slug = process.argv[2];
const demos = await loadDemos();
const names = ["showcase", ...demos.map((demo) => demo.slug)];
if (slug === undefined || !names.includes(slug)) {
	console.error(`usage: bun scripts/screenshots.tsx <${names.join("|")}>`);
	process.exit(1);
}
const demo: Demo | undefined = demos.find(
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

const shot: ShotContext = {
	centerOf,
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

test.render(() => <App demos={demos} initialPage={slug} />);
await settle();
// The first bounds query turns tracking on; the next frame fills them in.
renderer.getElementBounds(1);
await settle();
capture("initial");

await demo?.scenarios?.(shot);

// Back to a neutral pointer, then flip the theme through the real control.
await shot.moveTo(1180, 700);
await shot.click("theme");
const lightRow = renderer.findByText("Light");
if (lightRow === undefined)
	throw new Error("the theme select has no Light row");
const lightBounds = renderer.getElementBounds(lightRow.id);
if (lightBounds === null)
	throw new Error("no painted bounds for the Light row");
renderer.nativeSimulateClick(lightBounds.x + 4, lightBounds.y + 4);
await settle(600);
await shot.moveTo(1180, 700);
capture("light");

console.log("screenshots written to", outDir);
process.exit(0);
