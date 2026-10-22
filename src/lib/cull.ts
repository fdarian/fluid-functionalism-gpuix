import {
	type HostElement,
	IntersectionObserver,
	type StyleDesc,
} from '@gpuix/solid';
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

type FarSize = { width: number; height: number };

/**
 * gpuix lays out and paints every element, including those a scroller clips
 * away, so a long page costs a frame several times a short page's. A region
 * more than a quarter viewport from the page scroller gets
 * `content-visibility: hidden`: gpuix builds none of its content, and the
 * region keeps the size it was last laid out at (`contain-intrinsic-size:
 * auto`), so nothing shifts. The content stays mounted, so typed text and
 * selections survive a scroll away and back.
 *
 * Regions nest: a region inside a far one stops observing until the outer
 * one shows again, and keeps its own remembered size meanwhile.
 *
 * Call it once per region and attach `ref` to the `div` that holds the region
 * (gpuix skips the content of `div`, `text`, `label`, `form` and block `span`
 * only), spread `style()` into its style, and wrap the content in
 * `<OnScreenContext.Provider value={culling.onScreen}>`. `hidden` and
 * `visible` bring the element's own padding and border into its size, so the
 * element's layout (padding, gap) stays on it.
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
	const [farSize, setFarSize] = createSignal<FarSize>();
	const [observed, setObserved] = createSignal<HostElement>();

	// A far region's remembered size belongs to its old element and its old Size. Showing it lets the new element lay out at its own, and the observer made below reports it again and hides it.
	createEffect(
		on(
			[observed, sizeChoice],
			() => {
				setFar(false);
			},
			{ defer: true },
		),
	);

	createEffect(() => {
		sizeChoice();
		const root = scroller();
		const target = observed();
		// Inside a culled ancestor the target has no box and reports "not intersecting", which would hide it at a size of 0. Observing again once the ancestor shows gives a fresh first report.
		if (root === undefined || target === undefined || !parentOnScreen()) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest.isIntersecting) {
					setFar(false);
					return;
				}
				// A target that was removed (a preview's tab swapped away), or has no box yet, reports as not intersecting too: hiding it at a zero size would collapse the region. The report's rect comes from the frame's own registry, so reading it forces no layout pass.
				const rect = latest.boundingClientRect;
				if (!target.mounted || rect.height === 0) return;
				setFarSize({ width: rect.width, height: rect.height });
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
		/**
		 * The style that hides the region while it is far. Both axes of `containIntrinsicSize` are written (one value would also set the width); `auto` makes the size the region was last laid out at win over the report's border-box rect, which only stands in for a region never laid out, and gpuix adds the padding and border to it.
		 */
		style: (): StyleDesc => {
			const size = farSize();
			if (!far() || size === undefined) return { contentVisibility: 'visible' };
			return {
				contentVisibility: 'hidden',
				containIntrinsicSize: `auto ${size.width}px auto ${size.height}px`,
			};
		},
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
