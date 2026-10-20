/**
 * Button fades on captured pixels: the surface eases on hover and press, and a ghost's label eases to the
 * foreground colour.
 *
 *   bun scripts/check-button.tsx
 *
 * The loading spinner draws: its dash slides along the outline and grows and shrinks over the 4 s dash cycle.
 *
 * The motion clock is held and stepped by hand, so a slow frame cannot skip the middle of the 80 ms.
 */
import { Button } from '#/components/button';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const k = await createCheck(
	() => (
		<div
			style={{ display: 'flex', flexDirection: 'row', gap: 24, padding: 24 }}
		>
			<Button testId="ghost" variant="ghost">
				Ghost
			</Button>
			<Button testId="tertiary" variant="tertiary">
				Tertiary
			</Button>
			<Button testId="primary" variant="primary">
				Primary
			</Button>
			<Button testId="loading" variant="secondary" loading>
				Loading
			</Button>
		</div>
	),
	{ width: 500, height: 120, initialSettleMs: 300 },
);
const renderer = k.renderer;
const PATH = `/tmp/check-button-${process.pid}.png`;

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

/** The channel sum at `dx`, `dy` from the button's top-left. */
function sum(testId: string, dx: number, dy: number) {
	renderer.captureScreenshot(PATH);
	const box = k.bounds(testId);
	const pixel = readPng(PATH).at(
		Math.round(box.x + dx),
		Math.round(box.y + dy),
	);
	return pixel[0] + pixel[1] + pixel[2];
}

/** The label's ink: how far the inside of the button differs from its own top-left pixel. */
function labelInk(testId: string) {
	const box = k.bounds(testId);
	return k.ink({
		x: box.x + 4,
		y: box.y + 4,
		width: box.width - 8,
		height: box.height - 8,
	});
}

function between(before: number, middle: number, after: number) {
	const low = Math.min(before, after);
	const high = Math.max(before, after);
	return middle > low + 2 && middle < high - 2;
}

renderer.clockPause();

for (const id of ['ghost', 'tertiary']) {
	const before = sum(id, 6, 6);
	const point = k.center(id);
	renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	step(0);
	step(16);
	const middle = sum(id, 6, 6);
	step(300);
	const after = sum(id, 6, 6);
	k.check(
		`${id} hover: 16 ms in, between the resting and the hovered fill`,
		between(before, middle, after),
		`rest ${before}, 16 ms ${middle}, end ${after}`,
	);
	if (id === 'ghost') {
		renderer.nativeSimulateMouseMove(0, 0);
		step(300);
		const inkRest = labelInk(id);
		renderer.nativeSimulateMouseMove(point.x - 1, point.y);
		renderer.nativeSimulateMouseMove(point.x, point.y);
		step(0);
		step(16);
		const inkMiddle = labelInk(id);
		step(300);
		const inkEnd = labelInk(id);
		k.check(
			'ghost hover: the label colour is part-way at 16 ms',
			between(inkRest, inkMiddle, inkEnd),
			`rest ${inkRest}, 16 ms ${inkMiddle}, end ${inkEnd}`,
		);
	}
	renderer.nativeSimulateMouseMove(0, 0);
	step(300);
}

{
	// Primary's fill reaches 1px outside the button's inset surface and the press pulls its edge in to the
	// surface. A quad's edge lands on a whole pixel, so the edge steps instead of easing: the pixel just
	// outside the left edge is still the fill on the press frame and is the page behind it once the 80 ms is over.
	const point = k.center('primary');
	renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	step(300);
	const before = sum('primary', -1, 18);
	renderer.nativeSimulateMouseDown(point.x, point.y);
	step(0);
	const first = sum('primary', -1, 18);
	step(300);
	const after = sum('primary', -1, 18);
	renderer.nativeSimulateMouseUp(point.x, point.y);
	k.check(
		'primary press: the fill edge leaves the outer pixel after the press frame, not on it',
		first === before && after < before - 2,
		`rest ${before}, press frame ${first}, end ${after}`,
	);
	step(300);
	k.check(
		'primary release: the fill edge returns to the outer pixel',
		sum('primary', -1, 18) === before,
		`rest ${before}, released ${sum('primary', -1, 18)}`,
	);
}

{
	// spinner-move runs 2 s and spinner-dash 4 s, so after 4 s both are back where they began. The dash grows from 15 to 40 of
	// 100 in between. The animation started at mount, so the cycle is read from whatever phase the clock is in.
	const box = k.bounds('loading');
	// Inside the surface, so the ink is measured against the button's own fill.
	const spinner = {
		x: box.x + box.width / 2 - 14,
		y: box.y + box.height / 2 - 9,
		width: 28,
		height: 18,
	};
	const frame = () => {
		renderer.captureScreenshot(PATH);
		return readPng(PATH);
	};
	const differs = (
		a: ReturnType<typeof frame>,
		b: ReturnType<typeof frame>,
	) => {
		let changed = 0;
		for (let y = Math.round(spinner.y); y < spinner.y + spinner.height; y++)
			for (let x = Math.round(spinner.x); x < spinner.x + spinner.width; x++)
				if (
					a.at(x, y).some((channel, i) => Math.abs(channel - b.at(x, y)[i]) > 8)
				)
					changed++;
		return changed;
	};
	step(0);
	const start = frame();
	const inks = [k.ink(spinner)];
	step(250);
	const quarter = frame();
	inks.push(k.ink(spinner));
	for (let elapsed = 500; elapsed < 4000; elapsed += 250) {
		step(250);
		inks.push(k.ink(spinner));
	}
	step(250);
	const cycle = frame();
	k.check(
		'loading spinner: the dash moves in a quarter second',
		differs(start, quarter) > 5,
		`${differs(start, quarter)} pixels changed`,
	);
	k.check(
		'loading spinner: the dash grows and shrinks over the cycle',
		Math.max(...inks) > Math.min(...inks) * 1.8,
		`ink from ${Math.min(...inks)} to ${Math.max(...inks)}`,
	);
	k.check(
		'loading spinner: back where it began after the 4 s cycle',
		differs(start, cycle) < 8,
		`${differs(start, cycle)} pixels changed`,
	);
}
renderer.clockResume();

await k.finish();
