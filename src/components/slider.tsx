import {
	createMotionValue,
	createTransform,
	type DomEvent,
	type HostElement,
	type KeyEvent,
	motion,
} from '@ghia/solid';
import { createPresence } from 'base-ui-solid-gpuix/internals';
import {
	createControlBox,
	createSliderControl,
	createSliderRoot,
	createSliderThumb,
	createSliderValue,
	pixelToValue,
	valueToPixel,
} from 'base-ui-solid-gpuix/slider';
import {
	type Accessor,
	createEffect,
	createMemo,
	createRenderEffect,
	createSignal,
	For,
	onCleanup,
	Show,
	untrack,
} from 'solid-js';
import { POPUP_EXIT_MS } from '#/lib/popup-timing';
import {
	color,
	fade,
	focusRing,
	type as scale,
	shape,
	sizeChoice,
	springFade,
	motion as tween,
	weight,
	withAlpha,
} from '#/lib/theme';

export type SliderValue = number | [number, number];
export type ValuePosition = 'left' | 'right' | 'top' | 'bottom' | 'tooltip';
export type SliderSize = 'default' | 'compact';

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

// ─── Bubbles ─────────────────────────────────────────────────────────────────

/** The caption chip that follows the value. It anchors to its parent, which the caller positions (a thumb, or a zero-size marker at the snapped value). */
function ValueBubble(props: {
	text: Accessor<string>;
	visible: Accessor<boolean>;
	gap: number;
	testId?: string;
}) {
	const presence = createPresence(POPUP_EXIT_MS);
	createEffect(() => {
		if (props.visible()) presence.show();
		else if (untrack(presence.mounted)) presence.hide();
	});
	return (
		<Show when={presence.mounted()}>
			<anchored
				side="top"
				align="center"
				fit="snap"
				gap={props.gap}
				deferred
				priority={2}
				style={{ backgroundColor: color.transparent, pointerEvents: 'none' }}
			>
				<motion.div
					testId={props.testId}
					initial={{ opacity: 0, y: 4 }}
					animate={
						presence.open() ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }
					}
					transition={presence.open() ? tween.fast : tween.fastExit}
					style={{
						position: 'relative',
						backgroundColor: color.foreground,
						borderRadius: shape.bg,
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
							fontVariantNumeric: 'tabular-nums',
							whiteSpace: 'nowrap',
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

function layoutWidth(event: Pick<DomEvent, 'width'>) {
	if (event.width === undefined)
		throw new Error('Layout event without a width');
	return event.width;
}

// ─── Value display (compact) ─────────────────────────────────────────────────

/** The value readout's `transition-[font-variation-settings] duration-100`, the one slider transition that is not 80 ms. */
const valueFade = fade(['font-variation-settings'], 100);

/** The compact engine's value label. Clicking a number swaps in a field; Enter or blur commits, Escape cancels. */
function ValueDisplay(props: {
	values: readonly number[];
	editingIndex: Accessor<number | null>;
	onStartEdit: (index: number) => void;
	onCommit: (index: number, value: number) => void;
	onCancel: () => void;
	max: number;
	snap: (v: number) => number;
	formatValue: (v: number) => string;
	label: string | undefined;
	isRange: boolean;
	interacting: Accessor<boolean>;
	testId: string | undefined;
}) {
	const [draft, setDraft] = createSignal('');
	let settled = false;
	const fields: HostElement[] = [];

	// So typing replaces the number, as the source's field does.
	const selectField = (index: number) => {
		const field = fields[index];
		if (field === undefined)
			throw new Error('Slider edit focused before it mounted');
		field.select();
	};

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
		props.onCommit(index, props.snap(parsed));
	};
	const cancel = () => {
		settled = true;
		props.onCancel();
	};

	const textStyle = (heavy: boolean) => ({
		...scale.body,
		lineHeight: `${scale.body.fontSize}px`,
		fontVariationSettings: heavy ? weight.semibold : weight.normal,
		fontVariantNumeric: 'tabular-nums',
		whiteSpace: 'nowrap' as const,
	});
	const prefix = () => (props.label === undefined ? '' : `${props.label}: `);
	const dashStyle = { marginLeft: 4, marginRight: 4 };

	const valueSpan = (index: number) => (
		<span
			testId={
				props.testId === undefined
					? undefined
					: `${props.testId}-value-${index}`
			}
			onClick={() => startEdit(index)}
			style={{ cursor: 'text' }}
		>
			{props.formatValue(props.values[index])}
		</span>
	);

	const value = (index: number) => (
		<Show
			when={props.editingIndex() === index}
			fallback={
				<text
					style={{
						...textStyle(props.interacting()),
						...valueFade,
						color: color.mutedForeground,
					}}
				>
					{valueSpan(index)}
				</text>
			}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 4,
				}}
			>
				<Show when={props.label !== undefined}>
					<text
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-edit-label`
						}
						style={{ ...textStyle(false), color: color.mutedForeground }}
					>
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
					ref={(host: HostElement) => {
						fields[index] = host;
					}}
					onFocus={() => selectField(index)}
					value={draft()}
					theme={{
						text: color.foreground,
						textMuted: color.mutedForeground,
						textFaint: color.mutedForeground,
						textDim: color.mutedForeground,
						caret: color.foreground,
					}}
					onChange={(event: DomEvent) => {
						if (event.value === undefined) {
							throw new Error('Slider edit change without a value');
						}
						setDraft(event.value);
					}}
					onBlur={() => commit(index)}
					onKeyDown={(event: KeyEvent) => {
						if (event.key === 'Escape') cancel();
						else if (event.key === 'Enter') {
							event.preventDefault();
							commit(index);
						}
					}}
					style={{
						width: 40,
						...scale.body,
						fontVariationSettings: weight.normal,
						textAlign: 'center',
						color: color.foreground,
						backgroundColor: color.transparent,
						borderBottomStyle: 'solid',
						borderBottomWidth: 1,
						borderColor: color.border,
						keyboardFocusDim: false,
					}}
				/>
			</div>
		</Show>
	);

	return (
		<div style={{ position: 'relative', flexShrink: 0 }}>
			{/* Tabular digits keep the number from changing width, but the weight shift normal -> semibold still does, so this reserves the widest value at semibold. */}
			<text style={{ ...textStyle(true), opacity: 0 }}>
				{prefix()}
				{props.formatValue(props.max)}
				<Show when={props.isRange}>
					<span style={dashStyle}>—</span>
					{props.formatValue(props.max)}
				</Show>
			</text>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					bottom: 0,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
				}}
			>
				<Show
					when={props.editingIndex() === null}
					fallback={
						<>
							{value(0)}
							<Show when={props.isRange}>
								<text
									style={{
										...textStyle(false),
										color: color.mutedForeground,
										...dashStyle,
									}}
								>
									—
								</text>
								{value(1)}
							</Show>
						</>
					}
				>
					<text
						style={{
							...textStyle(props.interacting()),
							...valueFade,
							color: color.mutedForeground,
						}}
					>
						<Show when={props.label !== undefined}>
							<span
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-label`
								}
							>
								{prefix()}
							</span>
						</Show>
						{valueSpan(0)}
						<Show when={props.isRange}>
							<span style={dashStyle}>—</span>
							{valueSpan(1)}
						</Show>
					</text>
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
	const root = createSliderRoot({
		value: () => props.value,
		onValueChange: (next) => props.onChange(next),
		min: () => props.min,
		max: () => props.max,
		step: () => props.step,
		steps: () => props.steps,
		disabled: () => props.disabled,
	});
	const isRange = root.isRange;
	const values = root.values;
	const stepValues = root.stepValues;
	const min = root.min;
	const max = root.max;
	const step = root.step;
	const sliderValue = createSliderValue(root, {
		format: () => props.formatValue,
	});
	const formatValue = sliderValue.formatValue;
	const valuePosition = () => props.valuePosition ?? 'left';
	const inline = () =>
		valuePosition() === 'left' || valuePosition() === 'right';

	const [trackWidth, setTrackWidth] = createSignal<number>();
	const box = createControlBox({
		onMeasure(painted) {
			if (trackWidth() !== painted.width) setTrackWidth(painted.width);
		},
	});
	/** The thumb's left offset for a value: the target the spring chases. */
	const thumbLeft = (value: number, width: number) =>
		valueToPixel(value, min(), max(), width, THUMB_SIZE);

	const hover = createHover();
	const [editingIndex, setEditingIndex] = createSignal<number | null>(null);
	const [preview, setPreview] = createSignal<HoverPreview | null>(null);

	const computePreview = (x: number) => {
		const liveWidth = box.width();
		const usable = liveWidth - THUMB_SIZE;
		const cursor = Math.max(0, Math.min(liveWidth, x - box.left()));
		const raw = Math.max(0, Math.min(usable, cursor - THUMB_SIZE / 2));
		const snappedValue = pixelToValue(
			raw,
			min(),
			max(),
			step(),
			liveWidth,
			THUMB_SIZE,
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

	const control = createSliderControl(root, {
		owner: 'Slider',
		box,
		thumbSize: THUMB_SIZE,
		onHover(x) {
			if (box.width() === 0) return;
			computePreview(x);
		},
		onRelease: () => setPreview(null),
	});
	const pressed = control.pressed;
	/** True once a press has moved: from then on the thumb is placed, not sprung. */
	const moving = control.moving;

	const interacting = () => hover.hovered() || pressed();

	const onEnter = () => {
		if (props.disabled) return;
		box.sync();
		hover.enter();
	};
	const onLeave = () => {
		if (props.disabled) return;
		hover.leave();
		setPreview(null);
	};
	const pointer = {
		...control.pressProps,
		onMouseEnter: onEnter,
		onMouseLeave: onLeave,
	};

	/** FF's per-thumb names: "<label> minimum" / "<label> maximum", or bare "Minimum" / "Maximum". */
	const thumbLabel = (index: number) => {
		if (!isRange()) return props.label;
		const side = index === 0 ? 'Minimum' : 'Maximum';
		return props.label === undefined
			? side
			: `${props.label} ${side.toLowerCase()}`;
	};
	const thumbs = [0, 1].map((index) =>
		createSliderThumb(root, {
			index,
			label: () => thumbLabel(index),
			formatValue,
		}),
	);

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

	/**
	 * Each thumb's left offset, one motion value the thumb, the fill and a tooltip riding the thumb all read, so they move together mid-spring. A press or a key springs it to the new value (retargeting a spring in flight keeps its velocity); a drag places it.
	 */
	const thumbX = [createMotionValue(0), createMotionValue(0)];
	let placed = false;
	createRenderEffect(() => {
		const width = trackWidth();
		if (width === undefined) return;
		const dragged = moving();
		const first = !placed;
		placed = true;
		const count = isRange() ? 2 : 1;
		for (let index = 0; index < count; index++) {
			const target = thumbLeft(values()[index], width);
			if (first) thumbX[index].jump(target);
			// `set` leaves the press spring running, which keeps overwriting it until it settles, as in the source.
			else if (dragged) thumbX[index].set(target);
			else thumbX[index].animate(target, tween.moderate);
		}
	});
	/** The fill's pixels follow the thumbs natively: its right edge is the thumb centre, in the pill's own coordinates. */
	const FILL_EDGE = THUMB_SIZE / 2 - TRACK_INSET;
	const fillEdge0 = createTransform(
		thumbX[0],
		[0, 1],
		[FILL_EDGE, FILL_EDGE + 1],
		{ clamp: false },
	);
	const rangeSpan = createTransform(
		[thumbX[0], thumbX[1]],
		([first, second]) => second - first,
	);

	const display = () => (
		<Show when={props.showValue !== false && valuePosition() !== 'tooltip'}>
			<ValueDisplay
				values={values()}
				editingIndex={editingIndex}
				onStartEdit={setEditingIndex}
				onCommit={(index, next) => {
					root.setThumbValue(index, next);
					setEditingIndex(null);
				}}
				onCancel={() => setEditingIndex(null)}
				max={max()}
				snap={sliderValue.snapValue}
				formatValue={formatValue}
				label={props.label}
				isRange={isRange()}
				interacting={interacting}
				testId={props.testId}
			/>
		</Show>
	);

	const thumb = (index: number) => (
		<Show when={trackWidth() !== undefined}>
			<motion.div
				{...thumbs[index].thumbProps}
				testId={
					props.testId === undefined
						? undefined
						: `${props.testId}-thumb-${index}`
				}
				style={{
					position: 'absolute',
					left: 0,
					x: thumbX[index],
					top: PRESS_PAD,
					width: THUMB_SIZE,
					height: THUMB_SIZE,
					borderRadius: THUMB_SIZE / 2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'none',
					keyboardFocusDim: false,
					...springFade(['outline-color']),
					focusVisible: focusRing(1),
				}}
			>
				<div
					style={{
						width: THUMB_SIZE_REST,
						height: THUMB_SIZE_REST,
						borderRadius: THUMB_SIZE_REST / 2,
						backgroundColor: '#FFFFFF',
						boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
					}}
				/>
				<Show when={valuePosition() === 'tooltip'}>
					<ValueBubble
						text={() => formatValue(values()[index])}
						visible={interacting}
						gap={PRESS_PAD}
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-bubble-${index}`
						}
					/>
				</Show>
			</motion.div>
		</Show>
	);

	const areaHeight = () =>
		inline()
			? THUMB_SIZE + 16
			: THUMB_SIZE + (valuePosition() === 'tooltip' ? 16 : 0);

	return (
		<div
			testId={props.testId}
			style={{
				display: 'flex',
				flexDirection: inline() ? 'row' : 'column',
				alignItems: inline() ? 'center' : 'stretch',
				gap: inline() ? 8 : 0,
				marginBottom: inline() ? 8 : 0,
				width: '100%',
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? 'none' : 'auto',
				userSelect: 'none',
			}}
		>
			<Show when={valuePosition() === 'top' || valuePosition() === 'left'}>
				{display()}
			</Show>
			<div
				style={{
					position: 'relative',
					flexGrow: 1,
					minWidth: 0,
					height: areaHeight(),
					paddingTop: valuePosition() === 'tooltip' ? 16 : 0,
				}}
			>
				<div
					ref={box.ref}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-track`
					}
					onLayout={(event: DomEvent) => setTrackWidth(layoutWidth(event))}
					style={{
						position: 'relative',
						width: '100%',
						height: THUMB_SIZE + PRESS_PAD * 2,
						opacity: trackWidth() === undefined ? 0 : 1,
					}}
				>
					{/* The press target reaches 8px past each end, so presses out there clamp to min or max. */}
					<div
						testId={
							props.testId === undefined ? undefined : `${props.testId}-press`
						}
						ref={control.ref}
						{...pointer}
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: -PRESS_PAD,
							right: -PRESS_PAD,
							cursor: 'ew-resize',
						}}
					/>
					{/* The pill clips the fill and the hover bar to its rounded ends. */}
					<div
						style={{
							position: 'absolute',
							left: TRACK_INSET,
							right: TRACK_INSET,
							top: PRESS_PAD + TRACK_INSET,
							height: TRACK_BG_HEIGHT,
							borderRadius: TRACK_BG_HEIGHT / 2,
							borderStyle: 'solid',
							borderWidth: 1,
							borderColor: color.border,
							overflow: 'hidden',
							pointerEvents: 'none',
						}}
					>
						<div
							testId={
								props.testId === undefined ? undefined : `${props.testId}-fill`
							}
							style={{
								position: 'absolute',
								top: 0,
								bottom: 0,
								left: isRange() ? fillEdge0 : 0,
								width: isRange() ? rangeSpan : fillEdge0,
								backgroundColor: trackFill(),
							}}
						/>
						<motion.div
							initial={false}
							animate={{ opacity: preview() !== null && !pressed() ? 1 : 0 }}
							transition={{ duration: 0.15 }}
							style={{
								position: 'absolute',
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
							}}
						/>
					</div>
					<For each={stepDots()}>
						{(dot: number) => {
							const share = () =>
								max() === min() ? 0 : (dot - min()) / (max() - min());
							const size = () => (hover.hovered() ? DOT_SIZE * 1.25 : DOT_SIZE);
							return (
								<div
									style={{
										position: 'absolute',
										left: `calc(${THUMB_SIZE / 2}px + ${share()} * (100% - ${THUMB_SIZE}px))`,
										top: PRESS_PAD + THUMB_SIZE / 2,
										width: 0,
										height: 0,
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										pointerEvents: 'none',
									}}
								>
									<motion.div
										initial={false}
										animate={{
											width: size(),
											height: size(),
											opacity: dotHidden(dot) ? 0 : 0.3,
										}}
										transition={tween.moderate}
										style={{
											flexShrink: 0,
											borderRadius: 9999,
											backgroundColor: color.mutedForeground,
										}}
									/>
								</div>
							);
						}}
					</For>
					{thumb(0)}
					<Show when={isRange()}>{thumb(1)}</Show>
					<Show when={preview()}>
						{(shown: Accessor<HoverPreview>) => (
							<Show when={valuePosition() !== 'tooltip'}>
								<div
									style={{
										position: 'absolute',
										left: shown().cursorX,
										top: 4,
										width: 0,
										height: 0,
									}}
								>
									<ValueBubble
										text={() => formatValue(shown().snappedValue)}
										visible={() => hover.tooltipReady() && !pressed()}
										gap={0}
										testId={
											props.testId === undefined
												? undefined
												: `${props.testId}-hover-bubble`
										}
									/>
								</div>
							</Show>
						)}
					</Show>
				</div>
			</div>
			<Show when={valuePosition() === 'bottom' || valuePosition() === 'right'}>
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
	variant?: 'pips' | 'scrubber';
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
	const variant = () => props.variant ?? 'pips';
	const root = createSliderRoot({
		value: () => props.value,
		onValueChange(next) {
			if (typeof next !== 'number') {
				throw new Error('The default slider takes a single value');
			}
			props.onChange(next);
		},
		min: () => props.min,
		max: () => props.max,
		step: () => props.step,
		disabled: () => props.disabled,
	});
	const min = root.min;
	const max = root.max;
	const step = root.step;
	const formatValue = createSliderValue(root, {
		format: () => props.formatValue,
	}).formatValue;

	// A press maps over the border box, like the DOM version's getBoundingClientRect.
	const box = createControlBox({ onMeasure() {} });
	const hover = createHover();
	const [focused, setFocused] = createSignal(false);
	const [preview, setPreview] = createSignal<HoverPreview | null>(null);

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
	const inner = () => box.width() - ROW_BORDER * 2;
	const atMin = () => props.value === min();

	const valueAtX = (x: number) => {
		const liveWidth = box.width();
		const clamped = Math.max(0, Math.min(liveWidth, x - box.left()));
		if (variant() === 'pips') {
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
		if (variant() === 'pips') {
			return v === min() ? 0 : p * width + (20 - 20 * p);
		}
		return p * width;
	};

	const computePreview = (x: number) => {
		const width = inner();
		const liveWidth = box.width();
		if (liveWidth === 0) return;
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

	// The gutter spans the row and 8px past each end, so it takes the row's drags too.
	const gutter = createSliderControl(root, {
		owner: 'Slider',
		box,
		valueAt: valueAtX,
		onHover(x) {
			if (handle.pressed()) return;
			computePreview(x);
		},
		onRelease: () => setPreview(null),
	});
	// Grabbing the scrubber's handle sets the fill from the first event, with no spring.
	const handle = createSliderControl(root, {
		owner: 'Slider handle',
		box,
		valueAt: valueAtX,
		// The row's own press would end the placing this one starts.
		stopPropagation: true,
		onRelease: () => setPreview(null),
	});
	const pressed = () => gutter.pressed() || handle.pressed();
	/** A press on the scrubber's handle or a drag of the scrubber places the fill; anything else springs it. */
	const placing = () =>
		handle.pressed() || (gutter.moving() && variant() === 'scrubber');

	const onEnter = () => {
		if (props.disabled) return;
		box.sync();
		hover.enter();
	};
	const onLeave = () => {
		if (props.disabled) return;
		hover.leave();
		setPreview(null);
	};
	const pointer = {
		...gutter.pressProps,
		onMouseEnter: onEnter,
		onMouseLeave: onLeave,
	};

	const thumb = createSliderThumb(root, {
		index: 0,
		label: () => props.label,
		formatValue,
	});

	/**
	 * The fill, the handle line and the scrubber's handle strip all read these two, so a press, a key or a drag moves them together. `percent` (0..1) is the share of the row's width; `zeroOffset` is FF's px nudge that keeps the line visible at min and empties the pips fill there.
	 */
	const zeroTarget = () => (variant() === 'pips' ? 8 : 17);
	const percent = createMotionValue(percentOf(props.value));
	const zeroOffset = createMotionValue(atMin() ? zeroTarget() : 0);
	let placed = false;
	createRenderEffect(() => {
		const target = percentOf(props.value);
		const zero = atMin() ? zeroTarget() : 0;
		// The values start at the first render's target.
		if (!placed) {
			placed = true;
			return;
		}
		// `set` leaves a press spring running, which keeps overwriting it until it settles, as in the source.
		if (placing()) percent.set(target);
		else percent.animate(target, tween.fast);
		zeroOffset.animate(zero, tween.fast);
	});
	const scrubberFillWidth = createTransform(percent, [0, 1], ['0%', '100%']);
	const pipsFillWidth = createTransform(
		[percent, zeroOffset],
		([p, zo]) => `calc(${p * 100}% + ${20 - 20 * p - zo * 2.5}px)`,
	);
	const pipsLineLeft = createTransform(
		percent,
		[0, 1],
		['calc(0% + 11px)', 'calc(100% - 13px)'],
	);
	const scrubberLineLeft = createTransform(
		[percent, zeroOffset],
		([p, zo]) => `calc(${p * 100}% - 9px + ${zo}px)`,
	);
	const handleLeft = createTransform(
		[percent, zeroOffset],
		([p, zo]) => `calc(${p * 100}% - 8px + ${zo}px)`,
	);
	const lineColor = () => {
		if (focused()) return color.foreground;
		return foregroundAlpha(hover.hovered() ? 0.5 : 0.25);
	};
	const textColor = () =>
		isActive() ? color.foreground : color.mutedForeground;
	const textStyle = {
		...scale.body,
		whiteSpace: 'nowrap' as const,
	};
	const valueStyle = { ...textStyle, fontVariantNumeric: 'tabular-nums' };
	const textFade = springFade(['color']);

	return (
		<div
			testId={props.testId}
			style={{
				position: 'relative',
				width: '100%',
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? 'none' : 'auto',
				userSelect: 'none',
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
					position: 'absolute',
					top: 0,
					bottom: 0,
					left: -PRESS_PAD,
					right: -PRESS_PAD,
					cursor: 'ew-resize',
				}}
			/>
			<div
				ref={box.ref}
				testId={props.testId === undefined ? undefined : `${props.testId}-row`}
				{...pointer}
				style={{
					position: 'relative',
					height: ROW_HEIGHT,
					width: '100%',
					borderStyle: 'solid',
					borderWidth: ROW_BORDER,
					borderColor: color.border,
					borderRadius: shape.bg,
					overflow: 'hidden',
					cursor: 'ew-resize',
					outlineWidth: 1,
					outlineStyle: 'solid',
					outlineColor: focused() ? color.focusRing : color.transparent,
					outlineOffset: 2,
					...springFade(['outline-color']),
				}}
			>
				<Show when={variant() === 'pips'}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: 0,
							right: 0,
							display: 'flex',
							flexDirection: 'row',
							justifyContent: 'space-between',
							alignItems: 'center',
							paddingLeft: 12,
							paddingRight: 12,
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
											opacity: hidden() ? 0 : 1,
										}}
									>
										<div
											style={{
												width: PIP_SIZE,
												height: PIP_SIZE,
												borderRadius: PIP_SIZE / 2,
												backgroundColor: active()
													? color.foreground
													: color.mutedForeground,
												opacity: active() ? 1 : 0.3,
												...springFade(['background-color', 'opacity']),
											}}
										/>
									</div>
								);
							}}
						</For>
					</div>
				</Show>
				{/* Blank boxes the size of the label and the value, in the surface colour, so no pip is drawn through the words. */}
				<Show when={variant() === 'pips'}>
					<div
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: 0,
							right: 0,
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							paddingLeft: 8,
							paddingRight: 8,
						}}
					>
						<Show when={props.label !== undefined}>
							<div
								style={{
									paddingLeft: 8,
									paddingRight: 8,
									backgroundColor: color.surface2,
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
							}}
						>
							<text style={{ ...valueStyle, opacity: 0 }}>
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
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: preview()?.left ?? 0,
						width: preview()?.width ?? 0,
						backgroundColor: hoverPreviewFill(),
					}}
				/>
				<div
					testId={
						props.testId === undefined ? undefined : `${props.testId}-fill`
					}
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: 0,
						width: variant() === 'pips' ? pipsFillWidth : scrubberFillWidth,
						backgroundColor: color.active,
					}}
				/>
				<motion.div
					testId={
						props.testId === undefined ? undefined : `${props.testId}-line`
					}
					initial={false}
					animate={{
						top: isActive() ? 7 : 8,
						bottom: isActive() ? 7 : 8,
					}}
					transition={tween.fast}
					style={{
						position: 'absolute',
						left: variant() === 'pips' ? pipsLineLeft : scrubberLineLeft,
						width: 2,
						borderRadius: 1,
						backgroundColor: lineColor(),
						...springFade(['background-color']),
					}}
				/>
				<div
					style={{
						position: 'absolute',
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						paddingLeft: 16,
						paddingRight: 16,
					}}
				>
					<Show when={props.label !== undefined}>
						<text style={{ ...textStyle, color: textColor(), ...textFade }}>
							{props.label}
						</text>
					</Show>
					<div style={{ flexGrow: 1 }} />
					{/* Stands in for the source's `minWidth: <max length>ch` on the value: the widest value, set in tabular digits, so the label never moves as the number changes. */}
					<div style={{ position: 'relative', flexShrink: 0 }}>
						<text style={{ ...valueStyle, opacity: 0 }}>
							{formatValue(max())}
						</text>
						<text
							style={{
								...valueStyle,
								position: 'absolute',
								top: 0,
								right: 0,
								color: textColor(),
								...textFade,
							}}
						>
							{formatValue(props.value)}
						</text>
					</div>
				</div>
				<Show when={variant() === 'scrubber'}>
					<div
						testId={
							props.testId === undefined ? undefined : `${props.testId}-handle`
						}
						{...handle.pressProps}
						ref={handle.ref}
						onMouseEnter={onEnter}
						onMouseLeave={onLeave}
						style={{
							position: 'absolute',
							top: 0,
							bottom: 0,
							left: handleLeft,
							width: 8,
							cursor: 'ew-resize',
						}}
					/>
				</Show>
			</div>
			{/* Hidden thumb: the only thing Tab reaches, so focus (and the ring) is keyboard-only like the primitive's thumb. */}
			<div
				{...thumb.thumbProps}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-thumb`
				}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: 1,
					height: 1,
					opacity: 0,
					pointerEvents: 'none',
					keyboardFocusDim: false,
				}}
			/>
			<Show when={preview()}>
				{(shown: Accessor<HoverPreview>) => (
					<div
						style={{
							position: 'absolute',
							left: shown().cursorX,
							top: -6,
							width: 0,
							height: 0,
						}}
					>
						<ValueBubble
							text={() => formatValue(shown().snappedValue)}
							visible={() => hover.tooltipReady() && !pressed()}
							gap={0}
							testId={
								props.testId === undefined
									? undefined
									: `${props.testId}-hover-bubble`
							}
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
	variant?: 'pips' | 'scrubber';
	/** `"default"` renders the pip / scrubber row, `"compact"` the dense thumb-and-track design. */
	size?: SliderSize;
}

/** One slider, two engines. Features only the compact engine implements (a range, a step list, value display) force it whatever the size, so no capability is lost. */
export function Slider(props: SliderProps) {
	const needsCompact = () =>
		(props.size ?? sizeChoice()) === 'compact' ||
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
		throw new Error('The default slider takes a single value');
	}
	return value;
}
