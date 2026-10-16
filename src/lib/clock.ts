import { onCleanup } from 'solid-js';

const FRAME_MS = 16;
/** A frame longer than this is a stall (a hidden window, a long task), not playback. */
const MAX_FRAME_MS = 100;

const subscribers = new Set<(dt: number, now: number) => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;

function tick() {
	const now = performance.now();
	const dt = now - last;
	last = now;
	if (dt > MAX_FRAME_MS) return;
	for (const callback of subscribers) callback(dt, now);
}

/**
 * Calls `callback(dt, now)` about every 16 ms, with `dt` the ms since the last
 * frame. gpuix has no keyframes or repeat, so every JS-driven loop (a
 * shimmer, a spinner, an autoplay) shares this one timer. It runs only while
 * something is subscribed, and a subscription ends with the owner that made it.
 * A stalled frame is skipped for everyone rather than delivered as one huge
 * `dt`. Returns a function that ends the subscription early.
 */
export function onFrame(callback: (dt: number, now: number) => void) {
	subscribers.add(callback);
	if (timer === undefined) {
		last = performance.now();
		timer = setInterval(tick, FRAME_MS);
	}
	const stop = () => {
		subscribers.delete(callback);
		if (subscribers.size === 0 && timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	};
	onCleanup(stop);
	return stop;
}
