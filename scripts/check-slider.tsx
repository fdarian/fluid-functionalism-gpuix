/**
 * Slider scenarios on the slider demo.
 *
 *   bun scripts/check-slider.tsx
 */
import { showOnly } from "../src/demos/slider";
import { createCheck } from "./check-kit";

const kit = await createCheck("slider");
const renderer = kit.renderer;
showOnly("display");
await kit.settle(400);

// Click-to-edit selects the number, so typing replaces it.
const valueId = "left-value-0";
const point = kit.center(valueId);
renderer.nativeSimulateClick(point.x, point.y);
await kit.settle(600);
kit.check("clicking the value opens the field", kit.exists("left-edit-0"));
const field = kit.element("left-edit-0");
const selection = renderer.getTextSelection(field.id);
kit.check(
	"the field selects the existing text",
	selection.start === 0 && selection.end === 2,
	`${selection.start}..${selection.end}`,
);
renderer.simulateKeystrokes("7 2");
await kit.settle(300);
renderer.simulateKeystrokes("Enter");
await kit.settle(500);
kit.check(
	"typing replaces the number",
	renderer.getAllText().some((line) => line.includes("72")),
);

// A move right after a press does not cancel the press spring: the thumb eases to the press point first, as the source does (`slider.tsx:722`, `:778`).
showOnly("compact");
await kit.settle(400);
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
const thumbCentre = () => {
	const box = kit.bounds("basic-thumb-0");
	return box.x + box.width / 2;
};
const track = kit.bounds("basic-track");
const pressX = track.x + track.width * 0.8;
const dragX = track.x + track.width * 0.2;
// The press spring starts inside the press handler, so the clock is held to land the move mid-spring.
renderer.clockPause();
renderer.nativeSimulateMouseMove(pressX, track.y + track.height / 2);
renderer.nativeSimulateMouseDown(pressX, track.y + track.height / 2);
step(16);
renderer.nativeSimulateMouseMove(dragX, track.y + track.height / 2);
step(16);
const eased = thumbCentre();
renderer.clockResume();
kit.check(
	"a move during the press spring leaves the thumb easing to the press point",
	Math.abs(eased - dragX) > 10,
	`thumb ${eased.toFixed(1)}, cursor ${dragX.toFixed(1)}, press ${pressX.toFixed(1)}`,
);
await kit.settle(500);
renderer.nativeSimulateMouseMove(dragX + 1, track.y + track.height / 2);
await kit.settle(100);
kit.check(
	"once the spring has settled a drag move places the thumb on the cursor",
	Math.abs(thumbCentre() - (dragX + 1)) < 6,
	`thumb ${thumbCentre().toFixed(1)}, cursor ${(dragX + 1).toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(dragX + 1, track.y + track.height / 2);
await kit.settle(300);

// Grabbing the scrubber's handle `set`s the comfortable fill inside a press handler: it must not throw.
showOnly("default");
await kit.settle(400);
const handle = kit.center("scrubber-handle");
renderer.nativeSimulateMouseMove(handle.x, handle.y);
renderer.nativeSimulateMouseDown(handle.x, handle.y);
await kit.settle(100);
renderer.nativeSimulateMouseMove(handle.x - 40, handle.y);
await kit.settle(200);
kit.check(
	"dragging the scrubber handle moves the handle",
	kit.center("scrubber-handle").x < handle.x - 30,
	`${handle.x.toFixed(1)} to ${kit.center("scrubber-handle").x.toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(handle.x - 40, handle.y);
await kit.settle(300);

kit.finish();
