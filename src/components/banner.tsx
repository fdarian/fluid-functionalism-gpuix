import {
	buttonProps,
	type HostElement,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createRenderEffect,
	createSignal,
	type JSX,
	Match,
	on,
	onCleanup,
	children as resolveChildren,
	Show,
	Switch,
	useContext,
} from "solid-js";
import { Icon } from "../lib/icon";
import { defineIcon, type IconRef } from "../lib/icons";
import {
	color,
	radius,
	type as scale,
	motion as tween,
	weight,
} from "../lib/theme";
import { Button } from "./button";

export type BannerStatus = "default" | "info" | "success" | "warning" | "error";
export type BannerContrast = "low" | "high";
export type BannerVariant = "inline" | "fixed";
export type BannerSize = "default" | "compact";

const sizes = {
	default: {
		pad: 16,
		iconBox: 20,
		icon: 20,
		iconGap: 12,
		text: scale.body,
		subtitle: { fontSize: 14, lineHeight: 20 },
		close: 15,
		actionsTop: 8,
	},
	compact: {
		pad: 12,
		iconBox: 18,
		icon: 16,
		iconGap: 10,
		text: scale.bodyCompact,
		subtitle: { fontSize: 13, lineHeight: 18 },
		close: 13,
		actionsTop: 6,
	},
} as const;

const infoIcon = defineIcon(
	'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
);

const tone = (status: BannerStatus) => {
	switch (status) {
		case "default":
			return color.foreground;
		case "error":
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
	if (contrast === "low") return color.hover;
	return withAlpha(tone(status), status === "default" ? 0.08 : 0.12);
};

/**
 * The coloured statuses are a filled shape with the mark cut out, so the
 * banner's fill shows through the mark. gpuix tints an SVG by its alpha only,
 * so the cut-out is an SVG mask instead of a page-coloured stroke.
 */
const glyphMarks = {
	success: '<path d="m8.5 12.25 2.5 2.5 4.5-5"/>',
	warning: '<path d="M12 9.5v3.5M12 17h.01"/>',
	error: '<path d="M12 7.5v5M12 16.5h.01"/>',
	info: '<path d="M12 16.5v-5M12 7.5h.01"/>',
} as const;

function glyphSource(status: Exclude<BannerStatus, "default">) {
	const mark = `<g stroke="#000" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none">${glyphMarks[status]}</g>`;
	const shape =
		status === "warning"
			? '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linejoin="round" mask="url(#cut)"/>'
			: '<circle cx="12" cy="12" r="10.5" fill="#000" mask="url(#cut)"/>';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs><mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/>${mark}</mask></defs>${shape}</svg>`;
}

interface BannerScope {
	compact: () => boolean;
	/** A description puts the actions under the text instead of trailing the title. */
	hasDescription: () => boolean;
	setHasDescription: (value: boolean) => void;
}

const BannerScopeContext = createContext<BannerScope>();

function useBannerScope() {
	const scope = useContext(BannerScopeContext);
	if (scope === undefined) throw new Error("Must be used inside Banner");
	return scope;
}

const MEASURE_ATTEMPTS = 12;
const MEASURE_RETRY_MS = 16;

/** Painted bounds lag the tree by a frame; the first read only turns tracking on. */
function measureHeight(
	getBounds: (id: number) => { height: number } | null | undefined,
	element: HostElement,
): Promise<number> {
	return new Promise((resolve, reject) => {
		let attempts = 0;
		const attempt = () => {
			const bounds = getBounds(element.id);
			if (bounds != null) {
				resolve(bounds.height);
				return;
			}
			attempts += 1;
			if (attempts >= MEASURE_ATTEMPTS) {
				reject(new Error("Banner: painted bounds unavailable after 12 frames"));
				return;
			}
			setTimeout(attempt, MEASURE_RETRY_MS);
		};
		attempt();
	});
}

/**
 * The row's height and the banner's opacity move on their own tracks. gpuix
 * animates a pixel `height` but has no `fr` track, so the open height is
 * measured. A fixed bar also rides its row with `top`, standing in for the
 * translate the DOM version uses.
 */
const appearRow = { type: "spring", duration: 0.32, bounce: 0 } as const;
const appearBanner = { ...tween.slow, delay: 0.08 } as const;
const dismissRow = { duration: 0.24, ease: "easeInOut" } as const;
const dismissFade = { duration: 0.16, ease: "easeOut" } as const;

/**
 * How long each animation runs. A timer, not `onMotionComplete`: that event is
 * only drained by `dispatchNativeEvents()`, which the headless screenshot
 * harness never calls, so a presence driven by it never unmounts there.
 */
const APPEAR_MS = 360;
const DISMISS_MS = 280;

type Phase = "rest" | "measuring" | "opening" | "closing" | "gone";

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
	const renderer = useGpuixRequired();
	const getBounds = (id: number) => {
		if (renderer.getElementBounds === undefined) {
			throw new Error("This renderer does not expose getElementBounds");
		}
		return renderer.getElementBounds(id);
	};
	const status = () => props.status ?? "default";
	const contrast = () => props.contrast ?? "low";
	const fixed = () => props.variant === "fixed";
	const metrics = () => sizes[props.size ?? "default"];

	const [openState, setOpenState] = createSignal(true);
	const open = () => props.open ?? openState();
	const [hasDescription, setHasDescription] = createSignal(false);
	const [phase, setPhase] = createSignal<Phase>(open() ? "rest" : "gone");
	const [rowHeight, setRowHeight] = createSignal(0);

	const scope: BannerScope = {
		compact: () => props.size === "compact",
		hasDescription,
		setHasDescription,
	};

	let restElement: HostElement | undefined;
	let measureElement: HostElement | undefined;
	let generation = 0;
	let settleTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(settleTimer));
	const settleAfter = (mine: number, next: Phase, ms: number) => {
		clearTimeout(settleTimer);
		settleTimer = setTimeout(() => {
			if (mine === generation) setPhase(next);
		}, ms);
	};

	// A banner that is open on first render arrives in place; only a change plays.
	createEffect(
		on(
			open,
			(isOpen) => {
				generation += 1;
				const mine = generation;
				if (!isOpen) {
					if (phase() === "gone") return;
					if (restElement === undefined) {
						throw new Error("Banner is not mounted");
					}
					void measureHeight(getBounds, restElement).then((height) => {
						if (mine !== generation) return;
						setRowHeight(height);
						setPhase("closing");
						settleAfter(mine, "gone", DISMISS_MS);
					});
					return;
				}
				if (phase() === "rest") return;
				setPhase("measuring");
				queueMicrotask(() => {
					if (measureElement === undefined) {
						throw new Error("Banner measure layer is not mounted");
					}
					void measureHeight(getBounds, measureElement).then((height) => {
						if (mine !== generation) return;
						setRowHeight(height);
						setPhase("opening");
						settleAfter(mine, "rest", APPEAR_MS);
					});
				});
			},
			{ defer: true },
		),
	);

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
		if (current === "default") {
			return (
				<Icon
					name={infoIcon}
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
					pointerEvents: "none",
				}}
			/>
		);
	};

	const body = () => (
		<BannerScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				role={
					status() === "error" || status() === "warning" ? "alert" : "status"
				}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "row",
					flexShrink: 0,
					alignItems: hasDescription() ? "flex-start" : "center",
					padding: metrics().pad,
					borderRadius: fixed() ? 0 : radius.container,
					// A fixed bar stays opaque over the page scrolling under it.
					backgroundColor: fixed() ? color.background : color.transparent,
				}}
			>
				{/* The fill is its own first child: gpuix has no background-image layering, and the radius clips only what is painted. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						borderRadius: fixed() ? 0 : radius.container,
						backgroundColor: fill(status(), contrast()),
						pointerEvents: "none",
					}}
				/>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						height: metrics().iconBox,
						width: metrics().icon,
						marginRight: metrics().iconGap,
					}}
				>
					{glyph()}
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: hasDescription() ? "column" : "row",
						alignItems: hasDescription() ? "stretch" : "center",
						flexGrow: 1,
						flexShrink: 1,
						flexBasis: 0,
						minWidth: 0,
					}}
				>
					{props.children}
				</div>
				<Show when={props.dismissible}>
					<DismissButton
						compact={props.size === "compact"}
						testId={props.testId === undefined ? undefined : `${props.testId}-dismiss`}
						onClick={dismiss}
					/>
				</Show>
			</div>
		</BannerScopeContext.Provider>
	);

	const rowStyle = {
		display: "flex",
		flexDirection: "column",
		width: "100%",
	} as const;

	return (
		<Switch>
			<Match when={phase() === "rest"}>
				<div
					ref={(element) => {
						restElement = element;
						// Turn bounds tracking on now so a dismiss can read the height.
						getBounds(element.id);
					}}
					style={rowStyle}
				>
					{body()}
				</div>
			</Match>
			<Match when={phase() === "measuring"}>
				<div style={{ ...rowStyle, height: 0, position: "relative" }}>
					<div
						ref={(element) => {
							measureElement = element;
						}}
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							opacity: 0,
							pointerEvents: "none",
						}}
					>
						{body()}
					</div>
				</div>
			</Match>
			<Match when={phase() === "opening"}>
				<motion.div
					initial={{ height: 0 }}
					animate={{ height: rowHeight() }}
					transition={appearRow}
					style={{ ...rowStyle, overflow: "hidden" }}
				>
					<motion.div
						initial={
							fixed() ? { opacity: 0, top: -rowHeight() } : { opacity: 0 }
						}
						animate={fixed() ? { opacity: 1, top: 0 } : { opacity: 1 }}
						transition={fixed() ? appearRow : appearBanner}
						style={{ ...rowStyle, position: "relative", flexShrink: 0 }}
					>
						{body()}
					</motion.div>
				</motion.div>
			</Match>
			<Match when={phase() === "closing"}>
				<motion.div
					initial={{ height: rowHeight() }}
					animate={{ height: 0 }}
					transition={dismissRow}
					style={{ ...rowStyle, overflow: "hidden" }}
				>
					<motion.div
						initial={fixed() ? { opacity: 1, top: 0 } : { opacity: 1 }}
						animate={
							fixed() ? { opacity: 0, top: -rowHeight() } : { opacity: 0 }
						}
						transition={fixed() ? dismissRow : dismissFade}
						style={{ ...rowStyle, position: "relative", flexShrink: 0 }}
					>
						{body()}
					</motion.div>
				</motion.div>
			</Match>
		</Switch>
	);
}

function DismissButton(props: {
	compact: boolean;
	testId?: string;
	onClick: () => void;
}) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			{...buttonProps({ onClick: props.onClick })}
			tabIndex={0}
			aria-label="Dismiss"
			testId={props.testId}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				width: 28,
				height: 28,
				// Pulled into the padding so the glyph, not the 28px box, sits on the title line.
				marginTop: props.compact ? -5 : -4,
				marginBottom: props.compact ? -5 : -4,
				marginRight: -6,
				marginLeft: props.compact ? 6 : 8,
				borderRadius: radius.item,
				cursor: "pointer",
				keyboardFocusDim: false,
				hover: { backgroundColor: color.hover },
				focusVisible: {
					outlineWidth: 1,
					outlineColor: color.focusRing,
					outlineOffset: 0,
				},
			}}
		>
			<Icon
				name="x"
				size={props.compact ? 13 : 15}
				strokeWidth={1.5}
				color={hovered() ? color.foreground : color.mutedForeground}
			/>
		</div>
	);
}

export function BannerTitle(props: { children: JSX.Element }) {
	const scope = useBannerScope();
	const text = () =>
		scope.compact() ? sizes.compact.subtitle : sizes.default.subtitle;
	return (
		<div
			style={{
				flexGrow: 1,
				flexShrink: 1,
				flexBasis: scope.hasDescription() ? undefined : 0,
				minWidth: 0,
			}}
		>
			<text
				style={{
					...text(),
					color: color.foreground,
					fontWeight: weight.semibold,
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
		<div style={{ marginTop: 2, minWidth: 0 }}>
			<text style={{ ...text(), color: color.foreground }}>
				{props.children}
			</text>
		</div>
	);
}

/**
 * Write primary first (that is the tab order). Trailing the title the
 * strongest action sits at the edge, so the row is reversed; under the text
 * it leads. The DOM version places each action by `order`; gpuix has neither
 * `order` nor `row-reverse`, so the resolved children are reordered here.
 */
export function BannerActions(props: { children: JSX.Element }) {
	const scope = useBannerScope();
	const compact = () => scope.compact();
	const actions = resolveChildren(() => props.children);
	const ordered = () => {
		const list = actions.toArray();
		return scope.hasDescription() ? list : [...list].reverse();
	};
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				alignItems: "center",
				flexShrink: 0,
				gap: 8,
				...(scope.hasDescription()
					? { marginTop: sizes[compact() ? "compact" : "default"].actionsTop }
					: {
							marginTop: compact() ? -5 : -4,
							marginBottom: compact() ? -5 : -4,
							marginLeft: compact() ? 10 : 12,
						}),
			}}
		>
			{ordered()}
		</div>
	);
}

export type BannerActionVariant = "primary" | "secondary" | "ghost";

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
			variant={props.variant ?? "secondary"}
			testId={props.testId}
			onClick={props.onClick}
		>
			{props.children}
		</Button>
	);
}
