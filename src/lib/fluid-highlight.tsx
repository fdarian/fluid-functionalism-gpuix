import {
	createReducedMotion,
	type MotionTransition,
	motion,
} from '@ghia/solid';
import { createComputed, createSignal, For, untrack } from 'solid-js';
import type { ItemRect } from './fluid-hover';
import { motion as tween } from './theme';

/** Position is a transform, size is layout, as in the source: the fill is pinned at the padding corner. */
function target(rect: ItemRect) {
	return {
		x: rect.left,
		y: rect.top,
		width: rect.width,
		height: rect.height,
	};
}

/** Reduced motion keeps the opacity fade and drops the travel: fewer and gentler, not none. */
const REDUCED: MotionTransition = {
	...tween.snap,
	opacity: { duration: 0.08 },
};

/**
 * The one hover highlight every fluid list renders: an absolutely positioned
 * fill, pinned at 0,0 and moved by `x` / `y`, that glides between the rects `createFluidHover` measures.
 *
 * Like the source's, it has no `z-index`: the rows over it are `relative z-10`
 * there and `position: relative` with `zIndex: 10` here, and keep transparent
 * backgrounds so it shows through.
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
	/** `false` mounts at full opacity, so the fill is simply there (a selected background), instead of fading in. Defaults to `true`. */
	fadeIn?: boolean;
	/** The glide between rects. Hover uses `fast`; a selection background uses `moderate`. */
	glide?: MotionTransition;
	fade?: MotionTransition;
	testId?: string;
}) {
	// Read here, not left to the app's MotionConfig: the highlight honours the OS setting wherever it is mounted.
	const reduced = createReducedMotion();
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
					throw new Error('FluidHighlight session started without a rect');
				}
				const transition = (): MotionTransition => {
					if (props.rect() === null) return props.fade ?? tween.fastExit;
					if (reduced()) return REDUCED;
					return props.travel?.() === false
						? tween.snap
						: (props.glide ?? tween.fast);
				};
				const sitsOn = () => {
					const rect = lastRect();
					if (rect === undefined) {
						throw new Error('FluidHighlight has no rect to sit on');
					}
					return rect;
				};
				return (
					<motion.div
						testId={props.testId}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							backgroundColor: props.background,
							borderRadius: props.radius,
							pointerEvents: 'none',
						}}
						initial={{
							opacity: props.fadeIn === false ? 1 : 0,
							...target(initial),
						}}
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
