import { type DomEvent, type HostElement, motion } from '@gpuix/solid';
import {
	createTabsList,
	createTabsPanel,
	createTabsRoot,
	createTabsTab,
	type TabsList as TabsListPrimitive,
	type TabsRoot,
} from 'base-ui-solid-gpuix/tabs';
import {
	createComputed,
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
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
	type as scale,
	shadow,
	shape,
	sizeChoice,
	motion as tween,
} from '#/lib/theme';

export type TabsSize = 'default' | 'compact';

const sizes = {
	default: { pad: 4, item: 28, gap: 8, text: scale.body, icon: 16 },
	compact: { pad: 2, item: 24, gap: 4, text: scale.bodyCompact, icon: 14 },
} as const;

// ─── State ───────────────────────────────────────────────────────────────────

interface TabsState {
	root: TabsRoot;
	size: () => TabsSize;
}

interface ListScope {
	hover: FluidHover;
	focusRing: FocusRingState;
	tabsList: TabsListPrimitive;
	mouseInside: () => boolean;
	/** A click moves the pills to the tab at once, before a controlled parent has answered. */
	moveToClicked: (index: number) => void;
}

const TabsContext = createContext<TabsState>();
const ListContext = createContext<ListScope>();

function useTabs() {
	const tabs = useContext(TabsContext);
	if (tabs === undefined) throw new Error('Must be used inside Tabs');
	return tabs;
}
function useList() {
	const list = useContext(ListContext);
	if (list === undefined)
		throw new Error('TabItem must be used inside TabsList');
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
	const state: TabsState = {
		root: createTabsRoot<string>({
			value: () => props.value,
			defaultValue: props.defaultValue,
			onValueChange: (value) => props.onValueChange?.(value),
		}),
		size: () => props.size ?? sizeChoice(),
	};
	return (
		<TabsContext.Provider value={state}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
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
	const hover = createFluidHover({ axis: 'x' });
	const focusRing = createFocusRing(hover);
	const [mouseInside, setMouseInside] = createSignal(false);
	const metrics = () => sizes[tabs.size()];

	const selectedIndex = tabs.root.selectedIndex;
	// The pills follow the clicked tab, not the resolved selection: a click moves them before a controlled parent answers, and they re-sync only when the resolved selection changes, so a parent that vetoes the click leaves them on the clicked tab (`registry/base/tabs.tsx:266-277`).
	const [pillIndex, setPillIndex] = createSignal(-1);
	createComputed(on(selectedIndex, setPillIndex));
	const tabsList = createTabsList({ selectedIndex, activateOnFocus: true });
	const scope: ListScope = {
		hover,
		focusRing,
		tabsList,
		mouseInside,
		moveToClicked: setPillIndex,
	};
	const rectOf = (index: number | null): ItemRect | undefined => {
		if (index === null || index < 0 || !hover.isMeasured()) return undefined;
		return hover.rects()[index];
	};
	const selectedRect = () => rectOf(pillIndex());
	const hoveringOther = () => {
		const active = hover.activeIndex();
		return active !== null && active !== pillIndex();
	};

	const preview = createPreviewPill({
		selectedRect,
		selectedIndex: pillIndex,
		activeIndex: hover.activeIndex,
		rectOf,
		mouseInside,
	});
	const previewMounts = () => {
		const shown = preview();
		return shown === undefined ? [] : [shown.mount];
	};

	return (
		<ListContext.Provider value={scope}>
			<div
				testId={props.testId}
				{...tabsList.props}
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
					position: 'relative',
					alignSelf: 'flex-start',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					padding: metrics().pad,
					borderRadius: shape.container,
					backgroundColor: color.muted,
					userSelect: 'none',
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
								// Dims while another tab is hovered: the selection reads as "current", the preview as "next".
								animate={{ opacity: hoveringOther() ? 0.85 : 1 }}
								transition={{ duration: 0.08 }}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									right: 0,
									bottom: 0,
									borderRadius: shape.bg,
									backgroundColor: color.surface4,
									boxShadow: shadow(4),
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
								// The preview keeps up with the pointer on fast; its way home takes the moderate spring.
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
										backgroundColor: color.hover,
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
	const tab = createTabsTab(tabs.root, list.tabsList, {
		value: () => props.value,
		disabled: () => props.disabled,
		onClick: list.moveToClicked,
	});
	const index = tab.index();
	let element: HostElement | undefined;
	const metrics = () => sizes[tabs.size()];

	createEffect(() => {
		if (element === undefined) throw new Error('Tab is not mounted');
		list.hover.registerItem(index, element);
		tab.register(element);
	});

	const isSelected = tab.isSelected;
	const isActive = () => list.hover.activeIndex() === index || isSelected();

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...tab.props}
			testId={props.testId}
			onFocus={(event: DomEvent) => {
				list.focusRing.focus(index, event);
				list.hover.setActiveIndex(index);
				tab.onFocus();
			}}
			onBlur={(event: DomEvent) => {
				list.focusRing.blur(index);
				// Focus moving to a sibling tab stays inside the list: only a real exit drops the highlight.
				if (list.tabsList.composite.isItem(event.relatedTarget)) return;
				if (!list.mouseInside()) list.hover.setActiveIndex(null);
			}}
			style={{
				position: 'relative',
				zIndex: 10,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				height: metrics().item,
				paddingLeft: 12,
				paddingRight: 12,
				gap: props.icon === undefined ? 0 : metrics().gap,
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
			<StableLabel
				text={props.label}
				heavy={isSelected()}
				color={isActive() ? color.foreground : color.mutedForeground}
				textStyle={metrics().text}
				fade
				nowrap
				trim
			/>
		</div>
	);
}

// ─── Panel ───────────────────────────────────────────────────────────────────

export function TabPanel(props: { value: string; children: JSX.Element }) {
	const tabs = useTabs();
	return (
		<Show when={tabs.root.isSelected(props.value)}>
			<MountedPanel value={props.value}>{props.children}</MountedPanel>
		</Show>
	);
}

function MountedPanel(props: { value: string; children: JSX.Element }) {
	const tabs = useTabs();
	const panel = createTabsPanel(tabs.root, { value: () => props.value });
	return (
		// The dim is off because FF draws no ring on the panel's focus.
		<div {...panel.props} style={{ keyboardFocusDim: false }}>
			{props.children}
		</div>
	);
}
