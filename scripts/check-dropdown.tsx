/**
 * Dropdown scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-dropdown.tsx
 */
import { mkdirSync } from "node:fs";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

async function settle(ms = 400) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
}
function boundsOf(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no element ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no bounds for ${testId}`);
	return bounds;
}
function exists(testId: string) {
	return renderer.findByTestId(testId) !== undefined;
}
async function click(testId: string) {
	const bounds = boundsOf(testId);
	renderer.nativeSimulateClick(
		bounds.x + bounds.width / 2,
		bounds.y + bounds.height / 2,
	);
	await settle();
}
async function press(keys: string) {
	renderer.simulateKeystrokes(keys);
	await settle(250);
}
function check(label: string, ok: boolean, detail?: string) {
	console.log(
		`${ok ? "PASS" : "FAIL"} ${label}${detail === undefined ? "" : ` (${detail})`}`,
	);
	if (!ok) process.exitCode = 1;
}
async function scrollIntoView(testId: string) {
	for (let attempts = 0; attempts < 30; attempts++) {
		const element = renderer.findByTestId(testId);
		const bounds =
			element === undefined ? null : renderer.getElementBounds(element.id);
		const center = bounds === null ? null : bounds.y + bounds.height / 2;
		console.log(`scroll ${testId}: ${center}`);
		if (center !== null && center > 120 && center < 600) return;
		renderer.nativeSimulateScrollWheel(
			700,
			400,
			0,
			center === null ? -400 : -(center - 200),
		);
		await settle(150);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

const demos = await loadDemos();
setThemeChoice("dark");
test.render(() => <App demos={demos} initialPage="dropdown" />);
await settle(800);

// Inline panel: a pointer click must not draw the keyboard ring.
await scrollIntoView("basic-0");
// The same steps as the `inline-checked` capture of scripts/screenshots.tsx, which
// cannot run past its submenu step in some environments.
const hovered = boundsOf("basic-2");
renderer.nativeSimulateMouseMove(
	hovered.x + 20,
	hovered.y + hovered.height / 2,
);
await settle();
await click("basic-3");
renderer.nativeSimulateMouseMove(700, 80);
await settle();
mkdirSync("/tmp/check-dropdown", { recursive: true });
renderer.captureScreenshot("/tmp/check-dropdown/inline-checked.png");
check("inline: no ring after clicking a row", !exists("basic-ring"));
await click("basic-1");
check("inline: no ring after a mouse click", !exists("basic-ring"));
const next = boundsOf("basic-2");
renderer.nativeSimulateMouseMove(next.x + 20, next.y + next.height / 2);
await settle(200);
check("inline: no ring after a pointer move", !exists("basic-ring"));
await press("down");
check("inline: ring after an arrow key", exists("basic-ring"));

// Inline panel, keyboard entry: Tab into the group draws the ring.
await scrollIntoView("groups-0");
for (let presses = 0; presses < 40 && !exists("groups-ring"); presses++) {
	await press("tab");
}
check("inline: ring after Tab entry", exists("groups-ring"));

// Searchable menu: with a row lit by the arrows, Space, Home and End act on it.
const shown = (text: string) =>
	renderer.getAllText().some((line) => line === text);
async function openSearch() {
	await scrollIntoView("search-trigger");
	// A pointer open reads focus inside a mousedown handler, which the test renderer refuses.
	const trigger = renderer.findByTestId("search-trigger");
	if (trigger === undefined) throw new Error("no search-trigger");
	renderer.focusElement(trigger.id);
	await settle(100);
	await press("enter");
	await settle(300);
}
async function pickWith(keys: string, expected: string, label: string) {
	await openSearch();
	await press(keys);
	check(label, shown(expected), `trigger shows ${expected}`);
	if (exists("search-0")) await press("escape");
}

await pickWith(
	"down down space",
	"Albanian (Albania)",
	"search: Space activates the lit row",
);
await pickWith(
	"down down down down home down down enter",
	"Arabic",
	"search: Home lights the first row",
);
await pickWith(
	"down end up enter",
	"Ukrainian",
	"search: End lights the last row",
);

// No row lit: the field owns Space. " " keeps only the eight languages with a space.
await openSearch();
await press("space");
check(
	"search: Space types into the field while no row is lit",
	exists("search-7") && !exists("search-8") && !shown("Arabic"),
);
await press("escape");

process.exit(process.exitCode ?? 0);
