import {
	type EventPayload,
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
	type FluidHover,
	type ItemRect,
} from "../lib/fluid-hover";
import type { IconRef } from "../lib/icons";
import { moveIndex, revealRow } from "../lib/list-nav";
import { isInside, placePopup, POPUP_OFFSET, PopupSurface } from "../lib/popup";
import { createPresence } from "../lib/presence";
import { color, radius, shadow3, motion as tween } from "../lib/theme";
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
const TYPEAHEAD_MS = 500;
/** Until a menu has been measured: about six rows. */
const TYPICAL_HEIGHT = 240;

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
}) {
	const renderer = useGpuixRequired();
	const rows = new Map<number, MenuRow>();
	const hover = createFluidHover({
		isItemDisabled: (index) => rows.get(index)?.disabled() === true,
	});
	const [litBy, setLitBy] = createSignal<LitBy>("open");
	const [reflow, setReflow] = createSignal(false);
	const [search, setSearch] = createSignal<DropdownSearchProps>();
	const [openSubIndex, setOpenSubIndex] = createSignal<number | null>(null);
	let scroller: HostElement | undefined;
	let dwellTimer: ReturnType<typeof setTimeout> | undefined;
	let typeahead = "";
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	let lastMove: EventPayload | undefined;
	onCleanup(() => {
		clearTimeout(dwellTimer);
		clearTimeout(typeaheadTimer);
		hover.cancelMeasure();
	});

	const enabledRows = () =>
		[...rows.entries()]
			.filter((entry) => !entry[1].disabled())
			.map((entry) => entry[0])
			.sort((a, b) => a - b);

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
			...enabledRows(),
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

	const typeAhead = (char: string) => {
		clearTimeout(typeaheadTimer);
		typeahead += char.toLowerCase();
		typeaheadTimer = setTimeout(() => {
			typeahead = "";
		}, TYPEAHEAD_MS);
		const indices = enabledRows();
		if (indices.length === 0) return;
		const current = hover.activeIndex();
		const startAt = current === null ? -1 : indices.indexOf(current);
		const offset = typeahead.length === 1 ? startAt + 1 : Math.max(startAt, 0);
		for (let step = 0; step < indices.length; step++) {
			const index = indices[(offset + step) % indices.length];
			if (rows.get(index)?.label.toLowerCase().startsWith(typeahead) === true) {
				highlight(index);
				return;
			}
		}
	};

	const onKey: KeyHandler = (event) => {
		const typing = search() !== undefined;
		switch (event.key) {
			case "down":
				move(1);
				return;
			case "up":
				move(-1);
				return;
			case "home":
				if (!typing) highlight(enabledRows()[0] ?? null);
				return;
			case "end":
				if (!typing) highlight(enabledRows().at(-1) ?? null);
				return;
			case "enter":
			case "space":
				if (!typing) activateActive();
				return;
			case "right": {
				const index = hover.activeIndex();
				if (index !== null) rows.get(index)?.openSubmenu?.();
				return;
			}
			case "left":
				if (options.isSub) options.closeSelf();
				return;
			case "escape":
				// The window-level dismiss stack must not also close the whole menu.
				event.preventDefault();
				options.closeSelf();
				return;
			case "tab":
				options.closeAll();
				return;
		}
		if (!typing && event.key !== undefined && event.key.length === 1) {
			typeAhead(event.key);
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
			if (openSubIndex() === null) hover.handlers.onMouseLeave();
		},
	};

	const context: DropdownContextValue = {
		hover,
		checkedIndex: options.checkedIndex,
		multiple: options.multiple,
		rows,
		pointerLit: () => litBy() === "pointer",
		rowsChanged() {
			if (!options.mounted()) return;
			setReflow(true);
			hover.remeasure();
		},
		close: options.closeAll,
	};

	createEffect(
		on(
			hover.rects,
			() => {
				if (reflow()) setTimeout(() => setReflow(false), 48);
			},
			{ defer: true },
		),
	);

	// Open ready to act: the first row is lit, unless a search field takes the keyboard.
	createEffect(
		on(options.open, (isOpen) => {
			if (!isOpen) return;
			setLitBy("open");
			setTimeout(() => {
				if (options.isSub && !options.keyboardActive()) return;
				hover.setActiveIndex(
					search() === undefined ? (enabledRows()[0] ?? null) : null,
				);
			}, 0);
		}),
	);
	createEffect(() => {
		if (!options.mounted()) hover.setActiveIndex(null);
	});

	const searchHost = {
		register(props: DropdownSearchProps) {
			setSearch(props);
			return () => {
				if (search() === props) setSearch(undefined);
			};
		},
	};

	createEffect(
		on(options.open, (isOpen) => {
			if (isOpen) return;
			const current = search();
			if (current === undefined) return;
			if ((current.clearOnClose ?? true) && current.value !== "") {
				current.onValueChange("");
			}
		}),
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
		travel: () => !reflow(),
		search,
		searchHost,
		submenuHost,
		handlers,
		onKey,
		activateActive,
		setScroller(element: HostElement) {
			scroller = element;
		},
	};
}

type MenuList = ReturnType<typeof createMenuList>;

/** The search field row, the scroller and the rows: what a popup holds. */
function MenuPanel(props: {
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
						ref={(element) => {
							onCleanup(menu.addRegion(element));
						}}
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
								onSubmit={list.activateActive}
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
								props.maxHeight() - 2 - (field() === undefined ? 0 : SEARCH_HEIGHT),
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
	const hover = createFluidHover({
		isItemDisabled: (index) => rows.get(index)?.disabled() === true,
	});
	const [focusIndex, setFocusIndex] = createSignal<number | null>(null);
	const [litBy, setLitBy] = createSignal<LitBy>("pointer");
	onCleanup(() => hover.cancelMeasure());

	const context: DropdownContextValue = {
		hover,
		checkedIndex: () => props.checkedIndex,
		multiple: () => props.checkedIndices !== undefined,
		rows,
		pointerLit: () => true,
		rowsChanged: () => hover.remeasure(),
		close: () => {},
	};

	const enabled = () =>
		[...rows.entries()]
			.filter((entry) => !entry[1].disabled())
			.map((entry) => entry[0])
			.sort((a, b) => a - b);
	const go = (index: number | null) => {
		setLitBy("keyboard");
		hover.setActiveIndex(index);
		setFocusIndex(index);
	};
	const step = (delta: 1 | -1) => {
		const indices = enabled();
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
			case "down":
			case "right":
				step(1);
				return;
			case "up":
			case "left":
				step(-1);
				return;
			case "home":
				go(enabled()[0] ?? null);
				return;
			case "end":
				go(enabled().at(-1) ?? null);
				return;
			case "enter":
			case "space": {
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
				role="group"
				tabIndex={0}
				onKeyDown={onKeyDown}
				onFocus={() => {
					if (hover.activeIndex() === null) return;
					setFocusIndex(hover.activeIndex());
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
	/** The popup is as wide as its panel, or the trigger if that is wider. */
	width: Accessor<number>;
	side: Accessor<"top" | "bottom">;
	/** What the popup may be tall: the room on its side, up to the cap. */
	maxHeight: Accessor<number>;
	/** The content is measured: flip to the side where it fits, if either does. */
	fitSide: (contentHeight: number) => void;
	keyboardActive: Accessor<boolean>;
	setKeyboardActive: (active: boolean) => void;
	/** The deepest open list takes the keys. */
	keyStack: KeyHandler[];
	/** The popup and its submenus: a press inside any of them is not an outside press. */
	addRegion: (element: HostElement) => () => void;
	/** `PopupSurface` types its outside-press prop without the payload, though gpuix passes it. */
	outsidePress: (event?: EventPayload) => void;
}

const MenuScopeContext = createContext<MenuScope>();

function useMenuScope() {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) {
		throw new Error("Dropdown parts must be inside a DropdownMenu");
	}
	return scope;
}

export interface DropdownTriggerState {
	/** Mouse clicks toggle the menu. Keyboard-originated clicks are ignored: the menu answers those itself. */
	onClick: (event: EventPayload) => void;
	readonly expanded: boolean;
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
	const [width, setWidth] = createSignal(PANEL_WIDTH);
	const [side, setSide] = createSignal<"top" | "bottom">("bottom");
	const [maxHeight, setMaxHeight] = createSignal(POPUP_MAX_HEIGHT);
	const [keyboardActive, setKeyboardActive] = createSignal(false);
	const regions = new Set<HostElement>();
	const keyStack: KeyHandler[] = [];
	let wrapper: HostElement | undefined;

	/** The popup's height as last measured: a good guess for the next open. */
	let lastHeight = TYPICAL_HEIGHT;
	const choose = (contentHeight: number) => {
		if (wrapper === undefined) throw new Error("DropdownMenu is not mounted");
		const placement = placePopup(wrapper, contentHeight, POPUP_MAX_HEIGHT);
		setSide(placement.side);
		setMaxHeight(placement.maxHeight);
		setWidth(Math.max(PANEL_WIDTH, placement.triggerWidth));
	};
	const place = () => choose(lastHeight);

	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) {
			place();
			presence.show();
		} else {
			presence.hide();
			keyStack.length = 0;
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
		if (props.defaultOpen === true) setTimeout(() => setOpen(true), 64);
	});

	const scope: MenuScope = {
		presence,
		setOpen,
		width,
		side,
		maxHeight,
		fitSide(contentHeight) {
			lastHeight = contentHeight;
			choose(contentHeight);
		},
		keyboardActive,
		setKeyboardActive,
		keyStack,
		addRegion(element) {
			regions.add(element);
			return () => regions.delete(element);
		},
		outsidePress(event) {
			if (event === undefined) throw new Error("Outside press without a payload");
			if (!presence.open()) return;
			if (isInside(event, [wrapper, ...regions])) return;
			setOpen(false);
		},
	};

	const onKeyDown = (event: KeyEvent) => {
		if (props.disabled === true) return;
		if (!presence.open()) {
			if (
				event.key === "down" ||
				event.key === "enter" ||
				event.key === "space"
			) {
				event.preventDefault();
				setKeyboardActive(true);
				setOpen(true);
			}
			return;
		}
		setKeyboardActive(true);
		keyStack[keyStack.length - 1]?.(event);
	};

	return (
		<MenuScopeContext.Provider value={scope}>
			<div
				ref={(element) => {
					wrapper = element;
				}}
				testId={props.testId}
				onKeyDown={onKeyDown}
				onMouseDownOutside={scope.outsidePress}
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
	const trigger: DropdownTriggerState = {
		onClick(event) {
			if (event.key !== undefined) return;
			scope.setKeyboardActive(false);
			scope.setOpen(!scope.presence.open());
		},
		get expanded() {
			return scope.presence.open();
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
	});

	let fitted = false;
	createEffect(
		on(scope.presence.open, (isOpen) => {
			if (isOpen) fitted = false;
		}),
	);
	createEffect(
		on(
			list.hover.rects,
			(rects) => {
				if (fitted || !scope.presence.open()) return;
				const bottom = rects.reduce(
					(max, rect) => (rect === undefined ? max : Math.max(max, rect.top + rect.height)),
					0,
				);
				if (bottom === 0) return;
				fitted = true;
				const search = list.search() === undefined ? 0 : SEARCH_HEIGHT;
				scope.fitSide(Math.min(POPUP_MAX_HEIGHT, bottom + PADDING + 2 + search));
			},
			{ defer: true },
		),
	);

	createEffect(() => {
		if (!scope.presence.open()) return;
		scope.keyStack.push(list.onKey);
		onCleanup(() => {
			const at = scope.keyStack.indexOf(list.onKey);
			if (at !== -1) scope.keyStack.splice(at, 1);
		});
	});

	return (
		<PopupSurface
			presence={scope.presence}
			side={scope.side()}
			align={props.align ?? "start"}
			width={scope.width()}
			maxHeight={scope.maxHeight()}
			onMouseDownOutside={scope.outsidePress}
			onDismiss={() => scope.setOpen(false)}
		>
			<MenuPanel
				list={list}
				checkedIndex={() => props.checkedIndex}
				checkedIndices={() => props.checkedIndices}
				maxHeight={scope.maxHeight}
			>
				{props.children}
			</MenuPanel>
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
	content: Accessor<SubContentProps | undefined>;
	setContent: (props: SubContentProps | undefined) => void;
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
	const apply = (next: boolean) => {
		if (next === presence.open()) return;
		if (next) presence.show();
		else presence.hide();
	};
	const scope: SubScope = {
		presence,
		open: presence.open,
		setOpen(next) {
			if (props.open === undefined) apply(next);
			props.onOpenChange?.(next);
		},
		content,
		setContent,
	};
	createEffect(() => {
		const controlled = props.open;
		if (controlled !== undefined) untrack(() => apply(controlled));
	});
	onMount(() => {
		if (props.defaultOpen === true) scope.setOpen(true);
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
			closeOnClick={false}
			onSelect={show}
			onOpenSubmenu={() => {
				menu.setKeyboardActive(true);
				show();
			}}
		>
			<Show when={sub.presence.mounted()}>
				<SubPopup />
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

function SubPopup() {
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
	});

	createEffect(() => {
		if (!sub.open()) return;
		menu.keyStack.push(list.onKey);
		onCleanup(() => {
			const at = menu.keyStack.indexOf(list.onKey);
			if (at !== -1) menu.keyStack.splice(at, 1);
		});
	});

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
				deferred
				priority={2}
				occlude
				style={{ backgroundColor: color.transparent }}
			>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: sub.open() ? 1 : 0 }}
					transition={sub.open() ? tween.fast : tween.fastExit}
					style={{
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
						maxHeight: POPUP_MAX_HEIGHT,
					}}
				>
					<MenuPanel
						list={list}
						checkedIndex={() => content().checkedIndex}
						checkedIndices={() => content().checkedIndices}
						maxHeight={() => POPUP_MAX_HEIGHT}
					>
						{content().children}
					</MenuPanel>
				</motion.div>
			</anchored>
		</div>
	);
}
