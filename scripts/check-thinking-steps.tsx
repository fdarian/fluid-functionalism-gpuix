/**
 * A panel that mounts open should paint at its content's height from the first
 * frame, not grow from 0.
 *
 *   bun scripts/check-thinking-steps.tsx
 *
 * The basic card of the thinking-steps demo mounts open. The scenario samples its
 * panel's height frame by frame from the first render.
 *
 * The four playback cards start only once half of each is in view, pause below a
 * tenth, and resume on re-entry, as the docs page does.
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

// The playback cards in page order: streaming, streaming text, with images, full.
const labelsOf = (target: typeof kit) =>
	target.renderer
		.getAllText()
		.map((line) => line.trim())
		.filter((line) => line === 'Play' || line === 'Pause' || line === 'Replay');
const labels = () => labelsOf(kit);

kit.expect('the cards below the window wait', labels().slice(1), [
	'Play',
	'Play',
	'Play',
]);
await kit.settle(1500);
kit.expect('they are still waiting a moment later', labels()[3], 'Play');

// Cards above the one in view grow while they play and push it down, so it is brought back to the middle as it runs.
await kit.scrollIntoView('full-playback');
const until = performance.now() + 9000;
while (performance.now() < until) {
	await kit.scrollIntoView('full-playback');
	await kit.settle(300);
}
kit.expect('the full card ran to the end', labels()[3], 'Replay');
kit.renderer.nativeSimulateScrollWheel(700, 400, 0, -8000);
await kit.settle(600);
kit.expect('a finished card stays finished out of view', labels()[3], 'Replay');
const failedFirst = kit.unmount();

// A fresh page: no card has run yet, so the images card is caught while it plays.
const second = await createCheck('thinking-steps');
const images = () => labelsOf(second)[2];
const scrollBy = async (deltaY: number) => {
	second.renderer.nativeSimulateScrollWheel(700, 400, 0, deltaY);
	await second.settle(600);
};
await second.scrollIntoView('images-playback');
await second.still(['images-playback'], 'images-playback');
second.expect('the images card plays once half of it shows', images(), 'Pause');
await second.click('images-playback');
second.expect('the button pauses it', images(), 'Play');
await scrollBy(-8000);
await second.scrollIntoView('images-playback');
await second.settle(600);
second.expect(
	'leaving view clears a pause made by the button',
	images(),
	'Pause',
);
await scrollBy(-8000);
second.expect('scrolling away pauses a playing card', images(), 'Play');
await second.scrollIntoView('images-playback');
await second.settle(600);
second.expect('coming back resumes it', images(), 'Pause');

const failedSecond = second.unmount();
const failed = failedFirst + failedSecond;
console.log(failed === 0 ? 'all passed' : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
