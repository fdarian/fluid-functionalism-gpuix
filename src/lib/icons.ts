import { createSignal } from "solid-js";
import { hugeicons } from "#/lib/icons/hugeicons";
import { lucide } from "#/lib/icons/lucide";
import { phosphorLight } from "#/lib/icons/phosphor-light";
import { phosphorRegular } from "#/lib/icons/phosphor-regular";
import { tabler } from "#/lib/icons/tabler";
import { untitledui } from "#/lib/icons/untitledui";

export type IconName = keyof typeof lucide;

export type IconLibrary =
	| "lucide"
	| "tabler"
	| "phosphor"
	| "hugeicons"
	| "untitledui";

/** The Icons row of the customise card, in the site's order and spelling. */
export const ICON_LIBRARIES = [
	{ value: "lucide", label: "Lucide", icon: "palette" },
	{ value: "tabler", label: "Tabler", icon: "palette" },
	{ value: "phosphor", label: "Phosphor", icon: "palette" },
	{ value: "hugeicons", label: "HugeIcons", icon: "palette" },
	{ value: "untitledui", label: "Untitled UI", icon: "palette" },
] as const satisfies readonly {
	value: IconLibrary;
	label: string;
	icon: IconName;
}[];

export const [iconLibrary, setIconLibrary] =
	createSignal<IconLibrary>("lucide");

/** A glyph a component defines itself: lucide's inner markup, e.g. `defineIcon('<path d="m6 9 6 6 6-6"/>')`. It stays lucide whichever library is picked. */
export interface IconNodes {
	readonly nodes: string;
}

export function defineIcon(nodes: string): IconNodes {
	return { nodes };
}

/** What `<Icon name>` and the components' icon props accept: a shared glyph by name, or one defined next to the component. */
export type IconRef = IconName | IconNodes;

function stroked(nodes: string, strokeWidth: number) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${nodes}</svg>`;
}

/** Phosphor draws filled paths per weight, so the stroke width picks one: the site maps 1.75 and up to regular, the rest to light. */
function phosphorSource(name: IconName, strokeWidth: number) {
	const nodes = (strokeWidth >= 1.75 ? phosphorRegular : phosphorLight)[name];
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor">${nodes}</svg>`;
}

const sources: Record<
	IconLibrary,
	(name: IconName, strokeWidth: number) => string
> = {
	lucide: (name, strokeWidth) => stroked(lucide[name], strokeWidth),
	tabler: (name, strokeWidth) => stroked(tabler[name], strokeWidth),
	phosphor: phosphorSource,
	hugeicons: (name, strokeWidth) => stroked(hugeicons[name], strokeWidth),
	untitledui: (name, strokeWidth) => stroked(untitledui[name], strokeWidth),
};

/** Whether the glyph is stroked shapes, so `iconNodes` can draw it: phosphor's named glyphs are filled paths, a component's own `defineIcon` glyph is always stroked. */
export function hasStrokeNodes(icon: IconRef) {
	return typeof icon !== "string" || iconLibrary() !== "phosphor";
}

/**
 * The glyph's stroked inner markup, for drawing shapes one by one (`Icon easeStroke`).
 * Follows the picked library. Phosphor is filled paths with no stroke to ease, so a
 * named glyph throws there: check `hasStrokeNodes` first and draw `iconSource` instead.
 */
export function iconNodes(icon: IconRef) {
	if (typeof icon !== "string") return icon.nodes;
	switch (iconLibrary()) {
		case "lucide":
			return lucide[icon];
		case "tabler":
			return tabler[icon];
		case "hugeicons":
			return hugeicons[icon];
		case "untitledui":
			return untitledui[icon];
		case "phosphor":
			throw new Error(`phosphor has no stroked nodes for "${icon}"`);
	}
}

/**
 * The glyph as an SVG string, from the picked library. `currentColor` resolves
 * to the element's `style.color`. Reads `iconLibrary()`, so an icon that calls
 * this inside a prop or an effect follows the Icons row.
 */
export function iconSource(icon: IconRef, strokeWidth: number) {
	if (typeof icon !== "string") return stroked(icon.nodes, strokeWidth);
	return sources[iconLibrary()](icon, strokeWidth);
}
