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
	onMount,
	Show,
	useContext,
} from "solid-js";
import {
	createFluidHover,
	type FluidHover,
	type ItemRect,
} from "../lib/fluid-hover";
import { StableLabel } from "../lib/stable-label";
import { awaitBounds } from "../lib/bounds";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { moveIndex } from "../lib/list-nav";
import {
	color,
	height,
	radius,
	type as scale,
	motion as tween,
	weight,
} from "../lib/theme";

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

/** Rows move while a label unfolds: the spring's perceived duration plus its tail. */
const REFLOW_TRACK_MS = 300;

interface SubtleScope {
	selectedIndex: () => number;
	onSelect: (index: number) => void;
	activeLabel: () => boolean;
	idPrefix: () => string | undefined;
	size: () => TabsSubtleSize;
	hover: FluidHover;
	elements: Map<number, HostElement>;
	mouseInside: () => boolean;
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
	const scope: SubtleScope = {
		selectedIndex: () => props.selectedIndex,
		onSelect: (index) => props.onSelect(index),
		activeLabel: () => props.activeLabel === true,
		idPrefix: () => props.idPrefix,
		size: () => props.size ?? "default",
		hover,
		elements: new Map(),
		mouseInside,
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
							style={{ position: "absolute", pointerEvents: "none" }}
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
									pointerEvents: "none",
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
	let labelBox: HostElement | undefined;
	const [labelWidth, setLabelWidth] = createSignal<number>();

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
	/** The label's own width plus its gap to the icon, which folds into the animated width. */
	const unfoldedWidth = () => {
		const width = labelWidth();
		return width === undefined ? undefined : width + metrics().gap;
	};

	// The unfolding label's width is animated to a measured number: gpuix cannot animate `auto`.
	onMount(() => {
		if (!collapsible()) return;
		if (labelBox === undefined) throw new Error("Tab label is not mounted");
		void awaitBounds(labelBox).then((bounds) => setLabelWidth(bounds.width));
	});

	// The tab's own width changes as its label unfolds, so every row after it moves: re-read the rects for the length of the spring.
	let previousSelected = isSelected();
	createEffect(() => {
		const selected = isSelected();
		if (selected === previousSelected) return;
		previousSelected = selected;
		if (collapsible()) scope.hover.remeasureFor(REFLOW_TRACK_MS);
	});

	const onKeyDown = (event: KeyEvent) => {
		const count = scope.elements.size;
		const move = ({ right: 1, left: -1 } as Record<string, 1 | -1 | undefined>)[
			event.key ?? ""
		];
		const target =
			move !== undefined
				? (moveIndex(props.index, move, count) ?? undefined)
				: event.key === "home"
					? 0
					: event.key === "end"
						? count - 1
						: undefined;
		if (target === undefined) return;
		event.preventDefault();
		const next = scope.elements.get(target);
		// Manual activation: focus moves, selection waits for Enter / Space.
		if (next !== undefined) renderer.focusElement?.(next.id);
	};

	const label = (
		<StableLabel
			labelRef={(node) => {
				labelBox = node;
			}}
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
				tabIndex: isSelected() ? 0 : -1,
			})}
			role="tab"
			aria-selected={isSelected()}
			aria-label={collapsible() && !showLabel() ? props.label : undefined}
			aria-id={
				scope.idPrefix() === undefined
					? undefined
					: `${scope.idPrefix()}-tab-${props.index}`
			}
			testId={props.testId}
			onFocus={() => scope.hover.setActiveIndex(props.index)}
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
			{collapsible() ? (
				<motion.div
					initial={false}
					animate={{ width: showLabel() ? (unfoldedWidth() ?? 0) : 0 }}
					transition={showLabel() ? tween.fast : tween.fastExit}
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
			<div role="tabpanel" aria-id={`${props.idPrefix}-panel-${props.index}`}>
				{props.children}
			</div>
		</Show>
	);
}
