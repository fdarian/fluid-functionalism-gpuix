/**
 * CarouselDots scenarios: only the current dot is marked (`aria-current`), the
 * others carry no state, and picking a dot moves the mark. Autoplay fills the
 * current dot natively over the slide's duration, holds its progress while
 * paused, and asks for the next slide once.
 *
 *   bun scripts/check-carousel-dots.tsx
 */
import { createSignal } from 'solid-js';
import { CarouselDots } from '#/components/carousel-dots';
import { createCheck } from './check-kit';

const [value, setValue] = createSignal(1);
const [playingValue, setPlayingValue] = createSignal(0);
const [paused, setPaused] = createSignal(true);
const requests: number[] = [];
const DURATION = 1000;

const check = await createCheck(() => (
	<div style={{ padding: 40 }}>
		<CarouselDots
			testId="dots"
			count={3}
			value={value()}
			onValueChange={setValue}
			getLabel={(index: number) => `Show ${index}`}
		/>
		<CarouselDots
			testId="auto"
			count={3}
			value={playingValue()}
			onValueChange={(index: number) => {
				requests.push(index);
				setPlayingValue(index);
			}}
			autoplay={{ duration: DURATION, paused: paused() }}
		/>
	</div>
));

await check.settle();

function report(label: string) {
	for (const index of [0, 1, 2]) {
		const node = check.aria(`Show ${index}`);
		console.log(label, index, JSON.stringify(node));
	}
}

function expectCurrent(label: string, current: number) {
	for (const index of [0, 1, 2]) {
		const node = check.aria(`Show ${index}`);
		check.expect(
			`${label}: dot ${index} aria_current`,
			node?.aria_current,
			index === current ? 'True' : undefined,
		);
		check.expect(
			`${label}: dot ${index} has no selected state`,
			node?.selected,
			undefined,
		);
	}
}

report('initial');
expectCurrent('value 1', 1);

setValue(2);
await check.settle();
expectCurrent('value 2', 2);

/**
 * The fill is the track's width, slid left by `(1 - p) * (width - 6)`: p is how far its transformed box has come back. While the
 * track is still 6px wide (a slide's first frame) the fill is not offset at any p, so it reads as 0.
 */
function fillProgress(
	prefix: string,
	read: (testId: string) => { x: number; width: number },
) {
	const track = read(`${prefix}-track`);
	const travel = track.width - 6;
	if (travel < 1) return 0;
	return 1 + (read(`${prefix}-fill`).x - track.x) / travel;
}

// The motion clock is held and stepped by hand.
const renderer = check.renderer;
renderer.clockPause();
const progress = () => fillProgress('auto', check.bounds);
check.check(
	'a carousel mounted paused sits at 0',
	Math.abs(progress()) < 0.01,
	`${progress()}`,
);
setPaused(false);
const near = (actual: number, expected: number) =>
	Math.abs(actual - expected) < 0.03;
async function advance(ms: number) {
	check.step(ms);
	await check.settle(0);
}

await advance(0);
const start = progress();
await advance(250);
check.check(
	'a quarter of the duration fills a quarter',
	near(progress() - start, 0.25),
	`${(progress() - start).toFixed(3)}`,
);

const before = progress();
setPaused(true);
await advance(0);
await advance(600);
check.check(
	'a paused fill holds its progress',
	near(progress(), before),
	`${before.toFixed(3)} -> ${progress().toFixed(3)}`,
);
setPaused(false);
await advance(0);
await advance(250);
check.check(
	'resumed, it carries on from where it was, not from 0',
	near(progress() - before, 0.25),
	`${before.toFixed(3)} -> ${progress().toFixed(3)}`,
);

check.expect('no slide was asked for yet', requests, []);
await advance(500);
await advance(0);
check.expect('the full duration asks for the next slide once', requests, [1]);
check.check(
	'the new slide starts filling from 0',
	progress() < 0.1,
	`${progress().toFixed(3)}`,
);
await advance(DURATION + 100);
check.expect('then the one after', requests, [1, 2]);

// The last dot (2) is playing from 0. Sample its fill across the whole slide, then the wrap to dot 0 and the slide after it.
async function sample(stepMs: number, steps: number) {
	const seen: number[] = [];
	for (let i = 0; i < steps; i++) {
		await advance(stepMs);
		seen.push(Number(progress().toFixed(3)));
	}
	return seen;
}
function rises(seen: number[]) {
	return seen.every((value, i) => i === 0 || value > seen[i - 1]);
}
check.expect('the last dot is the current one', playingValue(), 2);
const lastSlide = await sample(250, 3);
check.check(
	'the last dot keeps filling (250 ms steps)',
	rises(lastSlide) && lastSlide[2] > 0.6,
	JSON.stringify(lastSlide),
);
await advance(300);
check.expect('the last dot asks to wrap to the first', requests, [1, 2, 0]);
check.expect('the first dot is current again', playingValue(), 0);
const afterWrap = await sample(250, 3);
check.check(
	'after the wrap the fill keeps progressing',
	rises(afterWrap) && afterWrap[2] > 0.6,
	JSON.stringify(afterWrap),
);

// The same wrap with the pointer over the carousel: hover pauses, it must not leave the fill stuck once released.
await advance(1000);
check.expect('second lap: next slide asked for', requests.slice(-1), [1]);
await advance(DURATION + 100);
check.expect('second lap: last dot again', playingValue(), 2);
setPaused(true);
await advance(0);
const held = await sample(250, 2);
check.check(
	'paused on the last dot the fill holds',
	held[1] === held[0],
	JSON.stringify(held),
);
setPaused(false);
await advance(0);
const resumed = await sample(250, 3);
check.check(
	'released on the last dot the fill moves again',
	rises(resumed),
	JSON.stringify(resumed),
);
await advance(DURATION);
const wrappedAgain = await sample(250, 3);
check.check(
	'the wrap after a hover fills again',
	rises(wrappedAgain),
	JSON.stringify(wrappedAgain),
);
renderer.clockResume();

// The demo page (four dots, a slide box that pauses the fill on hover, a sliding label) on a held clock stepped by hand. Its third slide change used to run the fill's two effects in the other order, which left the last dot's fill at 0 for good.
let failed = check.unmount();

/** Kills this process if the check has not cleared the guard in time: a native hang blocks the JS thread, so no timer could report it. */
function guard(what: string, ms: number) {
	const watchdog = Bun.spawn(
		[
			'sh',
			'-c',
			`sleep ${ms / 1000}; echo 'FAIL ${what} hung (killed after ${ms} ms)'; kill -9 ${process.pid}`,
		],
		{ stdout: 'inherit' },
	);
	return () => watchdog.kill();
}

async function openDemo() {
	const demo = await createCheck('carousel-dots');
	await demo.scrollIntoView('autoplay');
	const root = demo.bounds('autoplay');
	demo.renderer.clockPause();
	const progressOf = () =>
		Number(fillProgress('autoplay', demo.bounds).toFixed(3));
	// The page's static carousel (never clicked here) marks 'Show Inbox' too, so that label counts twice when autoplay is on dot 0. The fill's position cannot say: it moves while the previous pill shrinks.
	const dotOf = () => {
		const nodes = Object.values(demo.renderer.getA11yTree().nodes ?? {});
		const marked = (name: string) =>
			nodes.filter(
				(node) =>
					node.aria?.label === `Show ${name}` &&
					node.aria?.aria_current === 'True',
			).length;
		return ['Inbox', 'Drafts', 'Sent', 'Archive'].findIndex(
			(name) => marked(name) > (name === 'Inbox' ? 1 : 0),
		);
	};
	const dotPoint = (index: number) => ({
		x: root.x + index * 18 + 9,
		y: root.y + root.height / 2,
	});
	async function advanceFrame(ms: number) {
		demo.step(ms);
		await demo.settle(0);
	}
	/** Steps 250 ms at a time and returns the fill after each step. */
	async function sampleFill(steps: number) {
		const seen: number[] = [];
		for (let i = 0; i < steps; i++) {
			await advanceFrame(250);
			seen.push(progressOf());
		}
		return seen;
	}
	async function stepToDot(index: number) {
		for (let i = 0; i < 100 && dotOf() !== index; i++) await advanceFrame(250);
		demo.expect(`autoplay reached dot ${index}`, dotOf(), index);
	}
	return {
		demo,
		progressOf,
		dotOf,
		dotPoint,
		advanceFrame,
		sampleFill,
		stepToDot,
	};
}
const keepsFilling = (seen: number[]) =>
	seen.every((value, i) => i === 0 || value > seen[i - 1]);

// Without the pointer: autoplay runs through dots 0, 1, 2 and into the last one.
const plain = await openDemo();
await plain.stepToDot(3);
await plain.advanceFrame(250);
const plainSeen = await plain.sampleFill(6);
plain.demo.check(
	'no hover: the last dot keeps filling',
	keepsFilling(plainSeen),
	JSON.stringify(plainSeen),
);
const plainWrap = await plain.sampleFill(14);
plain.demo.check(
	'no hover: the last dot completes and autoplay wraps to the first',
	plain.dotOf() === 0,
	`dot ${plain.dotOf()}, fill ${JSON.stringify(plainWrap)}`,
);
failed += plain.demo.unmount();

// The pointer over the slide on the way (the pause and the release rerun the same effects), then autoplay into the last dot.
const hovered = await openDemo();
await hovered.stepToDot(1);
await hovered.demo.hoverFor(hovered.demo.center('autoplay-slide'), 100);
const heldOver = await hovered.sampleFill(2);
hovered.demo.check(
	'hover: the fill holds',
	heldOver[0] === heldOver[1],
	JSON.stringify(heldOver),
);
await hovered.demo.hoverFor({ x: 2, y: 2 }, 100);
await hovered.stepToDot(3);
await hovered.advanceFrame(250);
const afterHover = await hovered.sampleFill(6);
hovered.demo.check(
	'after a hover: the last dot keeps filling',
	keepsFilling(afterHover),
	JSON.stringify(afterHover),
);
// The pointer over the slide while the last dot plays, then leaving it.
await hovered.demo.hoverFor(hovered.demo.center('autoplay-slide'), 100);
const heldLast = await hovered.sampleFill(2);
hovered.demo.check(
	'hovered on the last dot: the fill holds',
	heldLast[0] === heldLast[1],
	JSON.stringify(heldLast),
);
await hovered.demo.hoverFor({ x: 2, y: 2 }, 100);
const leftLast = await hovered.sampleFill(3);
hovered.demo.check(
	'hovered on the last dot, then left: the fill moves',
	keepsFilling(leftLast),
	JSON.stringify(leftLast),
);
failed += hovered.demo.unmount();

// Picking another dot on the last slide must return. A hang blocks the JS thread, so the guard kills the process instead; keep this scenario last.
const clicked = await openDemo();
await clicked.stepToDot(3);
await clicked.sampleFill(8);
const release = guard('click on another dot', 15000);
clicked.demo.renderer.nativeSimulateClick(
	clicked.dotPoint(0).x,
	clicked.dotPoint(0).y,
);
clicked.demo.step(0);
await clicked.demo.settle(300);
release();
clicked.demo.check('a click on dot 0 returns', true);
clicked.demo.check(
	'the click made dot 0 current',
	clicked.dotOf() === 0,
	`dot ${clicked.dotOf()}`,
);
failed += clicked.demo.unmount();

console.log(failed === 0 ? 'all passed' : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
