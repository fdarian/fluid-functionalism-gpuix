/**
 * Input to a window that has gone fully idle still wakes JS and reaches its handler (gpuix #93, #95).
 *
 *   bun scripts/check-idle-input.tsx
 *
 * Opens the Command Menu page, runs gpuix's wake-driven frame loop (`startFrameLoop`, no timer), waits
 * until the window makes no wake at all, then posts a mouse move, a wheel, a click and a key down through
 * AppKit's own queue (`postNativeEvent`). Each must wake the loop and show its effect on the menu without
 * anything else waking JS. A last control removes the wake callback and posts again: the event stays
 * queued, so the passes above are the wake's and not a pump hidden in the harness.
 *
 * Without the NSEventThread observer in gpuix (the #93 fix) the first post never wakes and this fails.
 */

import { startFrameLoop } from '@ghia/native/runtime';
import { createCheck } from './check-kit';

const kit = await createCheck('command-menu');
const renderer = kit.renderer;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

await kit.scrollIntoView('details-input');

// The window's startup work wakes the loop in bursts for about 5 s, as a live window does.
const SETTLE_AFTER_START_MS = 7000;
const QUIET_MS = 800;
const IDLE_MS = 2000;
const EFFECT_TIMEOUT_MS = 500;

const wakes: number[] = [];
const startedAt = performance.now();
const loop = startFrameLoop({
	requiresTick: () => renderer.requiresTick(),
	tick: () => renderer.tick(),
	setFrameWakeCallback: (callback) =>
		renderer.setFrameWakeCallback(
			callback &&
				(() => {
					wakes.push(performance.now());
					callback();
				}),
		),
});

async function waitUntilIdle() {
	for (;;) {
		const now = performance.now();
		const last = wakes.length === 0 ? startedAt : wakes[wakes.length - 1];
		if (now - last >= QUIET_MS && now - startedAt >= SETTLE_AFTER_START_MS)
			return;
		if (now - startedAt > 30_000)
			throw new Error('the window made wakes for 30 s and never went idle');
		await sleep(20);
	}
}

const rowId = (testId: string) => {
	const id = kit.element(testId).customProps?.id;
	if (typeof id !== 'string') throw new Error(`${testId} has no id`);
	return id;
};

/** The author id of the input's `aria-activedescendant`, which is where the menu's highlight is. */
function activeRow() {
	const nodes = renderer.getA11yTree().nodes ?? {};
	const authorOf = new Map<string, string>();
	for (const [key, node] of Object.entries(nodes)) {
		if (node.aria?.author_id !== undefined)
			authorOf.set(key, node.aria.author_id);
	}
	const input = rowId('details-input');
	for (const node of Object.values(nodes)) {
		if (node.aria?.author_id !== input) continue;
		const active = node.aria.active_descendant;
		return active === undefined ? null : (authorOf.get(active) ?? active);
	}
	throw new Error('no accessibility node for the details input');
}

function listOffset() {
	const offset = renderer.getScrollOffset(kit.element('details-list').id);
	if (offset === null) throw new Error('the details list has no scroll offset');
	return offset[1];
}

interface Post {
	kind: string;
	/** Read when the event is posted: an earlier post may have scrolled the page. */
	at: () => { x: number; y: number };
	done: () => boolean;
}

// The wheel goes last: it scrolls the page past the input once the list is at its end.
const posts: Post[] = [
	{
		kind: 'click',
		at: () => kit.center('details-input'),
		done: () =>
			renderer.getFocusedElementId() === kit.element('details-input').id,
	},
	{
		kind: 'keyDown',
		at: () => kit.center('details-input'),
		// "a" filters the list, and Home matches nothing with an "a".
		done: () => !kit.exists('details-row-home'),
	},
	{
		kind: 'mouseMove',
		at: () => kit.center('details-row-theme'),
		done: () => activeRow() === rowId('details-row-theme'),
	},
	{
		kind: 'scroll',
		at: () => kit.center('details-list'),
		done: () => listOffset() > 0,
	},
];

await waitUntilIdle();
const idleFrom = wakes.length;
await sleep(IDLE_MS);
kit.expect(`no wake in ${IDLE_MS / 1000} s idle`, wakes.length - idleFrom, 0);

kit.check('the menu starts with its Home row', kit.exists('details-row-home'));
const before = {
	active: activeRow(),
	offset: listOffset(),
	focused: renderer.getFocusedElementId(),
};
kit.check(
	'each effect starts unmet',
	before.active !== rowId('details-row-theme') &&
		before.offset === 0 &&
		before.focused !== kit.element('details-input').id,
	JSON.stringify(before),
);

for (const post of posts) {
	await waitUntilIdle();
	const wakesBefore = wakes.length;
	const point = post.at();
	const postedAt = performance.now();
	renderer.postNativeEvent(post.kind, point.x, point.y);
	let effectAt: number | null = null;
	while (performance.now() - postedAt < EFFECT_TIMEOUT_MS) {
		await sleep(2);
		renderer.flush();
		if (post.done()) {
			effectAt = performance.now();
			break;
		}
	}
	const woke = wakes.length > wakesBefore;
	kit.check(
		`${post.kind} to the idle window wakes JS`,
		woke,
		woke
			? `${(wakes[wakesBefore] - postedAt).toFixed(1)} ms`
			: `no wake in ${EFFECT_TIMEOUT_MS} ms`,
	);
	kit.check(
		`${post.kind} reaches its handler without another wake`,
		effectAt !== null,
		effectAt === null
			? `no effect in ${EFFECT_TIMEOUT_MS} ms`
			: `${(effectAt - postedAt).toFixed(1)} ms`,
	);
}

// Control: with no wake callback nothing ticks, so the event waits in AppKit's queue.
loop.stop();
const control = kit.center('details-row-support');
const controlFrom = wakes.length;
renderer.postNativeEvent('mouseMove', control.x, control.y);
await sleep(EFFECT_TIMEOUT_MS);
renderer.flush();
kit.check(
	'control: without the wake callback the posted event is not delivered',
	activeRow() !== rowId('details-row-support') && wakes.length === controlFrom,
	`active ${activeRow()}, ${wakes.length - controlFrom} wakes`,
);

await kit.finish();
