/**
 * The home grid's columns follow the window's width (768px -> 2, 1280px -> 3), and the cards glide when it crosses one.
 *
 *   bun scripts/check-home-grid.tsx
 *
 * - The columns are read at several window widths, each a window of its own.
 * - The glide is read by resizing one window with `setWindowSize` while the motion clock is held: a card's transformed
 *   box is its old slot at the resize and between the two slots in the frames after, its size scaled, while the preview
 *   and the name (`layout="position"`) keep their size and slide.
 */
import { createCheck } from './check-kit';

const GAP = 12;
const WIDTHS = [
	{ window: 700, columns: 1 },
	{ window: 767, columns: 1 },
	{ window: 768, columns: 2 },
	{ window: 1240, columns: 2 },
	{ window: 1279, columns: 2 },
	{ window: 1280, columns: 3 },
	{ window: 1600, columns: 3 },
] as const;

let failures = 0;
for (const width of WIDTHS) {
	const kit = await createCheck('showcase', {
		width: width.window,
		height: 780,
	});
	const label = `${width.window}px`;
	kit.expect(
		`${label}: the viewport box is the window wide`,
		kit.bounds('viewport').width,
		width.window,
	);
	const grid = kit.bounds('bento-grid');
	const small = kit.bounds('card-thinking-indicator');
	kit.expect(
		`${label}: columns`,
		Math.round((grid.width + GAP) / (small.width + GAP)),
		width.columns,
	);
	const wide = kit.bounds('card-input-message');
	kit.expect(
		`${label}: a medium card spans ${Math.min(2, width.columns)} column(s)`,
		Math.round((wide.width + GAP) / (small.width + GAP)),
		Math.min(2, width.columns),
	);
	const side = kit.bounds('card-command-menu');
	kit.expect(
		`${label}: a side: right card starts in column ${width.columns === 3 ? 2 : 1}`,
		Math.round((side.x - grid.x) / (small.width + GAP)),
		width.columns === 3 ? 1 : 0,
	);
	failures += kit.unmount();
}

type Box = { x: number; y: number; width: number; height: number };
const ROUND = (box: Box) =>
	JSON.stringify([box.x, box.y, box.width, box.height].map(Math.round));
/** Strictly between `one` and `other`, or unmoved when they are the same. */
const along = (value: number, one: number, other: number) =>
	Math.abs(one - other) < 1
		? Math.abs(value - one) < 1
		: value > Math.min(one, other) && value < Math.max(one, other);

/**
 * Resizes the window from `from` to `to` px wide and samples the small card, its preview and its name every 16 ms.
 * The frame of the resize still lays the old column count out at the new width, and that is the box the glide starts
 * from, as it is the one that was shown.
 */
async function crossing(from: number, to: number) {
	const kit = await createCheck('showcase', { width: from, height: 780 });
	const label = `${from} -> ${to}px`;
	const ids = {
		card: 'card-thinking-indicator',
		preview: 'card-thinking-indicator-preview',
		name: 'card-thinking-indicator-name',
	};
	const read = () => ({
		card: kit.bounds(ids.card),
		preview: kit.bounds(ids.preview),
		name: kit.bounds(ids.name),
	});
	kit.renderer.clockPause();
	kit.renderer.setWindowSize(to, 780);
	kit.step(0);
	const start = read();
	const frames: ReturnType<typeof read>[] = [];
	for (let elapsed = 16; elapsed <= 480; elapsed += 16) {
		kit.step(16);
		frames.push(read());
	}
	kit.renderer.clockResume();
	await kit.settle(300);
	const after = read();

	const mid = frames[1];
	kit.check(
		`${label}: the card moves to a slot of another size`,
		Math.abs(start.card.width - after.card.width) > 20 ||
			Math.abs(start.card.height - after.card.height) > 20,
		`${ROUND(start.card)} then ${ROUND(after.card)}`,
	);
	kit.check(
		`${label}: 32 ms in, the card's box is between the two slots in size and position`,
		along(mid.card.width, start.card.width, after.card.width) &&
			along(mid.card.height, start.card.height, after.card.height) &&
			along(mid.card.x, start.card.x, after.card.x) &&
			along(mid.card.y, start.card.y, after.card.y),
		`${ROUND(start.card)} -> ${ROUND(mid.card)} -> ${ROUND(after.card)}`,
	);
	kit.check(
		`${label}: the preview is not stretched with the card, it keeps its final size while it slides`,
		Math.abs(mid.preview.width - after.preview.width) < 1 &&
			Math.abs(mid.preview.height - after.preview.height) < 1 &&
			along(mid.preview.y, start.preview.y, after.preview.y),
		`${ROUND(start.preview)} -> ${ROUND(mid.preview)} -> ${ROUND(after.preview)}`,
	);
	kit.check(
		`${label}: the name keeps its size and slides with the card`,
		Math.abs(mid.name.width - after.name.width) < 1 &&
			along(mid.name.y, start.name.y, after.name.y),
		`${ROUND(start.name)} -> ${ROUND(mid.name)} -> ${ROUND(after.name)}`,
	);
	const last = frames[frames.length - 1];
	kit.check(
		`${label}: the glide ends in the new slot`,
		Math.abs(last.card.width - after.card.width) < 0.5 &&
			Math.abs(last.card.height - after.card.height) < 0.5 &&
			Math.abs(last.card.x - after.card.x) < 0.5 &&
			Math.abs(last.card.y - after.card.y) < 0.5,
		`${ROUND(last.card)} against ${ROUND(after.card)}`,
	);
	return kit.unmount();
}

// Both breakpoints, and back: a wider window, and a narrower one.
failures += await crossing(1000, 1400);
failures += await crossing(1400, 1000);
failures += await crossing(700, 1000);
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
