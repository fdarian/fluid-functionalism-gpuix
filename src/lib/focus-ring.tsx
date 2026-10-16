import { type EventPayload, motion } from "@gpuix/solid";
import { createComputed, createSignal, Show } from "solid-js";
import type { FluidHover, ItemRect } from "./fluid-hover";
import { createPresence } from "./presence";
import { color, radius, motion as tween } from "./theme";

/** How far the ring stands off the row: its box is the row grown by this on every side. */
const OUTSET = 2;

/**
 * Which row of a list shows the keyboard focus ring. Rows report their focus
 * and blur here; only focus that `:focus-visible` would match counts, so a
 * click on a row clears the ring instead of drawing it.
 */
export function createFocusRing(hover: FluidHover) {
	const [index, setIndex] = createSignal<number | null>(null);
	return {
		/** The measured box of the ringed row, or `null` while no row shows the ring. */
		rect(): ItemRect | null {
			const current = index();
			if (current === null || !hover.isMeasured()) return null;
			return hover.rects()[current] ?? null;
		},
		focus(row: number, event: EventPayload) {
			if (event.focusVisible === undefined) {
				throw new Error("A focus event carries no focusVisible");
			}
			setIndex(event.focusVisible ? row : null);
		},
		/** A row losing focus clears the ring only if it still owns it: gpuix dispatches blur before the next row's focus. */
		blur(row: number) {
			if (index() === row) setIndex(null);
		},
	};
}

export type FocusRingState = ReturnType<typeof createFocusRing>;

/**
 * FF's shared keyboard focus ring: one 1px outline `OUTSET` px outside the
 * focused row that springs between rows. It shows only for keyboard focus,
 * appears in place (no travel from where it last was) and fades out ~60 ms
 * after the last row loses focus, so a blur followed at once by the next
 * row's focus is a glide, not a fade and reappearance.
 *
 * Place it after the list's fills: gpuix has no zIndex, so it paints over
 * whatever comes before it and under whatever follows.
 */
export function FocusRing(props: {
	ring: FocusRingState;
	testId?: string;
	/** `false` snaps to the new rect: a reflow moved the row, not the focus. */
	travel?: () => boolean;
}) {
	const presence = createPresence();
	presence.follow(() => props.ring.rect() !== null);

	// The exit fades in place, so the last rect outlives the ring's own.
	const [lastRect, setLastRect] = createSignal<ItemRect>();
	createComputed(() => {
		const rect = props.ring.rect();
		if (rect !== null) setLastRect(rect);
	});

	return (
		<Show when={presence.mounted() ? lastRect() : undefined}>
			{(rect: () => ItemRect) => (
				<motion.div
					testId={props.testId}
					initial={false}
					animate={{
						opacity: presence.open() ? 1 : 0,
						left: rect().left - OUTSET,
						top: rect().top - OUTSET,
						width: rect().width + OUTSET * 2,
						height: rect().height + OUTSET * 2,
					}}
					transition={
						presence.open()
							? props.travel?.() === false
								? tween.snap
								: tween.fast
							: tween.fastExit
					}
					style={{
						position: "absolute",
						borderRadius: radius.focusRing,
						borderWidth: 1,
						borderColor: color.focusRing,
						pointerEvents: "none",
					}}
				/>
			)}
		</Show>
	);
}
