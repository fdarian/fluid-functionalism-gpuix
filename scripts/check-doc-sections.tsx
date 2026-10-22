/**
 * A doc page's sections hide their content while far from the page scroller
 * (`DocSection`, with the previews inside them nested): the page keeps its
 * height through a trip down and back, through a preview remounting (Code tab
 * and back), and through a change of Size, which the hidden sections pick up.
 *
 *   bun scripts/check-doc-sections.tsx
 */
import { setSizeChoice } from '#/lib/theme';
import { createCheck } from './check-kit';

const TOLERANCE = 0.5;

async function openSizes() {
	const kit = await createCheck('sizes', { initialSettleMs: 1500 });
	const column = kit.renderer
		.findByType('div')
		.find(
			(element) => element.style.paddingTop === 40 && element.style.gap === 24,
		);
	if (column === undefined) throw new Error('the page column was not found');
	return {
		kit,
		height() {
			const box = kit.renderer.getElementBounds(column.id);
			if (box === null) throw new Error('the page column has no bounds');
			return box.height;
		},
		async scrollBy(total: number) {
			const step = total > 0 ? 300 : -300;
			for (let moved = 0; Math.abs(moved) < Math.abs(total); moved += step) {
				kit.renderer.nativeSimulateScrollWheel(600, 400, 0, step);
				await kit.settle(150);
			}
			await kit.settle(500);
		},
		painted: (testId: string) =>
			kit.renderer.getBuiltElementBounds(kit.element(testId).id) !== null,
	};
}

const page = await openSizes();
const rest = page.height();
page.kit.check(
	'the token inspector, far below, is hidden at the top',
	!page.painted('inspect-button'),
);
await page.scrollBy(3000);
page.kit.check(
	'the token inspector is painted once scrolled to',
	page.painted('inspect-button'),
);
page.kit.check(
	'the toolbar demo, far above, is hidden',
	!page.painted('toolbar-preview-tab'),
);
await page.scrollBy(-6000);
page.kit.check(
	'a trip down and back keeps the page height',
	Math.abs(page.height() - rest) < TOLERANCE,
	`${page.height()} vs ${rest}`,
);

await page.kit.click('toolbar-code-tab');
await page.kit.click('toolbar-preview-tab');
await page.kit.settle(500);
await page.scrollBy(700);
await page.scrollBy(-700);
page.kit.check(
	'a preview that remounts (Code tab and back) keeps the page height',
	Math.abs(page.height() - rest) < TOLERANCE,
	`${page.height()} vs ${rest}`,
);

setSizeChoice('compact');
await page.kit.settle(1500);
const switched = page.height();
await page.scrollBy(3000);
await page.scrollBy(-6000);
page.kit.check(
	'a Size change reaches the hidden sections',
	Math.abs(page.height() - switched) < TOLERANCE,
	`${page.height()} vs ${switched}`,
);
page.kit.unmount();

const fresh = await openSizes();
fresh.kit.check(
	'the switched page is as tall as one opened at that Size',
	Math.abs(fresh.height() - switched) < TOLERANCE,
	`${fresh.height()} vs ${switched}`,
);
setSizeChoice('default');
await fresh.kit.finish();
