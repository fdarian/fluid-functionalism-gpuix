/**
 * The changelog's Releases rail with its entries hidden while far from the
 * scroller (`createCulling`): a click on a month lands its top at the scroll
 * margin although the sections above it are hidden, the spy follows a wheel
 * scroll, and a trip down and back leaves every height as it was.
 *
 *   bun scripts/check-changelog-rail.tsx
 */
import { activeMonth } from '#/pages/changelog/release-spy';
import { createCheck } from './check-kit';

/** `SCROLL_MARGIN` in release-spy.ts. */
const SCROLL_MARGIN = 32;

const kit = await createCheck('changelog', { initialSettleMs: 1500 });

function pageScrollerTop() {
	let current = kit.element('changelog-2026-09');
	while (current.style.overflowY !== 'scroll' || current.style.flexGrow !== 1) {
		if (current.parentId === null) throw new Error('the page has no scroller');
		const parent = kit.renderer.getElement(current.parentId);
		if (parent === undefined) throw new Error('the tree lost an ancestor');
		current = parent;
	}
	const box = kit.renderer.getElementBounds(current.id);
	if (box === null) throw new Error('the page scroller has no bounds');
	return box.y;
}

/** Test ids repeat across months (a page links in each release that touches it), so any element with the id counts. */
const painted = (testId: string) =>
	kit.renderer
		.findByType('div')
		.some(
			(element) =>
				element.testId === testId &&
				kit.renderer.getBuiltElementBounds(element.id) !== null,
		);

const top = pageScrollerTop();
const septemberAtRest = kit.bounds('changelog-heading-2026-09').y;
kit.expect(
	'the newest month is the one in view at the top',
	activeMonth(),
	'2026-09',
);
kit.check(
	'a September entry is painted at the top',
	painted('changelog-link-fluid-hover'),
);

// The month in view grows its dot to 1.3 about its centre (`scale`, held on the title line's middle by `translate: 0 -50%`).
const dotOf = (month: string) => {
	const box = kit.bounds(`changelog-dot-${month}`);
	return {
		size: box.width,
		centreX: box.x + box.width / 2,
		centreY: box.y + box.height / 2,
	};
};
const grown = dotOf('2026-09');
const resting = dotOf('2026-08');
kit.check(
	'the month in view has its dot at 1.3 times the others',
	Math.abs(grown.size - 6.5) < 0.1 && Math.abs(resting.size - 5) < 0.1,
	`${grown.size} and ${resting.size}`,
);
const headingBox = kit.bounds('changelog-heading-2026-09');
kit.check(
	'the grown dot stays centred on its title line',
	Math.abs(grown.centreY - (headingBox.y + headingBox.height / 2)) < 1.5,
	`${grown.centreY} against ${headingBox.y + headingBox.height / 2}`,
);

await kit.click('release-row-2026-08');
await kit.settle(2500);
kit.expect('the clicked month is the one in view', activeMonth(), '2026-08');
const landed = kit.bounds('changelog-2026-08').y - top;
kit.check(
	'the clicked month lands at the scroll margin',
	Math.abs(landed - SCROLL_MARGIN) < 1.5,
	`${landed} vs ${SCROLL_MARGIN}`,
);
kit.check(
	'the month below the jump shows its first entry',
	painted('changelog-link-sizes'),
);
kit.check(
	'September, scrolled far above, is hidden',
	!painted('changelog-link-fluid-hover'),
);

await kit.click('release-row-2026-07');
await kit.settle(2500);
kit.expect(
	'the last month is the one in view at the end',
	activeMonth(),
	'2026-07',
);
kit.check(
	'the page end shows the last entry',
	painted('changelog-link-scrollbars'),
);

const atEnd = activeMonth();
if (atEnd === undefined) throw new Error('no month is in view at the end');
const months = [atEnd];
for (let tick = 0; tick < 40; tick++) {
	kit.renderer.nativeSimulateScrollWheel(600, 400, 0, -300);
	await kit.settle(150);
	const month = activeMonth();
	if (month !== undefined && months[months.length - 1] !== month)
		months.push(month);
}
kit.expect('the spy walks up through every month', months, [
	'2026-07',
	'2026-08',
	'2026-09',
]);

await kit.settle(1000);
kit.check(
	'a trip down and back leaves the top as it was',
	Math.abs(kit.bounds('changelog-heading-2026-09').y - septemberAtRest) < 0.5,
	`${kit.bounds('changelog-heading-2026-09').y} vs ${septemberAtRest}`,
);
kit.check(
	'September shows again once back at the top',
	painted('changelog-link-fluid-hover'),
);

await kit.finish();
