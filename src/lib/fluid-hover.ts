import type { EventPayload, HostElement } from "@gpuix/solid";
import { createSignal, onCleanup } from "solid-js";
import { readBounds } from "./bounds";

/** A row's box relative to the container's own top-left corner. */
export interface ItemRect {
	top: number;
	height: number;
	left: number;
	width: number;
}

export interface PickNearestInput {
	axis: "x" | "y" | "xy";
	point: { x: number; y: number };
	rects: readonly (ItemRect | undefined)[];
	containerRect: { left: number; top: number; width: number; height: number };
	scroll: { x: number; y: number };
	border: { x: number; y: number };
	layoutSize: { width: number; height: number };
	isDisabled?: (index: number) => boolean;
}

/**
 * Ported verbatim from use-fluid-hover.ts. The pointer inside an item wins;
 * otherwise the item whose centre is nearest does, so a gap, the padding or
 * the space past the last row still lands on a row.
 */
export function pickNearest(input: PickNearestInput): number | null {
	const scaleX =
		input.layoutSize.width > 0
			? input.containerRect.width / input.layoutSize.width
			: 1;
	const scaleY =
		input.layoutSize.height > 0
			? input.containerRect.height / input.layoutSize.height
			: 1;
	let closestIndex: number | null = null;
	let closestDistance = Infinity;
	let containingIndex: number | null = null;

	for (let index = 0; index < input.rects.length; index++) {
		const r = input.rects[index];
		if (!r) continue;
		if (input.isDisabled?.(index)) continue;

		if (input.axis === "xy") {
			const left =
				input.containerRect.left +
				(input.border.x + r.left - input.scroll.x) * scaleX;
			const top =
				input.containerRect.top +
				(input.border.y + r.top - input.scroll.y) * scaleY;
			const width = r.width * scaleX;
			const height = r.height * scaleY;
			if (
				input.point.x >= left &&
				input.point.x <= left + width &&
				input.point.y >= top &&
				input.point.y <= top + height
			) {
				containingIndex = index;
			}
			const distance = Math.hypot(
				input.point.x - (left + width / 2),
				input.point.y - (top + height / 2),
			);
			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = index;
			}
			continue;
		}

		const horizontal = input.axis === "x";
		const mousePos = horizontal ? input.point.x : input.point.y;
		const scale = horizontal ? scaleX : scaleY;
		const itemStart =
			(horizontal ? input.containerRect.left : input.containerRect.top) +
			((horizontal ? input.border.x : input.border.y) +
				(horizontal ? r.left : r.top) -
				(horizontal ? input.scroll.x : input.scroll.y)) *
				scale;
		const itemSize = (horizontal ? r.width : r.height) * scale;
		if (mousePos >= itemStart && mousePos <= itemStart + itemSize) {
			containingIndex = index;
		}
		const distance = Math.abs(mousePos - (itemStart + itemSize / 2));
		if (distance < closestDistance) {
			closestDistance = distance;
			closestIndex = index;
		}
	}

	return containingIndex ?? closestIndex;
}

export interface FluidHoverOptions {
	/** Rows that stay mounted but are clipped away (a collapsed sub-menu). */
	isItemDisabled?: (index: number) => boolean;
	/** The direction rows run in: the pointer resolves to the row nearest along it. Default "y". */
	axis?: "x" | "y" | "xy";
}

/**
 * Attempts to wait for painted bounds. The first `getElementBounds` call only
 * turns tracking on, and bounds exist from the next frame, so a frame or two
 * of nulls is normal. A tree that stays null is a bug, not a state.
 */
const MEASURE_ATTEMPTS = 12;
const MEASURE_RETRY_MS = 16;

/**
 * Port of use-fluid-hover.ts. The DOM version measures with
 * getBoundingClientRect; this one reads gpuix's painted bounds for each
 * registered row and for the container, and resolves the pointer with
 * `pickNearest`.
 */
export function createFluidHover(options: FluidHoverOptions = {}) {
	const items = new Map<number, HostElement>();
	let container: HostElement | undefined;
	let pointer: { x: number; y: number } | undefined;
	let sessionPending = false;
	let measureTimer: ReturnType<typeof setTimeout> | undefined;
	let trackTimer: ReturnType<typeof setInterval> | undefined;

	const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
	const [rects, setRects] = createSignal<readonly (ItemRect | undefined)[]>([]);
	const [session, setSession] = createSignal(0);
	const [isMeasured, setIsMeasured] = createSignal(false);

	let missing: number | undefined;
	const measureNow = () => {
		missing = undefined;
		if (container === undefined) return false;
		const box = readBounds(container);
		if (box === null) return false;
		const next: (ItemRect | undefined)[] = [];
		for (const [index, element] of items) {
			const bounds = readBounds(element);
			if (bounds === null) {
				if (options.isItemDisabled?.(index)) continue;
				missing = index;
				return false;
			}
			next[index] = {
				top: bounds.y - box.y,
				left: bounds.x - box.x,
				width: bounds.width,
				height: bounds.height,
			};
		}
		setRects(next);
		setIsMeasured(true);
		return true;
	};

	const pick = () => {
		if (container === undefined || pointer === undefined) return;
		const box = readBounds(container);
		if (box === null) return;
		const next = pickNearest({
			axis: options.axis ?? "y",
			point: pointer,
			rects: rects(),
			containerRect: {
				left: box.x,
				top: box.y,
				width: box.width,
				height: box.height,
			},
			scroll: { x: 0, y: 0 },
			border: { x: 0, y: 0 },
			layoutSize: { width: box.width, height: box.height },
			isDisabled: options.isItemDisabled,
		});
		if (sessionPending && next !== activeIndex()) {
			sessionPending = false;
			setSession(session() + 1);
		}
		setActiveIndex(next);
	};

	const commit = () => {
		if (!measureNow()) return false;
		if (pointer !== undefined && activeIndex() !== null) pick();
		return true;
	};

	/**
	 * Painted bounds lag the tree by a frame, so a measurement taken in the
	 * same tick as a mutation would read the old layout. The first read waits
	 * two frames, then retries until every row has a box. A list with no
	 * container on screen (an empty state, a hidden question) has nothing to
	 * measure, which is not an error.
	 */
	const remeasure = () => {
		clearTimeout(measureTimer);
		let attempts = 0;
		const attempt = () => {
			if (container === undefined || !container.mounted) return;
			if (commit()) return;
			attempts += 1;
			if (attempts >= MEASURE_ATTEMPTS) {
				throw new Error(
					`Fluid hover: painted bounds still unavailable after ${MEASURE_ATTEMPTS} frames (${missing === undefined ? "container" : `row ${missing}`})`,
				);
			}
			measureTimer = setTimeout(attempt, MEASURE_RETRY_MS);
		};
		measureTimer = setTimeout(attempt, MEASURE_RETRY_MS * 2);
	};

	/** Re-reads every frame for `ms`: rows are moving under an animation, as the DOM version's ResizeObserver would follow. */
	const remeasureFor = (ms: number) => {
		clearInterval(trackTimer);
		const until = performance.now() + ms;
		trackTimer = setInterval(() => {
			commit();
			if (performance.now() >= until) clearInterval(trackTimer);
		}, MEASURE_RETRY_MS);
	};

	onCleanup(() => {
		clearTimeout(measureTimer);
		clearInterval(trackTimer);
	});

	return {
		activeIndex,
		setActiveIndex,
		rects,
		session,
		isMeasured,
		remeasure,
		remeasureFor,
		/** The container is going away (an empty state replaced the rows): drop pending reads of it. */
		cancelMeasure() {
			clearTimeout(measureTimer);
			clearInterval(trackTimer);
		},
		containerRef(element: HostElement) {
			container = element;
		},
		registerItem(index: number, element: HostElement) {
			items.set(index, element);
			onCleanup(() => {
				if (items.get(index) === element) items.delete(index);
			});
		},
		handlers: {
			onMouseEnter() {
				sessionPending = true;
				// Layout may have settled since the last measurement; what is painted now is current.
				commit();
			},
			onMouseMove(event: EventPayload) {
				if (event.x === undefined || event.y === undefined) {
					throw new Error("mouseMove without coordinates");
				}
				pointer = { x: event.x, y: event.y };
				pick();
			},
			/** Rows moved under a stationary pointer. */
			onScroll() {
				pick();
			},
			onMouseLeave() {
				pointer = undefined;
				setActiveIndex(null);
			},
		},
	};
}

export type FluidHover = ReturnType<typeof createFluidHover>;
