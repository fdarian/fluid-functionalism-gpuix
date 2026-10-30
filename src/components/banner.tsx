import {
	animate,
	buttonProps,
	createMotionValue,
	createMotionValueEvent,
	createReducedMotion,
	type HostElement,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import {
	createContext,
	createEffect,
	createRenderEffect,
	createSignal,
	type JSX,
	on,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import {
	color,
	fade,
	focusRing,
	type as scale,
	shape,
	sizeChoice,
	motion as tween,
	weight,
} from '#/lib/theme';
import { Button } from './button';

export type BannerStatus = 'default' | 'info' | 'success' | 'warning' | 'error';
export type BannerContrast = 'low' | 'high';
export type BannerVariant = 'inline' | 'fixed';
export type BannerSize = 'default' | 'compact';

const sizes = {
	default: {
		pad: 16,
		iconBox: 20,
		icon: 20,
		iconGap: 12,
		text: scale.body,
		subtitle: { fontSize: 14, lineHeight: '20px' },
		close: 15,
		actionsTop: 8,
	},
	compact: {
		pad: 12,
		iconBox: 18,
		icon: 16,
		iconGap: 10,
		text: scale.bodyCompact,
		subtitle: { fontSize: 13, lineHeight: '18px' },
		close: 13,
		actionsTop: 6,
	},
} as const;

const tone = (status: BannerStatus) => {
	switch (status) {
		case 'default':
			return color.foreground;
		case 'error':
			return color.destructive;
		default:
			return color[status];
	}
};

/** `color-mix(in oklab, tone N%, transparent)` is plain alpha; the tone tokens are hex. */
function withAlpha(hex: string, alpha: number): string {
	const channel = (offset: number) =>
		Number.parseInt(hex.slice(1 + offset * 2, 3 + offset * 2), 16);
	return `rgba(${channel(0)},${channel(1)},${channel(2)},${alpha})`;
}

const fill = (status: BannerStatus, contrast: BannerContrast) => {
	if (contrast === 'low') return color.hover;
	return withAlpha(tone(status), status === 'default' ? 0.08 : 0.12);
};

/**
 * The coloured statuses are a filled shape with the mark cut out, so the
 * banner's fill shows through the mark. The cut-out is an SVG mask instead of
 * a page-coloured stroke, so it works on any banner background.
 */
const glyphMarks = {
	success: '<path d="m8.5 12.25 2.5 2.5 4.5-5"/>',
	warning: '<path d="M12 9.5v3.5M12 17h.01"/>',
	error: '<path d="M12 7.5v5M12 16.5h.01"/>',
	info: '<path d="M12 16.5v-5M12 7.5h.01"/>',
} as const;

function glyphSource(status: Exclude<BannerStatus, 'default'>) {
	const mark = `<g stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none">${glyphMarks[status]}</g>`;
	const shape =
		status === 'warning'
			? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" mask="url(#cut)"/>'
			: '<circle cx="12" cy="12" r="10.5" fill="currentColor" mask="url(#cut)"/>';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/>${mark}</mask></defs>${shape}</svg>`;
}

interface BannerScope {
	compact: () => boolean;
	/** A description puts the actions under the text instead of trailing the title. A flag because gpuix has no `:has(.selector)`: `BannerDescription` reports in. */
	hasDescription: () => boolean;
	setHasDescription: (value: boolean) => void;
}

const BannerScopeContext = createContext<BannerScope>();

function useBannerScope() {
	const scope = useContext(BannerScopeContext);
	if (scope === undefined) throw new Error('Must be used inside Banner');
	return scope;
}

/**
 * The row's height and the banner's opacity move on their own tracks. The row
 * animates between 0 and `auto`, so a reversal continues from where it is. A
 * fixed bar rides its row by sitting at the row's bottom edge while the row
 * clips it, standing in for the translate the DOM version uses.
 */
const appearRow = { type: 'spring', duration: 0.32, bounce: 0 } as const;
const appearBanner = { ...tween.slow, delay: 0.08 } as const;
const dismissRow = { duration: 0.24, ease: 'easeInOut' } as const;
const dismissFade = { duration: 0.16, ease: 'easeOut' } as const;
/** An inline banner grows from this scale as it appears, and shrinks toward `SHRINK_TO` while its row closes. */
const FROM_SCALE = 0.4;
const SHRINK_TO = 0.6;

export function Banner(props: {
	status?: BannerStatus;
	contrast?: BannerContrast;
	variant?: BannerVariant;
	icon?: IconRef;
	dismissible?: boolean;
	onDismiss?: () => void;
	/** Controls visibility. Omitted, the ✕ hides the banner. */
	open?: boolean;
	size?: BannerSize;
	testId?: string;
	children: JSX.Element;
}) {
	const status = () => props.status ?? 'default';
	const contrast = () => props.contrast ?? 'low';
	const fixed = () => props.variant === 'fixed';
	const reduced = createReducedMotion();
	// A fixed bar rides its row both ways; reduced, it fades in place like the inline one.
	const slides = () => fixed() && !reduced();
	const scaled = () => !fixed() && !reduced();
	const size = () => props.size ?? sizeChoice();
	const metrics = () => sizes[size()];

	const [openState, setOpenState] = createSignal(true);
	const open = () => props.open ?? openState();
	const [hasDescription, setHasDescription] = createSignal(false);

	// Mounted through the dismiss, so the ✕ and the actions are the same elements from the first paint to the end of the exit and a reopen mid-exit keeps their focus.
	const [mounted, setMounted] = createSignal(open());
	// A banner that is open on first render arrives in place; only a change plays.
	let arrivesInPlace = open();
	let rowElement: HostElement | undefined;
	let barElement: HostElement | undefined;
	// The inline banner's scale. On dismiss it follows `rowProgress`, a copy of the row's height tween, the way the source ties the scale to its row value: it tracks the row down to SHRINK_TO and stays there.
	const barScale = createMotionValue(1);
	const rowProgress = createMotionValue(1);
	let dismissing = false;
	let scaleFrom = 1;
	createMotionValueEvent(rowProgress, 'change', (progress: number) => {
		if (!dismissing) return;
		barScale.set(Math.min(scaleFrom, Math.max(progress, SHRINK_TO)));
	});
	createEffect(
		on(
			open,
			(isOpen) => {
				if (isOpen) {
					const rowStillMounted = mounted();
					setMounted(true);
					if (scaled() && rowStillMounted) {
						dismissing = false;
						rowProgress.stop();
						animate(barScale, 1, appearBanner);
					}
					return;
				}
				if (
					rowElement === undefined ||
					barElement === undefined ||
					!rowElement.mounted ||
					!barElement.mounted ||
					rowElement.getBoundingClientRect().height === 0
				) {
					// Closed before the row had any height: no exit to play, and none would report completing.
					setMounted(false);
					return;
				}
				if (scaled()) {
					scaleFrom = barScale.get();
					barScale.stop();
					const barHeight =
						barElement.getBoundingClientRect().height / scaleFrom;
					rowProgress.jump(
						Math.min(1, rowElement.getBoundingClientRect().height / barHeight),
					);
					dismissing = true;
					animate(rowProgress, 0, dismissRow);
				}
			},
			{ defer: true },
		),
	);

	const scope: BannerScope = {
		compact: () => size() === 'compact',
		hasDescription,
		setHasDescription,
	};

	const dismiss = () => {
		props.onDismiss?.();
		if (props.open === undefined) setOpenState(false);
	};

	const glyph = () => {
		if (props.icon !== undefined) {
			return (
				<Icon
					name={props.icon}
					size={metrics().icon}
					strokeWidth={1.5}
					color={tone(status())}
				/>
			);
		}
		const current = status();
		if (current === 'default') {
			return (
				<Icon
					name="info"
					size={metrics().icon}
					strokeWidth={1.5}
					color={tone(current)}
				/>
			);
		}
		return (
			<svg
				source={glyphSource(current)}
				style={{
					width: metrics().icon,
					height: metrics().icon,
					flexShrink: 0,
					color: tone(current),
				}}
			/>
		);
	};

	const body = () => (
		<BannerScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				role={
					status() === 'error' || status() === 'warning' ? 'alert' : 'status'
				}
				style={{
					position: 'relative',
					display: 'grid',
					gridTemplateColumns: 'auto minmax(0, 1fr) auto auto',
					containerType: 'inline-size',
					containerName: 'banner',
					flexShrink: 0,
					// With a description the icon and ✕ hold to the title line instead of centring on the whole block.
					alignItems: hasDescription() ? 'flex-start' : 'center',
					padding: metrics().pad,
					borderRadius: fixed() ? 0 : shape.container,
					// A fixed bar stays opaque over the page scrolling under it.
					backgroundColor: fixed() ? color.background : color.transparent,
				}}
			>
				{/* The fill is its own first child: gpuix has no background-image layering, and the radius clips only what is painted. */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						borderRadius: fixed() ? 0 : shape.container,
						backgroundColor: fill(status(), contrast()),
					}}
				/>
				<div
					style={{
						gridColumn: 1,
						gridRow: 1,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						height: metrics().iconBox,
						width: metrics().icon,
						marginRight: metrics().iconGap,
					}}
				>
					{glyph()}
				</div>
				{props.children}
				<Show when={props.dismissible}>
					<DismissButton
						compact={size() === 'compact'}
						testId={
							props.testId === undefined ? undefined : `${props.testId}-dismiss`
						}
						onClick={dismiss}
					/>
				</Show>
			</div>
		</BannerScopeContext.Provider>
	);

	const rowStyle = {
		display: 'flex',
		flexDirection: 'column',
		width: '100%',
	} as const;

	const row = () => {
		const inPlace = arrivesInPlace;
		arrivesInPlace = false;
		if (scaled()) {
			dismissing = false;
			if (inPlace) {
				barScale.jump(1);
			} else {
				barScale.jump(FROM_SCALE);
				animate(barScale, 1, appearBanner);
			}
		}
		return (
			<motion.div
				ref={(element: HostElement) => {
					rowElement = element;
				}}
				initial={inPlace ? false : { height: 0 }}
				// Reduced, the row snaps open and stays open while the bar fades; the bar's completion unmounts it.
				animate={{ height: open() || reduced() ? 'auto' : 0 }}
				transition={reduced() ? tween.snap : open() ? appearRow : dismissRow}
				onMotionComplete={() => {
					if (!open() && !reduced()) setMounted(false);
				}}
				style={{
					...rowStyle,
					overflow: 'hidden',
					...(fixed()
						? { position: 'sticky' as const, top: 0, zIndex: 40 }
						: {}),
				}}
			>
				<motion.div
					ref={(element: HostElement) => {
						barElement = element;
					}}
					initial={
						inPlace
							? false
							: slides()
								? { opacity: 0, y: '-100%' }
								: { opacity: 0 }
					}
					animate={
						slides()
							? { opacity: open() ? 1 : 0, y: open() ? 0 : '-100%' }
							: { opacity: open() ? 1 : 0 }
					}
					transition={
						open()
							? slides()
								? appearRow
								: reduced()
									? tween.fast
									: appearBanner
							: slides()
								? dismissRow
								: reduced()
									? tween.fastExit
									: dismissFade
					}
					onMotionComplete={() => {
						if (reduced() && !open()) setMounted(false);
					}}
					style={{
						...rowStyle,
						position: 'relative',
						flexShrink: 0,
						...(scaled() ? { scale: barScale, transformOrigin: 'top' } : {}),
					}}
				>
					{body()}
				</motion.div>
			</motion.div>
		);
	};

	return <Show when={mounted()}>{row()}</Show>;
}

/** `transition-colors duration-80` without `outline-color`: the source's focus ring is a box-shadow ring, which does not ease. */
const DISMISS_FADE = fade(['color', 'background-color'], 80);

function DismissButton(props: {
	compact: boolean;
	testId?: string;
	onClick: () => void;
}) {
	const renderer = useGpuixRequired();
	return (
		<div
			{...buttonProps({ onClick: props.onClick }, renderer)}
			tabIndex={0}
			aria-label="Dismiss"
			testId={props.testId}
			style={{
				// Above the fill layer, which paints over its in-flow siblings.
				position: 'relative',
				gridColumn: 4,
				gridRow: 1,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				width: 28,
				height: 28,
				// Pulled into the padding so the glyph, not the 28px box, sits on the title line.
				marginTop: props.compact ? -5 : -4,
				marginBottom: props.compact ? -5 : -4,
				marginRight: -6,
				marginLeft: props.compact ? 6 : 8,
				borderRadius: shape.button,
				cursor: 'pointer',
				keyboardFocusDim: false,
				color: color.mutedForeground,
				...DISMISS_FADE,
				hover: { backgroundColor: color.hover, color: color.foreground },
				focusVisible: focusRing(0),
			}}
		>
			<Icon
				name="x"
				size={props.compact ? 13 : 15}
				strokeWidth={1.5}
				color="currentColor"
			/>
		</div>
	);
}

export function BannerTitle(props: { testId?: string; children: JSX.Element }) {
	const scope = useBannerScope();
	const text = () =>
		scope.compact() ? sizes.compact.subtitle : sizes.default.subtitle;
	return (
		<div
			testId={props.testId}
			style={{ gridColumn: 2, gridRow: 1, minWidth: 0 }}
		>
			<text
				style={{
					...text(),
					color: color.foreground,
					fontVariationSettings: weight.semibold,
					textWrap: 'pretty',
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

export function BannerDescription(props: { children: JSX.Element }) {
	const scope = useBannerScope();
	createRenderEffect(() => {
		scope.setHasDescription(true);
		onCleanup(() => scope.setHasDescription(false));
	});
	const text = () =>
		scope.compact() ? sizes.compact.subtitle : sizes.default.subtitle;
	return (
		<div style={{ gridColumn: 2, gridRow: 2, marginTop: 2, minWidth: 0 }}>
			<text style={{ ...text(), color: color.foreground, textWrap: 'pretty' }}>
				{props.children}
			</text>
		</div>
	);
}

/** `@max-sm/banner`: Tailwind's `sm` container size is 24rem, and `@max-` is a strict upper bound. */
const NARROW = 'banner (width < 24rem)';

/**
 * Write primary first, secondary, then ghost. Under the text (a description, or
 * a banner narrower than 24rem) that is the order on screen; trailing the title
 * the row is reversed so the strongest action sits at the edge. The Tab order
 * stays the written one in both, because `order` would move it with the
 * painted order in gpuix (the DOM keeps it).
 */
export function BannerActions(props: {
	testId?: string;
	children: JSX.Element;
}) {
	const scope = useBannerScope();
	const compact = () => scope.compact();
	const underText = () => ({
		flexDirection: 'row' as const,
		gridColumn: 2,
		gridRow: 3,
		marginTop: sizes[compact() ? 'compact' : 'default'].actionsTop,
		marginBottom: 0,
		marginLeft: 0,
	});
	return (
		<div
			testId={props.testId}
			style={{
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: 8,
				...(scope.hasDescription()
					? underText()
					: {
							flexDirection: 'row-reverse' as const,
							gridColumn: 3,
							gridRow: 1,
							marginTop: compact() ? -5 : -4,
							marginBottom: compact() ? -5 : -4,
							marginLeft: compact() ? 10 : 12,
						}),
				'@container': { [NARROW]: underText() },
			}}
		>
			{props.children}
		</div>
	);
}

export type BannerActionVariant = 'primary' | 'secondary' | 'ghost';

/** The library Button at its compact 28px size, so it presses like every other button. */
export function BannerAction(props: {
	variant?: BannerActionVariant;
	testId?: string;
	onClick?: () => void;
	children: JSX.Element;
}) {
	return (
		<Button
			size="compact"
			variant={props.variant ?? 'secondary'}
			testId={props.testId}
			onClick={props.onClick}
		>
			{props.children}
		</Button>
	);
}
