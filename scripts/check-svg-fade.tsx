/**
 * SVG colours ease through a CSS transition: an `Icon` that fades its `color`, a shape whose own `stroke` changes and
 * one whose `fill` does. Each goes from a dim red to a bright one; the peak red in the box is sampled mid-fade.
 *
 *   bun scripts/check-svg-fade.tsx
 *
 * `current-color` and `icon` run on `color` alone: an icon that strokes with `currentColor` follows the svg's `color`
 * transition without `stroke` in the list. `stroke` and `fill` are the shapes' own paints.
 * The motion clock is held and stepped by hand, so a slow frame cannot skip the middle of the 80 ms.
 */
import { createSignal } from 'solid-js';
import { Icon } from '#/lib/icon';
import { fade } from '#/lib/theme';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const DIM = '#400000';
const BRIGHT = '#ff0000';
const [on, setOn] = createSignal(false);
const tint = () => (on() ? BRIGHT : DIM);

const shape = (tag: string) => ({
	width: 64,
	height: 64,
	backgroundColor: '#000000',
	tag,
});

const k = await createCheck(
	() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				gap: 20,
				padding: 20,
				backgroundColor: '#000000',
			}}
		>
			<div testId="icon" style={shape('icon')}>
				<Icon
					name="chevron-down"
					size={64}
					strokeWidth={6}
					color={tint()}
					fade
				/>
			</div>
			<div testId="icon-plain" style={shape('icon-plain')}>
				<Icon name="chevron-down" size={64} strokeWidth={6} color={tint()} />
			</div>
			<div testId="current-color" style={shape('current-color')}>
				<svg
					viewBox="0 0 24 24"
					style={{
						width: 64,
						height: 64,
						color: tint(),
						...fade(['color'], 80),
					}}
				>
					<path
						d="M6 9l6 6 6-6"
						fill="none"
						stroke="currentColor"
						strokeWidth={4}
					/>
				</svg>
			</div>
			<div testId="stroke" style={shape('stroke')}>
				<svg viewBox="0 0 24 24" style={{ width: 64, height: 64 }}>
					<path
						d="M6 9l6 6 6-6"
						fill="none"
						stroke={tint()}
						strokeWidth={4}
						style={fade(['stroke'], 80)}
					/>
				</svg>
			</div>
			<div testId="fill" style={shape('fill')}>
				<svg viewBox="0 0 24 24" style={{ width: 64, height: 64 }}>
					<rect
						x="4"
						y="4"
						width="16"
						height="16"
						fill={tint()}
						style={fade(['fill'], 80)}
					/>
				</svg>
			</div>
			<div testId="stroke-plain" style={shape('stroke-plain')}>
				<svg viewBox="0 0 24 24" style={{ width: 64, height: 64 }}>
					<path d="M6 9l6 6 6-6" fill="none" stroke={tint()} strokeWidth={4} />
				</svg>
			</div>
		</div>
	),
	{ width: 560, height: 120, initialSettleMs: 300 },
);
const renderer = k.renderer;

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

function peakRed(testId: string) {
	renderer.captureScreenshot(`/tmp/check-svg-fade-${process.pid}.png`);
	const box = k.bounds(testId);
	const pixels = readPng(`/tmp/check-svg-fade-${process.pid}.png`);
	let peak = 0;
	for (let y = Math.round(box.y); y < Math.round(box.y + box.height); y++)
		for (let x = Math.round(box.x); x < Math.round(box.x + box.width); x++)
			peak = Math.max(peak, pixels.at(x, y)[0]);
	return peak;
}

const ids = [
	'icon',
	'icon-plain',
	'current-color',
	'stroke',
	'fill',
	'stroke-plain',
];

renderer.clockPause();
const before = ids.map(peakRed);
setOn(true);
step(0);
// A capture draws the frame that starts the transition, so one is taken before the clock moves on.
ids.map(peakRed);
step(32);
const middle = ids.map(peakRed);
step(300);
const after = ids.map(peakRed);
renderer.clockResume();

for (const [index, id] of ids.entries()) {
	const eased = id !== 'icon-plain' && id !== 'stroke-plain';
	const between =
		middle[index] > before[index] + 8 && middle[index] < after[index] - 8;
	k.check(
		eased
			? `${id}: 32 ms in, between the dim and the bright red`
			: `${id}: no transition, switches on the first frame`,
		eased ? between : middle[index] > after[index] - 8,
		`before ${before[index]}, 32 ms ${middle[index]}, end ${after[index]}`,
	);
}

await k.finish();
