/**
 * Sticky positioning: the fixed banner stays at the top of its scroller, and the
 * app's customise card stays put while the page scrolls past it.
 *
 *   bun scripts/check-sticky.tsx
 */
import { For } from "solid-js";
import { Banner, BannerTitle } from "../src/components/banner";
import { createCheck } from "./check-kit";

const ROWS = 20;

const banner = await createCheck(
	() => (
		<div style={{ padding: 20 }}>
			<div
				testId="scroller"
				style={{
					display: "flex",
					flexDirection: "column",
					height: 200,
					overflowY: "scroll",
				}}
			>
				<Banner testId="bar" variant="fixed">
					<BannerTitle>Pinned</BannerTitle>
				</Banner>
				<For each={Array.from({ length: ROWS }, (_, index) => index)}>
					{(index) => (
						<div testId={`row-${index}`} style={{ height: 30, flexShrink: 0 }} />
					)}
				</For>
			</div>
		</div>
	),
	{ width: 500, height: 300, initialSettleMs: 600 },
);
{
	const scrollerTop = banner.bounds("scroller").y;
	const rowRest = banner.bounds("row-5").y;
	banner.renderer.nativeSimulateScrollWheel(200, scrollerTop + 100, 0, 120);
	await banner.settle(400);
	banner.check(
		"banner: the rows scrolled",
		banner.bounds("row-5").y < rowRest - 50,
	);
	banner.check(
		"banner: the fixed bar stays at the top of its scroller",
		Math.abs(banner.bounds("bar").y - scrollerTop) < 1,
		`${banner.bounds("bar").y} vs ${scrollerTop}`,
	);
}
banner.unmount();

const site = await createCheck("button");
{
	const cardRest = site.bounds("icons").y;
	const pageRest = site.bounds("play-button").y;
	await site.scrollIntoView("Disabled-primary");
	await site.settle(300);
	site.check(
		"site: the customise card stays put while the page scrolls",
		Math.abs(site.bounds("icons").y - cardRest) < 1,
		`${site.bounds("icons").y} vs ${cardRest}`,
	);
	// A box scrolled out of the viewport has no painted bounds.
	const moved = site.renderer.getElementBounds(site.element("play-button").id);
	site.check(
		"site: the page scrolled",
		moved === null || moved.y < pageRest - 100,
	);
}
await site.finish();
