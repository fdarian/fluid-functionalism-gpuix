import {
	type ElementBounds,
	type EventPayload,
	type HostElement,
	type HostMouseEvent,
	type HostMouseMoveEvent,
	type HostPointerEvent,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { awaitBounds, readBounds } from "../lib/bounds";
import { createPointerCapture } from "../lib/pointer-capture";
import { createPresence } from "../lib/presence";
import { color, radius, type as scale, scheme, motion as tween, weight, withAlpha, focusRing } from "../lib/theme";

export type SliderValue = number | [number, number];
export type ValuePosition = "left" | "right" | "top" | "bottom" | "tooltip";
export type SliderSize = "default" | "compact";

// ─── Geometry ────────────────────────────────────────────────────────────────

/** The thumb's layout box. Travel is the track width minus this; the visible knob is THUMB_SIZE_REST inside it. */
const THUMB_SIZE = 20;
const THUMB_SIZE_REST = 16;
/** 2px shorter than the thumb box, so the 16px knob fits the pill with 1px to spare. */
const TRACK_BG_HEIGHT = 18;
const DOT_SIZE = 4;
/** Inset of the track pill so its end caps line up with the thumb centres at min and max. */
const TRACK_INSET = (THUMB_SIZE - TRACK_BG_HEIGHT) / 2;
/** The press target is 8px taller than the thumb row above and below, and 8px wider each side. */
const PRESS_PAD = 8;
const PIP_SIZE = 5;
const HOVER_TOOLTIP_DELAY_MS = 100;

/** `--accent`, `--selected`: the compact track's fill and hover preview colours. */
const trackFill = () => color.selectedWash;
const hoverPreviewFill = () => color.accentFaint;
/** `color-mix(foreground N%, transparent)` for the handle line's rest and hover steps. */
const foregroundAlpha = (alpha: number) => withAlpha(color.foreground, alpha);

// ─── Value maths ─────────────────────────────────────────────────────────────

function valueToPixel(v: number, min: number, max: number, trackWidth: number) {
	if (max === min) return 0;
	return ((v - min) / (max - min)) * (trackWidth - THUMB_SIZE);
}

/** Strict `<`: a value halfway between two entries snaps to the lower. */
function nearestStepIndex(v: number, steps: readonly number[]) {
	let index = 0;
	for (let i = 1; i < steps.length; i++) {
		if (Math.abs(steps[i] - v) < Math.abs(steps[index] - v)) index = i;
	}
	return index;
}

/** The nearest `steps` entry, or the step grid clamped to min / max. Press, drag and release all go pixel -> snapped value -> pixel through here. */
function pixelToValue(
	px: number,
	min: number,
	max: number,
	step: number,
	trackWidth: number,
	stepValues: readonly number[] | null,
) {
	const usable = trackWidth - THUMB_SIZE;
	if (usable <= 0) return min;
	const raw = (px / usable) * (max - min) + min;
	if (stepValues !== null) return stepValues[nearestStepIndex(raw, stepValues)];
	const snapped = Math.round((raw - min) / step) * step + min;
	return Math.max(min, Math.min(max, snapped));
}

function snapToStep(
	v: number,
	min: number,
	max: number,
	step: number,
	stepValues: readonly number[] | null,
) {
	const clamped = Math.max(min, Math.min(max, v));
	if (stepValues !== null)
		return stepValues[nearestStepIndex(clamped, stepValues)];
	return Math.round((clamped - min) / step) * step + min;
}

/** Base UI's `largeStep` default: Shift+arrow and Page Up / Down move this many value units (or list entries). It is independent of `step`, so FF's off-grid result for step 25 is kept. */
const LARGE_STEP = 10;

/** Decimal digits of a number, so a keyboard step can be rounded without float noise (Base UI's `getDecimalPrecision`). */
function decimalPlaces(n: number) {
	if (n === 0) return 0;
	if (Math.abs(n) < 1) {
		const [mantissa, exponent] = n.toExponential().split("e-");
		const fraction = mantissa.split(".")[1];
		return (fraction === undefined ? 0 : fraction.length) + Number.parseInt(exponent, 10);
	}
	const fraction = n.toString().split(".")[1];
	return fraction === undefined ? 0 : fraction.length;
}

/** One keyboard move from `current` by `increment`: the current value is first rounded onto the step grid, the result is rounded to the widest precision involved and clamped (Base UI's `roundValueToStep` + `getNewValue`). */
function keyboardStep(
	current: number,
	increment: number,
	direction: 1 | -1,
	min: number,
	max: number,
	step: number,
) {
	const onGrid = Number(
		(Math.round((current - min) / step) * step + min).toFixed(
			Math.max(decimalPlaces(step), decimalPlaces(min)),
		),
	);
	const moved = Number(
		(onGrid + increment * direction).toFixed(
			Math.max(decimalPlaces(onGrid), decimalPlaces(increment), decimalPlaces(min)),
		),
	);
	return Math.max(min, Math.min(max, moved));
}

// ─── Painted bounds ──────────────────────────────────────────────────────────

/**
 * Reads an element's painted box. Nothing is recorded before the first paint,
 * so `onReady` waits for it; later `read()` calls are synchronous.
 */
function createPaintedBox(onReady: (box: ElementBounds) => void) {
	let element: HostElement | undefined;
	return {
		read() {
			if (element === undefined) throw new Error("Slider is not mounted");
			const box = readBounds(element);
			if (box === null) throw new Error("Slider has no painted bounds yet");
			return box;
		},
		ref(host: HostElement) {
			element = host;
			void awaitBounds(host).then(onReady);
		},
	};
}

// ─── Bubbles ─────────────────────────────────────────────────────────────────

/** The caption chip that follows the value. It anchors to its parent, which the caller positions (a thumb, or a zero-size marker at the snapped value). */
function ValueBubble(props: {
	text: Accessor<string>;
	visible: Accessor<boolean>;
	gap: number;
}) {
	const presence = createPresence();
	createEffect(() => {
		if (props.visible()) presence.show();
		else if (untrack(presence.mounted)) presence.hide();
	});
	return (
		<Show when={presence.mounted()}>
			<anchored
				side="top"
				align="center"
				// gpuix's align="center" offsets the layer by half its size twice, so the corner anchor is picked by hand.
				anchor="bottomLeft"
				gap={props.gap}
				deferred
				priority={2}
				style={{ backgroundColor: color.transparent, pointerEvents: "none" }}
			>
				<motion.div
					initial={{ opacity: 0, top: 4 }}
					animate={
						presence.open() ? { opacity: 1, top: 0 } : { opacity: 0, top: 4 }
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
					<text
						style={{
							...scale.caption,
							color: color.background,
							whiteSpace: "nowrap",
						}}
					>
						{props.text()}
					</text>
				</motion.div>
			</anchored>
		</Show>
	);
}

interface HoverPreview {
	left: number;
	width: number;
	snappedValue: number;
	cursorX: number;
}

/** Hover over a slider: a count of the elements the pointer is over (the row, the track and the handle each report their own enter and leave), and the tooltip's 100 ms delay. */
function createHover() {
	const [overCount, setOverCount] = createSignal(0);
	const [delayDone, setDelayDone] = createSignal(false);
	const hovered = () => overCount() > 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));
	createEffect(() => {
		clearTimeout(timer);
		if (!hovered()) {
			setDelayDone(false);
			return;
		}
		timer = setTimeout(() => setDelayDone(true), HOVER_TOOLTIP_DELAY_MS);
	});
	return {
		hovered,
		/** Hovered for 100 ms: the preview bar shows at once, only the tooltip waits. */
		tooltipReady: () => hovered() && delayDone(),
		enter: () => setOverCount(overCount() + 1),
		leave: () => setOverCount(overCount() - 1),
	};
}

function layoutWidth(event: EventPayload) {
	if (event.width === undefined) throw new Error("Layout event without a width");
	return event.width;
}

function pointerX(event: EventPayload) {
	if (event.x === undefined)
		throw new Error("Pointer event without coordinates");
	return event.x;
}

// ─── Value display (compact) ─────────────────────────────────────────────────

/** The compact engine's value label. Clicking a number swaps in a field; Enter or blur commits, Escape cancels. */
function ValueDisplay(props: {
	values: readonly number[];
	editingIndex: Accessor<number | null>;
	onStartEdit: (index: number) => void;
	onCommit: (index: number, value: number) => void;
	onCancel: () => void;
	min: number;
	max: number;
	step: number;
	stepValues: readonly number[] | null;
	formatValue: (v: number) => string;
	label: string | undefined;
	isRange: boolean;
	interacting: Accessor<boolean>;
	testId: string | undefined;
}) {
	const [draft, setDraft] = createSignal("");
	let settled = false;

	const startEdit = (index: number) => {
		settled = false;
		setDraft(String(props.values[index]));
		props.onStartEdit(index);
	};
	const commit = (index: number) => {
		if (settled) return;
		settled = true;
		const parsed = Number.parseFloat(draft());
		if (Number.isNaN(parsed)) {
			props.onCancel();
			return;
		}
		props.onCommit(
			index,
			snapToStep(parsed, props.min, props.max, props.step, props.stepValues),
		);
	};
	const cancel = () => {
		settled = true;
		props.onCancel();
	};

	const textStyle = (heavy: boolean) => ({
		...scale.body,
		lineHeight: scale.body.fontSize,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});
	const prefix = () => (props.label === undefined ? "" : `${props.label}: `);
	const widest = () => {
		const one = `${prefix()}${props.formatValue(props.max)}`;
		return props.isRange ? `${one} — ${props.formatValue(props.max)}` : one;
	};

	const value = (index: number) => (
		<Show
			when={props.editingIndex() === index}
			fallback={
				<text
					testId={
						props.testId === undefined
							? undefined
							: `${props.testId}-value-${index}`
					}
					onClick={() => startEdit(index)}
					style={{
						...textStyle(props.interacting()),
						color: color.mutedForeground,
						cursor: "text",
						pointerEvents: "auto",
					}}
				>
					{props.formatValue(props.values[index])}
				</text>
			}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 4,
				}}
			>
				<Show when={props.label !== undefined}>
					<text style={{ ...textStyle(false), color: color.mutedForeground }}>
						{`${props.label}:`}
					</text>
				</Show>
				<input
					testId={
						props.testId === undefined
							? undefined
							: `${props.testId}-edit-${index}`
					}
					autoFocus
					value={draft()}
					theme={{
						text: color.foreground,
						textMuted: color.mutedForeground,
						textFaint: color.mutedForeground,
						textDim: color.mutedForeground,
						caret: color.foreground,
					}}
					onChange={(event: EventPayload) => {
						if (event.value === undefined) {
							throw new Error("Slider edit change without a value");
						}
						setDraft(event.value);
					}}
					onBlur={() => commit(index)}
					onKeyDown={(event: KeyEvent) => {
						if (event.key === "Escape") cancel();
						else if (event.key === "Enter") {
							event.preventDefault();
							commit(index);
						}
					}}
					style={{
						width: 40,
						height: 18,
						fontSize: scale.body.fontSize,
						fontWeight: weight.normal,
						textAlign: "center",
						color: color.foreground,
						backgroundColor: color.transparent,
						borderBottomWidth: 1,
						borderColor: color.border,
						keyboardFocusDim: false,
					}}
				/>
			</div>
		</Show>
	);

	return (
		<div style={{ position: "relative", flexShrink: 0 }}>
			{/* Reserves the width of the widest value at the heaviest weight, so the track beside it never shifts. */}
			<text style={{ ...textStyle(true), opacity: 0 }}>{widest()}</text>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					bottom: 0,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					pointerEvents: "none",
				}}
			>
				<Show when={props.label !== undefined && props.editingIndex() === null}>
					<text style={{ ...textStyle(false), color: color.mutedForeground }}>
						{prefix()}
					</text>
				</Show>
				{value(0)}
				<Show when={props.isRange}>
					<text
						style={{
							...textStyle(false),
							color: color.mutedForeground,
							marginLeft: 4,
							marginRight: 4,
						}}
					>
						—
					</text>
					{value(1)}
				</Show>
			</div>
		</div>
	);
}

// ─── Compact engine ──────────────────────────────────────────────────────────

interface CompactProps {
	value: SliderValue;
	onChange: (value: SliderValue) => void;
	min?: number;
	max?: number;
	step?: number;
	steps?: number[];
	showSteps?: boolean;
	showValue?: boolean;
	valuePosition?: ValuePosition;
	formatValue?: (v: number) => string;
	label?: string;
	disabled?: boolean;
	testId?: string;
}

/** Thumbs and a pill track with a fill, optional step dots, a value label or tooltips, and a click-to-edit value. Presses snap and spring, drags re-snap on every move. */
function CompactSlider(props: CompactProps) {
	const isRange = () => Array.isArray(props.value);
	const values = createMemo(() =>
		Array.isArray(props.value) ? props.value : [props.value],
	);

	// A single entry cannot span a track, so a list of one falls back to min / max / step.
	const stepValues = createMemo(() => {
		if (props.steps === undefined) return null;
		const sorted = [...new Set(props.steps)].sort((a, b) => a - b);
		return sorted.length > 1 ? sorted : null;
	});
	const min = () => stepValues()?.[0] ?? props.min ?? 0;
	const max = () => {
		const list = stepValues();
		return list === null ? (props.max ?? 100) : list[list.length - 1];
	};
	const step = () => props.step ?? 1;
	const valuePosition = () => props.valuePosition ?? "left";
	const formatValue = (v: number) =>
		props.formatValue === undefined ? String(v) : props.formatValue(v);
	const inline = () =>
		valuePosition() === "left" || valuePosition() === "right";

	const [trackWidth, setTrackWidth] = createSignal<number>();
	const box = createPaintedBox((measured) => setTrackWidth(measured.width));
	/** The thumb's left offset for a value: the target the spring chases. */
	const thumbLeft = (value: number, width: number) =>
		valueToPixel(value, min(), max(), width);

	const hover = createHover();
	const pressTarget = createPointerCapture("Slider");
	const [pressed, setPressed] = createSignal(false);
	/** True once a press has moved: from then on the thumb is placed, not sprung. */
	const [moving, setMoving] = createSignal(false);
	const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
	const [preview, setPreview] = createSignal<HoverPreview | null>(null);
	let dragging = false;
	let activeThumb = 0;
	let trackLeft = 0;
	let liveWidth = 0;

	const interacting = () => hover.hovered() || pressed();

	const emitChange = (thumb: number, next: number) => {
		if (next === values()[thumb]) return;
		if (Array.isArray(props.value)) {
			const updated: [number, number] = [props.value[0], props.value[1]];
			updated[thumb] = next;
			props.onChange(updated);
		} else {
			props.onChange(next);
		}
	};

	/** Each thumb stops half a thumb short of the other, so the knobs may overlap a little but never swap sides. */
	const clampForRange = (px: number, thumb: number) => {
		if (!isRange()) return px;
		const other = thumbLeft(values()[1 - thumb], liveWidth);
		return thumb === 0
			? Math.min(px, other - THUMB_SIZE * 0.5)
			: Math.max(px, other + THUMB_SIZE * 0.5);
	};

	/** Window x -> the snapped, range-clamped value the thumb would take. */
	const valueAt = (x: number, thumb: number) => {
		const local = x - trackLeft - THUMB_SIZE / 2;
		const clamped = Math.max(0, Math.min(liveWidth - THUMB_SIZE, local));
		const snapped = pixelToValue(
			clamped,
			min(),
			max(),
			step(),
			liveWidth,
			stepValues(),
		);
		const px = clampForRange(
			valueToPixel(snapped, min(), max(), liveWidth),
			thumb,
		);
		return pixelToValue(px, min(), max(), step(), liveWidth, stepValues());
	};

	const computePreview = (x: number) => {
		const usable = liveWidth - THUMB_SIZE;
		const cursor = Math.max(0, Math.min(liveWidth, x - trackLeft));
		const raw = Math.max(0, Math.min(usable, cursor - THUMB_SIZE / 2));
		const snappedValue = pixelToValue(
			raw,
			min(),
			max(),
			step(),
			liveWidth,
			stepValues(),
		);
		const percent =
			max() === min() ? 0 : (snappedValue - min()) / (max() - min());
		const snappedX = THUMB_SIZE / 2 + percent * usable;
		const c0 = thumbLeft(values()[0], liveWidth) + THUMB_SIZE / 2;
		const c1 = isRange()
			? thumbLeft(values()[1], liveWidth) + THUMB_SIZE / 2
			: c0;
		const nearest =
			Math.abs(snappedX - c0) <= Math.abs(snappedX - c1) ? c0 : c1;
		// Extend the bar to the track edges at the extremes so there is no gap.
		const edgeX =
			snappedValue === min()
				? 0
				: snappedValue === max()
					? liveWidth
					: snappedX;
		setPreview({
			left: Math.min(nearest, edgeX),
			width: Math.abs(edgeX - nearest),
			snappedValue,
			cursorX: snappedX,
		});
	};

	const syncBox = () => {
		const painted = box.read();
		trackLeft = painted.x;
		liveWidth = painted.width;
		if (trackWidth() !== painted.width) setTrackWidth(painted.width);
	};

	const onPress = (event: HostMouseEvent) => {
		if (props.disabled || event.button !== 0) return;
		pressTarget.capture(event);
		syncBox();
		const x = pointerX(event);
		const local = Math.max(
			0,
			Math.min(liveWidth - THUMB_SIZE, x - trackLeft - THUMB_SIZE / 2),
		);
		// The nearer thumb takes the press; a tie (stacked thumbs) goes to the first.
		activeThumb =
			isRange() &&
			Math.abs(local - thumbLeft(values()[0], liveWidth)) >
				Math.abs(local - thumbLeft(values()[1], liveWidth))
				? 1
				: 0;
		dragging = true;
		setPressed(true);
		setMoving(false);
		emitChange(activeThumb, valueAt(x, activeThumb));
	};
	const onMove = (event: EventPayload) => {
		const x = pointerX(event);
		if (!dragging) {
			if (props.disabled || liveWidth === 0) return;
			computePreview(x);
			return;
		}
		setMoving(true);
		emitChange(activeThumb, valueAt(x, activeThumb));
	};
	const onRelease = () => {
		if (!dragging) return;
		dragging = false;
		setPressed(false);
		setMoving(false);
		setPreview(null);
	};
	const onEnter = () => {
		if (props.disabled) return;
		syncBox();
		hover.enter();
	};
	const onLeave = () => {
		if (props.disabled) return;
		hover.leave();
		setPreview(null);
	};
	const pointer = {
		onMouseDown: onPress,
		onMouseMove: onMove,
		onMouseUp: onRelease,
		onLostPointerCapture: onRelease,
		onMouseEnter: onEnter,
		onMouseLeave: onLeave,
	};

	/** Base UI's thumb keys: arrows by `step` (Shift: `largeStep`), Page Up / Down by `largeStep`, Home / End to the bound or the neighbouring thumb. A `steps` list runs on indices, like FF's primitive. */
	const onThumbKey = (thumb: number) => (event: KeyEvent) => {
		if (props.disabled || event.defaultPrevented) return;
		const list = stepValues();
		const current = values()[thumb];
		const large = event.shiftKey === true;
		const walk = (direction: 1 | -1, jump: boolean) => {
			if (list === null) {
				return keyboardStep(
					current,
					jump ? LARGE_STEP : step(),
					direction,
					min(),
					max(),
					step(),
				);
			}
			const index =
				nearestStepIndex(current, list) + direction * (jump ? LARGE_STEP : 1);
			return list[Math.max(0, Math.min(list.length - 1, index))];
		};
		const lower = thumb === 1 ? values()[0] : min();
		const upper = thumb === 0 && isRange() ? values()[1] : max();
		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowUp":
				next = walk(1, large);
				break;
			case "ArrowLeft":
			case "ArrowDown":
				next = walk(-1, large);
				break;
			case "PageUp":
				next = walk(1, true);
				break;
			case "PageDown":
				next = walk(-1, true);
				break;
			case "Home":
				next = lower;
				break;
			case "End":
				next = upper;
				break;
			default:
				return;
		}
		event.preventDefault();
		// Base UI keeps its composite keys from reaching ancestors; Page Up / Down still bubble.
		if (event.key !== "PageUp" && event.key !== "PageDown") {
			event.stopPropagation();
		}
		emitChange(thumb, Math.max(lower, Math.min(upper, next)));
	};

	/** FF's per-thumb names: "<label> minimum" / "<label> maximum", or bare "Minimum" / "Maximum". */
	const thumbLabel = (index: number) => {
		if (!isRange()) return props.label;
		const side = index === 0 ? "Minimum" : "Maximum";
		return props.label === undefined
			? side
			: `${props.label} ${side.toLowerCase()}`;
	};
	/** Base UI + FF: a list announces `formatValue`, a range its default "N start range" / "N end range". gpuix has no `aria-valuenow`, so a single thumb announces `formatValue` where Base UI would leave it to the number. */
	const thumbValueText = (index: number) => {
		const value = values()[index];
		if (stepValues() !== null || !isRange()) return formatValue(value);
		return `${value.toLocaleString()} ${index === 0 ? "start" : "end"} range`;
	};

	const stepDots = createMemo(() => {
		if (props.showSteps !== true) return [];
		const list = stepValues();
		if (list !== null) return list;
		return Array.from(
			{ length: Math.round((max() - min()) / step()) + 1 },
			(_, index) => min() + index * step(),
		);
	});
	/** Dots on the filled side are hidden: the thumb's side of a single slider, the span between a range's thumbs. */
	const dotHidden = (dot: number) => {
		const [first, second] = values();
		return isRange() ? dot > first && dot < second : dot <= first;
	};

	const springOrPlace = () => (moving() ? tween.snap : tween.moderate);

	const display = () => (
		<Show when={props.showValue !== false && valuePosition() !== "tooltip"}>
			<ValueDisplay
				values={values()}
				editingIndex={editingIndex}
				onStartEdit={setEditingIndex}
				onCommit={(index, next) => {
					emitChange(index, next);
					setEditingIndex(null);
				}}
				onCancel={() => setEditingIndex(null)}
				min={min()}
				max={max()}
				step={step()}
				stepValues={stepValues()}
				formatValue={formatValue}
				label={props.label}
				isRange={isRange()}
				interacting={interacting}
				testId={props.testId}
			/>
		</Show>
	);

	const thumb = (index: number) => (
		<Show when={trackWidth()}>
			{(width: Accessor<number>) => (
				<motion.div
					initial={false}
					animate={{ left: thumbLeft(values()[index], width()) }}
					transition={springOrPlace()}
					tabIndex={props.disabled ? -1 : 0}
					role="slider"
					aria-label={props.label}
					aria-valuetext={formatValue(values()[index])}
					onKeyDown={onThumbKey(index)}
					style={{
						position: "absolute",
						top: PRESS_PAD,
						width: THUMB_SIZE,
						height: THUMB_SIZE,
						borderRadius: THUMB_SIZE / 2,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none",
						keyboardFocusDim: false,
						focusVisible: focusRing(1),
					}}
				>
					<div
						style={{
							width: THUMB_SIZE_REST,
							height: THUMB_SIZE_REST,
							borderRadius: THUMB_SIZE_REST / 2,
							backgroundColor: "#FFFFFF",
							pointerEvents: "none",
							boxShadow: {
								offsetX: 0,
								offsetY: 1,
								blurRadius: 2,
								spreadRadius: 0,
								color: "rgba(0,0,0,0.1)",
							},
						}}
					/>
					<Show when={valuePosition() === "tooltip"}>
						<ValueBubble
							text={() => formatValue(values()[index])}
							visible={interacting}
							gap={PRESS_PAD}
						/>
					</Show>
				</motion.div>
			)}
		</Show>
	);

	const fill = () => {
		const width = trackWidth();
		if (width === undefined) return null;
		const first = thumbLeft(values()[0], width);
		if (!isRange())
			return { left: 0, width: first + THUMB_SIZE / 2 - TRACK_INSET };
		const second = thumbLeft(values()[1], width);
		return {
			left: first + THUMB_SIZE / 2 - TRACK_INSET,
			width: second - first,
		};
	};

	const areaHeight = () =>
		inline()
			? THUMB_SIZE + 16
			: THUMB_SIZE + (valuePosition() === "tooltip" ? 16 : 0);

	return (
		<div
			testId={props.testId}
			style={{
				display: "flex",
				flexDirection: inline() ? "row" : "column",
				alignItems: inline() ? "center" : "stretch",
				gap: inline() ? 8 : 0,
				marginBottom: inline() ? 8 : 0,
				width: "100%",
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? "none" : "auto",
				userSelect: "none",
			}}
		>
			<Show when={valuePosition() === "top" || valuePosition() === "left"}>
				{display()}
			</Show>
			<div
				style={{
					position: "relative",
					flexGrow: 1,
					minWidth: 0,
					height: areaHeight(),
					paddingTop: valuePosition() === "tooltip" ? 16 : 0,
				}}
			>
				<div
					ref={box.ref}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-track`
					}
					onLayout={(event: EventPayload) => setTrackWidth(layoutWidth(event))}
					style={{
						position: "relative",
						width: "100%",
						height: THUMB_SIZE + PRESS_PAD * 2,
						opacity: trackWidth() === undefined ? 0 : 1,
					}}
				>
					{/* The press target reaches 8px past each end, so presses out there clamp to min or max. */}
					<div
						testId={
							props.testId === undefined ? undefined : `${props.testId}-press`
						}
						ref={pressTarget.ref}
						{...pointer}
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: -PRESS_PAD,
							right: -PRESS_PAD,
							cursor: "ew-resize",
						}}
					/>
					{/* The pill clips the fill and the hover bar to its rounded ends. */}
					<div
						style={{
							position: "absolute",
							left: TRACK_INSET,
							right: TRACK_INSET,
							top: PRESS_PAD + TRACK_INSET,
							height: TRACK_BG_HEIGHT,
							borderRadius: TRACK_BG_HEIGHT / 2,
							borderWidth: 1,
							borderColor: color.border,
							overflow: "hidden",
							pointerEvents: "none",
						}}
					>
						<Show when={fill()}>
							{(target: Accessor<{ left: number; width: number }>) => (
								<motion.div
									initial={false}
									animate={{ left: target().left, width: target().width }}
									transition={springOrPlace()}
									style={{
										position: "absolute",
										top: 0,
										bottom: 0,
										backgroundColor: trackFill(),
										pointerEvents: "none",
									}}
								/>
							)}
						</Show>
						<motion.div
							initial={false}
							animate={{ opacity: preview() !== null && !pressed() ? 1 : 0 }}
							transition={{ duration: 0.15 }}
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								left: (preview()?.left ?? 0) - TRACK_INSET,
								width: preview()?.width ?? 0,
								...((preview()?.cursorX ?? 0) > (preview()?.left ?? 0)
									? {
											borderTopRightRadius: 9999,
											borderBottomRightRadius: 9999,
										}
									: {
											borderTopLeftRadius: 9999,
											borderBottomLeftRadius: 9999,
										}),
								backgroundColor: hoverPreviewFill(),
								pointerEvents: "none",
							}}
						/>
					</div>
					<Show when={trackWidth()}>
						{(width: Accessor<number>) => (
							<For each={stepDots()}>
								{(dot: number) => {
									const percent = () =>
										max() === min() ? 0 : (dot - min()) / (max() - min());
									const size = () =>
										hover.hovered() ? DOT_SIZE * 1.25 : DOT_SIZE;
									const centre = () =>
										THUMB_SIZE / 2 + percent() * (width() - THUMB_SIZE);
									return (
										<motion.div
											initial={false}
											animate={{
												left: centre() - size() / 2,
												top: PRESS_PAD + THUMB_SIZE / 2 - size() / 2,
												width: size(),
												height: size(),
												opacity: dotHidden(dot) ? 0 : 0.3,
											}}
											transition={tween.moderate}
											style={{
												position: "absolute",
												borderRadius: 9999,
												backgroundColor: color.mutedForeground,
												pointerEvents: "none",
											}}
										/>
									);
								}}
							</For>
						)}
					</Show>
					{thumb(0)}
					<Show when={isRange()}>{thumb(1)}</Show>
					<Show when={preview()}>
						{(shown: Accessor<HoverPreview>) => (
							<Show when={valuePosition() !== "tooltip"}>
								<div
									style={{
										position: "absolute",
										left: shown().cursorX,
										top: 4,
										width: 0,
										height: 0,
										pointerEvents: "none",
									}}
								>
									<ValueBubble
										text={() => formatValue(shown().snappedValue)}
										visible={() => hover.tooltipReady() && !pressed()}
										gap={0}
									/>
								</div>
							</Show>
						)}
					</Show>
				</div>
			</div>
			<Show when={valuePosition() === "bottom" || valuePosition() === "right"}>
				{display()}
			</Show>
		</div>
	);
}

// ─── Default (pips / scrubber) engine ────────────────────────────────────────

interface ComfortableProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	step?: number;
	variant?: "pips" | "scrubber";
	label?: string;
	formatValue?: (v: number) => string;
	disabled?: boolean;
	testId?: string;
}

const ROW_HEIGHT = 32;
/** The row is bordered; absolute layers sit inside the border. */
const ROW_BORDER = 1;

/** A 32px bordered row with the label at the start and the value at the end. Pips draw a dot per step; the scrubber fills continuously, glued to the cursor. */
function ComfortableSlider(props: ComfortableProps) {
	const variant = () => props.variant ?? "pips";
	const min = () => props.min ?? 0;
	const max = () => props.max ?? 100;
	const step = () => props.step ?? 1;
	const formatValue = (v: number) =>
		props.formatValue === undefined ? String(v) : props.formatValue(v);

	const [rowWidth, setRowWidth] = createSignal<number>();
	const box = createPaintedBox((measured) =>
		setRowWidth(measured.width - ROW_BORDER * 2),
	);
	const hover = createHover();
	// The gutter spans the row and 8px past each end, so it takes the row's drags too.
	const gutter = createPointerCapture("Slider");
	const handle = createPointerCapture("Slider handle");
	const [pressed, setPressed] = createSignal(false);
	const [focused, setFocused] = createSignal(false);
	const [preview, setPreview] = createSignal<HoverPreview | null>(null);
	/** A press on the scrubber's handle or a drag of the scrubber places the fill; anything else springs it. */
	const [placing, setPlacing] = createSignal(false);
	let dragging = false;
	let handleDragging = false;
	let rowLeft = 0;
	let liveWidth = 0;

	const isActive = () => hover.hovered() || focused();
	const pips = createMemo(() =>
		Array.from(
			{ length: Math.round((max() - min()) / step()) + 1 },
			(_, index) => min() + index * step(),
		),
	);
	const percentOf = (v: number) =>
		max() === min()
			? 0
			: Math.max(0, Math.min(1, (v - min()) / (max() - min())));
	/** Painted bounds are the border box; the absolute layers measure from inside the border. */
	const inner = () => rowWidth();
	const atMin = () => props.value === min();

	const valueAtX = (x: number) => {
		const clamped = Math.max(0, Math.min(liveWidth, x - rowLeft));
		if (variant() === "pips") {
			const count = pips().length;
			if (count <= 1) return min();
			const index = Math.max(
				0,
				Math.min(count - 1, Math.round((clamped / liveWidth) * (count - 1))),
			);
			return pips()[index];
		}
		const raw = min() + (clamped / liveWidth) * (max() - min());
		return Math.max(
			min(),
			Math.min(max(), Math.round((raw - min()) / step()) * step() + min()),
		);
	};

	/** Where the fill's leading edge sits for a value, as the handle line sees it. */
	const edgeOf = (v: number, width: number) => {
		const p = percentOf(v);
		if (variant() === "pips") {
			return v === min() ? 0 : p * width + (20 - 20 * p);
		}
		return p * width;
	};

	const computePreview = (x: number) => {
		const width = inner();
		if (width === undefined || liveWidth === 0) return;
		const snappedValue = valueAtX(x);
		const snappedX = percentOf(snappedValue) * width;
		const handleX = edgeOf(props.value, width);
		const edgeX =
			snappedValue === min()
				? 0
				: snappedValue === max()
					? liveWidth
					: snappedX;
		setPreview({
			left: Math.min(handleX, edgeX),
			width: Math.abs(edgeX - handleX),
			snappedValue,
			cursorX: snappedX,
		});
	};

	const syncBox = () => {
		const painted = box.read();
		// A press maps over the border box, like the DOM version's getBoundingClientRect.
		rowLeft = painted.x;
		liveWidth = painted.width;
		const inside = painted.width - ROW_BORDER * 2;
		if (rowWidth() !== inside) setRowWidth(inside);
	};

	const emit = (next: number) => {
		if (next !== props.value) props.onChange(next);
	};
	const onPress = (event: HostMouseEvent) => {
		if (props.disabled || event.button !== 0) return;
		gutter.capture(event);
		syncBox();
		dragging = true;
		setPressed(true);
		setPlacing(false);
		emit(valueAtX(pointerX(event)));
	};
	const onMove = (event: EventPayload) => {
		const x = pointerX(event);
		if (dragging) {
			setPlacing(variant() === "scrubber");
			emit(valueAtX(x));
			return;
		}
		if (props.disabled || handleDragging) return;
		computePreview(x);
	};
	const onRelease = () => {
		if (!dragging) return;
		dragging = false;
		setPressed(false);
		setPlacing(false);
		setPreview(null);
	};
	// Grabbing the scrubber's handle sets the fill from the first event, with no spring.
	const onHandlePress = (event: HostPointerEvent) => {
		if (props.disabled || event.button !== 0) return;
		// The row's own press would end the placing this one starts.
		event.stopPropagation();
		handle.capture(event);
		syncBox();
		handleDragging = true;
		setPressed(true);
		setPlacing(true);
		emit(valueAtX(pointerX(event)));
	};
	const onHandleMove = (event: HostMouseMoveEvent) => {
		if (!handleDragging) return;
		emit(valueAtX(pointerX(event)));
	};
	const onHandleRelease = () => {
		if (!handleDragging) return;
		handleDragging = false;
		setPressed(false);
		setPlacing(false);
		setPreview(null);
	};
	const onEnter = () => {
		if (props.disabled) return;
		syncBox();
		hover.enter();
	};
	const onLeave = () => {
		if (props.disabled) return;
		hover.leave();
		setPreview(null);
	};
	const pointer = {
		onMouseDown: onPress,
		onMouseMove: onMove,
		onMouseUp: onRelease,
		onLostPointerCapture: onRelease,
		onMouseEnter: onEnter,
		onMouseLeave: onLeave,
	};

	/** The compact thumb's keys (Base UI's, reached in FF through its invisible primitive). */
	const onKey = (event: KeyEvent) => {
		if (props.disabled || event.defaultPrevented) return;
		const large = event.shiftKey === true;
		const move = (direction: 1 | -1, jump: boolean) =>
			keyboardStep(
				props.value,
				jump ? LARGE_STEP : step(),
				direction,
				min(),
				max(),
				step(),
			);
		let next: number;
		switch (event.key) {
			case "ArrowRight":
			case "ArrowUp":
				next = move(1, large);
				break;
			case "ArrowLeft":
			case "ArrowDown":
				next = move(-1, large);
				break;
			case "PageUp":
				next = move(1, true);
				break;
			case "PageDown":
				next = move(-1, true);
				break;
			case "Home":
				next = min();
				break;
			case "End":
				next = max();
				break;
			default:
				return;
		}
		event.preventDefault();
		if (event.key !== "PageUp" && event.key !== "PageDown") {
			event.stopPropagation();
		}
		emit(next);
	};

	const glide = () => (placing() ? tween.snap : tween.fast);

	const fillTarget = () => {
		const width = inner();
		if (width === undefined) return undefined;
		const p = percentOf(props.value);
		if (variant() === "scrubber") return { width: p * width };
		return { width: atMin() ? 0 : p * width + 20 - 20 * p };
	};
	const lineLeft = () => {
		const width = inner();
		if (width === undefined) return undefined;
		const p = percentOf(props.value);
		return variant() === "pips"
			? p * width + 11 - 24 * p
			: p * width - 9 + (atMin() ? 17 : 0);
	};
	const lineColor = () => {
		if (focused()) return color.foreground;
		return foregroundAlpha(hover.hovered() ? 0.5 : 0.25);
	};
	const textColor = () =>
		isActive() ? color.foreground : color.mutedForeground;
	const textStyle = {
		...scale.body,
		whiteSpace: "nowrap" as const,
	};

	return (
		<div
			testId={props.testId}
			style={{
				position: "relative",
				width: "100%",
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? "none" : "auto",
				userSelect: "none",
			}}
		>
			{/* 8px gutters either side count as the row: presses there clamp to min or max. */}
			<div
				testId={
					props.testId === undefined ? undefined : `${props.testId}-gutter`
				}
				ref={gutter.ref}
				{...pointer}
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					left: -PRESS_PAD,
					right: -PRESS_PAD,
					cursor: "ew-resize",
				}}
			/>
			<div
				ref={box.ref}
				testId={props.testId === undefined ? undefined : `${props.testId}-row`}
				onLayout={(event: EventPayload) =>
					setRowWidth(layoutWidth(event) - ROW_BORDER * 2)
				}
				{...pointer}
				style={{
					position: "relative",
					height: ROW_HEIGHT,
					width: "100%",
					borderWidth: ROW_BORDER,
					borderColor: color.border,
					borderRadius: radius.item,
					overflow: "hidden",
					cursor: "ew-resize",
					outlineWidth: focused() ? 1 : 0,
					outlineColor: color.focusRing,
					outlineOffset: 2,
				}}
			>
				<Show when={variant() === "pips"}>
					<div
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: 0,
							right: 0,
							display: "flex",
							flexDirection: "row",
							justifyContent: "space-between",
							alignItems: "center",
							paddingLeft: 12,
							paddingRight: 12,
							pointerEvents: "none",
						}}
					>
						<For each={pips()}>
							{(pip: number, index) => {
								// The fill covers every pip up to the value, so those drop out; at min the first one stays.
								const hidden = () =>
									!(index() === 0 && atMin()) && pip <= props.value;
								const active = () => pip === props.value;
								return (
									<div
										style={{
											width: PIP_SIZE,
											height: PIP_SIZE,
											pointerEvents: "none",
											borderRadius: PIP_SIZE / 2,
											backgroundColor: active()
												? color.foreground
												: color.mutedForeground,
											opacity: hidden() ? 0 : active() ? 1 : 0.3,
										}}
									/>
								);
							}}
						</For>
					</div>
				</Show>
				{/* Blank boxes the size of the label and the value, in the surface colour, so no pip is drawn through the words. */}
				<Show when={variant() === "pips"}>
					<div
						style={{
							position: "absolute",
							top: 0,
							bottom: 0,
							left: 0,
							right: 0,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							paddingLeft: 8,
							paddingRight: 8,
							pointerEvents: "none",
						}}
					>
						<Show when={props.label !== undefined}>
							<div
								style={{
									paddingLeft: 8,
									paddingRight: 8,
									backgroundColor: color.surface2,
									pointerEvents: "none",
								}}
							>
								<text style={{ ...textStyle, opacity: 0 }}>{props.label}</text>
							</div>
						</Show>
						<div style={{ flexGrow: 1 }} />
						<div
							style={{
								paddingLeft: 8,
								paddingRight: 8,
								backgroundColor: color.surface2,
								pointerEvents: "none",
							}}
						>
							<text style={{ ...textStyle, opacity: 0 }}>
								{formatValue(max())}
							</text>
						</div>
					</div>
				</Show>
				<motion.div
					initial={false}
					animate={{ opacity: preview() !== null && !pressed() ? 1 : 0 }}
					transition={{ duration: 0.15 }}
					style={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: preview()?.left ?? 0,
						width: preview()?.width ?? 0,
						backgroundColor: hoverPreviewFill(),
						pointerEvents: "none",
					}}
				/>
				<Show when={fillTarget()}>
					{(target: Accessor<{ width: number }>) => (
						<motion.div
							initial={false}
							animate={{ width: target().width }}
							transition={glide()}
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								left: 0,
								backgroundColor: color.active,
								pointerEvents: "none",
							}}
						/>
					)}
				</Show>
				<Show when={lineLeft()}>
					{(left: Accessor<number>) => (
						<motion.div
							initial={false}
							animate={{
								left: left(),
								top: isActive() ? 7 : 8,
								bottom: isActive() ? 7 : 8,
							}}
							transition={glide()}
							style={{
								position: "absolute",
								width: 2,
								borderRadius: 1,
								backgroundColor: lineColor(),
								pointerEvents: "none",
							}}
						/>
					)}
				</Show>
				<div
					style={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						paddingLeft: 16,
						paddingRight: 16,
						pointerEvents: "none",
					}}
				>
					<Show when={props.label !== undefined}>
						<text style={{ ...textStyle, color: textColor() }}>
							{props.label}
						</text>
					</Show>
					<div style={{ flexGrow: 1 }} />
					{/* Reserves the widest value, so the label never moves as the number changes. */}
					<div style={{ position: "relative", flexShrink: 0 }}>
						<text style={{ ...textStyle, opacity: 0 }}>
							{formatValue(max())}
						</text>
						<text
							style={{
								...textStyle,
								position: "absolute",
								top: 0,
								right: 0,
								color: textColor(),
							}}
						>
							{formatValue(props.value)}
						</text>
					</div>
				</div>
				<Show when={variant() === "scrubber" ? lineLeft() : undefined}>
					{(left: Accessor<number>) => (
						<motion.div
							testId={
								props.testId === undefined ? undefined : `${props.testId}-handle`
							}
							initial={false}
							animate={{ left: left() + 1 }}
							transition={glide()}
							onMouseDown={onHandlePress}
							onMouseMove={onHandleMove}
							onMouseUp={onHandleRelease}
							onLostPointerCapture={onHandleRelease}
							ref={handle.ref}
							onMouseEnter={onEnter}
							onMouseLeave={onLeave}
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								width: 8,
								cursor: "ew-resize",
							}}
						/>
					)}
				</Show>
			</div>
			{/* Hidden thumb: the only thing Tab reaches, so focus (and the ring) is keyboard-only like the primitive's thumb. */}
			<div
				tabIndex={props.disabled ? -1 : 0}
				role="slider"
				testId={props.testId === undefined ? undefined : `${props.testId}-thumb`}
				aria-label={props.label}
				aria-valuetext={formatValue(props.value)}
				onKeyDown={onKey}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: 1,
					height: 1,
					opacity: 0,
					pointerEvents: "none",
					keyboardFocusDim: false,
				}}
			/>
			<Show when={preview()}>
				{(shown: Accessor<HoverPreview>) => (
					<div
						style={{
							position: "absolute",
							left: shown().cursorX,
							top: -6,
							width: 0,
							height: 0,
							pointerEvents: "none",
						}}
					>
						<ValueBubble
							text={() => formatValue(shown().snappedValue)}
							visible={() => hover.tooltipReady() && !pressed()}
							gap={0}
						/>
					</div>
				)}
			</Show>
		</div>
	);
}

// ─── Public component ────────────────────────────────────────────────────────

export interface SliderProps extends CompactProps {
	/** Default-step layout: value pips along the track, or an edge-to-edge scrubber. Ignored when the compact design renders. */
	variant?: "pips" | "scrubber";
	/** `"default"` renders the pip / scrubber row, `"compact"` the dense thumb-and-track design. */
	size?: SliderSize;
}

/** One slider, two engines. Features only the compact engine implements (a range, a step list, value display) force it whatever the size, so no capability is lost. */
export function Slider(props: SliderProps) {
	const needsCompact = () =>
		props.size === "compact" ||
		Array.isArray(props.value) ||
		props.steps !== undefined ||
		props.showSteps !== undefined ||
		props.showValue !== undefined ||
		props.valuePosition !== undefined;

	return (
		<Show
			when={needsCompact()}
			fallback={
				<ComfortableSlider
					value={scalar(props.value)}
					onChange={(next) => props.onChange(next)}
					min={props.min}
					max={props.max}
					step={props.step}
					variant={props.variant}
					label={props.label}
					formatValue={props.formatValue}
					disabled={props.disabled}
					testId={props.testId}
				/>
			}
		>
			<CompactSlider
				value={props.value}
				onChange={props.onChange}
				min={props.min}
				max={props.max}
				step={props.step}
				steps={props.steps}
				showSteps={props.showSteps}
				showValue={props.showValue}
				valuePosition={props.valuePosition}
				formatValue={props.formatValue}
				label={props.label}
				disabled={props.disabled}
				testId={props.testId}
			/>
		</Show>
	);
}

function scalar(value: SliderValue): number {
	if (Array.isArray(value)) {
		throw new Error("The default slider takes a single value");
	}
	return value;
}

