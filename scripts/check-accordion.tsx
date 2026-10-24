/**
 * Accordion paint order, measured on captured pixels (light theme).
 *
 *   bun scripts/check-accordion.tsx
 *
 * The source paints the open tint, then the hover fill, then the rows, with the
 * focus ring above everything. Over the open row's tint:
 *  - the ring's bottom edge must keep the full ring colour,
 *  - the hover fill must darken the tint by exactly its own 4% black, which
 *    it does only when the fill is painted after the tint.
 *
 * Then a toggle moves the focused row: the ring keeps its spring.fast glide
 * (no snap window) and settles on the row.
 *
 * Last, a closed panel (closed at mount, and closed again once its exit is over)
 * is `display: none`: no region and no text in the accessibility tree, and Tab
 * from its trigger lands on the next trigger. An open one is in the tree.
 */
import { mkdirSync } from 'node:fs';
import { setThemeChoice } from '#/lib/theme';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const outDir = `/tmp/check-accordion-${process.pid}/`;
mkdirSync(outDir, { recursive: true });
const kit = await createCheck('accordion');
const renderer = kit.renderer;
const settle = kit.settle;
const bounds = kit.bounds;
setThemeChoice('light');
await settle(300);

await kit.scrollIntoView('single-1');
await settle(300);
const row = bounds('single-1');
// Right of the label, left of the chevron: bare row surface.
const sample = {
	x: Math.round(row.x + row.width - 60),
	y: Math.round(row.y + row.height / 2),
};

renderer.nativeSimulateMouseMove(1180, 700);
await settle(500);
renderer.captureScreenshot(`${outDir}rest.png`);
const rest = readPng(`${outDir}rest.png`).at(sample.x, sample.y);

renderer.nativeSimulateMouseMove(sample.x, sample.y);
await settle(600);
renderer.captureScreenshot(`${outDir}hover.png`);
const hovered = readPng(`${outDir}hover.png`).at(sample.x, sample.y);
for (let channel = 0; channel < 3; channel++) {
	const expected = (rest[channel] as number) * 0.96;
	const got = hovered[channel] as number;
	kit.check(
		`hover fill over the open tint, channel ${channel}`,
		Math.abs(got - expected) <= 0.8,
		`tint ${rest[channel]} -> ${got}, fill-after-tint gives ${expected.toFixed(1)}`,
	);
}

renderer.nativeSimulateMouseMove(1180, 700);
await settle(500);
const element = renderer.findByTestId('single-1');
if (element === undefined) throw new Error('no single-1');
for (let presses = 0; presses < 60; presses++) {
	if (renderer.getFocusedElementId() === element.id) break;
	renderer.simulateKeystrokes('Tab');
	await settle(60);
}
if (renderer.getFocusedElementId() !== element.id)
	throw new Error('Tab never reached single-1');
await settle(500);
// Tabbing scrolled the page to the focused row: measure it where it is now.
await kit.scrollIntoView('single-1');
await settle(300);
const focusedRow = bounds('single-1');
renderer.captureScreenshot(`${outDir}ring.png`);
const ring = readPng(`${outDir}ring.png`);
const column = Math.round(focusedRow.x + focusedRow.width / 2);
let best = Infinity;
let bestAt = 0;
for (
	let y = Math.round(focusedRow.y + focusedRow.height) - 1;
	y <= Math.round(focusedRow.y + focusedRow.height) + 4;
	y++
) {
	const pixel = ring.at(column, y);
	const distance =
		Math.abs(pixel[0] - 0x6b) +
		Math.abs(pixel[1] - 0x97) +
		Math.abs(pixel[2] - 0xff);
	if (distance < best) {
		best = distance;
		bestAt = y;
	}
}
kit.check(
	'ring bottom edge over the open tint',
	best <= 6,
	`closest to #6B97FF is ${best} off at y=${bestAt}: ${ring.at(column, bestAt)}`,
);

// A panel changing height moves the rows under the ring every frame; the source
// keeps the ring's spring.fast glide instead of snapping, so it trails the row.
await kit.press('ArrowDown');
const rowStart = bounds('single-2').y;
// The motion clock is stepped by hand: sampling against wall time lets a slow
// frame carry both springs to rest before the first sample.
const FRAME_MS = 16;
renderer.clockPause();
renderer.simulateKeystrokes('Enter');
let maxLag = 0;
let rowTravel = 0;
for (let frame = 0; frame < 40; frame++) {
	renderer.clockFastForward(FRAME_MS);
	renderer.flush();
	renderer.dispatchNativeEvents();
	// A real window delivers the observers in a task of their own, so the hover's queued writes land before the next frame.
	await Promise.resolve();
	const rowNow = bounds('single-2');
	const ringNow = bounds('single-focus-ring');
	// Frame 0 only shows how late the first re-measure lands; a snapping ring is on the row from frame 1.
	if (frame > 0) maxLag = Math.max(maxLag, Math.abs(ringNow.y + 2 - rowNow.y));
	rowTravel = Math.max(rowTravel, Math.abs(rowNow.y - rowStart));
}
for (let step = 0; step < 4; step++) {
	renderer.clockFastForward(100);
	renderer.flush();
	renderer.dispatchNativeEvents();
	await Promise.resolve();
}
kit.check(
	'row moved under the ring',
	rowTravel > 20,
	`row travelled ${rowTravel.toFixed(1)}px`,
);
kit.check(
	'ring trails the moving row instead of snapping',
	maxLag > 0.5,
	`max lag ${maxLag.toFixed(2)}px`,
);
const settledRow = bounds('single-2');
const settledRing = bounds('single-focus-ring');
renderer.clockResume();
kit.check(
	'ring settles on the row',
	Math.abs(settledRing.y + 2 - settledRow.y) < 0.5,
	`off by ${(settledRing.y + 2 - settledRow.y).toFixed(2)}px`,
);

const nodes = () => Object.values(renderer.getA11yTree().nodes ?? {});
const regionCount = () =>
	nodes().filter((node) => node.aria?.role === 'Region').length;
const hasText = (text: string) =>
	nodes().some((node) => node.aria?.value === text);
const triggerControls = (testId: string) => {
	const id = kit.element(testId).customProps?.id;
	const trigger = nodes().find((node) => node.aria?.author_id === id);
	return trigger?.aria?.controls;
};
const tabLandsOn = async (from: string, to: string) => {
	await kit.focus(from);
	await kit.press('Tab');
	return renderer.getFocusedElementId() === kit.element(to).id;
};

await kit.scrollIntoView('kb-1');
await settle(500);
const regionsClosed = regionCount();
kit.check('closed at mount: no text in the tree', !hasText('Alpha body'));
kit.check(
	'closed at mount: Tab from the trigger lands on the next trigger',
	await tabLandsOn('kb-1', 'kb-2'),
);

await kit.click('kb-1');
await settle(500);
const controls = triggerControls('kb-1');
kit.check('open: the text is in the tree', hasText('Alpha body'));
kit.check(
	'open: the panel is one more region than the closed page had',
	regionCount() === regionsClosed + 1,
	`${regionsClosed} closed, ${regionCount()} open`,
);
kit.check(
	'open: the trigger controls the panel',
	controls?.length === 1,
	`controls ${JSON.stringify(controls)}`,
);

await kit.click('kb-1');
await settle(500);
kit.check('closed after a cycle: no text in the tree', !hasText('Alpha body'));
kit.check(
	'closed after a cycle: no region',
	regionCount() === regionsClosed,
	`${regionsClosed} at mount, ${regionCount()} now`,
);
kit.check(
	'closed after a cycle: Tab from the trigger lands on the next trigger',
	await tabLandsOn('kb-1', 'kb-2'),
);

kit.finish();
