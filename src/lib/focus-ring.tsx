import { type DomEvent, motion } from '@ghia/solid';
import { createPresence } from 'ghia-base-ui/internals';
import { createComputed, createSignal, Show } from 'solid-js';
import type { FluidHover, ItemRect } from './fluid-hover';
import { POPUP_EXIT_MS } from './popup-timing';
import { color, motion as tween } from './theme';

/** The ring's box rides `spring.fast` but its opacity is a plain tween (`registry/base/accordion.tsx:465-468`). */
const ENTER_FADE = { duration: 0.08 } as const;

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
		/** The ringed row, or `null` while no row shows the ring. */
		index,
		/** The measured box of the ringed row, or `null` while no row shows the ring. */
		rect(): ItemRect | null {
			const current = index();
			if (current === null || !hover.isMeasured()) return null;
			return hover.rects()[current] ?? null;
		},
		focus(row: number, event: DomEvent) {
			if (event.focusVisible === undefined) {
				throw new Error('A focus event carries no focusVisible');
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

/** What a `FocusRing` draws around: `createFocusRing`, or any list whose highlight is virtual and decides for itself when keyboard navigation owns it. */
export interface FocusRingSource {
	rect(): ItemRect | null;
}

/**
 * FF's shared keyboard focus ring: one 1px outline `OUTSET` px outside the
 * focused row that springs between rows. It shows only for keyboard focus,
 * appears in place (no travel from where it last was) and fades out ~60 ms
 * after the last row loses focus, so a blur followed at once by the next
 * row's focus is a glide, not a fade and reappearance.
 *
 * It is `z-20` as in the source, above the rows' `z-10`, wherever it sits
 * among them.
 */
export function FocusRing(props: {
	ring: FocusRingSource;
	/** `shape.focusRing`, or `radius.focusRing` for a popup the source pins to rounded. */
	radius: number;
	testId?: string;
	/** `false` snaps to the new rect: a reflow moved the row, not the focus. */
	travel?: () => boolean;
}) {
	const presence = createPresence(POPUP_EXIT_MS);
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
							? {
									...(props.travel?.() === false ? tween.snap : tween.fast),
									opacity: ENTER_FADE,
								}
							: tween.fastExit
					}
					style={{
						position: 'absolute',
						zIndex: 20,
						borderRadius: props.radius,
						borderStyle: 'solid',
						borderWidth: 1,
						borderColor: color.focusRing,
						pointerEvents: 'none',
					}}
				/>
			)}
		</Show>
	);
}
