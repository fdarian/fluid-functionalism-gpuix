import { motion } from "@gpuix/solid";
import { createSignal, type JSX, onCleanup, Show } from "solid-js";
import { color, radius, shadow3, motion as tween } from "./theme";

/** Time the popup keeps painting its exit fade before unmounting. */
const EXIT_MS = 60;
export const POPUP_OFFSET = 6;

/** `open` drives the animation; `mounted` outlives it by the exit fade. */
export function createPresence() {
	const [open, setOpen] = createSignal(false);
	const [mounted, setMounted] = createSignal(false);
	let exitTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(exitTimer));
	return {
		open,
		mounted,
		show() {
			clearTimeout(exitTimer);
			setOpen(true);
			setMounted(true);
		},
		hide() {
			setOpen(false);
			clearTimeout(exitTimer);
			exitTimer = setTimeout(() => setMounted(false), EXIT_MS);
		},
	};
}

/**
 * The shared popup chrome of the combobox and select: an `<anchored>` layer
 * under its parent, with the surface-3 card, the 4px slide and the fade.
 *
 * Closing on an outside press needs both the field and the popup: gpuix
 * reports "outside" per element, so callers also pass `onMouseDownOutside` to
 * their field and ask `hovered()` whether the press landed inside either.
 */
export function PopupSurface(props: {
	presence: ReturnType<typeof createPresence>;
	/** The side with room for the popup: gpuix anchors the flip to the far edge of the field, so it would cover the field. */
	side?: "top" | "bottom";
	align: "start" | "end";
	width: number;
	maxHeight?: number;
	onMouseDownOutside: () => void;
	onHoverChange: (hovered: boolean) => void;
	children: JSX.Element;
}) {
	/** The popup slides in from the field: down from above, up from below. */
	const slide = () => (props.side === "top" ? 4 : -4);
	return (
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
					onMouseEnter={() => props.onHoverChange(true)}
					onMouseLeave={() => props.onHoverChange(false)}
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
	);
}
