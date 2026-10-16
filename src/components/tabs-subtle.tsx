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
	createComputed,
	createEffect,
	createMemo,
	createSignal,
	type JSX,
	on,
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
import { moveIndex } from "../lib/list-nav";
import { color, height, radius, type as scale, motion as tween, weight, focusRing } from "../lib/theme";

export type TabsSubtleSize = "default" | "compact";

const sizes = {
	default: {
		height: height.control,
		padX: 12,
		gap: 8,
		text: scale.body,
		icon: 16,
	},
	compact: {
		height: height.controlCompact,
		padX: 10,
		gap: 4,
		text: scale.bodyCompact,
		icon: 14,
	},
} as const;

interface SubtleScope {
	selectedIndex: () => number;
	onSelect: (index: number) => void;
	activeLabel: () => boolean;
	idPrefix: () => string | undefined;
	size: () => TabsSubtleSize;
	hover: FluidHover;
	elements: Map<number, HostElement>;
	mouseInside: () => boolean;
	/** The tab that holds the roving tab stop. */
	tabStop: () => number;
	focusTab: (index: number) => void;
}

const SubtleContext = createContext<SubtleScope>();

function useSubtle() {
	const scope = useContext(SubtleContext);
	if (scope === undefined) throw new Error("Must be used inside TabsSubtle");
	return scope;
}

const rectStyle = (rect: ItemRect) => ({
	left: rect.left,
	top: rect.top,
	width: rect.width,
	height: rect.height,
});

/**
 * Pill-style tabs on a transparent track: a selected pill, a faint preview
 * pill that is born at the selected one, and tabs that keep manual
 * activation (arrows move focus, Enter / Space select).
 */
export function TabsSubtle(props: {
	selectedIndex: number;
	onSelect: (index: number) => void;
	/** Ties tabs to panels for assistive technology. */
	idPrefix?: string;
	/** Only the selected tab shows its label. Needs an icon on every tab. */
	activeLabel?: boolean;
	size?: TabsSubtleSize;
	testId?: string;
	children: JSX.Element;
}) {
	const hover = createFluidHover({ axis: "x" });
	const [mouseInside, setMouseInside] = createSignal(false);
	/** Manual activation: arrows move focus, and the focused tab keeps the tab stop until the selection changes. */
	const [focusedTab, setFocusedTab] = createSignal<number>();
	createEffect(
		on(
			() => props.selectedIndex,
			() => setFocusedTab(undefined),
			{ defer: true },
		),
	);
	const scope: SubtleScope = {
		selectedIndex: () => props.selectedIndex,
		onSelect(index) {
			// Base UI never re-commits the active tab.
			if (index !== props.selectedIndex) props.onSelect(index);
		},
		activeLabel: () => props.activeLabel === true,
		idPrefix: () => props.idPrefix,
		size: () => props.size ?? "default",
		hover,
		elements: new Map(),
		mouseInside,
		tabStop: () => focusedTab() ?? Math.max(props.selectedIndex, 0),
		focusTab: setFocusedTab,
	};

	const rectOf = (index: number | null): ItemRect | undefined => {
		if (index === null || index < 0 || !hover.isMeasured()) return undefined;
		return hover.rects()[index];
	};
	const selectedRect = () => rectOf(props.selectedIndex);
	const hoveringOther = () => {
		const active = hover.activeIndex();
		return active !== null && active !== props.selectedIndex;
	};

	/** Hovering another tab the preview sits on it; with the pointer over the selected tab it fades in place, and with the pointer gone it glides back into the selected pill. */
	const preview = createMemo<{ rect: ItemRect; visible: boolean } | undefined>(
		(previous) => {
			const selected = selectedRect();
			if (selected === undefined) return undefined;
			const active = hover.activeIndex();
			if (active !== null && active !== props.selectedIndex) {
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
		<SubtleContext.Provider value={scope}>
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
								animate={{ opacity: hoveringOther() ? 0.8 : 1 }}
								transition={{ duration: 0.08 }}
								style={{
									position: "absolute",
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									borderRadius: radius.item,
									backgroundColor: color.active,
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
									backgroundColor: color.active,
								}}
							/>
						</motion.div>
					)}
				</Show>
				{props.children}
			</div>
		</SubtleContext.Provider>
	);
}

export function TabsSubtleItem(props: {
	index: number;
	icon?: IconRef;
	label: string;
	testId?: string;
}) {
	const scope = useSubtle();
	const renderer = useGpuixRequired();
	const metrics = () => sizes[scope.size()];
	let element: HostElement | undefined;
	const [unfoldedWidth, setUnfoldedWidth] = createSignal<number>();
	/** The tab selected at mount is born unfolded: its first measured width is placed, not tweened. */
	const [selectionChanged, setSelectionChanged] = createSignal(false);
	createComputed(
		on(
			() => scope.selectedIndex() === props.index,
			() => setSelectionChanged(true),
			{ defer: true },
		),
	);

	createEffect(() => {
		if (element === undefined) throw new Error("Tab is not mounted");
		scope.hover.registerItem(props.index, element);
		scope.elements.set(props.index, element);
	});

	const isSelected = () => scope.selectedIndex() === props.index;
	const isActive = () =>
		scope.hover.activeIndex() === props.index || isSelected();
	const collapsible = () => scope.activeLabel() && props.icon !== undefined;
	const showLabel = () => !collapsible() || isSelected();
	const tabId = () =>
		scope.idPrefix() === undefined
			? undefined
			: `${scope.idPrefix()}-tab-${props.index}`;
	const panelId = () =>
		scope.idPrefix() === undefined
			? undefined
			: `${scope.idPrefix()}-panel-${props.index}`;
	// The unfolding label's width is animated to a measured number (gpuix cannot animate `auto`): the box holding the label and its gap to the icon reports it.
	const labelWidthTarget = () => {
		if (!showLabel()) return { width: 0 };
		const measured = unfoldedWidth();
		return measured === undefined ? {} : { width: measured };
	};
	const labelWidthTransition = () => {
		if (!selectionChanged()) return { duration: 0 };
		return showLabel() ? tween.fast : tween.fastExit;
	};

	const onKeyDown = (event: KeyEvent) => {
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		const count = scope.elements.size;
		const move = ({ ArrowRight: 1, ArrowLeft: -1 } as Record<string, 1 | -1 | undefined>)[
			event.key ?? ""
		];
		const target =
			move !== undefined
				? (moveIndex(props.index, move, count) ?? undefined)
				: event.key === "Home"
					? 0
					: event.key === "End"
						? count - 1
						: undefined;
		if (target === undefined || target === props.index) return;
		event.preventDefault();
		event.stopPropagation();
		const next = scope.elements.get(target);
		// Manual activation: focus moves, selection waits for Enter / Space.
		if (next !== undefined) renderer.focusElement?.(next.id);
	};

	const label = (
		<StableLabel
			text={props.label}
			heavy={isSelected()}
			color={isActive() ? color.foreground : color.mutedForeground}
			textStyle={metrics().text}
		/>
	);

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps({
				onClick: () => scope.onSelect(props.index),
				onKeyDown,
				tabIndex: scope.tabStop() === props.index ? 0 : -1,
			}, renderer)}
			role="tab"
			aria-selected={isSelected()}
			aria-label={collapsible() && !showLabel() ? props.label : undefined}
			id={tabId()}
			aria-controls={isSelected() ? panelId() : undefined}
			testId={props.testId}
			onFocus={() => {
				scope.focusTab(props.index);
				scope.hover.setActiveIndex(props.index);
			}}
			onBlur={() =>
				// Focus moving to a sibling tab stays inside the list: only a real exit drops the highlight.
				queueMicrotask(() => {
					const focused = renderer.getFocusedElementId?.();
					for (const tab of scope.elements.values()) {
						if (tab.id === focused) return;
					}
					if (!scope.mouseInside()) scope.hover.setActiveIndex(null);
				})
			}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				flexShrink: 0,
				height: metrics().height,
				paddingLeft: metrics().padX,
				paddingRight: metrics().padX,
				gap: collapsible() || props.icon === undefined ? 0 : metrics().gap,
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
			{collapsible() ? (
				<motion.div
					initial={false}
					animate={labelWidthTarget()}
					transition={labelWidthTransition()}
					onMotionComplete={() => scope.hover.remeasure()}
					style={{
						display: "flex",
						flexDirection: "row",
						overflow: "hidden",
						// Until the label is measured an unfolded label keeps its natural width.
						...(unfoldedWidth() === undefined && showLabel()
							? { width: "auto" }
							: {}),
					}}
				>
					<motion.div
						initial={false}
						animate={{ opacity: showLabel() ? 1 : 0 }}
						transition={{ duration: 0.06 }}
						onLayout={(event: EventPayload) => {
							if (event.width === undefined) throw new Error("onLayout reported no width");
							setUnfoldedWidth(event.width);
						}}
						style={{
							display: "flex",
							flexDirection: "row",
							flexShrink: 0,
							paddingLeft: metrics().gap,
						}}
					>
						{label}
					</motion.div>
				</motion.div>
			) : (
				label
			)}
		</div>
	);
}

export function TabsSubtlePanel(props: {
	index: number;
	selectedIndex: number;
	idPrefix: string;
	children: JSX.Element;
}) {
	return (
		<Show when={props.selectedIndex === props.index}>
			<div
				role="tabpanel"
				id={`${props.idPrefix}-panel-${props.index}`}
				aria-labelledby={`${props.idPrefix}-tab-${props.index}`}
			>
				{props.children}
			</div>
		</Show>
	);
}
