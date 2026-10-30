/**
 * RadioGroup dot on the radio-group page.
 *
 *   bun scripts/check-radio-group.tsx
 *
 * The dot is the source's 16 px box scaled about its centre (`registry/base/radio-group.tsx:415-429`), read through the transformed bounds:
 * - a row selected at mount shows the dot at full size, with nothing playing,
 * - a newly selected row's dot grows from scale 0.3 on `spring.fast`, about the circle's centre,
 * - the dot it replaces shrinks out over 0.04 s, then is removed.
 */
import { createCheck } from './check-kit';

const kit = await createCheck('radio-group');

type Box = { x: number; y: number; width: number; height: number };
const centreOf = (box: Box) => ({
	x: box.x + box.width / 2,
	y: box.y + box.height / 2,
});

const mounted = kit.bounds('radio-0-dot');
kit.check(
	'a row selected at mount shows the dot at full size',
	mounted.width === 16 && mounted.height === 16,
	`${mounted.width} x ${mounted.height}`,
);
kit.check('an unselected row has no dot', !kit.exists('radio-2-dot'));

kit.renderer.clockPause();
const point = kit.center('radio-2');
kit.renderer.nativeSimulateClick(point.x, point.y);
kit.step(0);
const start = kit.bounds('radio-2-dot');
kit.step(16);
const growing = kit.bounds('radio-2-dot');
const leaving = kit.exists('radio-0-dot')
	? kit.bounds('radio-0-dot')
	: undefined;
kit.step(16);
const leavingLater = kit.exists('radio-0-dot')
	? kit.bounds('radio-0-dot')
	: undefined;
kit.step(16);
const shrunk = kit.exists('radio-0-dot')
	? kit.bounds('radio-0-dot')
	: undefined;
kit.step(96);
const goneAt160 = !kit.exists('radio-0-dot');
kit.step(400);
const arrived = kit.bounds('radio-2-dot');
const gone = !kit.exists('radio-0-dot');
kit.renderer.clockResume();

kit.check(
	'the new dot starts at scale 0.3',
	Math.abs(start.width - 16 * 0.3) < 0.8,
	`${start.width.toFixed(2)} (want about 4.8)`,
);
kit.check(
	'the new dot is part-way after 16 ms and full once settled',
	growing.width > start.width + 1 &&
		growing.width < 16 &&
		Math.abs(arrived.width - 16) < 0.05,
	`start ${start.width.toFixed(2)}, 16 ms ${growing.width.toFixed(2)}, end ${arrived.width.toFixed(2)}`,
);
const endCentre = centreOf(arrived);
const startCentre = centreOf(start);
const growingCentre = centreOf(growing);
kit.check(
	'the dot grows about the circle centre',
	Math.abs(startCentre.x - endCentre.x) < 0.05 &&
		Math.abs(startCentre.y - endCentre.y) < 0.05 &&
		Math.abs(growingCentre.x - endCentre.x) < 0.05 &&
		Math.abs(growingCentre.y - endCentre.y) < 0.05,
	`start ${startCentre.x.toFixed(2)},${startCentre.y.toFixed(2)}, 16 ms ${growingCentre.x.toFixed(2)},${growingCentre.y.toFixed(2)}, end ${endCentre.x.toFixed(2)},${endCentre.y.toFixed(2)}`,
);
kit.check(
	'the old dot shrinks toward 0.3 and is removed as its own 0.04 s exit ends',
	leaving !== undefined &&
		leaving.width < 16 &&
		leaving.width > 16 * 0.3 &&
		leavingLater !== undefined &&
		leavingLater.width < leaving.width &&
		shrunk === undefined &&
		goneAt160 &&
		gone,
	`16 ms ${leaving?.width.toFixed(2)}, 32 ms ${leavingLater?.width.toFixed(2)}, 48 ms ${shrunk === undefined ? 'gone' : shrunk.width.toFixed(2)}, gone at 160 ms ${goneAt160}`,
);

await kit.finish();
