import {
	type HostElement,
	type HostMouseEvent,
	ResizeObserver,
} from '@gpuix/solid';
import { createEffect, createSignal, onCleanup } from 'solid-js';

/** A row's box relative to the container's own top-left corner. */
export interface ItemRect {
	top: number;
	height: number;
	left: number;
	width: number;
}

type ElementBox = ReturnType<HostElement['getBoundingClientRect']>;

/** The source reads offsetTop/offsetLeft/offsetWidth/offsetHeight, which Chrome returns as integers (half up); gpuix rects are fractional and its layout rounds an authored inset half toward zero, so an unrounded rect lands the highlight off its row. */
function toOffsetRect(bounds: ElementBox, box: ElementBox): ItemRect {
	return {
		top: Math.round(bounds.y - box.y),
		left: Math.round(bounds.x - box.x),
		width: Math.round(bounds.width),
		height: Math.round(bounds.height),
	};
}

export interface PickNearestInput {
	axis: 'x' | 'y' | 'xy';
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

		if (input.axis === 'xy') {
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

		const horizontal = input.axis === 'x';
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
	axis?: 'x' | 'y' | 'xy';
}

/**
 * Port of use-fluid-hover.ts. The DOM version measures with
 * getBoundingClientRect when a ResizeObserver reports; this one does the same
 * for each registered row and for the container, and resolves the pointer
 * with `pickNearest`.
 *
 * Only a box that changes size is reported, so rows must move because the
 * container or a row resized (an accordion opening, a label unfolding, a
 * filter swapping rows). Rows that shift while every observed box keeps its
 * size are not seen.
 */
export function createFluidHover(options: FluidHoverOptions = {}) {
	const items = new Map<number, HostElement>();
	let container: HostElement | undefined;
	let pointer: { x: number; y: number } | undefined;
	let sessionPending = false;

	const observer = new ResizeObserver(() => commit());
	onCleanup(() => observer.disconnect());

	const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
	const [rects, setRects] = createSignal<readonly (ItemRect | undefined)[]>([]);
	const [session, setSession] = createSignal(0);
	const [isMeasured, setIsMeasured] = createSignal(false);

	const measureNow = () => {
		if (container === undefined || !container.mounted) return false;
		const box = container.getBoundingClientRect();
		const next: (ItemRect | undefined)[] = [];
		for (const [index, element] of items) {
			if (!element.mounted) continue;
			next[index] = toOffsetRect(element.getBoundingClientRect(), box);
		}
		setRects(next);
		setIsMeasured(true);
		return true;
	};

	const pick = () => {
		if (container === undefined || !container.mounted) return;
		if (pointer === undefined) return;
		const box = container.getBoundingClientRect();
		const next = pickNearest({
			axis: options.axis ?? 'y',
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
		if (sessionPending) {
			sessionPending = false;
			if (next !== activeIndex()) setSession(session() + 1);
		}
		setActiveIndex(next);
	};

	const commit = () => {
		if (!measureNow()) return false;
		if (pointer !== undefined && activeIndex() !== null) pick();
		return true;
	};

	const setContainer = (element: HostElement) => {
		if (container === element) return;
		if (container !== undefined) observer.unobserve(container);
		container = element;
		observer.observe(element, { box: 'border-box' });
	};

	const handlers = {
		onMouseEnter() {
			sessionPending = true;
			commit();
		},
		onMouseMove(event: Pick<HostMouseEvent, 'x' | 'y'>) {
			if (event.x === undefined || event.y === undefined) {
				throw new Error('mouseMove without coordinates');
			}
			pointer = { x: event.x, y: event.y };
			pick();
		},
		/** Rows moved under a stationary pointer: a scroll event carries no pointer position, so this picks at the last one seen. */
		onScroll() {
			pick();
		},
		onMouseLeave() {
			pointer = undefined;
			setActiveIndex(null);
		},
	};

	return {
		activeIndex,
		setActiveIndex,
		rects,
		session,
		isMeasured,
		containerRef: setContainer,
		registerItem(index: number, element: HostElement) {
			items.set(index, element);
			observer.observe(element, { box: 'border-box' });
			onCleanup(() => {
				if (items.get(index) === element) items.delete(index);
				observer.unobserve(element);
			});
		},
		handlers,
		/** The container's window-coordinate box, read fresh as `pick` reads it. */
		containerBox() {
			if (container === undefined || !container.mounted) {
				throw new Error('containerBox read before the container mounted');
			}
			return container.getBoundingClientRect();
		},
		/** A keyboard move owns the highlight: forgets the pointer so the scroll it causes does not re-pick under it. The next mouse move restores it. */
		releasePointer() {
			pointer = undefined;
		},
		/** Re-reads every row's box now: for a row that resized without the observer reporting it yet. */
		remeasure() {
			commit();
		},
		/** Spread onto the rows' container: registers it, measures once it reports, and wires the pointer. */
		containerProps: {
			ref: setContainer,
			onMouseEnter: handlers.onMouseEnter,
			onMouseMove: handlers.onMouseMove,
			onMouseLeave: handlers.onMouseLeave,
		},
	};
}

/**
 * Raised while rows are rearranged under the highlight (a filter swapping
 * them, a menu gaining items): the highlight snaps to its row's new box
 * instead of gliding there, since the row moved, not the pointer. Lowered on a
 * timer that outlasts the observer's report, because a rearrangement that
 * changes no observed size would never report and a flag waiting on it would
 * stay raised.
 */
const REFLOW_MS = 100;
export function createReflowGate() {
	const [reflowing, setReflowing] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));
	return {
		reflowing,
		raise() {
			clearTimeout(timer);
			setReflowing(true);
			timer = setTimeout(() => setReflowing(false), REFLOW_MS);
		},
	};
}

export type FluidHover = ReturnType<typeof createFluidHover>;

/**
 * Registers a row with the hover. `index` may be reactive (a filtered list
 * moves its rows); an `undefined` index leaves the row out. The element is read
 * once the row has mounted, and a row that never mounts is a bug.
 */
export function useHoverItem(
	hover: FluidHover,
	index: () => number | undefined,
	element: () => HostElement | undefined,
) {
	createEffect(() => {
		const own = index();
		if (own === undefined) return;
		const row = element();
		if (row === undefined) throw new Error('Row is not mounted');
		hover.registerItem(own, row);
	});
}
