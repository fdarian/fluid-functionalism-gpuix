/**
 * Queued stack scenarios on the queued-stack demo.
 *
 *   bun scripts/check-queued-stack.tsx
 *
 * - The stack fans out under the pointer and stays fanned out while the pointer walks from card to card across the gaps.
 * - It folds back when the pointer leaves the stack, with no hold. Only the stack reports enter / leave, as in the source, so a card the pointer moves between still counts as the stack.
 */
import { createCheck } from "./check-kit";

const kit = await createCheck("queued-stack");
const renderer = kit.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fanned out when the back card sits far above the front one; folded, a peek apart. */
const isExpanded = () =>
	kit.bounds("queued-1").y - kit.bounds("queued-4").y > 80;

async function frames(ms: number) {
	const until = performance.now() + ms;
	while (performance.now() < until) {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(8);
	}
}

await kit.settle(600);
kit.check("starts folded", !isExpanded());

const front = kit.center("queued-1");
renderer.nativeSimulateMouseMove(front.x, front.y);
await kit.settle(700);
kit.check("hovering the front card fans the stack out", isExpanded());

// Walk straight up through every card and the gaps between them, a step a frame.
const top = kit.bounds("queued-4");
let folded = false;
for (let y = front.y; y > top.y + 4; y -= 3) {
	renderer.nativeSimulateMouseMove(front.x, y);
	await frames(16);
	if (!isExpanded()) folded = true;
}
kit.check("walking up the cards never folds the stack", !folded);

// And off the stack: folds at once.
renderer.nativeSimulateMouseMove(2, 2);
await frames(60);
const offTime = performance.now();
let foldedAt: number | undefined;
while (performance.now() - offTime < 800 && foldedAt === undefined) {
	renderer.flush();
	renderer.dispatchNativeEvents();
	if (!isExpanded()) foldedAt = performance.now() - offTime;
	await sleep(8);
}
kit.check("leaving the stack folds it", foldedAt !== undefined, `${foldedAt}`);
kit.finish();
