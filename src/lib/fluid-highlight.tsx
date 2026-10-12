import { type MotionTransition, motion } from "@gpuix/solid";
import { createComputed, createSignal, For, untrack } from "solid-js";
import type { ItemRect } from "./fluid-hover";
import { motion as tween } from "./theme";

function target(rect: ItemRect) {
	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
	};
}

/**
 * The one hover highlight every fluid list renders: an absolutely positioned
 * fill that glides between the rects `createFluidHover` measures.
 *
 * It must be the container's first child. gpuix has no zIndex, so paint order
 * is document order and the rows above it keep transparent backgrounds.
 */
export function FluidHighlight(props: {
	/** `null` fades the highlight out in place. */
	rect: () => ItemRect | null;
	/** Steps when the pointer enters the container. A new session remounts the highlight so it appears at the row instead of sliding in from the last one. */
	session: () => number;
	/** Where a fresh session fades in from. Defaults to the rect itself. */
	from?: () => ItemRect | null;
	radius: number;
	background: string;
	/** `false` snaps to the new rect: a reflow moved the row, not the pointer. */
	travel?: () => boolean;
	/** The glide between rects. Hover uses `fast`; a selection background uses `moderate`. */
	glide?: MotionTransition;
	fade?: MotionTransition;
}) {
	const [lastRect, setLastRect] = createSignal<ItemRect>();
	const [liveSession, setLiveSession] = createSignal<number>();
	createComputed(() => {
		const rect = props.rect();
		if (rect === null) return;
		setLastRect(rect);
		setLiveSession(props.session());
	});

	return (
		<For each={liveSession() === undefined ? [] : [liveSession()]}>
			{() => {
				const initial = untrack(() => props.from?.() ?? lastRect());
				if (initial == null) {
					throw new Error("FluidHighlight session started without a rect");
				}
				const transition = (): MotionTransition => {
					if (props.rect() === null) return props.fade ?? tween.fastExit;
					return props.travel?.() === false
						? tween.snap
						: (props.glide ?? tween.fast);
				};
				const sitsOn = () => {
					const rect = lastRect();
					if (rect === undefined) {
						throw new Error("FluidHighlight has no rect to sit on");
					}
					return rect;
				};
				return (
					<motion.div
						style={{
							position: "absolute",
							backgroundColor: props.background,
							borderRadius: props.radius,
							pointerEvents: "none",
						}}
						initial={{ opacity: 0, ...target(initial) }}
						animate={{
							opacity: props.rect() === null ? 0 : 1,
							...target(sitsOn()),
						}}
						transition={transition()}
					/>
				);
			}}
		</For>
	);
}
