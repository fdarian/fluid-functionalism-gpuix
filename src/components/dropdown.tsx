import {
	type EventPayload,
	type HostDomEvent,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	batch,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	on,
	onCleanup,
	onMount,
	Show,
	untrack,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import {
	createFluidHover,
	createReflowGate,
	type FluidHover,
	type ItemRect,
} from "../lib/fluid-hover";
import type { IconRef } from "../lib/icons";
import { isChord, moveIndex, revealRow } from "../lib/list-nav";
import { createPlacementState, POPUP_MARGIN, PopupSurface } from "../lib/popup";
import { createPressToggle, returnFocusTo } from "../lib/popup-trigger";
import { createPresence } from "../lib/presence";
import { color, radius, shadow3, motion as tween } from "../lib/theme";
import { createTypeahead } from "../lib/typeahead";
import {
	DropdownSearchHostContext,
	type DropdownSearchProps,
	SEARCH_HEIGHT,
	SearchField,
} from "./dropdown-search";
import {
	DropdownContext,
	type DropdownContextValue,
	MenuItem,
	type MenuRow,
} from "./menu-item";

export { DropdownEmpty, DropdownSearch } from "./dropdown-search";
export { DropdownLabel, DropdownSeparator, MenuItem } from "./menu-item";

const PANEL_WIDTH = 288;
const SUB_WIDTH = 224;
const POPUP_MAX_HEIGHT = 480;
const PADDING = 4;
/** Distance from the trigger row to its submenu. The row sits inside the popup's padding, so this leaves a 2px gap between the surfaces. */
const SUBMENU_SIDE_OFFSET = 6;
/** Pulls the submenu up by the popup's padding so its first row is level with the trigger. */
const SUBMENU_ALIGN_OFFSET = -PADDING;
const HOVER_OPEN_MS = 100;
/** A pointer that stops on another row for this long leaves an open submenu. */
const SUBMENU_DWELL_MS = 120;

type LitBy = "open" | "pointer" | "keyboard";

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
		onMouseMove: (event: EventPayload) => void;
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
				position: "relative",
				display: "flex",
				flexDirection: "column",
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
				from={() => (props.litBy() === "pointer" ? checkedRect() : null)}
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
							position: "absolute",
							borderRadius: radius.focusRing,
							borderWidth: 1,
							borderColor: color.focusRing,
							pointerEvents: "none",
						}}
					/>
				)}
			</Show>
			{props.children}
		</div>
	);
}

// ─── Keyboard and hover for one list of rows ─────────────────────────────────

type KeyHandler = (event: KeyEvent) => void;

interface KeyTarget {
	onKey: KeyHandler;
	activeRowId: Accessor<string | undefined>;
}

interface SubmenuHost {
	openIndex: Accessor<number | null>;
	setOpenIndex: (index: number | null) => void;
}

const SubmenuHostContext = createContext<SubmenuHost>();

function createMenuList(options: {
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
	/** Tab: close the whole menu and let focus move on. */
	leave: () => void;
	/** Which end an open lights: ArrowUp on the trigger opens on the last row. */
	openFrom: Accessor<"first" | "last">;
}) {
	const menu = useMenuScope();
	const rows = new Map<number, MenuRow>();
	const listId = createUniqueId();
	const hover = createFluidHover({
		isItemDisabled: (index) => rows.get(index)?.disabled() === true,
	});
	const [litBy, setLitBy] = createSignal<LitBy>("open");
	const reflow = createReflowGate();
	const [search, setSearch] = createSignal<DropdownSearchProps>();
	const [openSubIndex, setOpenSubIndex] = createSignal<number | null>(null);
	let scroller: HostElement | undefined;
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let lastMove: EventPayload | undefined;
	let lastSearch: DropdownSearchProps | undefined;
	onCleanup(() => {
		clearTimeout(dwellTimer);
		typeahead.reset();
	});

	const sortedRows = () => [...rows.entries()].sort((a, b) => a[0] - b[0]);
	/** Base UI lets the keyboard land on a disabled row: only activation refuses it. */
	const allRows = () => sortedRows().map((entry) => entry[0]);
	/** Where a fresh open starts: the first row that can be picked. */
	const enabledRows = () =>
		sortedRows()
			.filter((entry) => !entry[1].disabled())
			.map((entry) => entry[0]);

	const revealIndex = (index: number) => {
		const row = hover.rects()[index];
		if (scroller === undefined || row === undefined) return;
		revealRow(scroller, row, "nearest", PADDING);
	};

	const highlight = (index: number | null) => {
		setLitBy("keyboard");
		hover.setActiveIndex(index);
		if (index !== null) revealIndex(index);
	};

	/** The field is a stop of its own, before the first row. */
	const move = (delta: 1 | -1) => {
		const stops: (number | null)[] = [
			...(search() === undefined ? [] : [null]),
			...allRows(),
		];
		if (stops.length === 0) return;
		const position = stops.indexOf(hover.activeIndex());
		const next = moveIndex(
			position === -1 ? null : position,
			delta,
			stops.length,
		);
		if (next !== null) highlight(stops[next]);
	};

	const activateActive = () => {
		const index = hover.activeIndex();
		if (index === null) return;
		rows.get(index)?.activate();
	};

	const typeahead = createTypeahead({
		labels: () => {
			const last = allRows().at(-1);
			return Array.from(
				{ length: last === undefined ? 0 : last + 1 },
				(_, index) => rows.get(index)?.label,
			);
		},
		current: () => hover.activeIndex(),
		onMatch: highlight,
	});

	const onKey: KeyHandler = (event) => {
		const typing = search() !== undefined;
		// In the source a lit row holds real focus, so Space, Home and End act on it;
		// here the field keeps focus, so they only belong to the field while no row is lit.
		const fieldOwnsKey = typing && hover.activeIndex() === null;
		if (event.key === "Escape") {
			// The window-level dismiss stack must not also close the whole menu.
			event.preventDefault();
			event.stopPropagation();
			options.closeSelf();
			return;
		}
		if (event.key === "Tab") {
			options.leave();
			return;
		}
		if (isChord(event)) return;
		if (!typing && typeahead.handleKey(event)) {
			event.stopPropagation();
			return;
		}
		switch (event.key) {
			case "ArrowDown":
				event.stopPropagation();
				move(1);
				return;
			case "ArrowUp":
				event.stopPropagation();
				move(-1);
				return;
			case "Home":
				if (fieldOwnsKey) return;
				event.stopPropagation();
				event.preventDefault();
				highlight(allRows()[0] ?? null);
				return;
			case "End":
				if (fieldOwnsKey) return;
				event.stopPropagation();
				event.preventDefault();
				highlight(allRows().at(-1) ?? null);
				return;
			case "Enter":
				event.preventDefault();
				activateActive();
				return;
			case " ":
				if (fieldOwnsKey) return;
				if (typing) event.preventDefault();
				activateActive();
				return;
			case "ArrowRight": {
				const index = hover.activeIndex();
				if (index !== null) rows.get(index)?.openSubmenu?.();
				return;
			}
			case "ArrowLeft":
				if (options.isSub) {
					event.stopPropagation();
					options.closeSelf();
				}
				return;
		}
	};

	// While a submenu is open the trigger stays lit whatever row the pointer
	// crosses on its way there; only a pointer that settles on another row
	// takes the highlight, and the submenu goes with it.
	const handlers = {
		onMouseEnter() {
			setLitBy("pointer");
			options.setKeyboardActive(false);
			if (openSubIndex() === null) hover.handlers.onMouseEnter();
		},
		onMouseMove(event: EventPayload) {
			setLitBy("pointer");
			options.setKeyboardActive(false);
			if (openSubIndex() === null) {
				hover.handlers.onMouseMove(event);
				return;
			}
			lastMove = event;
			clearTimeout(dwellTimer);
			dwellTimer = setTimeout(() => {
				if (lastMove === undefined) return;
				hover.handlers.onMouseMove(lastMove);
			}, SUBMENU_DWELL_MS);
		},
		onMouseLeave() {
			clearTimeout(dwellTimer);
			// Base UI resets the highlight on pointer leave only while the pointer was the last
			// thing used: closing a submenu under a resting pointer reports a leave too.
			if (litBy() === "keyboard") return;
			if (openSubIndex() === null) hover.handlers.onMouseLeave();
		},
	};

	const context: DropdownContextValue = {
		hover,
		checkedIndex: options.checkedIndex,
		multiple: options.multiple,
		rows,
		rowId: (index) => `${listId}-row-${index}`,
		pointerLit: () => litBy() === "pointer",
		rowsChanged() {
			if (!options.mounted()) return;
			reflow.raise();
		},
		close: options.closeAll,
		pressPick: menu.pressPick,
		releasePress: menu.releasePress,
	};

	// Open ready to act: the first row is lit, unless a search field takes the keyboard.
	createEffect(
		on(options.open, (isOpen) => {
			if (!isOpen) return;
			setLitBy("open");
			setTimeout(() => {
				if (options.isSub && !options.keyboardActive()) return;
				if (search() !== undefined) {
					hover.setActiveIndex(null);
					return;
				}
				const start =
					options.openFrom() === "last"
						? enabledRows().at(-1)
						: enabledRows()[0];
				hover.setActiveIndex(start ?? null);
			}, 0);
		}),
	);
	createEffect(() => {
		if (!options.mounted()) hover.setActiveIndex(null);
	});

	const searchHost = {
		register(props: DropdownSearchProps) {
			setSearch(props);
			lastSearch = props;
			return () => {
				if (search() === props) setSearch(undefined);
			};
		},
	};

	// The query is cleared once the popup has finished closing, so the rows do
	// not refill while it fades out. The field is already gone by then, hence
	// the props it last registered.
	createEffect(
		on(options.mounted, (isMounted) => {
			if (isMounted || lastSearch === undefined) return;
			const current = lastSearch;
			lastSearch = undefined;
			if ((current.clearOnClose ?? true) && current.value !== "") {
				current.onValueChange("");
			}
		}),
	);
	// Typing returns to the field: no row stays lit under a re-filtered list.
	createEffect(
		on(
			() => search()?.value,
			() => hover.setActiveIndex(null),
			{ defer: true },
		),
	);

	const submenuHost: SubmenuHost = {
		openIndex: openSubIndex,
		setOpenIndex(index) {
			batch(() => setOpenSubIndex(index));
		},
	};

	return {
		hover,
		context,
		activeRowId: () => {
			const index = hover.activeIndex();
			return index === null ? undefined : context.rowId(index);
		},
		litBy,
		travel: () => !reflow.reflowing(),
		search,
		searchHost,
		submenuHost,
		handlers,
		onKey,
		activateActive,
		lightFirst() {
			highlight(enabledRows()[0] ?? null);
		},
		setScroller(element: HostElement) {
			scroller = element;
		},
	};
}

type MenuList = ReturnType<typeof createMenuList>;

/** The search field row, the scroller and the rows: what a popup holds. */
function MenuPanel(props: {
	id: string;
	/** The `id` of the element that opens this menu. */
	labelledBy: string;
	list: MenuList;
	checkedIndex: Accessor<number | undefined>;
	checkedIndices: Accessor<readonly number[] | undefined>;
	maxHeight: Accessor<number>;
	children: JSX.Element;
}) {
	const list = props.list;
	const menu = useMenuScope();
	const field = () => list.search();
	return (
		<DropdownContext.Provider value={list.context}>
			<DropdownSearchHostContext.Provider value={list.searchHost}>
				<SubmenuHostContext.Provider value={list.submenuHost}>
					<div
						id={props.id}
						role="menu"
						aria-labelledby={props.labelledBy}
						style={{ display: "flex", flexDirection: "column" }}
					>
						<Show when={field()}>
							{(search: Accessor<DropdownSearchProps>) => (
								<SearchField
									search={search()}
									onKeyDown={(event) => {
										event.stopPropagation();
										list.onKey(event);
									}}
									onFocusChange={menu.setSearchFocused}
									activeDescendant={list.activeRowId()}
								/>
							)}
						</Show>
						<div
							ref={(element) => {
								list.setScroller(element);
							}}
							onScroll={list.hover.handlers.onScroll}
							style={{
								display: "flex",
								flexDirection: "column",
								overflowY: "scroll",
								maxHeight:
									props.maxHeight() -
									2 -
									(field() === undefined ? 0 : SEARCH_HEIGHT),
							}}
						>
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
 * An always-rendered panel: no trigger, positioning or dismissal. Tab into
 * it, then the arrows move a focus ring between rows.
 */
export function Dropdown(props: {
	checkedIndex?: number;
	/** Rows become checkboxes, and touching picks share one background. */
	checkedIndices?: readonly number[];
	testId?: string;
	children: JSX.Element;
}) {
	const rows = new Map<number, MenuRow>();
	const listId = createUniqueId();
	const hover = createFluidHover({
		isItemDisabled: (index) => rows.get(index)?.disabled() === true,
	});
	const [focusIndex, setFocusIndex] = createSignal<number | null>(null);
	const [litBy, setLitBy] = createSignal<LitBy>("pointer");
	const context: DropdownContextValue = {
		hover,
		checkedIndex: () => props.checkedIndex,
		multiple: () => props.checkedIndices !== undefined,
		rows,
		rowId: (index) => `${listId}-row-${index}`,
		pointerLit: () => true,
		close: () => {},
		pressPick: () => false,
		releasePress: () => {},
	};

	const ringRowId = () => {
		const index = focusIndex();
		return index === null ? undefined : context.rowId(index);
	};

	/** Arrows land on disabled rows too, as FF's panel focuses every row; only activation refuses them. */
	const all = () => [...rows.keys()].sort((a, b) => a - b);
	/** Tab lands on the checked row, else the first one that can be picked. */
	const entryRow = () => {
		const checked = props.checkedIndex ?? props.checkedIndices?.[0];
		if (checked !== undefined && rows.get(checked)?.disabled() === false) {
			return checked;
		}
		return all().find((index) => rows.get(index)?.disabled() === false) ?? null;
	};
	const go = (index: number | null) => {
		setLitBy("keyboard");
		hover.setActiveIndex(index);
		setFocusIndex(index);
	};
	const step = (delta: 1 | -1) => {
		const indices = all();
		if (indices.length === 0) return;
		const current = hover.activeIndex();
		const position = current === null ? -1 : indices.indexOf(current);
		if (position === -1) {
			go(delta === 1 ? indices[0] : indices[indices.length - 1]);
			return;
		}
		go(indices[(position + delta + indices.length) % indices.length]);
	};
	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case "ArrowDown":
			case "ArrowRight":
				step(1);
				return;
			case "ArrowUp":
			case "ArrowLeft":
				step(-1);
				return;
			case "Home":
				go(all()[0] ?? null);
				return;
			case "End":
				go(all().at(-1) ?? null);
				return;
			case "Enter":
			case " ": {
				const index = hover.activeIndex();
				if (index !== null) rows.get(index)?.activate();
				return;
			}
		}
	};

	return (
		<DropdownContext.Provider value={context}>
			<div
				testId={props.testId}
				id={listId}
				role="group"
				aria-activedescendant={ringRowId()}
				tabIndex={0}
				onKeyDown={onKeyDown}
				onFocus={(event: EventPayload) => {
					// A press focuses the group too; only keyboard focus draws the ring.
					if (!event.focusVisible) return;
					const active = hover.activeIndex();
					if (active === null) go(entryRow());
					else setFocusIndex(active);
				}}
				onBlur={() => {
					setFocusIndex(null);
					hover.setActiveIndex(null);
				}}
				style={{
					width: PANEL_WIDTH,
					flexShrink: 0,
					display: "flex",
					flexDirection: "column",
					backgroundColor: color.card,
					borderRadius: radius.container,
					borderWidth: 1,
					borderColor: color.popupBorder,
					boxShadow: shadow3(),
					keyboardFocusDim: false,
				}}
			>
				<MenuBody
					hover={hover}
					checkedIndex={() => props.checkedIndex}
					checkedIndices={() => props.checkedIndices}
					litBy={litBy}
					travel={() => true}
					focusIndex={focusIndex}
					focusRingTestId={
						props.testId === undefined ? undefined : `${props.testId}-ring`
					}
					handlers={{
						onMouseEnter() {
							setLitBy("pointer");
							setFocusIndex(null);
							hover.handlers.onMouseEnter();
						},
						onMouseMove(event) {
							setFocusIndex(null);
							hover.handlers.onMouseMove(event);
						},
						onMouseLeave: hover.handlers.onMouseLeave,
					}}
				>
					{props.children}
				</MenuBody>
			</div>
		</DropdownContext.Provider>
	);
}

// ─── DropdownMenu (popup root) ───────────────────────────────────────────────

interface MenuScope {
	presence: ReturnType<typeof createPresence>;
	setOpen: (next: boolean) => void;
	keyboardActive: Accessor<boolean>;
	setKeyboardActive: (active: boolean) => void;
	/** The deepest open list takes the keys, and its lit row is the one assistive technology hears. Returns the remover. */
	pushKeys: (target: KeyTarget) => () => void;
	activeRowId: Accessor<string | undefined>;
	triggerId: string;
	popupId: string;
	openFrom: Accessor<"first" | "last">;
	/** The trigger was pressed and the button is still down. */
	startPress: () => void;
	/** A row released under a press that began on the trigger at least 200 ms ago picks (once). */
	pressPick: () => boolean;
	releasePress: () => void;
	/** Remember the trigger element the menu opened from, to hand focus back to it. */
	noteTrigger: (elementId: number) => void;
	setSearchFocused: (focused: boolean) => void;
	/** Tab leaves for the next control: close without taking focus back. */
	closeKeepingFocus: () => void;
}

/** Base UI keeps a press-drag-release from opening a menu from picking a row for this long. */
const PRESS_PICK_MS = 200;

const MenuScopeContext = createContext<MenuScope>();

function useMenuScope() {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) {
		throw new Error("Dropdown parts must be inside a DropdownMenu");
	}
	return scope;
}

export interface DropdownTriggerState {
	/** Opens on press, like Base UI: put this on the element that opens the menu. */
	onMouseDown: (event: EventPayload) => void;
	/** The release of that press, or a screen reader's press. Keyboard-originated clicks are ignored: the menu answers those itself. */
	onClick: (event: EventPayload) => void;
	readonly expanded: boolean;
	/** Put these on the element that opens the menu, with the handlers above. */
	readonly attributes: {
		readonly id: string;
		readonly "aria-expanded": boolean;
		readonly "aria-haspopup": "menu";
		/** Base UI names the popup only while it is open. */
		readonly "aria-controls": string | undefined;
		/** Focus stays on the trigger while the arrows walk the rows, so it names the lit one. */
		readonly "aria-activedescendant": string | undefined;
	};
}

export function DropdownMenu(props: {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	testId?: string;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	const presence = createPresence();
	const [keyboardActive, setKeyboardActive] = createSignal(false);
	const [keyStack, setKeyStack] = createSignal<readonly KeyTarget[]>([]);

	const [openFrom, setOpenFrom] = createSignal<"first" | "last">("first");
	let pressedAt: number | null = null;
	let pendingTrigger: number | null = null;
	let triggerId: number | null = null;
	let searchFocused = false;
	let keepFocus = false;

	/** Closing hands focus back to the trigger unless it already moved to another control (Base UI's returnFocus). */
	const returnFocus = () => {
		const target = triggerId;
		triggerId = null;
		const skip = keepFocus;
		keepFocus = false;
		if (skip || target === null) return;
		returnFocusTo(renderer, target, searchFocused);
	};

	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) {
			triggerId = pendingTrigger ?? renderer.getFocusedElementId?.() ?? null;
			pendingTrigger = null;
			presence.show();
		} else {
			pressedAt = null;
			presence.hide();
			setKeyStack([]);
			returnFocus();
		}
	};
	const setOpen = (next: boolean) => {
		if (props.disabled === true && next) return;
		if (props.open === undefined) apply(next);
		props.onOpenChange?.(next);
	};
	createEffect(() => {
		const controlled = props.open;
		if (controlled !== undefined) untrack(() => apply(controlled));
	});
	onMount(() => {
		// Opens like the initial state would: no `onOpenChange`.
		if (props.defaultOpen === true) setTimeout(() => apply(true), 64);
	});

	const scope: MenuScope = {
		presence,
		setOpen,
		keyboardActive,
		setKeyboardActive,
		pushKeys(target) {
			setKeyStack((stack) => [...stack, target]);
			return () =>
				setKeyStack((stack) => stack.filter((entry) => entry !== target));
		},
		activeRowId: () => keyStack().at(-1)?.activeRowId(),
		triggerId: createUniqueId(),
		popupId: createUniqueId(),
		openFrom,
		startPress() {
			setOpenFrom("first");
			pressedAt = performance.now();
		},
		pressPick() {
			const at = pressedAt;
			pressedAt = null;
			return at !== null && performance.now() - at >= PRESS_PICK_MS;
		},
		releasePress() {
			pressedAt = null;
		},
		noteTrigger(elementId) {
			pendingTrigger = elementId;
		},
		setSearchFocused(focused) {
			searchFocused = focused;
		},
		closeKeepingFocus() {
			keepFocus = true;
			setOpen(false);
		},
	};

	const onKeyDown = (event: KeyEvent) => {
		if (props.disabled === true) return;
		if (isChord(event)) return;
		if (!presence.open()) {
			if (
				event.key === "ArrowDown" ||
				event.key === "ArrowUp" ||
				event.key === "Enter" ||
				event.key === " "
			) {
				event.preventDefault();
				if (event.key === "ArrowDown" || event.key === "ArrowUp")
					event.stopPropagation();
				setOpenFrom(event.key === "ArrowUp" ? "last" : "first");
				setKeyboardActive(true);
				setOpen(true);
			}
			return;
		}
		setKeyboardActive(true);
		keyStack().at(-1)?.onKey(event);
	};

	return (
		<MenuScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				// A press on the menu's bare content lands focus here, so the keys still reach onKeyDown.
				tabIndex={-1}
				aria-activedescendant={scope.activeRowId()}
				onKeyDown={onKeyDown}
				onMouseDownOutside={() => {
					if (presence.open()) setOpen(false);
				}}
				style={{
					position: "relative",
					display: "flex",
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
	const scope = useMenuScope();
	const press = createPressToggle({
		isOpen: scope.presence.open,
		open(event, pressed) {
			if (pressed) {
				scope.noteTrigger(event.elementId);
				scope.startPress();
			}
			scope.setOpen(true);
		},
		close: () => scope.setOpen(false),
		onPointer: () => scope.setKeyboardActive(false),
		onClickEnd: scope.releasePress,
	});
	const trigger: DropdownTriggerState = {
		onMouseDown: press.onMouseDown,
		onClick: press.onClick,
		get expanded() {
			return scope.presence.open();
		},
		attributes: {
			id: scope.triggerId,
			get "aria-expanded"() {
				return scope.presence.open();
			},
			"aria-haspopup": "menu",
			get "aria-controls"() {
				return scope.presence.open() ? scope.popupId : undefined;
			},
			get "aria-activedescendant"() {
				return scope.presence.open() ? scope.activeRowId() : undefined;
			},
		},
	};
	return props.children(trigger);
}

export function DropdownContent(props: {
	checkedIndex?: number;
	/** Rows become checkboxes that keep the menu open, and touching picks share one background. */
	checkedIndices?: readonly number[];
	/** Which edge of the trigger the popup lines up with. */
	align?: "start" | "end";
	children: JSX.Element;
}) {
	const scope = useMenuScope();
	const list = createMenuList({
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
		leave: scope.closeKeepingFocus,
	});

	createEffect(() => {
		if (!scope.presence.open()) return;
		onCleanup(
			scope.pushKeys({ onKey: list.onKey, activeRowId: list.activeRowId }),
		);
	});

	return (
		<PopupSurface
			presence={scope.presence}
			align={props.align ?? "start"}
			width={PANEL_WIDTH}
			maxHeight={POPUP_MAX_HEIGHT}
			onDismiss={() => scope.setOpen(false)}
		>
			{(maxHeight) => (
				<MenuPanel
					id={scope.popupId}
					labelledBy={scope.triggerId}
					list={list}
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

interface SubScope {
	presence: ReturnType<typeof createPresence>;
	open: Accessor<boolean>;
	setOpen: (next: boolean) => void;
	popupId: string;
	content: Accessor<SubContentProps | undefined>;
	setContent: (props: SubContentProps | undefined) => void;
	/** The keys are in the submenu: it opened from the keyboard, or Right / Enter went into it. A hover-opened submenu leaves them with its parent. */
	entered: Accessor<boolean>;
	enter: () => void;
}

const SubScopeContext = createContext<SubScope>();

function useSubScope() {
	const scope = useContext(SubScopeContext);
	if (scope === undefined) {
		throw new Error("Submenu parts must be inside a DropdownSub");
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
	const presence = createPresence();
	const [content, setContent] = createSignal<SubContentProps>();
	const [entered, setEntered] = createSignal(false);
	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) presence.show();
		else {
			presence.hide();
			setEntered(false);
		}
	};
	const scope: SubScope = {
		presence,
		open: presence.open,
		popupId: createUniqueId(),
		setOpen(next) {
			if (props.open === undefined) apply(next);
			props.onOpenChange?.(next);
		},
		content,
		setContent,
		entered,
		enter: () => setEntered(true),
	};
	createEffect(() => {
		const controlled = props.open;
		if (controlled !== undefined) untrack(() => apply(controlled));
	});
	onMount(() => {
		if (props.defaultOpen === true) apply(true);
	});
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
		throw new Error("DropdownSubTrigger must be inside a DropdownContent");
	}
	let hoverTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(hoverTimer));

	const show = () => {
		if (props.disabled === true) return;
		sub.setOpen(true);
	};

	// The parent keeps its highlight on the trigger while the submenu is open.
	createEffect(() => {
		if (!sub.open()) return;
		host.setOpenIndex(props.index);
		onCleanup(() => {
			if (host.openIndex() === props.index) host.setOpenIndex(null);
		});
	});
	// Hovering the trigger opens its submenu after a beat; moving the highlight away closes it.
	createEffect(() => {
		const lit = parent.hover.activeIndex() === props.index;
		clearTimeout(hoverTimer);
		if (!lit) {
			if (untrack(sub.open)) sub.setOpen(false);
			return;
		}
		if (untrack(sub.open) || !parent.pointerLit()) return;
		hoverTimer = setTimeout(show, HOVER_OPEN_MS);
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
			onSelect={show}
			onOpenSubmenu={() => {
				menu.setKeyboardActive(true);
				show();
				sub.enter();
			}}
		>
			<Show when={sub.presence.mounted()}>
				<SubPopup triggerId={parent.rowId(props.index)} />
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

function SubPopup(props: { triggerId: string }) {
	const sub = useSubScope();
	const menu = useMenuScope();
	const content = () => {
		const props = sub.content();
		if (props === undefined)
			throw new Error("DropdownSub has no DropdownSubContent");
		return props;
	};
	const list = createMenuList({
		open: sub.open,
		mounted: sub.presence.mounted,
		closeAll: () => menu.setOpen(false),
		closeSelf: () => sub.setOpen(false),
		isSub: true,
		checkedIndex: () => content().checkedIndex,
		multiple: () => content().checkedIndices !== undefined,
		keyboardActive: menu.keyboardActive,
		setKeyboardActive: menu.setKeyboardActive,
		openFrom: () => "first",
		leave: menu.closeKeepingFocus,
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
	createEffect(() => {
		if (!sub.open() || !sub.entered()) return;
		onCleanup(
			menu.pushKeys({ onKey: list.onKey, activeRowId: list.activeRowId }),
		);
	});

	const placement = createPlacementState("right");
	const maxHeight = () => placement.maxHeight(POPUP_MAX_HEIGHT);

	return (
		// The layer fills the trigger row so the popup anchors to it, and takes no flex slot or mouse of its own.
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
						pointerEvents: "auto",
						position: "relative",
						width: SUB_WIDTH,
						display: "flex",
						flexDirection: "column",
						backgroundColor: color.card,
						borderRadius: radius.container,
						borderWidth: 1,
						borderColor: color.popupBorder,
						boxShadow: shadow3(),
						overflow: "hidden",
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
