/**
 * Switch scenarios on the Keyboard row of the switch demo.
 *
 *   bun scripts/check-switch.tsx
 */
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const kit = await createCheck('switch');
const renderer = kit.renderer;
const isOn = () =>
	renderer.getAllText().some((line) => line.includes('Keys on'));
const thumbLeft = () => kit.bounds('kb-thumb').x - kit.bounds('kb-track').x;

kit.check('starts off', !isOn());
const restLeft = thumbLeft();

// A plain click toggles.
await kit.renderer.nativeSimulateClick(
	kit.center('kb-track').x,
	kit.center('kb-track').y,
);
await kit.settle(500);
kit.check('a click toggles on', isOn());
await kit.renderer.nativeSimulateClick(
	kit.center('kb-track').x,
	kit.center('kb-track').y,
);
await kit.settle(500);
kit.check('a second click toggles off', !isOn());

// Press, drag a little, lose the capture without a release: springs home, no toggle.
const point = kit.center('kb-track');
renderer.nativeSimulateMouseMove(point.x, point.y);
renderer.nativeSimulateMouseDown(point.x, point.y);
await kit.settle(300);
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(300);
kit.check(
	'dragging moves the thumb',
	thumbLeft() > restLeft + 1,
	`${thumbLeft().toFixed(1)} vs rest ${restLeft.toFixed(1)}`,
);
// The release never arrives; the next move carries no button.
renderer.simulateLostMouseUp();
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(600);
kit.check('a lost capture mid-drag does not toggle', !isOn());
kit.check(
	'a lost capture mid-drag springs the thumb home',
	Math.abs(thumbLeft() - restLeft) < 0.5,
	`${thumbLeft().toFixed(1)} vs rest ${restLeft.toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(point.x, point.y);
await kit.settle(300);
kit.check('the release that follows does not toggle either', !isOn());

// Same for a press that never moved: no toggle, thumb unsquashed.
const restWidth = kit.bounds('kb-thumb').width;
renderer.nativeSimulateMouseMove(point.x, point.y);
renderer.nativeSimulateMouseDown(point.x, point.y);
await kit.settle(300);
kit.check(
	'a press squashes the thumb',
	kit.bounds('kb-thumb').width > restWidth + 1,
);
// The release never arrives; the next move carries no button.
renderer.simulateLostMouseUp();
renderer.nativeSimulateMouseMove(point.x + 6, point.y);
await kit.settle(600);
kit.check('a lost capture after a plain press does not toggle', !isOn());
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
kit.check('a drag past the midpoint toggles on', isOn());

// While dragging only the thumb's x follows the pointer, 1:1 with no spring on it: width, height and y keep theirs, so a drag that starts mid-squash does not cut it short.
type ThumbTransition = { type?: string; duration?: number };
function thumbTransition() {
	const motion = kit.element('kb-thumb').customProps?.motion as
		| { transition?: ThumbTransition }
		| undefined;
	if (motion?.transition === undefined)
		throw new Error('the thumb has no transition');
	return motion.transition;
}
const dragPoint = kit.center('kb-track');
renderer.nativeSimulateMouseMove(dragPoint.x, dragPoint.y);
renderer.nativeSimulateMouseDown(dragPoint.x, dragPoint.y);
await kit.settle(100);
renderer.nativeSimulateMouseMove(dragPoint.x - 6, dragPoint.y);
await kit.settle(100);
const shape = thumbTransition();
renderer.clockPause();
const beforeMove = kit.bounds('kb-thumb').x;
renderer.nativeSimulateMouseMove(dragPoint.x - 2, dragPoint.y);
kit.step(0);
const afterMove = kit.bounds('kb-thumb').x;
renderer.clockResume();
kit.check(
	'mid-drag, x follows the pointer in the frame it moves and width, height and y keep the spring',
	shape.type === 'spring' && Math.abs(afterMove - beforeMove - 4) < 0.01,
	`thumb ${JSON.stringify(shape)}, 4px pointer move gave ${(afterMove - beforeMove).toFixed(3)}px`,
);
renderer.nativeSimulateMouseMove(dragPoint.x - 6, dragPoint.y);
await kit.settle(100);
renderer.nativeSimulateMouseUp(dragPoint.x - 6, dragPoint.y);
await kit.settle(500);

// The track eases to its hover colour over 80 ms instead of switching. The motion clock is held and stepped by hand
// so a slow frame cannot skip the middle. The switch is off here, so the track's right end is clear of the thumb.
const FADE_PATH = `/tmp/check-switch-fade-${process.pid}.png`;
function trackSum() {
	renderer.captureScreenshot(FADE_PATH);
	const box = kit.bounds('kb-track');
	const pixel = readPng(FADE_PATH).at(
		Math.round(box.x + box.width - 3),
		Math.round(box.y + box.height / 2),
	);
	return pixel[0] + pixel[1] + pixel[2];
}
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
renderer.nativeSimulateMouseMove(2, 2);
await kit.settle(300);
const trackRest = trackSum();
renderer.clockPause();
const trackPoint = kit.center('kb-track');
renderer.nativeSimulateMouseMove(trackPoint.x - 1, trackPoint.y);
renderer.nativeSimulateMouseMove(trackPoint.x, trackPoint.y);
step(0);
step(16);
const trackMiddle = trackSum();
step(300);
const trackHovered = trackSum();
renderer.clockResume();
kit.check(
	'track: 16 ms into the hover, between the resting and the hovered colour',
	Math.min(trackRest, trackHovered) + 2 < trackMiddle &&
		trackMiddle < Math.max(trackRest, trackHovered) - 2,
	`rest ${trackRest}, 16 ms ${trackMiddle}, end ${trackHovered}`,
);

kit.finish();
