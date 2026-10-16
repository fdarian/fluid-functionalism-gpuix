/**
 * A panel that mounts open should paint at its content's height from the first
 * frame, not grow from 0.
 *
 *   bun scripts/check-thinking-steps.tsx
 *
 * The basic card of the thinking-steps demo mounts open. The scenario samples its
 * panel's height frame by frame from the first render.
 */
import { createCheck } from './check-kit';

const kit = await createCheck('thinking-steps', { initialSettleMs: 0 });
const renderer = kit.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const heights: number[] = [];
// The motion clock is held and stepped 4 ms a frame: the heights sampled are the same whatever the machine's speed.
renderer.clockPause();
for (let frame = 0; frame < 375; frame++) {
	renderer.clockFastForward(frame === 0 ? 0 : 4);
	renderer.flush();
	// Sampled between the frame and the events it queued: a layout report arrives after the frame it measured.
	if (kit.exists('basic-panel')) {
		const bounds = renderer.getElementBounds(kit.element('basic-panel').id);
		heights.push(bounds === null ? 0 : bounds.height);
	}
	renderer.dispatchNativeEvents();
	// The page's real-time work (a mount timer) still needs wall time between frames.
	await sleep(2);
}
renderer.clockResume();
const settled = heights[heights.length - 1];
console.log(
	`panel height by frame: ${heights
		.slice(0, 24)
		.map((height) => height.toFixed(0))
		.join(' ')} ... ${settled.toFixed(0)}`,
);

kit.check('the panel paints', heights.length > 0 && settled > 0);
// Steps grow their own rows in, so the panel keeps tracking a growing content; it must never start below its content padding (4 + 12).
kit.check(
	'the open panel is never painted collapsed',
	heights.every((height) => height >= 16),
	`smallest ${Math.min(...heights).toFixed(1)}`,
);
// Once the first layout report lands the panel follows its content frame by frame: no step back down.
let shrank = 0;
for (let index = 1; index < heights.length; index++) {
	if (heights[index] < heights[index - 1] - 0.5) shrank++;
}
kit.check(
	'the panel never shrinks while it settles',
	shrank === 0,
	`${shrank} shrinking frames`,
);

kit.finish();
