import {
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
 * The hover handlers a trigger element takes. gpuix hit-tests a filled or
 * `pointerEvents: "auto"` element as the end of the line, so its ancestors
 * never see the pointer: such a trigger must carry these itself.
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
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const ambient = useContext(TooltipGroupContext);
	const group: TooltipGroup = ambient ?? {
		delay: DEFAULT_DELAY,
		skipDelay: 0,
		closedAt: undefined,
	};
	const side = () => props.side ?? "top";

	const presence = createPresence();
	const [hovered, setHovered] = createSignal(false);
	const open = () => props.forceOpen ?? hovered();
	const [followOffset, setFollowOffset] = createSignal({ x: 0, y: 0 });
	let wrapper: HostElement | undefined;
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(delayTimer));

	createEffect(() => {
		if (open()) presence.show();
		else if (untrack(presence.mounted)) presence.hide();
	});

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
		if (!hovered()) return;
		group.closedAt = performance.now();
		setHovered(false);
	};

	const onMouseEnter = () => {
		clearTimeout(delayTimer);
		const wait = delay();
		if (wait === 0) setHovered(true);
		else delayTimer = setTimeout(() => setHovered(true), wait);
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
		onMouseLeave: dismiss,
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
			<Show when={presence.mounted()}>
				<anchored
					side={side()}
					align="center"
					anchor={centredAnchor(side())}
					gap={props.sideOffset ?? 8}
					offset={props.forceOpen === true ? undefined : followOffset()}
					deferred
					priority={2}
					occlude={false}
					style={{ backgroundColor: color.transparent, pointerEvents: "none" }}
				>
					<motion.div
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
