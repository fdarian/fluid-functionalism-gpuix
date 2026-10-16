import {
	window as appWindow,
	type DomEvent,
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import { createMemo, createSignal, type JSX, onCleanup, Show } from "solid-js";
import { Button } from "../components/button";
import {
	CommandMenu,
	CommandMenuDialog,
	CommandMenuEmpty,
	CommandMenuFilters,
	CommandMenuFooter,
	CommandMenuInput,
	CommandMenuItem,
	type CommandMenuItemData,
	CommandMenuItemText,
	CommandMenuList,
	CommandMenuPanel,
	CommandMenuShortcut,
	CommandMenuTabs,
	formatShortcut,
} from "../components/command-menu";
import { Select } from "../components/select";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { IS_MAC } from "../lib/platform";
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from "../lib/playground";
import { color, type as scale } from "../lib/theme";

function items(options: {
	descriptions: boolean;
	shortcuts: boolean;
}): CommandMenuItemData[] {
	const all: CommandMenuItemData[] = [
		{
			value: "new-file",
			label: "New file",
			description: "Blank document",
			icon: "plus",
			shortcut: "mod+n",
			keywords: ["create", "document"],
			group: "Actions",
		},
		{
			value: "search",
			label: "Search everywhere",
			description: "Files, people, messages",
			icon: "search",
			shortcut: "mod+shift+f",
			keywords: ["find"],
			group: "Actions",
		},
		{
			value: "theme",
			label: "Toggle dark mode",
			description: "System, light, or dark",
			icon: "moon",
			shortcut: "mod+shift+l",
			keywords: ["appearance", "theme"],
			group: "Actions",
		},
		{
			value: "copy-link",
			label: "Copy link",
			description: "To this page",
			icon: "link",
			shortcut: "mod+shift+c",
			keywords: ["share", "url"],
			group: "Actions",
		},
		{
			value: "invite",
			label: "Invite people",
			description: "Send an email invite",
			icon: "users",
			keywords: ["team", "member"],
			group: "Actions",
		},
		{
			value: "export",
			label: "Export as PDF",
			description: "Pro plan",
			icon: "image",
			keywords: ["download"],
			group: "Actions",
			disabled: true,
		},
		{
			value: "home",
			label: "Home",
			action: "Go to Home",
			icon: "home",
			group: "Go to",
		},
		{
			value: "inbox",
			label: "Inbox",
			action: "Go to Inbox",
			description: "3 unread",
			icon: "inbox",
			keywords: ["mail", "notifications"],
			group: "Go to",
		},
		{
			value: "calendar",
			label: "Calendar",
			action: "Go to Calendar",
			description: "Today",
			icon: "calendar",
			keywords: ["events", "schedule"],
			group: "Go to",
		},
		{
			value: "starred",
			label: "Starred",
			action: "Go to Starred",
			icon: "star",
			keywords: ["favorites"],
			group: "Go to",
		},
		{
			value: "recent",
			label: "Recent",
			action: "Go to Recent",
			description: "Last 7 days",
			icon: "clock",
			keywords: ["history"],
			group: "Go to",
		},
		{
			value: "settings",
			label: "Settings",
			action: "Go to Settings",
			description: "Account and workspace",
			icon: "settings",
			shortcut: "mod+,",
			keywords: ["preferences"],
			group: "Go to",
		},
		{
			value: "docs",
			label: "Documentation",
			icon: "square-library",
			keywords: ["help", "guide"],
			group: "Help",
		},
		{
			value: "whats-new",
			label: "What's new",
			description: "Release notes",
			icon: "rocket",
			keywords: ["changelog", "updates"],
			group: "Help",
		},
		{
			value: "support",
			label: "Contact support",
			description: "Reply within a day",
			icon: "message-circle",
			keywords: ["help", "chat"],
			group: "Help",
		},
	];
	return all.map((item) => ({
		...item,
		description: options.descriptions ? item.description : undefined,
		shortcut: options.shortcuts ? item.shortcut : undefined,
	}));
}

const PLAIN = items({ descriptions: false, shortcuts: false });
const FULL = items({ descriptions: true, shortcuts: true });
const SUGGESTIONS = ["calendar", "new-file", "settings"];
const PLACEHOLDER = "Type a command or search…";
const EMPTY = "No results.";
const PANEL_HEIGHT = 360;
const FILTER_POPUP_WIDTH = 150;

const TABS = [
	{ value: "all", label: "All" },
	{ value: "Actions", label: "Actions" },
	{ value: "Go to", label: "Go to" },
	{ value: "Help", label: "Help" },
];
const TYPES = [
	{ value: "all", label: "All types" },
	{ value: "Actions", label: "Actions" },
	{ value: "Go to", label: "Go to" },
	{ value: "Help", label: "Help" },
];
const SORTS = [
	{ value: "default", label: "Default order" },
	{ value: "az", label: "A to Z" },
];

interface ScrollRenderer {
	getElementBounds?: (id: number) => { y: number } | null;
	nativeSimulateScrollWheel: (
		x: number,
		y: number,
		deltaX: number,
		deltaY: number,
	) => void;
}

/** The test renderer, for scenarios that scroll the page. */
let scrollRenderer: ScrollRenderer | undefined;

/** Cards register here so a scenario can scroll one into view. */
const sections = new Map<string, HostElement>();

function Section(props: { id: string; title: string; children: JSX.Element }) {
	return (
		<div
			ref={(element) => {
				sections.set(props.id, element);
			}}
		>
			<DemoCard title={props.title}>{props.children}</DemoCard>
		</div>
	);
}

/** The rows once the tab, the type filter and the sort have had their say. */
function scoped(
	tab: string,
	type: string,
	sort: string,
): CommandMenuItemData[] {
	let rows = FULL;
	if (tab !== "all") rows = rows.filter((item) => item.group === tab);
	if (type !== "all") rows = rows.filter((item) => item.group === type);
	return sort === "az"
		? [...rows].sort((a, b) => a.label.localeCompare(b.label))
		: [...rows];
}

/** The two borderless selects of the filter row, which the playground and the Filters sections share. */
function FilterSelects(props: {
	testId: string;
	type: string;
	onType: (value: string) => void;
	sort: string;
	onSort: (value: string) => void;
}) {
	return (
		<>
			<Select
				testId={`${props.testId}-type`}
				variant="borderless"
				size="compact"
				hug
				label="Type"
				popupWidth={FILTER_POPUP_WIDTH}
				items={TYPES}
				value={props.type}
				onValueChange={props.onType}
			/>
			<Select
				testId={`${props.testId}-sort`}
				variant="borderless"
				size="compact"
				hug
				label="Sort"
				popupWidth={FILTER_POPUP_WIDTH}
				items={SORTS}
				value={props.sort}
				onValueChange={props.onSort}
			/>
		</>
	);
}

// ─── Trigger combos ──────────────────────────────────────────────────────────

/** The combo the Dialog section binds, as the source binds its own: the default ⌘K belongs to the site menu. */
const DIALOG_COMBO = "mod+p";

const TRIGGERS = ["mod+k", "mod+j", "mod+p", "mod+/"] as const;
type Trigger = (typeof TRIGGERS)[number];

const TRIGGER_OPTIONS = TRIGGERS.map((value) => ({
	value,
	label: formatShortcut(value).join(IS_MAC ? "" : "+"),
}));

/** FF's `matchesShortcut` for a "mod+<key>" combo: the key, or its physical key when Alt or a non-Latin layout changes the character; Meta or Ctrl, no Alt, Shift free. */
function matchesCombo(event: KeyEvent | DomEvent, combo: string): boolean {
	if (event.altKey === true) return false;
	if (event.metaKey !== true && event.ctrlKey !== true) return false;
	const key = combo.slice("mod+".length);
	const physical = key === "/" ? "Slash" : `Key${key.toUpperCase()}`;
	return event.key?.toLowerCase() === key || event.code === physical;
}

// ─── Playground ──────────────────────────────────────────────────────────────

const PLAYGROUND_PANEL_HEIGHT = 400;

function Playground() {
	const [shortcut, setShortcut] = createSignal<Trigger>("mod+k");
	const [descriptions, setDescriptions] = createSignal(true);
	const [shortcuts, setShortcuts] = createSignal(true);
	const [suggestions, setSuggestions] = createSignal(true);
	const [tabs, setTabs] = createSignal(true);
	const [filters, setFilters] = createSignal(false);
	const [footer, setFooter] = createSignal(true);
	const [open, setOpen] = createSignal(false);
	const [tab, setTab] = createSignal("all");
	const [type, setType] = createSignal("all");
	const [sort, setSort] = createSignal("default");

	const all = createMemo(() =>
		items({ descriptions: descriptions(), shortcuts: shortcuts() }),
	);
	// The header controls are state; the rows derive from them.
	const visible = createMemo(() => {
		let rows = all();
		if (tabs() && tab() !== "all") {
			rows = rows.filter((item) => item.group === tab());
		}
		if (filters() && type() !== "all") {
			rows = rows.filter((item) => item.group === type());
		}
		if (filters() && sort() === "az") {
			rows = [...rows].sort((a, b) => a.label.localeCompare(b.label));
		}
		return rows;
	});

	const shuffle = () => {
		setShortcut(pick(TRIGGERS));
		setDescriptions(Math.random() > 0.3);
		setShortcuts(Math.random() > 0.3);
		setSuggestions(Math.random() > 0.4);
		setTabs(Math.random() > 0.6);
		setFilters(Math.random() > 0.7);
		setFooter(Math.random() > 0.3);
	};

	const filterSelects = () => (
		<FilterSelects
			testId="play-filters"
			type={type()}
			onType={setType}
			sort={sort()}
			onSort={setSort}
		/>
	);
	// Both on: the filters ride the tab row's trailing edge, so the header stays one line.
	const menu = (testId: string) => (
		<CommandMenu
			testId={testId}
			items={visible()}
			suggestions={suggestions() ? SUGGESTIONS : undefined}
		>
			<CommandMenuInput testId={`${testId}-input`} placeholder={PLACEHOLDER} />
			<Show
				when={tabs()}
				fallback={
					<Show when={filters()}>
						<CommandMenuFilters>{filterSelects()}</CommandMenuFilters>
					</Show>
				}
			>
				<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab}>
					<Show when={filters()}>
						<CommandMenuFilters>{filterSelects()}</CommandMenuFilters>
					</Show>
				</CommandMenuTabs>
			</Show>
			<CommandMenuList>
				<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
			</CommandMenuList>
			<Show when={footer()}>
				<CommandMenuFooter />
			</Show>
		</CommandMenu>
	);

	return (
		<PlaygroundLayout
			minHeight={PLAYGROUND_PANEL_HEIGHT + 100}
			preview={
				// The combo fires only while focus is inside the preview: the site's own menu keeps the key everywhere else.
				<div
					testId="play-preview"
					onKeyDown={(event: KeyEvent) => {
						if (event.repeat === true || !matchesCombo(event, shortcut())) {
							return;
						}
						event.preventDefault();
						setOpen(!open());
					}}
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						gap: 16,
						width: "100%",
					}}
				>
					<CommandMenuPanel maxHeight={PLAYGROUND_PANEL_HEIGHT}>
						{menu("play")}
					</CommandMenuPanel>
					<Button
						testId="play-open"
						variant="secondary"
						onClick={() => setOpen(true)}
						trailingContent={<CommandMenuShortcut keys={shortcut()} />}
					>
						Open as a dialog
					</Button>
					<CommandMenuDialog open={open()} onOpenChange={setOpen}>
						{menu("play-dialog")}
					</CommandMenuDialog>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Dialog" />
					<PlayField label="Trigger shortcut">
						<PlaySelect
							testId="play-shortcut"
							value={shortcut()}
							onChange={setShortcut}
							options={TRIGGER_OPTIONS}
						/>
					</PlayField>
					<div style={{ paddingLeft: 4, paddingRight: 4 }}>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							Fires while the preview has focus.
						</text>
					</div>
					<PlayDivider />
					<PlaySection label="Rows" />
					<PlaySwitch
						testId="play-descriptions"
						label="Descriptions"
						checked={descriptions()}
						onToggle={() => setDescriptions(!descriptions())}
					/>
					<PlaySwitch
						testId="play-shortcuts"
						label="Shortcut caps"
						checked={shortcuts()}
						onToggle={() => setShortcuts(!shortcuts())}
					/>
					<PlaySwitch
						testId="play-suggestions"
						label="Suggestions first"
						checked={suggestions()}
						onToggle={() => setSuggestions(!suggestions())}
					/>
					<PlayDivider />
					<PlaySection label="Under the field" />
					<PlaySwitch
						testId="play-tabs"
						label="Tabs"
						checked={tabs()}
						onToggle={() => setTabs(!tabs())}
					/>
					<PlaySwitch
						testId="play-filters-switch"
						label="Filters"
						checked={filters()}
						onToggle={() => setFilters(!filters())}
					/>
					<PlayDivider />
					<PlaySection label="Under the list" />
					<PlaySwitch
						testId="play-footer"
						label="Footer hints"
						checked={footer()}
						onToggle={() => setFooter(!footer())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

function Basic() {
	return (
		<Section id="basic" title="Basic">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="basic" items={PLAIN}>
					<CommandMenuInput testId="basic-input" placeholder={PLACEHOLDER} />
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function Details() {
	return (
		<Section id="details" title="Descriptions, shortcuts, disabled rows">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="details" items={FULL}>
					<CommandMenuInput testId="details-input" placeholder={PLACEHOLDER} />
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function Suggestions() {
	return (
		<Section id="suggestions" title="Suggestions">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu
					testId="suggestions"
					items={FULL}
					suggestions={SUGGESTIONS}
					suggestionsLabel="Recent"
				>
					<CommandMenuInput
						testId="suggestions-input"
						placeholder={PLACEHOLDER}
					/>
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function Tabs() {
	const [tab, setTab] = createSignal("all");
	const visible = createMemo(() =>
		tab() === "all" ? FULL : FULL.filter((item) => item.group === tab()),
	);
	return (
		<Section id="tabs" title="Tabs">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="tabs" items={visible()}>
					<CommandMenuInput testId="tabs-input" placeholder={PLACEHOLDER} />
					<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab} />
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function Filters() {
	const [type, setType] = createSignal("all");
	const [sort, setSort] = createSignal("default");
	const visible = createMemo(() => {
		const rows =
			type() === "all" ? FULL : FULL.filter((item) => item.group === type());
		return sort() === "az"
			? [...rows].sort((a, b) => a.label.localeCompare(b.label))
			: rows;
	});
	return (
		<Section id="filters" title="Filters">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="filters" items={visible()}>
					<CommandMenuInput testId="filters-input" placeholder={PLACEHOLDER} />
					<CommandMenuFilters>
						<FilterSelects
							testId="filters"
							type={type()}
							onType={setType}
							sort={sort()}
							onSort={setSort}
						/>
					</CommandMenuFilters>
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function TabsAndFilters() {
	const [tab, setTab] = createSignal("all");
	const [type, setType] = createSignal("all");
	const [sort, setSort] = createSignal("default");
	const visible = createMemo(() => scoped(tab(), type(), sort()));
	return (
		<Section id="tabs-filters" title="Tabs and filters">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="tabs-filters" items={visible()}>
					<CommandMenuInput
						testId="tabs-filters-input"
						placeholder={PLACEHOLDER}
					/>
					<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab}>
						<CommandMenuFilters>
							<FilterSelects
								testId="tabs-filters"
								type={type()}
								onType={setType}
								sort={sort()}
								onSort={setSort}
							/>
						</CommandMenuFilters>
					</CommandMenuTabs>
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function Compact() {
	const [tab, setTab] = createSignal("all");
	const [type, setType] = createSignal("all");
	const [sort, setSort] = createSignal("default");
	const visible = createMemo(() => scoped(tab(), type(), sort()));
	return (
		<Section id="compact" title="Compact">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu
					testId="compact"
					size="compact"
					items={visible()}
					suggestions={SUGGESTIONS}
				>
					<CommandMenuInput testId="compact-input" placeholder={PLACEHOLDER} />
					<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab}>
						<CommandMenuFilters>
							<FilterSelects
								testId="compact"
								type={type()}
								onType={setType}
								sort={sort()}
								onSort={setSort}
							/>
						</CommandMenuFilters>
					</CommandMenuTabs>
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
					<CommandMenuFooter />
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

function DialogSection() {
	const [open, setOpen] = createSignal(false);
	const [openWithoutKey, setOpenWithoutKey] = createSignal(false);
	const [ran, setRan] = createSignal("Nothing yet");
	const run = (item: CommandMenuItemData) => setRan(item.label);

	// "Anywhere on this page": the window answers, and leaves with the page.
	const onKeyDown = (event: DomEvent) => {
		if (event.repeat === true || event.defaultPrevented) return;
		if (!matchesCombo(event, DIALOG_COMBO)) return;
		event.preventDefault();
		setOpen(!open());
	};
	appWindow.addEventListener("keydown", onKeyDown);
	onCleanup(() => appWindow.removeEventListener("keydown", onKeyDown));

	return (
		<Section id="dialog" title="Dialog and trigger shortcut">
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 12,
				}}
			>
				<Button
					testId="dialog-open"
					variant="secondary"
					onClick={() => setOpen(true)}
					trailingContent={<CommandMenuShortcut keys={DIALOG_COMBO} />}
				>
					Open
				</Button>
				<Button
					testId="dialog-open-no-shortcut"
					variant="ghost"
					onClick={() => setOpenWithoutKey(true)}
				>
					Open, no shortcut
				</Button>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{`Ran: ${ran()}`}
				</text>
			</div>
			<CommandMenuDialog open={open()} onOpenChange={setOpen}>
				<CommandMenu
					testId="dialog"
					items={FULL}
					suggestions={SUGGESTIONS}
					onSelect={run}
				>
					<CommandMenuInput testId="dialog-input" placeholder={PLACEHOLDER} />
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuDialog>
			<CommandMenuDialog
				open={openWithoutKey()}
				onOpenChange={setOpenWithoutKey}
			>
				<CommandMenu testId="dialog-no-shortcut" items={FULL} onSelect={run}>
					<CommandMenuInput
						testId="dialog-no-shortcut-input"
						placeholder={PLACEHOLDER}
					/>
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuDialog>
		</Section>
	);
}

function FooterSection() {
	const [tab, setTab] = createSignal("all");
	const visible = createMemo(() =>
		tab() === "all" ? FULL : FULL.filter((item) => item.group === tab()),
	);
	return (
		<Section id="footer" title="Footer hints">
			<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
				<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
					<CommandMenu
						testId="footer"
						items={visible()}
						suggestions={SUGGESTIONS}
					>
						<CommandMenuInput testId="footer-input" placeholder={PLACEHOLDER} />
						<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab} />
						<CommandMenuList>
							<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
						</CommandMenuList>
						<CommandMenuFooter />
					</CommandMenu>
				</CommandMenuPanel>
				<CommandMenuPanel>
					<CommandMenu testId="footer-custom" items={FULL.slice(0, 2)}>
						<CommandMenuInput placeholder={PLACEHOLDER} />
						<CommandMenuList />
						<CommandMenuFooter
							hints={[
								{ label: "Select", keys: ["up", "down"] },
								{ label: "Open", keys: "enter" },
								{ label: "Open menu", keys: "mod+k" },
							]}
						/>
					</CommandMenu>
				</CommandMenuPanel>
			</div>
		</Section>
	);
}

function CustomRows() {
	return (
		<Section id="custom" title="Custom rows">
			<CommandMenuPanel maxHeight={PANEL_HEIGHT}>
				<CommandMenu testId="custom" items={FULL}>
					<CommandMenuInput testId="custom-input" placeholder={PLACEHOLDER} />
					<CommandMenuList
						renderItem={(item: CommandMenuItemData) => (
							<CommandMenuItem value={item.value} icon={item.icon ?? "plus"}>
								<CommandMenuItemText>{item.label}</CommandMenuItemText>
								<Show when={item.group}>
									{(group: () => string) => (
										<CommandMenuItemText muted>{group()}</CommandMenuItemText>
									)}
								</Show>
							</CommandMenuItem>
						)}
					>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
				</CommandMenu>
			</CommandMenuPanel>
		</Section>
	);
}

export const title = "Command Menu";
export const group = "Components";

export function Demo() {
	scrollRenderer = useGpuixRequired() as unknown as ScrollRenderer;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
			<Playground />
			<Basic />
			<Details />
			<Suggestions />
			<Tabs />
			<Filters />
			<TabsAndFilters />
			<Compact />
			<DialogSection />
			<FooterSection />
			<CustomRows />
		</div>
	);
}

/** Wheels the page until the card's top edge sits under the heading (negative delta is down, as for `ShotContext.scroll`). gpuix's scrollIntoView does not reach the page's scroller from here. */
async function reveal(
	shot: Parameters<NonNullable<DemoModule["scenarios"]>>[0],
	id: string,
) {
	const section = sections.get(id);
	if (section === undefined || scrollRenderer === undefined) {
		throw new Error(`no section ${id}`);
	}
	const top = () => {
		const bounds = scrollRenderer?.getElementBounds?.(section.id);
		if (bounds == null) throw new Error(`no bounds for section ${id}`);
		return bounds.y;
	};
	let previous: number | undefined;
	for (let attempt = 0; attempt < 8; attempt++) {
		const offset = top() - 70;
		// The page stops at its end: a card near the bottom never reaches the top.
		if (Math.abs(offset) < 4 || previous === offset) break;
		previous = offset;
		scrollRenderer.nativeSimulateScrollWheel(925, 400, 0, -offset);
		await shot.settle(200);
	}
	await shot.settle();
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	shot.capture("playground");
	await shot.click("play-filters-switch-track");
	shot.capture("playground-tabs-and-filters");
	await shot.click("play-input");
	await shot.press("cmd-k");
	shot.capture("playground-dialog");
	await shot.press("escape");
	await shot.click("play-tabs-track");
	shot.capture("playground-filters-only");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	await reveal(shot, "basic");
	await shot.click("basic-input");
	shot.capture("basic-focused");
	await shot.press("down down");
	shot.capture("basic-arrowed");
	await shot.press("up up up");
	shot.capture("basic-wrapped");
	await shot.press("s e a");
	shot.capture("basic-filtered");
	await shot.press("z z z");
	shot.expectText(EMPTY, true);
	shot.capture("basic-empty");
	await shot.press("escape");
	shot.expectText(EMPTY, false);

	await reveal(shot, "details");
	await shot.click("details-input");
	await shot.press("m a i l");
	shot.capture("details-keyword");

	await reveal(shot, "suggestions");
	shot.capture("suggestions");

	await reveal(shot, "tabs");
	await shot.click("tabs-tab-Go to");
	shot.capture("tabs-go-to");
	await shot.hover("tabs-tab-Help");
	shot.capture("tabs-hover");

	await reveal(shot, "filters");
	// A pointer press that opens a popup cannot run in the test renderer: drive the select by key.
	await shot.focus("filters-sort-trigger");
	await shot.press("down");
	shot.capture("filters-open");
	await shot.press("down enter");
	await shot.settle(500);
	shot.capture("filters-sorted");

	await reveal(shot, "tabs-filters");
	shot.capture("tabs-and-filters");

	await reveal(shot, "compact");
	await shot.click("compact-input");
	shot.capture("compact");

	await reveal(shot, "footer");
	await shot.click("footer-input");
	await shot.press("right");
	shot.capture("footer-tabs");

	await reveal(shot, "custom");
	shot.capture("custom");

	await reveal(shot, "dialog");
	await shot.click("dialog-open");
	shot.capture("dialog-open");
	await shot.press("i n b");
	shot.capture("dialog-filtered");
	await shot.press("enter");
	shot.expectText("Ran: Inbox", true);
	shot.capture("dialog-picked");
	await shot.click("dialog-open");
	await shot.press("escape");
	shot.capture("dialog-closed");
	// The bound combo opens it from anywhere on the page, and again closes it.
	await shot.press("cmd-p");
	shot.capture("dialog-combo-open");
	await shot.press("cmd-p");
	shot.capture("dialog-combo-closed");
	await shot.click("dialog-open-no-shortcut");
	shot.capture("dialog-no-shortcut");
	await shot.press("escape");
};
