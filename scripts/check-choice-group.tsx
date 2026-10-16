/**
 * Checkbox / radio group fixes, measured on captured pixels per frame (dark theme).
 *
 *   bun scripts/check-choice-group.tsx
 *
 *  - the group's `size` sizes the checkbox square (14 px compact, 16 px default),
 *  - a selected run is there at once when it mounts (no fade-in),
 *  - a run that vanishes fades out over its 0.12 s exit instead of cutting,
 *  - the indicator border and the label colour ease over 80 ms on hover.
 */
import { mkdirSync } from 'node:fs';
import { createTestRoot } from '@gpuix/solid/testing';
import { App } from '#/app';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { setThemeChoice } from '#/lib/theme';
import { readPng } from './png-pixels';

const outDir = `/tmp/check-choice-group-${process.pid}/`;
mkdirSync(outDir, { recursive: true });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1000, height: 400, fonts });
const renderer = test.renderer;

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
function bounds(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no element ${testId}`);
	const box = renderer.getElementBounds(element.id);
	if (box === null) throw new Error(`no bounds for ${testId}`);
	return box;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

/** Right of the label, so nothing but the row's fills shows there. */
function pointIn(testId: string) {
	const box = bounds(testId);
	return {
		x: Math.round(box.x + box.width - 20),
		y: Math.round(box.y + box.height / 2),
	};
}

interface Sample {
	ms: number;
	value: number;
}

const SAMPLE_STEP_MS = 8;

/** The red channel at each point on every frame for `ms` of the held motion clock, stamped in that clock's time: a slow frame cannot land a sample elsewhere in an animation. */
async function sampleFrames(
	points: Record<string, () => { x: number; y: number } | undefined>,
	ms: number,
) {
	const series: Record<string, Sample[]> = {};
	for (const name of Object.keys(points)) series[name] = [];
	for (let stamp = 0; stamp <= ms; stamp += SAMPLE_STEP_MS) {
		renderer.clockFastForward(stamp === 0 ? 0 : SAMPLE_STEP_MS);
		frame();
		renderer.captureScreenshot(`${outDir}frame.png`);
		const pixels = readPng(`${outDir}frame.png`);
		for (const [name, point] of Object.entries(points)) {
			const at = point();
			if (at !== undefined) {
				(series[name] as Sample[]).push({
					ms: Math.round(stamp),
					value: pixels.at(at.x, at.y)[0],
				});
			}
		}
		// The page's own real-time work (lazy loading, JS timers) still needs wall time between frames.
		await sleep(2);
	}
	return series;
}
const show = (samples: Sample[]) =>
	samples.map((sample) => `${sample.ms}:${sample.value}`).join(' ');

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice('dark');

// Mount: checked row 0 against unchecked row 3, from the first frame.
renderer.clockPause();
test.render(() => (
	<App demos={demos} pages={pages} initialPage="checkbox-group" />
));
const optional = (testId: string) => () => {
	const element = renderer.findByTestId(testId);
	if (element === undefined || renderer.getElementBounds(element.id) === null) {
		return undefined;
	}
	return pointIn(testId);
};
const mount = await sampleFrames(
	{ checked: optional('box-0'), plain: optional('box-3') },
	1200,
);
renderer.clockResume();
const checked = mount.checked as Sample[];
const plain = mount.plain as Sample[];
const settled = (checked[checked.length - 1] as Sample).value;
const rest = (plain[plain.length - 1] as Sample).value;
console.log('mount', show(checked));
const firstLit = checked.find((sample) => sample.value > rest + 1);
if (firstLit === undefined) throw new Error('the checked row never lit');
report(
	'a checked run appears without a fade-in',
	firstLit.value >= settled - 1,
	`row at rest ${rest}, checked ${settled}, first lit frame ${firstLit.ms} ms: ${firstLit.value}`,
);

// Size: the group pins the square.
for (const [id, expected] of [
	['box-0-box', 16],
	['small-0-box', 14],
] as const) {
	const box = bounds(id);
	report(
		`${id} width`,
		Math.round(box.width) === expected,
		`${box.width} (want ${expected})`,
	);
}

// Vanish: uncheck the only checked row; the pointer leaves with the click, so its hover fill is gone within 60 ms.
// The motion clock is held and stepped by hand: sampling in real time cannot land inside a 120 ms fade reliably.
const row = pointIn('box-0');
renderer.nativeSimulateMouseMove(990, 390);
await settle(400);
function step(ms: number) {
	renderer.clockFastForward(ms);
	frame();
}
function fillAt(point: { x: number; y: number }) {
	renderer.captureScreenshot(`${outDir}frame.png`);
	return readPng(`${outDir}frame.png`).at(point.x, point.y)[0];
}
renderer.clockPause();
renderer.nativeSimulateClick(row.x, row.y);
renderer.nativeSimulateMouseMove(990, 390);
step(0);
const before = fillAt(row);
step(60);
const middle = fillAt(row);
step(300);
const after = fillAt(row);
renderer.clockResume();
console.log('vanish', before, middle, after);
report(
	'a vanishing run fades out',
	middle > rest + 3 && middle < before && after <= rest + 1,
	`just after the click ${before}, 60 ms later ${middle}, 360 ms later ${after} (rest ${rest})`,
);

// Hover on an unchecked row: the indicator border and the label colour ease over 80 ms (the border is the left
// edge of the box, the label the ink to its right).
{
	const box = bounds('box-3-box');
	const edge = {
		x: Math.round(box.x),
		y: Math.round(box.y + box.height / 2),
	};
	const sum = (point: { x: number; y: number }) => {
		renderer.captureScreenshot(`${outDir}frame.png`);
		const pixel = readPng(`${outDir}frame.png`).at(point.x, point.y);
		return pixel[0] + pixel[1] + pixel[2];
	};
	const label = {
		x: Math.round(box.x + box.width + 12),
		y: edge.y,
	};
	const inkAt = () => {
		renderer.captureScreenshot(`${outDir}frame.png`);
		const pixels = readPng(`${outDir}frame.png`);
		let total = 0;
		for (let dy = -6; dy <= 6; dy++)
			for (let dx = 0; dx < 40; dx++) {
				const pixel = pixels.at(label.x + dx, label.y + dy);
				total += pixel[0] + pixel[1] + pixel[2];
			}
		return total;
	};
	renderer.nativeSimulateMouseMove(990, 390);
	await settle(400);
	const edgeRest = sum(edge);
	const inkRest = inkAt();
	renderer.clockPause();
	const point = pointIn('box-3');
	renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	step(0);
	step(16);
	const edgeMiddle = sum(edge);
	const inkMiddle = inkAt();
	step(300);
	const edgeEnd = sum(edge);
	const inkEnd = inkAt();
	renderer.clockResume();
	/** Past the start but under 60% of the way: an instant switch is already at the end by 16 ms. */
	const between = (rest: number, middle: number, end: number) =>
		(middle - rest) * (end - rest) > 0 &&
		Math.abs(middle - rest) < 0.6 * Math.abs(end - rest);
	report(
		'indicator border eases on hover',
		between(edgeRest, edgeMiddle, edgeEnd),
		`rest ${edgeRest}, 16 ms ${edgeMiddle}, end ${edgeEnd}`,
	);
	report(
		'label colour eases on hover',
		between(inkRest, inkMiddle, inkEnd),
		`rest ${inkRest}, 16 ms ${inkMiddle}, end ${inkEnd}`,
	);
}

test.unmount();
process.exit(failed ? 1 : 0);
