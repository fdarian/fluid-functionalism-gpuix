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
	on,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { StableLabel } from "../lib/stable-label";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import { createMeasuredHeight } from "../lib/measured-height";
import { color, radius, type as scale, scheme, motion as tween, weight, focusRing, trackMs } from "../lib/theme";

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
	focusRow: (index: number) => void;
	blurRow: () => void;
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
	/** The trigger's text, which names the panel region. */
	label: () => string | undefined;
	setLabel: (label: string) => void;
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
	const renderer = useGpuixRequired();
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

	const hover = createFluidHover();
	let mouseInside = false;

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
			onCleanup(() => triggers.delete(index));
			return index;
		},
		focusRow(index) {
			hover.setActiveIndex(index);
		},
		blurRow() {
			// Focus moving to a sibling trigger arrives as its focus right after this blur.
			queueMicrotask(() => {
				const focused = renderer.getFocusedElementId?.();
				for (const trigger of triggers.values()) {
					if (trigger.element.id === focused) return;
				}
				if (!mouseInside) hover.setActiveIndex(null);
			});
		},
		trackReflow() {
			clearTimeout(reflowTimer);
			setReflow(true);
			reflowTimer = setTimeout(() => setReflow(false), trackMs.spring + 48);
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
					{...hover.containerProps}
					onMouseEnter={() => {
						mouseInside = true;
						hover.handlers.onMouseEnter();
					}}
					onMouseMove={(event: EventPayload) => {
						// The pointer over an open panel belongs to no row.
						if (contentOver !== null) return;
						hover.handlers.onMouseMove(event);
					}}
					onMouseLeave={() => {
						mouseInside = false;
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
	const [label, setLabel] = createSignal<string>();
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
		label,
		setLabel,
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
						backgroundColor: color.accentWash,
						// Removing this lights the row under the pointer after a single-expand click moves the rows, though the pointer is over the open panel, which belongs to no row.
						pointerEvents: "none",
					}}
				/>
				{props.children}
			</div>
		</ItemContext.Provider>
	);
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

export function AccordionTrigger(props: { children: string; testId?: string }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const [standaloneHovered, setStandaloneHovered] = createSignal(false);
	let triggerElement: HostElement | undefined;
	const renderer = useGpuixRequired();

	createEffect(() => item.setLabel(props.children));

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
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		const step = (
			{ ArrowDown: "next", ArrowUp: "previous", Home: "first", End: "last" } as const
		)[event.key as "ArrowDown" | "ArrowUp" | "Home" | "End"];
		if (step === undefined) return;
		event.preventDefault();
		event.stopPropagation();
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
					backgroundColor: color.accentWash,
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
					tabIndex: 0,
				}, renderer)}
				aria-expanded={item.isOpen()}
				onFocus={() => {
					const own = item.index();
					if (own !== undefined) group?.focusRow(own);
				}}
				onBlur={() => group?.blurRow()}
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
					focusVisible: focusRing(group === undefined ? 0 : 1),
				}}
			>
				<StableLabel
					text={props.children}
					heavy={item.isOpen()}
					color={lit() ? color.foreground : color.mutedForeground}
					textStyle={metrics().text}
					grow
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
 * cannot animate `height: auto`, so the inner box reports its size through
 * `onLayout` and the outer box tweens to it.
 */
export function AccordionContent(props: { children: JSX.Element }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const measured = createMeasuredHeight();
	const contentHeight = measured.height;
	// gpuix has no `display: none`, so a closed panel's text leaves the accessibility tree by unmounting once the exit is over (Base UI hides the panel). It paints once first, or it would never report its height.
	const [retired, setRetired] = createSignal(false);
	let toggled = false;
	createEffect(
		on(
			item.isOpen,
			(open) => {
				toggled = true;
				if (open) setRetired(false);
			},
			{ defer: true },
		),
	);

	return (
		<motion.div
			role="region"
			aria-label={item.label()}
			initial={false}
			animate={{ height: item.isOpen() ? (contentHeight() ?? 0) : 0 }}
			transition={item.isOpen() ? tween.fast : tween.fastExit}
			onMotionComplete={() => {
				if (!item.isOpen()) setRetired(true);
			}}
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
				<Show when={!retired()}>
					<div
						onLayout={(event: EventPayload) => {
							measured.onLayout(event);
							if (!toggled && !item.isOpen()) setRetired(true);
						}}
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
				</Show>
			</motion.div>
		</motion.div>
	);
}
