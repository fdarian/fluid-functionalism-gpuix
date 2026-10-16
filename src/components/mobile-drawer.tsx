import {
	DialogPopup,
	DialogPortal,
	Dialog as GpuixDialog,
	type HostElement,
	motion,
} from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { HideOutside } from "../lib/modal";
import { createPresence } from "../lib/presence";
import { FocusFirst } from "./dialog";
import {
	color,
	scheme,
	shadow3,
	motion as tween,
} from "../lib/theme";

export const DRAWER_WIDTH = 256;

/** The panel's exit tween plus a buffer: `exitFallbackMs(spring.moderate)`. */
const EXIT_FALLBACK_MS = 220;

/**
 * A left navigation panel over a dimmed window. Built on gpuix's headless
 * `Dialog` for the layer, the focus trap, Escape and focus return; the panel
 * slides on `left`, since there is no `x: -100%` to animate.
 *
 * The drawer only reports closes (`onClose`): opening is the parent's job, as
 * in the original.
 */
export function MobileDrawer(props: {
	open: boolean;
	onClose: () => void;
	/** Where focus goes on close; defaults to whatever held it before the drawer opened. */
	triggerRef?: HostElement;
	testId?: string;
	children: JSX.Element;
}) {
	let popup: HostElement | undefined;
	// onMotionComplete is the primary release; the timer covers an exit that never animates.
	const presence = createPresence(EXIT_FALLBACK_MS, props.open);
	presence.follow(() => props.open);
	const mounted = presence.mounted;
	/**
	 * The panel slides empty and its content arrives once it has stopped. gpuix
	 * reports a nested element's painted bounds up to a frame apart from its
	 * ancestor's while the ancestor moves, so fluid hover would measure its rows
	 * skewed (the active highlight sat 14px off) and keep that until the next
	 * pointer enter.
	 */
	const [settled, setSettled] = createSignal(false);
	const finish = () => {
		presence.release();
		setSettled(false);
	};

	return (
		<GpuixDialog
			open={mounted()}
			onOpenChange={(next) => {
				// gpuix keeps the layer up through the exit, so Escape still arrives then; the drawer has already been told.
				if (!next && props.open) props.onClose();
			}}
		>
			<DialogPortal>
				{/* gpuix's own DialogBackdrop closes on mousedown; the drawer closes on a click that presses and releases on the backdrop, as in a browser, and the exit leaves the layer up, so it ignores one that arrives then. */}
				<div
					onClick={() => {
						if (props.open) props.onClose();
					}}
					style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
				>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: props.open ? 1 : 0 }}
						transition={props.open ? { duration: 0.16 } : tween.moderateExit}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: color.scrim,
						}}
					/>
				</div>
				{/* The popup is only the focus scope: the panel is what the pointer hits. */}
				<DialogPopup
					finalFocus={props.triggerRef}
					ref={(element) => {
						popup = element;
					}}
					testId={props.testId}
					aria-label="Navigation"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "none",
					}}
				>
					<HideOutside popup={() => popup} />
					<motion.div
						initial={{ left: -DRAWER_WIDTH }}
						animate={{ left: props.open ? 0 : -DRAWER_WIDTH }}
						transition={props.open ? tween.moderate : tween.moderateExit}
						onMotionComplete={() => {
							if (props.open) setSettled(true);
							else finish();
						}}
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							width: DRAWER_WIDTH,
							display: "flex",
							flexDirection: "column",
							overflowY: "scroll",
							backgroundColor: color.card,
							borderRightWidth: 1,
							borderColor: color.popupBorder,
							boxShadow: shadow3(),
							pointerEvents: "auto",
						}}
					>
						{/* The padding lives on an inner box: a scroller's own padding is counted twice in its scroll extent, so a short panel would still scroll by 2 x 16. */}
						<div style={{ display: "flex", flexDirection: "column", padding: 16 }}>
							<Show when={settled()}>
								{/* The content mounts only once the panel has stopped, so focus moves into it then. */}
								<FocusFirst popup={() => popup} />
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.08 }}
									style={{ display: "flex", flexDirection: "column" }}
								>
									{props.children}
								</motion.div>
							</Show>
						</div>
					</motion.div>
				</DialogPopup>
			</DialogPortal>
		</GpuixDialog>
	);
}
