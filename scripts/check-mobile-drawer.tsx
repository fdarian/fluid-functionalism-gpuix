/**
 * The mobile drawer slides in on `x: -100%` to 0 and out again: the panel keeps its 256 px layout box while the
 * transform moves it, it rests flush at the left edge, and the exit still unmounts it.
 *
 *   bun scripts/check-mobile-drawer.tsx
 */
import { DRAWER_WIDTH } from '#/components/mobile-drawer';
import { createCheck } from './check-kit';

const k = await createCheck('mobile-drawer');
const renderer = k.renderer;

/** The drawer's panel: the one box in the popup that is `DRAWER_WIDTH` wide at rest. */
function panelBox() {
	const popup = k.element('drawer-popup');
	for (const id of renderer.getElement(popup.id)?.children ?? []) {
		const box = renderer.getElementBounds(id);
		if (box !== null && box.height > 0) return box;
	}
	throw new Error('the drawer has no panel');
}

await k.scrollIntoView('drawer-open');
const open = k.center('drawer-open');
renderer.clockPause();
try {
	renderer.nativeSimulateClick(open.x, open.y);
	k.step(0);
	k.step(0);
	k.step(30);
	const sliding = panelBox();
	k.check(
		'mid-slide the panel is partway in, a full 256 px wide',
		sliding.x < -1 &&
			sliding.x > -DRAWER_WIDTH &&
			sliding.width === DRAWER_WIDTH,
		`x ${sliding.x}, width ${sliding.width}`,
	);
	k.step(600);
	k.step(0);
	const rest = panelBox();
	k.expect(
		'at rest the panel is flush at the left edge',
		[rest.x, rest.width],
		[0, DRAWER_WIDTH],
	);
	renderer.simulateKeystrokes('Escape');
	k.step(0);
	k.step(30);
	const leaving = panelBox();
	k.check(
		'closing, the panel slides back out',
		leaving.x < 0 && leaving.x > -DRAWER_WIDTH,
		`x ${leaving.x}`,
	);
	k.step(600);
	k.step(0);
} finally {
	renderer.clockResume();
}
await k.settle(300);
k.check('the exit unmounts the drawer', !k.exists('drawer-popup'));
await k.finish();
