/**
 * Slider scenarios on the slider demo.
 *
 *   bun scripts/check-slider.tsx
 */
import { resizeTo, showOnly } from '#/demos/slider';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const kit = await createCheck('slider');
const renderer = kit.renderer;
showOnly('display');
await kit.settle(400);

// The label and the value are spans of one text, and the label keeps its trailing space: "Volume: 40", not "Volume:40".
const valueId = 'left-value-0';
const labelBox = kit.bounds('left-label');
const valueBox = kit.bounds(valueId);
kit.check(
	'the value starts where the label ends',
	Math.abs(valueBox.x - (labelBox.x + labelBox.width)) < 0.5,
	`label ${labelBox.x}+${labelBox.width}, value ${valueBox.x}`,
);

// Only the value span starts editing: a click on the label span, in the same text, does not.
const labelPoint = kit.center('left-label');
renderer.nativeSimulateClick(labelPoint.x, labelPoint.y);
await kit.settle(300);
kit.check(
	'clicking the label does not open the field',
	!kit.exists('left-edit-0'),
);

// Click-to-edit selects the number, so typing replaces it.
const point = kit.center(valueId);
renderer.nativeSimulateClick(point.x, point.y);
await kit.settle(600);
kit.check('clicking the value span opens the field', kit.exists('left-edit-0'));
kit.check(
	'the label is wider than its colon alone by a space',
	labelBox.width - kit.bounds('left-edit-label').width > 2,
	`${labelBox.width} against ${kit.bounds('left-edit-label').width}`,
);
const field = kit.element('left-edit-0');
const selection = renderer.getTextSelection(field.id);
kit.check(
	'the field selects the existing text',
	selection.start === 0 && selection.end === 2,
	`${selection.start}..${selection.end}`,
);
renderer.simulateKeystrokes('7 2');
await kit.settle(300);
renderer.simulateKeystrokes('Enter');
await kit.settle(500);
kit.check(
	'typing replaces the number',
	renderer.getAllText().some((line) => line.includes('72')),
);

// A move right after a press does not cancel the press spring: the thumb eases to the press point first, as the source does (`slider.tsx:722`, `:778`).
showOnly('compact');
await kit.settle(400);
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
const thumbCentre = () => {
	const box = kit.bounds('basic-thumb-0');
	return box.x + box.width / 2;
};
const track = kit.bounds('basic-track');
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
	'a move during the press spring leaves the thumb easing to the press point',
	Math.abs(eased - dragX) > 10,
	`thumb ${eased.toFixed(1)}, cursor ${dragX.toFixed(1)}, press ${pressX.toFixed(1)}`,
);
await kit.settle(500);
renderer.nativeSimulateMouseMove(dragX + 1, track.y + track.height / 2);
await kit.settle(100);
kit.check(
	'once the spring has settled a drag move places the thumb on the cursor',
	Math.abs(thumbCentre() - (dragX + 1)) < 6,
	`thumb ${thumbCentre().toFixed(1)}, cursor ${(dragX + 1).toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(dragX + 1, track.y + track.height / 2);
await kit.settle(300);

// Grabbing the scrubber's handle `set`s the comfortable fill inside a press handler: it must not throw.
showOnly('default');
await kit.settle(400);
const handle = kit.center('scrubber-handle');
renderer.nativeSimulateMouseMove(handle.x, handle.y);
renderer.nativeSimulateMouseDown(handle.x, handle.y);
await kit.settle(100);
renderer.nativeSimulateMouseMove(handle.x - 40, handle.y);
await kit.settle(200);
kit.check(
	'dragging the scrubber handle moves the handle',
	kit.center('scrubber-handle').x < handle.x - 30,
	`${handle.x.toFixed(1)} to ${kit.center('scrubber-handle').x.toFixed(1)}`,
);
renderer.nativeSimulateMouseUp(handle.x - 40, handle.y);
await kit.settle(300);

// The row's focus ring eases in over 80 ms, as the source's animated outline does.
showOnly('default');
await kit.settle(400);
{
	const row = kit.bounds('scrubber-row');
	const ring = () => {
		renderer.captureScreenshot(`/tmp/check-slider-fade-${process.pid}.png`);
		const pixel = readPng(`/tmp/check-slider-fade-${process.pid}.png`).at(
			Math.round(row.x + row.width / 2),
			Math.round(row.y - 3),
		);
		return pixel[2];
	};
	renderer.clockPause();
	const rest = ring();
	renderer.focusElement(kit.element('scrubber-thumb').id);
	step(0);
	step(16);
	const early = ring();
	step(300);
	const focused = ring();
	renderer.clockResume();
	kit.check(
		"the row's focus ring is partway 16 ms after focus",
		early > rest + 5 && early < focused - 5,
		`rest ${rest}, 16 ms ${early}, focused ${focused}`,
	);
	renderer.focusElement(kit.element('scrubber-thumb').id);
	await kit.settle(100);
}

// The comfortable layers are `calc()` of the row's own width, so a resize moves them in the frame that lays it out, with no measured width to wait for.
showOnly('default');
await kit.settle(400);
renderer.clockPause();
for (const width of [160, 288, 200]) {
	resizeTo(width);
	renderer.flush();
	renderer.dispatchNativeEvents();
	const inside = kit.bounds('resize-pips-row').width - 2;
	// Value 2 of 0..4 is half the row: the pips fill runs to p * width + 20 - 20 * p, the line sits at p * width + 11 - 24 * p.
	const fillEdge = kit.bounds('resize-pips-fill').width;
	const lineLeft =
		kit.bounds('resize-pips-line').x - kit.bounds('resize-pips-fill').x;
	kit.check(
		`the pips fill follows a resize to ${width} in the same frame`,
		Math.abs(fillEdge - (inside / 2 + 10)) < 1.01,
		`fill ${fillEdge}, want ${inside / 2 + 10}`,
	);
	kit.check(
		`the pips line follows a resize to ${width} in the same frame`,
		Math.abs(lineLeft - (inside / 2 - 1)) < 1.01,
		`line ${lineLeft}, want ${inside / 2 - 1}`,
	);
}
renderer.clockResume();
resizeTo(288);

kit.finish();
