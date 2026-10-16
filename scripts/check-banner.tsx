/**
 * Banner interruptions on the inline banner of the banner demo.
 *
 *   bun scripts/check-banner.tsx
 *
 * The demo's Replay button sits under the banner, so its y is the row's height.
 */
import { createCheck } from "./check-kit";
import { readPng } from "./png-pixels";

const kit = await createCheck("banner");
const renderer = kit.renderer;
const replayY = () => kit.bounds("inline-replay").y;
const bannerShown = () =>
	renderer.getAllText().some((line) => line.includes("Changes saved"));

const FRAME_MS = 16;
// The motion clock is stepped by hand: against wall time a slow frame lands the
// mid-close sample at a different point of the spring on every run.
renderer.clockPause();

async function frames(ms: number, onFrame?: () => void) {
	for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
		renderer.clockFastForward(FRAME_MS);
		renderer.flush();
		renderer.dispatchNativeEvents();
		onFrame?.();
	}
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

// The dismiss button's hover fill and glyph colour ease over 80 ms (the clock is still held).
function dismissPixels() {
	renderer.captureScreenshot(`/tmp/check-banner-fade-${process.pid}.png`);
	const box = kit.bounds("inline-banner-dismiss");
	const pixels = readPng(`/tmp/check-banner-fade-${process.pid}.png`);
	const sum = (x: number, y: number) =>
		pixels
			.at(Math.round(x), Math.round(y))
			.slice(0, 3)
			.reduce((a, b) => a + b, 0);
	let glyph = 0;
	for (let y = box.y + 6; y < box.y + box.height - 6; y++)
		for (let x = box.x + 6; x < box.x + box.width - 6; x++)
			glyph = Math.max(glyph, sum(x, y));
	return { fill: sum(box.x + 3, box.y + box.height / 2), glyph };
}
renderer.nativeSimulateMouseMove(2, 2);
await frames(300);
const restFade = dismissPixels();
const dismissBox = kit.bounds("inline-banner-dismiss");
renderer.nativeSimulateMouseMove(
	dismissBox.x + dismissBox.width / 2,
	dismissBox.y + dismissBox.height / 2,
);
// The hover reaches the style on this frame; the fade is timed from it, so the 32 ms step below is 32 ms into the fade.
kit.step(0);
await frames(32);
const midFade = dismissPixels();
await frames(300);
const hoverFade = dismissPixels();
for (const part of ["fill", "glyph"] as const) {
	const low = Math.min(restFade[part], hoverFade[part]);
	const high = Math.max(restFade[part], hoverFade[part]);
	kit.check(
		`the dismiss button's ${part} eases 32 ms into the hover`,
		high - low > 6 && midFade[part] > low + 1 && midFade[part] < high - 1,
		`rest ${restFade[part]}, 32 ms ${midFade[part]}, hover ${hoverFade[part]}`,
	);
}

kit.finish();
