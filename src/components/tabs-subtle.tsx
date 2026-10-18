import { type DomEvent, type HostElement, motion } from '@gpuix/solid';
import {
	createTabsList,
	createTabsRoot,
	createTabsTab,
	type TabsList,
	type TabsRoot,
} from 'base-ui-solid-gpuix/tabs';
import {
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	Show,
	untrack,
	useContext,
} from 'solid-js';
import {
	createFluidHover,
	type FluidHover,
	type ItemRect,
} from '#/lib/fluid-hover';
import {
	createFocusRing,
	FocusRing,
	type FocusRingState,
} from '#/lib/focus-ring';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { createPreviewPill } from '#/lib/preview-pill';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	height,
	type as scale,
	shape,
	sizeChoice,
	motion as tween,
} from '#/lib/theme';

export type TabsSubtleSize = 'default' | 'compact';

const sizes = {
	default: {
		height: height.control,
		padX: 12,
		gap: 8,
		labelGap: 8,
		text: scale.body,
		icon: 16,
	},
	compact: {
		height: height.controlCompact,
		padX: 10,
		gap: 4,
		// The source's own value, 2px wider than the compact icon gap.
		labelGap: 6,
		text: scale.bodyCompact,
		icon: 14,
	},
} as const;

interface SubtleScope {
	root: TabsRoot<number>;
	tabsList: TabsList;
	activeLabel: () => boolean;
	size: () => TabsSubtleSize;
	hover: FluidHover;
	focusRing: FocusRingState;
	mouseInside: () => boolean;
}

const SubtleContext = createContext<SubtleScope>();

function useSubtle() {
	const scope = useContext(SubtleContext);
	if (scope === undefined) throw new Error('Must be used inside TabsSubtle');
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
	const hover = createFluidHover({ axis: 'x' });
	const focusRing = createFocusRing(hover);
	const [mouseInside, setMouseInside] = createSignal(false);
	const scope: SubtleScope = {
		root: createTabsRoot<number>({
			value: () => props.selectedIndex,
			onValueChange: (index) => props.onSelect(index),
			tabId: (index) =>
				props.idPrefix === undefined
					? undefined
					: `${props.idPrefix}-tab-${index}`,
			panelId: (index) =>
				props.idPrefix === undefined
					? undefined
					: `${props.idPrefix}-panel-${index}`,
		}),
		// Manual activation: arrows move focus, and the focused tab keeps the tab stop until the selection changes.
		tabsList: createTabsList({
			selectedIndex: () => props.selectedIndex,
			activateOnFocus: false,
		}),
		activeLabel: () => props.activeLabel === true,
		size: () => props.size ?? sizeChoice(),
		hover,
		focusRing,
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

	const preview = createPreviewPill({
		selectedRect,
		selectedIndex: () => props.selectedIndex,
		activeIndex: hover.activeIndex,
		rectOf,
		mouseInside,
	});
	const previewMounts = () => {
		const shown = preview();
		return shown === undefined ? [] : [shown.mount];
	};

	return (
		<SubtleContext.Provider value={scope}>
			<div
				testId={props.testId}
				{...scope.tabsList.props}
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
					display: 'flex',
					flexDirection: 'row',
					userSelect: 'none',
					overflowX: 'auto',
					scrollbarWidth: 'none',
					// The padding is room for the focus ring's 2px outset inside the scroller; the margins give it back, and the max width allows for them.
					maxWidth: 'calc(100% + 8px)',
					margin: -4,
					padding: 4,
				}}
			>
				{/* The tabs and the pills sit in a box that scrolls with them: the fluid hover measures its rows against its container, so the container must move with the content, not stay at the scroller's edge. */}
				<div
					ref={hover.containerRef}
					style={{
						position: 'relative',
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
					}}
				>
					<Show when={selectedRect()}>
						{(rect: () => ItemRect) => (
							<motion.div
								testId={props.testId && `${props.testId}-selected`}
								initial={false}
								animate={rectStyle(rect())}
								transition={tween.moderate}
								style={{ position: 'absolute' }}
							>
								<motion.div
									initial={false}
									animate={{ opacity: hoveringOther() ? 0.8 : 1 }}
									transition={{ duration: 0.08 }}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										borderRadius: shape.bg,
										backgroundColor: color.active,
									}}
								/>
							</motion.div>
						)}
					</Show>
					<For each={previewMounts()}>
						{() => {
							// Born at the selected pill, as the source mounts it, then slides out to the hovered tab.
							const born = untrack(selectedRect);
							if (born === undefined)
								throw new Error('Preview pill mounted without a selected pill');
							const shown = () => {
								const pill = preview();
								if (pill === undefined)
									throw new Error('Preview pill has no state');
								return pill;
							};
							return (
								<motion.div
									testId={props.testId && `${props.testId}-preview`}
									initial={rectStyle(born)}
									animate={rectStyle(shown().rect)}
									transition={hoveringOther() ? tween.fast : tween.moderate}
									style={{ position: 'absolute' }}
								>
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: shown().visible ? 0.4 : 0 }}
										transition={{ duration: shown().visible ? 0.08 : 0.06 }}
										style={{
											position: 'absolute',
											top: 0,
											left: 0,
											right: 0,
											bottom: 0,
											borderRadius: shape.bg,
											backgroundColor: color.active,
										}}
									/>
								</motion.div>
							);
						}}
					</For>
					<FocusRing
						ring={focusRing}
						radius={shape.focusRing}
						testId={props.testId && `${props.testId}-focus-ring`}
					/>
					{props.children}
				</div>
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
	const tab = createTabsTab(scope.root, scope.tabsList, {
		value: () => props.index,
		index: () => props.index,
		// A panel is a plain component here, not registered with the root: the selected tab is the one that has it.
		controlsPanel: () => scope.root.isSelected(props.index),
	});
	const metrics = () => sizes[scope.size()];
	let element: HostElement | undefined;

	createEffect(() => {
		if (element === undefined) throw new Error('Tab is not mounted');
		scope.hover.registerItem(props.index, element);
		tab.register(element);
	});

	const isSelected = tab.isSelected;
	const isActive = () =>
		scope.hover.activeIndex() === props.index || isSelected();
	const collapsible = () => scope.activeLabel() && props.icon !== undefined;
	const showLabel = () => !collapsible() || isSelected();
	const labelTarget = () =>
		showLabel()
			? { width: 'auto' as const, marginLeft: metrics().labelGap, opacity: 1 }
			: { width: 0, marginLeft: 0, opacity: 0 };
	// Width and margin ride `spring.fast` both ways and opacity is a 0.06 tween (`registry/base/tabs-subtle.tsx:397-410`).
	const labelTransition = { ...tween.fast, opacity: { duration: 0.06 } };

	const label = (
		<StableLabel
			text={props.label}
			heavy={isSelected()}
			color={isActive() ? color.foreground : color.mutedForeground}
			textStyle={metrics().text}
			fade
			nowrap
			trim
		/>
	);

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...tab.props}
			aria-label={collapsible() && !showLabel() ? props.label : undefined}
			testId={props.testId}
			onFocus={(event: DomEvent) => {
				scope.focusRing.focus(props.index, event);
				tab.onFocus();
				scope.hover.setActiveIndex(props.index);
			}}
			onBlur={(event: DomEvent) => {
				scope.focusRing.blur(props.index);
				// Focus moving to a sibling tab stays inside the list: only a real exit drops the highlight.
				if (scope.tabsList.composite.isItem(event.relatedTarget)) return;
				if (!scope.mouseInside()) scope.hover.setActiveIndex(null);
			}}
			style={{
				position: 'relative',
				zIndex: 10,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				height: metrics().height,
				paddingLeft: metrics().padX,
				paddingRight: metrics().padX,
				gap: collapsible() || props.icon === undefined ? 0 : metrics().gap,
				borderRadius: shape.bg,
				cursor: 'pointer',
				keyboardFocusDim: false,
			}}
		>
			<Show when={props.icon}>
				{(icon: () => IconRef) => (
					<Icon
						name={icon()}
						size={metrics().icon}
						strokeWidth={isActive() ? 2 : 1.5}
						easeStroke
						fade
						color={isActive() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			{collapsible() ? (
				<motion.div
					initial={false}
					animate={labelTarget()}
					transition={labelTransition}
					style={{
						display: 'flex',
						flexDirection: 'row',
						overflow: 'hidden',
					}}
				>
					<div style={{ display: 'flex', flexDirection: 'row', flexShrink: 0 }}>
						{label}
					</div>
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
