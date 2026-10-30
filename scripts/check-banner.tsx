/**
 * Banner interruptions on the inline banner of the banner demo.
 *
 *   bun scripts/check-banner.tsx
 *
 * The demo's Replay button sits under the banner, so its y is the row's height.
 * The inline banner scales about its top edge: from 0.4 as it appears, and down to 0.6 while its row closes (`registry/default/banner.tsx:176-195`, `:323-332`). The scale is read off the transformed box of the banner against its rest width.
 */
import { createCheck, scrollIntoView } from './check-kit';
import { readPng } from './png-pixels';

const kit = await createCheck('banner');
const renderer = kit.renderer;
const replayY = () => kit.bounds('inline-replay').y;
const bannerShown = () =>
	renderer.getAllText().some((line) => line.includes('Changes saved'));

const FRAME_MS = 16;
// The motion clock is stepped by hand: against wall time a slow frame lands the
// mid-close sample at a different point of the spring on every run.
renderer.clockPause();

async function frames(ms: number, onFrame?: () => void) {
	for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
		renderer.clockFastForward(FRAME_MS);
		renderer.flush();
		renderer.dispatchNativeEvents();
		onFrame?.();
	}
}

async function press(testId: string) {
	renderer.clickElement(kit.element(testId).id);
	await frames(16);
}

const openY = replayY();
kit.check('starts open', bannerShown());

// The scale of the banner as it closes and as it opens again.
const bannerBox = () => kit.bounds('inline-banner');
const restWidth = bannerBox().width;
const restTop = bannerBox().y;
const scaleNow = () =>
	kit.exists('inline-banner') ? bannerBox().width / restWidth : undefined;
const closing: number[] = [];
await press('inline-banner-dismiss');
await frames(600, () => {
	const scale = scaleNow();
	if (scale !== undefined) closing.push(scale);
});
const settledScale = closing[closing.length - 1] as number;
kit.check(
	'the closing banner shrinks to 0.6 and no further',
	Math.abs(settledScale - 0.6) < 0.005 &&
		Math.min(...closing) > 0.6 - 0.005 &&
		closing.every(
			(scale, index) => index === 0 || scale <= closing[index - 1] + 0.001,
		),
	`${closing.length} frames, first ${closing[0]?.toFixed(3)}, last ${settledScale.toFixed(3)}, min ${Math.min(...closing).toFixed(3)}`,
);
const opening: number[] = [];
const tops: number[] = [];
await press('inline-replay');
await frames(1500, () => {
	const scale = scaleNow();
	if (scale !== undefined) opening.push(scale);
	if (kit.exists('inline-banner')) tops.push(bannerBox().y);
});
kit.check(
	'the opening banner grows from 0.4 to 1',
	Math.abs((opening[0] as number) - 0.4) < 0.02 &&
		Math.abs((opening[opening.length - 1] as number) - 1) < 0.002,
	`first ${opening[0]?.toFixed(3)}, last ${opening[opening.length - 1]?.toFixed(3)}, max ${Math.max(...opening).toFixed(3)}`,
);
kit.check(
	'the banner scales about its top edge',
	tops.every((top) => Math.abs(top - restTop) < 0.01),
	`top ${Math.min(...tops).toFixed(2)} to ${Math.max(...tops).toFixed(2)} (rest ${restTop.toFixed(2)})`,
);

// Closing while it is still opening must end closed, not throw and leave the banner up.
await press('inline-banner-dismiss');
await frames(600);
kit.check('dismissing removes the banner', !bannerShown());
const closedY = replayY();
await press('inline-replay');
await frames(112);
const scaleAtDismiss = scaleNow() as number;
const midOpen: number[] = [];
await press('inline-banner-dismiss');
await frames(900, () => {
	const scale = scaleNow();
	if (scale !== undefined) midOpen.push(scale);
});
kit.check('closing mid-open removes the banner', !bannerShown());
kit.check(
	'closing mid-open shrinks on from the scale it had, never back up',
	scaleAtDismiss > 0.45 &&
		scaleAtDismiss < 0.95 &&
		midOpen.every((scale) => scale <= scaleAtDismiss + 0.02),
	`at the dismiss ${scaleAtDismiss.toFixed(3)}, max after ${Math.max(...midOpen).toFixed(3)}, min ${Math.min(...midOpen).toFixed(3)}`,
);
kit.check(
	'closing mid-open ends collapsed',
	Math.abs(replayY() - closedY) < 0.5,
	`${replayY().toFixed(1)} vs ${closedY.toFixed(1)}`,
);

// Reopen while it closes: the row continues from where it is.
await press('inline-replay');
await frames(900);
kit.check(
	'reopens fully',
	Math.abs(replayY() - openY) < 0.5,
	`${replayY().toFixed(1)} vs ${openY.toFixed(1)}`,
);
await press('inline-banner-dismiss');
await frames(110);
const atReopen = replayY();
kit.check(
	'mid-close the row is partly collapsed',
	atReopen < openY - 1 && atReopen > closedY + 1,
	`${atReopen.toFixed(1)}`,
);
await press('inline-replay');
let lowest = atReopen;
await frames(900, () => {
	lowest = Math.min(lowest, replayY());
});
kit.check(
	'reopening mid-close does not jump down',
	// A reversal carries some momentum on (7 px of a 52 px row).
	lowest >= atReopen - 10,
	`lowest ${lowest.toFixed(1)}, reopened at ${atReopen.toFixed(1)}`,
);
kit.check(
	'reopening mid-close ends open',
	Math.abs(replayY() - openY) < 0.5 && bannerShown(),
);

// A focused dismiss button keeps focus through a reopen.
const dismiss = kit.element('inline-banner-dismiss');
renderer.focusElement(dismiss.id);
await frames(100);
kit.check(
	'the dismiss button takes focus',
	renderer.getFocusedElementId() === dismiss.id,
);
await press('inline-banner-dismiss');
await frames(110);
await press('inline-replay');
await frames(900);
const after = kit.element('inline-banner-dismiss');
kit.check(
	'the dismiss button is the same element after a reopen',
	after.id === dismiss.id,
);
kit.check(
	'the dismiss button keeps focus through a reopen',
	renderer.getFocusedElementId() === after.id,
);

// The dismiss button's hover fill and glyph colour ease over 80 ms (the clock is still held).
function dismissPixels() {
	renderer.captureScreenshot(`/tmp/check-banner-fade-${process.pid}.png`);
	const box = kit.bounds('inline-banner-dismiss');
	const pixels = readPng(`/tmp/check-banner-fade-${process.pid}.png`);
	const sum = (x: number, y: number) =>
		pixels
			.at(Math.round(x), Math.round(y))
			.slice(0, 3)
			.reduce((a, b) => a + b, 0);
	let glyph = 0;
	for (let y = box.y + 6; y < box.y + box.height - 6; y++)
		for (let x = box.x + 6; x < box.x + box.width - 6; x++)
			glyph = Math.max(glyph, sum(x, y));
	return { fill: sum(box.x + 3, box.y + box.height / 2), glyph };
}
renderer.nativeSimulateMouseMove(2, 2);
await frames(300);
const restFade = dismissPixels();
const dismissBox = kit.bounds('inline-banner-dismiss');
renderer.nativeSimulateMouseMove(
	dismissBox.x + dismissBox.width / 2,
	dismissBox.y + dismissBox.height / 2,
);
// The hover reaches the style on this frame; the fade is timed from it, so the 32 ms step below is 32 ms into the fade.
kit.step(0);
await frames(32);
const midFade = dismissPixels();
await frames(300);
const hoverFade = dismissPixels();
for (const part of ['fill', 'glyph'] as const) {
	const low = Math.min(restFade[part], hoverFade[part]);
	const high = Math.max(restFade[part], hoverFade[part]);
	kit.check(
		`the dismiss button's ${part} eases 32 ms into the hover`,
		high - low > 6 && midFade[part] > low + 1 && midFade[part] < high - 1,
		`rest ${restFade[part]}, 32 ms ${midFade[part]}, hover ${hoverFade[part]}`,
	);
}

// The fixed bar rides its row on `y`, a share of its own height (`registry/default/banner.tsx:236-238`): it leaves upward by exactly its height and comes back, whether the page has seen it before or not.
await scrollIntoView(renderer, 'fixed-banner');
await frames(300);
const fixedRestY = kit.bounds('fixed-banner').y;
const fixedHeight = kit.bounds('fixed-banner').height;
const fixedClosing: number[] = [];
await press('fixed-banner-dismiss');
await frames(600, () => {
	if (kit.exists('fixed-banner'))
		fixedClosing.push(kit.bounds('fixed-banner').y);
});
const fixedClosed = fixedClosing[fixedClosing.length - 1] as number;
kit.check(
	'the closing fixed bar slides up by its own height and is then removed',
	fixedClosing.every(
		(y, index) =>
			index === 0 || y <= (fixedClosing[index - 1] as number) + 0.01,
	) &&
		Math.abs(fixedRestY - fixedClosed - fixedHeight) < 6 &&
		!kit.exists('fixed-banner'),
	`rest ${fixedRestY.toFixed(1)}, last seen ${fixedClosed.toFixed(1)}, height ${fixedHeight}`,
);
const fixedOpening: number[] = [];
await press('fixed-replay');
await frames(900, () => {
	if (kit.exists('fixed-banner'))
		fixedOpening.push(kit.bounds('fixed-banner').y);
});
kit.check(
	'the fixed bar slides back in from above its place',
	(fixedOpening[0] as number) >= fixedRestY - fixedHeight - 0.01 &&
		(fixedOpening[0] as number) < fixedRestY - fixedHeight * 0.5 &&
		Math.abs((fixedOpening[fixedOpening.length - 1] as number) - fixedRestY) <
			0.05,
	`first ${(fixedOpening[0] as number).toFixed(1)}, last ${(fixedOpening[fixedOpening.length - 1] as number).toFixed(1)}, rest ${fixedRestY.toFixed(1)}`,
);

// Actions: `@max-sm/banner` (a 24rem container) and a description both put them under the title, primary first; trailing, primary is last at the edge. Tab keeps the written order.
async function actionsAt(titleId: string, actionsId: string, parts: string[]) {
	await scrollIntoView(renderer, titleId);
	const title = kit.bounds(titleId);
	const actions = kit.bounds(actionsId);
	const x = parts.map((part) => kit.bounds(part).x);
	return { title, actions, x };
}
const wide = await actionsAt('wide-title', 'wide-actions', [
	'wide-primary',
	'wide-secondary',
	'wide-ghost',
]);
kit.check(
	'a wide banner trails the actions on the title row, ghost first, primary at the edge',
	wide.actions.x > wide.title.x + wide.title.width - 1 &&
		wide.actions.y < wide.title.y + wide.title.height &&
		wide.x[2] < wide.x[1] &&
		wide.x[1] < wide.x[0],
	JSON.stringify(wide),
);
const tabbed: string[] = [];
const firstStop = kit.element('wide-primary');
renderer.focusElement(firstStop.id);
await frames(32);
for (const next of ['wide-secondary', 'wide-ghost']) {
	renderer.simulateKeystrokes('Tab');
	await frames(32);
	tabbed.push(
		renderer.getFocusedElementId() === kit.element(next).id
			? next
			: `other ${renderer.getFocusedElementId()} ${kit.element(next).id}`,
	);
}
kit.check(
	'Tab visits the actions in the order written, whatever order they are laid out in',
	tabbed.join() === 'wide-secondary,wide-ghost',
	tabbed.join(),
);
const described = await actionsAt('described-title', 'described-actions', [
	'described-primary',
	'described-ghost',
]);
kit.check(
	'a description puts the actions under the text, primary first',
	described.actions.y > described.title.y + described.title.height &&
		Math.abs(described.actions.x - described.title.x) < 1 &&
		described.x[0] < described.x[1],
	JSON.stringify(described),
);
const narrow = await actionsAt('narrow-title', 'narrow-actions', [
	'narrow-primary',
	'narrow-ghost',
]);
kit.check(
	'a banner under 24rem drops the actions under the title, primary first',
	narrow.actions.y > narrow.title.y + narrow.title.height &&
		Math.abs(narrow.actions.x - narrow.title.x) < 1 &&
		narrow.x[0] < narrow.x[1],
	JSON.stringify(narrow),
);

kit.finish();
