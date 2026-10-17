/**
 * A theme change cross-fades: `changeTheme` mounts a `* { transition }` layer, the palette flips a frame later, and
 * the layer goes 200 ms after. Samples a surface and a border mid-fade, the end colour, an element with its own
 * (shorter) transition, and that the layer is gone afterwards.
 *
 *   bun scripts/check-theme-fade.tsx
 *
 * The motion clock is held and stepped by hand; only the JS timers that bracket the fade run on the wall clock.
 */
import { createSignal } from 'solid-js';
import { color, colorFade, themeChoice } from '#/lib/theme';
import { changeTheme, ThemeFade } from '#/lib/theme-fade';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const [nudged, setNudged] = createSignal(false);

const k = await createCheck(
	() => (
		<div
			style={{ display: 'flex', flexDirection: 'row', gap: 20, padding: 20 }}
		>
			<ThemeFade />
			<div
				testId="surface"
				style={{ width: 40, height: 40, backgroundColor: color.background }}
			/>
			<div
				testId="border"
				style={{
					width: 40,
					height: 40,
					borderWidth: 10,
					borderStyle: 'solid',
					borderColor: color.background,
				}}
			/>
			<div
				testId="own"
				style={{
					width: 40,
					height: 40,
					backgroundColor: color.background,
					...colorFade,
				}}
			/>
			<div
				testId="plain"
				style={{
					width: 40,
					height: 40,
					backgroundColor: nudged() ? '#ffffff' : '#000000',
				}}
			/>
		</div>
	),
	{ width: 400, height: 100, initialSettleMs: 300 },
);
const renderer = k.renderer;

function red(testId: string, dx: number, dy: number) {
	renderer.captureScreenshot(`/tmp/check-theme-fade-${process.pid}.png`);
	const box = k.bounds(testId);
	return readPng(`/tmp/check-theme-fade-${process.pid}.png`).at(
		Math.round(box.x + dx),
		Math.round(box.y + dy),
	)[0];
}

const probes = [
	{ id: 'surface', dx: 20, dy: 20 },
	{ id: 'border', dx: 5, dy: 20 },
	{ id: 'own', dx: 20, dy: 20 },
];

const before = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
renderer.clockPause();
changeTheme('light');
// The palette waits a frame behind the layer; until it flips nothing has moved.
k.step(0);
const beforeFlip = red('surface', 20, 20);
await k.until(() => themeChoice() === 'light', 'the palette to flip');
k.step(0);
k.step(16);
const early = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
k.step(70);
const middle = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
k.step(400);
const after = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
renderer.clockResume();

k.check(
	'the palette does not move before its flip',
	beforeFlip === before[0],
	`${before[0]} -> ${beforeFlip}`,
);
for (const [index, probe] of probes.entries()) {
	k.check(
		`${probe.id}: ends on the light colour`,
		after[index] > before[index] + 100,
		`before ${before[index]}, end ${after[index]}`,
	);
}
for (const index of [0, 1]) {
	k.check(
		`${probes[index].id}: 86 ms in, between dark and light`,
		middle[index] > early[index] + 2 && middle[index] < after[index] - 2,
		`16 ms ${early[index]}, 86 ms ${middle[index]}, end ${after[index]}`,
	);
}
k.check(
	'own: its 80 ms transition wins over the layer',
	middle[2] > middle[0] + 2,
	`own ${middle[2]}, layer ${middle[0]}`,
);

// The layer is dropped 200 ms after the flip, so a plain element cuts again.
await k.settle(500);
renderer.clockPause();
setNudged(true);
// A frame is only drawn when captured, so the change needs one capture before the sample.
k.step(0);
k.step(16);
red('plain', 20, 20);
k.step(16);
const plainAfter = red('plain', 20, 20);
renderer.clockResume();
k.check(
	'layer removed: a plain element switches within two frames',
	plainAfter > 240,
	`${plainAfter}`,
);

await k.finish();
