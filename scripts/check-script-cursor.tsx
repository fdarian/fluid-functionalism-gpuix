/**
 * The skill examples' scripted cursor glides natively: a glide is a 500 ms
 * easeInOut animation of the cursor's position, so it is at its start, halfway
 * at half the time and on its target at the end, and it holds still between
 * glides. The first glide drifts in from 24px below and right of its target.
 *
 *   bun scripts/check-script-cursor.tsx
 */
import { TabsExample } from '#/pages/skill/tabs-example';
import { createCheck } from './check-kit';

const GLIDE_MS = 500;
const DRIFT_IN = 24;
/** The arrow's tip sits 3px in from its corner. */
const TIP = 3;

const kit = await createCheck(() => (
	<div style={{ padding: 40, width: 700 }}>
		<TabsExample />
	</div>
));
const renderer = kit.renderer;
renderer.clockPause();

const tip = () => {
	const box = kit.bounds('script-cursor');
	return { x: box.x + TIP, y: box.y + TIP };
};
const target = () => kit.center('tabs-generic-tab-1');
const near = (
	actual: { x: number; y: number },
	expected: { x: number; y: number },
) => Math.hypot(actual.x - expected.x, actual.y - expected.y) < 1.5;
const show = (point: { x: number; y: number }) =>
	`${point.x.toFixed(1)}, ${point.y.toFixed(1)}`;

await kit.until(() => kit.exists('script-cursor'), 'the cursor to appear');
renderer.flush();
const goal = target();
const start = { x: goal.x + DRIFT_IN, y: goal.y + DRIFT_IN };
kit.check(
	'the cursor drifts in from below and right of its first target',
	near(tip(), start),
	`${show(tip())} vs ${show(start)}`,
);

kit.step(GLIDE_MS / 2);
const half = { x: (start.x + goal.x) / 2, y: (start.y + goal.y) / 2 };
kit.check(
	'halfway through the glide an ease-in-out is halfway there',
	near(tip(), half),
	`${show(tip())} vs ${show(half)}`,
);

kit.step(GLIDE_MS / 2 + 16);
kit.check(
	'at the end of the glide it is on the target',
	near(tip(), goal),
	`${show(tip())} vs ${show(goal)}`,
);

kit.step(0);
await kit.settle(0);
const fill = renderer.findByTestId('tabs-generic-tab-1')?.style.backgroundColor;
kit.check(
	'it hovers what it lands on like a real pointer',
	fill !== undefined && fill !== 'rgba(0,0,0,0)',
	`${fill}`,
);

kit.step(100);
kit.check('between glides it holds still', near(tip(), goal), show(tip()));
renderer.clockResume();

kit.finish();
