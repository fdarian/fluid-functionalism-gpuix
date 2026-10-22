/**
 * Scenario checks for the command menu and the site shell, through the offscreen renderer.
 *
 *   bun scripts/check-command-menu.tsx
 *
 * Prints PASS / FAIL lines and exits 1 on any FAIL. Covers: the list's scroll
 * travel (arrows animate, Home and a re-filter snap, a second arrow takes over,
 * a held arrow at macOS key-repeat timing, a hold across the wrap),
 * modified arrows with tabs mounted, the scrim finishing its fade, keyboard
 * focus after a tab click, the `mod++` cap, the site menu's ⌘K matching, the
 * home hero's buttons, and the layout passes and drawn frames of entering this
 * page from the palette, of one ArrowDown, and of an idle window.
 */

import { formatShortcut } from '#/components/command-menu';
import { setSizeChoice } from '#/lib/theme';
import { createCheck } from './check-kit';

const kit = await createCheck('command-menu');
const renderer = kit.renderer;
const mod = 'ControlOrMeta';

// ─── formatShortcut ──────────────────────────────────────────────────────────

const plus = formatShortcut('mod++');
kit.check(
	'mod++ keeps the + key',
	plus.length === 2 && plus[1] === '+',
	JSON.stringify(plus),
);
const comma = formatShortcut('mod+,');
kit.check(
	'mod+, keeps the comma',
	comma.length === 2 && comma[1] === ',',
	JSON.stringify(comma),
);
kit.check(
	'a bare + is one cap',
	JSON.stringify(formatShortcut('+')) === '["+"]',
);

// ─── The list's scroll travel ────────────────────────────────────────────────

interface ScrollWrite {
	id: number;
	top: number;
}
const writes: ScrollWrite[] = [];
// The list is scrolled by code only: every write to a scroller's offset ends in the renderer's `scrollTo`, whether it came from the element's `scrollTop` setter, its `scrollTo` or the renderer directly, so a scenario can tell a travel from a jump.
const rendererScrollTo = renderer.scrollTo;
if (rendererScrollTo === undefined) {
	throw new Error('This renderer cannot scroll');
}
Object.defineProperty(renderer, 'scrollTo', {
	writable: true,
	value(id: number, left: number, top: number, behavior?: string) {
		writes.push({ id, top });
		rendererScrollTo.call(renderer, id, left, top, behavior);
	},
});

const LIST = 'details-list';
const INPUT = 'details-input';
const offset = () => {
	const metrics = renderer.getScrollMetrics(kit.element(LIST).id);
	if (metrics === null) throw new Error('the list has no scroll metrics');
	return metrics[1];
};
const listWrites = () =>
	writes.filter((write) => write.id === kit.element(LIST).id);
const sinceMark = (from: number) =>
	listWrites()
		.slice(from)
		.map((w) => w.top);

await kit.scrollIntoView(INPUT);
await kit.focus(INPUT);

// The input's own leading is the source's `leading-6` / `leading-5`, and its box is that line.
const fieldBox = () => {
	const style = kit.element(INPUT).style;
	return `${style.fontSize}/${style.lineHeight}, ${kit.bounds(INPUT).height}px high`;
};
kit.check(
	'the field is 14/24 in the default step',
	fieldBox() === '14/24px, 24px high',
	fieldBox(),
);
setSizeChoice('compact');
await kit.settle(300);
kit.check(
	'the field is 13/20 in the compact step',
	fieldBox() === '13/20px, 20px high',
	fieldBox(),
);
setSizeChoice('default');
await kit.settle(300);
// The motion clock is stepped by hand: against wall time a slow frame carries the whole travel in one step.
const FRAME_MS = 16;
const stepFrames = async () => {
	// The travel starts in a microtask after the key handler, so let one run before the first step.
	await Promise.resolve();
	for (let frame = 0; frame < 40; frame++) {
		renderer.clockFastForward(FRAME_MS);
		renderer.flush();
		renderer.dispatchNativeEvents();
		await Promise.resolve();
	}
};
const steppedPress = async (keystrokes: string) => {
	renderer.simulateKeystrokes(keystrokes);
	await stepFrames();
};
renderer.clockPause();
for (let step = 0; step < 4; step++) await steppedPress('ArrowDown');
const before = offset();
let mark = listWrites().length;
// The travel lasts a handful of frames; stepping the motion clock by hand keeps the sampling independent of how long a real frame takes.
renderer.clockPause();
renderer.simulateKeystrokes('ArrowDown');
// The menu starts the travel in a microtask after the key handler returns.
await Promise.resolve();
for (let frame = 0; frame < 40; frame++) {
	renderer.clockFastForward(8);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
renderer.clockResume();
const travel = sinceMark(mark);
const after = offset();
kit.check(
	'an arrow past the middle scrolls the list',
	after > before,
	`${before} -> ${after}`,
);
kit.check(
	'the scroll travels in steps, it does not jump',
	travel.filter((top) => top > before + 0.5 && top < after - 0.5).length >= 2,
	travel.map((top) => top.toFixed(1)).join(' '),
);
kit.check(
	'the travel never reverses',
	travel.every((top, index) => index === 0 || top >= travel[index - 1] - 0.01),
);

// A second arrow while the first is travelling takes over from where it is.
await steppedPress('ArrowDown');
mark = listWrites().length;
renderer.simulateKeystrokes('ArrowDown');
renderer.simulateKeystrokes('ArrowDown');
await stepFrames();
const chained = sinceMark(mark);
kit.check(
	'two quick arrows end at the later row',
	offset() >= chained[0],
	`${offset()}`,
);
kit.check(
	'a quick second arrow does not send the scroll backwards',
	chained.every(
		(top, index) => index === 0 || top >= chained[index - 1] - 0.01,
	),
	chained.map((top) => top.toFixed(0)).join(' '),
);

// Home and a move to row 0 snap.
await steppedPress('ArrowUp');
kit.check('still scrolled one arrow up', offset() > 0, `${offset()}`);
mark = listWrites().length;
renderer.simulateKeystrokes('Home');
await stepFrames();
const home = sinceMark(mark);
kit.check(
	'Home snaps to the top in one write',
	home.length > 0 && home.every((top) => top === 0),
	home.join(' '),
);
kit.expect('Home ends at the top', offset(), 0);

// A re-filter snaps to the top too.
await steppedPress('End');
kit.check('End scrolls the list down', offset() > 0, `${offset()}`);
mark = listWrites().length;
renderer.simulateKeystrokes('a');
await stepFrames();
kit.check(
	'typing snaps the list to the top',
	offset() === 0 && sinceMark(mark).every((top) => top === 0),
	sinceMark(mark).join(' '),
);
renderer.clockResume();

// ─── The input's ARIA ────────────────────────────────────────────────────────

/** Relations in the accessibility tree name other nodes by tree key; this maps them back to the authored `id`. */
function ariaOf(authorId: string) {
	const nodes = renderer.getA11yTree().nodes ?? {};
	const byKey = new Map<string, string>();
	for (const [key, node] of Object.entries(nodes)) {
		if (node.aria?.author_id !== undefined) byKey.set(key, node.aria.author_id);
	}
	const named = (key: string) => byKey.get(key) ?? key;
	for (const node of Object.values(nodes)) {
		if (node.aria?.author_id !== authorId) continue;
		return {
			role: node.aria.role,
			expanded: node.aria.expanded,
			controls: (node.aria.controls ?? []).map(named),
			active:
				node.aria.active_descendant === undefined
					? undefined
					: named(node.aria.active_descendant),
		};
	}
	throw new Error(`no accessibility node with id ${authorId}`);
}
const idOf = (testId: string) => {
	const id = kit.element(testId).customProps?.id;
	if (typeof id !== 'string') throw new Error(`${testId} has no id`);
	return id;
};
const inputAria = (testId: string) => ariaOf(idOf(testId));

await kit.focus('details-input');
await kit.press('Home');
const combobox = inputAria('details-input');
kit.expect('the input is a combobox', combobox.role, 'ComboBox');
kit.expect('the input reports expanded', combobox.expanded, true);
kit.check(
	'the input controls one node, a listbox',
	combobox.controls.length === 1 &&
		ariaOf(combobox.controls[0]).role === 'ListBox',
	JSON.stringify(combobox.controls),
);
kit.expect(
	'Home lights the first row and the input names it',
	inputAria('details-input').active,
	idOf('details-row-new-file'),
);
await kit.press('ArrowDown');
kit.expect(
	'ArrowDown moves aria-activedescendant to the next row',
	inputAria('details-input').active,
	idOf('details-row-search'),
);
await kit.press('ArrowDown');
kit.expect(
	'ArrowDown again follows',
	inputAria('details-input').active,
	idOf('details-row-theme'),
);
await kit.press('ArrowUp');
kit.expect(
	'ArrowUp moves it back',
	inputAria('details-input').active,
	idOf('details-row-search'),
);
kit.expect(
	'the input keeps focus while the descendant moves',
	renderer.getFocusedElementId(),
	kit.element('details-input').id,
);
await kit.press('z z z z z');
kit.expect(
	'no matching row: no active descendant',
	inputAria('details-input').active,
	undefined,
);
await kit.press('Escape');

// ─── The filter select ───────────────────────────────────────────────────────

const TYPE_VALUES = ['all', 'Actions', 'Go to', 'Help'];
/** Where focus is within the type filter: its trigger, panel or one of its rows. */
const typeFocus = () => {
	const focused = renderer.getFocusedElementId();
	if (focused === null) return null;
	return (
		[
			'filters-type-trigger',
			'filters-type-list',
			...TYPE_VALUES.map((value) => `filters-type-option-${value}`),
		].find(
			(testId) => kit.exists(testId) && kit.element(testId).id === focused,
		) ?? null
	);
};

await kit.focus('filters-type-trigger');
await kit.press('Enter');
kit.check('Enter opens the type filter', kit.exists('filters-type-list'));
kit.expect(
	'Enter focuses the checked row',
	typeFocus(),
	'filters-type-option-all',
);
await kit.press('ArrowDown');
kit.expect(
	'ArrowDown focuses the next row',
	typeFocus(),
	'filters-type-option-Actions',
);
await kit.press('Escape');
kit.check('Escape closes the type filter', !kit.exists('filters-type-list'));
kit.expect(
	'Escape returns focus to the trigger',
	typeFocus(),
	'filters-type-trigger',
);
await kit.press('Enter');
await kit.press('ArrowDown Enter');
await kit.settle(500);
kit.expect(
	'a pick returns focus to the trigger',
	typeFocus(),
	'filters-type-trigger',
);
kit.check(
	'picking Actions filters the rows',
	kit.exists('filters-row-new-file') && !kit.exists('filters-row-home'),
);

// ─── The site menu ───────────────────────────────────────────────────────────

const isOpen = () => kit.exists('site-menu-input');
const tabState = () => {
	const pages = kit.exists('site-menu-row-showcase');
	const settings = kit.exists('site-menu-row-theme:dark');
	if (pages && settings) return 'all';
	if (pages) return 'page';
	if (settings) return 'setting';
	return 'none';
};
const focusedTestId = () => {
	const id = renderer.getFocusedElementId();
	if (id === null || id === undefined) return undefined;
	return kit.exists('site-menu-input') &&
		kit.element('site-menu-input').id === id
		? 'site-menu-input'
		: `element ${id}`;
};

// The key a layout types is what counts: gpuix's `code` is derived from `key`, so
// the key that types "t" (Dvorak's physical K) reports key "t", code "KeyT".
await kit.press(`${mod}+t`);
kit.check(`${mod}+t does not open the menu`, !isOpen());
await kit.press(`${mod}+Alt+k`);
kit.check(`${mod}+Alt+k does not open the menu`, !isOpen());
await kit.press(`${mod}+k`);
kit.check(`${mod}+k opens the menu`, isOpen());
await kit.settle(400);
await kit.press(`${mod}+k`);
await kit.settle(400);
kit.check(`${mod}+k closes it again`, !isOpen());

// ─── Modified arrows ─────────────────────────────────────────────────────────

await kit.press(`${mod}+k`);
await kit.settle(400);
kit.check('menu open for the arrow checks', isOpen());
kit.check('starts on All', tabState() === 'all', tabState());
for (const modifier of ['Shift', 'Alt', 'Control', 'Meta']) {
	await kit.press(`${modifier}+ArrowRight`);
	kit.check(
		`${modifier}+ArrowRight keeps the tab`,
		tabState() === 'all',
		tabState(),
	);
	await kit.press(`${modifier}+ArrowLeft`);
	kit.check(
		`${modifier}+ArrowLeft keeps the tab`,
		tabState() === 'all',
		tabState(),
	);
}
await kit.press('ArrowRight');
kit.check('bare right switches to Pages', tabState() === 'page', tabState());
await kit.press('ArrowLeft');
kit.check('bare left switches back to All', tabState() === 'all', tabState());

// ─── A held arrow ────────────────────────────────────────────────────────────

// macOS key repeat at the owner's settings (InitialKeyRepeat 15, KeyRepeat 2), frames at 60 Hz: a repeat is a keydown with `isHeld` and the draw is a display-link `drawFrame`. The motion clock runs: the cascade this guards against exists because every layout pass samples the spring at the wall clock, so a paused clock would hide it.
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REPEAT_FIRST_MS = 225;
const REPEAT_MS = 30;
const HELD_FRAME_MS = 1000 / 60;
const native = Reflect.get(renderer, 'native') as {
	simulateKeyDown(keystroke: string, isHeld?: boolean): void;
	simulateKeyUp(keystroke: string): void;
};
const menuList = kit.element('site-menu-list');
const menuRows: { testId: string; domId: string }[] = [];
const collectRows = (id: number) => {
	const node = renderer.getElement(id);
	if (node === undefined) throw new Error(`no element ${id}`);
	if (node.testId?.startsWith('site-menu-row-') === true)
		menuRows.push({ testId: node.testId, domId: String(node.customProps?.id) });
	for (const child of node.children) collectRows(child);
};
collectRows(menuList.id);
const menuInputId = kit.element('site-menu-input').id;
// `renderer.getElement` serialises the element (about 60 ms here), too slow to read on every press of a hold, so the hold follows the input's `aria-activedescendant` through the batches that set it.
let activeDomId: unknown;
const applyBatch = renderer.applyBatch;
Object.defineProperty(renderer, 'applyBatch', {
	writable: true,
	value(json: string) {
		for (const op of JSON.parse(json) as unknown[][]) {
			if (
				op[0] === 'setCustomProp' &&
				op[1] === menuInputId &&
				op[2] === 'aria-activedescendant'
			)
				activeDomId = op[3];
		}
		return applyBatch.call(renderer, json);
	},
});
const activeRow = (domId: unknown) => {
	const index = menuRows.findIndex((row) => row.domId === domId);
	if (index === -1) throw new Error(`no row is active: ${String(domId)}`);
	return index;
};
const menuActive = () =>
	activeRow(
		renderer.getElement(menuInputId)?.customProps?.['aria-activedescendant'],
	);
const menuScroll = () => {
	const metrics = renderer.getScrollMetrics(menuList.id);
	if (metrics === null) throw new Error('the menu list has no scroll metrics');
	return metrics[1];
};
/** The highlight pill is the first child of the listbox, which is the scroller's first child. */
const pillId = (() => {
	const listbox = renderer.getElement(menuList.id)?.children[0];
	const pill =
		listbox === undefined
			? undefined
			: renderer.getElement(listbox)?.children[0];
	if (pill === undefined) throw new Error('no highlight pill');
	return pill;
})();
/** The pill's top in content coordinates. */
const pillTop = () => {
	const box = renderer.getElementBounds(pillId);
	const list = renderer.getElementBounds(menuList.id);
	if (box === null || list === null) throw new Error('no pill or list bounds');
	return box.y - list.y + menuScroll();
};
const percentile = (values: number[], p: number) => {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
};

interface HeldTrace {
	/** Layout passes and milliseconds of each event drain, a key's delivery included. */
	drains: { passes: number; ms: number }[];
	draws: number[];
	keys: number;
	handled: number[];
	scroll: number[];
	pill: number[];
}
/** Holds ArrowDown for `keys` presses on the real clock, then lets the motion settle. Every press is delivered, a late one right after the one before, as AppKit queues repeats while the thread is busy. */
const holdArrowDown = async (keys: number): Promise<HeldTrace> => {
	const trace: HeldTrace = {
		drains: [],
		draws: [],
		keys: 0,
		handled: [],
		scroll: [],
		pill: [],
	};
	const drain = (deliver: () => void) => {
		const passes = renderer.getLayoutPassCount();
		const started = performance.now();
		deliver();
		renderer.dispatchNativeEvents();
		trace.drains.push({
			passes: renderer.getLayoutPassCount() - passes,
			ms: performance.now() - started,
		});
	};
	// The test window's fake screen reader builds an accessibility tree on every draw; a real window without VoiceOver does not.
	renderer.setA11yActive(false);
	renderer.setInlineDraws(false);
	const start = performance.now();
	const end = start + REPEAT_FIRST_MS + REPEAT_MS * keys + 600;
	let nextFrame = start;
	while (performance.now() < end) {
		const now = performance.now();
		if (
			trace.keys < keys &&
			now >=
				start +
					(trace.keys === 0
						? 0
						: REPEAT_FIRST_MS + REPEAT_MS * (trace.keys - 1))
		) {
			const isHeld = trace.keys > 0;
			drain(() => native.simulateKeyDown('ArrowDown', isHeld));
			trace.keys++;
			// The mutations of the key flush in a microtask.
			await Promise.resolve();
			trace.handled.push(activeRow(activeDomId));
		} else if (now >= nextFrame) {
			drain(() => {});
			await Promise.resolve();
			const started = performance.now();
			renderer.drawFrame();
			trace.draws.push(performance.now() - started);
			trace.scroll.push(menuScroll());
			trace.pill.push(pillTop());
			nextFrame = Math.max(nextFrame + HELD_FRAME_MS, performance.now());
		} else await sleep(1);
	}
	native.simulateKeyUp('ArrowDown');
	renderer.setInlineDraws(true);
	renderer.setA11yActive(true);
	await kit.settle(300);
	return trace;
};

await kit.focus('site-menu-input');
await kit.press('Home');
await kit.settle(400);
kit.expect('the held run starts on the first row', menuActive(), 0);
const HELD_KEYS = 40;
const held = await holdArrowDown(HELD_KEYS);
kit.expect('every key of a 2 s hold is sent', held.keys, HELD_KEYS);
kit.check(
	'every held repeat moves the highlight by one row',
	held.handled.every((index, press) => index === press + 1),
	`${held.handled.length} presses, last row ${held.handled.at(-1)}`,
);
const reversals = (values: number[]) =>
	values.filter((value, index) => index > 0 && value < values[index - 1] - 0.5);
kit.check(
	'the scroll only moves forward while the key is held',
	reversals(held.scroll).length === 0,
	`${held.scroll.length} frames, ${reversals(held.scroll).length} reversals`,
);
kit.check(
	'the highlight only moves forward while the key is held',
	reversals(held.pill).length === 0,
	`${held.pill.length} frames, ${reversals(held.pill).length} reversals`,
);
// A `scrollTop` write that read the metrics back laid out the window and sampled the spring again, which emitted the next change: one drain was 40 to 70 passes. Now a drain lays out once, for the key or the frame. The bound is a count, not a time, so a slow machine cannot move it.
const worstPasses = Math.max(...held.drains.map((entry) => entry.passes));
kit.check(
	'a drain runs at most 1 layout pass',
	worstPasses <= 1,
	`worst ${worstPasses}`,
);
const worstDrain = Math.max(...held.drains.map((entry) => entry.ms));
const worstDraw = Math.max(...held.draws);
kit.check(
	'a drain and a draw fit a 60 Hz frame at the 90th percentile',
	percentile(
		held.drains.map((entry) => entry.ms),
		0.9,
	) <= HELD_FRAME_MS && percentile(held.draws, 0.9) <= HELD_FRAME_MS,
	`drain p90 ${percentile(
		held.drains.map((entry) => entry.ms),
		0.9,
	).toFixed(
		1,
	)} ms, worst ${worstDrain.toFixed(1)} ms; draw p90 ${percentile(held.draws, 0.9).toFixed(1)} ms, worst ${worstDraw.toFixed(1)} ms`,
);

// A hold across the wrap from the last row to the first: the first row snaps the list to the top, and a change event queued before the snap must not write the old bottom position back.
await kit.press('End');
await kit.settle(500);
for (let up = 0; up < 3; up++) {
	await kit.press('ArrowUp');
	await kit.settle(200);
}
kit.expect(
	'the wrap run starts three rows above the end',
	menuActive(),
	menuRows.length - 4,
);
const wrapMark = writes.length;
const preWrapScroll = menuScroll();
const wrapped = await holdArrowDown(3 + 1 + 5);
const wrapWrites = writes
	.slice(wrapMark)
	.filter((write) => write.id === menuList.id)
	.map((write) => write.top);
const snap = wrapWrites.indexOf(0);
const finalRow = menuRows[menuActive()].testId;
const finalBox = renderer.getElementBounds(kit.element(finalRow).id);
const listBox = renderer.getElementBounds(menuList.id);
const finalMetrics = renderer.getScrollMetrics(menuList.id);
if (finalBox === null || listBox === null || finalMetrics === null)
	throw new Error('the menu list or its row has no bounds');
const centre = Math.max(
	0,
	Math.min(
		finalBox.y -
			listBox.y +
			finalMetrics[1] +
			finalBox.height / 2 -
			finalMetrics[5] / 2,
		finalMetrics[3] - finalMetrics[5],
	),
);
const afterSnap = wrapWrites.slice(snap + 1);
kit.expect(
	'the hold wraps to the first row and goes on to the fifth',
	menuActive(),
	5,
);
kit.check('the wrap snaps the list to the top', snap !== -1);
kit.check(
	'no pre-wrap position is written after the snap',
	snap !== -1 && afterSnap.every((top) => top <= centre + 1),
	`before the hold ${preWrapScroll.toFixed(0)}, after the snap: ${afterSnap.map((top) => top.toFixed(0)).join(' ')}`,
);
kit.check(
	'the scroll only moves forward after the snap',
	snap !== -1 && reversals(afterSnap).length === 0,
	afterSnap.map((top) => top.toFixed(0)).join(' '),
);
kit.check(
	'the hold ends at the centre target of the row it stopped on',
	Math.abs(menuScroll() - centre) <= 3,
	`${menuScroll().toFixed(1)} vs ${centre.toFixed(1)}`,
);
kit.check(
	'a drain across the wrap runs at most 1 layout pass',
	Math.max(...wrapped.drains.map((entry) => entry.passes)) <= 1,
	`worst ${Math.max(...wrapped.drains.map((entry) => entry.passes))}`,
);

// The wrap's keys back to back, with one draw part way: the draw queues change events of the travel the earlier keys started, and they reach JS after the wrap has snapped the list to the top. They must not write their older position back.
await kit.press('Home');
await kit.settle(400);
for (let down = 0; down < menuRows.length - 7; down++) {
	renderer.simulateKeystrokes('ArrowDown');
	await sleep(20);
}
await kit.settle(600);
const raceStart = menuActive();
const raceMark = writes.length;
renderer.setInlineDraws(false);
for (let press = 1; press <= 7; press++) {
	native.simulateKeyDown('ArrowDown', press > 1);
	if (press === 3) renderer.drawFrame();
}
renderer.dispatchNativeEvents();
for (let frame = 0; frame < 20; frame++) {
	renderer.dispatchNativeEvents();
	await Promise.resolve();
	renderer.drawFrame();
	await sleep(16);
}
native.simulateKeyUp('ArrowDown');
renderer.setInlineDraws(true);
await kit.settle(300);
const raceWrites = writes
	.slice(raceMark)
	.filter((write) => write.id === menuList.id)
	.map((write) => write.top);
kit.expect(
	'the back-to-back run wraps from the last row to the first',
	[raceStart, menuActive()],
	[menuRows.length - 7, 0],
);
kit.check(
	'a change event queued before the wrap does not write the old position back',
	raceWrites.length > 0 &&
		raceWrites.slice(raceWrites.indexOf(0)).every((top) => top === 0),
	raceWrites.map((top) => top.toFixed(0)).join(' '),
);

// ─── A tab click keeps the keyboard in the field ─────────────────────────────

await kit.click('site-menu-tab-page');
kit.check('tab click switches to Pages', tabState() === 'page', tabState());
const focused = focusedTestId();
kit.check(
	'the field keeps focus after a tab click',
	focused === 'site-menu-input',
	focused,
);
await kit.press('ArrowRight');
kit.check(
	'right after a tab click moves to Settings',
	tabState() === 'setting',
	tabState(),
);

// ─── The scrim finishes its fade ─────────────────────────────────────────────

await kit.press('Escape');
await kit.settle(400);
kit.check('escape closes the menu', !isOpen());
await kit.press(`${mod}+k`);
await kit.settle(500);
renderer.simulateKeystrokes('Escape');
const closedAt = performance.now();
while (isOpen() && performance.now() - closedAt < 1000) {
	renderer.flush();
	renderer.dispatchNativeEvents();
	await sleep(2);
}
const unmountMs = performance.now() - closedAt;
// The scrim's exit tween (`slowExit`) runs 160 ms.
kit.check(
	"the layer outlives the scrim's 160 ms exit",
	unmountMs >= 160,
	`${unmountMs.toFixed(0)} ms`,
);

// ─── The home hero ───────────────────────────────────────────────────────────

await kit.click('nav-showcase');
// The page keeps the scroll position the list checks left it at.
renderer.nativeSimulateScrollWheel(700, 400, 0, -10000);
await kit.settle(300);
await navigator.clipboard.writeText('untouched');
await kit.click('hero-copy');
const copied = await navigator.clipboard.readText();
kit.check(
	'Copy install prompt writes the starter prompt',
	copied.startsWith('Start a new React app with Fluid Functionalism'),
	JSON.stringify(copied.slice(0, 50)),
);

// ─── Entering the Command Menu page ──────────────────────────────────────────

// Forced full-tree layout passes on page entry blocked the real window 1 to 1.5 s.
const ENTRY_PASS_BUDGET = 21;
const QUIET_FRAMES = 30;
const MAX_FRAMES = 300;
const framesDrawn = () =>
	renderer.getPaintedFrameCount() + renderer.getPatchCounters().patchedFrames;
/** One display-link wake of a real window: events reach JS, then it draws if something is dirty. */
const wake = async () => {
	await sleep(HELD_FRAME_MS);
	renderer.dispatchNativeEvents();
	renderer.drawFrame();
};
/** Wakes until `QUIET_FRAMES` in a row draw nothing, and returns what that cost. The motion clock runs: held, every frame is dirty. */
const runUntilQuiet = async (what: string) => {
	const passes = renderer.getLayoutPassCount();
	const drawn = framesDrawn();
	let quiet = 0;
	let wakes = 0;
	let last = drawn;
	while (quiet < QUIET_FRAMES) {
		if (wakes === MAX_FRAMES)
			throw new Error(`the window never settled ${what}`);
		await wake();
		wakes++;
		const now = framesDrawn();
		quiet = now === last ? quiet + 1 : 0;
		last = now;
	}
	return {
		passes: renderer.getLayoutPassCount() - passes,
		drawn: framesDrawn() - drawn,
	};
};
/** The showcase animates without end, so a scenario that starts there cannot wait for quiet. */
const wakeFor = async (ms: number) => {
	for (const end = performance.now() + ms; performance.now() < end; )
		await wake();
};
const pressKey = async (name: string) => {
	native.simulateKeyDown(name);
	renderer.dispatchNativeEvents();
	native.simulateKeyUp(name);
	await Promise.resolve();
};
/** Opens the site menu, filters to `query` and returns with the window in a real window's draw mode: no screen reader, draws only on a display-link wake. */
const openMenuOn = async (query: string) => {
	renderer.setInlineDraws(true);
	renderer.setA11yActive(true);
	renderer.simulateKeystrokes(`${mod}+k`);
	await kit.settle(400);
	// The checks above leave the menu on its Settings tab.
	await kit.click('site-menu-tab-all');
	for (const letter of query) renderer.simulateKeystrokes(letter);
	await kit.settle(300);
	renderer.setA11yActive(false);
	renderer.setInlineDraws(false);
	await wakeFor(400);
};

await kit.click('nav-introduction');
renderer.setA11yActive(false);
renderer.setInlineDraws(false);
await runUntilQuiet('after opening Introduction');
kit.check(
	'the entry scenario starts off the Command Menu page',
	!kit.exists('details-list'),
);

await openMenuOn('command');
kit.check(
	'the Command Menu row is listed',
	kit.exists('site-menu-row-command-menu'),
);
await pressKey('Enter');
const entry = await runUntilQuiet('after entering the Command Menu');
console.log(
	`entry: ${entry.passes} layout passes, ${entry.drawn} frames drawn`,
);
kit.check(
	'the Command Menu page is on screen after Enter',
	kit.exists('details-list'),
);
kit.check(
	`entering the page costs at most ${ENTRY_PASS_BUDGET} layout passes`,
	entry.passes <= ENTRY_PASS_BUDGET,
	`${entry.passes} passes`,
);

// Nothing runs after the page has settled.
const idleMark = {
	passes: renderer.getLayoutPassCount(),
	drawn: framesDrawn(),
};
await wakeFor(2000);
const idlePasses = renderer.getLayoutPassCount() - idleMark.passes;
const idleDrawn = framesDrawn() - idleMark.drawn;
console.log(`idle: ${idlePasses} layout passes, ${idleDrawn} frames drawn`);
kit.check(
	'2 s without input run no layout pass',
	idlePasses === 0,
	`${idlePasses} passes`,
);
kit.check(
	'2 s without input draw no frame',
	idleDrawn === 0,
	`${idleDrawn} frames`,
);

await openMenuOn('');
await pressKey('ArrowDown');
const arrow = await runUntilQuiet('after ArrowDown');
console.log(
	`arrow: ${arrow.passes} layout passes, ${arrow.drawn} frames drawn`,
);
kit.check(
	'one ArrowDown in the palette costs at most 1 layout pass',
	arrow.passes <= 1,
	`${arrow.passes} passes`,
);
renderer.setInlineDraws(true);
renderer.setA11yActive(true);

kit.finish();
