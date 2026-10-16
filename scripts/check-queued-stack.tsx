/**
 * Queued stack scenarios on the queued-stack demo.
 *
 *   bun scripts/check-queued-stack.tsx
 *
 * - The stack fans out under the pointer and stays fanned out while the pointer walks from card to card across the gaps.
 * - It folds back when the pointer leaves the stack, with no hold. Only the stack reports enter / leave, as in the source, so a card the pointer moves between still counts as the stack.
 */
import { createCheck } from './check-kit';

const kit = await createCheck('queued-stack');
const renderer = kit.renderer;

/** Fanned out when the back card sits far above the front one; folded, a peek apart. */
const isExpanded = () =>
	kit.bounds('queued-1').y - kit.bounds('queued-4').y > 80;

await kit.settle(600);
kit.check('starts folded', !isExpanded());

const front = kit.center('queued-1');
renderer.nativeSimulateMouseMove(front.x, front.y);
await kit.settle(700);
kit.check('hovering the front card fans the stack out', isExpanded());

// Walk straight up through every card and the gaps between them, a step a frame. The motion clock is held and stepped 16 ms a frame, so a slow machine cannot give the spring longer between moves.
const top = kit.bounds('queued-4');
let folded = false;
renderer.clockPause();
for (let y = front.y; y > top.y + 4; y -= 3) {
	renderer.nativeSimulateMouseMove(front.x, y);
	kit.step(16);
	if (!isExpanded()) folded = true;
}
kit.check('walking up the cards never folds the stack', !folded);

// And off the stack: folds at once.
renderer.nativeSimulateMouseMove(2, 2);
let foldedAfter: number | undefined;
for (
	let elapsed = 0;
	elapsed <= 800 && foldedAfter === undefined;
	elapsed += 8
) {
	kit.step(8);
	if (!isExpanded()) foldedAfter = elapsed;
}
renderer.clockResume();
kit.check(
	'leaving the stack folds it',
	foldedAfter !== undefined,
	`${foldedAfter} ms`,
);
kit.finish();
