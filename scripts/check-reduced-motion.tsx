/**
 * Reduced motion: with the OS setting on, position and size jump while opacity
 * and colour keep fading.
 *
 *   bun scripts/check-reduced-motion.tsx
 *
 * Each site is run twice on a motion clock stepped by hand: once as it is,
 * where one frame leaves it part-way (so the sample proves the site travels),
 * and once under `setMediaFeatures({ reducedMotion: true })`, where the same
 * frame must already have it at rest.
 */
import { ThinkingIndicator } from "#/components/thinking-indicator";
import { createCheck } from "./check-kit";

const FRAME_MS = 16;
const AT_REST = 0.5;
/** The indicator changes word every 4 s of the app clock. */
const WORD_CYCLE_MS = 4400;

let failures = 0;

type Kit = Awaited<ReturnType<typeof createCheck>>;

async function frames(kit: Kit, ms: number) {
	for (let elapsed = 0; elapsed < ms; elapsed += FRAME_MS) {
		kit.renderer.clockFastForward(FRAME_MS);
		kit.renderer.flush();
		kit.renderer.dispatchNativeEvents();
	}
}

async function setReduced(kit: Kit, reduced: boolean) {
	kit.renderer.clockResume();
	kit.renderer.setMediaFeatures({ reducedMotion: reduced });
	await kit.settle(200);
}

/** The highlight under a hover moves from row 0 to row 2 of the basic table. */
async function tableHighlight() {
	const kit = await createCheck("table");
	await kit.scrollIntoView("basic-row-0");
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.hoverFor(kit.center("basic-row-0"), 300);
		const target = kit.bounds("basic-row-2");
		kit.renderer.clockPause();
		const to = kit.center("basic-row-2");
		kit.renderer.nativeSimulateMouseMove(to.x - 1, to.y);
		kit.renderer.nativeSimulateMouseMove(to.x, to.y);
		await frames(kit, FRAME_MS);
		const off = Math.abs(kit.bounds("basic-highlight").y - target.y);
		kit.check(
			reduced
				? "table: the highlight is on the row after one frame"
				: "table: the highlight is still travelling after one frame",
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px short of the row`,
		);
	}
	failures += kit.unmount();
}

/** The popup slides 4px in from its trigger on opening. */
async function popupSlide() {
	const kit = await createCheck("select");
	await kit.scrollIntoView("basic-trigger");
	const settled: number[] = [];
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.click("basic-trigger");
		if (!kit.exists("basic-popup")) throw new Error("the select did not open");
		settled.push(kit.bounds("basic-popup").y);
		await kit.press("Escape");
		await kit.settle(400);
		if (kit.exists("basic-popup")) throw new Error("the select did not close");
		kit.renderer.clockPause();
		const point = kit.center("basic-trigger");
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const popup = kit.bounds("basic-popup").y;
		const off = Math.abs(popup - settled[settled.length - 1]);
		kit.check(
			reduced
				? "select: the popup opens in place after one frame"
				: "select: the popup is still sliding after one frame",
			reduced ? off < AT_REST : off > 0.5,
			`${off.toFixed(2)}px from its resting place`,
		);
		kit.renderer.clockResume();
		await kit.press("Escape");
		await kit.settle(400);
	}
	failures += kit.unmount();
}

/** The row under an open accordion panel moves up as the panel closes. */
async function accordionHeight() {
	const kit = await createCheck("accordion");
	await kit.scrollIntoView("single-1");
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const before = kit.bounds("single-2").y;
		await kit.click("single-1");
		await kit.settle(600);
		const closed = kit.bounds("single-2").y;
		if (before - closed < 10) throw new Error("the panel did not close");
		kit.renderer.clockPause();
		const point = kit.center("single-1");
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const row = kit.bounds("single-2").y;
		kit.renderer.clockResume();
		await kit.settle(600);
		const open = kit.bounds("single-2").y;
		const off = Math.abs(row - open);
		kit.check(
			reduced
				? "accordion: the row below is in place after one frame"
				: "accordion: the row below is still moving after one frame",
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px from its resting place`,
		);
	}
	failures += kit.unmount();
}

/** A dismissed inline banner fades where it stands; its row stays open until the fade ends. */
async function bannerDismiss() {
	const kit = await createCheck("banner");
	await kit.scrollIntoView("inline-banner");
	const shown = () =>
		kit.renderer.getAllText().some((line) => line.includes("Changes saved"));
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const open = kit.bounds("inline-replay").y;
		kit.renderer.clockPause();
		kit.renderer.clickElement(kit.element("inline-banner-dismiss").id);
		await frames(kit, FRAME_MS * 2);
		const moved = open - kit.bounds("inline-replay").y;
		kit.check(
			reduced
				? "banner: the row holds its height while the banner fades"
				: "banner: the row is already closing",
			reduced ? moved < AT_REST && shown() : moved > 0.5,
			`${moved.toFixed(1)}px closed`,
		);
		await frames(kit, 900);
		kit.check(
			`banner${reduced ? " (reduced)" : ""}: gone after the dismiss`,
			!shown(),
		);
		kit.renderer.clickElement(kit.element("inline-replay").id);
		await frames(kit, 900);
		kit.renderer.clockResume();
	}
	failures += kit.unmount();
}

/** The word cycle stops on the first word, which shows without the roll. */
async function thinkingWords() {
	const kit = await createCheck(() => <ThinkingIndicator testId="thinking" />);
	const firstWordShown = () =>
		kit.renderer.getAllText().join("").includes("Thinking");
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.settle(WORD_CYCLE_MS);
		kit.check(
			reduced
				? "thinking-indicator: still on the first word after a cycle"
				: "thinking-indicator: moved on from the first word after a cycle",
			firstWordShown() === reduced,
		);
	}
	failures += kit.unmount();
}

await tableHighlight();
await popupSlide();
await accordionHeight();
await bannerDismiss();
await thinkingWords();
console.log(failures === 0 ? "all passed" : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
