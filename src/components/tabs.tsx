import {
	buttonProps,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	Show,
	useContext,
} from "solid-js";
import {
	createFluidHover,
	type FluidHover,
	type ItemRect,
} from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import {
	color,
	radius,
	type as scale,
	scheme,
	shadow3,
	motion as tween,
	weight,
} from "../lib/theme";

export type TabsSize = "default" | "compact";

const sizes = {
	default: { pad: 4, item: 28, gap: 8, text: scale.body, icon: 16 },
	compact: { pad: 2, item: 24, gap: 4, text: scale.bodyCompact, icon: 14 },
} as const;

// ─── State ───────────────────────────────────────────────────────────────────

interface TabsState {
	selected: () => string | undefined;
	select: (value: string) => void;
	/** Tab values in document order, reported by the items as they mount. */
	order: () => readonly string[];
	reportValue: (index: number, value: string) => void;
	size: () => TabsSize;
}

interface ListScope {
	hover: FluidHover;
	/** Every tab element by index, for moving focus with the keyboard. */
	elements: Map<number, HostElement>;
	nextIndex: () => number;
	mouseInside: () => boolean;
}

const TabsContext = createContext<TabsState>();
const ListContext = createContext<ListScope>();

function useTabs() {
	const tabs = useContext(TabsContext);
	if (tabs === undefined) throw new Error("Must be used inside Tabs");
	return tabs;
}
function useList() {
	const list = useContext(ListContext);
	if (list === undefined)
		throw new Error("TabItem must be used inside TabsList");
	return list;
}

export function Tabs(props: {
	/** Controlled value; takes precedence over `defaultValue`. */
	value?: string;
	onValueChange?: (value: string) => void;
	defaultValue?: string;
	size?: TabsSize;
	children: JSX.Element;
}) {
	const [uncontrolled, setUncontrolled] = createSignal<string | undefined>(
		props.defaultValue,
	);
	const [order, setOrder] = createSignal<readonly string[]>([]);
	const state: TabsState = {
		order,
		size: () => props.size ?? "default",
		// Uncontrolled with no defaultValue falls back to the first tab.
		selected: () => props.value ?? uncontrolled() ?? order()[0],
		select(value) {
			if (props.value === undefined) setUncontrolled(value);
			props.onValueChange?.(value);
		},
		reportValue(index, value) {
			const next = [...order()];
			next[index] = value;
			setOrder(next);
		},
	};
	return (
		<TabsContext.Provider value={state}>
			<div style={{ display: "flex", flexDirection: "column" }}>
				{props.children}
			</div>
		</TabsContext.Provider>
	);
}

// ─── List ────────────────────────────────────────────────────────────────────

const rectStyle = (rect: ItemRect) => ({
	left: rect.left,
	top: rect.top,
	width: rect.width,
	height: rect.height,
});

/**
 * The track: a muted segmented control holding one raised pill for the
 * selected tab and a faint pill that previews the next click. Both pills are
 * absolutely positioned layers that glide across the tab rects measured by
 * fluid hover (axis "x": the tab nearest the pointer horizontally wins, so
 * the track's padding never leaves the preview without a target), and the
 * tabs themselves stay transparent.
 */
export function TabsList(props: { children: JSX.Element; testId?: string }) {
	const tabs = useTabs();
	const hover = createFluidHover({ axis: "x" });
	const [mouseInside, setMouseInside] = createSignal(false);
	let counter = 0;
	const scope: ListScope = {
		hover,
		elements: new Map(),
		nextIndex: () => counter++,
		mouseInside,
	};
	const metrics = () => sizes[tabs.size()];

	const selectedIndex = () => {
		const selected = tabs.selected();
		if (selected === undefined) return -1;
		return tabs.order().indexOf(selected);
	};
	const rectOf = (index: number | null): ItemRect | undefined => {
		if (index === null || index < 0 || !hover.isMeasured()) return undefined;
		return hover.rects()[index];
	};
	const selectedRect = () => rectOf(selectedIndex());
	const hoveringOther = () => {
		const active = hover.activeIndex();
		return active !== null && active !== selectedIndex();
	};

	/**
	 * Where the preview pill sits. Hovering another tab it is on that tab. When
	 * the pointer is over the selected tab it fades in place, and when the
	 * pointer has left the list it glides back into the selected pill.
	 */
	const preview = createMemo<{ rect: ItemRect; visible: boolean } | undefined>(
		(previous) => {
			const selected = selectedRect();
			if (selected === undefined) return undefined;
			const active = hover.activeIndex();
			if (active !== null && active !== selectedIndex()) {
				const rect = rectOf(active);
				return rect === undefined ? previous : { rect, visible: true };
			}
			if (mouseInside() && previous !== undefined) {
				return { rect: previous.rect, visible: false };
			}
			return { rect: selected, visible: false };
		},
	);

	return (
		<ListContext.Provider value={scope}>
			<div
				testId={props.testId}
				role="tablist"
				ref={(element) => {
					hover.containerRef(element);
					queueMicrotask(hover.remeasure);
				}}
				onMouseEnter={() => {
					setMouseInside(true);
					hover.handlers.onMouseEnter();
				}}
				onMouseMove={hover.handlers.onMouseMove}
				onMouseLeave={() => {
					setMouseInside(false);
					hover.handlers.onMouseLeave();
				}}
				style={{
					position: "relative",
					alignSelf: "flex-start",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					padding: metrics().pad,
					borderRadius: radius.container,
					backgroundColor: color.muted,
					userSelect: "none",
				}}
			>
				{/* Layers first: gpuix has no zIndex, so the transparent tabs paint over them by document order. */}
				<Show when={selectedRect()}>
					{(rect: () => ItemRect) => (
						<motion.div
							initial={false}
							animate={rectStyle(rect())}
							transition={tween.moderate}
							style={{ position: "absolute", pointerEvents: "none" }}
						>
							<motion.div
								initial={false}
								// Dims while another tab is hovered: the selection reads as "current", the preview as "next".
								animate={{ opacity: hoveringOther() ? 0.85 : 1 }}
								transition={{ duration: 0.08 }}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									pointerEvents: "none",
									borderRadius: radius.item,
									backgroundColor: color.surface4,
									borderWidth: 1,
									borderColor: color.popupBorder,
									boxShadow: shadow3(),
								}}
							/>
						</motion.div>
					)}
				</Show>
				<Show when={preview()}>
					{(shown: () => { rect: ItemRect; visible: boolean }) => (
						<motion.div
							initial={false}
							animate={rectStyle(shown().rect)}
							// The preview keeps up with the pointer on fast; its way home takes the moderate spring.
							transition={hoveringOther() ? tween.fast : tween.moderate}
							style={{ position: "absolute", pointerEvents: "none" }}
						>
							<motion.div
								initial={false}
								animate={{ opacity: shown().visible ? 0.4 : 0 }}
								transition={{ duration: shown().visible ? 0.08 : 0.06 }}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									pointerEvents: "none",
									borderRadius: radius.item,
									backgroundColor: color.hover,
								}}
							/>
						</motion.div>
					)}
				</Show>
				{props.children}
			</div>
		</ListContext.Provider>
	);
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

export function TabItem(props: {
	value: string;
	icon?: IconRef;
	label: string;
	testId?: string;
}) {
	const tabs = useTabs();
	const list = useList();
	const renderer = useGpuixRequired();
	const index = list.nextIndex();
	tabs.reportValue(index, props.value);
	let element: HostElement | undefined;
	const metrics = () => sizes[tabs.size()];

	createEffect(() => {
		if (element === undefined) throw new Error("Tab is not mounted");
		list.hover.registerItem(index, element);
		list.elements.set(index, element);
	});

	const isSelected = () => tabs.selected() === props.value;
	const isActive = () => list.hover.activeIndex() === index || isSelected();

	const keyTarget = (key: string): number | undefined => {
		const last = tabs.order().length - 1;
		switch (key) {
			case "right":
				return index === last ? 0 : index + 1;
			case "left":
				return index === 0 ? last : index - 1;
			case "home":
				return 0;
			case "end":
				return last;
			default:
				return undefined;
		}
	};
	const onKeyDown = (event: KeyEvent) => {
		const target = keyTarget(event.key ?? "");
		if (target === undefined) return;
		event.preventDefault();
		const value = tabs.order()[target];
		const next = list.elements.get(target);
		if (value === undefined || next === undefined) return;
		// Arrow keys move focus and select in one step, so the pill follows the keyboard the way it follows a click.
		tabs.select(value);
		renderer.focusElement?.(next.id);
	};

	const textStyle = (heavy: boolean) => ({
		...metrics().text,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps({
				onClick: () => tabs.select(props.value),
				onKeyDown,
				tabIndex: isSelected() ? 0 : -1,
			})}
			role="tab"
			aria-selected={isSelected()}
			testId={props.testId}
			onFocus={() => list.hover.setActiveIndex(index)}
			onBlur={() =>
				// Focus moving to a sibling tab stays inside the list: only a real exit drops the highlight.
				queueMicrotask(() => {
					const focused = renderer.getFocusedElementId?.();
					for (const tab of list.elements.values()) {
						if (tab.id === focused) return;
					}
					if (!list.mouseInside()) list.hover.setActiveIndex(null);
				})
			}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				height: metrics().item,
				paddingLeft: 12,
				paddingRight: 12,
				gap: props.icon === undefined ? 0 : metrics().gap,
				borderRadius: radius.item,
				cursor: "pointer",
				keyboardFocusDim: false,
				focusVisible: {
					outlineWidth: 1,
					outlineColor: color.focusRing,
					outlineOffset: 1,
				},
			}}
		>
			<Show when={props.icon}>
				{(icon: () => IconRef) => (
					<Icon
						name={icon()}
						size={metrics().icon}
						strokeWidth={isActive() ? 2 : 1.5}
						color={isActive() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			{/* A hidden semibold copy reserves the heavy width, so selecting a tab never moves the pills. */}
			<div style={{ position: "relative" }}>
				<text style={{ ...textStyle(true), opacity: 0 }}>{props.label}</text>
				<text
					style={{
						...textStyle(isSelected()),
						position: "absolute",
						top: 0,
						left: 0,
						// An absolute box blocks hits behind it, which would kill the tab's own hover.
						pointerEvents: "none",
						color: isActive() ? color.foreground : color.mutedForeground,
					}}
				>
					{props.label}
				</text>
			</div>
		</div>
	);
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function TabPanel(props: { value: string; children: JSX.Element }) {
	const tabs = useTabs();
	return (
		<Show when={tabs.selected() === props.value}>
			<div role="tabpanel">{props.children}</div>
		</Show>
	);
}
