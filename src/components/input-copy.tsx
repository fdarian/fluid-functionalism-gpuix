import { buttonProps, motion, useGpuixRequired } from "@gpuix/solid";
import {
	type Accessor,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import {
	color,
	colorFade,
	fade,
	focusRing,
	shape,
	sizeChoice,
	motion as tween,
	weight,
} from "../lib/theme";
import type { InputSize } from "./input-group";
import { Tooltip } from "./tooltip";

/** How long the copied / failed result stays in place. */
const RESULT_MS = 2000;
const TOOLTIP_DELAY_MS = 500;
/** `[#6B97FF]/20` behind the value while the row is hovered. */
const MARK = "rgba(107,151,255,0.2)";
const MONO = "Menlo";

type Status = "idle" | "copied" | "error";
type TooltipMode = "idle" | "copied" | "suppressed";

/** The row is its padded line: `py-2` around 20 (36), `py-1` around 18 (26, not the 28 the source's comment claims). */
const steps = {
	default: { height: 8 + 20 + 8, text: 13, line: 20, icon: 14 },
	compact: { height: 4 + 18 + 4, text: 12, line: 18, icon: 14 },
} as const;

/** Remounts on a new `key`, so the fade replays when the glyph is the same one as before. */
function Swap(props: { key: string; children: JSX.Element }) {
	return (
		<For each={[props.key]}>
			{() => (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={tween.fast}
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 6,
					}}
				>
					{props.children}
				</motion.div>
			)}
		</For>
	);
}

/**
 * A value that copies on click. The whole row is one button: hovering tints
 * the value and thickens the icon, and the result shows in place for two
 * seconds, as a check or a red cross.
 */
export function InputCopy(props: {
	value: string;
	label?: string;
	onCopy?: () => void;
	disabled?: boolean;
	/** `icon`: the glyph alone, with a tooltip. `button`: the glyph and a "Copy" label. */
	variant?: "icon" | "button";
	/** Where the copy action sits relative to the value. */
	align?: "right" | "left";
	size?: InputSize;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const variant = () => props.variant ?? "icon";
	const align = () => props.align ?? "right";
	const step = () => steps[props.size ?? sizeChoice()];
	const [status, setStatus] = createSignal<Status>("idle");
	/** Keys the result glyph: copying again while "Copied" shows replays it. */
	const [copyCount, setCopyCount] = createSignal(0);
	const [tooltipMode, setTooltipMode] = createSignal<TooltipMode>("idle");
	const [hovered, setHovered] = createSignal(false);
	/** Whether the tooltip is open by hover or focus, as it last reported. */
	let tooltipOpen = false;
	/** Whether it was open when the last pointer press began: the tooltip closes on press, before the click lands. */
	let tooltipOpenAtPress = false;
	let resultTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(resultTimer));

	const handleCopy = async () => {
		if (props.disabled) return;
		let ok = true;
		try {
			await navigator.clipboard.writeText(props.value);
		} catch {
			ok = false;
		}
		setStatus(ok ? "copied" : "error");
		setCopyCount(copyCount() + 1);
		// The tooltip says "Copied" only if it was already showing at the press.
		setTooltipMode(tooltipOpenAtPress ? "copied" : "suppressed");
		if (ok) props.onCopy?.();
		clearTimeout(resultTimer);
		resultTimer = setTimeout(() => {
			setStatus("idle");
			setTooltipMode("suppressed");
		}, RESULT_MS);
	};

	const onMouseEnter = () => {
		setHovered(true);
		setTooltipMode((mode) => (mode === "suppressed" ? "idle" : mode));
	};
	const onMouseLeave = () => {
		setHovered(false);
		setTooltipMode((mode) => (mode === "copied" ? "suppressed" : mode));
	};

	const forceOpen = () => {
		switch (tooltipMode()) {
			case "copied":
				return true;
			case "suppressed":
				return false;
			case "idle":
				return undefined;
		}
	};
	const tooltipContent = () => {
		if (tooltipMode() === "idle") return "Copy to clipboard";
		return status() === "error" ? "Copy failed" : "Copied";
	};

	const glyph = (): { name: IconRef; color: string } => {
		switch (status()) {
			case "error":
				return { name: "x", color: color.destructive };
			case "copied":
				return {
					name: "check",
					color: hovered() ? color.foreground : color.mutedForeground,
				};
			case "idle":
				return {
					name: "copy",
					color: hovered() ? color.foreground : color.mutedForeground,
				};
		}
	};
	const label = () => {
		switch (status()) {
			case "error":
				return "Failed";
			case "copied":
				return "Copied";
			case "idle":
				return "Copy";
		}
	};
	const labelColor = () =>
		status() === "error"
			? color.destructive
			: hovered()
				? color.foreground
				: color.mutedForeground;

	const icon = () => (
		<Icon
			name={glyph().name}
			size={step().icon}
			strokeWidth={hovered() ? 2 : 1.5}
			easeStroke
			fade
			color={glyph().color}
		/>
	);

	const action = () => (
		<div
			style={{
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: 6,
				paddingRight: 6,
				height: step().height,
			}}
		>
			<Show
				when={variant() === "button"}
				fallback={<Swap key={`${status()}-${copyCount()}`}>{icon()}</Swap>}
			>
				<Swap key={`${status()}-${copyCount()}`}>
					{icon()}
					{/* A hidden "Copied" in flow reserves the widest label, so the swap never resizes the row. */}
					<div style={{ position: "relative" }}>
						<text
							style={{
								fontSize: step().text,
								lineHeight: step().line,
								color: color.transparent,
							}}
						>
							Copied
						</text>
						<div style={{ position: "absolute", top: 0, left: 0 }}>
							<text
								style={{
									fontSize: step().text,
									lineHeight: step().line,
									fontWeight: weight.normal,
									color: labelColor(),
									...colorFade,
								}}
							>
								{label()}
							</text>
						</div>
					</div>
				</Swap>
			</Show>
		</div>
	);

	const value = () => (
		<div
			style={{
				flexGrow: 1,
				minWidth: 0,
				height: step().height,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: align() === "left" ? 4 : 0,
			}}
		>
			<text
				highlight={
					hovered()
						? {
								query: props.value,
								caseSensitive: true,
								color: MARK,
								radius: 2,
							}
						: null
				}
				style={{
					minWidth: 0,
					fontFamily: MONO,
					fontSize: step().text,
					lineHeight: step().line,
					fontWeight: weight.normal,
					color: color.foreground,
					whiteSpace: "nowrap",
					textOverflow: "ellipsis",
					overflow: "hidden",
					userSelect: "none",
				}}
			>
				{props.value}
			</text>
		</div>
	);

	const row = () => (
		<div
			{...buttonProps(
				{ disabled: props.disabled, onClick: handleCopy, tabIndex: 0 },
				renderer,
			)}
			aria-label={
				status() === "copied"
					? "Copied"
					: status() === "error"
						? "Copy failed"
						: "Copy to clipboard"
			}
			testId={props.testId}
			onMouseDown={() => {
				tooltipOpenAtPress = tooltipOpen;
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				width: "100%",
				borderRadius: shape.input,
				cursor: "pointer",
				userSelect: "none",
				keyboardFocusDim: false,
				// The source's `transition-all` also eases its box-shadow ring in: the port's ring is an outline that starts transparent.
				outlineWidth: 1,
				outlineColor: color.transparent,
				outlineOffset: 0,
				...fade(["outline-color"], 80),
				focusVisible: focusRing(0),
			}}
		>
			{align() === "left" ? (
				<>
					{action()}
					{value()}
				</>
			) : (
				<>
					{value()}
					{action()}
				</>
			)}
		</div>
	);

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? "none" : undefined,
			}}
		>
			<Show when={props.label}>
				{(text: Accessor<string>) => (
					<div
						style={{
							paddingLeft: align() === "left" ? 4 : 0,
							paddingBottom: 2,
						}}
					>
						<text
							style={{
								fontSize: step().text,
								lineHeight: step().line,
								fontWeight: weight.normal,
								color: color.mutedForeground,
							}}
						>
							{text()}
						</text>
					</div>
				)}
			</Show>
			<Show when={variant() === "icon"} fallback={row()}>
				<Tooltip
					content={tooltipContent()}
					delayDuration={TOOLTIP_DELAY_MS}
					sideOffset={2}
					forceOpen={forceOpen()}
					onOpenChange={(open) => {
						tooltipOpen = open;
					}}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-tooltip`
					}
				>
					{row()}
				</Tooltip>
			</Show>
		</div>
	);
}
