/**
 * Queued stack scenarios on the queued-stack demo.
 *
 *   bun scripts/check-queued-stack.tsx
 *
 * - The stack fans out under the pointer and stays fanned out while the pointer walks from card to card across the gaps.
 * - It folds back when the pointer leaves the stack, with no hold. Only the stack reports enter / leave, as in the source, so a card the pointer moves between still counts as the stack.
 * - Every card of a fanned-out pile draws its text, however far up the pile it has been moved.
 * - A message queued on a folded pile recoils it: shifted up 7px, then a bouncy spring back past rest and to rest.
 * - A card pulled up a fanned-out pile follows the pointer, lifted at 1.03, and crossing a slot reorders the pile.
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
const labelInk = (id: string) => {
	const box = kit.bounds(id);
	return kit.ink({ x: box.x + 130, y: box.y + 12, width: 80, height: 20 });
};
const blank = ['queued-1', 'queued-2', 'queued-3', 'queued-4'].filter(
	(id) => labelInk(id) < 1000,
);
kit.check(
	'every card of the fanned-out pile draws its text',
	blank.length === 0,
	blank.length === 0 ? '' : `no text on ${blank.join(', ')}`,
);

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

// Recoil: the whole pile is set 7px up and sprung back, sampled on the held motion clock.
const rest = kit.bounds('queued-1').y;
renderer.clockPause();
const enqueue = kit.center('enqueue');
renderer.nativeSimulateClick(enqueue.x, enqueue.y);
const recoil: number[] = [];
for (let elapsed = 0; elapsed < 480; elapsed += 16) {
	kit.step(16);
	recoil.push(kit.bounds('queued-1').y - rest);
}
renderer.clockResume();
const lift = -Math.min(...recoil);
const overshoot = Math.max(...recoil);
kit.check(
	'a queued message sets the pile up about 7px',
	lift > 5.5 && lift < 7.5,
	`${lift.toFixed(1)}px`,
);
kit.check(
	'the recoil springs past rest by about a pixel',
	overshoot > 0.5 && overshoot < 2,
	`${overshoot.toFixed(1)}px`,
);
kit.check(
	'the recoil is back at rest',
	Math.abs(recoil[recoil.length - 1]) < 0.5,
	`${recoil[recoil.length - 1].toFixed(1)}px`,
);
await kit.settle(500);

// Drag: pull the front card up through the pile in 5px moves.
const grab = kit.center('queued-1');
renderer.nativeSimulateMouseMove(grab.x, grab.y);
await kit.settle(700);
const slotsFromBottom = () =>
	['queued-1', 'queued-2', 'queued-3', 'queued-4']
		.map((id) => ({ id: id.slice(-1), y: kit.bounds(id).y }))
		.sort((a, b) => b.y - a.y)
		.map((card) => card.id)
		.join('');
renderer.clockPause();
renderer.nativeSimulateMouseDown(grab.x, grab.y);
kit.step(16);
const orders: string[] = [];
for (let move = 1; move <= 8; move++) {
	renderer.nativeSimulateMouseMove(grab.x, grab.y - move * 5);
	kit.step(16);
	orders.push(slotsFromBottom());
}
const dragged = kit.bounds('queued-1');
kit.check(
	'a pulled card follows the pointer, lifted at 1.03',
	Math.abs(dragged.y - 360.7) < 1.5 && Math.abs(dragged.height - 45.3) < 0.5,
	`y ${dragged.y.toFixed(1)}, height ${dragged.height.toFixed(1)}`,
);
kit.check(
	'crossing a slot reorders the pile',
	orders[0] === '1234' && orders[orders.length - 1] === '2134',
	orders.join(' '),
);
renderer.nativeSimulateMouseUp(grab.x, grab.y - 40);
renderer.clockResume();
kit.finish();
