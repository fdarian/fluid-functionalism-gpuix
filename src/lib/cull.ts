import { type HostElement, IntersectionObserver } from '@gpuix/solid';
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	on,
	onCleanup,
	useContext,
} from 'solid-js';
import { sizeChoice } from './theme';

/** The scroller a page's content lives in: culled regions measure their distance from it. */
export const PageScrollerContext =
	createContext<Accessor<HostElement | undefined>>();

/** Runs a listener on each scroll of the page scroller, until the returned function removes it. The scroller's own `onScroll` is the only way to hear it: scroll events do not bubble. */
export const PageScrollContext =
	createContext<(listener: () => void) => () => void>();

/**
 * Whether the subtree is shown: false inside any culled region that is far
 * from the scroller. A hidden subtree keeps its loops mounted but builds
 * nothing, yet every signal a loop sets still redraws the whole window, so
 * `onFrame` and timer loops read this and hold still while it is false.
 * Separate from `PreviewPlaybackContext`, which is the changelog's own
 * in-view-and-not-paused rule for a preview's script.
 */
export const OnScreenContext = createContext<Accessor<boolean>>(() => true);

export function useOnScreen(): Accessor<boolean> {
	return useContext(OnScreenContext);
}

const OVERSCAN = '25% 0px';

/**
 * gpuix lays out and paints every element, including those a scroller clips
 * away, so a long page costs a frame several times a short page's. A region
 * more than a quarter viewport from the page scroller hides its content with
 * `display: none` (no box built for it or anything inside) and keeps the height
 * it had, so nothing shifts. The content stays mounted, so typed text and
 * selections survive a scroll away and back.
 *
 * Regions nest: a region inside a far one stops observing until the outer
 * one shows again, and keeps its own measured height meanwhile.
 *
 * Call it once per region, attach `ref` to the element whose height must hold
 * (it measures itself before `far` turns true), give that element `farHeight()`
 * while `far()`, and wrap the content in `display: far() ? 'none' : 'contents'`
 * and in `<OnScreenContext.Provider value={culling.onScreen}>`.
 */
export function createCulling() {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"A culled region must be inside the page's PageScrollerContext",
		);
	}
	const parentOnScreen = useContext(OnScreenContext);
	const [far, setFar] = createSignal(false);
	const [farHeight, setFarHeight] = createSignal<number>();
	const [observed, setObserved] = createSignal<HostElement>();

	// A far region's pinned height belongs to its old element and its old Size. Showing it lets the new element lay out at its own, and the observer made below reports it again and re-pins the height.
	createEffect(
		on([observed, sizeChoice], () => setFar(false), { defer: true }),
	);

	createEffect(() => {
		sizeChoice();
		const root = scroller();
		const target = observed();
		// Inside a culled ancestor the target has no box and reports "not intersecting", which would overwrite its measured height with 0. Observing again once the ancestor shows gives a fresh first report.
		if (root === undefined || target === undefined || !parentOnScreen()) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest.isIntersecting) {
					setFar(false);
					return;
				}
				// A target that was removed (a preview's tab swapped away), or has no box yet, reports as not intersecting too: pinning its zero height would collapse the region.
				const height = target.getBoundingClientRect().height;
				if (!target.mounted || height === 0) return;
				setFarHeight(height);
				setFar(true);
			},
			{ root, rootMargin: OVERSCAN },
		);
		observer.observe(target);
		onCleanup(() => observer.disconnect());
	});

	return {
		/** True while the region is outside the scroller's overscan: its content is hidden. */
		far,
		/** False while this region or any culled region around it is far. */
		onScreen: () => parentOnScreen() && !far(),
		/** The height the region had when it went far. */
		farHeight,
		/** A signal, so a region that remounts (a preview's Code tab and back) is observed again. */
		ref: setObserved,
	};
}

/**
 * Calls `onRatio` with how much of the element shows each time that share
 * crosses one of `thresholds` (0 to 1), as an `IntersectionObserver` reports it
 * against the window, clipped by every scroller on the way. Returns the `ref`
 * for the element; a subtree that is culled has no box and reports 0.
 */
export function observeVisibleRatio(
	thresholds: number[],
	onRatio: (ratio: number) => void,
): (element: HostElement) => void {
	const [target, setTarget] = createSignal<HostElement>();
	createEffect(() => {
		const element = target();
		if (element === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest !== undefined) onRatio(latest.intersectionRatio);
			},
			{ threshold: thresholds },
		);
		observer.observe(element);
		onCleanup(() => observer.disconnect());
	});
	return setTarget;
}
