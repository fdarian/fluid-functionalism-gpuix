import type { BoxShadow } from "@gpuix/solid";

/**
 * The press effect of button.tsx: the surface sits 1px inside the button's
 * bounds and a same-colour spread fills it back out; pressing collapses the
 * spread. gpuix paints a shadow under its element rather than around it, so a
 * translucent fill must be the shadow alone: a background on top of it would
 * double up.
 */
export function fill(fillColor: string, spread: number): BoxShadow {
	return {
		offsetX: 0,
		offsetY: 0,
		blurRadius: 0,
		spreadRadius: spread,
		color: fillColor,
	};
}
