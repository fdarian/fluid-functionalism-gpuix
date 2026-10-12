import {
	buttonProps,
	type EventPayload,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import { createMeasuredHeight } from "../lib/measured-height";
import {
	color,
	radius,
	type as scale,
	scheme,
	motion as tween,
	weight,
} from "../lib/theme";

export type AccordionSize = "default" | "compact";
export type AccordionHighlight = "trigger" | "item";

const sizes = {
	default: {
		padX: 12,
		padY: 8,
		gap: 8,
		text: scale.body,
		icon: 16,
		contentBottom: 12,
	},
	compact: {
		padX: 10,
		padY: 4,
		gap: 4,
		text: scale.bodyCompact,
		icon: 14,
		contentBottom: 10,
	},
} as const;

/** How long rows keep moving after a panel toggles: the spring's perceived duration plus its tail. */
const SPRING_TRACK_MS = 400;

/** `bg-accent/20` in light, `dark:bg-accent/12`: the tint an open item holds. */
const openTint = () =>
	scheme() === "light" ? "rgba(229,229,229,0.2)" : "rgba(82,82,82,0.12)";

// ─── State ───────────────────────────────────────────────────────────────────

interface RootState {
	isOpen: (value: string) => boolean;
	toggle: (value: string) => void;
	anyOpen: () => boolean;
	highlight: () => AccordionHighlight;
	size: () => AccordionSize;
}

interface GroupScope {
	hover: FluidHover;
	registerTrigger: (
		element: HostElement,
		entry: { value: string; disabled: () => boolean; focus: () => void },
	) => number;
	/** Panels are changing height: rows reflow every frame and the highlight must follow without gliding. */
	trackReflow: () => void;
	reflow: () => boolean;
	/** The pointer is on a row whose item is closed: open tints dim to let it read. */
	hoveringClosedRow: () => boolean;
	overContent: (index: number | null) => void;
	focusSibling: (
		index: number,
		step: "next" | "previous" | "first" | "last",
	) => void;
}

const RootContext = createContext<RootState>();
const GroupContext = createContext<GroupScope>();

interface ItemState {
	value: string;
	disabled: () => boolean;
	isOpen: () => boolean;
	/** Set once the trigger registers with a group. */
	index: () => number | undefined;
	setIndex: (index: number) => void;
	highlight: () => AccordionHighlight;
}
const ItemContext = createContext<ItemState>();

function useRoot() {
	const root = useContext(RootContext);
	if (root === undefined) throw new Error("Must be used inside an Accordion");
	return root;
}
function useItem() {
	const item = useContext(ItemContext);
	if (item === undefined)
		throw new Error("Must be used inside an AccordionItem");
	return item;
}

type ValueProps =
	| {
			type?: "single";
			value?: string;
			defaultValue?: string;
			onValueChange?: (value: string) => void;
	  }
	| {
			type: "multiple";
			value?: string[];
			defaultValue?: string[];
			onValueChange?: (value: string[]) => void;
	  };

function createRootState(
	props: ValueProps & { size?: AccordionSize; highlight?: AccordionHighlight },
): RootState {
	const toList = (value: string | string[] | undefined): string[] => {
		if (value === undefined || value === "") return [];
		return typeof value === "string" ? [value] : value;
	};
	const [internal, setInternal] = createSignal<string[]>(
		toList(props.defaultValue),
	);
	const open = () =>
		props.value !== undefined ? toList(props.value) : internal();

	return {
		isOpen: (value) => open().includes(value),
		anyOpen: () => open().length > 0,
		highlight: () => props.highlight ?? "item",
		size: () => props.size ?? "default",
		toggle(value) {
			const current = open();
			if (props.type === "multiple") {
				const next = current.includes(value)
					? current.filter((entry) => entry !== value)
					: [...current, value];
				if (props.onValueChange === undefined) setInternal(next);
				else props.onValueChange(next);
				return;
			}
			const next = current.includes(value) ? "" : value;
			if (props.onValueChange === undefined) setInternal(toList(next));
			else props.onValueChange(next);
		},
	};
}

// ─── Roots ───────────────────────────────────────────────────────────────────

type RootProps = ValueProps & {
	size?: AccordionSize;
	highlight?: AccordionHighlight;
	children: JSX.Element;
};

export function AccordionGroup(props: RootProps) {
	const root = createRootState(props);
	const triggers = new Map<
		number,
		{
			element: HostElement;
			value: string;
			disabled: () => boolean;
			focus: () => void;
		}
	>();
	let nextIndex = 0;
	let reflowTimer: ReturnType<typeof setTimeout> | undefined;
	let contentOver: number | null = null;
	const [reflow, setReflow] = createSignal(false);

	const hover = createFluidHover({
		isItemDisabled: (index) => {
			const trigger = triggers.get(index);
			if (trigger === undefined)
				throw new Error(`No accordion trigger registered at ${index}`);
			return trigger.disabled();
		},
	});

	const scope: GroupScope = {
		hover,
		reflow,
		hoveringClosedRow() {
			const active = hover.activeIndex();
			if (active === null) return false;
			const trigger = triggers.get(active);
			return trigger !== undefined && !root.isOpen(trigger.value);
		},
		registerTrigger(element, entry) {
			const index = nextIndex++;
			triggers.set(index, { element, ...entry });
			hover.registerItem(index, element);
			return index;
		},
		trackReflow() {
			clearTimeout(reflowTimer);
			setReflow(true);
			hover.remeasureFor(SPRING_TRACK_MS);
			reflowTimer = setTimeout(() => setReflow(false), SPRING_TRACK_MS + 48);
		},
		overContent(index) {
			contentOver = index;
			if (index !== null) hover.setActiveIndex(null);
		},
		focusSibling(index, step) {
			const order = [...triggers.keys()].filter(
				(key) => !triggers.get(key)?.disabled(),
			);
			const position = order.indexOf(index);
			const target = {
				next: order[(position + 1) % order.length],
				previous: order[(position - 1 + order.length) % order.length],
				first: order[0],
				last: order[order.length - 1],
			}[step];
			triggers.get(target)?.focus();
		},
	};

	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<RootContext.Provider value={root}>
			<GroupContext.Provider value={scope}>
				<div
					ref={(element) => {
						hover.containerRef(element);
						queueMicrotask(hover.remeasure);
					}}
					onMouseEnter={hover.handlers.onMouseEnter}
					onMouseMove={(event: EventPayload) => {
						// The pointer over an open panel belongs to no row.
						if (contentOver !== null) return;
						hover.handlers.onMouseMove(event);
					}}
					onMouseLeave={() => {
						contentOver = null;
						hover.handlers.onMouseLeave();
					}}
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "column",
						width: 288,
						maxWidth: "100%",
					}}
				>
					{/* First child: gpuix has no zIndex, so rows paint over the highlight by document order. */}
					<FluidHighlight
						rect={hoverRect}
						session={hover.session}
						radius={radius.item}
						background={color.hover}
						travel={() => !reflow()}
					/>
					{props.children}
				</div>
			</GroupContext.Provider>
		</RootContext.Provider>
	);
}

export function Accordion(props: RootProps) {
	const root = createRootState(props);
	return (
		<RootContext.Provider value={root}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					width: 288,
					maxWidth: "100%",
				}}
			>
				{props.children}
			</div>
		</RootContext.Provider>
	);
}

// ─── Item ────────────────────────────────────────────────────────────────────

export function AccordionItem(props: {
	value: string;
	disabled?: boolean;
	/** Standalone only: a group decides for all its rows. */
	highlight?: AccordionHighlight;
	children: JSX.Element;
}) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const [index, setIndex] = createSignal<number>();
	const highlight = () =>
		group === undefined
			? (props.highlight ?? root.highlight())
			: root.highlight();
	const item: ItemState = {
		highlight,
		value: props.value,
		disabled: () => props.disabled === true,
		isOpen: () => root.isOpen(props.value),
		index,
		setIndex,
	};

	return (
		<ItemContext.Provider value={item}>
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
				}}
			>
				{/* The item-wide tint sits under the trigger and panel, fading with the open state. */}
				<motion.div
					initial={false}
					animate={{
						opacity:
							item.highlight() === "item" && item.isOpen()
								? (group?.hoveringClosedRow() ?? false)
									? 0.7
									: 1
								: 0,
					}}
					transition={tween.moderateExit}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						borderRadius: radius.item,
						backgroundColor: openTint(),
						pointerEvents: "none",
					}}
				/>
				{props.children}
			</div>
		</ItemContext.Provider>
	);
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

/** Label that keeps its width when the weight steps up: a hidden copy at the heavy weight reserves the space. */
function TriggerLabel(props: {
	text: JSX.Element;
	lit: boolean;
	emphasized: boolean;
	textStyle: (typeof sizes)[AccordionSize]["text"];
}) {
	const textStyle = (heavy: boolean) => ({
		...props.textStyle,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});
	return (
		<div style={{ position: "relative", flexGrow: 1, minWidth: 0 }}>
			<text style={{ ...textStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				style={{
					...textStyle(props.emphasized),
					position: "absolute",
					top: 0,
					left: 0,
					// An absolute box blocks hits behind it, which would kill the row's hover over its own label.
					pointerEvents: "none",
					color: props.lit ? color.foreground : color.mutedForeground,
				}}
			>
				{props.text}
			</text>
		</div>
	);
}

export function AccordionTrigger(props: { children: string; testId?: string }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const [standaloneHovered, setStandaloneHovered] = createSignal(false);
	let triggerElement: HostElement | undefined;
	const renderer = useGpuixRequired();

	createEffect(() => {
		if (group === undefined) return;
		if (triggerElement === undefined) throw new Error("Trigger is not mounted");
		const element = triggerElement;
		item.setIndex(
			group.registerTrigger(element, {
				value: item.value,
				disabled: item.disabled,
				focus: () => renderer.focusElement?.(element.id),
			}),
		);
	});

	const hovered = () => {
		if (group === undefined) return standaloneHovered();
		const own = item.index();
		return own !== undefined && group.hover.activeIndex() === own;
	};
	const lit = () => item.isOpen() || hovered();

	const toggle = () => {
		if (item.disabled()) return;
		root.toggle(item.value);
		group?.trackReflow();
	};
	const onKeyDown = (event: KeyEvent) => {
		const own = item.index();
		if (group === undefined || own === undefined) return;
		const step = (
			{ down: "next", up: "previous", home: "first", end: "last" } as const
		)[event.key as "down" | "up" | "home" | "end"];
		if (step === undefined) return;
		event.preventDefault();
		group.focusSibling(own, step);
	};

	return (
		<div
			onMouseEnter={() => setStandaloneHovered(true)}
			onMouseLeave={() => setStandaloneHovered(false)}
			style={{ position: "relative", flexShrink: 0 }}
		>
			{/* Standalone rows carry their own highlights; a group's one shared highlight is drawn by AccordionGroup. */}
			<motion.div
				initial={false}
				animate={{
					opacity:
						item.highlight() === "trigger" && item.isOpen() && hovered()
							? 1
							: 0,
				}}
				transition={tween.moderateExit}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: radius.item,
					backgroundColor: openTint(),
					pointerEvents: "none",
				}}
			/>
			<motion.div
				initial={false}
				animate={{
					opacity: group === undefined && hovered() ? 1 : 0,
				}}
				transition={tween.fastExit}
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
			<div
				ref={(element) => {
					triggerElement = element;
				}}
				{...buttonProps({
					disabled: item.disabled(),
					onClick: toggle,
					onKeyDown,
				})}
				aria-expanded={item.isOpen()}
				testId={props.testId}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: metrics().gap,
					paddingLeft: metrics().padX,
					paddingRight: metrics().padX,
					paddingTop: metrics().padY,
					paddingBottom: metrics().padY,
					width: "100%",
					borderRadius: radius.item,
					cursor: "pointer",
					userSelect: "none",
					keyboardFocusDim: false,
					opacity: item.disabled() ? 0.5 : 1,
					focusVisible: {
						outlineWidth: 1,
						outlineColor: color.focusRing,
						outlineOffset: 1,
					},
				}}
			>
				<TriggerLabel
					text={props.children}
					lit={lit()}
					emphasized={item.isOpen()}
					textStyle={metrics().text}
				/>
				<Icon
					name={item.isOpen() ? "chevron-down" : "chevron-right"}
					size={metrics().icon}
					strokeWidth={lit() ? 2 : 1.5}
					color={lit() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</div>
	);
}

// ─── Content ─────────────────────────────────────────────────────────────────

/**
 * The panel's height springs between 0 and the measured content height: gpuix
 * cannot animate `height: auto`, so the inner box is measured from painted
 * bounds once and the outer box tweens to it.
 */
export function AccordionContent(props: { children: JSX.Element }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const measured = createMeasuredHeight();
	const contentHeight = measured.height;

	return (
		<motion.div
			initial={false}
			animate={{ height: item.isOpen() ? (contentHeight() ?? 0) : 0 }}
			transition={item.isOpen() ? tween.fast : tween.fastExit}
			onMouseEnter={() => {
				const own = item.index();
				if (group !== undefined && own !== undefined && item.isOpen())
					group.overContent(own);
			}}
			onMouseLeave={() => group?.overContent(null)}
			style={{
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				// Until the content is measured an open panel keeps its natural height.
				...(contentHeight() === undefined && item.isOpen()
					? { height: "auto" }
					: {}),
			}}
		>
			<motion.div
				initial={false}
				animate={{ opacity: item.isOpen() ? 1 : 0 }}
				transition={item.isOpen() ? { duration: 0.06 } : { duration: 0.04 }}
			>
				<div
					ref={measured.ref}
					style={{
						display: "flex",
						flexDirection: "column",
						flexShrink: 0,
						paddingTop: 4,
						paddingLeft: metrics().padX,
						paddingRight: metrics().padX,
						paddingBottom: metrics().contentBottom,
					}}
				>
					<text style={{ ...metrics().text, color: color.mutedForeground }}>
						{props.children}
					</text>
				</div>
			</motion.div>
		</motion.div>
	);
}
