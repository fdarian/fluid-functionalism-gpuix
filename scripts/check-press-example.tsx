/**
 * The skill page's press example presses the generic side's button to `scale-90` over 150 ms (a scale about its centre,
 * so its box shrinks 10% each way) and the scripted cursor presses to scale 0.8 and back over 200 ms (about its top-left corner).
 * The script runs on timers, so it is sampled in real time.
 *
 *   bun scripts/check-press-example.tsx
 */
import { PressExample } from '#/pages/skill/press-example';
import { createCheck } from './check-kit';

const kit = await createCheck(() => (
	<div style={{ padding: 40, width: 700 }}>
		<PressExample />
	</div>
));
const renderer = kit.renderer;
await kit.until(() => kit.exists('script-cursor'), 'the cursor to appear');

const button = 'press-generic-0';
const rest = kit.bounds(button);
const cursorRest = kit.bounds('script-cursor');
let smallestButton = rest.width;
let smallestCursor = cursorRest.width;
let heldAt: number | undefined;
let backAt: number | undefined;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const started = performance.now();
do {
	await sleep(8);
	renderer.flush();
	renderer.dispatchNativeEvents();
	const elapsed = performance.now() - started;
	const box = kit.bounds(button);
	smallestButton = Math.min(smallestButton, box.width);
	smallestCursor = Math.min(smallestCursor, kit.bounds('script-cursor').width);
	if (heldAt === undefined && box.width < rest.width * 0.99) heldAt = elapsed;
	if (
		heldAt !== undefined &&
		backAt === undefined &&
		box.width > rest.width * 0.999
	)
		backAt = elapsed;
} while (performance.now() - started < 2800);

kit.check(
	'the generic button presses to 0.9 of its size',
	Math.abs(smallestButton - rest.width * 0.9) < 0.3,
	`${smallestButton.toFixed(1)} of ${rest.width}`,
);
kit.check(
	'the cursor presses to 0.8',
	Math.abs(smallestCursor - cursorRest.width * 0.8) < 0.8,
	`${smallestCursor.toFixed(1)} of ${cursorRest.width}`,
);
const heldFor =
	backAt === undefined || heldAt === undefined ? 0 : backAt - heldAt;
kit.check(
	'the button is released after the 260 ms hold and eases back',
	heldAt !== undefined &&
		backAt !== undefined &&
		heldFor > 300 &&
		heldFor < 700,
	`pressed at ${heldAt} ms, back at ${backAt} ms`,
);
kit.finish();
