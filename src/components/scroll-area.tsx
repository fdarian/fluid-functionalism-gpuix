import {
	type DimensionValue,
	type DomEvent,
	type HostElement,
	type HostMouseEvent,
	type HostMouseMoveEvent,
	type HostWheelEvent,
	type KeyEvent,
	motion,
	type ScrollEvent,
	type StyleDesc,
} from "@gpuix/solid";
import { createSignal, type JSX, onCleanup, Show } from "solid-js";
import { isChord } from "#/lib/list-nav";
import { color, fade, withAlpha } from "#/lib/theme";

export type ScrollOrientation = "vertical" | "horizontal" | "both";

/** `--scroll-fade-size` and `--scroll-divider-size`. */
const FADE_PX = 48;
/** The scrollbar track: a 10px hit target the 4px thumb sits inside. */
const TRACK_PX = 10;
/** The thumb keeps 4px off each end of its track (`my-1`). */
const THUMB_INSET = 4;
/** Base UI's `MIN_THUMB_SIZE`. */
const THUMB_MIN_PX = 16;
/** How long Base UI keeps `data-scrolling` after the last user scroll. */
const SCROLLING_MS = 500;
/** How long after a wheel tick, key or press an offset change still counts as the user's (Base UI's 100 ms scroll-end debounce, plus a frame for the offset to report). */
const USER_SCROLL_MS = 150;
/** The distance a browser scrolls for one arrow key. */
const ARROW_PX = 40;
/** A page key scrolls this share of the viewport. */
const PAGE_SHARE = 0.875;

interface Size {
	w: number;
	h: number;
}

type Axis = "x" | "y";

/** `rgb(var(--overlay) / a)`: black on light surfaces, white on dark. */
const overlay = (alpha: number) => withAlpha(color.overlay, alpha);

function sizeOf(event: Pick<DomEvent, "width" | "height">): Size {
	if (event.width === undefined || event.height === undefined) {
		throw new Error("layout event without a size");
	}
	return { w: event.width, h: event.height };
}

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
	testId?: string;
	children: JSX.Element;
}) {
	const orientation = () => props.orientation ?? "vertical";
	const vertical = () => orientation() !== "horizontal";
	const horizontal = () => orientation() !== "vertical";
	const both = () => orientation() === "both";

	let viewport: HostElement | undefined;
	const scrollingTimer: Record<
		Axis,
		ReturnType<typeof setTimeout> | undefined
	> = { x: undefined, y: undefined };
	let userTimer: ReturnType<typeof setTimeout> | undefined;
	let userScroll = false;
	onCleanup(() => {
		clearTimeout(scrollingTimer.x);
		clearTimeout(scrollingTimer.y);
		clearTimeout(userTimer);
	});

	// Sizes come from `onLayout` (border box, reported after the first paint and on every resize) and the offset from `onScroll`, so nothing here is polled.
	const [view, setView] = createSignal<Size>();
	const [content, setContent] = createSignal<Size>();
	/** Scrolled distance, positive. */
	const [offset, setOffset] = createSignal({ x: 0, y: 0 });
	const [rootHovered, setRootHovered] = createSignal(false);
	const [trackHovered, setTrackHovered] = createSignal<Axis>();
	const [scrolling, setScrolling] = createSignal({ x: false, y: false });
	const [dragging, setDragging] = createSignal<Axis>();

	/** Base UI counts a scroll as the user's only after a wheel tick, key or press on the area. */
	const markUserScroll = () => {
		userScroll = true;
		clearTimeout(userTimer);
		userTimer = setTimeout(() => {
			userScroll = false;
		}, USER_SCROLL_MS);
	};
	const startScrolling = (axis: Axis) => {
		setScrolling((now) => ({ ...now, [axis]: true }));
		clearTimeout(scrollingTimer[axis]);
		scrollingTimer[axis] = setTimeout(
			() => setScrolling((now) => ({ ...now, [axis]: false })),
			SCROLLING_MS,
		);
	};
	const stopScrolling = (axis: Axis) => {
		clearTimeout(scrollingTimer[axis]);
		setScrolling((now) => ({ ...now, [axis]: false }));
	};

	const onScroll = (event: ScrollEvent) => {
		const next = { x: event.scrollLeft, y: event.scrollTop };
		const before = offset();
		if (userScroll || dragging() !== undefined) {
			if (next.y !== before.y) startScrolling("y");
			if (next.x !== before.x) startScrolling("x");
		}
		setOffset(next);
		props.onScroll?.();
	};

	const mountedViewport = () => {
		if (viewport === undefined) throw new Error("ScrollArea is not mounted");
		return viewport;
	};
	/** Read from the element, so it is current inside an input handler before `onScroll` has reported. */
	const positionOf = (axis: Axis) =>
		axis === "x" ? mountedViewport().scrollLeft : mountedViewport().scrollTop;

	// ── Thumb geometry ──────────────────────────────────────────────────────

	const overflows = (axis: Axis) => {
		const size = view();
		const inner = content();
		if (size === undefined || inner === undefined) return false;
		return axis === "y" ? inner.h > size.h + 0.5 : inner.w > size.w + 0.5;
	};
	/** The corner square exists only while both scrollbars do, and takes the end of both tracks. */
	const corner = () =>
		both() && overflows("x") && overflows("y") ? TRACK_PX : 0;

	/** The thumb's span along its track, or `null` when there is nothing to scroll. */
	const thumb = (axis: Axis) => {
		const size = view();
		const inner = content();
		if (size === undefined || inner === undefined || !overflows(axis)) {
			return null;
		}
		const viewLength = axis === "y" ? size.h : size.w;
		const total = axis === "y" ? inner.h : inner.w;
		const scrolled = axis === "y" ? offset().y : offset().x;
		const track = viewLength - corner();
		const length = Math.max(
			THUMB_MIN_PX,
			Math.min(track, viewLength - THUMB_INSET * 2) * (viewLength / total),
		);
		/** How far the thumb can travel: the track less the thumb and its margins. */
		const travel = track - length - THUMB_INSET * 2;
		const maxScroll = total - viewLength;
		return {
			length,
			start: THUMB_INSET + (travel > 0 ? (scrolled / maxScroll) * travel : 0),
			travel,
			maxScroll,
		};
	};

	/** Scrolls the viewport along `axis`; false when there is nothing to scroll or it is already there. */
	const scrollAlong = (axis: Axis, distance: number) => {
		const span = thumb(axis);
		if (span === null) return false;
		const next = clamp(distance, 0, span.maxScroll);
		if (next === positionOf(axis)) return false;
		mountedViewport().scrollTo(axis === "x" ? { left: next } : { top: next });
		return true;
	};

	// ── Dragging ────────────────────────────────────────────────────────────

	let dragOrigin = { pointer: 0, scrolled: 0 };
	const pointerAlong = (
		axis: Axis,
		event: Pick<HostMouseEvent, "x" | "y">,
	) => {
		const value = axis === "y" ? event.y : event.x;
		if (value === undefined) throw new Error("mouse event without coordinates");
		return value;
	};
	const startDrag = (
		axis: Axis,
		track: HostElement,
		event: HostMouseEvent,
		scrolled: number,
	) => {
		// The thumb keeps following the pointer once it leaves the narrow track.
		track.setPointerCapture(event.pointerId);
		dragOrigin = { pointer: pointerAlong(axis, event), scrolled };
		setDragging(axis);
	};
	const stopDrag = () => {
		const axis = dragging();
		if (axis === undefined) return;
		setDragging(undefined);
		stopScrolling(axis);
	};
	const dragTo = (event: HostMouseMoveEvent) => {
		// Capture ends the drag on release and on lost capture; this stays for a release the window never saw (outside it, or while it was inactive), which may not be delivered even to a capturing element.
		if (event.pressedButton === undefined) {
			stopDrag();
			return;
		}
		const axis = dragging();
		const span = axis === undefined ? null : thumb(axis);
		if (axis === undefined || span === null || span.travel <= 0) return;
		scrollAlong(
			axis,
			dragOrigin.scrolled +
				((pointerAlong(axis, event) - dragOrigin.pointer) / span.travel) *
					span.maxScroll,
		);
	};

	/** A press on the thumb starts a drag; one on the bare track jumps the way Base UI does and goes on as a drag from there. */
	const pressTrack = (
		axis: Axis,
		track: HostElement | undefined,
		event: HostMouseEvent,
	) => {
		// Only the primary button presses a scrollbar.
		if (event.button !== undefined && event.button !== 0) return;
		const span = thumb(axis);
		if (span === null || track === undefined) return;
		const box = track.getBoundingClientRect();
		markUserScroll();
		const along = pointerAlong(axis, event) - (axis === "y" ? box.y : box.x);
		if (along >= span.start && along <= span.start + span.length) {
			startDrag(axis, track, event, positionOf(axis));
			return;
		}
		if (span.travel <= 0) return;
		// Base UI's `clickPosition`: the thumb's centre under the pointer, offset by half the thumb margins.
		const clickPosition = along - span.length / 2 + THUMB_INSET;
		const target = clamp(
			(clickPosition / span.travel) * span.maxScroll,
			0,
			span.maxScroll,
		);
		scrollAlong(axis, target);
		startDrag(axis, track, event, target);
	};

	/** A wheel event over the track scrolls the viewport, which is not under the pointer, and is prevented so the scroller around the area does not take it too. A viewport already at its limit leaves the event alone: gpuix gives one event to the innermost scroller that can use it, which is then the scroller around the area. */
	const wheelTrack = (axis: Axis, event: HostWheelEvent) => {
		const delta = axis === "y" ? event.deltaY : event.deltaX;
		if (delta === 0) return;
		markUserScroll();
		if (scrollAlong(axis, positionOf(axis) + delta)) event.preventDefault();
	};

	// ── Keyboard ────────────────────────────────────────────────────────────

	/** What a browser does for a focused scroller: arrows by 40px, pages by 87.5% of the view, Home and End to the ends. */
	const onKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		// Keys from a focused descendant (an input, a listbox) are that descendant's.
		if (event.defaultPrevented || event.target !== mountedViewport()) {
			return;
		}
		const size = view();
		if (size === undefined) return;
		let axis: Axis | undefined;
		let target: number | undefined;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp":
				axis = "y";
				target =
					positionOf("y") + (event.key === "ArrowDown" ? ARROW_PX : -ARROW_PX);
				break;
			case "ArrowRight":
			case "ArrowLeft":
				axis = "x";
				target =
					positionOf("x") + (event.key === "ArrowRight" ? ARROW_PX : -ARROW_PX);
				break;
			case "PageDown":
			case "PageUp":
			case " ": {
				axis = "y";
				const back =
					event.key === "PageUp" ||
					(event.key === " " && event.shiftKey === true);
				target = positionOf("y") + (back ? -1 : 1) * size.h * PAGE_SHARE;
				break;
			}
			case "Home":
				axis = "y";
				target = 0;
				break;
			case "End":
				axis = "y";
				target = Number.POSITIVE_INFINITY;
				break;
		}
		if (axis === undefined || target === undefined || thumb(axis) === null) {
			return;
		}
		event.preventDefault();
		markUserScroll();
		scrollAlong(axis, target);
	};

	const visible = (axis: Axis) =>
		rootHovered() || scrolling()[axis] || dragging() === axis;

	// ── Fade and divider ────────────────────────────────────────────────────

	const fadeAxis = (): Axis => (orientation() === "horizontal" ? "x" : "y");
	const fadeSize = () => props.fadeSize ?? FADE_PX;

	/** How far past an edge the scroll is, as 0 to 1 over `size`: 0 at the true start / end, 1 once `size` px of content lie beyond it. */
	const pastEdge = (axis: Axis, edge: "start" | "end", size: number) => {
		const extent = view();
		const inner = content();
		if (extent === undefined || inner === undefined || !overflows(axis)) {
			return 0;
		}
		const viewLength = axis === "y" ? extent.h : extent.w;
		const total = axis === "y" ? inner.h : inner.w;
		const scrolled = axis === "y" ? offset().y : offset().x;
		return clamp(
			edge === "start"
				? scrolled / size
				: (total - viewLength - scrolled) / size,
			0,
			1,
		);
	};

	/** The CSS `mask-image` of `.scroll-fade`: crisp at the true start / end, dissolving over `fadeSize` once there is content past an edge. */
	const fadeMask = () => {
		const size = view();
		if (props.fade !== true || size === undefined) return undefined;
		const axis = fadeAxis();
		const start = pastEdge(axis, "start", fadeSize());
		const end = pastEdge(axis, "end", fadeSize());
		if (start === 0 && end === 0) return undefined;
		const length = axis === "y" ? size.h : size.w;
		const edge = Math.min(fadeSize(), length / 2);
		return `linear-gradient(${axis === "y" ? "to bottom" : "to right"}, rgba(0,0,0,${1 - start}) 0px, #000 ${edge}px, #000 ${length - edge}px, rgba(0,0,0,${1 - end}) ${length}px)`;
	};

	const Divider = (line: { edge: "start" | "end" }) => (
		<Show
			when={
				props.divider !== undefined &&
				props.divider[line.edge] !== false &&
				vertical()
			}
		>
			<div
				style={{
					position: "absolute",
					pointerEvents: "none",
					height: 1,
					left: props.divider?.inset ?? 0,
					right: props.divider?.inset ?? 0,
					[line.edge === "start" ? "top" : "bottom"]: 0,
					backgroundColor: color.border,
					opacity: pastEdge("y", line.edge, FADE_PX),
				}}
			/>
		</Show>
	);

	// ── Scrollbars ──────────────────────────────────────────────────────────

	const Scrollbar = (bar: { axis: Axis }) => {
		let track: HostElement | undefined;
		const span = () => thumb(bar.axis);
		const hovered = () =>
			trackHovered() === bar.axis || dragging() === bar.axis;
		const thumbColor = () =>
			overlay(dragging() === bar.axis ? 0.16 : hovered() ? 0.12 : 0.08);
		return (
			<Show when={span() !== null}>
				<motion.div
					ref={(element) => {
						track = element;
					}}
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
							? { duration: 0.16, ease: "easeOut" }
							: { duration: 0.12, delay: 0.16, ease: "easeOut" }
					}
					onMouseEnter={() => setTrackHovered(bar.axis)}
					onMouseLeave={() => setTrackHovered(undefined)}
					onMouseDown={(event: HostMouseEvent) =>
						pressTrack(bar.axis, track, event)
					}
					onMouseMove={dragTo}
					onMouseUp={stopDrag}
					onLostPointerCapture={stopDrag}
					onWheel={(event: HostWheelEvent) => wheelTrack(bar.axis, event)}
					style={{
						position: "absolute",
						userSelect: "none",
						...(bar.axis === "y"
							? {
									top: 0,
									right: 0,
									width: TRACK_PX,
									bottom: corner(),
								}
							: {
									left: 0,
									bottom: 0,
									height: TRACK_PX,
									right: corner(),
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
						// Off the container edge by 2px (`-translate-x-0.5`) and widening from 4px to 6px on hover.
						animate={
							bar.axis === "y"
								? { left: hovered() ? 0 : 1, width: hovered() ? 6 : 4 }
								: { top: hovered() ? 0 : 1, height: hovered() ? 6 : 4 }
						}
						transition={{ duration: 0.16, ease: "easeInOut" }}
						style={{
							position: "absolute",
							borderRadius: 3,
							backgroundColor: thumbColor(),
							// Tailwind's `ease-in-out` is `fade`'s default curve.
							...fade(["background-color"], 160),
							...(bar.axis === "y"
								? { top: span()?.start, height: span()?.length }
								: { left: span()?.start, width: span()?.length }),
						}}
					/>
				</motion.div>
			</Show>
		);
	};

	return (
		<div
			testId={props.testId}
			onMouseEnter={() => setRootHovered(true)}
			onMouseLeave={() => setRootHovered(false)}
			style={{
				position: "relative",
				overflow: "hidden",
				width: props.width,
				height: props.height,
				...props.style,
			}}
		>
			<div
				ref={(element) => {
					viewport = element;
				}}
				onScroll={onScroll}
				onWheel={markUserScroll}
				onLayout={(event: DomEvent) => setView(sizeOf(event))}
				// A viewport that overflows is a tab stop and scrolls with the keys, like a focused scroller in a browser.
				tabIndex={overflows("x") || overflows("y") ? 0 : -1}
				onKeyDown={onKeyDown}
				style={{
					keyboardFocusDim: false,
					maskImage: fadeMask(),
					width: "100%",
					height: "100%",
					overflowY: vertical() ? "scroll" : "hidden",
					overflowX: horizontal() ? "scroll" : "hidden",
					// The thumbs are drawn by this component.
					scrollbarWidth: "none",
					// Base UI's Content has `min-width: fit-content`, which gpuix rejects. As a non-shrinking item of a flex row the wrapper takes its content's width instead, and its `onLayout` is where the content size comes from. As a block child it is clamped to the viewport width, `onLayout` reports that, and the area draws no horizontal thumb (the scroller itself still scrolls, since `scrollWidth` counts descendants).
					...(horizontal()
						? {
								display: "flex",
								flexDirection: "row",
								alignItems: "flex-start",
							}
						: {}),
				}}
			>
				<div
					onLayout={(event: DomEvent) => setContent(sizeOf(event))}
					style={{
						display: "flex",
						flexDirection: "column",
						flexShrink: 0,
						// A vertical area wraps to its own width; the others grow with their content.
						...(horizontal() ? {} : { width: "100%" }),
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
