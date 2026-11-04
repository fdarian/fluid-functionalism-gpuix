import {
	DialogBackdrop,
	DialogPopup,
	DialogPortal,
	Dialog as GpuixDialog,
	type HostElement,
	motion,
} from '@ghia/solid';
import { FocusFirst } from 'ghia-base-ui/dialog';
import { createDrawerRoot } from 'ghia-base-ui/drawer';
import { HideOutside } from 'ghia-base-ui/floating-ui-solid/utils';
import type { JSX } from 'solid-js';
import { color, shadow, motion as tween } from '#/lib/theme';

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
	const root = createDrawerRoot({
		open: () => props.open,
		onClose: () => props.onClose(),
		exitMs: EXIT_FALLBACK_MS,
	});
	return (
		<GpuixDialog open={root.mounted()} onOpenChange={root.onOpenChange}>
			<DialogPortal>
				<DialogBackdrop>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: props.open ? 1 : 0 }}
						transition={props.open ? { duration: 0.16 } : tween.moderateExit}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							backgroundColor: color.scrim,
						}}
					/>
				</DialogBackdrop>
				{/* The popup is only the focus scope: the panel is what the pointer hits. */}
				<DialogPopup
					finalFocus={props.triggerRef}
					ref={(element) => {
						popup = element;
					}}
					testId={props.testId}
					aria-label="Navigation"
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: 'none',
					}}
				>
					<HideOutside popup={() => popup} />
					<motion.div
						initial={{ x: '-100%' }}
						animate={{ x: props.open ? 0 : '-100%' }}
						transition={props.open ? tween.moderate : tween.moderateExit}
						onMotionComplete={() => {
							if (!props.open) root.finish();
						}}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							bottom: 0,
							width: DRAWER_WIDTH,
							display: 'flex',
							flexDirection: 'column',
							overflowY: 'scroll',
							backgroundColor: color.card,
							boxShadow: shadow(3),
							pointerEvents: 'auto',
						}}
					>
						{/* The padding lives on an inner box: a scroller's own padding is counted twice in its scroll extent, so a short panel would still scroll by 2 x 16. */}
						<div
							style={{ display: 'flex', flexDirection: 'column', padding: 16 }}
						>
							<FocusFirst popup={() => popup} />
							{props.children}
						</div>
					</motion.div>
				</DialogPopup>
			</DialogPortal>
		</GpuixDialog>
	);
}
