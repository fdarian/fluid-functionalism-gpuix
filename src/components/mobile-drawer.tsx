import {
	DialogBackdrop,
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
import { once } from "./dialog";
import {
	color,
	scheme,
	shadow3,
	motion as tween,
} from "../lib/theme";

export const DRAWER_WIDTH = 256;

/** The panel's exit tween plus a buffer: `exitFallbackMs(spring.moderate)`. */
const EXIT_FALLBACK_MS = 220;

/** The same scrim as the dialogs: `bg-black/40`, `dark:bg-black/80`. */
const scrim = () =>
	scheme() === "dark" ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)";

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
	const content = once(() => props.children);
	const [mounted, setMounted] = createSignal(props.open);
	/**
	 * The panel slides empty and its content arrives once it has stopped. gpuix
	 * reports a nested element's painted bounds up to a frame apart from its
	 * ancestor's while the ancestor moves, so fluid hover would measure its rows
	 * skewed (the active highlight sat 14px off) and keep that until the next
	 * pointer enter.
	 */
	const [settled, setSettled] = createSignal(false);
	const finish = () => {
		setMounted(false);
		setSettled(false);
	};
	createEffect(
		on(
			() => props.open,
			(isOpen) => {
				if (isOpen) {
					setMounted(true);
					return;
				}
				// onMotionComplete is the primary release; this covers an exit that never animates.
				const timer = setTimeout(finish, EXIT_FALLBACK_MS);
				onCleanup(() => clearTimeout(timer));
			},
			{ defer: true },
		),
	);

	return (
		<GpuixDialog
			open={mounted()}
			onOpenChange={(next) => {
				if (!next) props.onClose();
			}}
		>
			<DialogPortal>
				<DialogBackdrop>
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
							backgroundColor: scrim(),
							// A filled child would swallow the press meant for the backdrop behind it.
							pointerEvents: "none",
						}}
					/>
				</DialogBackdrop>
				{/* The popup is only the focus scope: the panel is what the pointer hits. */}
				<DialogPopup
					finalFocus={props.triggerRef}
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
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.08 }}
									style={{ display: "flex", flexDirection: "column" }}
								>
									{content()}
								</motion.div>
							</Show>
						</div>
					</motion.div>
				</DialogPopup>
			</DialogPortal>
		</GpuixDialog>
	);
}
