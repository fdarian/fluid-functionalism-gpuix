/**
 * The home grid's columns follow the window's width through the `viewport` container (768px -> 2, 1280px -> 3):
 * mounts the showcase at several window widths, since the test renderer cannot resize a window.
 *
 *   bun scripts/check-home-grid.tsx
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
		`${label}: the viewport container is the window wide`,
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
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
