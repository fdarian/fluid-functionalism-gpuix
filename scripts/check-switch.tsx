/**
 * Switch scenarios on the Keyboard row of the switch demo.
 *
 *   bun scripts/check-switch.tsx
 */
import { createCheck } from "./check-kit";

const kit = await createCheck("switch");
const renderer = kit.renderer;
const isOn = () =>
	renderer.getAllText().some((line) => line.includes("Keys on"));
const thumbLeft = () => kit.bounds("kb-thumb").x - kit.bounds("kb-track").x;

kit.check("starts off", !isOn());
const restLeft = thumbLeft();

// A plain click toggles.
await kit.renderer.nativeSimulateClick(
	kit.center("kb-track").x,
	kit.center("kb-track").y,
);
await kit.settle(500);
kit.check("a click toggles on", isOn());
await kit.renderer.nativeSimulateClick(
	kit.center("kb-track").x,
	kit.center("kb-track").y,
);
await kit.settle(500);
kit.check("a second click toggles off", !isOn());

// Press, drag a little, lose the capture without a release: springs home, no toggle.
const point = kit.center("kb-track");
renderer.nativeSimulateMouseMove(point.x, point.y);
renderer.nativeSimulateMouseDown(point.x, point.y);
await kit.settle(300);
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(300);
kit.check(
	"dragging moves the thumb",
	thumbLeft() > restLeft + 1,
	`${thumbLeft().toFixed(1)} vs rest ${restLeft.toFixed(1)}`,
);
renderer.releasePointerCapture(kit.element("kb").id, 1);
// A JS-side capture change applies at the next native pointer input.
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(600);
kit.check("a lost capture mid-drag does not toggle", !isOn());
kit.check(
	"a lost capture mid-drag springs the thumb home",
	Math.abs(thumbLeft() - restLeft) < 0.5,
	`${thumbLeft().toFixed(1)} vs rest ${restLeft.toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(point.x, point.y);
await kit.settle(300);
kit.check("the release that follows does not toggle either", !isOn());

// Same for a press that never moved: no toggle, thumb unsquashed.
const restWidth = kit.bounds("kb-thumb").width;
renderer.nativeSimulateMouseMove(point.x, point.y);
renderer.nativeSimulateMouseDown(point.x, point.y);
await kit.settle(300);
kit.check(
	"a press squashes the thumb",
	kit.bounds("kb-thumb").width > restWidth + 1,
);
renderer.releasePointerCapture(kit.element("kb").id, 1);
// A JS-side capture change applies at the next native pointer input.
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(600);
kit.check("a lost capture after a plain press does not toggle", !isOn());
renderer.nativeSimulateMouseUp(point.x, point.y);
await kit.settle(300);

// A drag past the midpoint toggles on release.
await kit.settle(300);
renderer.nativeSimulateMouseMove(point.x, point.y);
renderer.nativeSimulateMouseDown(point.x, point.y);
await kit.settle(200);
renderer.nativeSimulateMouseMove(point.x + 4, point.y);
await kit.settle(100);
renderer.nativeSimulateMouseMove(point.x + 20, point.y);
await kit.settle(200);
renderer.nativeSimulateMouseUp(point.x + 20, point.y);
await kit.settle(500);
kit.check("a drag past the midpoint toggles on", isOn());

// While dragging only the thumb's x follows the pointer: width, height and y keep their spring, so a drag that starts mid-squash does not cut it short.
type ThumbTransition = {
	type?: string;
	duration?: number;
	left?: { duration?: number };
	width?: unknown;
	height?: unknown;
	top?: unknown;
};
function thumbTransition() {
	const motion = kit.element("kb-thumb").customProps?.motion as
		| { transition?: ThumbTransition }
		| undefined;
	if (motion?.transition === undefined)
		throw new Error("the thumb has no transition");
	return motion.transition;
}
const dragPoint = kit.center("kb-track");
renderer.nativeSimulateMouseMove(dragPoint.x, dragPoint.y);
renderer.nativeSimulateMouseDown(dragPoint.x, dragPoint.y);
await kit.settle(100);
renderer.nativeSimulateMouseMove(dragPoint.x - 6, dragPoint.y);
await kit.settle(100);
const dragging = thumbTransition();
kit.check(
	"mid-drag, x snaps and width, height and y keep the spring",
	dragging.type === "spring" &&
		dragging.left?.duration === 0 &&
		dragging.width === undefined &&
		dragging.height === undefined &&
		dragging.top === undefined,
	JSON.stringify(dragging),
);
renderer.nativeSimulateMouseUp(dragPoint.x - 6, dragPoint.y);
await kit.settle(500);

kit.finish();
