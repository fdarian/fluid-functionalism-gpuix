import type { BoxShadow } from '@gpuix/solid';

/**
 * The press effect of button.tsx: the surface sits 1px inside the button's
 * bounds and a same-colour spread fills it back out; pressing collapses the
 * spread. gpuix paints a shadow only outside the border box, as CSS does, so
 * the background fills the box and the spread the ring around it: a
 * translucent fill does not double up.
 */
export function fill(
	fillColor: string,
	spread: number,
): { backgroundColor: string; boxShadow: BoxShadow } {
	return {
		backgroundColor: fillColor,
		boxShadow: {
			offsetX: 0,
			offsetY: 0,
			blurRadius: 0,
			spreadRadius: spread,
			color: fillColor,
		},
	};
}
