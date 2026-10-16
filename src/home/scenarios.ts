import type { ShotContext } from "../lib/demo";

const PAGE_X = 560;
const PAGE_Y = 400;

/** Scrolls the bento grid a screen at a time, then looks at the hero's arrows and a footer's hover. The test harness keeps GPUI's wheel sign: negative `deltaY` scrolls down. */
export async function showcaseScenarios(shot: ShotContext) {
	await shot.scroll(PAGE_X, PAGE_Y, 0, -520);
	shot.capture("grid-1");
	await shot.scroll(PAGE_X, PAGE_Y, 0, -520);
	shot.capture("grid-2");
	await shot.scroll(PAGE_X, PAGE_Y, 0, -520);
	shot.capture("grid-3");
	await shot.scroll(PAGE_X, PAGE_Y, 0, 4000);
	await shot.hover("hero-next");
	await shot.settle(700);
	shot.capture("hero-next-tooltip");
	await shot.moveTo(PAGE_X, PAGE_Y);
	await shot.hover("card-switch-open");
	shot.capture("footer-hover");
}
