import type { ShotContext } from '#/lib/demo';

const PAGE_X = 560;
const PAGE_Y = 400;
/** Screens of the grid to capture, 520px apart; the grid runs past the 27 tiles' ~6000px. */
const GRID_SCREENS = 14;

const NAV_X = 130;
const NAV_Y = 400;

/**
 * The site's own nav, which every page shares and the showcase shows at its first paint: at rest, a hover beside the active row, a clicked row once focus has left the nav, and a scroll with rows cut by the fade on both edges and the end hairline, and the end of its scroll.
 * It ends back on the showcase with the nav scrolled to its top, so the captures after it are the grid's.
 */
async function siteNavScenarios(shot: ShotContext) {
	shot.capture('nav-rest');
	await shot.hover('nav-changelog');
	shot.capture('nav-hover');
	// The pointer stays on the clicked row while focus moves to Search: the row must hold only the active fill.
	await shot.click('nav-sizes');
	await shot.focus('nav-search');
	shot.capture('nav-after-click');
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.scroll(NAV_X, NAV_Y, 0, 200);
	shot.capture('nav-mid-scroll');
	await shot.scroll(NAV_X, NAV_Y, 0, 100000);
	shot.capture('nav-bottom');
	await shot.scroll(NAV_X, NAV_Y, 0, -100000);
	await shot.click('nav-showcase');
	await shot.moveTo(PAGE_X, PAGE_Y);
}

/** Scrolls the bento grid a screen at a time, then looks at the hero's arrows and a footer's hover. */
export async function showcaseScenarios(shot: ShotContext) {
	await siteNavScenarios(shot);
	for (let screen = 1; screen <= GRID_SCREENS; screen++) {
		await shot.scroll(PAGE_X, PAGE_Y, 0, 520);
		shot.capture(`grid-${screen}`);
	}
	await shot.hover('bento-tooltip');
	await shot.settle(700);
	shot.capture('tile-tooltip');
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.scroll(PAGE_X, PAGE_Y, 0, -1040);
	await shot.click('bento-dialog-open');
	await shot.settle(500);
	shot.capture('tile-dialog');
	await shot.press('Escape');
	await shot.settle(500);
	await shot.scroll(PAGE_X, PAGE_Y, 0, -12000);
	await shot.hover('hero-next');
	await shot.settle(700);
	shot.capture('hero-next-tooltip');
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.scroll(PAGE_X, PAGE_Y, 0, 1300);
	await shot.hover('card-switch-open');
	shot.capture('footer-hover');
}
