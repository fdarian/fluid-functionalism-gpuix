import {
	AnimatePresence,
	buttonProps,
	motion,
	useGpuixRequired,
} from '@ghia/solid';
import {
	type Accessor,
	batch,
	createMemo,
	createSignal,
	type JSX,
	onCleanup,
	Show,
} from 'solid-js';
import { CheckMark, Icon } from '#/lib/icon';
import {
	color,
	colorFade,
	fade,
	focusRing,
	shape,
	sizeChoice,
	motion as tween,
	weight,
} from '#/lib/theme';
import type { InputSize } from './input-group';
import { Tooltip } from './tooltip';

/** How long the copied / failed result stays in place. */
const RESULT_MS = 2000;
const TOOLTIP_DELAY_MS = 500;
/** `[#6B97FF]/20` behind the value while the row is hovered. */
const MARK = 'rgba(107,151,255,0.2)';
const MARK_REST = 'rgba(107,151,255,0)';
const MONO = 'Menlo';
/** The source draws its own check and cross, in a 20 x 16 box shown at 14px (scale 0.7). */
const RESULT_BOX = '2 4 20 16';
const CHECK_PATH = 'M6 12L10 16L18 8';
const CROSS_PATH = 'M9 9L15 15M15 9L9 15';

type Status = 'idle' | 'copied' | 'error';
type Result = { status: Status; count: number };
type TooltipMode = 'idle' | 'copied' | 'suppressed';

/** The row is its padded line: `py-2` around 20 (36), `py-1` around 18 (26, not the 28 the source's comment claims). */
const steps = {
	default: { height: 8 + 20 + 8, text: 13, line: 20, icon: 14 },
	compact: { height: 4 + 18 + 4, text: 12, line: 18, icon: 14 },
} as const;

/** A result grows in from 0.6 and the copy icon from 0.8; whatever leaves shrinks to 0.8. */
const SCALE_IN: Record<Status, number> = { idle: 0.8, copied: 0.6, error: 0.6 };
const SCALE_OUT = 0.8;

/**
 * Shows one glyph (and label) per result. A new `result` shrinks the old one out before the new one grows in.
 * `children` gets the status its glyph was made for, so a leaving glyph keeps its own look.
 */
function Swap(props: {
	result: Accessor<Result>;
	children: (status: Status) => JSX.Element;
}) {
	return (
		<AnimatePresence mode="wait" initial={false}>
			<Show when={props.result()} keyed>
				{(result: Result) => (
					<motion.div
						initial={{ opacity: 0, scale: SCALE_IN[result.status] }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: SCALE_OUT }}
						transition={tween.fast}
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 6,
						}}
					>
						{props.children(result.status)}
					</motion.div>
				)}
			</Show>
		</AnimatePresence>
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
	variant?: 'icon' | 'button';
	/** Where the copy action sits relative to the value. */
	align?: 'right' | 'left';
	size?: InputSize;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const variant = () => props.variant ?? 'icon';
	const align = () => props.align ?? 'right';
	const step = () => steps[props.size ?? sizeChoice()];
	const [status, setStatus] = createSignal<Status>('idle');
	/** Keys the result glyph: copying again while "Copied" shows replays it. */
	const [copyCount, setCopyCount] = createSignal(0);
	const [tooltipMode, setTooltipMode] = createSignal<TooltipMode>('idle');
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
		batch(() => {
			setStatus(ok ? 'copied' : 'error');
			setCopyCount(copyCount() + 1);
		});
		// The tooltip says "Copied" only if it was already showing at the press.
		setTooltipMode(tooltipOpenAtPress ? 'copied' : 'suppressed');
		if (ok) props.onCopy?.();
		clearTimeout(resultTimer);
		resultTimer = setTimeout(() => {
			setStatus('idle');
			setTooltipMode('suppressed');
		}, RESULT_MS);
	};

	const onMouseEnter = () => {
		setHovered(true);
		setTooltipMode((mode) => (mode === 'suppressed' ? 'idle' : mode));
	};
	const onMouseLeave = () => {
		setHovered(false);
		setTooltipMode((mode) => (mode === 'copied' ? 'suppressed' : mode));
	};

	const forceOpen = () => {
		switch (tooltipMode()) {
			case 'copied':
				return true;
			case 'suppressed':
				return false;
			case 'idle':
				return undefined;
		}
	};
	const tooltipContent = () => {
		if (tooltipMode() === 'idle') return 'Copy to clipboard';
		return status() === 'error' ? 'Copy failed' : 'Copied';
	};

	const result = createMemo(() => ({
		status: status(),
		count: copyCount(),
	}));
	const glyphColor = (shown: Status) =>
		shown === 'error'
			? color.destructive
			: hovered()
				? color.foreground
				: color.mutedForeground;
	const label = (shown: Status) => {
		switch (shown) {
			case 'error':
				return 'Failed';
			case 'copied':
				return 'Copied';
			case 'idle':
				return 'Copy';
		}
	};

	/** The source fixes the button variant's check and cross at 2; only the copy icon follows the hover. */
	const resultStroke = () => (variant() === 'button' || hovered() ? 2 : 1.5);

	const icon = (shown: Status) =>
		shown === 'idle' ? (
			<Icon
				name="copy"
				size={step().icon}
				strokeWidth={hovered() ? 2 : 1.5}
				easeStroke
				fade
				color={glyphColor(shown)}
			/>
		) : (
			<CheckMark
				checked
				drawOnMount
				fade
				viewBox={RESULT_BOX}
				path={shown === 'error' ? CROSS_PATH : CHECK_PATH}
				size={step().icon}
				strokeWidth={resultStroke()}
				color={glyphColor(shown)}
			/>
		);

	const action = () => (
		<div
			style={{
				flexShrink: 0,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				paddingLeft: 6,
				paddingRight: 6,
				height: step().height,
			}}
		>
			<Show
				when={variant() === 'button'}
				fallback={<Swap result={result}>{icon}</Swap>}
			>
				<Swap result={result}>
					{(shown) => (
						<>
							{icon(shown)}
							{/* A hidden "Copied" in flow reserves the widest label, so the swap never resizes the row. */}
							<div style={{ position: 'relative' }}>
								<text
									style={{
										fontSize: step().text,
										lineHeight: `${step().line}px`,
										color: color.transparent,
									}}
								>
									Copied
								</text>
								<div style={{ position: 'absolute', top: 0, left: 0 }}>
									<text
										style={{
											fontSize: step().text,
											lineHeight: `${step().line}px`,
											fontVariationSettings: weight.normal,
											color: glyphColor(shown),
											...colorFade,
										}}
									>
										{label(shown)}
									</text>
								</div>
							</div>
						</>
					)}
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
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				paddingLeft: align() === 'left' ? 4 : 0,
			}}
		>
			<text
				style={{
					minWidth: 0,
					fontFamily: MONO,
					fontSize: step().text,
					lineHeight: `${step().line}px`,
					fontVariationSettings: weight.normal,
					color: color.foreground,
					whiteSpace: 'nowrap',
					textOverflow: 'ellipsis',
					overflow: 'hidden',
					userSelect: 'none',
				}}
			>
				<span
					style={{
						backgroundColor: hovered() ? MARK : MARK_REST,
						...colorFade,
					}}
				>
					{props.value}
				</span>
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
				status() === 'copied'
					? 'Copied'
					: status() === 'error'
						? 'Copy failed'
						: 'Copy to clipboard'
			}
			testId={props.testId}
			onMouseDown={() => {
				tooltipOpenAtPress = tooltipOpen;
			}}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				width: '100%',
				borderRadius: shape.input,
				cursor: 'pointer',
				userSelect: 'none',
				keyboardFocusDim: false,
				// The source's `transition-all` also eases its box-shadow ring in: the port's ring is an outline that starts transparent.
				outlineWidth: 1,
				outlineStyle: 'solid',
				outlineColor: color.transparent,
				outlineOffset: 0,
				...fade(['outline-color'], 80),
				focusVisible: focusRing(0),
			}}
		>
			{align() === 'left' ? (
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
				display: 'flex',
				flexDirection: 'column',
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? 'none' : undefined,
			}}
		>
			<Show when={props.label}>
				{(text: Accessor<string>) => (
					<div
						style={{
							paddingLeft: align() === 'left' ? 4 : 0,
							paddingBottom: 2,
						}}
					>
						<text
							style={{
								fontSize: step().text,
								lineHeight: `${step().line}px`,
								fontVariationSettings: weight.normal,
								color: color.mutedForeground,
							}}
						>
							{text()}
						</text>
					</div>
				)}
			</Show>
			<Show when={variant() === 'icon'} fallback={row()}>
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
