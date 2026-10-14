import {
	DismissableLayer,
	type EventPayload,
	type HostElement,
	motion,
} from "@gpuix/solid";
import { createSignal, type JSX, onCleanup, Show } from "solid-js";
import { readBounds } from "./bounds";
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
		if (element === undefined) return false;
		const box = readBounds(element);
		if (box === null) return false;
		return (
			x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height
		);
	});
}

export interface PopupPlacement {
	side: "top" | "bottom";
	/** The popup's height cap: the room on its side, up to `maxHeight`. */
	maxHeight: number;
	/** The trigger's width, for popups at least as wide as it. */
	triggerWidth: number;
}

/**
 * Chooses the side of `trigger` with room for `contentHeight` px: below when
 * it fits or has more room than above, else above. gpuix flips an
 * overflowing `<anchored>` from the far edge of the trigger, which would
 * cover it, so the side is picked here and passed to `PopupSurface`.
 */
export function placePopup(
	trigger: HostElement,
	contentHeight: number,
	maxHeight: number,
): PopupPlacement {
	const box = readBounds(trigger);
	const window = trigger.root?.nativeRenderer.getWindowSize?.();
	if (box === null || window === undefined) {
		throw new Error("Cannot place the popup without painted bounds");
	}
	const below = window.height - (box.y + box.height);
	const above = box.y;
	const need = contentHeight + POPUP_OFFSET + POPUP_MARGIN;
	const side = below >= need || below >= above ? "bottom" : "top";
	return {
		side,
		maxHeight: Math.min(
			maxHeight,
			(side === "bottom" ? below : above) - POPUP_OFFSET - POPUP_MARGIN,
		),
		triggerWidth: box.width,
	};
}

/**
 * The side and height cap a popup anchored to a trigger gets, kept as signals
 * for `PopupSurface`. `place` measures against the trigger and returns the
 * placement for callers that also want the trigger's width.
 */
export function createPlacement(maxHeight: number) {
	const [side, setSide] = createSignal<"top" | "bottom">("bottom");
	const [height, setHeight] = createSignal(maxHeight);
	return {
		side,
		maxHeight: height,
		place(trigger: HostElement, contentHeight: number) {
			const placement = placePopup(
				trigger,
				Math.min(maxHeight, contentHeight),
				maxHeight,
			);
			setSide(placement.side);
			setHeight(placement.maxHeight);
			return placement;
		},
	};
}

/**
 * The shared popup chrome of the combobox and select: an `<anchored>` layer
 * under its parent, with the surface-3 card, the 4px slide and the fade.
 *
 * Closing on an outside press needs both the field and the popup: gpuix
 * reports "outside" per element, so callers also pass `onMouseDownOutside` to
 * their field and ask `isInside` whether the press landed in either.
 */
export function PopupSurface(props: {
	presence: ReturnType<typeof createPresence>;
	/** The side with room for the popup: gpuix anchors the flip to the far edge of the field, so it would cover the field. */
	side?: "top" | "bottom";
	align: "start" | "end";
	width: number;
	maxHeight?: number;
	onMouseDownOutside: (event: EventPayload) => void;
	/** Escape while this popup is the top layer. The popup joins gpuix's dismiss-layer stack, so a dialog around it stays open. */
	onDismiss: () => void;
	/** The popup's box, for `isInside`. */
	popupRef?: (element: HostElement) => void;
	children: JSX.Element;
}) {
	/** The popup slides in from the field: down from above, up from below. */
	const slide = () => (props.side === "top" ? 4 : -4);
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
				deferred
				priority={1}
				occlude
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
						display: "flex",
						flexDirection: "column",
						backgroundColor: color.card,
						borderRadius: radius.container,
						borderWidth: 1,
						borderColor: color.popupBorder,
						boxShadow: shadow3(),
						overflow: "hidden",
						maxHeight: props.maxHeight,
					}}
				>
					{props.children}
				</motion.div>
			</anchored>
		</Show>
		</>
	);
}
