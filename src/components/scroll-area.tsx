import {
	type DimensionValue,
	MotionConfig,
	motion,
	type StyleDesc,
} from '@ghia/solid';
import {
	type ScrollAreaAxis as Axis,
	createScrollAreaRoot,
	createScrollAreaScrollbar,
	type ScrollAreaOrientation,
} from 'ghia-base-ui/scroll-area';
import type { JSX } from 'solid-js';
import { Show } from 'solid-js';
import { color, fade, withAlpha } from '#/lib/theme';

export type ScrollOrientation = ScrollAreaOrientation;

/** `--scroll-fade-size` and `--scroll-divider-size`. */
const FADE_PX = 48;
/** The scrollbar track: a 10px hit target the 4px thumb sits inside. */
const TRACK_PX = 10;
/** The thumb keeps 4px off each end of its track (`my-1`). */
const THUMB_INSET = 4;

/** `rgb(var(--overlay) / a)`: black on light surfaces, white on dark. */
const overlay = (alpha: number) => withAlpha(color.overlay, alpha);

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Scrollbar and edge fade over a gpuix scroller. The viewport hides gpuix's own
 * overlay bar and the thumb is drawn here from the viewport's `onLayout` and
 * `onScroll`; the fade is a `maskImage` on the viewport whose end alphas follow
 * the offset.
 */
export function ScrollArea(props: {
	orientation?: ScrollOrientation;
	/** `scroll-fade` (vertical) or `scroll-fade-x` (horizontal): dissolve the edges that have more to scroll. A `both` area fades vertically only, as the one class on the web's viewport does. */
	fade?: boolean;
	/** `--scroll-fade-size`. */
	fadeSize?: number;
	/** `scroll-divider`: a hairline on each edge of the area that has content past it, strengthening over the first 48px of scroll. */
	divider?: {
		/** `--scroll-divider-inset`. */
		inset?: number;
		/** False drops the hairline at the top, as `:first-child` does on the web. */
		start?: boolean;
		/** False drops the hairline at the bottom, as `:last-child` does in the command menu. */
		end?: boolean;
	};
	/** After the offset changes, for what depends on where the content sits under the pointer. */
	onScroll?: () => void;
	width?: DimensionValue;
	height?: DimensionValue;
	/** Border and radius of the outer box. */
	style?: StyleDesc;
	/** The viewport's direct child, where the source's `viewportClassName` reaches with `[&>div]:...`. */
	contentStyle?: StyleDesc;
	testId?: string;
	children: JSX.Element;
}) {
	const root = createScrollAreaRoot({
		orientation: () => props.orientation ?? 'vertical',
		trackSize: TRACK_PX,
		thumbInset: THUMB_INSET,
		onScroll: () => props.onScroll?.(),
	});
	const orientation = root.orientation;
	const vertical = root.vertical;
	const horizontal = root.horizontal;

	const visible = (axis: Axis) =>
		root.hovering() || root.scrolling()[axis] || root.dragging() === axis;

	// ── Fade and divider ────────────────────────────────────────────────────

	const fadeAxis = (): Axis => (orientation() === 'horizontal' ? 'x' : 'y');
	const fadeSize = () => props.fadeSize ?? FADE_PX;

	/** How far past an edge the scroll is, as 0 to 1 over `size`: 0 at the true start / end, 1 once `size` px of content lie beyond it. */
	const pastEdge = (axis: Axis, edge: 'start' | 'end', size: number) => {
		const extent = root.view();
		const inner = root.content();
		if (extent === undefined || inner === undefined || !root.overflows(axis)) {
			return 0;
		}
		const viewLength = axis === 'y' ? extent.h : extent.w;
		const total = axis === 'y' ? inner.h : inner.w;
		const scrolled = axis === 'y' ? root.offset().y : root.offset().x;
		return clamp(
			edge === 'start'
				? scrolled / size
				: (total - viewLength - scrolled) / size,
			0,
			1,
		);
	};

	/** The CSS `mask-image` of `.scroll-fade`: crisp at the true start / end, dissolving over `fadeSize` once there is content past an edge. */
	const fadeMask = () => {
		const size = root.view();
		if (props.fade !== true || size === undefined) return undefined;
		const axis = fadeAxis();
		const start = pastEdge(axis, 'start', fadeSize());
		const end = pastEdge(axis, 'end', fadeSize());
		if (start === 0 && end === 0) return undefined;
		const length = axis === 'y' ? size.h : size.w;
		const edge = Math.min(fadeSize(), length / 2);
		return `linear-gradient(${axis === 'y' ? 'to bottom' : 'to right'}, rgba(0,0,0,${1 - start}) 0px, #000 ${edge}px, #000 ${length - edge}px, rgba(0,0,0,${1 - end}) ${length}px)`;
	};

	const Divider = (line: { edge: 'start' | 'end' }) => (
		<Show
			when={
				props.divider !== undefined &&
				props.divider[line.edge] !== false &&
				vertical()
			}
		>
			<div
				style={{
					position: 'absolute',
					pointerEvents: 'none',
					height: 1,
					left: props.divider?.inset ?? 0,
					right: props.divider?.inset ?? 0,
					[line.edge === 'start' ? 'top' : 'bottom']: 0,
					backgroundColor: color.border,
					opacity: pastEdge('y', line.edge, FADE_PX),
				}}
			/>
		</Show>
	);

	// ── Scrollbars ──────────────────────────────────────────────────────────

	const Scrollbar = (bar: { axis: Axis }) => {
		const scrollbar = createScrollAreaScrollbar(root, bar.axis, {
			thumbInset: THUMB_INSET,
		});
		const span = scrollbar.span;
		const hovered = scrollbar.hovered;
		const thumbColor = () =>
			overlay(scrollbar.dragging() ? 0.16 : hovered() ? 0.12 : 0.08);
		return (
			<Show when={span() !== null}>
				<motion.div
					{...scrollbar.trackProps}
					testId={
						props.testId === undefined
							? undefined
							: `${props.testId}-${bar.axis}-track`
					}
					initial={false}
					animate={{ opacity: visible(bar.axis) ? 1 : 0 }}
					// Shows at once; on hide waits out the thumb's shrink before fading.
					transition={
						visible(bar.axis)
							? { duration: 0.16, ease: 'easeOut' }
							: { duration: 0.12, delay: 0.16, ease: 'easeOut' }
					}
					style={{
						position: 'absolute',
						userSelect: 'none',
						...(bar.axis === 'y'
							? {
									top: 0,
									right: 0,
									width: TRACK_PX,
									bottom: root.corner(),
								}
							: {
									left: 0,
									bottom: 0,
									height: TRACK_PX,
									right: root.corner(),
								}),
					}}
				>
					{/* The source widens the thumb with a CSS `transition-[width,height]`, which reduced motion does not touch; the config would make this `motion.div` jump instead. */}
					<MotionConfig reducedMotion="never">
						{/* The source's `mx-auto` / `my-auto`: the thumb stays centred in the track while it widens. */}
						<div
							style={{
								position: 'absolute',
								display: 'flex',
								flexDirection: bar.axis === 'y' ? 'row' : 'column',
								justifyContent: 'center',
								...(bar.axis === 'y'
									? {
											left: 0,
											right: 0,
											top: span()?.start,
											height: span()?.length,
										}
									: {
											top: 0,
											bottom: 0,
											left: span()?.start,
											width: span()?.length,
										}),
							}}
						>
							<motion.div
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-${bar.axis}-thumb`
								}
								initial={false}
								animate={
									bar.axis === 'y'
										? { width: hovered() ? 6 : 4 }
										: { height: hovered() ? 6 : 4 }
								}
								transition={{ duration: 0.16, ease: 'easeInOut' }}
								style={{
									borderRadius: 3,
									backgroundColor: thumbColor(),
									// Off the track's edge by 2px (`-translate-x-0.5`); the track keeps its 10px hit target flush.
									transform:
										bar.axis === 'y' ? 'translateX(-2px)' : 'translateY(-2px)',
									// Tailwind's `ease-in-out` is `fade`'s default curve.
									...fade(['background-color'], 160),
								}}
							/>
						</div>
					</MotionConfig>
				</motion.div>
			</Show>
		);
	};

	return (
		<div
			testId={props.testId}
			{...root.rootProps}
			style={{
				position: 'relative',
				overflow: 'hidden',
				width: props.width,
				height: props.height,
				...props.style,
			}}
		>
			<div
				{...root.viewportProps}
				style={{
					keyboardFocusDim: false,
					maskImage: fadeMask(),
					width: '100%',
					height: '100%',
					overflowY: vertical() ? 'scroll' : 'hidden',
					overflowX: horizontal() ? 'scroll' : 'hidden',
					// The thumbs are drawn by this component.
					scrollbarWidth: 'none',
				}}
			>
				<div
					{...root.contentProps}
					style={{
						display: 'flex',
						flexDirection: 'column',
						// Base UI's Content: it grows past the viewport to its widest unbreakable child, which is what `onLayout` reads for the horizontal thumb.
						minWidth: 'fit-content',
						...props.contentStyle,
					}}
				>
					{props.children}
				</div>
			</div>
			<Divider edge="start" />
			<Divider edge="end" />
			<Show when={vertical()}>
				<Scrollbar axis="y" />
			</Show>
			<Show when={horizontal()}>
				<Scrollbar axis="x" />
			</Show>
		</div>
	);
}
