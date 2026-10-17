import {
	type DomEvent,
	type HostDomEvent,
	type HostElement,
	type HostMouseEvent,
	type KeyEvent,
	motion,
} from '@gpuix/solid';
import {
	createPlacementState,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import {
	createMenuList,
	createMenuRoot,
	createMenuSubmenuRoot,
	createMenuSubmenuTrigger,
	createMenuTrigger,
	type MenuRoot,
	type MenuRow,
	type MenuSubmenuHost,
	type MenuSubmenuRoot,
	type MenuTriggerState,
} from 'base-ui-solid-gpuix/menu';
import {
	type Accessor,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import {
	createFluidHover,
	createReflowGate,
	type FluidHover,
	type ItemRect,
} from '#/lib/fluid-hover';
import type { IconRef } from '#/lib/icons';
import { PopupSurface } from '#/lib/popup';
import { POPUP_EXIT_MS } from '#/lib/popup-timing';
import { color, radius, shadow, motion as tween } from '#/lib/theme';
import {
	type DropdownSearchHost,
	DropdownSearchHostContext,
	type DropdownSearchProps,
	SEARCH_HEIGHT,
	SearchField,
} from './dropdown-search';
import {
	DropdownContext,
	type DropdownContextValue,
	MenuItem,
} from './menu-item';

export { DropdownEmpty, DropdownSearch } from './dropdown-search';
export { DropdownLabel, DropdownSeparator, MenuItem } from './menu-item';

const PANEL_WIDTH = 288;
const SUB_WIDTH = 224;
const POPUP_MAX_HEIGHT = 480;
const PADDING = 4;
/** Distance from the trigger row to its submenu. The row sits inside the popup's padding, so this leaves a 2px gap between the surfaces. */
const SUBMENU_SIDE_OFFSET = 6;
/** Pulls the submenu up by the popup's padding so its first row is level with the trigger. */
const SUBMENU_ALIGN_OFFSET = -PADDING;
const HOVER_OPEN_MS = 100;
/** FF focuses the first row two frames after a pointer open, once Base UI's own open focus has landed on the popup. */
const OPEN_FOCUS_MS = 32;

type LitBy = 'open' | 'pointer' | 'keyboard';

/** Rows that are one contiguous run of checked indices share one background. */
interface Run {
	id: number;
	start: number;
	end: number;
}

interface RunState {
	runs: Run[];
	/** Every id ever handed out: a run that is gone fades out in place. */
	ids: number[];
	byRow: Map<number, number>;
	lastId: number;
}

/**
 * Groups sorted row indices into contiguous runs and ids them against the
 * previous grouping: a run reuses the id of the first of its rows that had
 * one, unless an earlier run already took it.
 */
function assignRuns(sorted: readonly number[], previous: RunState): RunState {
	const spans: { start: number; end: number }[] = [];
	for (const index of sorted) {
		const last = spans[spans.length - 1];
		if (last !== undefined && index === last.end + 1) last.end = index;
		else spans.push({ start: index, end: index });
	}
	const used = new Set<number>();
	const byRow = new Map<number, number>();
	let lastId = previous.lastId;
	const ids = [...previous.ids];
	const runs = spans.map((span) => {
		let id: number | undefined;
		for (let row = span.start; row <= span.end; row++) {
			const earlier = previous.byRow.get(row);
			if (earlier !== undefined && !used.has(earlier)) {
				id = earlier;
				break;
			}
		}
		if (id === undefined) {
			lastId += 1;
			id = lastId;
			ids.push(id);
		}
		used.add(id);
		for (let row = span.start; row <= span.end; row++) byRow.set(row, id);
		return { id, ...span };
	});
	return { runs, ids, byRow, lastId };
}

// ─── The rows' shared body ───────────────────────────────────────────────────

/** The container every menu's rows live in, with the three layers that paint under them. */
function MenuBody(props: {
	hover: FluidHover;
	checkedIndex: Accessor<number | undefined>;
	checkedIndices: Accessor<readonly number[] | undefined>;
	litBy: Accessor<LitBy>;
	/** `false` snaps the layers: a reflow moved the rows, not the pointer. */
	travel: Accessor<boolean>;
	/** The keyboard ring of the inline panel. */
	focusIndex?: Accessor<number | null>;
	focusRingTestId?: string;
	paddingTop?: number;
	handlers: {
		onMouseEnter: () => void;
		onMouseMove: (event: HostMouseEvent) => void;
		onMouseLeave: () => void;
	};
	children: JSX.Element;
}) {
	const rectOf = (index: number | null | undefined) => {
		if (index === null || index === undefined || !props.hover.isMeasured()) {
			return null;
		}
		return props.hover.rects()[index] ?? null;
	};
	const checkedRect = () => {
		if (props.checkedIndices() !== undefined) return null;
		return rectOf(props.checkedIndex());
	};
	const hoverRect = () => rectOf(props.hover.activeIndex());

	const runState = createMemo<RunState>(
		(previous) => {
			const indices = props.checkedIndices();
			const sorted =
				indices === undefined ? [] : [...indices].sort((a, b) => a - b);
			return assignRuns(sorted, previous);
		},
		{ runs: [], ids: [], byRow: new Map(), lastId: 0 },
	);
	const runRect = (id: number): ItemRect | null => {
		const run = runState().runs.find((candidate) => candidate.id === id);
		if (run === undefined) return null;
		const first = rectOf(run.start);
		const last = rectOf(run.end);
		if (first === null || last === null) return null;
		return {
			top: first.top,
			left: first.left,
			width: first.width,
			height: last.top + last.height - first.top,
		};
	};
	const focusRect = () => {
		if (props.focusIndex === undefined) return null;
		return rectOf(props.focusIndex());
	};

	return (
		<div
			ref={props.hover.containerProps.ref}
			onMouseEnter={props.handlers.onMouseEnter}
			onMouseMove={props.handlers.onMouseMove}
			onMouseLeave={props.handlers.onMouseLeave}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				padding: PADDING,
				paddingTop: props.paddingTop ?? PADDING,
			}}
		>
			<FluidHighlight
				rect={checkedRect}
				session={() => 0}
				radius={radius.item}
				background={color.active}
				glide={tween.moderate}
				fade={tween.moderateExit}
				travel={props.travel}
			/>
			<For each={runState().ids}>
				{(id) => (
					<FluidHighlight
						rect={() => runRect(id)}
						session={() => 0}
						radius={radius.item}
						background={color.active}
						glide={tween.moderate}
						fade={tween.moderateExit}
						travel={props.travel}
					/>
				)}
			</For>
			<FluidHighlight
				rect={hoverRect}
				session={props.hover.session}
				from={() => (props.litBy() === 'pointer' ? checkedRect() : null)}
				radius={radius.item}
				background={color.hover}
				travel={props.travel}
			/>
			<Show when={focusRect()}>
				{(rect: Accessor<ItemRect>) => (
					<motion.div
						testId={props.focusRingTestId}
						initial={false}
						animate={{
							left: rect().left - 2,
							top: rect().top - 2,
							width: rect().width + 4,
							height: rect().height + 4,
						}}
						transition={tween.fast}
						style={{
							position: 'absolute',
							borderRadius: radius.focusRing,
							borderStyle: 'solid',
							borderWidth: 1,
							borderColor: color.focusRing,
							pointerEvents: 'none',
						}}
					/>
				)}
			</Show>
			{props.children}
		</div>
	);
}

// ─── Keyboard and hover for one list of rows ─────────────────────────────────

const SubmenuHostContext = createContext<MenuSubmenuHost>();

/** Binds the Menu list primitive to FF's fluid hover: the hover owns the lit row, and a key moving it forgets the pointer. */
function createDropdownList(options: {
	/** The list is on screen and not fading out. */
	open: Accessor<boolean>;
	mounted: Accessor<boolean>;
	closeAll: () => void;
	/** Escape: the whole menu for a root, one level for a submenu. */
	closeSelf: () => void;
	isSub: boolean;
	checkedIndex: Accessor<number | undefined>;
	multiple: Accessor<boolean>;
	keyboardActive: Accessor<boolean>;
	setKeyboardActive: (active: boolean) => void;
	/** Tab closes the whole menu; the key handler decides whether focus moves on from the trigger. */
	leave: () => void;
	/** Which end an open lights: ArrowUp on the trigger opens on the last row. */
	openFrom: Accessor<'first' | 'last'>;
}) {
	const menu = useMenuScope();
	const hover = createFluidHover({
		isItemDisabled: (index) =>
			list.itemHost.rows.get(index)?.disabled() === true,
	});
	const reflow = createReflowGate();
	const list = createMenuList<DropdownSearchProps>({
		open: options.open,
		mounted: options.mounted,
		closeAll: options.closeAll,
		closeSelf: options.closeSelf,
		isSub: options.isSub,
		multiple: options.multiple,
		keyboardActive: options.keyboardActive,
		setKeyboardActive: options.setKeyboardActive,
		leave: options.leave,
		openFrom: options.openFrom,
		pressPick: menu.pressPick,
		releasePress: menu.releasePress,
		highlightedIndex: hover.activeIndex,
		onHighlightChange(index, reason) {
			if (reason === 'keyboard' || reason === 'typeahead') {
				hover.releasePointer();
			}
			hover.setActiveIndex(index);
		},
		rowRect: (index) => hover.rects()[index],
		revealPadding: PADDING,
		searchHeight: SEARCH_HEIGHT,
		pointer: hover.handlers,
		openFocusMs: OPEN_FOCUS_MS,
		onRowsChanged: reflow.raise,
	});

	const context: DropdownContextValue = {
		...list.itemHost,
		hover,
		checkedIndex: options.checkedIndex,
	};

	return {
		hover,
		context,
		litBy: list.litBy,
		travel: () => !reflow.reflowing(),
		search: list.search,
		searchHost: list.searchHost,
		submenuHost: list.submenuHost,
		handlers: list.handlers,
		popupProps: list.popupProps,
		lightFirst: list.lightFirst,
		setScroller: list.setScroller,
		setPanel: list.setPanel,
		setField: list.setField,
		containsFocus: list.containsFocus,
	};
}

type MenuList = ReturnType<typeof createDropdownList>;

/** The search field row, the scroller and the rows: what a popup holds. */
function MenuPanel(props: {
	id: string;
	/** The `id` of the element that opens this menu. */
	labelledBy: string;
	list: MenuList;
	checkedIndex: Accessor<number | undefined>;
	checkedIndices: Accessor<readonly number[] | undefined>;
	maxHeight: Accessor<number>;
	testId?: string;
	searchTestId?: string;
	children: JSX.Element;
}) {
	const list = props.list;
	const field = () => list.search();
	return (
		<DropdownContext.Provider value={list.context}>
			<DropdownSearchHostContext.Provider value={list.searchHost}>
				<SubmenuHostContext.Provider value={list.submenuHost}>
					<div
						ref={(element) => {
							list.setPanel(element);
						}}
						{...list.popupProps({ id: props.id, labelledBy: props.labelledBy })}
						testId={props.testId}
						style={{
							display: 'flex',
							flexDirection: 'column',
							keyboardFocusDim: false,
						}}
					>
						<div
							ref={(element) => {
								list.setScroller(element);
							}}
							onScroll={list.hover.handlers.onScroll}
							style={{
								display: 'flex',
								flexDirection: 'column',
								overflowY: 'scroll',
								maxHeight: props.maxHeight(),
							}}
						>
							<Show when={field()}>
								{(search: Accessor<DropdownSearchProps>) => (
									<SearchField
										sticky
										search={search()}
										testId={props.searchTestId}
										fieldRef={list.setField}
									/>
								)}
							</Show>
							<MenuBody
								hover={list.hover}
								checkedIndex={props.checkedIndex}
								checkedIndices={props.checkedIndices}
								litBy={list.litBy}
								travel={list.travel}
								paddingTop={field() === undefined ? PADDING : 2}
								handlers={list.handlers}
							>
								{props.children}
							</MenuBody>
						</div>
					</div>
				</SubmenuHostContext.Provider>
			</DropdownSearchHostContext.Provider>
		</DropdownContext.Provider>
	);
}

// ─── Dropdown (inline panel) ─────────────────────────────────────────────────

/**
 * An always-rendered panel: no trigger, positioning or dismissal. Its rows are
 * the focus targets, with one tab stop (the checked row, else the first one that
 * can be picked); the arrows move focus and a ring follows it when the focus is
 * keyboard-visible.
 */
export function Dropdown(props: {
	checkedIndex?: number;
	/** Rows become checkboxes, and touching picks share one background. */
	checkedIndices?: readonly number[];
	testId?: string;
	children: JSX.Element;
}) {
	const rows = new Map<number, MenuRow>();
	const [rowsVersion, setRowsVersion] = createSignal(0);
	const listId = createUniqueId();
	const hover = createFluidHover({
		isItemDisabled: (index) => rows.get(index)?.disabled() === true,
	});
	const [focused, setFocused] = createSignal<number | null>(null);
	const [ringShown, setRingShown] = createSignal(false);
	const [litBy, setLitBy] = createSignal<LitBy>('pointer');

	/** Arrows land on disabled rows too, as FF's panel focuses every row; only activation refuses them. */
	const all = () => [...rows.keys()].sort((a, b) => a - b);
	/** Tab lands on the checked row, else the first one that can be picked. */
	const entryRow = () => {
		rowsVersion();
		const checked = props.checkedIndex ?? props.checkedIndices?.[0];
		if (checked !== undefined && rows.get(checked)?.disabled() === false) {
			return checked;
		}
		return all().find((index) => rows.get(index)?.disabled() === false);
	};

	const context: DropdownContextValue = {
		hover,
		checkedIndex: () => props.checkedIndex,
		multiple: () => props.checkedIndices !== undefined,
		rows,
		rowId: (index) => `${listId}-row-${index}`,
		rowTabIndex: (index) => (entryRow() === index ? 0 : -1),
		rowFocused(index, focusVisible) {
			setLitBy(focusVisible ? 'keyboard' : 'pointer');
			hover.setActiveIndex(index);
			setFocused(index);
			setRingShown(focusVisible);
		},
		rowsChanged: () => setRowsVersion((version) => version + 1),
		pointerLit: () => true,
		close: () => {},
		pressPick: () => false,
		releasePress: () => {},
	};

	const focusRow = (index: number | undefined) => {
		if (index !== undefined) rows.get(index)?.focus();
	};
	const step = (delta: 1 | -1) => {
		const current = focused();
		if (current === null) return;
		const indices = all();
		const position = indices.indexOf(current);
		if (position === -1) return;
		focusRow(indices[(position + delta + indices.length) % indices.length]);
	};
	const [search, setSearch] = createSignal<DropdownSearchProps>();
	let field: HostElement | undefined;
	const searchHost: DropdownSearchHost = {
		register(props) {
			setSearch(props);
			return () => {
				if (search() === props) setSearch(undefined);
			};
		},
	};
	const onKeyDown = (event: KeyEvent) => {
		// The field's keys are its own, apart from the arrows, which leave it for the rows.
		if (field !== undefined && event.target === field) {
			if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
				event.preventDefault();
				focusRow(event.key === 'ArrowDown' ? all()[0] : all().at(-1));
			}
			return;
		}
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				event.preventDefault();
				step(1);
				return;
			case 'ArrowUp':
			case 'ArrowLeft':
				event.preventDefault();
				step(-1);
				return;
			case 'Home':
				event.preventDefault();
				focusRow(all()[0]);
				return;
			case 'End':
				event.preventDefault();
				focusRow(all().at(-1));
				return;
			case 'Enter':
			case ' ': {
				event.preventDefault();
				const index = focused();
				if (index !== null) rows.get(index)?.activate();
				return;
			}
		}
	};

	return (
		<DropdownContext.Provider value={context}>
			<DropdownSearchHostContext.Provider value={searchHost}>
				<div
					testId={props.testId}
					id={listId}
					role="group"
					onKeyDown={onKeyDown}
					onFocusOut={(event: DomEvent) => {
						const next = event.relatedTarget;
						if (
							next !== null &&
							[...rows.values()].some((row) => row.element() === next)
						) {
							return;
						}
						setFocused(null);
						setRingShown(false);
						hover.setActiveIndex(null);
					}}
					style={{
						width: PANEL_WIDTH,
						flexShrink: 0,
						display: 'flex',
						flexDirection: 'column',
						backgroundColor: color.card,
						borderRadius: radius.container,
						boxShadow: shadow(3),
						keyboardFocusDim: false,
					}}
				>
					<Show when={search()}>
						{(query: Accessor<DropdownSearchProps>) => (
							<SearchField
								sticky={false}
								search={query()}
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-field`
								}
								fieldRef={(element) => {
									field = element;
								}}
							/>
						)}
					</Show>
					<MenuBody
						hover={hover}
						checkedIndex={() => props.checkedIndex}
						checkedIndices={() => props.checkedIndices}
						litBy={litBy}
						travel={() => true}
						paddingTop={search() === undefined ? undefined : 2}
						focusIndex={() => (ringShown() ? focused() : null)}
						focusRingTestId={
							props.testId === undefined ? undefined : `${props.testId}-ring`
						}
						handlers={{
							onMouseEnter() {
								setLitBy('pointer');
								setRingShown(false);
								hover.handlers.onMouseEnter();
							},
							onMouseMove(event) {
								setRingShown(false);
								hover.handlers.onMouseMove(event);
							},
							onMouseLeave: hover.handlers.onMouseLeave,
						}}
					>
						{props.children}
					</MenuBody>
				</div>
			</DropdownSearchHostContext.Provider>
		</DropdownContext.Provider>
	);
}

// ─── DropdownMenu (popup root) ───────────────────────────────────────────────

interface MenuScope extends MenuRoot {
	/** `<testId>-popup`: the panel that holds focus while no row does. */
	popupTestId: string | undefined;
	/** `<testId>-field`: the search field, when the popup has one. */
	searchTestId: string | undefined;
}

const MenuScopeContext = createContext<MenuScope>();

function useMenuScope() {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) {
		throw new Error('Dropdown parts must be inside a DropdownMenu');
	}
	return scope;
}

export type DropdownTriggerState = MenuTriggerState;

export function DropdownMenu(props: {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	testId?: string;
	children: JSX.Element;
}) {
	const root = createMenuRoot(props, { exitMs: POPUP_EXIT_MS });
	const scope: MenuScope = {
		...root,
		popupTestId:
			props.testId === undefined ? undefined : `${props.testId}-popup`,
		searchTestId:
			props.testId === undefined ? undefined : `${props.testId}-field`,
	};

	return (
		<MenuScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				onKeyDown={root.onKeyDown}
				onMouseDownOutside={root.onMouseDownOutside}
				style={{
					position: 'relative',
					display: 'flex',
					flexShrink: 0,
					opacity: props.disabled === true ? 0.5 : 1,
				}}
			>
				{props.children}
			</div>
		</MenuScopeContext.Provider>
	);
}

/** Calls its child with the handlers to put on whatever element should open the menu. */
export function DropdownTrigger(props: {
	children: (trigger: DropdownTriggerState) => JSX.Element;
}) {
	return props.children(createMenuTrigger(useMenuScope()));
}

export function DropdownContent(props: {
	checkedIndex?: number;
	/** Rows become checkboxes that keep the menu open, and touching picks share one background. */
	checkedIndices?: readonly number[];
	/** Which edge of the trigger the popup lines up with. */
	align?: 'start' | 'end';
	children: JSX.Element;
}) {
	const scope = useMenuScope();
	const list = createDropdownList({
		open: scope.presence.open,
		mounted: scope.presence.mounted,
		closeAll: () => scope.setOpen(false),
		closeSelf: () => scope.setOpen(false),
		isSub: false,
		checkedIndex: () => props.checkedIndex,
		multiple: () => props.checkedIndices !== undefined,
		keyboardActive: scope.keyboardActive,
		setKeyboardActive: scope.setKeyboardActive,
		openFrom: scope.openFrom,
		leave: scope.leave,
	});
	scope.watchPopupFocus(list.containsFocus);

	return (
		<PopupSurface
			presence={scope.presence}
			align={props.align ?? 'start'}
			width={PANEL_WIDTH}
			maxHeight={POPUP_MAX_HEIGHT}
			onDismiss={() => scope.setOpen(false)}
		>
			{(maxHeight) => (
				<MenuPanel
					id={scope.popupId}
					labelledBy={scope.triggerId}
					list={list}
					testId={scope.popupTestId}
					searchTestId={scope.searchTestId}
					checkedIndex={() => props.checkedIndex}
					checkedIndices={() => props.checkedIndices}
					maxHeight={maxHeight}
				>
					{props.children}
				</MenuPanel>
			)}
		</PopupSurface>
	);
}

// ─── Submenus ────────────────────────────────────────────────────────────────

interface SubContentProps {
	checkedIndex?: number;
	checkedIndices?: readonly number[];
	children: JSX.Element;
}

interface SubScope extends MenuSubmenuRoot {
	content: Accessor<SubContentProps | undefined>;
	setContent: (props: SubContentProps | undefined) => void;
}

const SubScopeContext = createContext<SubScope>();

function useSubScope() {
	const scope = useContext(SubScopeContext);
	if (scope === undefined) {
		throw new Error('Submenu parts must be inside a DropdownSub');
	}
	return scope;
}

/** A trigger row and its content, which anchors to that row. */
export function DropdownSub(props: {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children: JSX.Element;
}) {
	const [content, setContent] = createSignal<SubContentProps>();
	const scope: SubScope = {
		...createMenuSubmenuRoot(props, { exitMs: POPUP_EXIT_MS }),
		content,
		setContent,
	};
	return (
		<SubScopeContext.Provider value={scope}>
			{props.children}
		</SubScopeContext.Provider>
	);
}

export function DropdownSubTrigger(props: {
	index: number;
	label: string;
	icon?: IconRef;
	disabled?: boolean;
	testId?: string;
}) {
	const sub = useSubScope();
	const parent = useContext(DropdownContext);
	const host = useContext(SubmenuHostContext);
	const menu = useMenuScope();
	if (parent === undefined || host === undefined) {
		throw new Error('DropdownSubTrigger must be inside a DropdownContent');
	}
	const placement = createPlacementState('right');
	const trigger = createMenuSubmenuTrigger({
		sub,
		host,
		parent: {
			highlightedIndex: parent.hover.activeIndex,
			pointerLit: parent.pointerLit,
		},
		props,
		triggerElement: () => parent.rows.get(props.index)?.element(),
		side: placement.side,
		setKeyboardActive: menu.setKeyboardActive,
		hoverOpenMs: HOVER_OPEN_MS,
	});

	return (
		<MenuItem
			index={props.index}
			label={props.label}
			icon={props.icon}
			disabled={props.disabled}
			testId={props.testId}
			chevron
			submenu={{ open: sub.open(), popupId: sub.popupId }}
			closeOnClick={false}
			onSelect={trigger.onSelect}
			onOpenSubmenu={trigger.onOpenSubmenu}
			onMouseLeave={trigger.onMouseLeave}
		>
			<Show when={sub.presence.mounted()}>
				<SubPopup
					triggerId={parent.rowId(props.index)}
					placement={placement}
					popup={trigger.popup}
					focusTrigger={() => parent.rows.get(props.index)?.focus()}
				/>
			</Show>
		</MenuItem>
	);
}

/** Collects the content's props; the popup itself is drawn by the trigger, whose row it anchors to. */
export function DropdownSubContent(props: SubContentProps) {
	const sub = useSubScope();
	createEffect(() => {
		sub.setContent(props);
		onCleanup(() => sub.setContent(undefined));
	});
	return null;
}

const stopPropagation = (event: HostDomEvent) => event.stopPropagation();

function SubPopup(props: {
	triggerId: string;
	/** The side the popup landed on, which the trigger's safe polygon reads. */
	placement: ReturnType<typeof createPlacementState>;
	popup: ReturnType<typeof createMenuSubmenuTrigger>['popup'];
	/** Escape and Left hand focus back to the row that opened this submenu. */
	focusTrigger: () => void;
}) {
	const sub = useSubScope();
	const menu = useMenuScope();
	const content = () => {
		const props = sub.content();
		if (props === undefined)
			throw new Error('DropdownSub has no DropdownSubContent');
		return props;
	};
	const list = createDropdownList({
		open: sub.open,
		mounted: sub.presence.mounted,
		closeAll: () => menu.setOpen(false),
		closeSelf() {
			sub.setOpen(false);
			props.focusTrigger();
		},
		isSub: true,
		checkedIndex: () => content().checkedIndex,
		multiple: () => content().checkedIndices !== undefined,
		keyboardActive: menu.keyboardActive,
		setKeyboardActive: menu.setKeyboardActive,
		openFrom: () => 'first',
		leave: menu.leave,
	});

	// Right / Enter on an already open (hover-opened) submenu goes in: light its first row.
	createEffect(
		on(
			sub.entered,
			(entered) => {
				if (entered) list.lightFirst();
			},
			{ defer: true },
		),
	);
	const placement = props.placement;
	const maxHeight = () => placement.maxHeight(POPUP_MAX_HEIGHT);

	return (
		// The layer fills the trigger row so the popup anchors to it, and takes no flex slot or mouse of its own.
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				pointerEvents: 'none',
			}}
		>
			<anchored
				side="right"
				align="start"
				gap={SUBMENU_SIDE_OFFSET}
				offset={{ x: 0, y: SUBMENU_ALIGN_OFFSET }}
				fit="flip"
				snapMargin={POPUP_MARGIN}
				onPlacement={placement.onPlacement}
				deferred
				priority={2}
				style={{ backgroundColor: color.transparent }}
			>
				<motion.div
					ref={props.popup.ref}
					{...props.popup.props}
					initial={{ opacity: 0 }}
					animate={{ opacity: sub.open() ? 1 : 0 }}
					transition={sub.open() ? tween.fast : tween.fastExit}
					// The panel is a child of the trigger row, so its events would bubble into the row and the parent menu behind it.
					onMouseDown={stopPropagation}
					onMouseUp={stopPropagation}
					onClick={stopPropagation}
					onMouseMove={stopPropagation}
					style={{
						// The layer around the anchored popup is `none`, which inherits.
						pointerEvents: 'auto',
						position: 'relative',
						width: SUB_WIDTH,
						display: 'flex',
						flexDirection: 'column',
						backgroundColor: color.card,
						borderRadius: radius.container,
						boxShadow: shadow(3),
						overflow: 'hidden',
						maxHeight: maxHeight(),
					}}
				>
					<MenuPanel
						id={sub.popupId}
						labelledBy={props.triggerId}
						list={list}
						checkedIndex={() => content().checkedIndex}
						checkedIndices={() => content().checkedIndices}
						maxHeight={maxHeight}
					>
						{content().children}
					</MenuPanel>
				</motion.div>
			</anchored>
		</div>
	);
}
