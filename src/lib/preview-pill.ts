import { type Accessor, createMemo } from 'solid-js';
import type { ItemRect } from './fluid-hover';

export interface PreviewPill {
	rect: ItemRect;
	/** `false` while the pill is faded out (resting on the selected tab, or the pointer left). */
	visible: boolean;
	/** Steps each time a hover starts from rest. The pill is mounted per step, born at the selected tab, as the source's `AnimatePresence` mounts it. */
	mount: number;
}

/**
 * Where the faint preview pill of tabs and tabs-subtle sits. Hovering another
 * tab it is on that tab. With the pointer over the selected tab it fades where
 * it was, and with the pointer gone it glides back into the selected pill.
 * The next hover then mounts a fresh pill at the selected tab: the source
 * unmounts the pill after either exit, so it never resumes from an old tab.
 */
export function createPreviewPill(input: {
	selectedRect: Accessor<ItemRect | undefined>;
	selectedIndex: Accessor<number>;
	/** The tab under the pointer or focus. */
	activeIndex: Accessor<number | null>;
	rectOf: (index: number | null) => ItemRect | undefined;
	mouseInside: Accessor<boolean>;
}): Accessor<PreviewPill | undefined> {
	return createMemo<PreviewPill | undefined>((previous) => {
		const selected = input.selectedRect();
		if (selected === undefined) return undefined;
		const mount = previous?.mount ?? 0;
		const active = input.activeIndex();
		if (active !== null && active !== input.selectedIndex()) {
			const rect = input.rectOf(active);
			if (rect === undefined) return previous;
			return {
				rect,
				visible: true,
				mount: previous === undefined || previous.visible ? mount : mount + 1,
			};
		}
		if (input.mouseInside() && previous !== undefined) {
			return { rect: previous.rect, visible: false, mount };
		}
		return { rect: selected, visible: false, mount };
	});
}
