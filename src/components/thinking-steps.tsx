import {
	AnimatePresence,
	buttonProps,
	type MotionTransition,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { onFrame } from "../lib/clock";
import { StableLabel } from "../lib/stable-label";
import { Icon } from "../lib/icon";
import { defineIcon, type IconRef } from "../lib/icons";
import { createMeasuredHeight } from "../lib/measured-height";
import { color, radius, type as scale, motion as tween, weight, focusRing } from "../lib/theme";
import { Badge, type BadgeColor } from "./badge";
import { Shimmer } from "./thinking-indicator";

const slowSpring = {
	type: "spring",
	duration: 0.24,
	bounce: 0.12,
} satisfies MotionTransition;
/** The panel's own tweak of `spring.moderate`: pure height looks better without overshoot. */
const panelSpring = tween.moderate;

const glyphs = {
	dot: defineIcon('<circle cx="12" cy="12" r="1"/>'),
	search: defineIcon(
		'<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
	),
	globe: defineIcon(
		'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
	),
	brain: defineIcon(
		'<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',
	),
	image: defineIcon(
		'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
	),
	check: defineIcon('<path d="M20 6 9 17l-5-5"/>'),
} as const satisfies Record<string, IconRef>;

export type StepIcon = keyof typeof glyphs;
export type StepStatus = "complete" | "active" | "pending";

// ─── Chevron ──────────────────────────────────────────────────────────────

const TURN_MS = 100;

/**
 * Right when collapsed, rotated 90 degrees down when open. gpuix cannot rotate
 * an element, so the rotation is inside the SVG source and a short JS tween
 * rewrites it: whole degrees, so GPUI's SVG cache sees at most 91 strings.
 */
function Chevron(props: { open: boolean; stroke: number; color: string }) {
	const [angle, setAngle] = createSignal(props.open ? 90 : 0);
	createEffect(() => {
		const target = props.open ? 90 : 0;
		const from = angle();
		let elapsed = 0;
		const stop = onFrame((dt) => {
			elapsed += dt;
			const progress = Math.min(elapsed / TURN_MS, 1);
			setAngle(Math.round(from + (target - from) * (1 - (1 - progress) ** 3)));
			if (progress === 1) stop();
		});
	});
	return (
		<Icon
			name={defineIcon(
				`<g transform="rotate(${angle()} 12 12)"><path d="m9 18 6-6-6-6"/></g>`,
			)}
			size={16}
			strokeWidth={props.stroke}
			color={props.color}
		/>
	);
}

// ─── Trigger row ──────────────────────────────────────────────────────────

/**
 * Hover background, a label that goes semibold when open (a hidden semibold
 * copy reserves the width), and the chevron. Mirrors the accordion trigger.
 */
function TriggerRow(props: {
	open: boolean;
	onToggle: () => void;
	paddingX: number;
	paddingY: number;
	gap: number;
	testId?: string;
	children: string;
}) {
	const renderer = useGpuixRequired();
	const inert = useContext(InertContext);
	const [hovered, setHovered] = createSignal(false);
	const highlighted = () => props.open || hovered();
	return (
		<div
			style={{ position: "relative", alignSelf: "flex-start" }}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<AnimatePresence>
				<Show when={hovered()}>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.08 }}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							borderRadius: radius.item,
							backgroundColor: color.hover,
							pointerEvents: "none",
						}}
					/>
				</Show>
			</AnimatePresence>
			<div
				{...buttonProps({ disabled: inert(), onClick: props.onToggle, tabIndex: 0 }, renderer)}
				testId={props.testId}
				aria-expanded={props.open}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: props.gap,
					paddingLeft: props.paddingX,
					paddingRight: props.paddingX,
					paddingTop: props.paddingY,
					paddingBottom: props.paddingY,
					borderRadius: radius.item,
					cursor: "pointer",
					userSelect: "none",
					keyboardFocusDim: false,
					focusVisible: focusRing(0),
				}}
			>
				<StableLabel
					text={props.children}
					heavy={props.open}
					color={highlighted() ? color.foreground : color.mutedForeground}
				/>
				<Chevron
					open={props.open}
					stroke={highlighted() ? 2 : 1.5}
					color={highlighted() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</div>
	);
}

// ─── Collapse ─────────────────────────────────────────────────────────────

/**
 * Whether a trigger sits inside a closed panel. Base UI hides a closed panel,
 * which takes its triggers out of the tab order; gpuix has no `display: none`,
 * so a trigger in a clipped panel would still be tabbable and Enter-activatable.
 */
const InertContext = createContext<() => boolean>(() => false);

/**
 * A box whose height springs between 0 and its content's. gpuix cannot animate
 * `height: auto`, so the content reports its size through `onLayout` and the
 * outer box tweens to that number.
 */
function Collapse(props: { open: boolean; children: JSX.Element }) {
	const measured = createMeasuredHeight();
	const parentInert = useContext(InertContext);
	// A panel that mounts open takes its first height with no spring.
	const [needsSnap, setNeedsSnap] = createSignal(props.open);
	createEffect(() => {
		if (!needsSnap() || measured.height() === undefined) return;
		const timer = setTimeout(() => setNeedsSnap(false), 100);
		onCleanup(() => clearTimeout(timer));
	});
	const target = () => (props.open ? (measured.height() ?? 0) : 0);
	return (
		<motion.div
			initial={{ height: 0 }}
			animate={{ height: target() }}
			transition={needsSnap() ? tween.snap : panelSpring}
			style={{
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<div onLayout={measured.onLayout} style={{ flexShrink: 0 }}>
				<InertContext.Provider
					value={() => parentInert() || !props.open}
				>
					{props.children}
				</InertContext.Provider>
			</div>
		</motion.div>
	);
}

// ─── ThinkingSteps (root) ─────────────────────────────────────────────────

interface OpenState {
	open: () => boolean;
	toggle: () => void;
}

const OpenContext = createContext<OpenState>();

function useOpen(): OpenState {
	const state = useContext(OpenContext);
	if (state === undefined) {
		throw new Error(
			"ThinkingStepsHeader and ThinkingStepsContent need a ThinkingSteps",
		);
	}
	return state;
}

export function ThinkingSteps(props: {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	width?: number | string;
	testId?: string;
	children: JSX.Element;
}) {
	const [internalOpen, setInternalOpen] = createSignal(
		props.defaultOpen ?? true,
	);
	const open = () => props.open ?? internalOpen();
	const toggle = () => {
		const next = !open();
		if (props.open === undefined) setInternalOpen(next);
		props.onOpenChange?.(next);
	};
	return (
		<OpenContext.Provider value={{ open, toggle }}>
			<div
				testId={props.testId}
				style={{
					display: "flex",
					flexDirection: "column",
					width: props.width ?? 320,
					maxWidth: "100%",
				}}
			>
				{props.children}
			</div>
		</OpenContext.Provider>
	);
}

export function ThinkingStepsHeader(props: {
	testId?: string;
	children?: string;
}) {
	const state = useOpen();
	return (
		<TriggerRow
			open={state.open()}
			onToggle={state.toggle}
			testId={props.testId}
			paddingX={12}
			paddingY={8}
			gap={10}
		>
			{props.children ?? "Thinking"}
		</TriggerRow>
	);
}

export function ThinkingStepsContent(props: { children: JSX.Element }) {
	const state = useOpen();
	return (
		<Collapse open={state.open()}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					paddingLeft: 12,
					paddingRight: 12,
					paddingTop: 4,
					paddingBottom: 12,
				}}
			>
				{props.children}
			</div>
		</Collapse>
	);
}

// ─── ThinkingStep ─────────────────────────────────────────────────────────

export function ThinkingStep(props: {
	icon?: StepIcon;
	showIcon?: boolean;
	label: string;
	description?: string;
	status?: StepStatus;
	/** Seconds the content waits after the step's height starts opening. */
	delay?: number;
	isLast?: boolean;
	testId?: string;
	children?: JSX.Element;
}) {
	const measured = createMeasuredHeight();
	const status = () => props.status ?? "complete";
	const labelStyle = { ...scale.body, fontWeight: weight.semibold };
	return (
		<Show when={status() !== "pending"}>
			{/* Outer: animates height so the space opens smoothly. */}
			<motion.div
				testId={props.testId}
				initial={{ height: 0 }}
				animate={{ height: measured.height() ?? 0 }}
				transition={slowSpring}
				style={{ position: "relative", overflow: "hidden" }}
			>
				{/* Inner: fades the content in after the space starts opening. */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{
						duration: 0.24,
						delay: props.delay ?? 0.08,
						ease: "easeOut",
					}}
				>
					<div onLayout={measured.onLayout}>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								gap: 10,
								paddingLeft: 8,
								paddingRight: 8,
								paddingTop: 6,
								paddingBottom: 6,
								borderRadius: radius.item,
							}}
						>
							{/* Icon column with a connector that runs to the bottom of the step. */}
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									flexShrink: 0,
									width: 14,
								}}
							>
								<div style={{ paddingTop: 2 }}>
									<Show
										when={props.showIcon !== false}
										fallback={
											<div
												style={{
													width: 14,
													height: 14,
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
												}}
											>
												<div
													style={{
														width: 6,
														height: 6,
														borderRadius: 3,
														backgroundColor: color.mutedForeground,
														opacity: 0.6,
													}}
												/>
											</div>
										}
									>
										<Icon
											name={glyphs[props.icon ?? "dot"]}
											size={14}
											strokeWidth={1.5}
											color={color.mutedForeground}
										/>
									</Show>
								</div>
								<Show when={props.isLast !== true}>
									<div
										style={{
											flexGrow: 1,
											width: 1,
											marginTop: 4,
											backgroundColor: color.border,
											opacity: 0.6,
										}}
									/>
								</Show>
							</div>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									flexGrow: 1,
									gap: 4,
									minWidth: 0,
								}}
							>
								<Show
									when={status() === "active"}
									fallback={
										<text style={{ ...labelStyle, color: color.foreground }}>
											{props.label}
										</text>
									}
								>
									<Shimmer style={labelStyle}>{`${props.label}…`}</Shimmer>
								</Show>
								<Show when={props.description}>
									<text style={{ ...scale.body, color: color.mutedForeground }}>
										{props.description}
									</text>
								</Show>
								{props.children}
							</div>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</Show>
	);
}

// ─── ThinkingStepDetails (nested collapsible) ─────────────────────────────

export function ThinkingStepDetails(props: {
	summary: string;
	details?: string[];
	defaultOpen?: boolean;
	testId?: string;
	children?: JSX.Element;
}) {
	const [open, setOpen] = createSignal(props.defaultOpen ?? false);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				marginTop: 4,
				marginLeft: -12,
			}}
		>
			<TriggerRow
				open={open()}
				onToggle={() => setOpen(!open())}
				testId={props.testId}
				paddingX={12}
				paddingY={4}
				gap={6}
			>
				{props.summary}
			</TriggerRow>
			<Collapse open={open()}>
				<div
					style={{
						paddingLeft: 12,
						paddingRight: 12,
						paddingBottom: 12,
						paddingTop: 4,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 2,
							paddingTop: 2,
						}}
					>
						<For each={props.details}>
							{(item) => (
								<text
									style={{ ...scale.caption, color: color.mutedForeground }}
								>
									{item}
								</text>
							)}
						</For>
						{props.children}
					</div>
				</div>
			</Collapse>
		</div>
	);
}

// ─── Sources ──────────────────────────────────────────────────────────────

export function ThinkingStepSources(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				gap: 6,
				marginTop: 4,
			}}
		>
			{props.children}
		</div>
	);
}

export function ThinkingStepSource(props: {
	color?: BadgeColor;
	delay?: number;
	children: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ ...tween.moderate, delay: props.delay ?? 0 }}
		>
			<Badge variant="solid" size="compact" color={props.color ?? "gray"}>
				{props.children}
			</Badge>
		</motion.div>
	);
}

// ─── Image ────────────────────────────────────────────────────────────────

const IMAGE_WIDTH = 200;

export function ThinkingStepImage(props: {
	src: string;
	alt?: string;
	caption?: string;
	delay?: number;
	/** Width over height. The box is sized outright: see limitations/thinking-steps.md. */
	aspectRatio?: number;
}) {
	const height = () => IMAGE_WIDTH / (props.aspectRatio ?? 2);
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.2, delay: props.delay ?? 0, ease: "easeOut" }}
			style={{ marginTop: 6 }}
		>
			<div
				style={{ position: "relative", width: IMAGE_WIDTH, height: height() }}
			>
				<img
					src={props.src}
					alt={props.alt ?? ""}
					style={{
						width: IMAGE_WIDTH,
						height: height(),
						borderRadius: radius.container,
						pointerEvents: "none",
					}}
				/>
				{/* An inset hairline keeps the edge of a pale screenshot visible. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: IMAGE_WIDTH,
						height: height(),
						borderRadius: radius.container,
						outlineWidth: 1,
						outlineOffset: -1,
						outlineColor: color.border,
						pointerEvents: "none",
					}}
				/>
			</div>
			<Show when={props.caption}>
				<div style={{ marginTop: 4 }}>
					<text style={{ ...scale.caption, color: color.mutedForeground }}>
						{props.caption}
					</text>
				</div>
			</Show>
		</motion.div>
	);
}
