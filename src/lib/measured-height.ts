import type { DomEvent } from '@gpuix/solid';
import { createSignal } from 'solid-js';

/**
 * A box whose height springs to its content's: gpuix cannot animate
 * `height: auto`, so the content box reports its own size and the outer box
 * tweens to that number. The DOM version puts a ResizeObserver on the box;
 * this is `onLayout`, which fires after the first paint and on every size
 * change: put `onLayout={measured.onLayout}` on the content box.
 *
 * `onLayout` is silent while the box is not painted (display: none), so the
 * last height stays known until it paints again.
 */
export function createMeasuredHeight() {
	const [height, setHeight] = createSignal<number>();
	return {
		onLayout(event: DomEvent) {
			if (event.height === undefined) {
				throw new Error('onLayout reported no height');
			}
			setHeight(event.height);
		},
		height,
	};
}
