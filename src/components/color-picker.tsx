import {
	buttonProps,
	document,
	type HostElement,
	type HostMouseEvent,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { createPointerCapture } from "../lib/pointer-capture";
import { StableLabel } from "../lib/stable-label";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, useHoverItem } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { edgeIndex, isChord, moveIndex } from "../lib/list-nav";
import {
	createPlacementState,
	POPUP_MARGIN,
	POPUP_OFFSET,
} from "../lib/popup";
import { createPresence } from "../lib/presence";
import { createPressToggle, refocusAfterPress } from "../lib/popup-trigger";
import { createTypeahead } from "../lib/typeahead";
import { color, colorFade, colorFadeNoRing, fade, springFade, height, nestedRadius, radius, shape, type as scale, scheme, shadow, motion as tween, weight, surface, focusRing } from "../lib/theme";
import {
	buildParsed,
	clamp01,
	type ColorFormat,
	formatValueByFormat,
	hslToRgb,
	hsvToRgb,
	oklchToRgb,
	type ParsedColor,
	parseColor,
	rgbToHexStr,
	rgbToHsl,
	rgbToHsv,
	rgbToOklch,
} from "./color-picker-math";
import { Tooltip } from "./tooltip";

export type { ColorFormat, ParsedColor } from "./color-picker-math";
export { buildParsed, parseColor } from "./color-picker-math";

const PANEL_WIDTH = 280;
const PANEL_PADDING = 12;
const INNER_WIDTH = PANEL_WIDTH - PANEL_PADDING * 2;
const SQUARE_HEIGHT = 156;
const THUMB = 18;
const RAIL_THUMB = 20;
/** The source slider's track area: the thumb row plus 8px above and below. */
const RAIL_HEIGHT = RAIL_THUMB + 16;
const RAIL_PAD = 8;
const RAIL_KNOB = 16;
const RAIL_TRACK = 18;
const HAIRLINE = "rgba(127,127,127,0.25)";
/** The source's `transition-colors duration-80` on its buttons and fields, whose focus ring is a box-shadow that stays out of that list: `colorFade` would also fade the port's outline ring in. */
const BUTTON_FADE = colorFadeNoRing(80);
const focusOutline = () => ({
	outlineWidth: 1,
	outlineColor: color.focusRing,
	outlineOffset: 0,
});

const FORMATS = ["hex", "rgb", "hsl", "oklch"] as const;
const FORMAT_LABELS: Record<ColorFormat, string> = {
	hex: "HEX",
	rgb: "RGB",
	hsl: "HSL",
	oklch: "OKLCH",
};

const chevronUp = defineIcon('<path d="m18 15-6-6-6 6"/>');


/** The squares of a 4px checkerboard that take `--checker-a`, as one path. */
function checkerSource(width: number, size: number) {
	const cell = 4;
	let path = "";
	for (let row = 0; row * cell < size; row++) {
		for (let col = 0; col * cell < width; col++) {
			if ((row + col) % 2 === 1) {
				path += `M${col * cell} ${row * cell}h${cell}v${cell}h-${cell}z`;
			}
		}
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${size}"><path d="${path}" fill="currentColor"/></svg>`;
}

/**
 * The alpha checkerboard. gpuix has no conic gradients or tiled backgrounds,
 * so it is a backing fill plus a monochrome SVG of the other squares, filled
 * with `style.color`.
 */
function Checker(props: { width: number; height: number }) {
	const source = createMemo(() => checkerSource(props.width, props.height));
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: props.width,
				height: props.height,
				backgroundColor: color.checkerB,
			}}
		>
			<svg
				source={source()}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: props.width,
					height: props.height,
					color: color.checkerA,
				}}
			/>
		</div>
	);
}

/** A colour over the checker, with the 25% grey hairline that keeps white from vanishing. */
export function ColorTile(props: { color: string; size?: number }) {
	const size = () => props.size ?? 24;
	return (
		<div
			style={{
				position: "relative",
				width: size(),
				height: size(),
				flexShrink: 0,
				borderRadius: shape.bg,
				overflow: "hidden",
			}}
		>
			<Checker width={size()} height={size()} />
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: size(),
					height: size(),
					backgroundColor: props.color,
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: size(),
					height: size(),
					borderRadius: shape.bg,
					boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
				}}
			/>
		</div>
	);
}

/** The accent ring sits outside a 2px gap in the page colour, as the source stacks them. */
export function ColorSwatch(props: {
	color: string;
	size?: number;
	selected?: boolean;
	onClick?: () => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const size = () => props.size ?? 28;
	const [hovered, setHovered] = createSignal(false);
	const ringShadow = () => {
		if (props.selected !== true && !hovered()) return undefined;
		const ring = props.selected === true ? color.focusRing : "rgba(127,127,127,0.4)";
		return `0 0 0 2px ${color.background}, 0 0 0 4px ${ring}`;
	};
	return (
		<div
			{...buttonProps({ onClick: props.onClick, tabIndex: 0 }, renderer)}
			aria-label={`Select color ${props.color}`}
			testId={props.testId}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: "relative",
				width: size(),
				height: size(),
				flexShrink: 0,
				borderRadius: shape.bg,
				cursor: "pointer",
				boxShadow: ringShadow(),
				...fade(["box-shadow"], 100),
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: size(),
					height: size(),
					borderRadius: shape.bg,
					overflow: "hidden",
				}}
			>
				<Checker width={size()} height={size()} />
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: size(),
						height: size(),
						backgroundColor: props.color,
					}}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: size(),
					height: size(),
					borderRadius: shape.bg,
					boxShadow: `inset 0 0 0 1px ${HAIRLINE}`,
				}}
			/>
		</div>
	);
}

/** Window x/y to a 0..1 point inside an element's painted box. */
function useFractionIn() {
	const renderer = useGpuixRequired();
	return (
		element: HostElement | undefined,
		event: Pick<HostMouseEvent, "x" | "y">,
	) => {
		if (element === undefined || !element.mounted) {
			throw new Error("Pointer target is not mounted");
		}
		if (event.x === undefined || event.y === undefined) {
			throw new Error("Pointer event without coordinates");
		}
		const bounds = element.getBoundingClientRect();
		return {
			x: clamp01((event.x - bounds.x) / bounds.width),
			y: clamp01((event.y - bounds.y) / bounds.height),
			px: Math.max(0, Math.min(bounds.width, event.x - bounds.x)),
			py: Math.max(0, Math.min(bounds.height, event.y - bounds.y)),
		};
	};
}

/**
 * The HSV plane at the current hue: x is saturation, y is value. A press sets
 * the colour and dragging keeps going past the edges, where it pins to the
 * border. Arrows nudge S (left/right) and V (up/down) by 0.01, Shift by 0.1.
 */
function SaturationSquare(props: {
	h: number;
	s: number;
	v: number;
	onChange: (s: number, v: number) => void;
	testId: string;
}) {
	const fractionIn = useFractionIn();
	let element: HostElement | undefined;
	const [dragging, setDragging] = createSignal(false);
	const [hovered, setHovered] = createSignal(false);
	const [cursor, setCursor] = createSignal<{ x: number; y: number }>();

	const apply = (event: Pick<HostMouseEvent, "x" | "y">) => {
		const point = fractionIn(element, event);
		props.onChange(point.x, 1 - point.y);
	};

	const onKeyDown = (event: KeyEvent) => {
		const step = event.shiftKey === true ? 0.1 : 0.01;
		switch (event.key) {
			case "ArrowLeft":
				props.onChange(clamp01(props.s - step), props.v);
				break;
			case "ArrowRight":
				props.onChange(clamp01(props.s + step), props.v);
				break;
			case "ArrowUp":
				props.onChange(props.s, clamp01(props.v + step));
				break;
			case "ArrowDown":
				props.onChange(props.s, clamp01(props.v - step));
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	const thumbColor = () => {
		const rgb = hsvToRgb(props.h, props.s, props.v);
		return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
	};
	const hueColor = () => `hsl(${props.h}, 100%, 50%)`;

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			role="application"
			aria-label="Saturation and brightness"
			testId={props.testId}
			tabIndex={0}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => {
				setHovered(false);
				setCursor(undefined);
			}}
			onMouseDown={(event) => {
				if (event.button !== 0) return;
				element?.setPointerCapture(event.pointerId);
				setDragging(true);
				apply(event);
			}}
			onMouseMove={(event) => {
				const point = fractionIn(element, event);
				setCursor({ x: point.px, y: point.py });
				if (dragging()) props.onChange(point.x, 1 - point.y);
			}}
			onMouseUp={() => setDragging(false)}
			onLostPointerCapture={() => setDragging(false)}
			onKeyDown={onKeyDown}
			style={{
				position: "relative",
				width: INNER_WIDTH,
				height: SQUARE_HEIGHT,
				borderRadius: nestedRadius(shape.container, 12),
				flexShrink: 0,
				// gpuix has no `cursor: none`, so the ghost ring and the pointer both show.
				cursor: "crosshair",
				userSelect: "none",
				keyboardFocusDim: false,
				focusVisible: {
					outlineWidth: 2,
					outlineColor: color.focusRing,
					outlineOffset: 0,
				},
			}}
		>
			{/* Black rising from the bottom over white to the pure hue: the plane, as two stacked gradients. */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: INNER_WIDTH,
					height: SQUARE_HEIGHT,
					borderRadius: nestedRadius(shape.container, 12),
					background: {
						type: "linear-gradient",
						angle: 90,
						stops: [
							{ color: "#ffffff", position: 0 },
							{ color: hueColor(), position: 1 },
						],
						colorSpace: "srgb",
					},
				}}
			/>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: INNER_WIDTH,
					height: SQUARE_HEIGHT,
					borderRadius: nestedRadius(shape.container, 12),
					background: {
						type: "linear-gradient",
						angle: 0,
						stops: [
							{ color: "#000000", position: 0 },
							{ color: "rgba(0,0,0,0)", position: 1 },
						],
						colorSpace: "srgb",
					},
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: props.s * INNER_WIDTH - THUMB / 2,
					top: (1 - props.v) * SQUARE_HEIGHT - THUMB / 2,
					width: THUMB,
					height: THUMB,
					borderRadius: THUMB / 2,
					borderWidth: 1,
					borderColor: "#ffffff",
					backgroundColor: thumbColor(),
					outlineWidth: 1,
					outlineColor: "#000000",
					outlineOffset: 0,
				}}
			/>
			<Show when={hovered() && !dragging() ? cursor() : undefined}>
				{(ghost: Accessor<{ x: number; y: number }>) => (
					<div
						style={{
							position: "absolute",
							left: ghost().x - THUMB / 2,
							top: ghost().y - THUMB / 2,
							width: THUMB,
							height: THUMB,
							borderRadius: THUMB / 2,
							borderWidth: 2,
							borderColor: "rgba(255,255,255,0.55)",
							outlineWidth: 1,
							outlineColor: "rgba(0,0,0,0.2)",
							outlineOffset: 0,
							pointerEvents: "none",
						}}
					/>
				)}
			</Show>
		</div>
	);
}

/**
 * The compact slider the hue and alpha rails use: a pill track holding the
 * gradient, and a 20px thumb box around a 16px knob. The thumb is the focus
 * target so its ring is a circle; a press anywhere on the rail, 8px past each
 * end included, moves it.
 */
function Rail(props: {
	testId: string;
	label: string;
	value: number;
	min: number;
	max: number;
	thumbColor: string;
	onChange: (value: number) => void;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	let root: HostElement | undefined;
	let thumb: HostElement | undefined;
	const press = createPointerCapture("Rail");
	const [dragging, setDragging] = createSignal(false);

	const fraction = () => (props.value - props.min) / (props.max - props.min);
	const apply = (event: Pick<HostMouseEvent, "x">) => {
		if (root === undefined || !root.mounted) {
			throw new Error("Rail is not mounted");
		}
		if (event.x === undefined) throw new Error("Pointer event without x");
		const bounds = root.getBoundingClientRect();
		const usable = bounds.width - RAIL_THUMB;
		const along = clamp01((event.x - bounds.x - RAIL_THUMB / 2) / usable);
		props.onChange(Math.round(props.min + along * (props.max - props.min)));
	};

	const onKeyDown = (event: KeyEvent) => {
		const step = event.shiftKey === true ? 10 : 1;
		const clamp = (value: number) =>
			Math.max(props.min, Math.min(props.max, value));
		switch (event.key) {
			case "ArrowLeft":
			case "ArrowDown":
				props.onChange(clamp(props.value - step));
				break;
			case "ArrowRight":
			case "ArrowUp":
				props.onChange(clamp(props.value + step));
				break;
			case "Home":
				props.onChange(props.min);
				break;
			case "End":
				props.onChange(props.max);
				break;
			default:
				return;
		}
		event.preventDefault();
	};

	return (
		<div
			ref={(node) => {
				root = node;
			}}
			testId={props.testId}
			style={{
				position: "relative",
				width: INNER_WIDTH,
				height: RAIL_HEIGHT,
				flexShrink: 0,
			}}
		>
			<div
				style={{
					position: "absolute",
					top: RAIL_PAD + (RAIL_THUMB - RAIL_TRACK) / 2,
					left: (RAIL_THUMB - RAIL_TRACK) / 2,
					width: INNER_WIDTH - (RAIL_THUMB - RAIL_TRACK),
					height: RAIL_TRACK,
					borderRadius: RAIL_TRACK / 2,
					overflow: "hidden",
				}}
			>
				{props.children}
			</div>
			<div
				ref={(node) => {
					thumb = node;
				}}
				role="slider"
				aria-label={props.label}
				aria-valuetext={String(props.value)}
				tabIndex={0}
				onKeyDown={onKeyDown}
				style={{
					position: "absolute",
					top: RAIL_PAD,
					left: fraction() * (INNER_WIDTH - RAIL_THUMB),
					width: RAIL_THUMB,
					height: RAIL_THUMB,
					borderRadius: RAIL_THUMB / 2,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					keyboardFocusDim: false,
					...springFade(["outline-color"]),
					focusVisible: focusRing(2),
				}}
			>
				<div
					style={{
						width: RAIL_KNOB,
						height: RAIL_KNOB,
						borderRadius: RAIL_KNOB / 2,
						borderWidth: 1,
						borderColor: "rgba(255,255,255,0.9)",
						backgroundColor: props.thumbColor,
						boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
					}}
				/>
			</div>
			<div
				ref={press.ref}
				onMouseDown={(event) => {
					if (event.button !== 0) return;
					press.capture(event);
					setDragging(true);
					apply(event);
					if (thumb !== undefined) renderer.focusElement?.(thumb.id);
				}}
				onMouseMove={(event) => {
					if (dragging()) apply(event);
				}}
				onMouseUp={() => setDragging(false)}
				onLostPointerCapture={() => setDragging(false)}
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: -8,
					right: -8,
					cursor: "ew-resize",
				}}
			/>
		</div>
	);
}

const HUE_STOPS = [0, 60, 120, 180, 240, 300, 360];

function HueRail(props: {
	h: number;
	onChange: (h: number) => void;
	testId: string;
}) {
	return (
		<Rail
			testId={props.testId}
			label="Hue"
			value={props.h}
			min={0}
			max={360}
			thumbColor={`hsl(${props.h}, 100%, 50%)`}
			onChange={props.onChange}
		>
			{/* gpuix gradients take two stops, so the rainbow is six of them side by side. */}
			<div style={{ display: "flex", flexDirection: "row", height: "100%" }}>
				<For each={HUE_STOPS.slice(0, -1)}>
					{(stop: number, index: Accessor<number>) => (
						<div
							style={{
								flexGrow: 1,
								height: "100%",
								background: {
									type: "linear-gradient",
									angle: 90,
									stops: [
										{ color: `hsl(${stop}, 100%, 50%)`, position: 0 },
										{
											color: `hsl(${HUE_STOPS[index() + 1]}, 100%, 50%)`,
											position: 1,
										},
									],
									colorSpace: "srgb",
								},
							}}
						/>
					)}
				</For>
			</div>
		</Rail>
	);
}

function AlphaRail(props: {
	a: number;
	solid: { r: number; g: number; b: number };
	onChange: (a: number) => void;
	testId: string;
}) {
	const solid = () =>
		`rgb(${Math.round(props.solid.r)}, ${Math.round(props.solid.g)}, ${Math.round(props.solid.b)})`;
	const clear = () =>
		`rgba(${Math.round(props.solid.r)}, ${Math.round(props.solid.g)}, ${Math.round(props.solid.b)}, 0)`;
	return (
		<Rail
			testId={props.testId}
			label="Alpha"
			value={Math.round(props.a * 100)}
			min={0}
			max={100}
			thumbColor={solid()}
			onChange={(value) => props.onChange(value / 100)}
		>
			<Checker width={INNER_WIDTH - 2} height={RAIL_TRACK} />
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: INNER_WIDTH - 2,
					height: RAIL_TRACK,
					background: {
						type: "linear-gradient",
						angle: 90,
						stops: [
							{ color: clear(), position: 0 },
							{ color: solid(), position: 0.98 },
						],
						colorSpace: "srgb",
					},
				}}
			/>
		</Rail>
	);
}

/** The source's own fallback for an exit that never reports completing: `spring.moderate.exit` is 120 ms, `spring.fast.exit` 60 ms. */
const POPOVER_EXIT_FALLBACK_MS = 150;
const FORMAT_MENU_EXIT_FALLBACK_MS = 120;

/** An anchored card of a given surface level that slides and fades like the shared popup, at the speed the source gives it: the popover is `moderate`, the format menu `fast`. Opens below its trigger, or above when there is no room. */
function Popup(props: {
	presence: ReturnType<typeof createPresence>;
	speed: "fast" | "moderate";
	width: number;
	level: number;
	children: JSX.Element;
}) {
	const placement = createPlacementState("bottom");
	const slide = () => (placement.side() === "top" ? 4 : -4);
	return (
		<Show when={props.presence.mounted()}>
			<anchored
				side="bottom"
				align="start"
				gap={POPUP_OFFSET}
				fit="flip"
				snapMargin={POPUP_MARGIN}
				onPlacement={placement.onPlacement}
				deferred
				priority={2}
				style={{ backgroundColor: color.transparent }}
			>
				<motion.div
					initial={{ opacity: 0, top: slide() }}
					animate={
						props.presence.open()
							? { opacity: 1, top: 0 }
							: { opacity: 0, top: slide() }
					}
					transition={
						props.presence.open()
							? tween[props.speed]
							: tween[`${props.speed}Exit`]
					}
					onMotionComplete={() => {
						if (!props.presence.open()) props.presence.release();
					}}
					style={{
						position: "relative",
						width: props.width,
						display: "flex",
						flexDirection: "column",
						backgroundColor: surface(props.level),
						borderRadius: radius.container,
						boxShadow: shadow(3),
					}}
				>
					{props.children}
				</motion.div>
			</anchored>
		</Show>
	);
}

const MENU_ROW = 36;

function FormatDropdown(props: {
	value: ColorFormat;
	onChange: (format: ColorFormat) => void;
	defaultOpen?: boolean;
	/** The surface the menu rises above: it sits two levels higher. */
	level: number;
	testId: string;
}) {
	const presence = createPresence(FORMAT_MENU_EXIT_FALLBACK_MS);
	const hover = createFluidHover();
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	/** The pointer lit the row (or none), not a key: leaving the rows hands focus to the panel. */
	const [pointerLit, setPointerLit] = createSignal(false);
	/** Opened from the first render, so the page keeps focus until the reader reaches into the menu (the source's `openWithPageRef`). */
	const [pageHoldsFocus, setPageHoldsFocus] = createSignal(false);
	const triggerId = createUniqueId();
	const menuId = createUniqueId();
	const rowId = (index: number) => `${menuId}-row-${index}`;
	const rowElements = new Map<number, HostElement>();
	let button: HostElement | undefined;
	let panel: HostElement | undefined;
	const checkedIndex = () => FORMATS.indexOf(props.value);
	const width = (INNER_WIDTH - 8) / 2;

	const focusPanel = () => panel?.focus({ preventScroll: true });
	const focusRow = (index: number) =>
		rowElements.get(index)?.focus({ preventScroll: true });
	/** A key lights a row (or none) and the focus effect below moves focus to it. */
	const highlight = (index: number | null) => {
		setPointerLit(false);
		hover.releasePointer();
		hover.setActiveIndex(index);
	};

	/** A keyboard open focuses the first row (ArrowUp: the last); a pointer open focuses the panel and lights nothing. */
	const open = (from: "pointer" | "first" | "last" = "pointer") => {
		if (presence.open()) return;
		presence.show();
		setPageHoldsFocus(false);
		setPointerLit(false);
		const start = from === "pointer" ? null : edgeIndex(from, FORMATS.length);
		hover.setActiveIndex(start);
		if (start === null) focusPanel();
		else focusRow(start);
	};
	/** Closing hands focus back to the trigger when it sat in the popup, which is about to unmount and drop it, or nowhere; a control that took it since keeps it (Base UI's returnFocus). */
	const close = () => {
		if (!presence.open()) return;
		const popupHasFocus =
			panel !== undefined && panel.mounted && panel.matches(":focus-within");
		presence.hide();
		setPageHoldsFocus(false);
		if (
			button !== undefined &&
			button.mounted &&
			(popupHasFocus || document.activeElement === null)
		) {
			button.focus();
		}
	};
	const choose = (format: ColorFormat) => {
		props.onChange(format);
		close();
	};
	if (props.defaultOpen === true) {
		queueMicrotask(() => {
			if (presence.open()) return;
			presence.show();
			setPageHoldsFocus(true);
		});
	}
	const press = createPressToggle({
		isOpen: presence.open,
		open: () => open(),
		close,
	});

	// Highlight follows focus and focus follows the highlight: a hover or a key lights
	// a row and the row takes focus. Leaving every row hands focus to the panel.
	createEffect(
		on(hover.activeIndex, (index) => {
			if (!presence.open() || pageHoldsFocus()) return;
			if (index === null) {
				if (pointerLit()) focusPanel();
				return;
			}
			focusRow(index);
		}),
	);

	const move = (delta: 1 | -1) => {
		highlight(moveIndex(hover.activeIndex(), delta, FORMATS.length));
	};
	const typeahead = createTypeahead({
		labels: () => FORMATS.map((format) => FORMAT_LABELS[format]),
		current: hover.activeIndex,
		onMatch: highlight,
	});

	/** The closed trigger's keys. An open menu only hears the trigger while the page holds focus, and the reader reaching in from it is what hands focus over. */
	const onTriggerKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		if (!presence.open()) {
			if (
				event.key === "ArrowDown" ||
				event.key === "ArrowUp" ||
				event.key === "Enter" ||
				event.key === " "
			) {
				event.preventDefault();
				if (event.key === "ArrowDown" || event.key === "ArrowUp")
					event.stopPropagation();
				open(event.key === "ArrowUp" ? "last" : "first");
			}
			return;
		}
		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				event.stopPropagation();
				setPageHoldsFocus(false);
				highlight(
					edgeIndex(event.key === "ArrowUp" ? "last" : "first", FORMATS.length),
				);
				return;
			case "Enter":
			case " ":
				event.preventDefault();
				close();
				return;
			case "Escape":
				event.preventDefault();
				event.stopPropagation();
				close();
				return;
			case "Tab":
				close();
				return;
		}
	};

	/** The popup's keys; focus is on a row or the panel, so nothing reaches the trigger or the popover around it. */
	const onPanelKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		event.stopPropagation();
		if (event.key === "Escape") {
			event.preventDefault();
			close();
			return;
		}
		if (event.key === "Tab") {
			// Forward: the trigger takes focus as the menu closes, so the default Tab moves on from it. Backward leaves it on the trigger.
			if (event.shiftKey === true) event.preventDefault();
			close();
			return;
		}
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			return;
		}
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				move(-1);
				return;
			case "Home":
			case "End":
				event.preventDefault();
				highlight(
					edgeIndex(event.key === "Home" ? "first" : "last", FORMATS.length),
				);
				return;
			case "Enter":
			case " ": {
				event.preventDefault();
				const index = hover.activeIndex();
				if (index !== null) choose(FORMATS[index]);
				return;
			}
		}
	};

	const rectFor = (index: number | null) => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<div
			onMouseDownOutside={() => {
				if (!presence.open()) return;
				close();
				refocusAfterPress(button);
			}}
			style={{ position: "relative", width, height: height.control }}
		>
			<div
				ref={(node) => {
					button = node;
				}}
				id={triggerId}
				role="button"
				aria-label="Color format"
				aria-haspopup="menu"
				aria-expanded={presence.open()}
				aria-controls={presence.open() ? menuId : undefined}
				testId={props.testId}
				tabIndex={0}
				onMouseDown={press.onMouseDown}
				onClick={press.onClick}
				onKeyDown={onTriggerKeyDown}
				onMouseEnter={() => setTriggerHovered(true)}
				onMouseLeave={() => setTriggerHovered(false)}
				style={{
					width,
					height: height.control,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					paddingLeft: 12,
					paddingRight: 12,
					borderRadius: shape.input,
					cursor: "pointer",
					keyboardFocusDim: false,
					backgroundColor: presence.open() ? color.active : color.transparent,
					...BUTTON_FADE,
					hover: {
						backgroundColor: presence.open() ? color.active : color.hover,
					},
					active: { backgroundColor: color.active },
					focusVisible: focusOutline(),
				}}
			>
				<text
					style={{
						...scale.body,
						fontWeight: weight.normal,
						color:
							presence.open() || triggerHovered()
								? color.foreground
								: color.mutedForeground,
						...colorFade,
					}}
				>
					{FORMAT_LABELS[props.value]}
				</text>
				<Icon
					name={presence.open() ? chevronUp : "chevron-down"}
					size={14}
					strokeWidth={1.5}
					color={color.mutedForeground}
				/>
			</div>
			<Popup
				presence={presence}
				speed="fast"
				width={width}
				level={props.level + 2}
			>
				<div
					ref={(element) => {
						panel = element;
						hover.containerRef(element);
					}}
					id={menuId}
					testId={`${props.testId}-popup`}
					role="menu"
					aria-labelledby={triggerId}
					// A pointer open, or leaving the rows, lands focus here so the keys still reach it.
					tabIndex={-1}
					onKeyDown={onPanelKeyDown}
					onMouseDown={() => setPageHoldsFocus(false)}
					onMouseEnter={() => {
						setPointerLit(true);
						hover.handlers.onMouseEnter();
					}}
					onMouseMove={(event) => {
						setPointerLit(true);
						hover.handlers.onMouseMove(event);
					}}
					onMouseLeave={hover.handlers.onMouseLeave}
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						padding: 4,
						keyboardFocusDim: false,
					}}
				>
					<FluidHighlight
						rect={() => rectFor(checkedIndex())}
						session={() => 0}
						radius={radius.item}
						background={color.active}
						glide={tween.moderate}
						fade={tween.moderateExit}
					/>
					<FluidHighlight
						rect={() => rectFor(hover.activeIndex())}
						session={hover.session}
						from={() => rectFor(checkedIndex())}
						radius={radius.item}
						background={color.hover}
					/>
					<For each={FORMATS}>
						{(format: ColorFormat, index: Accessor<number>) => {
							let row: HostElement | undefined;
							useHoverItem(hover, index, () => row);
							const checked = () => props.value === format;
							const lit = () => hover.activeIndex() === index() || checked();
							return (
								<div
									ref={(element) => {
										row = element;
										rowElements.set(index(), element);
										onCleanup(() => {
											if (rowElements.get(index()) === element)
												rowElements.delete(index());
										});
									}}
									id={rowId(index())}
									role="menuitemradio"
									aria-checked={checked()}
									testId={`${props.testId}-${format}`}
									tabIndex={
										presence.open() && hover.activeIndex() === index() ? 0 : -1
									}
									onFocus={() => hover.setActiveIndex(index())}
									onClick={() => choose(format)}
									style={{
										height: MENU_ROW,
										flexShrink: 0,
										display: "flex",
										flexDirection: "row",
										alignItems: "center",
										paddingLeft: 12,
										paddingRight: 12,
										borderRadius: shape.item,
										cursor: "pointer",
										keyboardFocusDim: false,
									}}
								>
									<StableLabel
										text={FORMAT_LABELS[format]}
										heavy={checked()}
										color={lit() ? color.foreground : color.mutedForeground}
										fade
									/>
								</div>
							);
						}}
					</For>
				</div>
			</Popup>
		</div>
	);
}

function numberOf(display: string) {
	return Number.parseFloat(display.replace("%", ""));
}

/**
 * One field of the inputs row. Typing edits a draft that commits on blur
 * (Enter blurs, Escape reverts). A scrubbable field also drags sideways: one
 * step per pixel, and a press that does not drag starts editing.
 */
function ColorInput(props: {
	value: string;
	onCommit: (next: string) => void;
	ariaLabel: string;
	testId: string;
	width: number;
	align?: "left" | "center";
	prefix?: string;
	nudgeStep?: number;
	nudgeShiftStep?: number;
	hasPercent?: boolean;
	decimals?: number;
	scrubbable?: boolean;
	min?: number;
	max?: number;
	/** Wraps (modulo) instead of clamping: hue is an angle. */
	wrap?: boolean;
}) {
	const renderer = useGpuixRequired();
	const [draft, setDraft] = createSignal(props.value);
	const [focused, setFocused] = createSignal(false);
	const [editing, setEditing] = createSignal(props.scrubbable !== true);
	let input: HostElement | undefined;
	let press: { x: number; value: number; scrubbed: boolean } | undefined;
	const field = createPointerCapture("ColorInput");

	// While the field has focus, outside changes leave the draft alone.
	createEffect(
		on(
			() => props.value,
			(value) => {
				if (!focused()) setDraft(value);
			},
		),
	);

	const formatNumber = (n: number) =>
		props.decimals === undefined
			? String(Math.round(n))
			: n.toFixed(props.decimals);

	const bound = (n: number) => {
		if (
			props.wrap === true &&
			props.min !== undefined &&
			props.max !== undefined
		) {
			const range = props.max - props.min;
			return ((((n - props.min) % range) + range) % range) + props.min;
		}
		let bounded = n;
		if (props.min !== undefined) bounded = Math.max(props.min, bounded);
		if (props.max !== undefined) bounded = Math.min(props.max, bounded);
		return bounded;
	};

	const commitNumber = (n: number) => {
		const formatted = formatNumber(bound(n));
		const display = props.hasPercent === true ? `${formatted}%` : formatted;
		setDraft(display);
		props.onCommit(display);
	};

	const nudge = (direction: 1 | -1, shift: boolean) => {
		const step = shift ? (props.nudgeShiftStep ?? 10) : (props.nudgeStep ?? 1);
		const current = numberOf(draft());
		if (Number.isNaN(current)) return;
		commitNumber(current + direction * step);
	};

	const focusInput = () => {
		if (input === undefined) throw new Error("ColorInput is not mounted");
		renderer.focusElement?.(input.id);
	};

	const commitDraft = () => {
		if (draft() === props.value) return;
		const numeric = numberOf(draft());
		const bounded = props.min !== undefined || props.max !== undefined;
		if (!bounded) {
			props.onCommit(draft());
			return;
		}
		// Text that is not a number is dropped and the field shows the colour's value again, like the source's NumberField.
		if (Number.isNaN(numeric)) setDraft(props.value);
		else commitNumber(numeric);
	};

	const onKeyDown = (event: KeyEvent) => {
		if (event.key === "Escape") {
			setDraft(props.value);
			renderer.blur?.();
			return;
		}
		if (event.key === "Enter") {
			event.preventDefault();
			renderer.blur?.();
			return;
		}
		if (
			(event.key === "ArrowUp" || event.key === "ArrowDown") &&
			(props.nudgeStep !== undefined || props.nudgeShiftStep !== undefined)
		) {
			event.preventDefault();
			nudge(event.key === "ArrowUp" ? 1 : -1, event.shiftKey === true);
		}
	};

	const scrub = props.scrubbable === true;
	return (
		<div
			ref={field.ref}
			testId={props.testId}
			onMouseDown={
				scrub
					? (event) => {
							if (editing() || event.x === undefined) return;
							// Pressing the field would focus its input; only a press that never scrubs does that, on release.
							event.preventDefault();
							field.capture(event);
							press = {
								x: event.x,
								value: numberOf(props.value),
								scrubbed: false,
							};
						}
					: undefined
			}
			onMouseMove={
				scrub
					? (event) => {
							if (press === undefined || event.x === undefined) return;
							const travel = event.x - press.x;
							if (Math.abs(travel) < 3 && !press.scrubbed) return;
							press.scrubbed = true;
							commitNumber(press.value + travel * (props.nudgeStep ?? 1));
						}
					: undefined
			}
			// pointerup, not mouseup: the capture ends between the two, and its lost-capture handler clears `press`.
			onPointerUp={
				scrub
					? () => {
							const pressed = press;
							press = undefined;
							if (pressed === undefined || pressed.scrubbed) return;
							setEditing(true);
							focusInput();
						}
					: undefined
			}
			onLostPointerCapture={() => {
				press = undefined;
			}}
			style={{
				width: props.width,
				height: height.control,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: 8,
				paddingRight: 8,
				borderRadius: shape.input,
				// On the wrapper: an `<input>` ignores the property in its own style but inherits it.
				fontVariantNumeric: "tabular-nums",
				cursor: scrub && !editing() ? "ew-resize" : "text",
				userSelect: "none",
				outlineWidth: focused() ? 1 : 0,
				outlineColor: color.focusRing,
				outlineOffset: 0,
				...BUTTON_FADE,
				hover: { backgroundColor: color.hover },
				active: { backgroundColor: color.active },
			}}
		>
			<Show when={props.prefix}>
				{(prefix: Accessor<string>) => (
					<div style={{ marginRight: 4 }}>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							{prefix()}
						</text>
					</div>
				)}
			</Show>
			<input
				ref={(node) => {
					input = node;
				}}
				aria-label={props.ariaLabel}
				testId={`${props.testId}-input`}
				value={draft()}
				theme={{
					text: color.foreground,
					textMuted: color.mutedForeground,
					textFaint: color.mutedForeground,
					textDim: color.mutedForeground,
					caret: color.foreground,
				}}
				onChange={(event) => {
					if (event.value === undefined) {
						throw new Error("ColorInput change without a value");
					}
					setDraft(event.value);
				}}
				onFocus={() => {
					setFocused(true);
					if (scrub) setEditing(true);
				}}
				onBlur={() => {
					setFocused(false);
					if (scrub) setEditing(false);
					commitDraft();
				}}
				onKeyDown={onKeyDown}
				style={{
					flexGrow: 1,
					minWidth: 0,
					height: 24,
					fontSize: scale.body.fontSize,
					fontWeight: weight.normal,
					textAlign: props.align === "center" ? "center" : "left",
					color: color.foreground,
					backgroundColor: color.transparent,
					keyboardFocusDim: false,
					pointerEvents: scrub && !editing() ? "none" : undefined,
				}}
			/>
		</div>
	);
}

/** A channel field with a 300ms name tooltip. */
function Channel(
	props: Omit<Parameters<typeof ColorInput>[0], "ariaLabel"> & {
		name: string;
	},
) {
	return (
		<Tooltip content={props.name} delayDuration={300}>
			<ColorInput {...props} ariaLabel={props.name} />
		</Tooltip>
	);
}

type ChannelKey =
	| "hex"
	| "r"
	| "g"
	| "b"
	| "hSL"
	| "sSL"
	| "lSL"
	| "L"
	| "C"
	| "H"
	| "alphaPercent";

function ColorInputsRow(props: {
	parsed: ParsedColor;
	format: ColorFormat;
	oklchHue: number | null;
	onChannelChange: (key: ChannelKey, value: string) => void;
	testId: string;
}) {
	const alphaPct = () => Math.round(props.parsed.a * 100);
	const four = (INNER_WIDTH - 12) / 4;
	const half = (INNER_WIDTH - 8) / 2;
	const id = (name: string) => `${props.testId}-${name}`;
	const alpha = (width: number) => (
		<Channel
			name="Alpha"
			testId={id("alpha-input")}
			width={width}
			value={`${alphaPct()}%`}
			onCommit={(input) => {
				const n = Number.parseFloat(input.replace("%", ""));
				if (Number.isNaN(n)) return;
				props.onChannelChange(
					"alphaPercent",
					String(Math.max(0, Math.min(100, Math.round(n)))),
				);
			}}
			align="center"
			nudgeStep={1}
			nudgeShiftStep={10}
			hasPercent
			scrubbable
			min={0}
			max={100}
		/>
	);
	const whole = (
		name: string,
		key: ChannelKey,
		value: () => number,
		min: number,
		max: number,
		wrap?: boolean,
	) => (
		<Channel
			name={name}
			testId={id(key)}
			width={four}
			value={String(value())}
			onCommit={(next) => props.onChannelChange(key, next)}
			align="center"
			nudgeStep={1}
			nudgeShiftStep={10}
			scrubbable
			min={min}
			max={max}
			wrap={wrap}
		/>
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				gap: props.format === "hex" ? 8 : 4,
			}}
		>
			<Show when={props.format === "hex"}>
				<Channel
					name="Hex"
					testId={id("hex")}
					width={half}
					value={props.parsed.hex.replace(/^#/, "").toUpperCase()}
					onCommit={(next) =>
						props.onChannelChange(
							"hex",
							next.startsWith("#") ? next : `#${next}`,
						)
					}
					prefix="#"
				/>
				{alpha(half)}
			</Show>
			<Show when={props.format === "rgb"}>
				{whole("Red", "r", () => props.parsed.r, 0, 255)}
				{whole("Green", "g", () => props.parsed.g, 0, 255)}
				{whole("Blue", "b", () => props.parsed.b, 0, 255)}
				{alpha(four)}
			</Show>
			<Show when={props.format === "hsl"}>
				{(() => {
					const hsl = () =>
						rgbToHsl(props.parsed.r, props.parsed.g, props.parsed.b);
					return (
						<>
							{whole("Hue", "hSL", () => Math.round(hsl().h), 0, 360, true)}
							{whole("Saturation", "sSL", () => Math.round(hsl().s * 100), 0, 100)}
							{whole("Lightness", "lSL", () => Math.round(hsl().l * 100), 0, 100)}
							{alpha(four)}
						</>
					);
				})()}
			</Show>
			<Show when={props.format === "oklch"}>
				{(() => {
					const oklch = () =>
						rgbToOklch(props.parsed.r, props.parsed.g, props.parsed.b);
					return (
						<>
							{whole("Lightness", "L", () => Math.round(oklch().L * 100), 0, 100)}
							<Channel
								name="Chroma"
								testId={id("C")}
								width={four}
								value={oklch().C.toFixed(2)}
								onCommit={(next) => props.onChannelChange("C", next)}
								align="center"
								nudgeStep={0.01}
								nudgeShiftStep={0.1}
								decimals={2}
								scrubbable
								min={0}
								max={0.4}
							/>
							{whole(
								"Hue",
								"H",
								() => Math.round(props.oklchHue ?? oklch().H),
								0,
								360,
								true,
							)}
							{alpha(four)}
						</>
					);
				})()}
			</Show>
		</div>
	);
}

/** A swatch that cannot be read (a CSS colour name) matches nothing, and clicking it does nothing, as in the source for a colour it cannot resolve. */
function normalizedHex(input: string) {
	const parsed = parseColor(input);
	if (parsed === null) return undefined;
	return rgbToHexStr(parsed.r, parsed.g, parsed.b, parsed.a).toLowerCase();
}

function isSelectedSwatch(swatch: string, current: string) {
	const swatchHex = normalizedHex(swatch);
	return swatchHex !== undefined && swatchHex === normalizedHex(current);
}

export type ColorPickerProps = {
	/** Hex (3, 4, 6 or 8 digits), rgb(a), hsl(a) or oklch. A later value that does not parse is ignored; an unparseable first value starts at pure red. */
	value?: string;
	defaultValue?: string;
	/** Fires with the colour in the current format and the parsed colour in every format. Switching format fires it too. */
	onValueChange?: (value: string, parsed: ParsedColor) => void;
	format?: ColorFormat;
	defaultFormat?: ColorFormat;
	onFormatChange?: (format: ColorFormat) => void;
	/** Hex, rgb(a), hsl(a) or oklch. A named colour paints but is never marked selected and picking it does nothing: gpuix has no JS colour resolver. */
	swatches?: string[];
	/** Opens the format menu from the first render. */
	defaultFormatOpen?: boolean;
	testId?: string;
	/** Surface level the panel's own card sits on. Defaults to 3. */
	level?: number;
};

/** The panel itself: no card around it, so a popover can supply its own. */
function ColorPickerPanel(props: ColorPickerProps) {
	const testId = () => props.testId ?? "color-picker";
	const isControlled = () => props.value !== undefined;
	const [internalValue, setInternalValue] = createSignal(
		props.value ?? props.defaultValue ?? "#6B97FF",
	);
	const [internalFormat, setInternalFormat] = createSignal<ColorFormat>(
		props.defaultFormat ?? "hex",
	);
	const currentFormat = () => props.format ?? internalFormat();

	const initial = parseColor(untrack(internalValue));
	const [hsv, setHsv] = createSignal(
		(() => {
			if (initial === null) return { h: 0, s: 1, v: 1, a: 1 };
			const converted = rgbToHsv(initial.r, initial.g, initial.b);
			return {
				h: converted.s === 0 ? 0 : converted.h,
				s: converted.s,
				v: converted.v,
				a: initial.a,
			};
		})(),
	);
	// The OKLCH hue the user stated, kept across the lossy RGB round trip and through
	// grays. Cleared when another channel moves the hue.
	const [oklchHue, setOklchHue] = createSignal<number | null>(null);
	let lastEmitted = "";

	createEffect(
		on(
			() => props.value,
			(value) => {
				if (value === undefined || value === lastEmitted) return;
				const parsed = parseColor(value);
				if (parsed === null) return;
				setOklchHue(null);
				const next = rgbToHsv(parsed.r, parsed.g, parsed.b);
				setHsv((previous) => ({
					h: next.s === 0 ? previous.h : next.h,
					s: next.s,
					v: next.v,
					a: parsed.a,
				}));
			},
			{ defer: true },
		),
	);

	const parsed = createMemo(() => {
		const current = hsv();
		return buildParsed(current.h, current.s, current.v, current.a);
	});

	const emit = (next: ParsedColor, format: ColorFormat) => {
		const formatted = formatValueByFormat(next, format);
		lastEmitted = formatted;
		if (!isControlled()) setInternalValue(formatted);
		props.onValueChange?.(formatted, next);
	};

	const updateHsv = (next: {
		h?: number;
		s?: number;
		v?: number;
		a?: number;
	}) => {
		const merged = { ...hsv(), ...next };
		setHsv(merged);
		emit(buildParsed(merged.h, merged.s, merged.v, merged.a), currentFormat());
	};

	const handleFormatChange = (format: ColorFormat) => {
		if (props.format === undefined) setInternalFormat(format);
		props.onFormatChange?.(format);
		emit(parsed(), format);
	};

	/** The whole-colour entry point of the hex field and the swatches. */
	const commitColor = (input: string) => {
		const result = parseColor(input);
		if (result === null) return;
		setOklchHue(null);
		const next = rgbToHsv(result.r, result.g, result.b);
		const merged = {
			h: next.s === 0 ? hsv().h : next.h,
			s: next.s,
			v: next.v,
			a: result.a,
		};
		setHsv(merged);
		emit(buildParsed(merged.h, merged.s, merged.v, merged.a), currentFormat());
	};

	const onChannelChange = (channel: ChannelKey, value: string) => {
		const p = parsed();
		switch (channel) {
			case "hex":
				commitColor(value);
				return;
			case "r":
			case "g":
			case "b": {
				setOklchHue(null);
				const r = channel === "r" ? Number(value) : p.r;
				const g = channel === "g" ? Number(value) : p.g;
				const b = channel === "b" ? Number(value) : p.b;
				const next = rgbToHsv(r, g, b);
				updateHsv({ h: next.s === 0 ? hsv().h : next.h, s: next.s, v: next.v });
				return;
			}
			case "hSL":
			case "sSL":
			case "lSL": {
				if (channel === "hSL") setOklchHue(null);
				const hsl = rgbToHsl(p.r, p.g, p.b);
				const h2 = channel === "hSL" ? Number(value) : hsl.h;
				const s2 = channel === "sSL" ? Number(value) / 100 : hsl.s;
				const l2 = channel === "lSL" ? Number(value) / 100 : hsl.l;
				const rgb = hslToRgb(h2, clamp01(s2), clamp01(l2));
				const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
				updateHsv({ h: next.s === 0 ? h2 : next.h, s: next.s, v: next.v });
				return;
			}
			case "L":
			case "C":
			case "H": {
				const current = rgbToOklch(p.r, p.g, p.b);
				const baseHue = oklchHue() ?? current.H;
				const L = channel === "L" ? Number(value) / 100 : current.L;
				const C = channel === "C" ? Number(value) : current.C;
				const H = channel === "H" ? Number(value) : baseHue;
				setOklchHue(H);
				const rgb = oklchToRgb(clamp01(L), Math.max(0, C), H);
				const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
				updateHsv({ h: next.s === 0 ? hsv().h : next.h, s: next.s, v: next.v });
				return;
			}
			case "alphaPercent":
				updateHsv({ a: clamp01(Number(value) / 100) });
				return;
		}
	};

	const solid = () => hsvToRgb(hsv().h, hsv().s, hsv().v);

	return (
		<div
			testId={testId()}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: PANEL_PADDING,
				width: PANEL_WIDTH,
			}}
		>
			<SaturationSquare
				testId={`${testId()}-square`}
				h={hsv().h}
				s={hsv().s}
				v={hsv().v}
				onChange={(s, v) => updateHsv({ s, v })}
			/>
			<div style={{ display: "flex", flexDirection: "column" }}>
				<HueRail
					testId={`${testId()}-hue`}
					h={hsv().h}
					onChange={(h) => {
						setOklchHue(null);
						updateHsv({ h });
					}}
				/>
				<div style={{ marginTop: -1 }}>
					<AlphaRail
						testId={`${testId()}-alpha`}
						a={hsv().a}
						solid={solid()}
						onChange={(a) => updateHsv({ a })}
					/>
				</div>
			</div>
			<div style={{ display: "flex", flexDirection: "row", gap: 8 }}>
				<FormatDropdown
					testId={`${testId()}-format`}
					value={currentFormat()}
					onChange={handleFormatChange}
					defaultOpen={props.defaultFormatOpen}
					level={props.level ?? 3}
				/>
			</div>
			<ColorInputsRow
				testId={testId()}
				parsed={parsed()}
				format={currentFormat()}
				oklchHue={oklchHue()}
				onChannelChange={onChannelChange}
			/>
			<Show when={props.swatches !== undefined && props.swatches.length > 0}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 8,
					}}
				>
					<For each={props.swatches}>
						{(swatch: string, index: Accessor<number>) => (
							<ColorSwatch
								testId={`${testId()}-swatch-${index()}`}
								color={swatch}
								selected={isSelectedSwatch(swatch, parsed().hex)}
								onClick={() => commitColor(swatch)}
							/>
						)}
					</For>
				</div>
			</Show>
		</div>
	);
}

/** The panel on its own card: surface level 3 with `--shadow-1`, the hairline ring and no drop. */
export function ColorPicker(props: ColorPickerProps) {
	return (
		<div
			style={{
				width: PANEL_WIDTH,
				backgroundColor: surface(props.level ?? 3),
				borderRadius: shape.container,
				boxShadow: shadow(1),
			}}
		>
			<ColorPickerPanel {...props} />
		</div>
	);
}

/** A tile and the hex value behind a button; its press opens the panel below. */
export function ColorPickerPopover(
	props: ColorPickerProps & {
		triggerLabel?: string;
		triggerLabelPosition?: "left" | "right";
		/** The 6-digit hex next to the tile, alpha left out: the tile shows it. */
		triggerShowValue?: boolean;
		/** An X inside the trigger that calls `onTriggerRemove` without opening. */
		triggerShowRemove?: boolean;
		onTriggerRemove?: () => void;
		defaultOpen?: boolean;
	},
) {
	const presence = createPresence(POPOVER_EXIT_FALLBACK_MS);
	const [removeHovered, setRemoveHovered] = createSignal(false);

	const isControlled = () => props.value !== undefined;
	const [internalValue, setInternalValue] = createSignal(
		props.value ?? props.defaultValue ?? "#6B97FF",
	);
	const currentValue = () =>
		isControlled() ? (props.value as string) : internalValue();

	const open = () => {
		if (presence.open()) return;
		presence.show();
	};
	const close = () => {
		if (!presence.open()) return;
		presence.hide();
	};
	if (props.defaultOpen === true) queueMicrotask(open);

	const parsed = createMemo(() => parseColor(currentValue()));
	const swatchColor = () => {
		const result = parsed();
		return result === null
			? currentValue()
			: rgbToHexStr(result.r, result.g, result.b, result.a);
	};
	const valueLabel = () => {
		const result = parsed();
		return result === null
			? currentValue()
			: rgbToHexStr(result.r, result.g, result.b, 1)
					.replace(/^#/, "")
					.toUpperCase();
	};

	const label = (text: string) => (
		<div style={{ paddingLeft: 4, paddingRight: 4 }}>
			<text
				style={{
					...scale.body,
					fontWeight: weight.normal,
					color: color.mutedForeground,
				}}
			>
				{text}
			</text>
		</div>
	);

	return (
		<div
			onMouseDownOutside={close}
			style={{
				position: "relative",
				display: "flex",
				alignSelf: "flex-start",
				// A press on the popover's bare content lands focus here, so Escape still reaches the handler below; the wrapper dims with its descendants unless this is off.
				keyboardFocusDim: false,
			}}
			tabIndex={-1}
			onKeyDown={(event) => {
				if (event.key === "Escape" && presence.open()) close();
			}}
		>
			<div
				role="button"
				aria-label={props.triggerLabel ?? "Pick a color"}
				aria-expanded={presence.open()}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-trigger`
				}
				tabIndex={0}
				onClick={() => {
					if (removeHovered()) return;
					if (presence.open()) close();
					else open();
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter" || event.key === " ") {
						event.preventDefault();
						if (presence.open()) close();
						else open();
					}
				}}
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					height: height.control,
					paddingLeft: 8,
					paddingRight: 8,
					borderRadius: shape.input,
					borderWidth: 1,
					borderColor: color.border,
					cursor: "pointer",
					keyboardFocusDim: false,
					...BUTTON_FADE,
					hover: { backgroundColor: color.hover },
					focusVisible: focusOutline(),
				}}
			>
				<Show
					when={
						props.triggerLabel !== undefined &&
						props.triggerLabelPosition !== "right"
					}
				>
					{label(props.triggerLabel as string)}
				</Show>
				<ColorTile color={swatchColor()} size={20} />
				<Show when={props.triggerShowValue !== false}>
					<text
						style={{
							...scale.body,
							fontWeight: weight.normal,
							color: color.foreground,
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{valueLabel()}
					</text>
				</Show>
				<Show
					when={
						props.triggerLabel !== undefined &&
						props.triggerLabelPosition === "right"
					}
				>
					{label(props.triggerLabel as string)}
				</Show>
				<Show when={props.triggerShowRemove === true}>
					<div
						role="button"
						aria-label="Remove color"
						testId={
							props.testId === undefined ? undefined : `${props.testId}-remove`
						}
						onMouseEnter={() => setRemoveHovered(true)}
						onMouseLeave={() => setRemoveHovered(false)}
						onClick={() => props.onTriggerRemove?.()}
						style={{
							marginLeft: 4,
							display: "flex",
							alignItems: "center",
							cursor: "pointer",
						}}
					>
						<Icon
							name="x"
							size={14}
							strokeWidth={1.5}
							color={removeHovered() ? color.foreground : color.mutedForeground}
						/>
					</div>
				</Show>
			</div>
			<Popup
				presence={presence}
				speed="moderate"
				width={PANEL_WIDTH}
				level={5}
			>
				<ColorPickerPanel
					{...props}
					level={5}
					value={currentValue()}
					onValueChange={(next, result) => {
						if (!isControlled()) setInternalValue(next);
						props.onValueChange?.(next, result);
					}}
				/>
			</Popup>
		</div>
	);
}
