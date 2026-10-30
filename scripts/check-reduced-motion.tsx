/**
 * Reduced motion: with the OS setting on, `width`, `height`, `top` and `left`
 * jump while opacity and colour keep fading (the rule framer-motion applies on
 * the web: its positional keys go instant, everything else animates).
 *
 *   bun scripts/check-reduced-motion.tsx
 *
 * Each site is run twice on a motion clock stepped by hand: once as it is,
 * where one frame leaves it part-way (so the sample proves the site travels),
 * and once under `setMediaFeatures({ reducedMotion: true })`, where the same
 * frame must already have it at rest.
 */
import { ThinkingIndicator } from '#/components/thinking-indicator';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

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
	const kit = await createCheck('table');
	await kit.scrollIntoView('basic-row-0');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.hoverFor(kit.center('basic-row-0'), 300);
		const wrapper = kit.bounds('basic');
		const row = kit.bounds('basic-row-2');
		// The source measures rows with offsetTop, an integer: the highlight rests there, not on the row's fractional y.
		const target = wrapper.y + Math.round(row.y - wrapper.y);
		kit.renderer.clockPause();
		const to = kit.center('basic-row-2');
		kit.renderer.nativeSimulateMouseMove(to.x - 1, to.y);
		kit.renderer.nativeSimulateMouseMove(to.x, to.y);
		await frames(kit, FRAME_MS);
		const off = Math.abs(kit.bounds('basic-highlight').y - target);
		kit.check(
			reduced
				? "table: the highlight is on the row's offsetTop after one frame"
				: 'table: the highlight is still travelling after one frame',
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px short of the row's offsetTop`,
		);
	}
	failures += kit.unmount();
}

/** The popup slides 4px in from its trigger on opening. */
async function popupSlide() {
	const kit = await createCheck('select');
	await kit.scrollIntoView('basic-trigger');
	const settled: number[] = [];
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.click('basic-trigger');
		if (!kit.exists('basic-popup')) throw new Error('the select did not open');
		settled.push(kit.bounds('basic-popup').y);
		await kit.press('Escape');
		await kit.settle(400);
		if (kit.exists('basic-popup')) throw new Error('the select did not close');
		kit.renderer.clockPause();
		const point = kit.center('basic-trigger');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const popup = kit.bounds('basic-popup').y;
		const off = Math.abs(popup - settled[settled.length - 1]);
		kit.check(
			reduced
				? 'select: the popup opens in place after one frame'
				: 'select: the popup is still sliding after one frame',
			reduced ? off < AT_REST : off > 0.5,
			`${off.toFixed(2)}px from its resting place`,
		);
		kit.renderer.clockResume();
		await kit.press('Escape');
		await kit.settle(400);
	}
	failures += kit.unmount();
}

/** The row under an open accordion panel moves up as the panel closes. */
async function accordionHeight() {
	const kit = await createCheck('accordion');
	await kit.scrollIntoView('single-1');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const before = kit.bounds('single-2').y;
		await kit.click('single-1');
		await kit.settle(600);
		const closed = kit.bounds('single-2').y;
		if (before - closed < 10) throw new Error('the panel did not close');
		kit.renderer.clockPause();
		const point = kit.center('single-1');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const row = kit.bounds('single-2').y;
		kit.renderer.clockResume();
		await kit.settle(600);
		const open = kit.bounds('single-2').y;
		const off = Math.abs(row - open);
		kit.check(
			reduced
				? 'accordion: the row below is in place after one frame'
				: 'accordion: the row below is still moving after one frame',
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px from its resting place`,
		);
	}
	failures += kit.unmount();
}

/** A dismissed inline banner fades where it stands; its row stays open until the fade ends. */
async function bannerDismiss() {
	const kit = await createCheck('banner');
	await kit.scrollIntoView('inline-banner');
	const shown = () =>
		kit.renderer.getAllText().some((line) => line.includes('Changes saved'));
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const open = kit.bounds('inline-replay').y;
		kit.renderer.clockPause();
		kit.renderer.clickElement(kit.element('inline-banner-dismiss').id);
		await frames(kit, FRAME_MS * 2);
		const moved = open - kit.bounds('inline-replay').y;
		kit.check(
			reduced
				? 'banner: the row holds its height while the banner fades'
				: 'banner: the row is already closing',
			reduced ? moved < AT_REST && shown() : moved > 0.5,
			`${moved.toFixed(1)}px closed`,
		);
		await frames(kit, 900);
		kit.check(
			`banner${reduced ? ' (reduced)' : ''}: gone after the dismiss`,
			!shown(),
		);
		kit.renderer.clickElement(kit.element('inline-replay').id);
		await frames(kit, 900);
		kit.renderer.clockResume();
	}
	failures += kit.unmount();
}

/** The word cycle stops on the first word, which shows without the roll. */
async function thinkingWords() {
	const kit = await createCheck(() => <ThinkingIndicator testId="thinking" />);
	const firstWordShown = () =>
		kit.renderer.getAllText().join('').includes('Thinking');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.settle(WORD_CYCLE_MS);
		kit.check(
			reduced
				? 'thinking-indicator: still on the first word after a cycle'
				: 'thinking-indicator: moved on from the first word after a cycle',
			firstWordShown() === reduced,
		);
	}
	failures += kit.unmount();
}

const SHOT_PATH = `/tmp/check-reduced-motion-${process.pid}.png`;

/** How far the pixel at `point` is from the one at `ground`, summed over the channels. */
function pixelDistance(
	kit: Kit,
	point: { x: number; y: number },
	ground: { x: number; y: number },
) {
	kit.renderer.captureScreenshot(SHOT_PATH);
	const pixels = readPng(SHOT_PATH);
	const here = pixels.at(Math.round(point.x), Math.round(point.y));
	const there = pixels.at(Math.round(ground.x), Math.round(ground.y));
	return (
		Math.abs(here[0] - there[0]) +
		Math.abs(here[1] - there[1]) +
		Math.abs(here[2] - there[2])
	);
}

/** The pixels of `box` that differ strongly from its top-left one: a glyph's strokes, without the soft background wash around it. */
function strokes(
	kit: Kit,
	box: { x: number; y: number; width: number; height: number },
) {
	kit.renderer.captureScreenshot(SHOT_PATH);
	const pixels = readPng(SHOT_PATH);
	const left = Math.round(box.x);
	const top = Math.round(box.y);
	const ground = pixels.at(left, top);
	const lit = new Set<number>();
	for (let y = top; y < top + Math.round(box.height); y++)
		for (let x = left; x < left + Math.round(box.width); x++) {
			const pixel = pixels.at(x, y);
			const distance =
				Math.abs(pixel[0] - ground[0]) +
				Math.abs(pixel[1] - ground[1]) +
				Math.abs(pixel[2] - ground[2]);
			if (distance > 150) lit.add(y * 10000 + x);
		}
	return lit;
}

function mismatch(a: Set<number>, b: Set<number>) {
	let count = 0;
	for (const key of a) if (!b.has(key)) count++;
	for (const key of b) if (!a.has(key)) count++;
	return count;
}

/** Moves the pointer onto `point` without letting the motion clock run. */
function pointerTo(kit: Kit, point: { x: number; y: number }) {
	kit.renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	kit.renderer.nativeSimulateMouseMove(point.x, point.y);
}

interface PillScenario {
	page: string;
	list: string;
	/** testIds of three tabs, left to right. */
	tabs: [string, string, string];
	/** The surface the pill is read against: a track, or the page behind a pill-less list. */
	groundOf: (kit: Kit) => { x: number; y: number };
}

/**
 * The selected pill lands on the clicked tab in one frame, and the preview
 * pill, born at the selected one, is on the hovered tab in a frame or two while
 * its fade-in is still part-way.
 */
async function pill(scenario: PillScenario) {
	const kit = await createCheck(scenario.page);
	await kit.scrollIntoView(scenario.list);
	const [first, , last] = scenario.tabs;
	const ground = scenario.groundOf(kit);
	for (const reduced of [false, true]) {
		const label = `${scenario.page}${reduced ? ' (reduced)' : ''}`;
		await setReduced(kit, reduced);
		await kit.click(first);
		await kit.settle(600);
		const target = kit.bounds(last).x;
		kit.renderer.clockPause();
		const point = kit.center(last);
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const off = Math.abs(kit.bounds(`${scenario.list}-selected`).x - target);
		kit.check(
			reduced
				? `${label}: the selected pill is on the tab after one frame`
				: `${label}: the selected pill is still travelling after one frame`,
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px short of the tab`,
		);
		kit.renderer.clockResume();

		// Out of the list so the preview is gone, then onto the last tab with the clock held.
		await kit.hoverFor({ x: 4, y: 4 }, 500);
		await kit.click(first);
		await kit.hoverFor({ x: 4, y: 4 }, 500);
		const hovered = kit.center(last);
		kit.renderer.clockPause();
		pointerTo(kit, hovered);
		await frames(kit, FRAME_MS * 2);
		const previewX = kit.bounds(`${scenario.list}-preview`).x;
		const edge = {
			x: kit.bounds(last).x + 3,
			y: hovered.y,
		};
		const part = pixelDistance(kit, edge, ground);
		kit.renderer.clockResume();
		await kit.settle(500);
		const full = pixelDistance(kit, edge, ground);
		const gap = Math.abs(previewX - kit.bounds(last).x);
		kit.check(
			reduced
				? `${label}: the preview pill is on the hovered tab after two frames`
				: `${label}: the preview pill is still travelling after two frames`,
			reduced ? gap < AT_REST : gap > 2,
			`${gap.toFixed(1)}px short of the tab`,
		);
		kit.check(
			`${label}: the preview pill is still fading in`,
			full > 0 && part < full * 0.9,
			`${part} of ${full} at two frames`,
		);
		await kit.hoverFor({ x: 4, y: 4 }, 500);
	}
	failures += kit.unmount();
}

/** A label unfolds to its measured width in one frame; its margin and fade keep easing. */
async function tabsSubtleLabel() {
	const kit = await createCheck('tabs-subtle');
	await kit.scrollIntoView('active-0');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		await kit.click('active-0');
		await kit.settle(600);
		await kit.hoverFor({ x: 4, y: 4 }, 300);
		const folded = kit.bounds('active-2').width;
		await kit.click('active-2');
		await kit.settle(600);
		const unfolded = kit.bounds('active-2').width;
		if (unfolded - folded < 20) throw new Error('the label did not unfold');
		await kit.click('active-0');
		await kit.settle(600);
		await kit.hoverFor({ x: 4, y: 4 }, 300);
		kit.renderer.clockPause();
		const point = kit.center('active-2');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const short = unfolded - kit.bounds('active-2').width;
		kit.renderer.clockResume();
		kit.check(
			reduced
				? 'tabs-subtle: the label has its width after one frame, only its margin still easing'
				: 'tabs-subtle: the label is still unfolding after one frame',
			reduced ? short > 1 && short < 9 : short > 20,
			`${short.toFixed(1)}px short of the unfolded tab`,
		);
		await kit.settle(600);
	}
	failures += kit.unmount();
}

/** The rows under a sidebar sub-menu are in place the frame it opens, while its rows are still fading in. */
async function sidebarSubMenu() {
	const kit = await createCheck('sidebar');
	await kit.scrollIntoView('sidebar-demo-Button');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const open = kit.bounds('sidebar-demo-Badge').y;
		await kit.click('sidebar-demo-Button');
		await kit.settle(600);
		if (open - kit.bounds('sidebar-demo-Badge').y < 20)
			throw new Error('the sub-menu did not close');
		kit.renderer.clockPause();
		const point = kit.center('sidebar-demo-Button');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const off = Math.abs(kit.bounds('sidebar-demo-Badge').y - open);
		const part = kit.ink(kit.bounds('sidebar-demo-Variants'));
		kit.renderer.clockResume();
		kit.check(
			reduced
				? 'sidebar sub-menu: the row below is in place after one frame'
				: 'sidebar sub-menu: the row below is still moving after one frame',
			reduced ? off < AT_REST : off > 2,
			`${off.toFixed(1)}px from its resting place`,
		);
		await kit.settle(600);
		const full = kit.ink(kit.bounds('sidebar-demo-Variants'));
		kit.check(
			`sidebar sub-menu${reduced ? ' (reduced)' : ''}: the rows are still fading in after one frame`,
			part < full,
			`${part} of ${full}`,
		);
	}
	failures += kit.unmount();
}

/** A thinking-steps panel closes by height alone: it is shut after one frame, and its chevron has already turned. */
async function thinkingStepsPanel() {
	const kit = await createCheck('thinking-steps');
	await kit.scrollIntoView('basic-header');
	for (const reduced of [false, true]) {
		await setReduced(kit, reduced);
		const open = kit.bounds('basic-panel').height;
		const header = kit.bounds('basic-header');
		const chevron = {
			x: header.x + header.width - 28,
			y: header.y,
			width: 24,
			height: header.height,
		};
		const before = strokes(kit, chevron);
		kit.renderer.clockPause();
		const point = kit.center('basic-header');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS);
		const height = kit.bounds('basic-panel').height;
		// One frame into the spring, the chevron is part of the way round unless the turn is skipped.
		const turning = strokes(kit, chevron);
		kit.renderer.clockResume();
		kit.check(
			reduced
				? 'thinking-steps: the panel is shut after one frame'
				: 'thinking-steps: the panel is still closing after one frame',
			reduced ? height < AT_REST : height > 2 && height < open - 2,
			`${height.toFixed(1)}px of ${open.toFixed(1)}`,
		);
		await kit.settle(800);
		const turned = strokes(kit, chevron);
		const travel = mismatch(before, turned);
		kit.check(
			reduced
				? 'thinking-steps: the chevron has turned after one frame'
				: 'thinking-steps: the chevron is still turning after one frame',
			travel > 20 &&
				(reduced
					? mismatch(turning, turned) < travel * 0.25
					: mismatch(turning, turned) > travel * 0.5),
			`${mismatch(turning, turned)} pixels from the end pose and ${mismatch(turning, before)} from the start one, of ${travel}`,
		);
		await kit.click('basic-header');
		await kit.settle(800);
	}
	failures += kit.unmount();
}

/** The thumb still slides across the track, but takes its hover width in one frame. */
async function switchThumb() {
	const kit = await createCheck('switch');
	await kit.scrollIntoView('basic');
	const thumbX = () =>
		kit.bounds('basic-thumb').x - kit.bounds('basic-track').x;
	for (const reduced of [false, true]) {
		const label = `switch${reduced ? ' (reduced)' : ''}`;
		await setReduced(kit, reduced);
		await kit.hoverFor({ x: 4, y: 4 }, 400);
		const resting = kit.bounds('basic-thumb').width;
		const start = thumbX();
		kit.renderer.clockPause();
		pointerTo(kit, kit.center('basic-track'));
		await frames(kit, FRAME_MS * 2);
		const hoverWidth = kit.bounds('basic-thumb').width;
		kit.renderer.clockResume();
		await kit.settle(400);
		const hovered = kit.bounds('basic-thumb').width;
		const short = Math.abs(hoverWidth - hovered);
		kit.check(
			reduced
				? `${label}: the thumb has its hover width after two frames`
				: `${label}: the thumb is still widening after two frames`,
			reduced ? short < AT_REST : short > 0.2,
			`${short.toFixed(2)}px short of ${hovered.toFixed(1)} (rest ${resting.toFixed(1)})`,
		);
		await kit.click('basic-track');
		await kit.settle(600);
		const moved = thumbX() - start;
		if (Math.abs(moved) < 8) throw new Error('the switch did not toggle');
		kit.renderer.clockPause();
		const point = kit.center('basic-track');
		kit.renderer.nativeSimulateClick(point.x, point.y);
		await frames(kit, FRAME_MS * 2);
		// Back where it started: the target is the first resting place.
		const slid = Math.abs(thumbX() - start);
		kit.renderer.clockResume();
		await kit.settle(600);
		kit.check(
			`${label}: the thumb is still sliding home after two frames`,
			slid > 1,
			`${slid.toFixed(1)}px short of its resting place`,
		);
	}
	failures += kit.unmount();
}

/** The scrollbar thumb widens on a CSS transition on the web, so it eases with reduced motion on. */
async function scrollbarThumb() {
	const kit = await createCheck('scroll-area');
	await kit.scrollIntoView('area');
	for (const reduced of [false, true]) {
		const label = `scroll-area${reduced ? ' (reduced)' : ''}`;
		await setReduced(kit, reduced);
		await kit.hoverFor({ x: 4, y: 4 }, 400);
		await kit.hoverFor(kit.center('area'), 600);
		const track = kit.bounds('area-y-track');
		kit.renderer.clockPause();
		pointerTo(kit, {
			x: track.x + track.width / 2,
			y: track.y + track.height / 2,
		});
		await frames(kit, FRAME_MS * 5);
		const width = kit.bounds('area-y-thumb').width;
		kit.renderer.clockResume();
		kit.check(
			`${label}: the thumb is part-way through widening after five frames`,
			width > 4.2 && width < 5.9,
			`${width.toFixed(2)}px wide`,
		);
		await kit.hoverFor({ x: 4, y: 4 }, 600);
	}
	failures += kit.unmount();
}

await tableHighlight();
await popupSlide();
await accordionHeight();
await bannerDismiss();
await thinkingWords();
await pill({
	page: 'tabs',
	list: 'basic-list',
	tabs: ['basic-library', 'basic-recents', 'basic-settings'],
	groundOf: (kit) => ({
		x: kit.bounds('basic-list').x + 2,
		y: kit.center('basic-list').y,
	}),
});
await pill({
	page: 'tabs-subtle',
	list: 'basic-list',
	tabs: ['basic-0', 'basic-1', 'basic-2'],
	groundOf: (kit) => ({
		x: kit.bounds('basic-list').x + kit.bounds('basic-list').width - 1,
		y: kit.center('basic-list').y,
	}),
});
await tabsSubtleLabel();
await sidebarSubMenu();
await thinkingStepsPanel();
await switchThumb();
await scrollbarThumb();
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
