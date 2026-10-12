import {
	type DimensionValue,
	type EventPayload,
	type HostElement,
	motion,
	type StyleDesc,
	useGpuixRequired,
} from "@gpuix/solid";
import { createSignal, type JSX, onCleanup, onMount, Show } from "solid-js";
import { scheme } from "../lib/theme";

export type ScrollOrientation = "vertical" | "horizontal" | "both";

/** `--scroll-fade-size`. */
const FADE_PX = 48;
/** The scrollbar track: a 10px hit target the 4px thumb sits inside. */
const TRACK_PX = 10;
/** The thumb keeps 4px off each end of its track (`my-1`). */
const THUMB_INSET = 4;
const THUMB_MIN_PX = 20;
/** How long Base UI keeps `data-scrolling` after the last wheel tick. */
const SCROLLING_MS = 500;
const MEASURE_ATTEMPTS = 12;
const MEASURE_RETRY_MS = 16;
/** The offset a wheel tick produces is readable a frame or two later. */
const SYNC_DELAYS_MS = [0, 16, 48, 100];

interface Metrics {
	viewW: number;
	viewH: number;
	contentW: number;
	contentH: number;
	/** Scrolled distance, positive. */
	x: number;
	y: number;
}

type Axis = "x" | "y";

/** `rgb(var(--overlay) / a)`: black on light surfaces, white on dark. */
const overlay = (alpha: number) =>
	scheme() === "light" ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;

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

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Scrollbar and edge fade over a gpuix scroller. gpuix paints no scrollbar and
 * has no mask, so the thumb is read from `getScrollOffset` after each wheel
 * tick and the fade is an opaque-to-clear gradient in the surface's own colour.
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
	const renderer = useGpuixRequired();
	const orientation = () => props.orientation ?? "vertical";
	const vertical = () => orientation() !== "horizontal";
	const horizontal = () => orientation() !== "vertical";
	const both = () => orientation() === "both";

	let viewport: HostElement | undefined;
	let content: HostElement | undefined;
	const timers = new Set<ReturnType<typeof setTimeout>>();
	let scrollingTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => {
		for (const timer of timers) clearTimeout(timer);
		clearTimeout(scrollingTimer);
	});

	const [metrics, setMetrics] = createSignal<Metrics>();
	const [rootHovered, setRootHovered] = createSignal(false);
	const [trackHovered, setTrackHovered] = createSignal<Axis>();
	const [scrolling, setScrolling] = createSignal(false);
	const [dragging, setDragging] = createSignal<Axis>();

	const read = (): Metrics | null => {
		if (viewport === undefined || content === undefined) {
			throw new Error("ScrollArea is not mounted");
		}
		const view = renderer.getElementBounds?.(viewport.id);
		const inner = renderer.getElementBounds?.(content.id);
		const offset = renderer.getScrollOffset?.(viewport.id);
		if (view == null || inner == null || offset == null) return null;
		return {
			viewW: view.width,
			viewH: view.height,
			contentW: inner.width,
			contentH: inner.height,
			x: -offset[0],
			y: -offset[1],
		};
	};

	const syncNow = () => {
		const next = read();
		if (next !== null) setMetrics(next);
	};
	const scheduleSync = () => {
		for (const delay of SYNC_DELAYS_MS) {
			const timer = setTimeout(() => {
				timers.delete(timer);
				syncNow();
			}, delay);
			timers.add(timer);
		}
	};

	onMount(() => {
		// The first bounds query only turns tracking on; boxes exist from the next painted frame.
		const attempt = (count: number) => {
			const next = read();
			if (next !== null) {
				setMetrics(next);
				return;
			}
			if (count >= MEASURE_ATTEMPTS) {
				throw new Error("ScrollArea bounds never became available");
			}
			setTimeout(() => attempt(count + 1), MEASURE_RETRY_MS);
		};
		setTimeout(() => attempt(0), MEASURE_RETRY_MS * 2);
	});

	// gpui hands one wheel tick to every scroll container under the pointer (no stop_propagation, no overscroll-behavior), so an enclosing scroller would move along with this one. Its offset is put back whenever this area moved, and left alone once this area is at its limit, which is what chaining does in a browser.
	let outer: HostElement | undefined;
	let outerAnchor: [number, number] | undefined;
	let innerOffset: [number, number] | undefined;
	const nearestScroller = (): HostElement | undefined => {
		let node = viewport?.parent;
		while (node?.kind === "element") {
			const style = node.style;
			if (
				(style.overflowY ?? style.overflow) === "scroll" ||
				(style.overflowX ?? style.overflow) === "scroll"
			) {
				return node;
			}
			node = node.parent;
		}
		return undefined;
	};
	const recordOffsets = () => {
		if (viewport === undefined) throw new Error("ScrollArea is not mounted");
		const inner = renderer.getScrollOffset?.(viewport.id);
		innerOffset = inner == null ? undefined : [inner[0], inner[1]];
		outer = nearestScroller();
		const above = outer && renderer.getScrollOffset?.(outer.id);
		outerAnchor = above == null ? undefined : [above[0], above[1]];
	};
	const containWheel = () => {
		if (
			viewport === undefined ||
			outer === undefined ||
			outerAnchor === undefined ||
			innerOffset === undefined
		) {
			return;
		}
		const inner = renderer.getScrollOffset?.(viewport.id);
		if (inner == null) return;
		const moved = inner[0] !== innerOffset[0] || inner[1] !== innerOffset[1];
		innerOffset = [inner[0], inner[1]];
		if (moved) {
			renderer.scrollTo?.(outer.id, outerAnchor[0], outerAnchor[1]);
			return;
		}
		const above = renderer.getScrollOffset?.(outer.id);
		if (above != null) outerAnchor = [above[0], above[1]];
	};

	const onScroll = () => {
		containWheel();
		setScrolling(true);
		clearTimeout(scrollingTimer);
		scrollingTimer = setTimeout(() => setScrolling(false), SCROLLING_MS);
		scheduleSync();
	};

	const scrollTo = (x: number, y: number) => {
		if (viewport === undefined) throw new Error("ScrollArea is not mounted");
		if (renderer.scrollTo === undefined) {
			throw new Error("This renderer does not expose scrollTo");
		}
		renderer.scrollTo(viewport.id, -x, -y);
		recordOffsets();
		syncNow();
	};

	// ── Thumb geometry ──────────────────────────────────────────────────────

	/** The thumb's span along its track, or `null` when there is nothing to scroll. */
	const thumb = (axis: Axis) => {
		const m = metrics();
		if (m === undefined) return null;
		const view = axis === "y" ? m.viewH : m.viewW;
		const total = axis === "y" ? m.contentH : m.contentW;
		const scrolled = axis === "y" ? m.y : m.x;
		if (total <= view + 0.5) return null;
		const track = view - (both() ? TRACK_PX : 0);
		const usable = track - THUMB_INSET * 2;
		const length = Math.max(THUMB_MIN_PX, (view / total) * usable);
		const maxScroll = total - view;
		return {
			length,
			start: THUMB_INSET + (scrolled / maxScroll) * (usable - length),
			/** Scroll distance per pixel of thumb travel. */
			ratio: maxScroll / (usable - length),
			usable,
			maxScroll,
		};
	};

	const scrollAlong = (axis: Axis, distance: number) => {
		const m = metrics();
		const span = thumb(axis);
		if (m === undefined || span === null) return;
		const next = clamp(distance, 0, span.maxScroll);
		scrollTo(axis === "x" ? next : m.x, axis === "y" ? next : m.y);
	};

	// ── Dragging ────────────────────────────────────────────────────────────

	let dragOrigin = { pointer: 0, scrolled: 0 };
	const pointerAlong = (axis: Axis, event: EventPayload) => {
		const value = axis === "y" ? event.y : event.x;
		if (value === undefined) throw new Error("mouse event without coordinates");
		return value;
	};
	const startDrag = (axis: Axis, event: EventPayload) => {
		const m = metrics();
		if (m === undefined) return;
		dragOrigin = {
			pointer: pointerAlong(axis, event),
			scrolled: axis === "y" ? m.y : m.x,
		};
		setDragging(axis);
	};
	const dragTo = (event: EventPayload) => {
		// A release that happened before the overlay mounted (a click faster than a frame) never reaches it; the first move with no button held ends the drag instead.
		if (event.pressedButton === undefined) {
			setDragging(undefined);
			return;
		}
		const axis = dragging();
		const span = axis === undefined ? null : thumb(axis);
		if (axis === undefined || span === null) return;
		scrollAlong(
			axis,
			dragOrigin.scrolled +
				(pointerAlong(axis, event) - dragOrigin.pointer) * span.ratio,
		);
	};

	/** A press on the thumb starts a drag; one on the bare track jumps so the thumb centres under the pointer. */
	const pressTrack = (
		axis: Axis,
		track: HostElement | undefined,
		event: EventPayload,
	) => {
		const span = thumb(axis);
		if (span === null || track === undefined) return;
		const box = renderer.getElementBounds?.(track.id);
		if (box == null) return;
		const along = pointerAlong(axis, event) - (axis === "y" ? box.y : box.x);
		if (along >= span.start && along <= span.start + span.length) {
			startDrag(axis, event);
			return;
		}
		scrollAlong(axis, (along - THUMB_INSET - span.length / 2) * span.ratio);
	};

	const visible = () =>
		rootHovered() ||
		trackHovered() !== undefined ||
		scrolling() ||
		dragging() !== undefined;

	// ── Fade ────────────────────────────────────────────────────────────────

	const fadeAmount = (axis: Axis, edge: "start" | "end") => {
		const m = metrics();
		if (props.fade !== true || m === undefined) return 0;
		const view = axis === "y" ? m.viewH : m.viewW;
		const total = axis === "y" ? m.contentH : m.contentW;
		const scrolled = axis === "y" ? m.y : m.x;
		if (total <= view + 0.5) return 0;
		return clamp(
			edge === "start"
				? scrolled / FADE_PX
				: (total - view - scrolled) / FADE_PX,
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
					initial={false}
					animate={{ opacity: visible() ? 1 : 0 }}
					// Shows at once; on hide waits out the thumb's shrink before fading.
					transition={
						visible()
							? { duration: 0.16, ease: "easeOut" }
							: { duration: 0.12, delay: 0.16, ease: "easeOut" }
					}
					onMouseEnter={() => setTrackHovered(bar.axis)}
					onMouseLeave={() => setTrackHovered(undefined)}
					onMouseDown={(event: EventPayload) =>
						pressTrack(bar.axis, track, event)
					}
					style={{
						position: "absolute",
						...(bar.axis === "y"
							? {
									top: 0,
									right: 0,
									width: TRACK_PX,
									bottom: both() ? TRACK_PX : 0,
								}
							: {
									left: 0,
									bottom: 0,
									height: TRACK_PX,
									right: both() ? TRACK_PX : 0,
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
							// An absolute box would block the track's own hover and press, so the track hit-tests the thumb by coordinates.
							pointerEvents: "none",
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
			onMouseEnter={() => {
				setRootHovered(true);
				recordOffsets();
				scheduleSync();
			}}
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
				style={{
					width: "100%",
					height: "100%",
					overflowY: vertical() ? "scroll" : "hidden",
					overflowX: horizontal() ? "scroll" : "hidden",
					// gpuix only lets a child overflow sideways inside a flex viewport; it sets that up for x-only scrollers but not for both axes.
					...(both()
						? {
								display: "flex",
								flexDirection: "row",
								alignItems: "flex-start",
							}
						: {}),
				}}
			>
				<div
					ref={(element) => {
						content = element;
					}}
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
			<Show when={dragging() !== undefined}>
				{/* A drag has no pointer capture in gpuix: a window-sized layer keeps the move and release events once the pointer leaves the thumb. */}
				<anchored
					fill="window"
					occlude
					deferred
					priority={3}
					style={{ backgroundColor: "rgba(0,0,0,0)" }}
				>
					<div
						onMouseMove={dragTo}
						onMouseUp={() => setDragging(undefined)}
						style={{ width: "100%", height: "100%" }}
					/>
				</anchored>
			</Show>
		</div>
	);
}
