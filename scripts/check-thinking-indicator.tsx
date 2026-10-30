/**
 * The thinking indicator's native loops: the glyph morphs circle, infinity, circle on a 6 s loop, and the
 * shimmer's bright band crosses a word once per 1.5 s from its right end to its left.
 *
 *   bun scripts/check-thinking-indicator.tsx
 *
 * The motion clock is held and stepped by hand, and both are read from captured pixels. A mount does not
 * start the loops at a known phase, so each is checked against itself: the glyph's width 3 s later, the
 * band's peak order across the word.
 */
import { ThinkingIndicator } from '#/components/thinking-indicator';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const SHOT = `/tmp/check-thinking-indicator-${process.pid}.png`;
const GLYPH = 20;
const WORD_WAIT_MS = 6000;
const GLYPH_X = 12;
const WORD_X = GLYPH_X + GLYPH + 8;

const k = await createCheck(() => <ThinkingIndicator testId="thinking" />, {
	width: 300,
	height: 120,
	initialSettleMs: 400,
});
const renderer = k.renderer;
const root = k.bounds('thinking');
const top = Math.round(root.y);
const left = Math.round(root.x);
const height = Math.round(root.height);

const brightness = (pixel: number[]) => pixel[0] + pixel[1] + pixel[2];

/** The columns of the glyph box (`from` to `to`) that hold ink, as a width in px. */
function inkWidth(from: number, to: number) {
	renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const ground = brightness(pixels.at(left + 1, top + 1));
	let first = Number.POSITIVE_INFINITY;
	let last = Number.NEGATIVE_INFINITY;
	for (let x = left + from; x < left + to; x++)
		for (let y = top; y < top + height; y++)
			if (Math.abs(brightness(pixels.at(x, y)) - ground) > 90) {
				first = Math.min(first, x);
				last = Math.max(last, x);
			}
	return last - first + 1;
}

renderer.clockPause();
const widths: number[] = [];
for (let sample = 0; sample < 24; sample++) {
	k.step(sample === 0 ? 0 : 250);
	widths.push(inkWidth(GLYPH_X, GLYPH_X + GLYPH));
}
console.log(`glyph ink width every 250 ms: ${widths.join(' ')}`);
k.check(
	'the glyph reaches the infinity sign (wide) and the circle (narrow)',
	Math.max(...widths) >= 12 && Math.min(...widths) <= 9,
	`${Math.min(...widths)}..${Math.max(...widths)} px`,
);
k.check(
	'the glyph repeats its shape 3 s later (circle B mirrors circle A)',
	widths
		.slice(0, 12)
		.every((width, i) => Math.abs(width - widths[i + 12]) <= 1),
);
renderer.clockResume();

// The word column: the first word, "Thinking", before the 4 s cycle moves on.
const words = k.bounds('thinking');
const wordLeft = Math.round(words.x) + WORD_X;
const SLICES = 4;

/** The brightest pixel of each of `SLICES` equal columns of the word. */
function sliceBrightness(wordWidth: number) {
	renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const peaks = new Array<number>(SLICES).fill(0);
	for (let x = wordLeft; x < wordLeft + wordWidth; x++) {
		const slice = Math.min(
			SLICES - 1,
			Math.floor(((x - wordLeft) / wordWidth) * SLICES),
		);
		for (let y = top; y < top + height; y++)
			peaks[slice] = Math.max(peaks[slice], brightness(pixels.at(x, y)));
	}
	return peaks;
}

/** The width of the ink right of the glyph, "Thinking" wide. */
const wordWidth = (() => {
	renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const ground = brightness(pixels.at(left + 1, top + 1));
	let last = wordLeft;
	for (let x = wordLeft; x < left + 300; x++)
		for (let y = top; y < top + height; y++)
			if (Math.abs(brightness(pixels.at(x, y)) - ground) > 90) last = x;
	return last - wordLeft + 1;
})();

renderer.clockPause();
const SAMPLES = 24;
const peaks: number[][] = [];
for (let sample = 0; sample < SAMPLES; sample++) {
	k.step(sample === 0 ? 0 : 1500 / SAMPLES);
	peaks.push(sliceBrightness(wordWidth));
}
renderer.clockResume();

const series = (slice: number) => peaks.map((frame) => frame[slice]);
const bestOf = (slice: number) => Math.max(...series(slice));
const worstOf = (slice: number) => Math.min(...series(slice));
const BASE = 3 * 0x52;
const BRIGHT = 3 * 0xa3;
console.log(
	`word slices, brightest and dimmest over a sweep: ${Array.from({ length: SLICES }, (_, slice) => `${worstOf(slice)}..${bestOf(slice)}`).join('  ')} (base ${BASE}, bright ${BRIGHT})`,
);
k.check(
	'every part of the word dims to the base colour and brightens to the band',
	Array.from({ length: SLICES }, (_, slice) => slice).every(
		(slice) => worstOf(slice) <= BASE + 40 && bestOf(slice) >= BRIGHT - 60,
	),
);
const peakAt = (slice: number) => series(slice).indexOf(bestOf(slice));
const delay = (peakAt(0) - peakAt(SLICES - 1) + SAMPLES) % SAMPLES;
k.check(
	'the band reaches the right end of the word before the left end',
	delay >= 3 && delay <= 9,
	`${delay} of ${SAMPLES} samples later`,
);

// The word roll: the next word comes up from 80% of its own height (16 of the 20px line) over 0.24 s, and the old one leaves through the top to -80% in 0.16 s.
const SLOT_TOP = k.bounds('thinking').y + 8;
const ROLL = 16;
const presentWord = () =>
	['Thinking', 'Moonwalking', 'Planning', 'Refining'].filter((word) =>
		k.exists(`thinking-word-${word}`),
	);
await k.until(() => presentWord().length === 1, 'one word in the slot');
renderer.clockPause();
const leaving = presentWord()[0];
if (leaving === undefined) throw new Error('no word is showing');
await k.until(
	() => presentWord().some((word) => word !== leaving),
	'the next word to be asked for',
	WORD_WAIT_MS,
);
const arriving = presentWord().find((word) => word !== leaving);
if (arriving === undefined) throw new Error('no next word');
const wordY = (word: string) => k.bounds(`thinking-word-${word}`).y - SLOT_TOP;
const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
k.step(0);
k.check(
	'the arriving word starts 80% of its height below the slot',
	near(wordY(arriving), ROLL),
	`${wordY(arriving)}`,
);
k.step(180);
k.check(
	'the old word has left through the top, to -80% of its height',
	k.exists(`thinking-word-${leaving}`) && wordY(leaving) < -ROLL + 1.5,
	`${wordY(leaving)}`,
);
k.step(60);
k.check(
	'the old word is gone and the new one rests in the slot at 0.24 s',
	!k.exists(`thinking-word-${leaving}`) && near(wordY(arriving), 0),
	`${wordY(arriving)}`,
);
renderer.clockResume();
k.finish();
