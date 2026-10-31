import type { DomEvent } from '@ghia/solid';
import { createSignal } from 'solid-js';
import { toOffsetPx } from '#/lib/offset';

/**
 * A box whose height springs to its content's measured pixel height, as the
 * source's collapses do: they animate to an `offsetHeight` a ResizeObserver
 * keeps current, never to `height: "auto"`, which framer resolves from the
 * transformed size under a scaled ancestor (source `sidebar-core.tsx:1279-1281`,
 * `input-message.tsx:41-50`). gpuix animates `height: "auto"` itself; the port
 * keeps the source's measured number, rounded to a whole pixel as Chrome rounds
 * `offsetHeight` (gpuix lays out fractional heights). The DOM version puts a
 * ResizeObserver on the box; this is `onLayout`, which fires after the first
 * paint and on every size change: put `onLayout={measured.onLayout}` on the
 * content box.
 *
 * `onLayout` is silent while the box sits in culled content
 * (`content-visibility: hidden`, `createCulling`), even as a forced read lays
 * it out, so the last height stays known until the region shows again.
 */
export function createMeasuredHeight() {
	const [height, setHeight] = createSignal<number>();
	return {
		onLayout(event: DomEvent) {
			if (event.height === undefined) {
				throw new Error('onLayout reported no height');
			}
			setHeight(toOffsetPx(event.height));
		},
		height,
	};
}
