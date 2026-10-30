import { createComputed, onCleanup } from 'solid-js';
import { useOnScreen } from './cull';

const FRAME_MS = 16;
/** A frame longer than this is a stall (a hidden window, a long task), not playback. */
const MAX_FRAME_MS = 100;

type Subscriber = {
	callback: (dt: number, now: number) => void;
	shown: boolean;
};

const subscribers = new Set<Subscriber>();
let shownCount = 0;
let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;

function tick() {
	const now = performance.now();
	const dt = now - last;
	last = now;
	if (dt > MAX_FRAME_MS) return;
	for (const subscriber of subscribers) {
		if (subscriber.shown) subscriber.callback(dt, now);
	}
}

/** The timer runs only while a shown subscriber exists; restarting it resets `last`, so the time spent stopped is never delivered as `dt`. */
function reconcile() {
	if (shownCount > 0 && timer === undefined) {
		last = performance.now();
		timer = setInterval(tick, FRAME_MS);
	} else if (shownCount === 0 && timer !== undefined) {
		clearInterval(timer);
		timer = undefined;
	}
}

function setShown(subscriber: Subscriber, shown: boolean) {
	if (subscriber.shown === shown) return;
	subscriber.shown = shown;
	shownCount += shown ? 1 : -1;
	reconcile();
}

/**
 * Calls `callback(dt, now)` about every 16 ms, with `dt` the ms since the last
 * frame. Loops gpuix can run natively (a motion value's `animate`, `repeat`,
 * CSS keyframes) stay off it. Two still use it: the fluid-hover lists demo,
 * which re-measures its rows each frame while a sub-menu's spring settles (at
 * most `TRACK_MS`); and the cost meter, which reads this clock's gaps as its
 * stall probe. The
 * timer runs only while something is subscribed and shown, and a subscription
 * ends with the owner that made it. A subscriber inside a culled region
 * (`OnScreenContext`) is skipped while that region is far: every signal a
 * hidden loop sets would still redraw the window. It resumes as after a stall,
 * with the next `dt` counting from the resume. A stalled frame is skipped for
 * everyone rather than delivered as one huge `dt`. Returns a function that ends
 * the subscription early.
 */
export function onFrame(callback: (dt: number, now: number) => void) {
	const onScreen = useOnScreen();
	const subscriber: Subscriber = { callback, shown: false };
	subscribers.add(subscriber);
	createComputed(() => {
		if (subscribers.has(subscriber)) setShown(subscriber, onScreen());
	});
	const stop = () => {
		if (!subscribers.delete(subscriber)) return;
		if (subscriber.shown) {
			subscriber.shown = false;
			shownCount--;
		}
		reconcile();
	};
	onCleanup(stop);
	return stop;
}
