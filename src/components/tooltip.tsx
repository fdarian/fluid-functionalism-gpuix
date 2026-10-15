import {
	DismissableLayer,
	type EventPayload,
	type HostElement,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	untrack,
	useContext,
} from "solid-js";
import { readBounds } from "../lib/bounds";
import { createPresence } from "../lib/presence";
import { color, radius, type as scale, motion as tween } from "../lib/theme";

export type TooltipSide = "top" | "right" | "bottom" | "left";

const DEFAULT_DELAY = 200;
const SLIDE = 4;
/** A bare tooltip's own group lasts as long as Base UI's provider default. */
const BARE_SKIP_DELAY = 400;
/** How long the tooltip stays after the pointer leaves, so it can cross the gap to the chip: Base UI's safe polygon, approximated with a timer. */
const GRACE_MS = 80;
/** Base UI's default collision padding. */
const WINDOW_MARGIN = 5;
const CHIP_HEIGHT = 24;

/** What tooltips under one provider share: the hover delay, and when the last one closed so a neighbour can skip it. */
interface TooltipGroup {
	readonly delay: number;
	readonly skipDelay: number;
	closedAt: number | undefined;
}

const TooltipGroupContext = createContext<TooltipGroup>();

/**
 * Moving from one trigger to the next within `skipDelayDuration` of a close
 * opens the next tooltip at once. Without a provider each tooltip is on its
 * own and always waits.
 */
export function TooltipProvider(props: {
	delayDuration?: number;
	skipDelayDuration?: number;
	children: JSX.Element;
}) {
	const group: TooltipGroup = {
		get delay() {
			return props.delayDuration ?? DEFAULT_DELAY;
		},
		get skipDelay() {
			return props.skipDelayDuration ?? 300;
		},
		closedAt: undefined,
	};
	return (
		<TooltipGroupContext.Provider value={group}>
			{props.children}
		</TooltipGroupContext.Provider>
	);
}

const OPPOSITE: Record<TooltipSide, TooltipSide> = {
	top: "bottom",
	bottom: "top",
	left: "right",
	right: "left",
};

/** Where the chip starts, relative to where it rests: it slides in from the trigger's side. */
function slideFrom(side: TooltipSide) {
	switch (side) {
		case "top":
			return { top: SLIDE, left: 0 };
		case "bottom":
			return { top: -SLIDE, left: 0 };
		case "left":
			return { top: 0, left: SLIDE };
		case "right":
			return { top: 0, left: -SLIDE };
	}
}

/**
 * The hover handlers, for a trigger that carries them itself instead of
 * leaving them to the wrapper, which hears them through bubbling anyway.
 */
export interface TooltipTrigger {
	onMouseEnter: () => void;
	/** Only present with `followCursor`: gpuix captures the pointer on any element that listens to both mouseDown and mouseMove, and the child's click would never arrive. */
	onMouseMove?: (event: EventPayload) => void;
	onMouseLeave: () => void;
	onMouseDown: () => void;
}

/** The anchor that centres the chip on its side. gpuix's `align="center"` offsets the layer by half its own size twice, so the corner anchor is picked by hand and the layer's centring does the rest. */
function centredAnchor(side: TooltipSide) {
	switch (side) {
		case "top":
			return "bottomLeft";
		case "bottom":
		case "right":
			return "topLeft";
		case "left":
			return "topRight";
	}
}

export function Tooltip(props: {
	content: JSX.Element;
	/** An unfilled element, or a function receiving the handlers for a trigger that paints a fill. */
	children: JSX.Element | ((trigger: TooltipTrigger) => JSX.Element);
	side?: TooltipSide;
	sideOffset?: number;
	/** Hover delay in ms. Defaults to the provider's, or 200. */
	delayDuration?: number;
	/** `true` / `false` pin the tooltip open / closed; leave it out for hover. */
	forceOpen?: boolean;
	/** Track the pointer along one axis; the other stays anchored by `side`. */
	followCursor?: "x" | "y";
	/** The tooltip opened or closed by hover (not by `forceOpen`). */
	onOpenChange?: (open: boolean) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const ambient = useContext(TooltipGroupContext);
	const group: TooltipGroup = ambient ?? {
		delay: DEFAULT_DELAY,
		skipDelay: BARE_SKIP_DELAY,
		closedAt: undefined,
	};
	/** The side that has room for the chip, chosen each time it opens. */
	const [placed, setPlaced] = createSignal<TooltipSide>();
	const side = () => placed() ?? props.side ?? "top";

	const presence = createPresence();
	const [hovered, setHovered] = createSignal(false);
	const open = () => props.forceOpen ?? hovered();
	const [followOffset, setFollowOffset] = createSignal({ x: 0, y: 0 });
	let wrapper: HostElement | undefined;
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	/** The pointer is on the chip. It enters the chip before the trigger reports it left, so the trigger's leave must not start the close. */
	let overChip = false;
	/** The chip's last painted size, for deciding which side it fits on. */
	let chipSize: { width: number; height: number } | undefined;
	onCleanup(() => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
	});

	/**
	 * Base UI flips to the opposite side when the preferred one has no room.
	 * gpuix's own flip anchors to the far edge of the trigger and covers it, so
	 * the side is chosen here from the trigger's painted box and the window.
	 */
	const placeChip = (): TooltipSide => {
		const preferred = props.side ?? "top";
		const box = wrapper === undefined ? null : readBounds(wrapper);
		const window = renderer.getWindowSize?.();
		if (box == null || window == null) return preferred;
		const chip =
			chipSize ??
			(typeof props.content === "string"
				? { width: props.content.length * 6.5 + 16, height: CHIP_HEIGHT }
				: { width: 160, height: 48 });
		const room = {
			top: box.y,
			bottom: window.height - (box.y + box.height),
			left: box.x,
			right: window.width - (box.x + box.width),
		};
		const need =
			(preferred === "top" || preferred === "bottom"
				? chip.height
				: chip.width) +
			(props.sideOffset ?? 8) +
			WINDOW_MARGIN;
		if (room[preferred] >= need) return preferred;
		const opposite = OPPOSITE[preferred];
		return room[opposite] > room[preferred] ? opposite : preferred;
	};

	createEffect(() => {
		if (open()) {
			untrack(() => setPlaced(placeChip()));
			presence.show();
		} else if (untrack(presence.mounted)) presence.hide();
	});

	const setOpen = (next: boolean) => {
		if (hovered() === next) return;
		setHovered(next);
		props.onOpenChange?.(next);
	};

	const delay = () => {
		const closedAt = group.closedAt;
		if (
			closedAt !== undefined &&
			performance.now() - closedAt < group.skipDelay
		)
			return 0;
		return props.delayDuration ?? group.delay;
	};
	const dismiss = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		overChip = false;
		if (!hovered()) return;
		group.closedAt = performance.now();
		setOpen(false);
	};
	/** The pointer left the trigger or the chip: a pending open is dropped, an open tooltip closes unless the pointer reaches the chip (or comes back) first. */
	const scheduleClose = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		if (!hovered() || overChip) return;
		closeTimer = setTimeout(dismiss, GRACE_MS);
	};

	const onMouseEnter = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		// Coming back while the chip is still fading out brings it straight back.
		const fadingOut = presence.mounted() && !presence.open();
		const wait = fadingOut ? 0 : delay();
		if (wait === 0) setOpen(true);
		else delayTimer = setTimeout(() => setOpen(true), wait);
	};
	const onMouseMove = (event: EventPayload) => {
		if (props.followCursor === undefined) return;
		if (wrapper === undefined) throw new Error("Tooltip is not mounted");
		const bounds = readBounds(wrapper);
		if (bounds == null || event.x === undefined || event.y === undefined)
			return;
		setFollowOffset(
			props.followCursor === "x"
				? { x: event.x - (bounds.x + bounds.width / 2), y: 0 }
				: { x: 0, y: event.y - (bounds.y + bounds.height / 2) },
		);
	};

	const trigger: TooltipTrigger = {
		onMouseEnter,
		get onMouseMove() {
			return props.followCursor === undefined ? undefined : onMouseMove;
		},
		onMouseLeave: scheduleClose,
		onMouseDown: dismiss,
	};
	const render = props.children;

	return (
		<div
			ref={(element) => {
				wrapper = element;
			}}
			testId={props.testId}
			{...(typeof render === "function" ? {} : trigger)}
			style={{ position: "relative", display: "flex", flexShrink: 0 }}
		>
			{typeof render === "function" ? render(trigger) : render}
			{/* Escape closes a hover-opened tooltip before it reaches a dialog behind it; a pinned one is not a layer. */}
			<Show when={hovered() && props.forceOpen === undefined}>
				<DismissableLayer onEscapeKeyDown={dismiss} />
			</Show>
			<Show when={presence.mounted()}>
				<anchored
					side={side()}
					align="center"
					anchor={centredAnchor(side())}
					gap={props.sideOffset ?? 8}
					offset={props.forceOpen === true ? undefined : followOffset()}
					snapMargin={WINDOW_MARGIN}
					deferred
					priority={2}
					style={{ backgroundColor: color.transparent }}
				>
					<motion.div
						testId={props.testId === undefined ? undefined : `${props.testId}-chip`}
						// The chip is hoverable, like Base UI's popup: reaching it keeps the tooltip open.
						onMouseEnter={() => {
							overChip = true;
							clearTimeout(closeTimer);
						}}
						onMouseLeave={() => {
							overChip = false;
							scheduleClose();
						}}
						onLayout={(event: EventPayload) => {
							if (event.width === undefined || event.height === undefined) {
								throw new Error("layout event without a size");
							}
							chipSize = { width: event.width, height: event.height };
						}}
						initial={{ opacity: 0, ...slideFrom(side()) }}
						animate={
							presence.open()
								? { opacity: 1, top: 0, left: 0 }
								: { opacity: 0, ...slideFrom(side()) }
						}
						transition={presence.open() ? tween.fast : tween.fastExit}
						style={{
							position: "relative",
							backgroundColor: color.foreground,
							borderRadius: radius.item,
							paddingLeft: 8,
							paddingRight: 8,
							paddingTop: 4,
							paddingBottom: 4,
						}}
					>
						<Show
							when={typeof props.content === "string"}
							fallback={props.content}
						>
							<text
								style={{
									...scale.caption,
									color: color.background,
									whiteSpace: "nowrap",
								}}
							>
								{props.content as string}
							</text>
						</Show>
					</motion.div>
				</anchored>
			</Show>
		</div>
	);
}
