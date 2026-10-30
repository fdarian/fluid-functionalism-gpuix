/**
 * Chat message checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-chat-message.tsx
 *
 * The meta row (timestamp and actions) is revealed by hover and by keyboard focus on an action.
 * The message enters on y 8 and scale .96 about its bottom outer corner (right for the user, left for the assistant), like the source.
 * An earlier message slides up when one is appended below it (`layout="position"`), sampled mid-glide.
 * The reveal is the row's opacity, eased by a CSS transition; a screenshot with the focused action lands in /tmp/check-chat-message-focus-<pid>.png.
 */

import { createTestRoot } from '@gpuix/solid/testing';
import { createSignal, For } from 'solid-js';
import { ChatMessage, ChatMessageAction } from '#/components/chat-message';
import { fonts } from '#/lib/fonts';
import { color, setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 500, height: 200, fonts });
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
/** The meta row: the grandparent of the time's text. */
function metaRow() {
	const text = renderer.findByText('09:41');
	if (text === undefined || text.parentId === null)
		throw new Error('no timestamp');
	const label = renderer.getElement(text.parentId);
	if (label === undefined || label.parentId === null)
		throw new Error('no timestamp label');
	const row = renderer.getElement(label.parentId);
	if (row === undefined) throw new Error('no meta row');
	return row;
}
function metaOpacity() {
	const opacity = metaRow().style.opacity;
	if (opacity === undefined) throw new Error('the meta row has no opacity');
	return Number(opacity);
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

setThemeChoice('dark');
test.render(() => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			padding: 20,
			width: 460,
			backgroundColor: color.background,
		}}
	>
		<ChatMessage
			testId="message"
			from="user"
			time="09:41"
			actions={
				<>
					<ChatMessageAction testId="copy" action="copy" label="Copy" />
					<ChatMessageAction testId="edit" action="edit" label="Edit" />
				</>
			}
		>
			Hello there
		</ChatMessage>
		<div testId="after" tabIndex={0} style={{ height: 20 }} />
	</div>
));
renderer.clockPause();
step(0);
step(0);
step(40);
const entering = bounds('message');
step(600);
step(0);
const entered = bounds('message');
renderer.clockResume();
report(
	'the user message enters smaller than it rests, about its bottom right corner',
	entering.width < entered.width - 0.2 &&
		Math.abs(entering.x + entering.width - (entered.x + entered.width)) < 0.5 &&
		entering.y + entering.height > entered.y + entered.height + 0.2,
	`${entering.width.toFixed(2)} wide, right ${(entering.x + entering.width).toFixed(2)}, bottom ${(entering.y + entering.height).toFixed(2)} -> ${entered.width.toFixed(2)}, ${(entered.x + entered.width).toFixed(2)}, ${(entered.y + entered.height).toFixed(2)}`,
);
await settle(800);

const resting = metaOpacity();
report('meta row is hidden at rest', resting === 0, `opacity ${resting}`);

const metaStyle = metaRow().style;
report(
	"meta row fades opacity over 150 ms on Tailwind's default curve",
	metaStyle.transitionProperty === 'opacity' &&
		metaStyle.transitionDuration === '150ms' &&
		metaStyle.transitionTimingFunction === 'cubic-bezier(0.4, 0, 0.2, 1)',
	`${metaStyle.transitionProperty} ${metaStyle.transitionDuration} ${metaStyle.transitionTimingFunction}`,
);

renderer.simulateKeystrokes('Tab');
await settle(500);
const focused = renderer.getFocusedElementId();
report(
	'Tab reaches the first action',
	focused === element('copy').id,
	`focused ${focused}, copy ${element('copy').id}`,
);
const focusOpacity = metaOpacity();
report(
	'meta row is shown while an action has keyboard focus',
	focusOpacity === 1,
	`opacity ${focusOpacity}`,
);
renderer.captureScreenshot(`/tmp/check-chat-message-focus-${process.pid}.png`);

renderer.simulateKeystrokes('Tab');
await settle(500);
report(
	'meta row stays shown moving between actions',
	metaOpacity() === 1,
	`opacity ${metaOpacity()}`,
);

renderer.simulateKeystrokes('Tab');
await settle(500);
const afterFocus = renderer.getFocusedElementId();
report(
	'Tab leaves the message',
	afterFocus === element('after').id,
	`focused ${afterFocus}`,
);
report(
	'meta row hides again when focus leaves',
	metaOpacity() === 0,
	`opacity ${metaOpacity()}`,
);

// Hover moves from the first action to the second: the first one's fill and glyph ease back over 100 ms.
function bounds(testId: string) {
	const box = renderer.getElementBounds(element(testId).id);
	if (box === null) throw new Error(`no painted bounds for ${testId}`);
	return box;
}
function actionPixels(testId: string) {
	renderer.captureScreenshot(`/tmp/check-chat-message-fade-${process.pid}.png`);
	const box = bounds(testId);
	const pixels = readPng(`/tmp/check-chat-message-fade-${process.pid}.png`);
	const left = Math.round(box.x);
	const top = Math.round(box.y);
	let glyph = 0;
	for (let y = top + 5; y < top + 19; y++)
		for (let x = left + 5; x < left + 19; x++)
			glyph = Math.max(glyph, pixels.at(x, y)[0]);
	return { fill: pixels.at(left + 2, top + 12)[0], glyph };
}
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
const copyBox = bounds('copy');
const editBox = bounds('edit');
renderer.nativeSimulateMouseMove(copyBox.x + 12, copyBox.y + 12);
await settle(500);
renderer.clockPause();
const hovered = actionPixels('copy');
renderer.nativeSimulateMouseMove(editBox.x + 12, editBox.y + 12);
step(0);
step(40);
const middle = actionPixels('copy');
step(300);
const rested = actionPixels('copy');
renderer.clockResume();
report(
	'action fill eases back 40 ms after the pointer leaves',
	middle.fill < hovered.fill - 2 && middle.fill > rested.fill + 2,
	`hovered ${hovered.fill}, 40 ms ${middle.fill}, rest ${rested.fill}`,
);
report(
	'action glyph colour eases back 40 ms after the pointer leaves',
	middle.glyph < hovered.glyph - 2 && middle.glyph > rested.glyph + 2,
	`hovered ${hovered.glyph}, 40 ms ${middle.glyph}, rest ${rested.glyph}`,
);

// Leaving the message hides the meta row over 150 ms; the second glyph is hovered nowhere, so only the row's opacity moves it.
renderer.clockPause();
const shown = actionPixels('copy').glyph;
renderer.nativeSimulateMouseMove(400, 190);
step(0);
step(40);
const fading = actionPixels('copy').glyph;
step(400);
const hidden = actionPixels('copy').glyph;
renderer.clockResume();
report(
	'meta row eases its opacity out 40 ms after the pointer leaves',
	fading < shown - 2 && fading > hidden + 2,
	`shown ${shown}, 40 ms ${fading}, hidden ${hidden}`,
);

test.unmount();

// A message appended to a column that keeps its end in view pushes the earlier ones up; they glide.
{
	const slideTest = createTestRoot({ width: 500, height: 400, fonts });
	const slideRenderer = slideTest.renderer;
	const [messages, setMessages] = createSignal([0]);
	slideTest.render(() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end',
				height: 360,
				padding: 20,
				width: 460,
				backgroundColor: color.background,
			}}
		>
			<For each={messages()}>
				{(message) => (
					<ChatMessage testId={`slide-${message}`} from="assistant">
						{`Message ${message}`}
					</ChatMessage>
				)}
			</For>
		</div>
	));
	const advance = (ms: number) => {
		slideRenderer.clockFastForward(ms);
		slideRenderer.flush();
		slideRenderer.dispatchNativeEvents();
	};
	for (let frame = 0; frame < 40; frame++) {
		slideRenderer.flush();
		slideRenderer.dispatchNativeEvents();
		await sleep(16);
	}
	const firstId = slideRenderer.findByTestId('slide-0')?.id;
	if (firstId === undefined) throw new Error('no first message');
	const y = () => {
		const box = slideRenderer.getElementBounds(firstId);
		if (box === null) throw new Error('the first message has no bounds');
		return box.y;
	};
	const rest = y();
	slideRenderer.clockPause();
	setMessages([0, 1]);
	advance(0);
	advance(0);
	y();
	const samples: number[] = [];
	for (let elapsed = 0; elapsed < 400; elapsed += 8) {
		advance(8);
		samples.push(y());
	}
	slideRenderer.clockResume();
	const end = samples.at(-1) ?? rest;
	const travel = rest - end;
	const progress = samples.map((value) => (rest - value) / travel);
	const between = progress.filter((value) => value > 0.15 && value < 0.85);
	report(
		'an earlier message slides up when one is appended',
		travel > 20 &&
			between.length >= 1 &&
			progress.every(
				(value, index) => index === 0 || value >= progress[index - 1] - 0.01,
			),
		`${rest.toFixed(1)} -> ${end.toFixed(1)}, ${between.length} samples between`,
	);
	slideTest.unmount();
}
process.exit(failed ? 1 : 0);
