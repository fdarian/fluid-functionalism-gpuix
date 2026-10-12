/**
 * Headless captures through gpuix's offscreen test renderer: the initial
 * state, a hovered sidebar row, a pressed button and the open combobox.
 * `bun scripts/screenshots.tsx`
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";

const outDir = new URL("../screenshots/", import.meta.url).pathname;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const test = createTestRoot({ width: 1100, height: 720 });
const renderer = test.renderer;

/** Real time, not the test clock: fluid hover measures on timers and motion samples a wall clock. */
async function settle(ms = 400) {
	await sleep(ms);
	renderer.flush();
}

function centerOf(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined)
		throw new Error(`no element with testId ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no painted bounds for ${testId}`);
	return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
}

test.render(() => <App />);
await settle();
// The first bounds query turns tracking on; the next frame fills them in.
renderer.getElementBounds(1);
await settle();
renderer.captureScreenshot(`${outDir}initial.png`);

const inbox = centerOf("nav-Inbox");
renderer.nativeSimulateMouseMove(inbox.x, inbox.y);
await settle();
renderer.captureScreenshot(`${outDir}sidebar-hover.png`);

const calendar = centerOf("nav-Calendar");
renderer.nativeSimulateMouseMove(calendar.x, calendar.y);
await settle(90);
renderer.captureScreenshot(`${outDir}sidebar-hover-gliding.png`);
await settle();

const field = centerOf("framework-input");
renderer.nativeSimulateClick(field.x, field.y);
await settle(600);
renderer.captureScreenshot(`${outDir}combobox-open.png`);

console.log("screenshots written to", outDir);
process.exit(0);
