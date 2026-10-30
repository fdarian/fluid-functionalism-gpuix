/**
 * The skill page's "What it does" timeline: one 6px dot and two 100px highlight lines, all moved by transforms (the dot by `y` and
 * `scale`, the lines by `y` and `scaleY` from their top). The pointer entering a step makes the dot appear on it at once; moving
 * to another step glides it on the fast spring; leaving shrinks it to nothing where it stands.
 *
 *   bun scripts/check-skill-timeline.tsx
 */
import { Timeline } from '#/pages/skill/timeline';
import { createCheck } from './check-kit';

const STEPS = [
	{
		title: 'First',
		body: 'The first step of the three, with a line of body text.',
	},
	{
		title: 'Second',
		body: 'The second step of the three, with a line of body text.',
	},
	{
		title: 'Third',
		body: 'The third step of the three, with a line of body text.',
	},
];
const TITLE_CENTER = 13;
const DOT = 6;

const kit = await createCheck(() => (
	<div style={{ padding: 40, width: 500 }}>
		<Timeline steps={STEPS} />
	</div>
));
const renderer = kit.renderer;
await kit.settle(300);
renderer.clockPause();

const centreOf = (step: number) =>
	kit.bounds(`timeline-step-${step}`).y + TITLE_CENTER;
const dotCentre = () => {
	const box = kit.bounds('timeline-dot');
	return {
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
		size: box.width,
	};
};
const near = (actual: number, expected: number, tolerance = 0.6) =>
	Math.abs(actual - expected) < tolerance;

kit.check(
	'the dot is nothing while nothing is hovered',
	dotCentre().size < 0.01,
);

const overStep = (step: number) => {
	const box = kit.bounds(`timeline-step-${step}`);
	renderer.nativeSimulateMouseMove(box.x + 80, box.y + 6);
};
overStep(0);
kit.step(16);
kit.check(
	'entering a step puts the dot on it at once',
	near(dotCentre().y, centreOf(0)),
	`${dotCentre().y.toFixed(1)} vs ${centreOf(0).toFixed(1)}`,
);
kit.step(600);
kit.check(
	'the dot grows to 6px',
	near(dotCentre().size, DOT, 0.1),
	`${dotCentre().size}`,
);

overStep(2);
kit.step(16);
const gliding = dotCentre().y;
kit.check(
	'moving to another step glides the dot',
	gliding > centreOf(0) + 1 && gliding < centreOf(2) - 1,
	`${gliding.toFixed(1)} between ${centreOf(0).toFixed(1)} and ${centreOf(2).toFixed(1)}`,
);
kit.step(600);
kit.check(
	'the dot comes to rest on the step',
	near(dotCentre().y, centreOf(2)),
	`${dotCentre().y.toFixed(1)} vs ${centreOf(2).toFixed(1)}`,
);
const above = kit.bounds('timeline-above');
const dot = kit.bounds('timeline-dot');
kit.check(
	'the line above runs from the step before to the dot',
	near(above.y, centreOf(1)) && near(above.y + above.height, dot.y),
	`${above.y.toFixed(1)} to ${(above.y + above.height).toFixed(1)}, dot at ${dot.y.toFixed(1)}`,
);
const below = kit.bounds('timeline-below');
const lastStep = kit.bounds('timeline-step-2');
kit.check(
	'the line below runs from the dot to the end of the last description',
	near(below.y, dot.y + dot.height) &&
		near(below.y + below.height, lastStep.y + lastStep.height, 1),
	`${below.y.toFixed(1)} to ${(below.y + below.height).toFixed(1)}`,
);

renderer.nativeSimulateMouseMove(2, 2);
kit.step(600);
kit.check(
	'leaving shrinks the dot where it stands',
	dotCentre().size < 0.01 && near(dotCentre().y, centreOf(2)),
	`${dotCentre().size} at ${dotCentre().y.toFixed(1)}`,
);
overStep(0);
kit.step(16);
kit.check(
	'entering again puts the dot on the new step at once',
	near(dotCentre().y, centreOf(0)),
	`${dotCentre().y.toFixed(1)} vs ${centreOf(0).toFixed(1)}`,
);
renderer.clockResume();
kit.finish();
