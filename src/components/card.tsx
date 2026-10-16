import {
	buttonProps,
	type HostElement,
	type HostPointerEvent,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	createRenderEffect,
	createSignal,
	type JSX,
	onCleanup,
	children as resolveChildren,
	Show,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import { defineIcon, type IconRef } from "../lib/icons";
import { color, radius, type as scale, scheme, weight, withAlpha, focusRing } from "../lib/theme";

export type CardOrientation = "card" | "inline";
export type CardBorder = "none" | "outlined";
export type CardSize = "default" | "compact";

const arrowUpRight = defineIcon('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>');

/** The title role of the type scale. */
const subtitle = {
	default: { fontSize: 14, lineHeight: 20 },
	compact: { fontSize: 13, lineHeight: 18 },
} as const;

/** A fixed hairline over an image: `outline-black/10`, `dark:outline-white/10`. */
const imageOutline = () => withAlpha(color.overlay, 0.1);

/** `bg-card/70`: the dismiss chip over media. gpuix has no backdrop blur, so the alpha carries it alone. */
const cardChip = () => withAlpha(color.card, 0.7);

/** `hover:bg-accent/80` over the surface behind it. */
const accentHover = () => withAlpha(color.accent, 0.8);

/** `hover:bg-foreground/90` and `active:bg-foreground/80`. */
const inkHover = () => withAlpha(color.foreground, 0.9);
const inkActive = () => withAlpha(color.foreground, 0.8);

// ─── Group scope ─────────────────────────────────────────────────────────────

interface CardEntry {
	selected: () => boolean;
	onClick?: () => void;
}

interface GroupScope {
	registerCard: (
		entry: CardEntry,
		element: () => HostElement | undefined,
	) => number;
	orientation: () => CardOrientation;
	columns: () => number;
	count: () => number;
	separated: () => boolean;
	outlined: () => boolean;
	activeIndex: () => number | null;
	/** The first selected card: its neighbours drop the hairline that would cut across the fill. */
	selectedIndex: () => number;
}

const GroupContext = createContext<GroupScope>();

interface CardScope {
	emphasized: () => boolean;
	orientation: () => CardOrientation;
	compact: () => boolean;
	hasImage: () => boolean;
	/** An inline card with a full CardImage centres its text in a column beside it. */
	inlineImage: () => boolean;
	setHasImage: (value: boolean) => void;
	/**
	 * The radius a tile clips its media to, or 0 when the card is not a tile;
	 * the image rounds its own outer corners to match.
	 */
	tileCorner: () => number;
}

const CardContext = createContext<CardScope>({
	emphasized: () => false,
	orientation: (): CardOrientation => "card",
	compact: () => false,
	hasImage: () => false,
	inlineImage: () => false,
	setHasImage: () => {},
	tileCorner: () => 0,
});

/** Lets a Card find its CardImage among its resolved children. */
const imageNodes = new WeakSet<object>();

function stopActivationKey(event: KeyEvent) {
	if (event.key === "Enter" || event.key === " ") event.stopPropagation();
}

/**
 * The source stacks the footer and the actions above the card's stretched
 * overlay, so nothing in them reaches the card. Here the card root is the
 * button and they are its descendants: stopping the click keeps a footer
 * press off the card, and stopping Enter / Space keeps the card's own
 * `buttonProps` from clicking the focused control a second time.
 */
const aboveCard = {
	onClick: (event: HostPointerEvent) => event.stopPropagation(),
	onKeyDown: stopActivationKey,
	onKeyUp: stopActivationKey,
};

/** Gap click: a press in the whitespace routes to the highlighted card when it lands this close. */
const GAP_CLICK_DISTANCE = 16;

/**
 * Lays its cards out on a grid and owns the magnetic hover highlight that
 * previews where a click will land: the shared fluid hover, on the 2-D `xy`
 * axis when there is more than one column.
 */
export function CardGroup(props: {
	orientation?: CardOrientation;
	columns?: number;
	border?: CardBorder;
	separated?: boolean;
	fluidHover?: boolean;
	testId?: string;
	children: JSX.Element;
}) {
	const columns = () => props.columns ?? 1;
	const hover = createFluidHover({
		// A grid resolves the pointer in two dimensions; one column is a plain list.
		get axis() {
			return columns() > 1 ? "xy" : "y";
		},
	});
	const entries = new Map<number, CardEntry>();
	const [count, setCount] = createSignal(0);
	let nextIndex = 0;
	let container: HostElement | undefined;

	const fluid = () => props.fluidHover ?? true;
	const separated = () => props.separated ?? false;
	const outlined = () => (props.border ?? "none") === "outlined";

	const scope: GroupScope = {
		registerCard(entry, element) {
			const index = nextIndex++;
			entries.set(index, entry);
			setCount(count() + 1);
			// Only a card that can be clicked joins the highlight: a highlight on an
			// informational card would promise a click that has nowhere to land.
			createEffect(() => {
				const target = element();
				if (target === undefined || entry.onClick === undefined) return;
				hover.registerItem(index, target);
			});
			onCleanup(() => {
				entries.delete(index);
				setCount(count() - 1);
			});
			return index;
		},
		orientation: () => props.orientation ?? "card",
		columns,
		count,
		separated,
		outlined,
		activeIndex: hover.activeIndex,
		selectedIndex: () => {
			count();
			for (const [index, entry] of entries) {
				if (entry.selected()) return index;
			}
			return -1;
		},
	};

	const rectOfActive = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured() || !fluid()) return null;
		return hover.rects()[index] ?? null;
	};

	const onGapClick = (event: HostPointerEvent) => {
		// A click on a card bubbles up to here; only one on the group's own box is a gap.
		if (container === undefined || event.target !== container.id) return;
		const index = hover.activeIndex();
		const rect = index === null ? undefined : hover.rects()[index];
		if (index === null || rect === undefined) return;
		const box = container.getBoundingClientRect();
		if (event.x === undefined || event.y === undefined) {
			throw new Error("click without coordinates");
		}
		const left = box.x + rect.left;
		const top = box.y + rect.top;
		const dx = Math.max(left - event.x, 0, event.x - (left + rect.width));
		const dy = Math.max(top - event.y, 0, event.y - (top + rect.height));
		if (Math.hypot(dx, dy) > GAP_CLICK_DISTANCE) return;
		entries.get(index)?.onClick?.();
	};

	return (
		<GroupContext.Provider value={scope}>
			<div
				testId={props.testId}
				{...hover.containerProps}
				ref={(element) => {
					container = element;
					hover.containerProps.ref(element);
				}}
				onClick={fluid() ? onGapClick : undefined}
				style={{
					position: "relative",
					display: "grid",
					gridTemplateColumns: columns(),
					gap: separated() ? 8 : 0,
					// A shared frame clips the highlight and dividers to its rounded corners.
					...(outlined() && !separated()
						? {
								borderWidth: 1,
								borderColor: color.borderFaint,
								overflow: "hidden",
								borderRadius: radius.container,
							}
						: {}),
				}}
			>
				{/* First child: no zIndex in gpuix, so the cards paint over the highlight by document order. It sits in its own absolute layer because the empty text node its `For` leaves behind would otherwise take a grid cell. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
					}}
				>
					<FluidHighlight
						rect={rectOfActive}
						session={hover.session}
						radius={radius.container}
						background={color.hover}
					/>
				</div>
				{props.children}
			</div>
		</GroupContext.Provider>
	);
}

// ─── Card ────────────────────────────────────────────────────────────────────

export function Card(props: {
	onClick?: () => void;
	selected?: boolean;
	disabled?: boolean;
	dismissible?: boolean;
	/** Keep the ✕ hidden until the card is hovered or holds focus. */
	dismissOnHover?: boolean;
	onDismiss?: () => void;
	/** A hairline frame for a standalone card (the original takes a border class). */
	outlined?: boolean;
	size?: CardSize;
	label?: string;
	testId?: string;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	const group = useContext(GroupContext);
	const [hasImage, setHasImage] = createSignal(false);
	const [hovered, setHovered] = createSignal(false);
	const [dismissFocused, setDismissFocused] = createSignal(false);
	const [rootElement, setRootElement] = createSignal<HostElement>();

	const compact = () => props.size === "compact";
	const orientation = () => group?.orientation() ?? "card";
	const isInline = () => orientation() === "inline";
	const clickable = () => props.onClick !== undefined;
	const selected = () => props.selected ?? false;
	const inlineImage = () => isInline() && hasImage();

	const index = group?.registerCard(
		{ selected, onClick: props.onClick },
		rootElement,
	);

	const columns = () => group?.columns() ?? 1;
	const activeIndex = () => group?.activeIndex() ?? null;
	const selectedIndex = () => group?.selectedIndex() ?? -1;
	const divided = () => group !== undefined && !group.separated();

	const touches = (neighbour: number) => (other: number) =>
		index !== undefined && (other === index || other === index + neighbour);
	const hasBelow = () =>
		index !== undefined &&
		group !== undefined &&
		index + columns() < group.count();
	const hasRight = () =>
		index !== undefined &&
		group !== undefined &&
		index % columns() < columns() - 1 &&
		index + 1 < group.count();
	// Dividers drop next to the lit or selected card so the fill reads clean.
	const showBottom = () => {
		const below = touches(columns());
		return (
			divided() &&
			hasBelow() &&
			!(below(activeIndex() ?? -1) || below(selectedIndex()))
		);
	};
	const showRight = () => {
		const right = touches(1);
		return (
			divided() &&
			hasRight() &&
			!(right(activeIndex() ?? -1) || right(selectedIndex()))
		);
	};

	/** A standalone card is its own tile; in a group only a framed separated tile is. */
	const tile = () =>
		group === undefined || (group.separated() && group.outlined());
	const framed = () =>
		group !== undefined && group.separated() && group.outlined();

	const scope: CardScope = {
		emphasized: selected,
		orientation,
		compact,
		hasImage,
		inlineImage,
		setHasImage,
		tileCorner: () =>
			tile()
				? radius.container -
					(framed() || (group === undefined && props.outlined) ? 1 : 0)
				: 0,
	};

	return (
		<CardContext.Provider value={scope}>
			<div
				testId={props.testId}
				ref={setRootElement}
				{...(clickable() && !props.disabled
					? buttonProps({ onClick: props.onClick, tabIndex: 0 }, renderer)
					: {})}
				aria-label={clickable() && !props.disabled ? props.label : undefined}
				aria-pressed={
					clickable() && !props.disabled && selected() ? true : undefined
				}
				aria-disabled={props.disabled ? true : undefined}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					position: "relative",
					display: "flex",
					minWidth: 0,
					minHeight: 60,
					...(inlineImage()
						? {
								flexDirection: "row",
								alignItems: "center",
								gap: compact() ? 10 : 12,
							}
						: isInline()
							? {
									flexDirection: "row",
									alignItems: "center",
									gap: compact() ? 10 : 12,
									paddingLeft: compact() ? 12 : 16,
								}
							: {
									flexDirection: "column",
									paddingBottom: compact() ? 12 : 16,
								}),
					...(tile()
						? { borderRadius: radius.container, overflow: "hidden" }
						: {}),
					...(framed() || (group === undefined && props.outlined)
						? { borderWidth: 1, borderColor: color.borderFaint }
						: {}),
					// A card that is its own tile has no group highlight, so it lights itself.
					...(group === undefined && clickable() && !props.disabled
						? { hover: { backgroundColor: color.hover } }
						: {}),
					...(clickable() && !props.disabled ? { cursor: "pointer" } : {}),
					keyboardFocusDim: false,
					focusVisible: focusRing(0),
					...(props.disabled ? { opacity: 0.5, pointerEvents: "none" } : {}),
				}}
			>
				{/* Everything decorative lives in one absolute layer: a Show that is not the last child leaves an empty text node behind, and gpuix lays it out as a flex item that eats one `gap`. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "none",
					}}
				>
				<Show when={selected()}>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							borderRadius: radius.container,
							backgroundColor: color.active,
						}}
					/>
				</Show>
				{/* Where both hairlines meet, the vertical one stops 1px short so the horizontal owns the crossing pixel. */}
				<Show when={showBottom()}>
					<div
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: 0,
							height: 1,
							backgroundColor: color.borderFaint,
						}}
					/>
				</Show>
				<Show when={showRight()}>
					<div
						style={{
							position: "absolute",
							top: 0,
							right: 0,
							bottom: showBottom() ? 1 : 0,
							width: 1,
							backgroundColor: color.borderFaint,
						}}
					/>
				</Show>
				</div>
				<CardFrame>{props.children}</CardFrame>
				{/* After the content so the chip paints over media. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "none",
					}}
				>
				<Show when={props.dismissible}>
					<DismissChip
						compact={compact()}
						overMedia={hasImage()}
						visible={
							!(props.dismissOnHover ?? true) || hovered() || dismissFocused()
						}
						onFocusChange={setDismissFocused}
						onDismiss={props.onDismiss}
					/>
				</Show>
				</div>
			</div>
		</CardContext.Provider>
	);
}

/**
 * Resolves the card's parts inside its context, to find the CardImage: an inline
 * card with one wraps the rest in a centred column beside it.
 */
function CardFrame(props: { children: JSX.Element }) {
	const scope = useContext(CardContext);
	const parts = resolveChildren(() => props.children);
	const image = createMemo(() =>
		parts.toArray().find((part) => imageNodes.has(part as object)),
	);
	createRenderEffect(() => scope.setHasImage(image() !== undefined));
	const rest = () => parts.toArray().filter((part) => part !== image());
	return (
		<Show when={scope.inlineImage()} fallback={parts()}>
			{image()}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					gap: 8,
					flexGrow: 1,
					flexShrink: 1,
					flexBasis: 0,
					minWidth: 0,
					paddingTop: scope.compact() ? 10 : 14,
					paddingBottom: scope.compact() ? 10 : 14,
					paddingRight: scope.compact() ? 12 : 16,
				}}
			>
				{rest()}
			</div>
		</Show>
	);
}

function DismissChip(props: {
	compact: boolean;
	overMedia: boolean;
	visible: boolean;
	onFocusChange: (focused: boolean) => void;
	onDismiss?: () => void;
}) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			{...buttonProps(
				{
					onClick: (event) => {
						// The card behind the chip is clickable too.
						event.stopPropagation();
						props.onDismiss?.();
					},
					onKeyDown: stopActivationKey,
					onKeyUp: stopActivationKey,
				},
				renderer,
			)}
			aria-label="Dismiss"
			tabIndex={0}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onFocus={() => props.onFocusChange(true)}
			onBlur={() => props.onFocusChange(false)}
			style={{
				position: "absolute",
				top: 8,
				right: 8,
				width: 28,
				height: 28,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: radius.item,
				cursor: "pointer",
				keyboardFocusDim: false,
				// The chip stays shown while the pointer is on it, whatever the card's own hover says.
				opacity: props.visible || hovered() ? 1 : 0,
				pointerEvents: props.visible || hovered() ? "auto" : "none",
				backgroundColor: props.overMedia
					? hovered()
						? color.card
						: cardChip()
					: hovered()
						? color.hover
						: color.transparent,
				focusVisible: focusRing(0),
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

// ─── Parts ───────────────────────────────────────────────────────────────────

export function CardHeader(props: { children: JSX.Element }) {
	const scope = useContext(CardContext);
	const padding = () => {
		if (scope.inlineImage()) return {};
		if (scope.orientation() === "inline") {
			return {
				flexGrow: 1,
				flexShrink: 1,
				flexBasis: 0,
				paddingTop: scope.compact() ? 10 : 14,
				paddingBottom: scope.compact() ? 10 : 14,
			};
		}
		return scope.compact()
			? { paddingLeft: 12, paddingRight: 12, paddingTop: 12 }
			: { paddingLeft: 16, paddingRight: 16, paddingTop: 16 };
	};
	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				gap: 4,
				minWidth: 0,
				...padding(),
			}}
		>
			{props.children}
		</div>
	);
}

/**
 * The semibold copy is laid out invisibly so the resting to selected weight
 * change never reflows the row.
 */
export function CardTitle(props: { children: string }) {
	const scope = useContext(CardContext);
	const text = () => subtitle[scope.compact() ? "compact" : "default"];
	return (
		<div style={{ position: "relative", minWidth: 0 }}>
			<text
				style={{
					...text(),
					fontWeight: weight.semibold,
					opacity: 0,
					whiteSpace: "nowrap",
				}}
			>
				{props.children}
			</text>
			<div style={{ position: "absolute", top: 0, left: 0 }}>
				<text
					style={{
						...text(),
						color: color.foreground,
						fontWeight: scope.emphasized() ? weight.semibold : weight.normal,
						whiteSpace: "nowrap",
					}}
				>
					{props.children}
				</text>
			</div>
		</div>
	);
}

export function CardDescription(props: { children: string }) {
	const scope = useContext(CardContext);
	const text = () => subtitle[scope.compact() ? "compact" : "default"];
	return (
		<text style={{ ...text(), color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

/** Pinned to the header's top-right corner. */
export function CardAction(props: { children: JSX.Element }) {
	return (
		<div {...aboveCard} style={{ position: "absolute", top: 0, right: 0 }}>
			{props.children}
		</div>
	);
}

export function CardContent(props: { children: JSX.Element }) {
	const scope = useContext(CardContext);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minWidth: 0,
				...(scope.orientation() === "inline"
					? {}
					: scope.compact()
						? { paddingLeft: 12, paddingRight: 12, paddingTop: 10 }
						: { paddingLeft: 16, paddingRight: 16, paddingTop: 12 }),
			}}
		>
			{props.children}
		</div>
	);
}

export function CardFooter(props: { children: JSX.Element }) {
	const scope = useContext(CardContext);
	return (
		<div
			{...aboveCard}
			style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				alignItems: "center",
				gap: 4,
				...(scope.inlineImage()
					? {}
					: scope.orientation() === "inline"
						? { flexShrink: 0, paddingRight: scope.compact() ? 12 : 16 }
						: scope.compact()
							? { paddingLeft: 12, paddingRight: 12, paddingTop: 10 }
							: { paddingLeft: 16, paddingRight: 16, paddingTop: 12 }),
			}}
		>
			{props.children}
		</div>
	);
}

/** A leading icon in a tinted 32px tile, or a brand logo (a pair is joined by a short rule). */
export function CardMedia(props: {
	logo?: string | [string, string];
	icon?: IconRef;
	size?: number;
}) {
	const scope = useContext(CardContext);
	const size = () => props.size ?? 22;
	const logos = () =>
		props.logo === undefined
			? []
			: Array.isArray(props.logo)
				? props.logo
				: [props.logo];
	return (
		<Show
			when={props.logo !== undefined}
			fallback={
				<Show when={props.icon}>
					{(icon: Accessor<IconRef>) => (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
								width: 32,
								height: 32,
								borderRadius: radius.item,
								backgroundColor: color.hover,
								...(scope.orientation() === "inline"
									? {}
									: { marginBottom: 8 }),
							}}
						>
							<Icon
								name={icon()}
								size={scope.compact() ? 16 : 18}
								strokeWidth={1.5}
								color={color.mutedForeground}
							/>
						</div>
					)}
				</Show>
			}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					flexShrink: 0,
					gap: 6,
					...(scope.orientation() === "inline" ? {} : { marginBottom: 8 }),
				}}
			>
				{logos().map((src, position) => (
					<>
						<Show when={position > 0}>
							<div
								style={{ width: 8, height: 1, backgroundColor: color.border }}
							/>
						</Show>
						<img
							src={src}
							objectFit="contain"
							style={{
								width: size(),
								height: size(),
								borderRadius: radius.item,
								outlineWidth: 1,
								outlineOffset: -1,
								outlineColor: imageOutline(),
							}}
						/>
					</>
				))}
			</div>
		</Show>
	);
}

/**
 * Full-bleed image: a banner when stacked, a square when inline. Stacked,
 * `height` stands in for `aspect-video`, which gpuix has no equivalent of.
 */
export function CardImage(props: { src: string; height?: number }) {
	const scope = useContext(CardContext);
	const inline = () => scope.orientation() === "inline";
	/** The outer corners a tile would have clipped; the rest keep the original's 2px. */
	const corners = () => {
		const outer = scope.tileCorner() || 2;
		return inline()
			? {
					borderTopLeftRadius: outer,
					borderBottomLeftRadius: outer,
					borderTopRightRadius: 2,
					borderBottomRightRadius: 2,
				}
			: {
					borderTopLeftRadius: outer,
					borderTopRightRadius: outer,
					borderBottomLeftRadius: 2,
					borderBottomRightRadius: 2,
				};
	};
	return (
		<img
			ref={(element) => {
				imageNodes.add(element);
			}}
			src={props.src}
			objectFit="cover"
			style={{
				...corners(),
				outlineWidth: 1,
				outlineOffset: -1,
				outlineColor: imageOutline(),
				...(inline()
					? { width: 160, height: 160, flexShrink: 0 }
					: { width: "100%", height: props.height ?? 160, flexShrink: 0 }),
			}}
		/>
	);
}

/** An icon, a semibold title and a description, for feature lists inside CardContent. */
export function CardFeature(props: {
	icon?: IconRef;
	title: string;
	description?: string;
	testId?: string;
}) {
	const scope = useContext(CardContext);
	return (
		<div
			testId={props.testId}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
			}}
		>
			<Show when={props.icon}>
				{(icon: Accessor<IconRef>) => (
					<div
						testId={props.testId && `${props.testId}-icon`}
						style={{
							marginTop: 2,
							marginRight: scope.compact() ? 4 : 8,
							flexShrink: 0,
						}}
					>
						<Icon
							name={icon()}
							size={scope.compact() ? 14 : 16}
							strokeWidth={1.5}
							color={color.mutedForeground}
						/>
					</div>
				)}
			</Show>
			<div
				testId={props.testId && `${props.testId}-text`}
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 2,
					minWidth: 0,
				}}
			>
				<text
					style={{
						...(scope.compact() ? scale.bodyCompact : scale.body),
						color: color.foreground,
						fontWeight: weight.semibold,
					}}
				>
					{props.title}
				</text>
				<Show when={props.description}>
					<text
						style={{
							...(scope.compact() ? scale.micro : scale.caption),
							color: color.mutedForeground,
						}}
					>
						{props.description}
					</text>
				</Show>
			</div>
		</div>
	);
}

// ─── CardButton ──────────────────────────────────────────────────────────────

export type CardButtonVariant = "primary" | "secondary" | "ghost" | "link";

/** The footer action. Self-contained, like the original, so Card needs no Button. */
export function CardButton(props: {
	variant?: CardButtonVariant;
	icon?: IconRef;
	iconPosition?: "start" | "end";
	/** Appends an outward arrow, as the original does for a link that leaves the app. */
	external?: boolean;
	disabled?: boolean;
	onClick?: () => void;
	testId?: string;
	children: string;
}) {
	const renderer = useGpuixRequired();
	const scope = useContext(CardContext);
	const [hovered, setHovered] = createSignal(false);
	const variant = () => props.variant ?? "ghost";
	const position = () =>
		props.iconPosition ?? (props.external ? "end" : "start");

	const labelColor = () => {
		switch (variant()) {
			case "primary":
				return color.background;
			case "ghost":
				return hovered() ? color.foreground : color.mutedForeground;
			default:
				return color.foreground;
		}
	};
	const surface = () => {
		switch (variant()) {
			case "primary":
				return {
					backgroundColor: color.foreground,
					hover: { backgroundColor: inkHover() },
					active: { backgroundColor: inkActive() },
				};
			case "secondary":
				return {
					backgroundColor: color.accent,
					hover: { backgroundColor: accentHover() },
					active: { backgroundColor: color.accent },
				};
			case "ghost":
				return {
					hover: { backgroundColor: color.hover },
					active: { backgroundColor: color.active },
				};
			case "link":
				return {};
		}
	};
	const glyphSize = () => (scope.compact() ? 12 : 14);
	const stroke = () => (hovered() ? 2 : 1.5);
	const glyph = () => (
		<Show when={props.icon}>
			{(icon: Accessor<IconRef>) => (
				<Icon
					name={icon()}
					size={glyphSize()}
					strokeWidth={stroke()}
					color={labelColor()}
				/>
			)}
		</Show>
	);

	const content = () => (
		<>
			<Show when={position() === "start"}>{glyph()}</Show>
			<text
				style={{
					...(scope.compact() ? scale.micro : scale.caption),
					color: labelColor(),
					fontWeight: weight.normal,
					whiteSpace: "nowrap",
					...(variant() === "link" && hovered()
						? { textDecoration: "underline" }
						: {}),
				}}
			>
				{props.children}
			</text>
			<Show when={position() === "end"}>{glyph()}</Show>
			{/* The original rotates an arrow-right -45deg; there are no transforms, so the glyph is arrow-up-right. */}
			<Show when={props.external}>
				<Icon
					name={arrowUpRight}
					size={13}
					strokeWidth={stroke()}
					color={labelColor()}
				/>
			</Show>
		</>
	);

	return (
		<div
			{...buttonProps({ disabled: props.disabled, onClick: props.onClick, tabIndex: 0 }, renderer)}
			testId={props.testId}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				gap: 6,
				cursor: "pointer",
				keyboardFocusDim: false,
				borderRadius: radius.item,
				...(variant() === "link"
					? {}
					: { height: 28, paddingLeft: 10, paddingRight: 10 }),
				...surface(),
				...(props.disabled ? { opacity: 0.5, pointerEvents: "none" } : {}),
				focusVisible: focusRing(0),
			}}
		>
			{/* One fragment: a Show among siblings leaves an empty text node that eats a `gap`. */}
			{content()}
		</div>
	);
}
