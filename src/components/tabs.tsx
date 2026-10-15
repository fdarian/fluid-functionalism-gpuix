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
	createUniqueId,
	type JSX,
	on,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import {
	createFluidHover,
	type FluidHover,
	type ItemRect,
} from "../lib/fluid-hover";
import { StableLabel } from "../lib/stable-label";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { color, radius, type as scale, scheme, shadow3, motion as tween, weight, focusRing } from "../lib/theme";

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
	tabId: (value: string) => string;
	panelId: (value: string) => string;
	/** Panels mount only while selected, so only a mounted one can be a tab's `aria-controls`. */
	hasPanel: (value: string) => boolean;
	registerPanel: (value: string) => void;
	unregisterPanel: (value: string) => void;
}

interface ListScope {
	hover: FluidHover;
	/** Every tab element by index, for moving focus with the keyboard. */
	elements: Map<number, HostElement>;
	nextIndex: () => number;
	mouseInside: () => boolean;
	/** The tab that holds the roving tab stop. */
	tabStop: () => number;
	focusTab: (index: number) => void;
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
	const [panels, setPanels] = createSignal<readonly string[]>([]);
	const idPrefix = createUniqueId();
	// Uncontrolled with no defaultValue falls back to the first tab.
	const selected = () => props.value ?? uncontrolled() ?? order()[0];
	const state: TabsState = {
		order,
		size: () => props.size ?? "default",
		tabId: (value) => `${idPrefix}-tab-${encodeURIComponent(value)}`,
		panelId: (value) => `${idPrefix}-panel-${encodeURIComponent(value)}`,
		hasPanel: (value) => panels().includes(value),
		registerPanel: (value) => setPanels((current) => [...current, value]),
		unregisterPanel: (value) =>
			setPanels((current) => current.filter((entry) => entry !== value)),
		selected,
		select(value) {
			// Base UI never re-commits the active tab.
			if (selected() === value) return;
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
	const metrics = () => sizes[tabs.size()];

	const selectedIndex = () => {
		const selected = tabs.selected();
		if (selected === undefined) return -1;
		return tabs.order().indexOf(selected);
	};
	/** The last-focused tab keeps the tab stop (a focused disabled tab, say); a new selection takes it back. */
	const [focusedTab, setFocusedTab] = createSignal<number>();
	createEffect(on(selectedIndex, () => setFocusedTab(undefined), { defer: true }));
	const scope: ListScope = {
		hover,
		elements: new Map(),
		nextIndex: () => counter++,
		mouseInside,
		tabStop: () => focusedTab() ?? Math.max(selectedIndex(), 0),
		focusTab: setFocusedTab,
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
				{...hover.containerProps}
				onMouseEnter={() => {
					setMouseInside(true);
					hover.handlers.onMouseEnter();
				}}
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
							style={{ position: "absolute" }}
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
							style={{ position: "absolute" }}
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
	disabled?: boolean;
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
			case "ArrowRight":
				return index === last ? 0 : index + 1;
			case "ArrowLeft":
				return index === 0 ? last : index - 1;
			case "Home":
				return 0;
			case "End":
				return last;
			default:
				return undefined;
		}
	};
	const onKeyDown = (event: KeyEvent) => {
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		const target = keyTarget(event.key ?? "");
		if (target === undefined || target === index) return;
		event.preventDefault();
		event.stopPropagation();
		const next = list.elements.get(target);
		if (next === undefined) return;
		// Focus moves, and focusing an enabled tab selects it (activateOnFocus), so the pill follows the keyboard the way it follows a click. A disabled tab takes the focus and nothing else.
		renderer.focusElement?.(next.id);
	};

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps({
				disabled: props.disabled,
				// Base UI tabs stay focusable when disabled: arrows land on them, nothing activates.
				focusableWhenDisabled: true,
				onClick: () => tabs.select(props.value),
				onKeyDown,
				tabIndex: list.tabStop() === index ? 0 : -1,
			}, renderer)}
			role="tab"
			id={tabs.tabId(props.value)}
			aria-selected={isSelected()}
			aria-controls={
				tabs.hasPanel(props.value) ? tabs.panelId(props.value) : undefined
			}
			aria-disabled={props.disabled === true}
			testId={props.testId}
			onFocus={() => {
				list.focusTab(index);
				list.hover.setActiveIndex(index);
				if (props.disabled !== true) tabs.select(props.value);
			}}
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
				focusVisible: focusRing(1),
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
			<StableLabel
				text={props.label}
				heavy={isSelected()}
				color={isActive() ? color.foreground : color.mutedForeground}
				textStyle={metrics().text}
			/>
		</div>
	);
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function TabPanel(props: { value: string; children: JSX.Element }) {
	const tabs = useTabs();
	return (
		<Show when={tabs.selected() === props.value}>
			<MountedPanel value={props.value}>{props.children}</MountedPanel>
		</Show>
	);
}

function MountedPanel(props: { value: string; children: JSX.Element }) {
	const tabs = useTabs();
	tabs.registerPanel(props.value);
	onCleanup(() => tabs.unregisterPanel(props.value));
	return (
		// A tab stop, like Base UI's panel; the dim is off because FF draws no ring on it.
		<div
			role="tabpanel"
			id={tabs.panelId(props.value)}
			aria-labelledby={tabs.tabId(props.value)}
			tabIndex={0}
			style={{ keyboardFocusDim: false }}
		>
			{props.children}
		</div>
	);
}
