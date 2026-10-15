import {
	type AnchoredPlacementEvent,
	DismissableLayer,
	type DimensionValue,
	type EventPayload,
	type HostElement,
	motion,
} from "@gpuix/solid";
import { type Accessor, createSignal, type JSX, Show } from "solid-js";
import type { createPresence } from "./presence";
import { color, radius, shadow3, motion as tween } from "./theme";

export const POPUP_OFFSET = 6;
/** The gap a popup keeps from the window edge: Base UI's default collision padding. */
export const POPUP_MARGIN = 5;

/** Whether a press landed inside any of the elements' painted boxes. An unmounted or unpainted element cannot have been pressed. */
export function isInside(
	event: EventPayload,
	elements: readonly (HostElement | undefined)[],
) {
	if (event.x === undefined || event.y === undefined) {
		throw new Error("Outside press without coordinates");
	}
	const x = event.x;
	const y = event.y;
	return elements.some((element) => {
		if (element === undefined || !element.mounted) return false;
		const box = element.getBoundingClientRect();
		return (
			x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
		);
	});
}

type Side = AnchoredPlacementEvent["side"];

/**
 * What `<anchored fit="flip">` reports about where it ended up: the side it
 * opened on, which may differ from the preferred one, and the height left on
 * that side.
 */
export function createPlacementState(preferred: Side) {
	const [side, setSide] = createSignal<Side>(preferred);
	const [availableHeight, setAvailableHeight] = createSignal(
		Number.POSITIVE_INFINITY,
	);
	return {
		side,
		/** `cap`, or the room on the popup's side if that is smaller. */
		maxHeight: (cap: number) => Math.min(cap, availableHeight()),
		onPlacement(event: AnchoredPlacementEvent) {
			setSide(event.side);
			setAvailableHeight(event.availableHeight);
		},
	};
}

/**
 * The shared popup chrome of the combobox, select and dropdown: an `<anchored>`
 * layer under its parent, with the surface-3 card, the 4px slide and the fade.
 * The layer flips to the far side of the trigger when `side` has no room, and
 * the card is at least as wide as the trigger.
 *
 * Closing on an outside press needs both the field and the popup: gpuix
 * reports "outside" per element, so callers also pass `onMouseDownOutside` to
 * their field and ask `isInside` whether the press landed in either.
 */
export function PopupSurface(props: {
	presence: ReturnType<typeof createPresence>;
	/** The side to open on when it has room. */
	side?: "top" | "bottom";
	align: "start" | "end";
	/** The card's width; it is never narrower than the trigger. */
	width: DimensionValue;
	/** The tallest the card gets; the room on its side caps it further. */
	maxHeight: number;
	onMouseDownOutside: (event: EventPayload) => void;
	/** Escape while this popup is the top layer. The popup joins gpuix's dismiss-layer stack, so a dialog around it stays open. */
	onDismiss: () => void;
	/** The popup's box, for `isInside`. */
	popupRef?: (element: HostElement) => void;
	/** Called with the height the card may use, for a scroller inside it. */
	children: (maxHeight: Accessor<number>) => JSX.Element;
}) {
	const placement = createPlacementState(props.side ?? "bottom");
	const maxHeight = () => placement.maxHeight(props.maxHeight);
	/** The popup slides in from the trigger: down from above, up from below. */
	const slide = () => (placement.side() === "top" ? 4 : -4);
	return (
		<>
		{/* A layer only while open, not while the exit fade plays: a second Escape in that window belongs to the dialog behind. It is a sibling because the layer needs no children, only its place in the stack. */}
		<Show when={props.presence.open()}>
			<DismissableLayer onEscapeKeyDown={props.onDismiss} />
		</Show>
		<Show when={props.presence.mounted()}>
			<anchored
				side={props.side ?? "bottom"}
				align={props.align}
				gap={POPUP_OFFSET}
				fit="flip"
				snapMargin={POPUP_MARGIN}
				onPlacement={placement.onPlacement}
				deferred
				priority={1}
				onMouseDownOutside={props.onMouseDownOutside}
				style={{ backgroundColor: color.transparent }}
			>
				<motion.div
					initial={{ opacity: 0, top: slide() }}
					animate={
						props.presence.open()
							? { opacity: 1, top: 0 }
							: { opacity: 0, top: slide() }
					}
					transition={props.presence.open() ? tween.fast : tween.fastExit}
					ref={props.popupRef}
					style={{
						position: "relative",
						width: props.width,
						minWidth: "anchor-size(width)",
						display: "flex",
						flexDirection: "column",
						backgroundColor: color.card,
						borderRadius: radius.container,
						borderWidth: 1,
						borderColor: color.popupBorder,
						boxShadow: shadow3(),
						overflow: "hidden",
						maxHeight: maxHeight(),
					}}
				>
					{props.children(maxHeight)}
				</motion.div>
			</anchored>
		</Show>
		</>
	);
}
