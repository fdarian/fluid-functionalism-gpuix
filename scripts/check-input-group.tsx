/**
 * Input group checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-group.tsx
 *
 * - Tab never lands on the disabled field.
 * - The error caption is 12/16 at the default step and 11/14 at the compact one.
 * - Hovering a field eases its ring in over 80 ms instead of switching it.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "#/app";
import { loadDemos, loadPages } from "#/lib/demo";
import { fonts } from "#/lib/fonts";
import { setThemeChoice } from "#/lib/theme";
import { scrollIntoView } from "./check-kit";
import { readPng } from "./png-pixels";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function caption(text: string) {
	const node = renderer.findByText(text);
	if (node === undefined || node.parentId === null)
		throw new Error(`no text ${text}`);
	const found = renderer.getElement(node.parentId);
	if (found === undefined) throw new Error(`no <text> for ${text}`);
	return `${found.style.fontSize}/${found.style.lineHeight}`;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} initialPage="input-group" />);
await settle(800);

const disabledInput = element("disabled-input").id;
const reached = new Set<number>();
for (let presses = 0; presses < 40; presses++) {
	renderer.simulateKeystrokes("Tab");
	await settle(60);
	const focused = renderer.getFocusedElementId();
	if (focused !== null) reached.add(focused);
}
report(
	"disabled field is out of the Tab order",
	!reached.has(disabledInput),
	`Tab reached ${reached.size} elements, the disabled input ${reached.has(disabledInput) ? "among them" : "not among them"}`,
);

const defaultCaption = caption("Please enter a valid email address.");
report(
	"default error caption is 12/16",
	defaultCaption === "12/16",
	defaultCaption,
);
const compactCaption = caption("Enter a valid email.");
report(
	"compact error caption is 11/14",
	compactCaption === "11/14",
	compactCaption,
);

// Hover fade, on a held motion clock so a slow frame cannot skip the middle of the 80 ms.
const FADE_PATH = `/tmp/check-input-group-${process.pid}.png`;
await scrollIntoView(renderer, "name");
const field = renderer.getElementBounds(element("name").id);
if (field === null) throw new Error("no bounds for the name field");
// The ring is a 1px outline just outside the field box's left edge, and shows up only on hover.
const probe = {
	x: Math.round(field.x) - 1,
	y: Math.round(field.y + field.height - 18),
};
function ringSum() {
	renderer.captureScreenshot(FADE_PATH);
	const pixel = readPng(FADE_PATH).at(probe.x, probe.y);
	return pixel[0] + pixel[1] + pixel[2];
}
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
renderer.nativeSimulateMouseMove(2, 2);
await settle(300);
const ringRest = ringSum();
renderer.clockPause();
renderer.nativeSimulateMouseMove(probe.x + 40, probe.y);
renderer.nativeSimulateMouseMove(probe.x + 41, probe.y);
step(0);
step(16);
const ringMiddle = ringSum();
step(300);
const ringHovered = ringSum();
renderer.clockResume();
report(
	"hover ring is part-way at 16 ms",
	ringHovered > ringRest + 4 &&
		ringMiddle > ringRest &&
		ringMiddle < ringRest + 0.6 * (ringHovered - ringRest),
	`rest ${ringRest}, 16 ms ${ringMiddle}, end ${ringHovered}`,
);

test.unmount();
process.exit(failed ? 1 : 0);
