import type {
	HostMouseEvent,
	HostMouseMoveEvent,
	KeyEvent,
} from "@gpuix/solid";
import { motion } from "@gpuix/solid";
import { createSignal, createUniqueId } from "solid-js";
import { createPointerCapture } from "../lib/pointer-capture";
import {
	color,
	focusRing,
	sizeChoice,
	type as scale,
	scheme,
	motion as tween,
	weight,
} from "../lib/theme";

export type SwitchSize = "default" | "compact";

const METRICS = {
	default: {
		trackWidth: 34,
		trackHeight: 20,
		thumbSize: 16,
		pillExtend: 2,
		pressExtend: 4,
		pressShrink: 4,
		gap: 8,
		padX: 12,
		padY: 8,
		text: scale.body,
	},
	compact: {
		trackWidth: 28,
		trackHeight: 16,
		thumbSize: 12,
		pillExtend: 2,
		pressExtend: 3,
		pressShrink: 3,
		gap: 4,
		padX: 10,
		padY: 4,
		text: scale.bodyCompact,
	},
} as const;

/** 2px between a resting thumb and every track edge. */
const THUMB_OFFSET = 2;
/** Pointer travel before a press turns into a drag; under it the gesture stays a click. */
const DRAG_DEAD_ZONE = 2;

export function Switch(props: {
	label: string;
	checked: boolean;
	onToggle: () => void;
	disabled?: boolean;
	size?: SwitchSize;
	/** A settings row: the label at the left, the track at the right, across the whole width, 36 px tall (the playground panels' `flex-row-reverse justify-between h-9 px-1 py-0`). */
	settingsRow?: boolean;
	testId?: string;
}) {
	const m = () => METRICS[props.size ?? sizeChoice()];
	const trackId = createUniqueId();
	const labelId = createUniqueId();
	const thumbTravel = () => m().trackWidth - m().thumbSize - THUMB_OFFSET * 2;
	const pressedThumbWidth = () => m().thumbSize + m().pressExtend;
	const dragMin = THUMB_OFFSET;
	const dragMax = () => m().trackWidth - THUMB_OFFSET - pressedThumbWidth();

	// The row and the track each report their own enter and leave, so hover is a count of the elements the pointer is over.
	const [overCount, setOverCount] = createSignal(0);
	const hovered = () => overCount() > 0;
	const [pressed, setPressed] = createSignal(false);
	const [dragX, setDragX] = createSignal<number | null>(null);
	let press: { startX: number; originX: number } | undefined;
	let dragging = false;
	const row = createPointerCapture("Switch");

	const thumbWidth = () =>
		pressed()
			? pressedThumbWidth()
			: hovered()
				? m().thumbSize + m().pillExtend
				: m().thumbSize;
	const thumbHeight = () =>
		pressed() ? m().thumbSize - m().pressShrink : m().thumbSize;
	const thumbY = () =>
		pressed() ? THUMB_OFFSET + m().pressShrink / 2 : THUMB_OFFSET;
	// Checked, the extra width grows leftward so the outer edge stays pinned to the track end.
	const restX = () =>
		props.checked
			? THUMB_OFFSET + thumbTravel() - (thumbWidth() - m().thumbSize)
			: THUMB_OFFSET;

	const onPressStart = (event: HostMouseEvent) => {
		if (props.disabled || event.button !== 0) return;
		if (event.x === undefined) throw new Error("mouseDown without coordinates");
		row.capture(event);
		setPressed(true);
		dragging = false;
		press = { startX: event.x, originX: restX() };
	};

	const onPressMove = (event: HostMouseMoveEvent) => {
		if (press === undefined) return;
		if (event.x === undefined) throw new Error("mouseMove without coordinates");
		const delta = event.x - press.startX;
		if (!dragging) {
			if (Math.abs(delta) < DRAG_DEAD_ZONE) return;
			dragging = true;
		}
		setDragX(Math.max(dragMin, Math.min(dragMax(), press.originX + delta)));
	};

	const onRelease = () => {
		if (press === undefined) return;
		const wasDragging = dragging;
		const releasedAt = dragX();
		press = undefined;
		dragging = false;
		setPressed(false);
		setDragX(null);
		if (!wasDragging) {
			props.onToggle();
			return;
		}
		if (releasedAt === null) throw new Error("drag ended without a position");
		// Past the midpoint of the drag range is on, short of it off, whichever side it started from.
		const shouldBeOn = releasedAt > (dragMin + dragMax()) / 2;
		if (shouldBeOn !== props.checked) props.onToggle();
	};

	// The release ends the capture, so it arrives as pointerup, then lostpointercapture, then mouseup: only a capture lost with the press still down is a cancel.
	const onPressCancel = () => {
		if (press === undefined) return;
		press = undefined;
		dragging = false;
		setPressed(false);
		setDragX(null);
	};

	// Base UI's switch root owns the keys: Enter clicks on keydown, Space on keyup (a keydown only keeps the page from scrolling).
	const onKeyDown = (event: KeyEvent) => {
		if (props.disabled) return;
		if (event.key === "Enter") {
			event.preventDefault();
			props.onToggle();
		} else if (event.key === " ") {
			event.preventDefault();
		}
	};
	const onKeyUp = (event: KeyEvent) => {
		if (props.disabled || event.key !== " " || event.defaultPrevented) return;
		props.onToggle();
	};

	const hoverHandlers = {
		onMouseEnter: () => setOverCount(overCount() + 1),
		onMouseLeave: () => setOverCount(overCount() - 1),
	};

	const trackColor = () => {
		if (props.checked) return hovered() ? color.switchOnHover : color.switchOn;
		return hovered() ? color.switchOffHover : color.accent;
	};

	return (
		<div
			ref={row.ref}
			testId={props.testId}
			{...hoverHandlers}
			onMouseDown={onPressStart}
			onMouseMove={onPressMove}
			onPointerUp={onRelease}
			onLostPointerCapture={onPressCancel}
			style={{
				display: "flex",
				flexDirection: props.settingsRow === true ? "row-reverse" : "row",
				alignItems: "center",
				gap: m().gap,
				paddingLeft: props.settingsRow === true ? 4 : m().padX,
				paddingRight: props.settingsRow === true ? 4 : m().padX,
				paddingTop: props.settingsRow === true ? 0 : m().padY,
				paddingBottom: props.settingsRow === true ? 0 : m().padY,
				...(props.settingsRow === true
					? { justifyContent: "space-between", width: "100%", height: 36 }
					: {}),
				cursor: "pointer",
				userSelect: "none",
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? "none" : "auto",
			}}
		>
			<div
				id={trackId}
				role="switch"
				aria-checked={props.checked}
				aria-labelledby={labelId}
				aria-disabled={props.disabled === true}
				tabIndex={props.disabled ? -1 : 0}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-track`
				}
				{...hoverHandlers}
				onKeyDown={onKeyDown}
				onKeyUp={onKeyUp}
				style={{
					position: "relative",
					flexShrink: 0,
					width: m().trackWidth,
					height: m().trackHeight,
					borderRadius: m().trackHeight / 2,
					backgroundColor: trackColor(),
					cursor: "pointer",
					keyboardFocusDim: false,
					focusVisible: focusRing(2),
				}}
			>
				<motion.div
					initial={false}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-thumb`
					}
					animate={{
						left: dragX() ?? restX(),
						top: thumbY(),
						width: thumbWidth(),
						height: thumbHeight(),
					}}
					transition={dragX() === null ? tween.moderate : tween.snap}
					style={{
						position: "absolute",
						backgroundColor: "#FFFFFF",
						borderRadius: 9999,
						boxShadow: {
							offsetX: 0,
							offsetY: 1,
							blurRadius: 3,
							spreadRadius: 0,
							color: "rgba(0,0,0,0.1)",
						},
					}}
				/>
			</div>
			<text
				id={labelId}
				style={{
					...m().text,
					fontWeight: weight.normal,
					whiteSpace: "nowrap",
					color: props.checked ? color.foreground : color.mutedForeground,
				}}
			>
				{props.label}
			</text>
		</div>
	);
}
