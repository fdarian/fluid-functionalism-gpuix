/**
 * `colorFade` and `fade(...)` on captured pixels: a colour list that eases whether the change comes from a signal or
 * from a state style, the same list on an `<Icon fade>` that strokes with `currentColor` and on an SVG shape's own
 * `stroke` and `fill`, and a comma list that carries a box shadow beside the colours.
 *
 *   bun scripts/check-color-fade.tsx
 *
 * The motion clock is held and stepped by hand, so a slow frame cannot skip the middle of the 80 ms.
 */
import { createSignal } from 'solid-js';
import { Icon } from '#/lib/icon';
import { colorFade, fade } from '#/lib/theme';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const [on, setOn] = createSignal(false);
const DIM = '#400000';
const BRIGHT = '#ff0000';
const tint = () => (on() ? BRIGHT : DIM);
const svgBox = { width: 64, height: 64, backgroundColor: '#000000' };

const k = await createCheck(
	() => (
		<div
			style={{ display: 'flex', flexDirection: 'row', gap: 20, padding: 20 }}
		>
			<div
				testId="signal"
				style={{
					width: 40,
					height: 40,
					backgroundColor: on() ? '#ffffff' : '#000000',
					...colorFade,
				}}
			/>
			<div
				testId="hover"
				style={{
					width: 40,
					height: 40,
					backgroundColor: '#000000',
					...colorFade,
					hover: { backgroundColor: '#ffffff' },
				}}
			/>
			<div
				testId="border"
				style={{
					width: 40,
					height: 40,
					borderWidth: 10,
					borderStyle: 'solid',
					borderColor: on() ? '#ffffff' : '#000000',
					...colorFade,
				}}
			/>
			<div
				testId="shadow"
				style={{
					width: 40,
					height: 40,
					margin: 20,
					boxShadow: on() ? '0 0 0 20px #ffffff' : '0 0 0 20px #000000',
					...fade(['color', 'box-shadow'], 80),
				}}
			/>
			<div testId="icon" style={svgBox}>
				<Icon
					name="chevron-down"
					size={64}
					strokeWidth={6}
					color={tint()}
					fade
				/>
			</div>
			<div testId="stroke" style={svgBox}>
				<svg viewBox="0 0 24 24" style={{ width: 64, height: 64 }}>
					<path
						d="M6 9l6 6 6-6"
						fill="none"
						stroke={tint()}
						strokeWidth={4}
						style={colorFade}
					/>
				</svg>
			</div>
			<div testId="fill" style={svgBox}>
				<svg viewBox="0 0 24 24" style={{ width: 64, height: 64 }}>
					<rect
						x="4"
						y="4"
						width="16"
						height="16"
						fill={tint()}
						style={colorFade}
					/>
				</svg>
			</div>
			<div
				testId="plain"
				style={{
					width: 40,
					height: 40,
					backgroundColor: on() ? '#ffffff' : '#000000',
				}}
			/>
		</div>
	),
	{ width: 760, height: 150, initialSettleMs: 300 },
);
const renderer = k.renderer;

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

/** The red channel at `dx`, `dy` from the element's top-left. */
function red(testId: string, dx: number, dy: number) {
	renderer.captureScreenshot(`/tmp/check-color-fade-${process.pid}.png`);
	const box = k.bounds(testId);
	return readPng(`/tmp/check-color-fade-${process.pid}.png`).at(
		Math.round(box.x + dx),
		Math.round(box.y + dy),
	)[0];
}

/** The brightest red in the box: an SVG glyph is too thin to sample at one point. */
function peakRed(testId: string) {
	renderer.captureScreenshot(`/tmp/check-color-fade-${process.pid}.png`);
	const box = k.bounds(testId);
	const pixels = readPng(`/tmp/check-color-fade-${process.pid}.png`);
	let peak = 0;
	for (let y = Math.round(box.y); y < Math.round(box.y + box.height); y++)
		for (let x = Math.round(box.x); x < Math.round(box.x + box.width); x++)
			peak = Math.max(peak, pixels.at(x, y)[0]);
	return peak;
}

const svgIds = ['icon', 'stroke', 'fill'];

const probes = [
	{ id: 'signal', dx: 20, dy: 20 },
	{ id: 'hover', dx: 20, dy: 20 },
	{ id: 'border', dx: 5, dy: 20 },
	{ id: 'shadow', dx: -10, dy: 20 },
];

renderer.clockPause();
const before = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
const svgBefore = svgIds.map(peakRed);
setOn(true);
const hoverPoint = k.center('hover');
renderer.nativeSimulateMouseMove(hoverPoint.x - 1, hoverPoint.y);
renderer.nativeSimulateMouseMove(hoverPoint.x, hoverPoint.y);
step(0);
// A capture draws the frame that starts an SVG paint's transition, so one is taken before the clock moves on.
svgIds.map(peakRed);
step(16);
const middle = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
const svgMiddle = svgIds.map(peakRed);
const plainMiddle = red('plain', 20, 20);
step(300);
const after = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
const svgAfter = svgIds.map(peakRed);
renderer.clockResume();

for (const [index, probe] of probes.entries()) {
	k.check(
		`${probe.id}: 16 ms in, between the old and the new colour`,
		middle[index] > before[index] + 2 && middle[index] < after[index] - 2,
		`before ${before[index]}, 16 ms ${middle[index]}, end ${after[index]}`,
	);
}
for (const [index, id] of svgIds.entries()) {
	k.check(
		`${id}: 16 ms in, between the dim and the bright red`,
		svgMiddle[index] > svgBefore[index] + 2 &&
			svgMiddle[index] < svgAfter[index] - 2,
		`before ${svgBefore[index]}, 16 ms ${svgMiddle[index]}, end ${svgAfter[index]}`,
	);
}
k.check(
	'unfaded element: switches on the first frame',
	plainMiddle > 240,
	`${plainMiddle}`,
);

await k.finish();
