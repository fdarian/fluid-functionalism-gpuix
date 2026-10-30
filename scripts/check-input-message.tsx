/**
 * Input message checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-message.tsx
 *
 * The composers are mounted on their own: a with an attachment and a queued
 * row, b compact with a queued row, c disabled.
 *
 * - Tab never lands on the disabled composer's textarea.
 * - A tab stop on the tile's remove badge and on the queued row's close button is painted
 *   (opacity 1 all the way up) while it has keyboard focus.
 * - The queued row's close button sits one row padding from the right edge: 10 default, 8 compact.
 * - The send glyph swaps on `mode="wait"` (scale .6 in and out), a file tile enters and leaves on scale .9 and a queued row on .97,
 *   about their centres, the exits on the 60 ms tween.
 * - The 80 ms fades (composer ring, queued close button, suggestion text) are mid-way 40 ms in, with the motion
 *   clock held; the send button's hover fill eases over 180 ms.
 */

import { createTestRoot } from '@gpuix/solid/testing';
import { createSignal } from 'solid-js';
import { fileFromPath, InputMessage } from '#/components/input-message';
import { TooltipProvider } from '#/components/tooltip';
import { AVATAR_JPG } from '#/lib/assets';
import { fonts } from '#/lib/fonts';
import { color, setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 700, height: 900, fonts });
const renderer = test.renderer;

async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function bounds(testId: string) {
	const found = renderer.getElementBounds(element(testId).id);
	if (found === null) throw new Error(`no bounds for ${testId}`);
	return found;
}
/** The opacity a pixel of the element is painted with: the product up the tree. */
function paintedOpacity(testId: string) {
	let opacity = 1;
	let current: ReturnType<typeof renderer.getElement> = element(testId);
	while (current !== undefined) {
		const own = current.style.opacity;
		if (typeof own === 'number') opacity *= own;
		current =
			current.parentId === null
				? undefined
				: renderer.getElement(current.parentId);
	}
	return opacity;
}
async function tabTo(testId: string) {
	const target = element(testId).id;
	for (let presses = 0; presses < 40; presses++) {
		renderer.simulateKeystrokes('Tab');
		await settle(60);
		if (renderer.getFocusedElementId() === target) {
			await settle(200);
			return;
		}
	}
	throw new Error(`Tab never reached ${testId}`);
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

const queued = (id: string) => ({ id, text: `Queued ${id}`, files: [] });

setThemeChoice('dark');
test.render(() => (
	<TooltipProvider>
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 20,
				padding: 20,
				width: 560,
				backgroundColor: color.background,
			}}
		>
			<InputMessage
				testId="a"
				value=""
				onValueChange={() => {}}
				files={[fileFromPath(AVATAR_JPG)]}
				onFilesChange={() => {}}
				status="idle"
				queue={[queued('one')]}
				onQueueChange={() => {}}
			/>
			<InputMessage
				testId="b"
				size="compact"
				value=""
				onValueChange={() => {}}
				status="idle"
				queue={[queued('two')]}
				onQueueChange={() => {}}
			/>
			<InputMessage testId="c" value="" onValueChange={() => {}} disabled />
			<InputMessage
				testId="d"
				value=""
				onValueChange={() => {}}
				suggestions={['Draft a reply', 'Summarise the thread']}
				placeholderSuggestion="Why is every other input box so stiff?"
			/>
		</div>
	</TooltipProvider>
));
await settle(1200);

// The Tab keycap is one flex-centred line with the suggestion, then `-translate-y-px`: a pixel above the text's centre.
{
	const text = bounds('d-ghost');
	const keycap = bounds('d-ghost-keycap');
	const offset = keycap.y + keycap.height / 2 - (text.y + text.height / 2);
	report(
		"the Tab keycap sits a pixel above the suggestion's centre",
		Math.abs(offset + 1) < 0.3,
		`offset ${offset.toFixed(2)}`,
	);
}

await tabTo('a-file-0-remove');
const badge = paintedOpacity('a-file-0-remove');
report(
	'tile remove badge is painted under keyboard focus',
	badge === 1,
	`opacity ${badge}`,
);
renderer.captureScreenshot(`/tmp/check-input-message-badge-${process.pid}.png`);

await tabTo('a-queued-0-remove');
const close = paintedOpacity('a-queued-0-remove');
report(
	'queued close button is painted under keyboard focus',
	close === 1,
	`opacity ${close}`,
);
renderer.captureScreenshot(`/tmp/check-input-message-close-${process.pid}.png`);

const disabledTextarea = element('c-textarea').id;
const reached = new Set<number>();
for (let presses = 0; presses < 40; presses++) {
	renderer.simulateKeystrokes('Tab');
	await settle(40);
	const focused = renderer.getFocusedElementId();
	if (focused !== null) reached.add(focused);
}
report(
	'disabled composer is out of the Tab order',
	!reached.has(disabledTextarea),
	`Tab reached ${reached.size} elements, the textarea ${reached.has(disabledTextarea) ? 'among them' : 'not among them'}`,
);

for (const [composer, expected] of [
	['a', 10],
	['b', 8],
] as const) {
	const row = bounds(`${composer}-queued-0`);
	const button = bounds(`${composer}-queued-0-remove`);
	const gap = row.x + row.width - (button.x + button.width);
	report(
		`${composer} queued close button is ${expected}px from the row's right edge`,
		gap === expected,
		`${gap}`,
	);
}

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
/** The largest red channel inside `box`. */
function brightest(box: {
	x: number;
	y: number;
	width: number;
	height: number;
}) {
	renderer.captureScreenshot(
		`/tmp/check-input-message-fade-${process.pid}.png`,
	);
	const pixels = readPng(`/tmp/check-input-message-fade-${process.pid}.png`);
	let best = 0;
	for (let y = Math.round(box.y); y < Math.round(box.y + box.height); y++)
		for (let x = Math.round(box.x); x < Math.round(box.x + box.width); x++)
			best = Math.max(best, pixels.at(x, y)[0]);
	return best;
}
function betweenReport(
	name: string,
	before: number,
	middle: number,
	after: number,
) {
	const low = Math.min(before, after);
	const high = Math.max(before, after);
	report(
		name,
		high - low > 4 && middle > low + 1 && middle < high - 1,
		`before ${before}, 40 ms ${middle}, after ${after}`,
	);
}
/** Moves the pointer, steps the held clock 40 ms and samples `probe`, then lets the fade finish and samples again. */
function fadeSamples(move: () => void, probe: () => number) {
	renderer.clockPause();
	const before = probe();
	move();
	step(0);
	step(40);
	const middle = probe();
	step(400);
	const after = probe();
	renderer.clockResume();
	return { before, middle, after };
}

renderer.nativeSimulateMouseMove(5, 5);
await settle(400);
{
	const row = bounds('a-queued-0');
	const closeBox = bounds('a-queued-0-remove');
	const hidden = fadeSamples(
		() => renderer.nativeSimulateMouseMove(row.x + 60, row.y + row.height / 2),
		() => brightest(closeBox),
	);
	betweenReport(
		'queued close button fades in over 80 ms',
		hidden.before,
		hidden.middle,
		hidden.after,
	);
}
renderer.nativeSimulateMouseMove(5, 5);
await settle(400);
// Light: in dark the rest shadow (`inset` layers) and the hover edge are not interpolable, in the browser as here, so that fade is a switch.
setThemeChoice('light');
await settle(400);
{
	const box = bounds('b');
	const ring = () =>
		brightest({
			x: box.x - 1,
			y: box.y + box.height / 2,
			width: 1,
			height: 1,
		});
	const samples = fadeSamples(
		() => renderer.nativeSimulateMouseMove(box.x + 30, box.y + 10),
		ring,
	);
	betweenReport(
		'composer ring eases to the hover edge',
		samples.before,
		samples.middle,
		samples.after,
	);
}
setThemeChoice('dark');
await settle(400);
renderer.nativeSimulateMouseMove(5, 5);
await settle(400);
{
	const send = bounds('a-send');
	const glow = () =>
		brightest({ x: send.x + 2, y: send.y + 2, width: 2, height: 2 });
	const samples = fadeSamples(
		() => renderer.nativeSimulateMouseMove(send.x + 14, send.y + 14),
		glow,
	);
	betweenReport(
		'send button fill eases to the hover colour',
		samples.before,
		samples.middle,
		samples.after,
	);
}
renderer.nativeSimulateMouseMove(5, 5);
await settle(400);
{
	const textarea = bounds('d-textarea');
	renderer.nativeSimulateMouseMove(textarea.x + 20, textarea.y + 10);
	renderer.nativeSimulateMouseDown(textarea.x + 20, textarea.y + 10);
	renderer.nativeSimulateMouseUp(textarea.x + 20, textarea.y + 10);
	await settle(400);
	const row = bounds('d-suggestion-0');
	const text = {
		x: row.x,
		y: row.y,
		width: row.width * 0.6,
		height: row.height,
	};
	const texts = fadeSamples(
		() => renderer.simulateKeystrokes('ArrowDown'),
		() => brightest(text),
	);
	betweenReport(
		'suggestion text eases to the active colour',
		texts.before,
		texts.middle,
		texts.after,
	);
	// Row 1 has no ↓ hint, so its ↵ stays mounted and its opacity eases.
	const second = bounds('d-suggestion-1');
	const enter = {
		x: second.x + second.width - 30,
		y: second.y,
		width: 30,
		height: second.height,
	};
	const icons = fadeSamples(
		() => renderer.simulateKeystrokes('ArrowDown'),
		() => brightest(enter),
	);
	betweenReport(
		'suggestion enter glyph fades in',
		icons.before,
		icons.middle,
		icons.after,
	);
}

// Unmount before building the next tree: with the tree alive, Bun aborts at exit ("Thread Local Storage", exit 134) after every check passed.
test.unmount();

// The scale entrances and exits, sampled on the held motion clock.
{
	const motionTest = createTestRoot({ width: 700, height: 600, fonts });
	const motionRenderer = motionTest.renderer;
	const [status, setStatus] = createSignal<'idle' | 'streaming'>('idle');
	const [files, setFiles] = createSignal([
		fileFromPath(AVATAR_JPG),
		fileFromPath(AVATAR_JPG),
	]);
	const [queue, setQueue] = createSignal([queued('one'), queued('two')]);
	const advance = (ms: number) => {
		motionRenderer.clockFastForward(ms);
		motionRenderer.flush();
		motionRenderer.dispatchNativeEvents();
	};
	motionTest.render(() => (
		<TooltipProvider>
			<div
				style={{ padding: 20, width: 560, backgroundColor: color.background }}
			>
				<InputMessage
					testId="e"
					value=""
					onValueChange={() => {}}
					files={files()}
					onFilesChange={setFiles}
					status={status()}
					onStop={() => {}}
					queue={queue()}
					onQueueChange={setQueue}
				/>
			</div>
		</TooltipProvider>
	));
	for (let frame = 0; frame < 60; frame++) {
		motionRenderer.flush();
		motionRenderer.dispatchNativeEvents();
		await sleep(16);
	}
	const find = (testId: string) => {
		const found = motionRenderer.findByTestId(testId);
		if (found === undefined) throw new Error(`no element ${testId}`);
		return found.id;
	};
	const box = (id: number) => {
		const found = motionRenderer.getElementBounds(id);
		if (found === null) throw new Error(`no bounds for element ${id}`);
		return found;
	};
	/** The send button's glyph: its last child, after the press fill. */
	const glyph = () => {
		const children = motionRenderer.getElement(find('e-send'))?.children ?? [];
		const last = children.at(-1);
		if (last === undefined) throw new Error('the send button has no glyph');
		return last;
	};
	const centreX = (b: { x: number; width: number }) => b.x + b.width / 2;
	const centreY = (b: { y: number; height: number }) => b.y + b.height / 2;

	const arrow = box(glyph());
	const leavingId = find('e-file-1');
	const leavingRowId = find('e-queued-1');
	const tileRest = box(leavingId);
	const rowRest = box(leavingRowId);
	motionRenderer.clockPause();
	setFiles(files().slice(0, 1));
	setQueue(queue().slice(0, 1));
	advance(0);
	advance(0);
	// Reading a box draws the frame the motion starts on.
	box(leavingId);
	advance(16);
	const tileLeaving = box(leavingId);
	const rowLeaving = box(leavingRowId);
	advance(600);
	advance(0);

	// With nothing to send, a streaming composer shows the stop square.
	setFiles([]);
	setStatus('streaming');
	advance(0);
	advance(0);
	box(glyph());
	advance(16);
	const arrowLeaving = box(glyph());
	advance(400);
	advance(0);
	advance(0);
	box(glyph());
	advance(8);
	const stopEntering = box(glyph());
	advance(600);
	const stop = box(glyph());
	motionRenderer.clockResume();
	report(
		'the send arrow shrinks out about its centre before the stop square grows in',
		arrowLeaving.width < arrow.width - 0.2 &&
			Math.abs(centreX(arrowLeaving) - centreX(arrow)) < 0.5,
		`rest ${arrow.width.toFixed(2)}, leaving ${arrowLeaving.width.toFixed(2)}`,
	);
	report(
		'the stop square grows in from a smaller scale about its centre',
		stopEntering.width < stop.width * 0.9 &&
			Math.abs(centreX(stopEntering) - centreX(stop)) < 0.5 &&
			Math.abs(centreY(stopEntering) - centreY(stop)) < 0.5,
		`entering ${stopEntering.width.toFixed(2)}, rest ${stop.width.toFixed(2)}`,
	);
	report(
		'a removed file tile shrinks out about its centre',
		tileLeaving.width < tileRest.width - 0.2 &&
			Math.abs(centreX(tileLeaving) - centreX(tileRest)) < 0.5 &&
			Math.abs(centreY(tileLeaving) - centreY(tileRest)) < 0.5,
		`rest ${tileRest.width.toFixed(2)}, leaving ${tileLeaving.width.toFixed(2)}`,
	);
	report(
		'a removed queued row shrinks out about its centre',
		rowLeaving.width < rowRest.width - 0.2 &&
			Math.abs(centreX(rowLeaving) - centreX(rowRest)) < 0.5 &&
			Math.abs(centreY(rowLeaving) - centreY(rowRest)) < 0.5,
		`rest ${rowRest.width.toFixed(2)}, leaving ${rowLeaving.width.toFixed(2)}`,
	);
	motionTest.unmount();
}
process.exit(failed ? 1 : 0);
