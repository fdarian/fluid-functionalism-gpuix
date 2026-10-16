import type { ShotContext } from "../lib/demo";

const PAGE_X = 560;
const PAGE_Y = 400;
/** Screens of the grid to capture, 520px apart; the grid runs past the 27 tiles' ~6000px. */
const GRID_SCREENS = 14;

/** Scrolls the bento grid a screen at a time, then looks at the hero's arrows and a footer's hover. The test harness keeps GPUI's wheel sign: negative `deltaY` scrolls down. */
export async function showcaseScenarios(shot: ShotContext) {
	for (let screen = 1; screen <= GRID_SCREENS; screen++) {
		await shot.scroll(PAGE_X, PAGE_Y, 0, -520);
		shot.capture(`grid-${screen}`);
	}
	await shot.hover("bento-tooltip");
	await shot.settle(700);
	shot.capture("tile-tooltip");
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.scroll(PAGE_X, PAGE_Y, 0, 1040);
	await shot.click("bento-dialog-open");
	await shot.settle(500);
	shot.capture("tile-dialog");
	await shot.press("escape");
	await shot.settle(500);
	await shot.scroll(PAGE_X, PAGE_Y, 0, 12000);
	await shot.hover("hero-next");
	await shot.settle(700);
	shot.capture("hero-next-tooltip");
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.scroll(PAGE_X, PAGE_Y, 0, -1300);
	await shot.hover("card-switch-open");
	shot.capture("footer-hover");
}
