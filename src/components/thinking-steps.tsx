import { AnimatePresence, type MotionTransition, motion } from '@ghia/solid';
import {
	type CollapsibleRoot,
	createCollapsiblePanel,
	createCollapsibleRoot,
	createCollapsibleTrigger,
} from 'ghia-base-ui/collapsible';
import {
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { Icon } from '#/lib/icon';
import type { IconName } from '#/lib/icons';
import { createMeasuredHeight } from '#/lib/measured-height';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	focusRing,
	type as scale,
	shape,
	siteType,
	motion as tween,
	weight,
} from '#/lib/theme';
import { Badge, type BadgeColor } from './badge';
import { Shimmer } from './thinking-indicator';

const slowSpring = {
	type: 'spring',
	duration: 0.24,
	bounce: 0.12,
} satisfies MotionTransition;
/** The panel's own tweak of `spring.moderate`: pure height looks better without overshoot. */
const panelSpring = tween.moderate;

const glyphs = {
	dot: 'dot',
	search: 'search',
	globe: 'globe',
	brain: 'brain',
	image: 'image',
	check: 'check',
} as const satisfies Record<string, IconName>;

export type StepIcon = keyof typeof glyphs;
export type StepStatus = 'complete' | 'active' | 'pending';

// ─── Chevron ──────────────────────────────────────────────────────────────

function Chevron(props: {
	open: boolean;
	stroke: number;
	color: string;
	testId?: string;
}) {
	return (
		<motion.div
			testId={props.testId}
			style={{ display: 'flex', flexShrink: 0 }}
			animate={{ rotate: props.open ? 90 : 0 }}
			transition={tween.fast}
		>
			<Icon
				name="chevron-right"
				size={16}
				strokeWidth={props.stroke}
				easeStroke
				fade
				color={props.color}
			/>
		</motion.div>
	);
}

// ─── Trigger row ──────────────────────────────────────────────────────────

/**
 * Hover background, a label that goes semibold when open (a hidden semibold
 * copy reserves the width), and the chevron. Mirrors the accordion trigger.
 */
function TriggerRow(props: {
	collapsible: CollapsibleRoot;
	paddingX: number;
	paddingY: number;
	gap: number;
	testId?: string;
	children: string;
}) {
	const trigger = createCollapsibleTrigger(props.collapsible);
	const [hovered, setHovered] = createSignal(false);
	const open = props.collapsible.open;
	const highlighted = () => open() || hovered();
	return (
		<div
			style={{ position: 'relative', width: 'fit-content' }}
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
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							borderRadius: shape.bg,
							backgroundColor: color.hover,
						}}
					/>
				</Show>
			</AnimatePresence>
			<div
				{...trigger.props}
				testId={props.testId}
				style={{
					position: 'relative',
					zIndex: 10,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: props.gap,
					paddingLeft: props.paddingX,
					paddingRight: props.paddingX,
					paddingTop: props.paddingY,
					paddingBottom: props.paddingY,
					borderRadius: shape.item,
					cursor: 'pointer',
					userSelect: 'none',
					keyboardFocusDim: false,
					focusVisible: focusRing(0),
				}}
			>
				<StableLabel
					text={props.children}
					heavy={open()}
					color={highlighted() ? color.foreground : color.mutedForeground}
					fade
				/>
				<Chevron
					testId={props.testId && `${props.testId}-chevron`}
					open={open()}
					stroke={highlighted() ? 2 : 1.5}
					color={highlighted() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</div>
	);
}

// ─── Collapse ─────────────────────────────────────────────────────────────

/**
 * A box whose height springs between 0 and its content's. The content reports
 * its size through `onLayout` and the outer box tweens to that number; until
 * the first report an open panel is `auto` high, so one that mounts open never
 * paints collapsed and then grows.
 */
function Collapse(props: {
	collapsible: CollapsibleRoot;
	testId?: string;
	children: JSX.Element;
}) {
	const panel = createCollapsiblePanel(props.collapsible);
	const measured = createMeasuredHeight();
	const mountedOpen = props.collapsible.open();
	// A panel that mounts open takes its first height with no spring.
	const [needsSnap, setNeedsSnap] = createSignal(mountedOpen);
	createEffect(() => {
		if (!needsSnap() || measured.height() === undefined) return;
		const timer = setTimeout(() => setNeedsSnap(false), 100);
		onCleanup(() => clearTimeout(timer));
	});
	const target = () => {
		if (!props.collapsible.open()) return 0;
		return measured.height() ?? 'auto';
	};
	return (
		<motion.div
			id={panel.id}
			testId={props.testId}
			initial={mountedOpen ? false : { height: 0 }}
			animate={{ height: target() }}
			transition={needsSnap() ? tween.snap : panelSpring}
			style={{
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
			}}
		>
			<div
				inert={panel.inert()}
				onLayout={measured.onLayout}
				style={{ flexShrink: 0, ...siteType.body }}
			>
				{props.children}
			</div>
		</motion.div>
	);
}

// ─── ThinkingSteps (root) ─────────────────────────────────────────────────

const OpenContext = createContext<CollapsibleRoot>();

function useOpen() {
	const state = useContext(OpenContext);
	if (state === undefined) {
		throw new Error(
			'ThinkingStepsHeader and ThinkingStepsContent need a ThinkingSteps',
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
	const collapsible = createCollapsibleRoot({
		open: () => props.open,
		defaultOpen: props.defaultOpen ?? true,
		onOpenChange: (open) => props.onOpenChange?.(open),
	});
	return (
		<OpenContext.Provider value={collapsible}>
			<div
				testId={props.testId}
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: props.width ?? 320,
					maxWidth: '100%',
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
	const collapsible = useOpen();
	return (
		<TriggerRow
			collapsible={collapsible}
			testId={props.testId}
			paddingX={12}
			paddingY={8}
			gap={10}
		>
			{props.children ?? 'Thinking'}
		</TriggerRow>
	);
}

export function ThinkingStepsContent(props: {
	testId?: string;
	children: JSX.Element;
}) {
	const collapsible = useOpen();
	return (
		<Collapse collapsible={collapsible} testId={props.testId}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
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
	const status = () => props.status ?? 'complete';
	const labelStyle = { ...scale.body, fontVariationSettings: weight.semibold };
	return (
		<Show when={status() !== 'pending'}>
			{/* Outer: animates height so the space opens smoothly. */}
			<motion.div
				testId={props.testId}
				initial={{ height: 0 }}
				animate={{ height: measured.height() ?? 0 }}
				transition={slowSpring}
				style={{ overflow: 'hidden' }}
			>
				{/* Inner: fades the content in after the space starts opening. */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{
						duration: 0.24,
						delay: props.delay ?? 0.08,
						ease: 'easeOut',
					}}
				>
					<div onLayout={measured.onLayout}>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								gap: 10,
								paddingLeft: 8,
								paddingRight: 8,
								paddingTop: 6,
								paddingBottom: 6,
								borderRadius: shape.item,
							}}
						>
							{/* Icon column with a connector that runs to the bottom of the step. */}
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									alignItems: 'center',
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
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
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
											name={glyphs[props.icon ?? 'dot']}
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
									display: 'flex',
									flexDirection: 'column',
									flexGrow: 1,
									gap: 4,
									minWidth: 0,
								}}
							>
								<Show
									when={status() === 'active'}
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
	const collapsible = createCollapsibleRoot({
		defaultOpen: props.defaultOpen ?? false,
	});
	return (
		<div style={{ marginTop: 4, marginLeft: -12 }}>
			<TriggerRow
				collapsible={collapsible}
				testId={props.testId}
				paddingX={12}
				paddingY={4}
				gap={6}
			>
				{props.summary}
			</TriggerRow>
			<Collapse collapsible={collapsible}>
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
							display: 'flex',
							flexDirection: 'column',
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
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'wrap',
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
			testId="thinking-step-source"
			initial={{ opacity: 0, scale: 0.85, filter: 'blur(4px)' }}
			animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
			transition={{
				...tween.moderate,
				delay: props.delay ?? 0,
				filter: { duration: 0.12, delay: props.delay ?? 0 },
			}}
		>
			<Badge variant="solid" size="compact" color={props.color ?? 'gray'}>
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
	/** Width over height. The box is sized outright: see drift/thinking-steps.md. */
	aspectRatio?: number;
}) {
	const height = () => IMAGE_WIDTH / (props.aspectRatio ?? 2);
	return (
		<motion.div
			initial={{ opacity: 0, filter: 'blur(4px)' }}
			animate={{ opacity: 1, filter: 'blur(0px)' }}
			transition={{
				opacity: { duration: 0.2, delay: props.delay ?? 0, ease: 'easeOut' },
				filter: { duration: 0.15, delay: props.delay ?? 0 },
			}}
			style={{ marginTop: 6 }}
		>
			<div
				style={{ position: 'relative', width: IMAGE_WIDTH, height: height() }}
			>
				<img
					src={props.src}
					alt={props.alt ?? ''}
					style={{
						width: IMAGE_WIDTH,
						height: height(),
						borderRadius: shape.container,
					}}
				/>
				{/* An inset hairline keeps the edge of a pale screenshot visible. */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: IMAGE_WIDTH,
						height: height(),
						borderRadius: shape.container,
						outlineWidth: 1,
						outlineStyle: 'solid',
						outlineOffset: -1,
						outlineColor: color.border,
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
