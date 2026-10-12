/**
 * Headless captures through gpuix's offscreen test renderer: initial state,
 * a hovered sidebar row, a collapsed sub-menu, a pressed button and the open
 * combobox (open, filtered, empty). `bun scripts/screenshots.tsx`
 *
 * Real time, not the test clock: fluid hover measures on timers and motion
 * samples a wall clock, so each step sleeps for them to settle.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";

const outDir = new URL("../screenshots/", import.meta.url).pathname;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const test = createTestRoot({ width: 1240, height: 780 });
const renderer = test.renderer;

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

function expectText(text: string, present: boolean) {
	const found = renderer.getAllText().some((line) => line.includes(text));
	if (found !== present) {
		throw new Error(
			`expected "${text}" to be ${present ? "present" : "absent"}`,
		);
	}
}

function capture(name: string) {
	renderer.captureScreenshot(`${outDir}${name}.png`);
	console.log(`captured ${name}`);
}

test.render(() => <App />);
await settle();
// The first bounds query turns tracking on; the next frame fills them in.
renderer.getElementBounds(1);
await settle();
capture("initial");

const inbox = centerOf("nav-Motion");
renderer.nativeSimulateMouseMove(inbox.x, inbox.y);
await settle();
capture("sidebar-hover");

const mobileApp = centerOf("nav-Sizes");
renderer.nativeSimulateClick(mobileApp.x, mobileApp.y);
await settle();
const projects = centerOf("nav-Button");
renderer.nativeSimulateClick(projects.x, projects.y);
await settle(600);
const members = centerOf("nav-Typography");
renderer.nativeSimulateMouseMove(members.x, members.y);
await settle();
capture("sidebar-submenu-collapsed");
renderer.nativeSimulateClick(projects.x, projects.y);
await settle(600);

const primary = centerOf("Default-primary");
renderer.nativeSimulateMouseMove(primary.x, primary.y);
renderer.nativeSimulateMouseDown(primary.x, primary.y);
await settle();
capture("button-pressed");
renderer.nativeSimulateMouseUp(primary.x, primary.y);

const field = centerOf("framework-input");
renderer.nativeSimulateClick(field.x, field.y);
await settle(600);
expectText("Angular", true);
capture("combobox-open");

renderer.simulateKeystrokes(
	"backspace backspace backspace backspace backspace",
);
renderer.simulateKeystrokes("s o l");
await settle(500);
expectText("Angular", false);
capture("combobox-filtered");

renderer.simulateKeystrokes("z z");
await settle(500);
expectText("No framework found.", true);
capture("combobox-empty");

renderer.nativeSimulateClick(700, 760);
await settle();
expectText("No framework found.", false);

const theme = centerOf("theme");
renderer.nativeSimulateClick(theme.x, theme.y);
await settle(600);
expectText("Light", true);
capture("theme-select-open");
const light = renderer.findByText("Light");
if (light === undefined) throw new Error("no Light row");
const lightBounds = renderer.getElementBounds(light.id);
if (lightBounds === null) throw new Error("no bounds for the Light row");
renderer.nativeSimulateClick(lightBounds.x + 4, lightBounds.y + 4);
await settle(600);
capture("light-initial");

const lightField = centerOf("framework-input");
renderer.nativeSimulateClick(lightField.x, lightField.y);
await settle(600);
capture("light-combobox-open");

console.log("screenshots written to", outDir);
process.exit(0);
