import {
	type DimensionValue,
	type EventPayload,
	type HostElement,
	type HostMouseEvent,
	type HostWheelEvent,
	type KeyEvent,
	motion,
	type ScrollEvent,
	type StyleDesc,
} from "@gpuix/solid";
import { createSignal, type JSX, onCleanup, Show } from "solid-js";
import { readBounds } from "../lib/bounds";
import { isChord } from "../lib/list-nav";
import { color, withAlpha } from "../lib/theme";

export type ScrollOrientation = "vertical" | "horizontal" | "both";

/** `--scroll-fade-size`. */
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

/** The same colour at alpha 0, so a gradient to "transparent" does not pass through grey. */
function clear(cssColor: string): string {
	const hex = /^#([0-9a-f]{6})$/i.exec(cssColor);
	if (hex !== null) {
		const value = Number.parseInt(hex[1], 16);
		return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},0)`;
	}
	const rgba = /^rgba?\(([^,]+),([^,]+),([^,)]+)/.exec(cssColor);
	if (rgba !== null) return `rgba(${rgba[1]},${rgba[2]},${rgba[3]},0)`;
	throw new Error(`Cannot fade from ${cssColor}`);
}

function sizeOf(event: EventPayload): Size {
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
 * `onScroll`; the fade is an opaque-to-clear gradient in the surface's own
 * colour.
 */
export function ScrollArea(props: {
	orientation?: ScrollOrientation;
	/** `scroll-fade` (vertical) or `scroll-fade-x` (horizontal): dissolve the edges that have more to scroll. */
	fade?: boolean;
	/** The surface the area sits on: the fade paints this colour, since there is no mask to erase the content with. */
	fadeColor?: string;
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
	const scrollingTimer: Record<Axis, ReturnType<typeof setTimeout> | undefined> =
		{ x: undefined, y: undefined };
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
		mountedViewport().scrollTo(
			axis === "x" ? { left: next } : { top: next },
		);
		return true;
	};

	// ── Dragging ────────────────────────────────────────────────────────────

	let dragOrigin = { pointer: 0, scrolled: 0 };
	const pointerAlong = (axis: Axis, event: EventPayload) => {
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
	const dragTo = (event: EventPayload) => {
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
		const box = readBounds(track);
		if (box == null) return;
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

	/** A wheel tick over the track scrolls the viewport, which is not under the pointer. Once the viewport is at its limit the tick is left to chain to the scroller around it. */
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
		const size = view();
		if (size === undefined) return;
		let axis: Axis | undefined;
		let target: number | undefined;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp":
				axis = "y";
				target = positionOf("y") + (event.key === "ArrowDown" ? ARROW_PX : -ARROW_PX);
				break;
			case "ArrowRight":
			case "ArrowLeft":
				axis = "x";
				target = positionOf("x") + (event.key === "ArrowRight" ? ARROW_PX : -ARROW_PX);
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
		rootHovered() ||
		trackHovered() !== undefined ||
		scrolling()[axis] ||
		dragging() === axis;

	// ── Fade ────────────────────────────────────────────────────────────────

	const fadeAmount = (axis: Axis, edge: "start" | "end") => {
		const size = view();
		const inner = content();
		if (props.fade !== true || size === undefined || inner === undefined) {
			return 0;
		}
		if (!overflows(axis)) return 0;
		const viewLength = axis === "y" ? size.h : size.w;
		const total = axis === "y" ? inner.h : inner.w;
		const scrolled = axis === "y" ? offset().y : offset().x;
		return clamp(
			edge === "start"
				? scrolled / FADE_PX
				: (total - viewLength - scrolled) / FADE_PX,
			0,
			1,
		);
	};

	const Fade = (fade: { axis: Axis; edge: "start" | "end" }) => (
		<Show
			when={
				props.fade === true && (fade.axis === "y" ? vertical() : horizontal())
			}
		>
			<div
				style={{
					position: "absolute",
					pointerEvents: "none",
					opacity: fadeAmount(fade.axis, fade.edge),
					...(fade.axis === "y"
						? {
								left: 0,
								right: 0,
								height: FADE_PX,
								[fade.edge === "start" ? "top" : "bottom"]: 0,
							}
						: {
								top: 0,
								bottom: 0,
								width: FADE_PX,
								[fade.edge === "start" ? "left" : "right"]: 0,
							}),
					background: {
						type: "linear-gradient",
						// 0 points up and values increase clockwise: the gradient starts at the box edge and clears inward.
						angle:
							fade.axis === "y"
								? fade.edge === "start"
									? 180
									: 0
								: fade.edge === "start"
									? 90
									: 270,
						stops: [
							{ color: props.fadeColor ?? "#000000", position: 0 },
							{ color: clear(props.fadeColor ?? "#000000"), position: 1 },
						],
					},
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
				onLayout={(event: EventPayload) =>
					setView(sizeOf(event))
				}
				// A viewport that overflows is a tab stop and scrolls with the keys, like a focused scroller in a browser.
				tabIndex={overflows("x") || overflows("y") ? 0 : -1}
				onKeyDown={onKeyDown}
				style={{
					keyboardFocusDim: false,
					width: "100%",
					height: "100%",
					overflowY: vertical() ? "scroll" : "hidden",
					overflowX: horizontal() ? "scroll" : "hidden",
					// The thumbs are drawn by this component.
					scrollbarWidth: "none",
					// There is no `width: max-content`, and `overflowX: "scroll"` no longer makes the viewport a flex row: without one the content box is clamped to the viewport and nothing overflows.
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
					onLayout={(event: EventPayload) => setContent(sizeOf(event))}
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
			<Fade axis="y" edge="start" />
			<Fade axis="y" edge="end" />
			<Fade axis="x" edge="start" />
			<Fade axis="x" edge="end" />
			<Show when={vertical()}>
				<Scrollbar axis="y" />
			</Show>
			<Show when={horizontal()}>
				<Scrollbar axis="x" />
			</Show>
		</div>
	);
}
