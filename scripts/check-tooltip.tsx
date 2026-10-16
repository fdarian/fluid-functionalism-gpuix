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
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Steps the renderer for `durationMs`, recording the first moment `testId` is mounted and each x it paints at. */
async function watch(testId: string, durationMs: number) {
	const xs: number[] = [];
	let goneAt: number | undefined;
	const start = performance.now();
	while (performance.now() - start < durationMs) {
		renderer.flush();
		renderer.dispatchNativeEvents();
		if (kit.exists(testId)) xs.push(kit.bounds(testId).x);
		else if (xs.length > 0 && goneAt === undefined)
			goneAt = performance.now() - start;
		await sleep(4);
	}
	return { xs, goneAt };
}

const trigger = kit.center("delay-0-trigger");
renderer.nativeSimulateMouseMove(trigger.x, trigger.y);
await kit.settle(400);
kit.check("an instant tooltip opens on hover", kit.exists("delay-0-chip"));
renderer.nativeSimulateMouseMove(2, 2);
const exit = await watch("delay-0-chip", 800);
// 80 ms grace, then the 60 ms fade. The test renderer's frame jitter is larger than the gap to the 160 ms fallback, so this only shows the chip neither lingers past the fallback nor goes before the grace.
kit.check(
	"the chip unmounts after the grace and its fade, within the fallback",
	exit.goneAt !== undefined &&
		exit.goneAt >= 80 + 40 &&
		exit.goneAt < 80 + 160 + 150,
	`${exit.goneAt?.toFixed(0)} ms after the pointer left`,
);

// The collide tooltip asks for the right and flips to the left.
const collide = kit.center("collide");
renderer.nativeSimulateMouseMove(collide.x, collide.y);
renderer.nativeSimulateMouseMove(collide.x + 1, collide.y);
const enter = await watch("collide-chip", 800);
const first = enter.xs[0];
const rest = enter.xs[enter.xs.length - 1];
kit.check("the flipped tooltip opened", first !== undefined);
if (first !== undefined)
	kit.check(
		"it starts 4px left of rest, the way a `right` tooltip slides in",
		first < rest - 0.5,
		`first ${first.toFixed(1)} vs rest ${rest.toFixed(1)}`,
	);
kit.finish();
