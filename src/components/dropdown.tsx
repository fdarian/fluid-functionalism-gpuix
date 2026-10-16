import {
	document,
	type DomEvent,
	type HostDomEvent,
	type HostElement,
	type HostMouseEvent,
	type HostMouseMoveEvent,
	type HostPointerEvent,
	type KeyEvent,
	motion,
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
import { FluidHighlight } from "#/lib/fluid-highlight";
import {
	createFluidHover,
	createReflowGate,
	type FluidHover,
	type ItemRect,
} from "#/lib/fluid-hover";
import type { IconRef } from "#/lib/icons";
import { isChord, moveIndex, revealRow } from "#/lib/list-nav";
import { createPlacementState, POPUP_MARGIN, PopupSurface } from "#/lib/popup";
import { createPressToggle, refocusAfterPress } from "#/lib/popup-trigger";
import { createPresence } from "#/lib/presence";
import { color, radius, shadow, motion as tween } from "#/lib/theme";
import { createTypeahead } from "#/lib/typeahead";
import {
	type DropdownSearchHost,
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
/** FF focuses the first row two frames after a pointer open, once Base UI's own open focus has landed on the popup. */
const OPEN_FOCUS_MS = 32;

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
		onMouseMove: (event: HostMouseMoveEvent) => void;
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
	/** Tab closes the whole menu; the key handler decides whether focus moves on from the trigger. */
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
	let panel: HostElement | undefined;
	let field: HostElement | undefined;
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let lastMove: HostMouseMoveEvent | undefined;
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
		revealRow(
			scroller,
			row,
			"nearest",
			PADDING,
			search() === undefined ? 0 : SEARCH_HEIGHT,
		);
	};

	/** A field that takes focus on open leaves the rows unlit and unfocused. */
	const fieldTakesFocus = () => {
		const query = search();
		return query !== undefined && query.autoFocus !== false;
	};

	const highlight = (index: number | null) => {
		setLitBy("keyboard");
		hover.releasePointer();
		hover.setActiveIndex(index);
		if (index !== null) revealIndex(index);
	};

	/** The field sits before the first row, so coming back to it from the bottom of a long list also returns the list to its top. */
	const returnToField = () => {
		highlight(null);
		field?.focus({ preventScroll: true });
		if (scroller !== undefined) scroller.scrollTop = 0;
	};

	/** The field is a stop of its own, before the first row: arrowing past either end lands on it. */
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
		if (next === null) return;
		const stop = stops[next];
		if (stop === null) returnToField();
		else highlight(stop);
	};

	/** A key typed on a row (or the bare panel) belongs to the field: it takes focus and the query takes the key. */
	const redirectToField = (event: KeyEvent, query: DropdownSearchProps) => {
		const key = event.key;
		if (key === undefined) return false;
		const typed = key.length === 1 && key !== " ";
		if (!typed && key !== "Backspace") return false;
		event.preventDefault();
		setLitBy("keyboard");
		hover.setActiveIndex(null);
		field?.focus({ preventScroll: true });
		query.onValueChange(typed ? query.value + key : query.value.slice(0, -1));
		return true;
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

	const onKey = (event: KeyEvent) => {
		if (isChord(event)) return;
		options.setKeyboardActive(true);
		// The panel is the menu's keyboard: nothing it hears reaches the trigger's
		// wrapper (which would reopen a menu this key just closed) or, from a
		// submenu, the parent menu around it.
		event.stopPropagation();
		const query = search();
		// Space, Home, End and the sideways arrows are the field's own while it has focus.
		const inField =
			field !== undefined && event.target === field;
		if (event.key === "Escape") {
			event.preventDefault();
			options.closeSelf();
			return;
		}
		if (event.key === "Tab") {
			// Forward: the trigger takes focus as the menu closes, so the default Tab moves on from it. Backward leaves it on the trigger.
			if (event.shiftKey === true) event.preventDefault();
			options.leave();
			return;
		}
		if (query === undefined) {
			if (typeahead.handleKey(event)) return;
		} else if (!inField && redirectToField(event, query)) return;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				move(1);
				return;
			case "ArrowUp":
				event.preventDefault();
				move(-1);
				return;
			case "Home":
				if (inField) return;
				event.preventDefault();
				highlight(allRows()[0] ?? null);
				return;
			case "End":
				if (inField) return;
				event.preventDefault();
				highlight(allRows().at(-1) ?? null);
				return;
			case "Enter":
				// Nothing is focused to pick in the field; the default would submit a form around it.
				event.preventDefault();
				if (!inField) activateActive();
				return;
			case " ":
				if (inField) return;
				event.preventDefault();
				activateActive();
				return;
			case "ArrowRight": {
				if (inField) return;
				const index = hover.activeIndex();
				if (index !== null) rows.get(index)?.openSubmenu?.();
				return;
			}
			case "ArrowLeft":
				if (options.isSub && !inField) options.closeSelf();
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
		onMouseMove(event: HostMouseMoveEvent) {
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
		rowTabIndex: (index) =>
			options.open() && hover.activeIndex() === index ? 0 : -1,
		rowFocused: (index) => hover.setActiveIndex(index),
		pointerLit: () => litBy() === "pointer",
		rowsChanged() {
			if (!options.mounted()) return;
			reflow.raise();
		},
		close: options.closeAll,
		pressPick: menu.pressPick,
		releasePress: menu.releasePress,
	};

	const lightStart = () => {
		const start =
			options.openFrom() === "last"
				? enabledRows().at(-1)
				: enabledRows()[0];
		hover.setActiveIndex(start ?? null);
		if (start !== undefined) revealIndex(start);
	};

	// Open ready to act. A search field that takes focus leaves the rows unlit. A keyboard
	// open focuses the first row (ArrowUp: the last); a pointer open focuses the panel,
	// then, like FF's effect, the first row two frames later unless a row already took
	// focus. A submenu the pointer opened leaves focus on its parent row.
	createEffect(
		on(options.open, (isOpen) => {
			if (!isOpen) return;
			setLitBy("open");
			const landing = setTimeout(() => {
				if (!options.open()) return;
				if (fieldTakesFocus()) {
					hover.setActiveIndex(null);
					return;
				}
				if (options.keyboardActive()) {
					lightStart();
					return;
				}
				if (!options.isSub) panel?.focus({ preventScroll: true });
			}, 0);
			const firstRow = setTimeout(() => {
				if (!options.open() || options.isSub) return;
				if (fieldTakesFocus() || options.keyboardActive()) return;
				if (hover.activeIndex() !== null) return;
				lightStart();
			}, OPEN_FOCUS_MS);
			onCleanup(() => {
				clearTimeout(landing);
				clearTimeout(firstRow);
			});
		}),
	);
	// Highlight follows focus and focus follows the highlight: a hover or a key moves
	// the lit row, and the row takes focus. Leaving every row hands focus to the panel.
	createEffect(
		on(hover.activeIndex, (index) => {
			if (!options.open()) return;
			if (index === null) {
				if (litBy() === "pointer") panel?.focus({ preventScroll: true });
				return;
			}
			rows.get(index)?.focus();
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
			() => {
				setLitBy("keyboard");
				hover.setActiveIndex(null);
			},
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
		setPanel(element: HostElement) {
			panel = element;
		},
		setField(element: HostElement) {
			field = element;
		},
		containsFocus: () =>
			panel !== undefined && panel.mounted && panel.matches(":focus-within"),
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
						id={props.id}
						testId={props.testId}
						role="menu"
						aria-labelledby={props.labelledBy}
						// A press on the bare popup, or a pointer open, lands focus here so the keys still reach it.
						tabIndex={-1}
						onKeyDown={list.onKey}
						style={{
							display: "flex",
							flexDirection: "column",
							keyboardFocusDim: false,
						}}
					>
						<div
							ref={(element) => {
								list.setScroller(element);
							}}
							onScroll={list.hover.handlers.onScroll}
							style={{
								display: "flex",
								flexDirection: "column",
								overflowY: "scroll",
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
	const [litBy, setLitBy] = createSignal<LitBy>("pointer");

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
			setLitBy(focusVisible ? "keyboard" : "pointer");
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
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				focusRow(event.key === "ArrowDown" ? all()[0] : all().at(-1));
			}
			return;
		}
		switch (event.key) {
			case "ArrowDown":
			case "ArrowRight":
				event.preventDefault();
				step(1);
				return;
			case "ArrowUp":
			case "ArrowLeft":
				event.preventDefault();
				step(-1);
				return;
			case "Home":
				event.preventDefault();
				focusRow(all()[0]);
				return;
			case "End":
				event.preventDefault();
				focusRow(all().at(-1));
				return;
			case "Enter":
			case " ": {
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
					display: "flex",
					flexDirection: "column",
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
								props.testId === undefined ? undefined : `${props.testId}-field`
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
							setLitBy("pointer");
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

interface MenuScope {
	presence: ReturnType<typeof createPresence>;
	setOpen: (next: boolean) => void;
	keyboardActive: Accessor<boolean>;
	setKeyboardActive: (active: boolean) => void;
	triggerId: string;
	popupId: string;
	/** `<testId>-popup`: the panel that holds focus while no row does. */
	popupTestId: string | undefined;
	/** `<testId>-field`: the search field, when the popup has one. */
	searchTestId: string | undefined;
	openFrom: Accessor<"first" | "last">;
	/** The trigger was pressed and the button is still down. */
	startPress: () => void;
	/** A row released under a press that began on the trigger at least 200 ms ago picks (once). */
	pressPick: () => boolean;
	releasePress: () => void;
	/** Remember the trigger element the menu opened from, to hand focus back to it. */
	noteTrigger: (element: HostElement) => void;
	/** The root popup says how to tell whether focus sits inside it, so a close knows whether the trigger should get focus back. */
	watchPopupFocus: (containsFocus: () => boolean) => void;
	/** Tab closes the menu. */
	leave: () => void;
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
	onMouseDown: (event: HostMouseEvent) => void;
	/** The release of that press, or a screen reader's press. Keyboard-originated clicks are ignored: the menu answers those itself. */
	onClick: (event: HostPointerEvent) => void;
	readonly expanded: boolean;
	/** Put these on the element that opens the menu, with the handlers above. */
	readonly attributes: {
		readonly id: string;
		readonly "aria-expanded": boolean;
		readonly "aria-haspopup": "menu";
		/** Base UI names the popup only while it is open. */
		readonly "aria-controls": string | undefined;
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
	const presence = createPresence();
	const [keyboardActive, setKeyboardActive] = createSignal(false);

	const [openFrom, setOpenFrom] = createSignal<"first" | "last">("first");
	let pressedAt: number | null = null;
	let pendingTrigger: HostElement | null = null;
	let triggerElement: HostElement | null = null;
	let popupHasFocus: () => boolean = () => false;

	/** Closing hands focus back to the trigger when it sat in the popup, which is about to unmount and drop it, or nowhere; a control that took it since keeps it (Base UI's returnFocus). */
	const returnFocus = () => {
		const target = triggerElement;
		triggerElement = null;
		if (target === null || !target.mounted) return;
		if (popupHasFocus() || document.activeElement === null) target.focus();
	};

	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) {
			triggerElement = pendingTrigger ?? document.activeElement;
			pendingTrigger = null;
			presence.show();
		} else {
			pressedAt = null;
			presence.hide();
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
		triggerId: createUniqueId(),
		popupId: createUniqueId(),
		popupTestId: props.testId === undefined ? undefined : `${props.testId}-popup`,
		searchTestId: props.testId === undefined ? undefined : `${props.testId}-field`,
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
		noteTrigger(element) {
			pendingTrigger = element;
		},
		watchPopupFocus(containsFocus) {
			popupHasFocus = containsFocus;
		},
		leave() {
			setOpen(false);
		},
	};

	/** Only the closed trigger's keys live here: once open, the popup's panel takes them. */
	const onKeyDown = (event: KeyEvent) => {
		if (props.disabled === true) return;
		if (isChord(event)) return;
		if (presence.open()) return;
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
	};

	return (
		<MenuScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				onKeyDown={onKeyDown}
				onMouseDownOutside={() => {
					if (!presence.open()) return;
					const trigger = triggerElement;
					setOpen(false);
					refocusAfterPress(trigger);
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
				scope.noteTrigger(event.currentTarget as HostElement);
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
		leave: scope.leave,
	});
	scope.watchPopupFocus(list.containsFocus);

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

interface SubScope {
	presence: ReturnType<typeof createPresence>;
	open: Accessor<boolean>;
	setOpen: (next: boolean) => void;
	popupId: string;
	content: Accessor<SubContentProps | undefined>;
	setContent: (props: SubContentProps | undefined) => void;
	/** Right / Enter went into the submenu, which may already be open from a hover: focus its first row. */
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
				<SubPopup
					triggerId={parent.rowId(props.index)}
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
	/** Escape and Left hand focus back to the row that opened this submenu. */
	focusTrigger: () => void;
}) {
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
		closeSelf() {
			sub.setOpen(false);
			props.focusTrigger();
		},
		isSub: true,
		checkedIndex: () => content().checkedIndex,
		multiple: () => content().checkedIndices !== undefined,
		keyboardActive: menu.keyboardActive,
		setKeyboardActive: menu.setKeyboardActive,
		openFrom: () => "first",
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
						boxShadow: shadow(3),
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
