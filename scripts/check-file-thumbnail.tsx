/**
 * The file-thumbnail spinner's arc turns once a second, linear, clockwise from 12 o'clock.
 *
 *   bun scripts/check-file-thumbnail.tsx
 *
 * The motion clock is held and stepped by hand, and the arc's angle is read from
 * captured pixels: the centroid of the pixels brighter than the ring.
 */
import { Spinner } from '#/components/file-thumbnail';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const SHOT = `/tmp/check-file-thumbnail-${process.pid}.png`;

const k = await createCheck(
	() => (
		<div style={{ padding: 40 }}>
			<div testId="spinner" style={{ width: 24, height: 24 }}>
				<Spinner />
			</div>
		</div>
	),
	{ width: 200, height: 200, initialSettleMs: 400 },
);
const renderer = k.renderer;
const box = k.bounds('spinner');

/** Clockwise degrees from 12 o'clock of the brightest ink in the spinner's box. */
function arcAngle() {
	renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const left = Math.round(box.x);
	const top = Math.round(box.y);
	const brightness = (x: number, y: number) => {
		const pixel = pixels.at(x, y);
		return pixel[0] + pixel[1] + pixel[2];
	};
	let peak = 0;
	for (let y = top; y < top + 24; y++)
		for (let x = left; x < left + 24; x++)
			peak = Math.max(peak, brightness(x, y));
	let sumX = 0;
	let sumY = 0;
	for (let y = top; y < top + 24; y++)
		for (let x = left; x < left + 24; x++) {
			if (brightness(x, y) < peak * 0.85) continue;
			sumX += x + 0.5 - (left + 12);
			sumY += y + 0.5 - (top + 12);
		}
	return ((Math.atan2(sumX, -sumY) * 180) / Math.PI + 360) % 360;
}

// The 400 ms settle already turned the arc part of the way, so the angle is read relative to the first sample.
renderer.clockPause();
const angles: number[] = [];
for (const at of [0, 250, 250, 250, 250]) {
	k.step(at);
	angles.push(arcAngle());
}
console.log(
	`angles at +0 / 250 / 500 / 750 / 1000 ms: ${angles.map((angle) => angle.toFixed(1)).join(' ')}`,
);
const turned = (index: number) => (angles[index] - angles[0] + 360) % 360;
const near = (angle: number, expected: number) =>
	Math.abs(((angle - expected + 540) % 360) - 180) < 12;
k.check('a quarter turn clockwise after 250 ms', near(turned(1), 90));
k.check('half a turn at 500 ms', near(turned(2), 180));
k.check('three quarters at 750 ms', near(turned(3), 270));
k.check('one turn at 1000 ms', near(turned(4), 0));
renderer.clockResume();
k.finish();
