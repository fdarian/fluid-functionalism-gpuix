/**
 * Regression checks for ask-user-questions, run through the offscreen renderer.
 *
 *   bun scripts/check-ask-user-questions.tsx
 *
 * Prints PASS / FAIL lines and exits non-zero on any FAIL.
 */
import { createTestRoot } from '@gpuix/solid/testing';
import { App } from '#/app';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;
let failed = false;

function frame() {
	renderer.flush();
	renderer.dispatchNativeEvents();
}
async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		frame();
		await sleep(16);
	} while (performance.now() < until);
	frame();
}
function check(name: string, ok: boolean, detail = '') {
	console.log(
		`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ` (${detail})`}`,
	);
	if (!ok) failed = true;
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function bounds(testId: string) {
	const box = renderer.getElementBounds(element(testId).id);
	if (box === null) throw new Error(`no bounds for ${testId}`);
	return box;
}
function maybeBounds(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) return undefined;
	return renderer.getElementBounds(found.id) ?? undefined;
}
/** Scrolls the page until the element is mid-window. Elements far off-screen have no painted bounds, so it scrolls blind in `blindStep` pixels (negative: up) until they have. */
async function scrollTo(testId: string, blindStep = 500) {
	for (let attempt = 0; attempt < 40; attempt++) {
		const box = maybeBounds(testId);
		if (box !== undefined) {
			const offset = box.y + box.height / 2 - 300;
			if (Math.abs(offset) < 40) break;
			renderer.nativeSimulateScrollWheel(600, 400, 0, offset);
		} else {
			renderer.nativeSimulateScrollWheel(600, 400, 0, blindStep);
		}
		await settle(200);
	}
}
async function focus(testId: string) {
	await scrollTo(testId);
	renderer.focusElement(element(testId).id);
	await settle(300);
}

/** Largest distance, over 400 ms of frames starting at the key press, between the hint's painted box and the Other row's. */
async function hintOffsetAfter(keystrokes: string) {
	const row = bounds('other-other');
	let worst = 0;
	renderer.simulateKeystrokes(keystrokes);
	const start = performance.now();
	while (performance.now() - start < 400) {
		frame();
		const hint = maybeBounds('other-other-hint');
		if (hint === undefined || hint.width === 0 || hint.height === 0) {
			worst = Math.max(worst, 1000);
		} else {
			worst = Math.max(
				worst,
				Math.abs(hint.x - row.x),
				Math.abs(hint.y - row.y),
				Math.abs(hint.width - row.width),
				Math.abs(hint.height - row.height),
			);
		}
		await sleep(16);
	}
	return worst;
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice('dark');
test.render(() => (
	<App demos={demos} pages={pages} initialPage="ask-user-questions" />
));
await settle(800);

// The "type here" hint must sit on the Other row from its first frame.
await focus('other-option-2');
const inputId = element('other-other-input').id;
const firstShow = await hintOffsetAfter('Tab');
check(
	'tab reaches the Other field',
	renderer.getFocusedElementId() === inputId,
);
check(
	'hint sits on the Other row in every frame (first show)',
	firstShow < 2,
	`worst offset ${firstShow.toFixed(1)}px`,
);
renderer.simulateKeystrokes('Tab');
await settle(400);
const secondShow = await hintOffsetAfter('Shift+Tab');
check(
	'shift-tab returns to the Other field',
	renderer.getFocusedElementId() === inputId,
);
check(
	'hint sits on the Other row in every frame (second show)',
	secondShow < 2,
	`worst offset ${secondShow.toFixed(1)}px`,
);

// Tabbing out of the rows must clear the lit row.
await focus('multiple-option-0');
const lit = () =>
	renderer.findByTestId('multiple-option-0-arrow') !== undefined;
await settle(300);
check('row 0 lit while focused', lit());
renderer.simulateKeystrokes('Tab');
await settle(400);
check('row 0 not lit after Tab leaves the group', !lit());

// The numbered chip fades its opacity over 80 ms as the arrow overlay takes its place; its colours do not ease.
await focus('multiple-option-0');
{
	const row = element('multiple-option-0');
	let chipStyle: Record<string, unknown> | undefined;
	for (let id = row.id; id < row.id + 40; id++) {
		const candidate = renderer.getElement(id);
		if (
			candidate !== undefined &&
			candidate.style.width === 20 &&
			candidate.style.height === 20
		)
			chipStyle = candidate.style;
	}
	if (chipStyle === undefined) throw new Error('no chip in the first row');
	check(
		'chip eases opacity over 80 ms and nothing else',
		chipStyle.transitionProperty === 'opacity' &&
			chipStyle.transitionDuration === '80ms',
		`${chipStyle.transitionProperty} ${chipStyle.transitionDuration}`,
	);
}

// The free-text box eases its fill over 150 ms when the pointer enters it. The motion clock is held and stepped by hand.
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function freeTextBox() {
	const input = element('free-free-input');
	if (input.parentId === null) throw new Error('free-text input has no box');
	const box = renderer.getElementBounds(input.parentId);
	if (box === null) throw new Error('free-text box has no bounds');
	return box;
}
function freeTextFill() {
	const box = freeTextBox();
	renderer.captureScreenshot(
		`/tmp/check-ask-user-questions-fade-${process.pid}.png`,
	);
	const pixel = readPng(
		`/tmp/check-ask-user-questions-fade-${process.pid}.png`,
	).at(Math.round(box.x + 4), Math.round(box.y + box.height / 2));
	return pixel[0] + pixel[1] + pixel[2];
}
await scrollTo('free-free-input', -500);
renderer.nativeSimulateMouseMove(2, 2);
renderer.focusElement(element('free').id);
await scrollTo('free-free-input', -500);
await settle(500);
renderer.clockPause();
const unfocused = freeTextFill();
const boxBounds = freeTextBox();
renderer.nativeSimulateMouseMove(
	boxBounds.x + boxBounds.width / 2,
	boxBounds.y + boxBounds.height / 2,
);
step(0);
step(60);
const midFill = freeTextFill();
step(400);
const hoverFill = freeTextFill();
renderer.clockResume();
check(
	'free-text box eases its fill into the hover',
	Math.abs(hoverFill - unfocused) > 6 &&
		Math.abs(midFill - unfocused) > 1 &&
		Math.abs(midFill - hoverFill) > 1,
	`rest ${unfocused}, 60 ms ${midFill}, hover ${hoverFill}`,
);

// Selecting an inline option's title does not move its description: the title is an inline-grid that reserves the semibold width.
await scrollTo('multi-option-0', -500);
renderer.focusElement(element('multi-option-0').id);
await settle(300);
{
	const description = element('multi-option-0-description');
	const before = bounds('multi-option-0-description');
	renderer.simulateKeystrokes('Space');
	let worst = 0;
	let sampled = 0;
	const start = performance.now();
	while (performance.now() - start < 300) {
		frame();
		const now = renderer.getElementBounds(description.id);
		if (now !== null) {
			sampled++;
			worst = Math.max(worst, Math.abs(now.x - before.x));
		}
		await sleep(16);
	}
	check(
		'selecting an inline option leaves its description where it was',
		sampled > 3 && worst < 0.5,
		`${sampled} frames, worst shift ${worst.toFixed(1)}px`,
	);
}

console.log(failed ? 'FAILED' : 'ALL PASSED');
test.unmount();
process.exit(failed ? 1 : 0);
