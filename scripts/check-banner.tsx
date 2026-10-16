/**
 * Banner interruptions on the inline banner of the banner demo.
 *
 *   bun scripts/check-banner.tsx
 *
 * The demo's Replay button sits under the banner, so its y is the row's height.
 */
import { createCheck } from "./check-kit";

const kit = await createCheck("banner");
const renderer = kit.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const replayY = () => kit.bounds("inline-replay").y;
const bannerShown = () =>
	renderer.getAllText().some((line) => line.includes("Changes saved"));

async function frames(ms: number, onFrame?: () => void) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		onFrame?.();
		await sleep(16);
	} while (performance.now() < until);
}

async function press(testId: string) {
	renderer.clickElement(kit.element(testId).id);
	await frames(16);
}

const openY = replayY();
kit.check("starts open", bannerShown());

// Closing while it is still opening must end closed, not throw and leave the banner up.
await press("inline-banner-dismiss");
await frames(600);
kit.check("dismissing removes the banner", !bannerShown());
const closedY = replayY();
await press("inline-replay");
await frames(80);
await press("inline-banner-dismiss");
await frames(900);
kit.check("closing mid-open removes the banner", !bannerShown());
kit.check(
	"closing mid-open ends collapsed",
	Math.abs(replayY() - closedY) < 0.5,
	`${replayY().toFixed(1)} vs ${closedY.toFixed(1)}`,
);

// Reopen while it closes: the row continues from where it is.
await press("inline-replay");
await frames(900);
kit.check(
	"reopens fully",
	Math.abs(replayY() - openY) < 0.5,
	`${replayY().toFixed(1)} vs ${openY.toFixed(1)}`,
);
await press("inline-banner-dismiss");
await frames(110);
const atReopen = replayY();
kit.check(
	"mid-close the row is partly collapsed",
	atReopen < openY - 1 && atReopen > closedY + 1,
	`${atReopen.toFixed(1)}`,
);
await press("inline-replay");
let lowest = atReopen;
await frames(900, () => {
	lowest = Math.min(lowest, replayY());
});
kit.check(
	"reopening mid-close does not jump down",
	// A reversal carries some momentum on (7 px of a 52 px row).
	lowest >= atReopen - 10,
	`lowest ${lowest.toFixed(1)}, reopened at ${atReopen.toFixed(1)}`,
);
kit.check(
	"reopening mid-close ends open",
	Math.abs(replayY() - openY) < 0.5 && bannerShown(),
);

// A focused dismiss button keeps focus through a reopen.
const dismiss = kit.element("inline-banner-dismiss");
renderer.focusElement(dismiss.id);
await frames(100);
kit.check(
	"the dismiss button takes focus",
	renderer.getFocusedElementId() === dismiss.id,
);
await press("inline-banner-dismiss");
await frames(110);
await press("inline-replay");
await frames(900);
const after = kit.element("inline-banner-dismiss");
kit.check(
	"the dismiss button is the same element after a reopen",
	after.id === dismiss.id,
);
kit.check(
	"the dismiss button keeps focus through a reopen",
	renderer.getFocusedElementId() === after.id,
);

kit.finish();
