import {
	createMotionValue,
	createMotionValueEvent,
	createReducedMotion,
	type DomEvent,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
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
	type FluidHover,
	useHoverItem,
} from '#/lib/fluid-hover';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { moveIndex } from '#/lib/list-nav';
import { IS_MAC } from '#/lib/platform';
import { createPresence } from '#/lib/presence';
import {
	color,
	colorFade,
	radius,
	type as scale,
	shadow,
	shape,
	sizeChoice,
	surface,
	motion as tween,
	weight,
} from '#/lib/theme';

// ─── Data ────────────────────────────────────────────────────────────────────

export interface CommandMenuItemData {
	/** Unique id: the row's key. */
	value: string;
	label: string;
	/** What the footer names Enter while the row is highlighted. Defaults to the label. */
	action?: string;
	description?: string;
	icon?: IconRef;
	/** Caps at the trailing edge, e.g. `"mod+p"`. Display only. */
	shortcut?: string;
	/** Extra terms the filter matches besides label and description. */
	keywords?: readonly string[];
	/** Heading the row lists under. Ungrouped rows form an unlabelled section. */
	group?: string;
	disabled?: boolean;
	onSelect?: () => void;
}

export interface CommandMenuTab {
	value: string;
	label: string;
}

export interface CommandMenuHint {
	label: string;
	/** A combo, or a list of separate caps. */
	keys: string | readonly string[];
}

interface CommandMenuSection {
	id: string;
	heading: string | null;
	items: CommandMenuItemData[];
	/** Flat index of the section's first row. */
	start: number;
}

// ─── Shortcut caps ───────────────────────────────────────────────────────────

const CAP_LABELS: Record<string, { mac: string; other: string }> = {
	mod: { mac: '⌘', other: 'Ctrl' },
	meta: { mac: '⌘', other: 'Win' },
	cmd: { mac: '⌘', other: 'Win' },
	ctrl: { mac: '⌃', other: 'Ctrl' },
	alt: { mac: '⌥', other: 'Alt' },
	option: { mac: '⌥', other: 'Alt' },
	shift: { mac: '⇧', other: 'Shift' },
	enter: { mac: '↵', other: 'Enter' },
	return: { mac: '↵', other: 'Enter' },
	esc: { mac: 'Esc', other: 'Esc' },
	escape: { mac: 'Esc', other: 'Esc' },
	backspace: { mac: '⌫', other: 'Backspace' },
	delete: { mac: '⌦', other: 'Del' },
	tab: { mac: '⇥', other: 'Tab' },
	space: { mac: 'Space', other: 'Space' },
	up: { mac: '↑', other: '↑' },
	down: { mac: '↓', other: '↓' },
	left: { mac: '←', other: '←' },
	right: { mac: '→', other: '→' },
};

const PREFORMATTED = /^[⌘⌃⌥⇧↵⌫⌦⇥↑↓←→]+[A-Za-z0-9]?$/;

/** Splits a combo on "+", keeping a trailing "+" as the key itself. */
function shortcutTokens(shortcut: string): string[] {
	const trimmed = shortcut.trim();
	if (trimmed === '') return [];
	const parts = trimmed.split('+').map((part) => part.trim());
	// "mod++" splits into ["mod", "", ""]: the empties are a literal "+".
	const tokens: string[] = [];
	parts.forEach((part, index) => {
		if (part !== '') tokens.push(part);
		else if (index > 0 && tokens[tokens.length - 1] !== '+') tokens.push('+');
	});
	return tokens;
}

/** The caps a shortcut displays: modifiers as symbols on a Mac, words elsewhere, letters upper-cased. */
export function formatShortcut(shortcut: string): string[] {
	const caps: string[] = [];
	for (const token of shortcutTokens(shortcut)) {
		if (PREFORMATTED.test(token)) {
			caps.push(...Array.from(token));
			continue;
		}
		const cap = CAP_LABELS[token.toLowerCase()];
		if (cap !== undefined) caps.push(IS_MAC ? cap.mac : cap.other);
		else if (token.length === 1) caps.push(token.toUpperCase());
		else caps.push(token.charAt(0).toUpperCase() + token.slice(1));
	}
	return caps;
}

// ─── Filtering ───────────────────────────────────────────────────────────────

/** Every word of the query appears somewhere in the label, description or keywords. */
export function defaultCommandMenuFilter(
	item: CommandMenuItemData,
	query: string,
): boolean {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const haystack = [
		item.label,
		item.description ?? '',
		...(item.keywords ?? []),
	]
		.join(' ')
		.toLowerCase();
	return words.every((word) => haystack.includes(word));
}

function sectionRows(
	visible: readonly CommandMenuItemData[],
	suggestions: readonly string[] | undefined,
	suggestionsLabel: string,
	query: string,
): CommandMenuSection[] {
	const sections: CommandMenuSection[] = [];
	const byHeading = new Map<string | null, CommandMenuSection>();
	const suggested = new Set(query === '' ? (suggestions ?? []) : []);
	const push = (
		heading: string | null,
		id: string,
		item: CommandMenuItemData,
	) => {
		let section = byHeading.get(heading);
		if (section === undefined) {
			section = { id, heading, items: [], start: 0 };
			byHeading.set(heading, section);
			sections.push(section);
		}
		section.items.push(item);
	};
	if (suggested.size > 0) {
		const pool = new Map(visible.map((item) => [item.value, item]));
		for (const value of suggestions ?? []) {
			const item = pool.get(value);
			if (item !== undefined) push(suggestionsLabel, 'suggestions', item);
		}
	}
	for (const item of visible) {
		if (suggested.has(item.value)) continue;
		push(
			item.group ?? null,
			item.group === undefined ? 'ungrouped' : `group:${item.group}`,
			item,
		);
	}
	let index = 0;
	for (const section of sections) {
		section.start = index;
		index += section.items.length;
	}
	return sections;
}

// ─── Sizes ───────────────────────────────────────────────────────────────────

const CAPTION = scale.caption;
const CAPTION_COMPACT = scale.micro;
const SUBTITLE = { fontSize: 14, lineHeight: 20 } as const;
const SUBTITLE_COMPACT = { fontSize: 13, lineHeight: 18 } as const;

function metrics(compact: boolean) {
	return compact
		? {
				row: 28,
				rowPadX: 6,
				gap: 4,
				icon: 14,
				text: scale.bodyCompact,
				caption: CAPTION_COMPACT,
				heading: 24,
				headingPadX: 6,
				input: 40,
				inputGap: 8,
				inputPadX: 12,
				field: SUBTITLE_COMPACT,
				footer: 32,
				footerGap: 12,
				footerPadX: 12,
				cap: 16,
				capText: scale.microCompact,
				tabsPadX: 8,
				tabsPadBottom: 6,
				tabsGap: 4,
			}
		: {
				row: 36,
				rowPadX: 8,
				gap: 8,
				icon: 16,
				text: scale.body,
				caption: CAPTION,
				heading: 28,
				headingPadX: 8,
				input: 48,
				inputGap: 10,
				inputPadX: 16,
				field: SUBTITLE,
				footer: 40,
				footerGap: 16,
				footerPadX: 16,
				cap: 20,
				capText: scale.micro,
				tabsPadX: 10,
				tabsPadBottom: 8,
				tabsGap: 8,
			};
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface TabsHandle {
	tabs: readonly CommandMenuTab[];
	value: string;
	onValueChange: (value: string) => void;
}

interface DialogHandle {
	close: () => void;
}

interface CommandMenuContextValue {
	compact: Accessor<boolean>;
	query: Accessor<string>;
	setQuery: (query: string) => void;
	sections: Accessor<readonly CommandMenuSection[]>;
	rows: Accessor<readonly CommandMenuItemData[]>;
	itemsByValue: Accessor<ReadonlyMap<string, CommandMenuItemData>>;
	hover: FluidHover;
	select: (item: CommandMenuItemData) => void;
	move: (to: 1 | -1 | 'first' | 'last') => void;
	tabs: Accessor<TabsHandle | undefined>;
	setTabs: (handle: TabsHandle | undefined) => void;
	registerRow: (index: number, element: HostElement) => void;
	testId: string;
	/** The listbox's id, for the input's `aria-controls`. */
	listId: string;
	rowId: (index: number) => string;
	scrollerRef: (element: HostElement) => void;
	/** The pointer leaving the list keeps the highlight where it was: Enter still has a target. */
	leaveList: () => void;
	dialog: DialogHandle | undefined;
}

const CommandMenuContext = createContext<CommandMenuContextValue>();
const DialogContext = createContext<DialogHandle>();
const RowIndexContext = createContext<number>();

function useCommandMenu() {
	const context = useContext(CommandMenuContext);
	if (context === undefined) {
		throw new Error('Command menu parts must be inside <CommandMenu>');
	}
	return context;
}

// ─── Panel ───────────────────────────────────────────────────────────────────

/** The card a menu sits in: surface 3 inline, surface 5 in a dialog. It caps the height; the list scrolls past it. */
export function CommandMenuPanel(props: {
	level?: number;
	width?: number | string;
	maxHeight?: number;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: props.width ?? '100%',
				maxWidth: 520,
				maxHeight: props.maxHeight,
				backgroundColor: surface(props.level ?? 3),
				borderRadius: shape.container,
				boxShadow: shadow(props.level ?? 3),
				overflow: 'hidden',
			}}
		>
			{props.children}
		</div>
	);
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function CommandMenu(props: {
	items: readonly CommandMenuItemData[];
	onSelect?: (item: CommandMenuItemData) => void;
	filter?: (item: CommandMenuItemData, query: string) => boolean;
	query?: string;
	defaultQuery?: string;
	onQueryChange?: (query: string) => void;
	/** Values listed first, under `suggestionsLabel`, while nothing is typed. */
	suggestions?: readonly string[];
	suggestionsLabel?: string;
	/** Inside a `CommandMenuDialog`, a pick closes the dialog. Defaults to true. */
	closeOnSelect?: boolean;
	size?: 'default' | 'compact';
	/** Prefix of the rows' and tabs' test ids: `<testId>-row-<value>`. */
	testId: string;
	children: JSX.Element;
}) {
	const dialog = useContext(DialogContext);
	const [internalQuery, setInternalQuery] = createSignal(
		props.defaultQuery ?? '',
	);
	const query = () => props.query ?? internalQuery();
	const setQuery = (next: string) => {
		if (props.query === undefined) setInternalQuery(next);
		props.onQueryChange?.(next);
	};

	const itemsByValue = createMemo(
		() => new Map(props.items.map((item) => [item.value, item])),
	);
	const sections = createMemo(() => {
		const filter = props.filter ?? defaultCommandMenuFilter;
		const needle = query();
		const visible =
			needle === ''
				? props.items
				: props.items.filter((item) => filter(item, needle));
		return sectionRows(
			visible,
			props.suggestions,
			props.suggestionsLabel ?? 'Suggestions',
			needle,
		);
	});
	const rows = createMemo(() => sections().flatMap((section) => section.items));
	const rowsKey = createMemo(() =>
		rows()
			.map((row) => row.value)
			.join('\u0000'),
	);

	const hover = createFluidHover({
		isItemDisabled: (index) => rows()[index]?.disabled === true,
	});
	const [tabs, setTabs] = createSignal<TabsHandle>();
	const rowElements = new Map<number, HostElement>();
	let scroller: HostElement | undefined;
	let lastActive: number | null = null;

	createEffect(() => {
		const index = hover.activeIndex();
		if (index !== null) lastActive = index;
	});

	const firstEnabled = () => rows().findIndex((row) => !row.disabled);

	// The list's scrollTop travels on the fill's spring so row and fill arrive together. The motion value only carries the animation: the scroller is the source of truth, so every run starts by jumping the value to where the wheel or the scrollbar left it.
	const reduceMotion = createReducedMotion();
	const scrollPosition = createMotionValue(0);
	createMotionValueEvent(scrollPosition, 'change', (top) => {
		if (scroller !== undefined) scroller.scrollTop = top;
	});

	/** Puts the list at `top` now and ends any running scroll animation. */
	const snapScroll = (top: number) => {
		if (scroller === undefined) return;
		scroller.scrollTo({ top, left: 0 });
		scrollPosition.jump(top);
	};

	/** Keeps the keyboard row at the middle of the viewport, as far as the ends allow. */
	const centerRow = (index: number) => {
		const row = hover.rects()[index];
		if (row === undefined || scroller === undefined) return;
		const list = scroller;
		if (list.clientHeight === 0) return;
		if (index === 0) {
			snapScroll(0);
			return;
		}
		const target = Math.max(
			0,
			Math.min(
				row.top + row.height / 2 - list.clientHeight / 2,
				list.scrollHeight - list.clientHeight,
			),
		);
		if (reduceMotion()) {
			snapScroll(target);
			return;
		}
		// A running travel is taken over where it is (its own value is the live one; the scroller's read can trail a frame). Otherwise the wheel or the scrollbar may have moved the list since.
		if (scrollPosition.isAnimating()) scrollPosition.stop();
		else scrollPosition.jump(list.scrollTop);
		scrollPosition.animate(target, tween.fast);
	};

	// The first enabled row is highlighted whenever the row set changes, so Enter always has a target.
	createEffect(
		on(rowsKey, () => {
			const first = firstEnabled();
			hover.setActiveIndex(first === -1 ? null : first);
			lastActive = first === -1 ? null : first;
			snapScroll(0);
		}),
	);

	const move = (to: 1 | -1 | 'first' | 'last') => {
		const all = rows();
		const enabled: number[] = [];
		all.forEach((row, index) => {
			if (!row.disabled) enabled.push(index);
		});
		if (enabled.length === 0) return;
		const next =
			to === 'first'
				? enabled[0]
				: to === 'last'
					? enabled[enabled.length - 1]
					: moveIndex(
							hover.activeIndex(),
							to,
							all.length,
							(index) => all[index].disabled,
						);
		if (next === null) return;
		hover.releasePointer();
		hover.setActiveIndex(next);
		lastActive = next;
		centerRow(next);
	};

	const select = (item: CommandMenuItemData) => {
		if (item.disabled) return;
		item.onSelect?.();
		props.onSelect?.(item);
		if (props.closeOnSelect !== false) dialog?.close();
	};

	const listId = createUniqueId();
	const rowId = (index: number) => `${listId}-${index}`;
	const context: CommandMenuContextValue = {
		compact: () => (props.size ?? sizeChoice()) === 'compact',
		query,
		setQuery,
		sections,
		rows,
		itemsByValue,
		hover,
		select,
		move,
		tabs,
		setTabs,
		registerRow(index, element) {
			hover.registerItem(index, element);
			rowElements.set(index, element);
			onCleanup(() => {
				if (rowElements.get(index) === element) rowElements.delete(index);
			});
		},
		testId: props.testId,
		listId,
		rowId,
		scrollerRef(element) {
			scroller = element;
		},
		leaveList() {
			hover.handlers.onMouseLeave();
			hover.setActiveIndex(lastActive);
		},
		dialog,
	};
	return (
		<CommandMenuContext.Provider value={context}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flexShrink: 1,
					minHeight: 0,
					width: '100%',
				}}
			>
				{props.children}
			</div>
		</CommandMenuContext.Provider>
	);
}

// ─── Input ───────────────────────────────────────────────────────────────────

export function CommandMenuInput(props: {
	placeholder?: string;
	/** Leading icon. `null` drops it. */
	icon?: IconRef | null;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const menu = useCommandMenu();
	const [focused, setFocused] = createSignal(false);
	const layout = () => metrics(menu.compact());
	const icon = (): IconRef | null =>
		props.icon === undefined ? 'search' : props.icon;
	let inputElement: HostElement | undefined;
	const litRowId = () => {
		const index = menu.hover.activeIndex();
		return index === null ? undefined : menu.rowId(index);
	};

	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case 'ArrowLeft':
			case 'ArrowRight': {
				// A modified arrow keeps its editing meaning: Shift extends the selection.
				if (
					event.shiftKey === true ||
					event.altKey === true ||
					event.ctrlKey === true ||
					event.metaKey === true
				) {
					return;
				}
				const handle = menu.tabs();
				if (handle === undefined || handle.tabs.length === 0) return;
				event.preventDefault();
				const count = handle.tabs.length;
				const current = handle.tabs.findIndex(
					(tab) => tab.value === handle.value,
				);
				const step = event.key === 'ArrowRight' ? 1 : -1;
				const next = ((current === -1 ? 0 : current) + step + count) % count;
				handle.onValueChange(handle.tabs[next].value);
				return;
			}
			case 'ArrowDown':
				event.preventDefault();
				menu.move(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				menu.move(-1);
				return;
			case 'Home':
				if (menu.query() !== '') return;
				event.preventDefault();
				menu.move('first');
				return;
			case 'End':
				if (menu.query() !== '') return;
				event.preventDefault();
				menu.move('last');
				return;
			case 'Escape':
				if (menu.dialog !== undefined) {
					menu.dialog.close();
					return;
				}
				if (menu.query() === '') return;
				event.preventDefault();
				menu.setQuery('');
				return;
			case 'Enter':
				event.preventDefault();
				submit();
				return;
		}
	};
	const submit = () => {
		const index = menu.hover.activeIndex();
		if (index === null) return;
		const row = menu.rows()[index];
		if (row !== undefined) menu.select(row);
	};
	const onChange = (event: DomEvent) => {
		if (event.value === undefined) {
			throw new Error('Command menu input change without a value');
		}
		menu.setQuery(event.value);
	};

	return (
		<div
			onClick={() => {
				if (inputElement === undefined) {
					throw new Error('Command menu input is not mounted');
				}
				renderer.focusElement?.(inputElement.id);
			}}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				height: layout().input,
				gap: layout().inputGap,
				paddingLeft: layout().inputPadX,
				paddingRight: layout().inputPadX,
				cursor: 'text',
			}}
		>
			<Show when={icon()}>
				{(ref: Accessor<IconRef>) => (
					<Icon
						name={ref()}
						size={layout().icon}
						strokeWidth={focused() ? 2 : 1.5}
						fade
						easeStroke
						color={focused() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<input
				ref={(element) => {
					inputElement = element;
				}}
				testId={props.testId}
				id={createUniqueId()}
				role="combobox"
				aria-expanded
				aria-controls={menu.listId}
				aria-autocomplete="list"
				aria-activedescendant={litRowId()}
				autoFocus={menu.dialog !== undefined}
				value={menu.query()}
				placeholder={props.placeholder ?? 'Type a command or search…'}
				theme={{
					text: color.foreground,
					textMuted: color.mutedForeground,
					textFaint: color.mutedForeground,
					textDim: color.mutedForeground,
					caret: color.foreground,
				}}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChange={onChange}
				onKeyDown={onKeyDown}
				style={{
					flexGrow: 1,
					minWidth: 0,
					height: 24,
					fontSize: layout().field.fontSize,
					fontWeight: weight.normal,
					color: color.foreground,
					backgroundColor: color.transparent,
					keyboardFocusDim: false,
				}}
			/>
		</div>
	);
}

// ─── Tabs and filters ────────────────────────────────────────────────────────

const TabsRowContext = createContext(false);

function TabLabel(props: { text: string; selected: boolean; lit: boolean }) {
	const textStyle = (heavy: boolean) => ({
		...scale.bodyCompact,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: 'nowrap' as const,
	});
	return (
		<div style={{ position: 'relative', flexShrink: 0 }}>
			<text style={{ ...textStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				style={{
					...textStyle(props.selected),
					position: 'absolute',
					top: 0,
					left: 0,
					color: props.lit ? color.foreground : color.mutedForeground,
					...colorFade,
				}}
			>
				{props.text}
			</text>
		</div>
	);
}

/** The subtle tab row under the field, at TabsSubtle's compact step. Children hug the row's end. */
export function CommandMenuTabs(props: {
	tabs: readonly CommandMenuTab[];
	value: string;
	onValueChange: (value: string) => void;
	children?: JSX.Element;
}) {
	const menu = useCommandMenu();
	const layout = () => metrics(menu.compact());
	const hover = createFluidHover();
	const [entered, setEntered] = createSignal(0);
	const [hovered, setHovered] = createSignal<number | null>(null);
	const selectedIndex = () =>
		Math.max(
			0,
			props.tabs.findIndex((tab) => tab.value === props.value),
		);

	createEffect(() => {
		menu.setTabs({
			tabs: props.tabs,
			value: props.value,
			onValueChange: props.onValueChange,
		});
		onCleanup(() => menu.setTabs(undefined));
	});

	const rectOf = (index: number | null) => () => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const hoverIndex = () => {
		const index = hovered();
		return index === selectedIndex() ? null : index;
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				gap: layout().tabsGap,
				paddingLeft: layout().tabsPadX,
				paddingRight: layout().tabsPadX,
				paddingBottom: layout().tabsPadBottom,
			}}
		>
			<div
				ref={hover.containerProps.ref}
				onMouseEnter={() => setEntered(entered() + 1)}
				onMouseLeave={() => setHovered(null)}
				// A tab press leaves focus in the field, so the keyboard keeps working.
				onMouseDown={(event) => event.preventDefault()}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					flexGrow: 1,
					minWidth: 0,
				}}
			>
				<FluidHighlight
					rect={rectOf(selectedIndex())}
					session={() => 0}
					radius={shape.bg}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
				/>
				<FluidHighlight
					rect={() => rectOf(hoverIndex())()}
					from={rectOf(selectedIndex())}
					session={entered}
					radius={shape.bg}
					background={color.hover}
				/>
				<For each={props.tabs}>
					{(tab, index) => {
						let element: HostElement | undefined;
						useHoverItem(hover, index, () => element);
						const selected = () => index() === selectedIndex();
						return (
							<div
								ref={(host) => {
									element = host;
								}}
								testId={`${menu.testId}-tab-${tab.value}`}
								onClick={() => props.onValueChange(tab.value)}
								onMouseEnter={() => setHovered(index())}
								style={{
									display: 'flex',
									alignItems: 'center',
									flexShrink: 0,
									height: 28,
									paddingLeft: 10,
									paddingRight: 10,
									borderRadius: shape.bg,
									cursor: 'pointer',
								}}
							>
								<TabLabel
									text={tab.label}
									selected={selected()}
									lit={selected() || hovered() === index()}
								/>
							</div>
						);
					}}
				</For>
			</div>
			<Show when={props.children}>
				<TabsRowContext.Provider value={true}>
					<div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
						{props.children}
					</div>
				</TabsRowContext.Provider>
			</Show>
		</div>
	);
}

/** A frameless row for compact controls. Inside the tab row the row owns the padding. */
export function CommandMenuFilters(props: { children: JSX.Element }) {
	const menu = useCommandMenu();
	const layout = () => metrics(menu.compact());
	const inTabsRow = useContext(TabsRowContext);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				gap: 4,
				paddingLeft: inTabsRow ? 0 : layout().tabsPadX,
				paddingRight: inTabsRow ? 0 : layout().tabsPadX,
				paddingBottom: inTabsRow ? 0 : layout().tabsPadBottom,
			}}
		>
			{props.children}
		</div>
	);
}

// ─── Shortcut ────────────────────────────────────────────────────────────────

export function CommandMenuShortcut(props: {
	keys: string | readonly string[];
}) {
	const menu = useContext(CommandMenuContext);
	const layout = () => metrics(menu?.compact() ?? false);
	const caps = () =>
		(typeof props.keys === 'string' ? [props.keys] : props.keys).flatMap(
			(key) => formatShortcut(key),
		);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				gap: 2,
			}}
		>
			<For each={caps()}>
				{(cap) => (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							height: layout().cap,
							minWidth: layout().cap,
							paddingLeft: 4,
							paddingRight: 4,
							borderRadius: 5,
							backgroundColor: color.hover,
						}}
					>
						<text
							style={{
								...layout().capText,
								color: color.mutedForeground,
								whiteSpace: 'nowrap',
							}}
						>
							{cap}
						</text>
					</div>
				)}
			</For>
		</div>
	);
}

// ─── List ────────────────────────────────────────────────────────────────────

/** The scrolling rows under a divider, grouped by heading, with the fluid hover fill. */
export function CommandMenuList(props: {
	renderItem?: (item: CommandMenuItemData, index: number) => JSX.Element;
	/** Static children of the list, e.g. `CommandMenuEmpty`. */
	children?: JSX.Element;
}) {
	const menu = useCommandMenu();
	const layout = () => metrics(menu.compact());
	const hover = menu.hover;
	const empty = () => menu.rows().length === 0;
	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<div
			ref={menu.scrollerRef}
			testId={`${menu.testId}-list`}
			onScroll={hover.handlers.onScroll}
			style={{
				display: 'flex',
				flexDirection: 'column',
				flexShrink: 1,
				minHeight: 0,
				overflowY: 'scroll',
				borderTopWidth: 1,
				borderColor: color.border,
			}}
		>
			{/* The overlay lives inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
			<div
				{...hover.containerProps}
				id={menu.listId}
				role="listbox"
				onMouseLeave={menu.leaveList}
				// A row press leaves focus in the field, so the keyboard keeps working.
				onMouseDown={(event) => event.preventDefault()}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					flexShrink: 0,
					gap: 4,
					padding: empty() ? 0 : 4,
				}}
			>
				<FluidHighlight
					rect={hoverRect}
					session={hover.session}
					radius={radius.item}
					background={color.hover}
				/>
				{props.children}
				<For each={menu.sections()}>
					{(section) => (
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							<Show when={section.heading}>
								{(heading: Accessor<string>) => (
									<div
										style={{
											display: 'flex',
											alignItems: 'center',
											flexShrink: 0,
											height: layout().heading,
											paddingLeft: layout().headingPadX,
											paddingRight: layout().headingPadX,
										}}
									>
										<text
											style={{
												...layout().caption,
												color: color.mutedForeground,
											}}
										>
											{heading()}
										</text>
									</div>
								)}
							</Show>
							<For each={section.items}>
								{(item, position) => {
									const index = section.start + position();
									return (
										<RowIndexContext.Provider value={index}>
											<Show
												when={props.renderItem}
												fallback={<CommandMenuItem value={item.value} />}
											>
												{(
													render: Accessor<
														NonNullable<typeof props.renderItem>
													>,
												) => render()(item, index)}
											</Show>
										</RowIndexContext.Provider>
									);
								}}
							</For>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

/** Shown in place of the rows when nothing matches. */
export function CommandMenuEmpty(props: { children: string }) {
	const menu = useCommandMenu();
	const layout = () => metrics(menu.compact());
	return (
		<Show when={menu.rows().length === 0}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					paddingTop: 24,
					paddingBottom: 24,
					paddingLeft: 12,
					paddingRight: 12,
				}}
			>
				<text style={{ ...layout().text, color: color.mutedForeground }}>
					{props.children}
				</text>
			</div>
		</Show>
	);
}

// ─── Item ────────────────────────────────────────────────────────────────────

/**
 * One row. Its data comes from the root by `value`; props set here override it.
 * Children replace the label and description; the icon and caps stay.
 */
export function CommandMenuItem(props: {
	value: string;
	label?: string;
	description?: string;
	icon?: IconRef;
	shortcut?: string;
	disabled?: boolean;
	onSelect?: () => void;
	children?: JSX.Element;
}) {
	const menu = useCommandMenu();
	const index = useContext(RowIndexContext);
	if (index === undefined) {
		throw new Error('CommandMenuItem must be rendered by CommandMenuList');
	}
	const layout = () => metrics(menu.compact());
	const item = (): CommandMenuItemData => {
		const data = menu.itemsByValue().get(props.value);
		return {
			...(data ?? { value: props.value, label: props.value }),
			...(props.label !== undefined && { label: props.label }),
			...(props.description !== undefined && {
				description: props.description,
			}),
			...(props.icon !== undefined && { icon: props.icon }),
			...(props.shortcut !== undefined && { shortcut: props.shortcut }),
			...(props.disabled !== undefined && { disabled: props.disabled }),
			...(props.onSelect !== undefined && { onSelect: props.onSelect }),
		};
	};
	const active = () => menu.hover.activeIndex() === index;
	let rowElement: HostElement | undefined;
	createEffect(() => {
		if (rowElement === undefined) throw new Error('Row is not mounted');
		menu.registerRow(index, rowElement);
	});

	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			id={menu.rowId(index)}
			role="option"
			aria-selected={active()}
			testId={`${menu.testId}-row-${props.value}`}
			onClick={() => menu.select(item())}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				height: layout().row,
				gap: layout().gap,
				paddingLeft: layout().rowPadX,
				paddingRight: layout().rowPadX,
				borderRadius: radius.item,
				cursor: 'pointer',
				opacity: item().disabled ? 0.5 : 1,
			}}
		>
			<Show when={item().icon}>
				{(ref: Accessor<IconRef>) => (
					<Icon
						name={ref()}
						size={layout().icon}
						strokeWidth={active() ? 2 : 1.5}
						fade
						easeStroke
						color={active() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<Show
				when={props.children}
				fallback={
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							flexGrow: 1,
							minWidth: 0,
							gap: 8,
							overflow: 'hidden',
						}}
					>
						<text
							style={{
								...layout().text,
								flexShrink: 0,
								color: active() ? color.foreground : color.mutedForeground,
								...colorFade,
								whiteSpace: 'nowrap',
							}}
						>
							{item().label}
						</text>
						<Show when={item().description}>
							{(description: Accessor<string>) => (
								<text
									style={{
										...layout().text,
										minWidth: 0,
										color: color.mutedForeground,
										whiteSpace: 'nowrap',
										textOverflow: 'ellipsis',
										overflow: 'hidden',
									}}
								>
									{description()}
								</text>
							)}
						</Show>
					</div>
				}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						flexGrow: 1,
						minWidth: 0,
						gap: 8,
						overflow: 'hidden',
					}}
				>
					{props.children}
				</div>
			</Show>
			<Show when={item().shortcut}>
				{(shortcut: Accessor<string>) => (
					<CommandMenuShortcut keys={shortcut()} />
				)}
			</Show>
		</div>
	);
}

/** A label for custom row content that follows the row's highlight. */
export function CommandMenuItemText(props: {
	children: string;
	/** Muted regardless of the highlight, like the description. */
	muted?: boolean;
}) {
	const menu = useCommandMenu();
	const index = useContext(RowIndexContext);
	const layout = () => metrics(menu.compact());
	const active = () =>
		index !== undefined && menu.hover.activeIndex() === index;
	return (
		<text
			style={{
				...layout().text,
				minWidth: 0,
				color:
					active() && props.muted !== true
						? color.foreground
						: color.mutedForeground,
				...colorFade,
				whiteSpace: 'nowrap',
				textOverflow: 'ellipsis',
				overflow: 'hidden',
			}}
		>
			{props.children}
		</text>
	);
}

// ─── Footer ──────────────────────────────────────────────────────────────────

/** The hint strip under the list. Default hints follow the menu: tabs add ← →, a dialog adds Esc, and Enter names the highlighted row. */
export function CommandMenuFooter(props: {
	/** Replaces the default hints, the Enter hint included. */
	hints?: readonly CommandMenuHint[];
}) {
	const menu = useCommandMenu();
	const layout = () => metrics(menu.compact());
	const action = () => {
		if (props.hints !== undefined) return null;
		const index = menu.hover.activeIndex();
		const row = index === null ? undefined : menu.rows()[index];
		return row === undefined ? null : (row.action ?? row.label);
	};
	const hints = (): readonly CommandMenuHint[] =>
		props.hints ?? [
			{ label: 'Select', keys: ['up', 'down'] },
			...(menu.tabs() === undefined
				? []
				: [{ label: 'Tabs', keys: ['left', 'right'] }]),
			...(menu.dialog === undefined ? [] : [{ label: 'Close', keys: 'esc' }]),
		];

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				flexShrink: 0,
				height: layout().footer,
				gap: layout().footerGap,
				paddingLeft: layout().footerPadX,
				paddingRight: layout().footerPadX,
				borderTopWidth: 1,
				borderColor: color.border,
				overflow: 'hidden',
			}}
		>
			<For each={hints()}>
				{(hint) => (
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							flexShrink: 0,
							gap: 6,
						}}
					>
						<text
							style={{
								...layout().caption,
								color: color.mutedForeground,
								whiteSpace: 'nowrap',
							}}
						>
							{hint.label}
						</text>
						<CommandMenuShortcut keys={hint.keys} />
					</div>
				)}
			</For>
			<div style={{ flexGrow: 1 }} />
			<Show when={action()}>
				{(label: Accessor<string>) => (
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							minWidth: 0,
							gap: 6,
						}}
					>
						<text
							style={{
								...layout().caption,
								minWidth: 0,
								color: color.foreground,
								whiteSpace: 'nowrap',
								textOverflow: 'ellipsis',
								overflow: 'hidden',
							}}
						>
							{label()}
						</text>
						<CommandMenuShortcut keys="enter" />
					</div>
				)}
			</Show>
		</div>
	);
}

// ─── Dialog ──────────────────────────────────────────────────────────────────

const DIALOG_WIDTH = 540;
const DIALOG_MAX_HEIGHT = 440;
// The scrim's exit completing unmounts the layer; the timer only covers an exit that never animated.
const SCRIM_EXIT_FALLBACK_MS = tween.slowExit.duration * 1000 + 100;

/** The modal shell. Escape (from the field), a press outside the panel and a pick all close it. Opening it from a key is the caller's: see `createSiteMenu`. */
export function CommandMenuDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	const presence = createPresence(SCRIM_EXIT_FALLBACK_MS);
	createEffect(() => {
		if (props.open) presence.show();
		else presence.hide();
	});
	const window = () => {
		const size = renderer.getWindowSize?.();
		if (size === undefined) throw new Error('Cannot size the dialog');
		return size;
	};
	// Opens centred at its cap and keeps that top edge as the rows filter down.
	const top = () =>
		Math.max(
			window().height * 0.12,
			window().height / 2 - DIALOG_MAX_HEIGHT / 2,
		);
	const maxHeight = () => Math.min(DIALOG_MAX_HEIGHT, window().height * 0.76);
	const handle: DialogHandle = { close: () => props.onOpenChange(false) };

	return (
		<Show when={presence.mounted()}>
			<anchored
				fill="window"
				deferred
				priority={2}
				style={{
					backgroundColor: color.transparent,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<motion.div
					initial={{ opacity: 0 }}
					animate={{
						opacity: presence.open() ? 1 : 0,
					}}
					transition={presence.open() ? tween.slow : tween.slowExit}
					onMotionComplete={() => {
						if (!presence.open()) presence.release();
					}}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: color.scrim,
					}}
				/>
				<motion.div
					initial={{ opacity: 0, top: -4 }}
					animate={
						presence.open() ? { opacity: 1, top: 0 } : { opacity: 0, top: -4 }
					}
					transition={presence.open() ? tween.slow : tween.slowExit}
					style={{
						position: 'relative',
						marginTop: top(),
						width: Math.min(DIALOG_WIDTH, window().width - 32),
						display: 'flex',
						flexDirection: 'column',
					}}
				>
					<div
						onMouseDownOutside={handle.close}
						style={{ display: 'flex', flexDirection: 'column' }}
					>
						<DialogContext.Provider value={handle}>
							<CommandMenuPanel level={5} width="100%" maxHeight={maxHeight()}>
								{props.children}
							</CommandMenuPanel>
						</DialogContext.Provider>
					</div>
				</motion.div>
			</anchored>
		</Show>
	);
}
