import { buttonProps, motion } from "@gpuix/solid";
import {
	type Accessor,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { Icon } from "../lib/icon";
import type { IconName } from "../lib/icons";
import { color, height, radius, motion as tween, weight } from "../lib/theme";
import type { InputSize } from "./input-group";
import { Tooltip, type TooltipTrigger } from "./tooltip";

/** How long the copied / failed result stays in place. */
const RESULT_MS = 2000;
/** The tooltip's own hover delay: a press before it is a press on a closed tooltip. */
const TOOLTIP_DELAY_MS = 500;
/** `[#6B97FF]/20` behind the value while the row is hovered. */
const MARK = "rgba(107,151,255,0.2)";
const MONO = "Menlo";

type Status = "idle" | "copied" | "error";
type TooltipMode = "idle" | "copied" | "suppressed";

const steps = {
	default: { height: height.control, text: 13, line: 20, icon: 14 },
	compact: { height: height.controlCompact, text: 12, line: 18, icon: 14 },
} as const;

/**
 * gpuix has no clipboard API, so the system command writes it. Rejects when
 * the command is missing or fails, which InputCopy shows as a red cross.
 */
export async function copyToClipboard(text: string) {
	const command = process.platform === "darwin" ? "pbcopy" : "wl-copy";
	const child = Bun.spawn([command], { stdin: new Blob([text]) });
	const code = await child.exited;
	if (code !== 0) throw new Error(`${command} exited with ${code}`);
}

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
	/** Defaults to the system clipboard command. */
	copy?: (text: string) => Promise<void>;
	testId?: string;
}) {
	const variant = () => props.variant ?? "icon";
	const align = () => props.align ?? "right";
	const step = () => steps[props.size ?? "default"];
	const [status, setStatus] = createSignal<Status>("idle");
	/** Keys the result glyph: copying again while "Copied" shows replays it. */
	const [copyCount, setCopyCount] = createSignal(0);
	const [tooltipMode, setTooltipMode] = createSignal<TooltipMode>("idle");
	const [hovered, setHovered] = createSignal(false);
	/** Whether the tooltip has had time to show under the pointer. */
	const [tooltipShown, setTooltipShown] = createSignal(false);
	let resultTimer: ReturnType<typeof setTimeout> | undefined;
	let tooltipTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => {
		clearTimeout(resultTimer);
		clearTimeout(tooltipTimer);
	});

	const handleCopy = async () => {
		if (props.disabled) return;
		const tooltipWasShown = tooltipShown();
		const copy = props.copy ?? copyToClipboard;
		let ok = true;
		try {
			await copy(props.value);
		} catch {
			ok = false;
		}
		setStatus(ok ? "copied" : "error");
		setCopyCount(copyCount() + 1);
		// The tooltip says "Copied" only if it was already showing at the press.
		setTooltipMode(tooltipWasShown ? "copied" : "suppressed");
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
		clearTimeout(tooltipTimer);
		tooltipTimer = setTimeout(() => setTooltipShown(true), TOOLTIP_DELAY_MS);
	};
	const onMouseLeave = () => {
		setHovered(false);
		setTooltipShown(false);
		clearTimeout(tooltipTimer);
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

	const glyph = (): { name: IconName; color: string } => {
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

	const row = (tooltip?: TooltipTrigger) => (
		<div
			{...buttonProps({ disabled: props.disabled, onClick: handleCopy })}
			aria-label={
				status() === "copied"
					? "Copied"
					: status() === "error"
						? "Copy failed"
						: "Copy to clipboard"
			}
			testId={props.testId}
			onMouseEnter={() => {
				onMouseEnter();
				tooltip?.onMouseEnter();
			}}
			onMouseLeave={() => {
				onMouseLeave();
				tooltip?.onMouseLeave();
			}}
			onMouseDown={tooltip?.onMouseDown}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				width: "100%",
				borderRadius: radius.item,
				cursor: "pointer",
				userSelect: "none",
				keyboardFocusDim: false,
				focusVisible: {
					outlineWidth: 1,
					outlineColor: color.focusRing,
					outlineOffset: 0,
				},
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
				>
					{(tooltip: TooltipTrigger) => row(tooltip)}
				</Tooltip>
			</Show>
		</div>
	);
}
