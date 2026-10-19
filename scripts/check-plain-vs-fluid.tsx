/**
 * The Fluid Hover page's plain-vs-fluid demo: the scripted cursor is one
 * native pass animation (keyframes, times, ease, looping), the plain list
 * lights the row under it, and the pause button holds the pass where it is and
 * plays on from there.
 *
 *   bun scripts/check-plain-vs-fluid.tsx
 */
import { createCheck } from './check-kit';

const TOP = 2;
const BOTTOM = 210;
const LEGS_MS = [2000, 2000, 800, 800, 300, 300];
const PASS_MS = LEGS_MS.reduce((sum, leg) => sum + leg, 0);
const LIST_PADDING = 8;
const ROW_STRIDE = 40;
const ROW_HEIGHT = 36;
const ROWS = 5;

/** CSS ease-in-out, framer's easeInOut: cubic-bezier(0.42, 0, 0.58, 1). */
function easeInOut(progress: number) {
	const curve = (t: number, a: number, b: number) =>
		3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
	let low = 0;
	let high = 1;
	for (let step = 0; step < 30; step++) {
		const mid = (low + high) / 2;
		if (curve(mid, 0.42, 0.58) < progress) low = mid;
		else high = mid;
	}
	return curve((low + high) / 2, 0, 1);
}

/** Where the cursor's tip is `at` ms into a pass. */
function tipAt(at: number) {
	let start = 0;
	const wrapped = ((at % PASS_MS) + PASS_MS) % PASS_MS;
	for (let leg = 0; leg < LEGS_MS.length; leg++) {
		if (wrapped < start + LEGS_MS[leg]) {
			const from = leg % 2 === 0 ? TOP : BOTTOM;
			const to = leg % 2 === 0 ? BOTTOM : TOP;
			return from + (to - from) * easeInOut((wrapped - start) / LEGS_MS[leg]);
		}
		start += LEGS_MS[leg];
	}
	return TOP;
}

function rowUnder(y: number) {
	if (y < LIST_PADDING) return null;
	const index = Math.floor((y - LIST_PADDING) / ROW_STRIDE);
	return index < ROWS && y - LIST_PADDING - index * ROW_STRIDE < ROW_HEIGHT
		? index
		: null;
}

const kit = await createCheck('fluid-hover', { initialSettleMs: 1500 });
await kit.scrollIntoView('pvf-fluid-0');
await kit.settle(400);
const renderer = kit.renderer;

const listTop = () => kit.bounds('pvf-plain-0').y - LIST_PADDING;
const tip = () => kit.bounds('pvf-cursor-plain').y + 3 - listTop();
const lit = () =>
	Array.from({ length: ROWS }, (_row, index) => index).filter((index) => {
		const fill = renderer.findByTestId(`pvf-plain-${index}`)?.style
			.backgroundColor;
		return fill !== undefined && fill !== 'rgba(0,0,0,0)';
	});

renderer.clockPause();
/** Steps in frames of 50 ms, so the promise that turns the first pass into the loop settles where the pass ends. */
async function advance(ms: number) {
	for (let left = ms; left > 0; left -= 50) {
		kit.step(Math.min(50, left));
		await kit.settle(0);
	}
	kit.step(0);
}

const SAMPLE_AT = [0, 150, 300, 450, 600];
/** Where in the pass the cursor is now, found from samples along the next 600 ms (no two places of the pass share them); the clock is left 600 ms on. */
async function locate() {
	const samples: number[] = [];
	let sampled = 0;
	for (const at of SAMPLE_AT) {
		await advance(at - sampled);
		sampled = at;
		samples.push(tip());
	}
	let place = Number.NaN;
	let best = Number.POSITIVE_INFINITY;
	for (let at = 0; at < PASS_MS; at++) {
		const miss = samples.reduce(
			(sum, sample, index) =>
				sum + Math.abs(tipAt(at + SAMPLE_AT[index]) - sample),
			0,
		);
		if (miss < best) {
			best = miss;
			place = at;
		}
	}
	return { place: place + sampled, miss: best, samples };
}

const start = await locate();
kit.check(
	'the cursor sits on the source keyframes at some place of the pass',
	start.miss < 3,
	`${start.samples.map((sample) => sample.toFixed(0)).join(', ')} miss ${start.miss.toFixed(2)}`,
);

/** The cursor's place `elapsed` ms after the clock stood where `place` was found. */
function expectAt(name: string, place: number, elapsed: number) {
	const expected = tipAt(place + elapsed);
	const actual = tip();
	kit.check(
		name,
		Math.abs(actual - expected) < 1.5,
		`${actual.toFixed(1)} vs ${expected.toFixed(1)}`,
	);
}

let elapsed = 0;
for (const ms of [500, 1000, 1500]) {
	await advance(ms);
	elapsed += ms;
	expectAt(`${elapsed} ms on`, start.place, elapsed);
	const under = rowUnder(tip());
	kit.expect(
		`the plain list lights the row under the cursor at ${elapsed} ms`,
		lit(),
		under === null ? [] : [under],
	);
}

// The first pass hands over to the loop a frame or two late, so it is located again; from there a whole pass is the same place again.
await advance(PASS_MS);
const looping = await locate();
await advance(2 * PASS_MS);
expectAt(
	'two passes later the loop is in the same place',
	looping.place,
	2 * PASS_MS,
);

// Pause a second into a pass, so the rest of it is long.
const now = looping.place + 2 * PASS_MS;
const toSecondOne = (((1000 - now) % PASS_MS) + PASS_MS) % PASS_MS;
await advance(toSecondOne);
const pausedAt = now + toSecondOne;
await kit.click('plain-vs-fluid-playback');
renderer.clockPause();
const held = tip();
await advance(2500);
kit.check(
	'paused, the cursor holds its place',
	Math.abs(tip() - held) < 0.5,
	`${held.toFixed(1)} -> ${tip().toFixed(1)}`,
);

await kit.click('plain-vs-fluid-playback');
renderer.clockPause();
await advance(700);
expectAt('resumed, it plays on from where it paused', pausedAt, 700);
await advance(2000);
expectAt('and carries on along the same pass', pausedAt, 2700);
renderer.clockResume();

kit.finish();
