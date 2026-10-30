/**
 * Input copy checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-copy.tsx
 *
 * The component is mounted on its own; the test renderer's in-memory clipboard takes the copies, so the system pasteboard is never touched.
 *
 * - A press on a resting pointer with the tooltip open says "Copied".
 * - A press while the pointer is still moving (the tooltip never opened) keeps the tooltip shut.
 * - Enter while the tooltip is open from keyboard focus closes it, as the source does.
 * - The compact row is 26px tall (4 + 18 + 4), the default row 36px.
 * - Hovering the row eases the value's tint in over 80 ms.
 * - The copied check draws in from its first point.
 * - The glyph swap is `mode="wait"`: the copy icon shrinks out to 0.8, the check grows in from 0.6, and nothing plays on the first mount.
 * - A press writes the value to `navigator.clipboard`; a refused write shows "Failed".
 */

import { createTestRoot } from '@gpuix/solid/testing';
import { InputCopy } from '#/components/input-copy';
import { TooltipProvider } from '#/components/tooltip';
import { fonts } from '#/lib/fonts';
import { color, setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 600, height: 300, fonts });
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
function centerOf(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	const bounds = renderer.getElementBounds(found.id);
	if (bounds === null) throw new Error(`no bounds for ${testId}`);
	return {
		x: bounds.x + bounds.width / 2,
		y: bounds.y + bounds.height / 2,
		height: bounds.height,
	};
}
function tooltipText() {
	if (renderer.findByTestId('subject-tooltip-chip') === undefined)
		return undefined;
	return renderer
		.getAllText()
		.find(
			(line) =>
				line === 'Copied' ||
				line === 'Copy to clipboard' ||
				line === 'Copy failed',
		);
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
async function reset() {
	renderer.nativeSimulateMouseMove(580, 280);
	await settle(2600);
}

setThemeChoice('dark');
renderer.clockPause();
test.render(() => (
	<TooltipProvider>
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 20,
				padding: 20,
				width: 400,
				backgroundColor: color.background,
			}}
		>
			<InputCopy testId="subject" value="npx shadcn@latest add input-copy" />
			<InputCopy
				testId="compact"
				size="compact"
				variant="button"
				value="ABCD-1234"
			/>
		</div>
	</TooltipProvider>
));
// The first mount plays nothing (`AnimatePresence initial={false}`): the copy icon is at full size on the first frame.
step(0);
const mountedGlyph = (() => {
	const action = renderer
		.getElement(renderer.findByTestId('subject')?.id ?? -1)
		?.children.map((id) => renderer.getElement(id))
		.at(-1);
	const glyph = action?.children[0];
	if (glyph === undefined) throw new Error('the action has no glyph');
	return {
		box: renderer.getElementBounds(glyph),
		element: renderer.getElement(glyph),
	};
})();
report(
	'the first mount shows the copy icon at full size and opacity',
	mountedGlyph.box?.width === 14 && mountedGlyph.element?.style.opacity !== '0',
	`${mountedGlyph.box?.width}, opacity ${mountedGlyph.element?.style.opacity}`,
);
renderer.clockResume();
await settle(600);

const subject = centerOf('subject');
report('default row is 36px', subject.height === 36, `${subject.height}`);
const compact = centerOf('compact');
report('compact row is 26px', compact.height === 26, `${compact.height}`);

// Keyboard focus opens the tooltip; Enter copies. The source's snapshot is taken on pointer press only, so this does not show "Copied".
const row = renderer.findByTestId('subject');
if (row === undefined) throw new Error('no subject');
const rowId = row.id;
renderer.simulateKeystrokes('Tab');
await settle(500);
if (renderer.getFocusedElementId() !== row.id)
	throw new Error('Tab did not reach the row');
const keyboardBefore = tooltipText();
await navigator.clipboard.writeText('untouched');
renderer.simulateKeystrokes('Enter');
await settle(400);
const keyboardCopied = await navigator.clipboard.readText();
report(
	'Enter copies the value to navigator.clipboard',
	keyboardCopied === 'npx shadcn@latest add input-copy',
	JSON.stringify(keyboardCopied),
);
report(
	'keyboard press: the source snapshots pointer presses only, so the tooltip closes',
	keyboardBefore === 'Copy to clipboard' && tooltipText() === undefined,
	`before ${keyboardBefore}, after ${tooltipText()}`,
);

await reset();

// A resting pointer: the tooltip opens, the press keeps it open as "Copied".
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
await settle(900);
const idleTooltip = tooltipText();
renderer.nativeSimulateMouseDown(subject.x - 41, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 41, subject.y);
await settle(400);
report(
	'resting press: tooltip shows Copied',
	idleTooltip === 'Copy to clipboard' && tooltipText() === 'Copied',
	`before ${idleTooltip}, after ${tooltipText()}`,
);
await reset();

// A refused write: the button variant shows "Failed".
const writeText = navigator.clipboard.writeText;
navigator.clipboard.writeText = async () => {
	throw new Error('Clipboard access denied');
};
try {
	const compactBox = centerOf('compact');
	renderer.nativeSimulateMouseDown(compactBox.x, compactBox.y);
	renderer.nativeSimulateMouseUp(compactBox.x, compactBox.y);
	await settle(400);
	report(
		'a refused write shows Failed',
		renderer.getAllText().includes('Failed'),
		JSON.stringify(renderer.getAllText()),
	);
} finally {
	navigator.clipboard.writeText = writeText;
}
await reset();
renderer.nativeSimulateMouseDown(compact.x, compact.y);
renderer.nativeSimulateMouseUp(compact.x, compact.y);
await settle(400);
const compactCopied = await navigator.clipboard.readText();
report(
	'the compact button copies its value',
	compactCopied === 'ABCD-1234',
	JSON.stringify(compactCopied),
);
await reset();

// A moving pointer: the tooltip keeps restarting its rest timer and never opens.
// The moves come back to back: each restarts the rest timer, and none waits on a clock a loaded machine could stretch past the delay.
for (let move = 0; move < 14; move++) {
	renderer.nativeSimulateMouseMove(subject.x - 60 + move * 4, subject.y);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
const movingBefore = tooltipText();
renderer.nativeSimulateMouseMove(subject.x - 4, subject.y);
renderer.nativeSimulateMouseDown(subject.x - 4, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 4, subject.y);
await settle(400);
report(
	'moving press: tooltip stays shut',
	movingBefore === undefined && tooltipText() === undefined,
	`before ${movingBefore}, after ${tooltipText()}`,
);
await reset();

// Hovering the row eases the glyph's stroke from 1.5 to 2 and its colour to the foreground over 80 ms: the inked area grows frame by frame, not in one step.
const rowBox = (() => {
	const found = renderer.findByTestId('subject');
	if (found === undefined) throw new Error('no subject');
	const box = renderer.getElementBounds(found.id);
	if (box === null) throw new Error('no bounds for subject');
	return box;
})();
/** The glyph is the last thing in the row: count the pixels that differ from the row's background there. */
function glyphInk() {
	renderer.captureScreenshot(`/tmp/check-input-copy-ink-${process.pid}.png`);
	const pixels = readPng(`/tmp/check-input-copy-ink-${process.pid}.png`);
	const left = Math.round(rowBox.x + rowBox.width - 36);
	const right = Math.round(rowBox.x + rowBox.width - 6);
	const top = Math.round(rowBox.y + 4);
	const bottom = Math.round(rowBox.y + rowBox.height - 4);
	const ground = pixels.at(left, top);
	let ink = 0;
	for (let y = top; y < bottom; y++)
		for (let x = left; x < right; x++) {
			const pixel = pixels.at(x, y);
			ink +=
				Math.abs(pixel[0] - ground[0]) +
				Math.abs(pixel[1] - ground[1]) +
				Math.abs(pixel[2] - ground[2]);
		}
	return ink;
}
await reset();
const restInk = glyphInk();
// The glyph's colour and stroke both ease, so a frame 16 ms in that is only partly inked is the fade. The motion clock is held and stepped by hand.
renderer.clockPause();
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
step(0);
step(16);
const earlyInk = glyphInk();
step(400);
const hoverInk = glyphInk();
renderer.clockResume();
report(
	"the glyph's stroke eases to 2 on hover",
	earlyInk > restInk && earlyInk < hoverInk - 1000,
	`rest ${restInk}, first frames ${earlyInk}, hovered ${hoverInk}`,
);

// The value's tint is a span background that transitions over 80 ms like the source's `<mark>`: a frame 16 ms in is partly tinted.
// The sum is taken over the value's text, which is the same ink in every state, so only the tint moves it.
await reset();
function valueTint() {
	renderer.captureScreenshot(`/tmp/check-input-copy-tint-${process.pid}.png`);
	const pixels = readPng(`/tmp/check-input-copy-tint-${process.pid}.png`);
	const left = Math.round(rowBox.x + 8);
	const right = Math.round(rowBox.x + 200);
	const top = Math.round(rowBox.y + rowBox.height / 2 - 6);
	const bottom = Math.round(rowBox.y + rowBox.height / 2 + 6);
	const ground = pixels.at(Math.round(rowBox.x) + 2, Math.round(rowBox.y) + 2);
	let blue = 0;
	for (let y = top; y < bottom; y++)
		for (let x = left; x < right; x++) {
			const pixel = pixels.at(x, y);
			blue += pixel[2] - pixel[0] - (ground[2] - ground[0]);
		}
	return blue;
}
const tintRest = valueTint();
renderer.clockPause();
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
step(0);
step(16);
const tintMiddle = valueTint();
step(400);
const tintHovered = valueTint();
renderer.clockResume();
report(
	"the value's tint eases in on hover",
	tintHovered > tintRest + 1000 &&
		tintMiddle > tintRest &&
		tintMiddle < tintRest + 0.8 * (tintHovered - tintRest),
	`rest ${tintRest}, 16 ms ${tintMiddle}, hovered ${tintHovered}`,
);

// The focus ring (an outline) fades in over 80 ms like the source's `transition-all` box-shadow ring. The motion clock
// is held and stepped by hand so a slow frame cannot skip the middle.
await reset();
// An earlier check left the row focused: a click on the bare page takes the focus away.
renderer.nativeSimulateClick(580, 280);
await settle(300);
function ringSum() {
	renderer.captureScreenshot(`/tmp/check-input-copy-ring-${process.pid}.png`);
	const pixel = readPng(`/tmp/check-input-copy-ring-${process.pid}.png`).at(
		Math.round(rowBox.x) - 1,
		Math.round(rowBox.y + rowBox.height / 2),
	);
	return pixel[0] + pixel[1] + pixel[2];
}
if (renderer.getFocusedElementId() === row.id)
	throw new Error('the row already has focus');
const ringRest = ringSum();
renderer.clockPause();
renderer.simulateKeystrokes('Tab');
step(0);
step(16);
const ringMiddle = ringSum();
step(300);
const ringFocused = ringSum();
renderer.clockResume();
report(
	'the focus ring fades in',
	ringFocused > ringRest + 20 &&
		ringMiddle > ringRest &&
		ringMiddle < ringRest + 0.6 * (ringFocused - ringRest),
	`rest ${ringRest}, 16 ms ${ringMiddle}, end ${ringFocused}`,
);

// The check draws from its first point: 16 ms into the 80 ms draw the stroke has not reached the right half of the glyph, where the finished check has its second, longer segment. A fade alone would scale both halves alike, so the share of ink on the right tells a draw from a fade.
await reset();
function glyphHalves() {
	renderer.captureScreenshot(`/tmp/check-input-copy-draw-${process.pid}.png`);
	const pixels = readPng(`/tmp/check-input-copy-draw-${process.pid}.png`);
	const edge = rowBox.x + rowBox.width;
	const top = Math.round(rowBox.y + 4);
	const bottom = Math.round(rowBox.y + rowBox.height - 4);
	const ground = pixels.at(Math.round(edge - 36), top);
	const half = (from: number, to: number) => {
		let ink = 0;
		for (let y = top; y < bottom; y++)
			for (let x = Math.round(from); x < Math.round(to); x++) {
				const pixel = pixels.at(x, y);
				ink +=
					Math.abs(pixel[0] - ground[0]) +
					Math.abs(pixel[1] - ground[1]) +
					Math.abs(pixel[2] - ground[2]);
			}
		return ink;
	};
	return { left: half(edge - 20, edge - 13), right: half(edge - 13, edge - 6) };
}
renderer.clockPause();
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
step(0);
step(400);
renderer.nativeSimulateMouseDown(subject.x - 41, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 41, subject.y);
// The copy settles on a promise, so it needs a real turn before the clock is stepped.
await sleep(50);
step(0);
// The copy icon shrinks out first (`mode="wait"`); the check mounts once it is gone.
step(300);
step(0);
step(16);
const drawing = glyphHalves();
step(400);
const drawn = glyphHalves();
renderer.clockResume();
report(
	'the check draws from its first point',
	drawn.right > 0 &&
		drawing.right / (drawing.left + 1) < 0.3 * (drawn.right / drawn.left),
	`16 ms left ${drawing.left} right ${drawing.right}, end left ${drawn.left} right ${drawn.right}`,
);

// The glyph swap scales like the source's `spring.fast` swap: the copy icon shrinks out to 0.8, then the check grows in from 0.6, both about the glyph's centre.
await reset();
/** The box of the glyph being swapped: the action's only child, by its transformed bounds. */
function glyphBox() {
	const action = renderer
		.getElement(rowId)
		?.children.map((id) => renderer.getElement(id))
		.at(-1);
	const glyph = action?.children[0];
	if (glyph === undefined) throw new Error('the action has no glyph');
	const box = renderer.getElementBounds(glyph);
	if (box === null) throw new Error('the glyph has no bounds');
	return box;
}
const swapRest = glyphBox();
renderer.clockPause();
renderer.nativeSimulateMouseMove(subject.x - 40, subject.y);
renderer.nativeSimulateMouseMove(subject.x - 41, subject.y);
step(0);
step(400);
renderer.nativeSimulateMouseDown(subject.x - 41, subject.y);
renderer.nativeSimulateMouseUp(subject.x - 41, subject.y);
await sleep(50);
step(0);
step(16);
const leaving = glyphBox();
step(300);
step(0);
step(0);
step(8);
const arriving = glyphBox();
step(600);
const arrived = glyphBox();
renderer.clockResume();
report(
	'the copy icon shrinks out before the check grows in',
	leaving.width < swapRest.width - 0.2 && leaving.width > swapRest.width * 0.8,
	`rest ${swapRest.width.toFixed(2)}, leaving ${leaving.width.toFixed(2)}`,
);
report(
	'the check grows in from a smaller scale about the glyph centre',
	arriving.width < arrived.width * 0.9 &&
		Math.abs(
			arriving.x + arriving.width / 2 - (arrived.x + arrived.width / 2),
		) < 0.5,
	`arriving ${arriving.width.toFixed(2)}, arrived ${arrived.width.toFixed(2)}`,
);

test.unmount();
process.exit(failed ? 1 : 0);
