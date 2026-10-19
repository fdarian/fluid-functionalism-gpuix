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

// The motion clock is held and stepped by hand; the fill's width is the dot's 6px plus its progress of the 18px the pill grows.
const renderer = check.renderer;
renderer.clockPause();
check.check(
	'a carousel mounted paused sits at 0',
	check.bounds('auto-fill').width === 6,
);
setPaused(false);
const progress = () => (check.bounds('auto-fill').width - 6) / 18;
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
renderer.clockResume();

check.finish();
