/**
 * Input copy checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-copy.tsx
 *
 * The component is mounted on its own with a no-op copy, so the clipboard is never touched.
 *
 * - A press on a resting pointer with the tooltip open says "Copied".
 * - A press while the pointer is still moving (the tooltip never opened) keeps the tooltip shut.
 * - Enter while the tooltip is open from keyboard focus closes it, as the source does.
 * - The compact row is 26px tall (4 + 18 + 4), the default row 36px.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { InputCopy } from "../src/components/input-copy";
import { TooltipProvider } from "../src/components/tooltip";
import { fonts } from "../src/lib/fonts";
import { color, setThemeChoice } from "../src/lib/theme";
import { readPng } from "./png-pixels";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 600, height: 300, fonts });
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
function centerOf(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	const bounds = renderer.getElementBounds(found.id);
	if (bounds === null) throw new Error(`no bounds for ${testId}`);
	return {
		x: bounds.x + bounds.width / 2,
		y: bounds.y + bounds.height / 2,
		height: bounds.height,
	};
}
function tooltipText() {
	if (renderer.findByTestId("subject-tooltip-chip") === undefined)
		return undefined;
	return renderer
		.getAllText()
		.find(
			(line) =>
				line === "Copied" ||
				line === "Copy to clipboard" ||
				line === "Copy failed",
		);
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}
async function reset() {
	renderer.nativeSimulateMouseMove(580, 280);
	await settle(2600);
}

setThemeChoice("dark");
test.render(() => (
	<TooltipProvider>
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 20,
				padding: 20,
				width: 400,
				backgroundColor: color.background,
			}}
		>
			<InputCopy
				testId="subject"
				value="npx shadcn@latest add input-copy"
				copy={async () => {}}
			/>
			<InputCopy
				testId="compact"
				size="compact"
				variant="button"
				value="ABCD-1234"
				copy={async () => {}}
			/>
		</div>
	</TooltipProvider>
));
await settle(600);

const subject = centerOf("subject");
report("default row is 36px", subject.height === 36, `${subject.height}`);
const compact = centerOf("compact");
report("compact row is 26px", compact.height === 26, `${compact.height}`);

// Keyboard focus opens the tooltip; Enter copies. The source's snapshot is taken on pointer press only, so this does not show "Copied".
const row = renderer.findByTestId("subject");
if (row === undefined) throw new Error("no subject");
renderer.simulateKeystrokes("Tab");
await settle(500);
if (renderer.getFocusedElementId() !== row.id)
	throw new Error("Tab did not reach the row");
const keyboardBefore = tooltipText();
renderer.simulateKeystrokes("Enter");
await settle(400);
report(
	"keyboard press: the source snapshots pointer presses only, so the tooltip closes",
	keyboardBefore === "Copy to clipboard" && tooltipText() === undefined,
	`before ${keyboardBefore}, after ${tooltipText()}`,
);

await reset();

// A resting pointer: the tooltip opens, the press keeps it open as "Copied".
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
await settle(900);
const idleTooltip = tooltipText();
renderer.nativeSimulateMouseDown(subject.x - 41, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 41, subject.y);
await settle(400);
report(
	"resting press: tooltip shows Copied",
	idleTooltip === "Copy to clipboard" && tooltipText() === "Copied",
	`before ${idleTooltip}, after ${tooltipText()}`,
);
await reset();

// A moving pointer: the tooltip keeps restarting its rest timer and never opens.
for (let step = 0; step < 14; step++) {
	renderer.nativeSimulateMouseMove(subject.x - 60 + step * 4, subject.y);
	await settle(60);
}
const movingBefore = tooltipText();
renderer.nativeSimulateMouseMove(subject.x - 4, subject.y);
renderer.nativeSimulateMouseDown(subject.x - 4, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 4, subject.y);
await settle(400);
report(
	"moving press: tooltip stays shut",
	movingBefore === undefined && tooltipText() === undefined,
	`before ${movingBefore}, after ${tooltipText()}`,
);
await reset();

// Hovering the row eases the glyph's stroke from 1.5 to 2 over 80 ms: the inked area grows frame by frame, not in one step.
const rowBox = (() => {
	const found = renderer.findByTestId("subject");
	if (found === undefined) throw new Error("no subject");
	const box = renderer.getElementBounds(found.id);
	if (box === null) throw new Error("no bounds for subject");
	return box;
})();
/** The glyph is the last thing in the row: count the pixels that differ from the row's background there. */
function glyphInk() {
	renderer.captureScreenshot("/tmp/check-input-copy-ink.png");
	const pixels = readPng("/tmp/check-input-copy-ink.png");
	const left = Math.round(rowBox.x + rowBox.width - 36);
	const right = Math.round(rowBox.x + rowBox.width - 6);
	const top = Math.round(rowBox.y + 4);
	const bottom = Math.round(rowBox.y + rowBox.height - 4);
	const ground = pixels.at(left, top);
	let ink = 0;
	for (let y = top; y < bottom; y++)
		for (let x = left; x < right; x++) {
			const pixel = pixels.at(x, y);
			ink +=
				Math.abs(pixel[0] - ground[0]) +
				Math.abs(pixel[1] - ground[1]) +
				Math.abs(pixel[2] - ground[2]);
		}
	return ink;
}
await reset();
const restInk = glyphInk();
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
renderer.flush();
renderer.dispatchNativeEvents();
// The colour switches at once, so a first frame that is only partly thickened is the stroke easing.
await sleep(10);
renderer.flush();
renderer.dispatchNativeEvents();
const earlyInk = glyphInk();
await settle(400);
const hoverInk = glyphInk();
report(
	"the glyph's stroke eases to 2 on hover",
	earlyInk > restInk && earlyInk < hoverInk - 1000,
	`rest ${restInk}, first frames ${earlyInk}, hovered ${hoverInk}`,
);

test.unmount();
process.exit(failed ? 1 : 0);
