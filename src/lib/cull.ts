import { type HostElement, IntersectionObserver } from '@gpuix/solid';
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	onCleanup,
	useContext,
} from 'solid-js';

/** The scroller a page's content lives in: culled regions measure their distance from it. */
export const PageScrollerContext =
	createContext<Accessor<HostElement | undefined>>();

/** Runs a listener on each scroll of the page scroller, until the returned function removes it. The scroller's own `onScroll` is the only way to hear it: scroll events do not bubble. */
export const PageScrollContext =
	createContext<(listener: () => void) => () => void>();

const OVERSCAN = '25% 0px';

/**
 * gpuix lays out and paints every element, including those a scroller clips
 * away, so a long page costs a frame several times a short page's. A region
 * more than a quarter viewport from the page scroller hides its content with
 * `display: none` (no box built for it or anything inside) and keeps the height
 * it had, so nothing shifts. The content stays mounted, so typed text and
 * selections survive a scroll away and back.
 *
 * Call it once per region, attach `ref` to the element whose height must hold
 * (it measures itself before `far` turns true), give that element `farHeight()`
 * while `far()`, and wrap the content in `display: far() ? 'none' : 'contents'`.
 */
export function createCulling() {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"A culled region must be inside the page's PageScrollerContext",
		);
	}
	const [far, setFar] = createSignal(false);
	const [farHeight, setFarHeight] = createSignal<number>();
	const [observed, setObserved] = createSignal<HostElement>();

	createEffect(() => {
		const root = scroller();
		const target = observed();
		if (root === undefined || target === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest.isIntersecting) {
					setFar(false);
					return;
				}
				setFarHeight(target.getBoundingClientRect().height);
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
		/** The height the region had when it went far. */
		farHeight,
		/** A signal, so a region that remounts (a preview's Code tab and back) is observed again. */
		ref: setObserved,
	};
}
