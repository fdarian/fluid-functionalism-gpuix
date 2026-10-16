/**
 * Tooltip scenarios on the tooltip demo page.
 *
 *   bun scripts/check-tooltip.tsx
 *
 * - The exit keeps the chip mounted until its fade finishes, and releases it when the fade ends.
 * - The slide offset follows the `side` prop, so a flipped tooltip still slides in from the side it did not land on.
 */
import { createCheck } from "./check-kit";

const kit = await createCheck("tooltip");
const renderer = kit.renderer;

const trigger = kit.center("delay-0-trigger");
renderer.nativeSimulateMouseMove(trigger.x, trigger.y);
await kit.settle(400);
kit.check("an instant tooltip opens on hover", kit.exists("delay-0-chip"));
renderer.nativeSimulateMouseMove(2, 2);
const leftAt = performance.now();
kit.check(
	"the chip stays mounted through the grace",
	kit.exists("delay-0-chip"),
);
await kit.until(() => !kit.exists("delay-0-chip"), "the chip to unmount");
const goneAfter = performance.now() - leftAt;
// A JS timer is never early: the 80 ms grace and the fade after it are a hard lower bound. Release is guaranteed by the presence fallback, so the wait above is the upper bound.
kit.check(
	"the chip unmounts after the grace and its fade",
	goneAfter >= 80 + 40,
	`${goneAfter.toFixed(0)} ms after the pointer left`,
);

// The collide tooltip asks for the right and flips to the left. The motion clock is held: only the rest timer that opens the chip runs in real time, and the slide is sampled at exact frame times.
const collide = kit.center("collide");
renderer.clockPause();
renderer.nativeSimulateMouseMove(collide.x, collide.y);
renderer.nativeSimulateMouseMove(collide.x + 1, collide.y);
await kit.until(() => kit.exists("collide-chip"), "the flipped tooltip to open");
kit.step(0);
const first = kit.bounds("collide-chip").x;
kit.step(16);
const partway = kit.bounds("collide-chip").x;
kit.step(400);
const rest = kit.bounds("collide-chip").x;
renderer.clockResume();
kit.check(
	"it starts 4px left of rest, the way a `right` tooltip slides in",
	first < rest - 0.5 && first > rest - 4.5,
	`first ${first.toFixed(1)} vs rest ${rest.toFixed(1)}`,
);
kit.check(
	"16 ms in it is partway to rest",
	partway > first && partway < rest,
	`${first.toFixed(1)} -> ${partway.toFixed(1)} -> ${rest.toFixed(1)}`,
);
kit.finish();
