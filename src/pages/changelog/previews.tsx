import type { JSX } from 'solid-js';
import { previewMap } from '#/home/bento-previews';
import { PlainVsFluidPreview } from '#/pages/fluid-hover/plain-vs-fluid';
import { ToolbarRows } from '#/pages/sizes/toolbar';
import { TabsExample } from '#/pages/skill/tabs-example';

/**
 * What a New entry shows under its sentence: the live component, the same
 * preview its Showcase tile renders, or the system page's own demo. A slug
 * with neither (a page-less change) shows its text alone.
 */

/** System pages have no Showcase tile: their own page's demo stands in. */
const SYSTEM_PREVIEWS: Record<string, () => JSX.Element> = {
	'fluid-hover': PlainVsFluidPreview,
	sizes: ToolbarRows,
	skill: TabsExample,
};

export function previewFor(slug: string): (() => JSX.Element) | undefined {
	return SYSTEM_PREVIEWS[slug] ?? previewMap[slug];
}

/** Stage padding by slug (x, y), where a preview needs more room than the default 24 x 48 leaves. The Showcase grid's overrides, same reasons. */
export const STAGE_PADDING: Record<string, { x: number; y: number }> = {
	sidebar: { x: 16, y: 32 },
	card: { x: 24, y: 20 },
	'command-menu': { x: 24, y: 32 },
	'fluid-hover': { x: 24, y: 32 },
	// The toolbar does not shrink and is 570px wide here (the port's Select trigger is 16px wider than the source's), in a stage 574px inside its border.
	sizes: { x: 0, y: 32 },
	skill: { x: 16, y: 24 },
};

export const DEFAULT_STAGE_PADDING = { x: 24, y: 48 };

/** The previews that animate by themselves, and so read `usePreviewPlayback()`: the changelog gives these a Play / Pause button. */
export const ANIMATED_PREVIEWS: ReadonlySet<string> = new Set([
	'carousel-dots',
	'fluid-hover',
	'skill',
]);
