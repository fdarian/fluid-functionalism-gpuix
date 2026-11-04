import { type DimensionValue, DismissableLayer, motion } from '@ghia/solid';
import {
	createPlacementState,
	type createPresence,
	POPUP_MARGIN,
} from 'ghia-base-ui/internals';
import { type Accessor, type JSX, Show } from 'solid-js';
import { SurfaceContext, useElevatedSurface } from './surface-context';
import { color, radius, shadow, surface, motion as tween } from './theme';

export const POPUP_OFFSET = 6;
/** Steps above its substrate a popup sits: `Elevated offset={2}` in the source. */
const POPUP_SURFACE_OFFSET = 2;

/**
 * The shared popup chrome of the combobox, select and dropdown: an `<anchored>`
 * layer under its parent, with a card two surface steps above what it opens from (surface-3 on the page), the 4px slide, the `scaleY` .96 and the fade.
 * The layer flips to the far side of the trigger when `side` has no room, and
 * the card is at least as wide as the trigger and as wide as its widest content.
 *
 * It sits in the logical subtree of its trigger, so an outside press is
 * judged on the element that holds both.
 */
export function PopupSurface(props: {
	presence: ReturnType<typeof createPresence>;
	testId?: string;
	/** The side to open on when it has room. */
	side?: 'top' | 'bottom';
	align: 'start' | 'end';
	/** The card's width. Omitted, it is as wide as its widest content; either way never narrower than the trigger. */
	width?: DimensionValue;
	/** The tallest the card gets; the room on its side caps it further. */
	maxHeight: number;
	/** Escape while this popup is the top layer. The popup joins gpuix's dismiss-layer stack, so a dialog around it stays open. */
	onDismiss: () => void;
	/** Called with the height the card may use, for a scroller inside it. */
	children: (maxHeight: Accessor<number>) => JSX.Element;
}) {
	const level = useElevatedSurface(POPUP_SURFACE_OFFSET);
	const placement = createPlacementState(props.side ?? 'bottom');
	const maxHeight = () => placement.maxHeight(props.maxHeight);
	/** The popup grows from the trigger's edge: down from above, up from below (`popupMotionClass`). `initial` reads the side once, at mount: the first open of a popup that flips starts from the side it asked for. */
	const flipped = () => placement.side() === 'top';
	const slide = () => (flipped() ? 4 : -4);
	return (
		<>
			{/* A layer only while open, not while the exit fade plays: a second Escape in that window belongs to the dialog behind. It is a sibling because the layer needs no children, only its place in the stack. */}
			<Show when={props.presence.open()}>
				<DismissableLayer onEscapeKeyDown={props.onDismiss} />
			</Show>
			<Show when={props.presence.mounted()}>
				<anchored
					side={props.side ?? 'bottom'}
					align={props.align}
					gap={POPUP_OFFSET}
					fit="flip"
					snapMargin={POPUP_MARGIN}
					constrainToAvailable
					onPlacement={placement.onPlacement}
					deferred
					priority={1}
					style={{ backgroundColor: color.transparent }}
				>
					<motion.div
						testId={props.testId}
						initial={{ opacity: 0, y: slide(), scaleY: 0.96 }}
						animate={
							props.presence.open()
								? { opacity: 1, y: 0, scaleY: 1 }
								: { opacity: 0, y: slide(), scaleY: 0.96 }
						}
						transition={props.presence.open() ? tween.fast : tween.fastExit}
						onMotionComplete={() => {
							if (!props.presence.open()) props.presence.release();
						}}
						style={{
							position: 'relative',
							transformOrigin: flipped() ? 'bottom' : 'top',
							width: props.width ?? 'max-content',
							minWidth: 'anchor-size(width)',
							maxWidth: '100%',
							display: 'flex',
							flexDirection: 'column',
							backgroundColor: surface(level),
							borderRadius: radius.container,
							boxShadow: shadow(3),
							overflow: 'hidden',
							maxHeight: maxHeight(),
						}}
					>
						<SurfaceContext.Provider value={level}>
							{props.children(maxHeight)}
						</SurfaceContext.Provider>
					</motion.div>
				</anchored>
			</Show>
		</>
	);
}
