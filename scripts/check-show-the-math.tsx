/**
 * The "Show the math" list's distance label sits on the source's `-translate-x-[calc(100%+8px)] -translate-y-1/2`.
 *
 *   bun scripts/check-show-the-math.tsx
 *
 * The label hangs off a zero-width rail 20px inside the list's right edge: its right end is 8px left of
 * the rail whatever the label's width, and its middle is halfway between the pointer and the winning row's centre.
 */
import { createCheck } from './check-kit';

const RAIL_FROM_ROW_RIGHT = 12;
const kit = await createCheck('fluid-hover');
await kit.scrollIntoView('math-row-1');
await kit.settle(500);

for (const [row, below] of [
	[1, 6],
	[2, -9],
] as const) {
	const rowBox = kit.bounds(`math-row-${row}`);
	const centre = rowBox.y + rowBox.height / 2;
	const pointer = { x: rowBox.x + rowBox.width / 2, y: centre + below };
	kit.renderer.nativeSimulateMouseMove(pointer.x - 1, pointer.y);
	kit.renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
	await kit.settle(600);
	const label = kit.bounds('math-distance');
	const rail = rowBox.x + rowBox.width - RAIL_FROM_ROW_RIGHT;
	kit.check(
		`row ${row}: the label's right end is 8px left of the rail`,
		Math.abs(label.x + label.width - (rail - 8)) < 0.6,
		`right end ${(label.x + label.width).toFixed(2)}, rail ${rail.toFixed(2)}`,
	);
	const middle = label.y + label.height / 2;
	const expected = (pointer.y + centre) / 2;
	kit.check(
		`row ${row}: the label is centred between the pointer and the row's centre`,
		Math.abs(middle - expected) < 1,
		`middle ${middle.toFixed(2)}, expected ${expected.toFixed(2)}`,
	);
}

kit.finish();
