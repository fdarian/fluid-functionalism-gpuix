/**
 * Tooltip scenarios on the tooltip demo page.
 *
 *   bun scripts/check-tooltip.tsx
 *
 * - The safe polygon: the chip stays while the pointer crosses the gap to it, closes when the pointer leaves it sideways, leaves the trigger away from it, or stops in the gap.
 * - The slide offset follows the `side` prop, so a flipped tooltip still slides in from the side it did not land on.
 */
import { createCheck } from './check-kit';

const kit = await createCheck('tooltip');
const renderer = kit.renderer;

const trigger = kit.center('delay-0-trigger');
const triggerBox = kit.bounds('delay-0-trigger');
renderer.nativeSimulateMouseMove(trigger.x, trigger.y);
await kit.settle(400);
kit.check('an instant tooltip opens on hover', kit.exists('delay-0-chip'));

// Base UI's safe polygon (`safePolygon()` in base-ui-solid-gpuix): the tooltip follows the pointer from the trigger to the chip instead of closing on a timer.
const chipBox = kit.bounds('delay-0-chip');
const chipCenter = kit.center('delay-0-chip');
await kit.glide(trigger, chipCenter, 14);
await kit.settle(300);
kit.check(
	'the tooltip stays open while the pointer crosses the gap to the chip',
	kit.exists('delay-0-chip'),
);
// Sideways out of the chip, level with it: not toward the trigger.
await kit.glide(chipCenter, { x: chipCenter.x - 160, y: chipCenter.y }, 12);
await kit.until(() => !kit.exists('delay-0-chip'), 'the chip to unmount');
kit.check(
	'leaving the chip sideways closes the tooltip',
	!kit.exists('delay-0-chip'),
);

// Back onto the trigger, then straight away from the chip: no polygon covers that.
renderer.nativeSimulateMouseMove(trigger.x, trigger.y);
await kit.settle(400);
kit.check('it opens again on the trigger', kit.exists('delay-0-chip'));
await kit.glide(
	trigger,
	{ x: trigger.x, y: triggerBox.y + triggerBox.height + 120 },
	6,
);
await kit.until(() => !kit.exists('delay-0-chip'), 'the chip to unmount');
kit.check(
	'leaving the trigger away from the chip closes the tooltip',
	!kit.exists('delay-0-chip'),
);

// A pointer that stops inside the polygon but off the strip between the two boxes (the 40 ms timer of `safePolygon`) lets the tooltip go. Parked in that strip it would stay.
renderer.nativeSimulateMouseMove(trigger.x, trigger.y);
await kit.settle(400);
const corner = { x: triggerBox.x + 8, y: trigger.y };
renderer.nativeSimulateMouseMove(corner.x, corner.y);
await kit.settle(100);
// The same diagonal, carried on into the chip, keeps it open.
await kit.glide(corner, chipCenter, 8);
await kit.settle(300);
kit.check(
	'a diagonal from the trigger corner into the chip keeps the tooltip open',
	kit.exists('delay-0-chip'),
);
await kit.glide(chipCenter, corner, 8);
await kit.glide(
	corner,
	{ x: chipBox.x - 3, y: chipBox.y + chipBox.height + 2 },
	5,
);
const stoppedAt = performance.now();
await kit.until(() => !kit.exists('delay-0-chip'), 'the chip to unmount');
kit.check(
	'a pointer that stops short of the chip closes the tooltip',
	!kit.exists('delay-0-chip'),
	`${(performance.now() - stoppedAt).toFixed(0)} ms after it stopped`,
);

// The collide tooltip asks for the right and flips to the left. The motion clock is held: only the rest timer that opens the chip runs in real time, and the slide is sampled at exact frame times.
const collide = kit.center('collide');
renderer.clockPause();
renderer.nativeSimulateMouseMove(collide.x, collide.y);
renderer.nativeSimulateMouseMove(collide.x + 1, collide.y);
await kit.until(
	() => kit.exists('collide-chip'),
	'the flipped tooltip to open',
);
kit.step(0);
const first = kit.bounds('collide-chip').x;
kit.step(16);
const partway = kit.bounds('collide-chip').x;
kit.step(400);
const rest = kit.bounds('collide-chip').x;
renderer.clockResume();
kit.check(
	'it starts 4px left of rest, the way a `right` tooltip slides in',
	first < rest - 0.5 && first > rest - 4.5,
	`first ${first.toFixed(1)} vs rest ${rest.toFixed(1)}`,
);
kit.check(
	'16 ms in it is partway to rest',
	partway > first && partway < rest,
	`${first.toFixed(1)} -> ${partway.toFixed(1)} -> ${rest.toFixed(1)}`,
);
// The follow-cursor demo's y area turns its label a quarter, as `rotate-90` does: the transformed box is tall and thin, the x one wide and flat.
await kit.scrollIntoView('follow-y-label');
const turned = kit.bounds('follow-y-label');
const flat = kit.bounds('follow-x-label');
kit.check(
	'the y area label is rotated 90 degrees',
	turned.height > turned.width * 3 && flat.width > flat.height * 3,
	`y label ${turned.width.toFixed(1)} x ${turned.height.toFixed(1)}, x label ${flat.width.toFixed(1)} x ${flat.height.toFixed(1)}`,
);
const area = kit.bounds('follow-y');
kit.check(
	'the turned label stays inside its area',
	turned.y >= area.y && turned.y + turned.height <= area.y + area.height,
	`label ${turned.y.toFixed(1)}-${(turned.y + turned.height).toFixed(1)}, area ${area.y.toFixed(1)}-${(area.y + area.height).toFixed(1)}`,
);
kit.finish();
