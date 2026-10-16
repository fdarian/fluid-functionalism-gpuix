import { createMemo, createSignal, For, type JSX, Show } from "solid-js";
import { Button } from "../components/button";
import {
	Dropdown,
	DropdownContent,
	DropdownEmpty,
	DropdownLabel,
	DropdownMenu,
	DropdownSearch,
	DropdownSeparator,
	DropdownSub,
	DropdownSubContent,
	DropdownSubTrigger,
	DropdownTrigger,
	MenuItem,
} from "../components/dropdown";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import type { IconName } from "../lib/icons";
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
import { color, type as scale, setThemeChoice } from "../lib/theme";

const ITEMS = [
	{ icon: "square-library", label: "Teamspaces" },
	{ icon: "clock", label: "Recents" },
	{ icon: "star", label: "Favorites" },
	{ icon: "users", label: "Shared" },
	{ icon: "lock", label: "Private" },
] as const;

const KEY_ROWS = ["Alpha", "Beta", "Bravo", "Charlie", "Charter"];
const FOLDERS = ["Inbox", "Design", "Engineering", "Marketing", "Archive"];
const STATUSES = [
	"Open",
	"In progress",
	"In review",
	"Blocked",
	"Done",
	"Archived",
];
const LABELS = [
	"Bug",
	"Feature",
	"Docs",
	"Design",
	"Performance",
	"Accessibility",
	"Refactor",
	"Testing",
	"Infrastructure",
	"Security",
	"Good first issue",
	"Help wanted",
];
const COMPONENTS = [
	"Accordion",
	"Badge",
	"Button",
	"Card",
	"CheckboxGroup",
	"ColorPicker",
	"Combobox",
	"Dialog",
	"Dropdown",
	"InputGroup",
	"RadioGroup",
	"Select",
	"Sidebar",
	"Slider",
	"Switch",
	"Table",
	"Tabs",
];
const LANGUAGES = [
	"Auto detect",
	"Albanian (Albania)",
	"Arabic",
	"Bengali",
	"Chinese (Simplified)",
	"Chinese (Traditional)",
	"Czech",
	"Danish",
	"Dutch",
	"English (UK)",
	"English (US)",
	"Finnish",
	"French",
	"German",
	"Greek",
	"Hebrew",
	"Hindi",
	"Hungarian",
	"Indonesian",
	"Italian",
	"Japanese",
	"Korean",
	"Norwegian",
	"Polish",
	"Portuguese (Brazil)",
	"Portuguese (Portugal)",
	"Romanian",
	"Russian",
	"Spanish",
	"Swedish",
	"Thai",
	"Turkish",
	"Ukrainian",
	"Vietnamese",
];

function toggled<Item>(list: readonly Item[], item: Item) {
	return list.includes(item)
		? list.filter((other) => other !== item)
		: [...list, item];
}

function includesQuery(item: string, query: string) {
	return item.toLowerCase().includes(query.toLowerCase());
}

const row = {
	display: "flex",
	flexDirection: "row",
	alignItems: "flex-start",
	gap: 24,
} as const;

type PlayRow = { icon: IconName; label: string; group: string };
type PlayMode = "menu" | "inline";
type PlaySelection = "single" | "multiple" | "none";

const PLAY_ROWS: readonly PlayRow[] = [
	{ icon: "mail", label: "Email", group: "Account" },
	{ icon: "bell", label: "Notifications", group: "Account" },
	{ icon: "shield", label: "Privacy", group: "Account" },
	{ icon: "settings", label: "General", group: "Appearance" },
	{ icon: "palette", label: "Theme", group: "Appearance" },
	{ icon: "monitor", label: "Display", group: "Appearance" },
];
const PLAY_GROUPS = ["Account", "Appearance"] as const;
const PLAY_DISABLED_LABEL = "Privacy";
const PLAY_SUBMENU_LABEL = "Theme";
const PLAY_THEMES = [
	{ icon: "sun", label: "Light" },
	{ icon: "moon", label: "Dark" },
	{ icon: "monitor", label: "System" },
] as const;

const MODE_OPTIONS = [
	{ value: "menu", label: "Menu" },
	{ value: "inline", label: "Inline panel" },
] as const;
const SELECTION_OPTIONS = [
	{ value: "single", label: "Single" },
	{ value: "multiple", label: "Multiple" },
	{ value: "none", label: "Actions" },
] as const;

function Playground() {
	const [mode, setMode] = createSignal<PlayMode>("menu");
	const [selection, setSelection] = createSignal<PlaySelection>("single");
	const [search, setSearch] = createSignal(false);
	const [showIcons, setShowIcons] = createSignal(true);
	const [groups, setGroups] = createSignal(false);
	const [disabledRow, setDisabledRow] = createSignal(false);
	const [creatable, setCreatable] = createSignal(false);
	const [submenu, setSubmenu] = createSignal(true);

	// Selections are kept by label so they survive filtering.
	const [selected, setSelected] = createSignal<string | null>("Email");
	const [picked, setPicked] = createSignal<readonly string[]>([
		"Email",
		"Notifications",
	]);
	const [query, setQuery] = createSignal("");
	const [theme, setTheme] = createSignal("System");
	const [items, setItems] = createSignal<readonly PlayRow[]>(PLAY_ROWS);

	// A search field lives in the popup only and replaces the groups; the create row reads the query; the inline panel has no submenu.
	const hasSearch = () => mode() === "menu" && search();
	const hasGroups = () => !hasSearch() && groups();
	const hasCreate = () => hasSearch() && creatable();
	const hasSubmenu = () => mode() === "menu" && submenu();

	const shuffle = () => {
		setMode(pick(["menu", "inline"] as const));
		setSelection(pick(["single", "multiple", "none"] as const));
		setSearch(Math.random() > 0.6);
		setShowIcons(Math.random() > 0.3);
		setGroups(Math.random() > 0.6);
		setDisabledRow(Math.random() > 0.7);
		setCreatable(Math.random() > 0.6);
		setSubmenu(Math.random() > 0.4);
		setQuery("");
		setItems(PLAY_ROWS);
	};

	const rows = () =>
		hasSearch()
			? items().filter((item) => includesQuery(item.label, query()))
			: items();
	const checkedIndex = () => {
		const index = rows().findIndex((item) => item.label === selected());
		return selection() === "single" && index !== -1 ? index : undefined;
	};
	const checkedIndices = () =>
		selection() === "multiple"
			? rows().flatMap((item, index) =>
					picked().includes(item.label) ? [index] : [],
				)
			: undefined;
	const trimmed = () => query().trim();
	const canCreate = () =>
		hasCreate() &&
		trimmed() !== "" &&
		!items().some(
			(item) => item.label.toLowerCase() === trimmed().toLowerCase(),
		);
	const icon = (name: IconName) => (showIcons() ? name : undefined);

	const renderRow = (item: PlayRow, index: () => number): JSX.Element =>
		hasSubmenu() && item.label === PLAY_SUBMENU_LABEL ? (
			<DropdownSub>
				<DropdownSubTrigger
					testId={`play-row-${item.label}`}
					index={index()}
					icon={icon(item.icon)}
					label={item.label}
				/>
				<DropdownSubContent
					checkedIndex={PLAY_THEMES.findIndex((t) => t.label === theme())}
				>
					<For each={PLAY_THEMES}>
						{(t, themeIndex) => (
							<MenuItem
								testId={`play-theme-${t.label}`}
								index={themeIndex()}
								icon={icon(t.icon)}
								label={t.label}
								checked={theme() === t.label}
								onSelect={() => setTheme(t.label)}
							/>
						)}
					</For>
				</DropdownSubContent>
			</DropdownSub>
		) : (
			<MenuItem
				testId={`play-row-${item.label}`}
				index={index()}
				icon={icon(item.icon)}
				label={item.label}
				disabled={disabledRow() && item.label === PLAY_DISABLED_LABEL}
				checked={
					selection() === "single"
						? selected() === item.label
						: selection() === "multiple"
							? picked().includes(item.label)
							: undefined
				}
				onSelect={() => {
					if (selection() === "single") setSelected(item.label);
					else if (selection() === "multiple")
						setPicked(toggled(picked(), item.label));
				}}
			/>
		);

	const content = () => (
		<>
			<Show
				when={hasGroups()}
				fallback={
					<For each={rows()}>{(item, index) => renderRow(item, index)}</For>
				}
			>
				<For each={PLAY_GROUPS}>
					{(group) => {
						const first = () =>
							rows().findIndex((item) => item.group === group);
						return (
							<>
								<Show when={first() > 0}>
									<DropdownSeparator />
								</Show>
								<DropdownLabel>{group}</DropdownLabel>
								<For each={rows().filter((item) => item.group === group)}>
									{(item, index) => renderRow(item, () => first() + index())}
								</For>
							</>
						);
					}}
				</For>
			</Show>
			<Show when={canCreate()}>
				<MenuItem
					testId="play-create"
					index={rows().length}
					icon={icon("plus")}
					label={`Create “${trimmed()}”`}
					closeOnClick={selection() === "multiple" ? false : undefined}
					onSelect={() => {
						const created = trimmed();
						setItems([
							...items(),
							{ icon: "plus", label: created, group: PLAY_GROUPS[1] },
						]);
						if (selection() === "single") setSelected(created);
						else if (selection() === "multiple")
							setPicked(toggled(picked(), created));
						setQuery("");
					}}
				/>
			</Show>
			<Show when={hasSearch() && rows().length === 0 && !canCreate()}>
				<DropdownEmpty>No results</DropdownEmpty>
			</Show>
		</>
	);

	const triggerLabel = () =>
		selection() === "single"
			? (selected() ?? "Choose")
			: selection() === "multiple"
				? `Filters · ${picked().length}`
				: "Open menu";

	return (
		<PlaygroundLayout
			minHeight={360}
			preview={
				<div style={{ paddingTop: 24 }}>
					<Show
						when={mode() === "menu"}
						fallback={
							<Dropdown
								testId="play-inline"
								checkedIndex={checkedIndex()}
								checkedIndices={checkedIndices()}
							>
								{content()}
							</Dropdown>
						}
					>
						<DropdownMenu testId="play-menu">
							<DropdownTrigger>
								{(trigger) => (
									<Button
										testId="play-trigger"
										variant="ghost"
										trailingIcon="chevron-down"
										{...trigger.attributes}
										onMouseDown={trigger.onMouseDown}
										onClick={trigger.onClick}
									>
										{triggerLabel()}
									</Button>
								)}
							</DropdownTrigger>
							<DropdownContent
								checkedIndex={checkedIndex()}
								checkedIndices={checkedIndices()}
							>
								<Show when={hasSearch()}>
									<DropdownSearch
										value={query()}
										onValueChange={setQuery}
										placeholder="Search…"
									/>
								</Show>
								{content()}
							</DropdownContent>
						</DropdownMenu>
					</Show>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Dropdown" />
					<PlayField label="Mode">
						<PlaySelect
							testId="play-mode"
							value={mode()}
							onChange={setMode}
							options={MODE_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Selection">
						<PlaySelect
							testId="play-selection"
							value={selection()}
							onChange={setSelection}
							options={SELECTION_OPTIONS}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-search"
						label="Search"
						checked={hasSearch()}
						onToggle={() => setSearch(!search())}
						disabled={mode() !== "menu"}
					/>
					<PlaySwitch
						testId="play-creatable"
						label="Create from query"
						checked={hasCreate()}
						onToggle={() => setCreatable(!creatable())}
						disabled={!hasSearch()}
					/>
					<PlayDivider />
					<PlaySection label="Rows" />
					<PlaySwitch
						testId="play-icons"
						label="Icons"
						checked={showIcons()}
						onToggle={() => setShowIcons(!showIcons())}
					/>
					<PlaySwitch
						testId="play-groups"
						label="Groups"
						checked={hasGroups()}
						onToggle={() => setGroups(!groups())}
						disabled={hasSearch()}
					/>
					<PlaySwitch
						testId="play-disabled"
						label="Disabled row"
						checked={disabledRow()}
						onToggle={() => setDisabledRow(!disabledRow())}
					/>
					<PlaySwitch
						testId="play-submenu"
						label="Submenu"
						checked={hasSubmenu()}
						onToggle={() => setSubmenu(!submenu())}
						disabled={mode() !== "menu"}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

function Basic() {
	const [selected, setSelected] = createSignal<number | null>(0);
	return (
		<DemoCard title="Dropdown, basic">
			<Dropdown testId="basic" checkedIndex={selected() ?? undefined}>
				<For each={ITEMS}>
					{(item, index) => (
						<MenuItem
							testId={`basic-${index()}`}
							index={index()}
							icon={item.icon}
							label={item.label}
							checked={selected() === index()}
							onSelect={() =>
								setSelected(selected() === index() ? null : index())
							}
						/>
					)}
				</For>
			</Dropdown>
		</DemoCard>
	);
}

function Groups() {
	return (
		<DemoCard title="Dropdown, groups">
			<Dropdown testId="groups">
				<DropdownLabel>Account</DropdownLabel>
				<MenuItem testId="groups-0" index={0} icon="mail" label="Email" />
				<MenuItem index={1} icon="bell" label="Notifications" />
				<MenuItem index={2} icon="shield" label="Privacy" />
				<DropdownSeparator />
				<DropdownLabel>Appearance</DropdownLabel>
				<MenuItem index={3} icon="settings" label="General" />
				<MenuItem index={4} icon="palette" label="Theme" />
				<MenuItem index={5} icon="monitor" label="Display" disabled />
			</Dropdown>
		</DemoCard>
	);
}

function Triggered() {
	const [view, setView] = createSignal(0);
	return (
		<DemoCard title="Dropdown, triggered menu">
			<div style={{ ...row, minHeight: 56 }}>
				<DropdownMenu testId="menu">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="menu-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								Open menu
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent checkedIndex={view()}>
						<For each={ITEMS}>
							{(item, index) => (
								<MenuItem
									testId={`menu-${index()}`}
									index={index()}
									icon={item.icon}
									label={item.label}
									checked={view() === index()}
									onSelect={() => setView(index())}
								/>
							)}
						</For>
					</DropdownContent>
				</DropdownMenu>
			</div>
		</DemoCard>
	);
}

function Submenus() {
	const [picked, setPicked] = createSignal("");
	return (
		<DemoCard title="Dropdown, submenus">
			<div style={{ ...row, alignItems: "center", minHeight: 56 }}>
				<DropdownMenu testId="sub">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="sub-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								Q3 report.pdf
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent>
						<DropdownSub>
							<DropdownSubTrigger
								testId="sub-move"
								index={0}
								icon="folder"
								label="Move to"
							/>
							<DropdownSubContent>
								<For each={FOLDERS}>
									{(folder, index) => (
										<MenuItem
											testId={`sub-folder-${folder}`}
											index={index()}
											label={folder}
											onSelect={() => setPicked(`Moved to ${folder}`)}
										/>
									)}
								</For>
							</DropdownSubContent>
						</DropdownSub>
						<DropdownSub>
							<DropdownSubTrigger
								testId="sub-share"
								index={1}
								icon="link"
								label="Share"
							/>
							<DropdownSubContent>
								<MenuItem
									index={0}
									icon="link"
									label="Copy link"
									onSelect={() => setPicked("Copied link")}
								/>
								<MenuItem
									index={1}
									icon="mail"
									label="Email"
									onSelect={() => setPicked("Emailed")}
								/>
							</DropdownSubContent>
						</DropdownSub>
						<MenuItem
							testId="sub-rename"
							index={2}
							icon="pencil"
							label="Rename"
							onSelect={() => setPicked("Renamed")}
						/>
					</DropdownContent>
				</DropdownMenu>
				<Show when={picked() !== ""}>
					<text style={{ ...scale.caption, color: color.mutedForeground }}>
						{picked()}
					</text>
				</Show>
			</div>
		</DemoCard>
	);
}

function Keyboard() {
	const [picked, setPicked] = createSignal("");
	const [changes, setChanges] = createSignal(0);
	return (
		<DemoCard title="Dropdown, keyboard">
			<div style={{ ...row, alignItems: "center", minHeight: 56 }}>
				<DropdownMenu
					testId="keys"
					onOpenChange={() => setChanges(changes() + 1)}
				>
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="keys-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								Keys
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent>
						<For each={KEY_ROWS}>
							{(label, index) => (
								<MenuItem
									testId={`keys-${index()}`}
									index={index()}
									label={label}
									disabled={label === "Beta"}
									onSelect={() => setPicked(label)}
								/>
							)}
						</For>
					</DropdownContent>
				</DropdownMenu>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{`picked: ${picked()} changes: ${changes()}`}
				</text>
			</div>
		</DemoCard>
	);
}

function Multiple() {
	const [checked, setChecked] = createSignal<number[]>([0, 1, 2]);
	return (
		<DemoCard title="Dropdown, multiple selection">
			<div style={{ ...row, minHeight: 56 }}>
				<DropdownMenu testId="multi">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="multi-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								Status
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent checkedIndices={checked()}>
						<For each={STATUSES}>
							{(status, index) => (
								<MenuItem
									testId={`multi-${index()}`}
									index={index()}
									label={status}
									checked={checked().includes(index())}
									onSelect={() => setChecked(toggled(checked(), index()))}
								/>
							)}
						</For>
					</DropdownContent>
				</DropdownMenu>
			</div>
		</DemoCard>
	);
}

function Searchable() {
	const [language, setLanguage] = createSignal("Auto detect");
	const [query, setQuery] = createSignal("");
	const matches = createMemo(() =>
		LANGUAGES.filter((item) => includesQuery(item, query())),
	);
	return (
		<DemoCard title="Dropdown, searchable menu">
			<div style={{ ...row, minHeight: 56 }}>
				<DropdownMenu testId="search">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="search-trigger"
								variant="ghost"
								trailingIcon="chevron-down"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								{language()}
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent checkedIndex={matches().indexOf(language())}>
						<DropdownSearch
							value={query()}
							onValueChange={setQuery}
							placeholder="Search languages"
						/>
						<For each={matches()}>
							{(item, index) => (
								<MenuItem
									testId={`search-${index()}`}
									index={index()}
									label={item}
									checked={language() === item}
									onSelect={() => setLanguage(item)}
								/>
							)}
						</For>
						<Show when={matches().length === 0}>
							<DropdownEmpty>No languages found</DropdownEmpty>
						</Show>
					</DropdownContent>
				</DropdownMenu>
			</div>
		</DemoCard>
	);
}

function SearchableMultiple() {
	const [labels, setLabels] = createSignal(["Bug", "Design"]);
	const [query, setQuery] = createSignal("");
	const matches = createMemo(() =>
		LABELS.filter((item) => includesQuery(item, query())),
	);
	return (
		<DemoCard title="Dropdown, searchable multiple selection">
			<div style={{ ...row, minHeight: 56 }}>
				<DropdownMenu testId="labels">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="labels-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								{`Labels · ${labels().length}`}
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent
						checkedIndices={matches().flatMap((item, index) =>
							labels().includes(item) ? [index] : [],
						)}
					>
						<DropdownSearch
							value={query()}
							onValueChange={setQuery}
							placeholder="Search labels"
						/>
						<For each={matches()}>
							{(item, index) => (
								<MenuItem
									testId={`labels-${item}`}
									index={index()}
									label={item}
									checked={labels().includes(item)}
									onSelect={() => setLabels(toggled(labels(), item))}
								/>
							)}
						</For>
						<Show when={matches().length === 0}>
							<DropdownEmpty>No labels found</DropdownEmpty>
						</Show>
					</DropdownContent>
				</DropdownMenu>
			</div>
		</DemoCard>
	);
}

function Creatable() {
	const [components, setComponents] = createSignal(COMPONENTS);
	const [used, setUsed] = createSignal(["Button", "Combobox"]);
	const [query, setQuery] = createSignal("");
	const matches = createMemo(() =>
		components().filter((item) => includesQuery(item, query())),
	);
	const trimmed = () => query().trim();
	const canCreate = () =>
		trimmed() !== "" &&
		!components().some(
			(item) => item.toLowerCase() === trimmed().toLowerCase(),
		);
	return (
		<DemoCard title="Dropdown, creatable">
			<div style={{ ...row, minHeight: 56 }}>
				<DropdownMenu testId="create">
					<DropdownTrigger>
						{(trigger) => (
							<Button
								testId="create-trigger"
								variant="ghost"
								{...trigger.attributes}
								onMouseDown={trigger.onMouseDown}
								onClick={trigger.onClick}
							>
								{`Components · ${used().length}`}
							</Button>
						)}
					</DropdownTrigger>
					<DropdownContent
						checkedIndices={matches().flatMap((item, index) =>
							used().includes(item) ? [index] : [],
						)}
					>
						<DropdownSearch
							value={query()}
							onValueChange={setQuery}
							placeholder="Search components"
						/>
						<For each={matches()}>
							{(item, index) => (
								<MenuItem
									index={index()}
									label={item}
									checked={used().includes(item)}
									onSelect={() => setUsed(toggled(used(), item))}
								/>
							)}
						</For>
						<Show when={canCreate()}>
							<MenuItem
								testId="create-row"
								index={matches().length}
								icon="plus"
								label={`Create “${trimmed()}”`}
								closeOnClick={false}
								onSelect={() => {
									const created = trimmed();
									setComponents([...components(), created]);
									setUsed(toggled(used(), created));
									setQuery("");
								}}
							/>
						</Show>
						<Show when={matches().length === 0 && !canCreate()}>
							<DropdownEmpty>No components found</DropdownEmpty>
						</Show>
					</DropdownContent>
				</DropdownMenu>
			</div>
		</DemoCard>
	);
}

export const title = "Dropdown";
export const group = "Components";

export function Demo() {
	return (
		<>
			<Playground />
			<Basic />
			<Groups />
			<Triggered />
			<Submenus />
			<Keyboard />
			<Multiple />
			<Searchable />
			<SearchableMultiple />
			<Creatable />
		</>
	);
}

/** Wheels the page until the trigger sits near the top, where its popup has room below, or the page ends. It starts from the top and walks down: an element too far outside the window has no painted bounds to aim at. */
async function reveal(shot: ShotContext, testId: string) {
	await shot.scroll(700, 400, 0, 100000);
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 30; attempt++) {
		let y: number;
		try {
			y = shot.centerOf(testId).y;
		} catch {
			await shot.scroll(700, 400, 0, -500);
			continue;
		}
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, -(y - 200));
	}
	throw new Error(`could not scroll ${testId} into view`);
}

/** Opens a playground select from the keyboard (a pointer press that opens a popup cannot run in the test renderer) and walks `steps` rows. */
async function pickOption(shot: ShotContext, testId: string, steps: string) {
	await shot.focus(`${testId}-trigger`);
	await shot.press(`${steps} enter`);
	await shot.settle(300);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The playground's controls sit in the right column.
	shot.capture("playground");
	await shot.focus("play-trigger");
	await shot.press("enter");
	await shot.hover("play-row-Theme");
	await shot.settle(300);
	shot.capture("playground-menu");
	await shot.press("escape escape");
	await pickOption(shot, "play-selection", "down down");
	await shot.click("play-search-track");
	await shot.click("play-creatable-track");
	await shot.focus("play-trigger");
	await shot.press("enter");
	await shot.press("x y z");
	shot.expectText("Create “xyz”", true);
	shot.capture("playground-search-create");
	await shot.press("escape");
	await shot.click("play-search-track");
	await pickOption(shot, "play-mode", "down down");
	await shot.click("play-groups-track");
	await shot.click("play-disabled-track");
	shot.capture("playground-inline-groups");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	// The inline panel is a plain group: its rows take the focus, so the group names no lit row.
	await reveal(shot, "groups-0");
	await shot.focus("groups-0");
	shot.expectAria("groups", { role: "Group", active_descendant: undefined });
	await shot.press("down");
	await shot.press("up");
	shot.expectAria("groups", { active_descendant: undefined });
	// Opened by key, which the test renderer can run: the trigger names its popup, and the focused row is not an activedescendant.
	await reveal(shot, "menu-trigger");
	await shot.focus("menu-trigger");
	shot.expectAria("menu-trigger", {
		role: "Button",
		expanded: false,
		has_popup: "Menu",
		controls: undefined,
		active_descendant: undefined,
	});
	await shot.press("enter");
	shot.expectAria("menu-trigger", { expanded: true });
	const popup = shot.aria("menu-trigger").controls;
	if (!Array.isArray(popup) || popup.length !== 1)
		throw new Error("an open trigger controls its popup");
	shot.expectAria(String(popup[0]), {
		role: "Menu",
		labelled_by: [shot.idOf("menu-trigger")],
	});
	shot.expectAria("menu-trigger", { active_descendant: undefined });
	await shot.press("down");
	shot.expectAria("menu-trigger", { active_descendant: undefined });
	shot.expectAria("menu-1", { role: "MenuItemRadio", toggled: "False" });
	await shot.press("escape");
	await shot.settle(300);
	// Submenu: the trigger row names its popup; the keys are inside it by real focus, so no row is an activedescendant.
	await reveal(shot, "sub-trigger");
	await shot.focus("sub-trigger");
	await shot.press("enter");
	shot.expectAria("sub-move", { has_popup: "Menu", expanded: false });
	await shot.press("right");
	await shot.settle(300);
	const subPopup = shot.aria("sub-move").controls;
	if (!Array.isArray(subPopup) || subPopup.length !== 1)
		throw new Error("an open submenu trigger controls its popup");
	shot.expectAria(String(subPopup[0]), {
		role: "Menu",
		labelled_by: [shot.idOf("sub-move")],
	});
	shot.expectAria("sub-trigger", { active_descendant: undefined });
	await shot.press("escape escape");
	// Arrows land on a disabled row; it says so.
	await reveal(shot, "keys-trigger");
	await shot.focus("keys-trigger");
	await shot.press("enter");
	shot.expectAria("keys-1", { disabled: true });
	await shot.press("escape");

	await shot.scroll(700, 400, 0, 5000);
	await reveal(shot, "basic-0");
	await shot.hover("basic-2");
	shot.capture("inline-hover");
	await shot.click("basic-3");
	await shot.moveTo(700, 80);
	shot.capture("inline-checked");
	await reveal(shot, "groups-0");
	await shot.click("groups-0");
	await shot.press("down down");
	shot.capture("inline-keyboard");
	await shot.press("down down down down down");
	shot.capture("inline-disabled-lit");

	await reveal(shot, "menu-trigger");
	await shot.click("menu-trigger");
	shot.capture("menu-open");
	await shot.hover("menu-3");
	shot.capture("menu-hover");
	const label = shot.centerOf("menu-1");
	await shot.moveTo(label.x - 85, label.y);
	shot.capture("menu-hover-label");
	await shot.click("menu-3");
	await shot.click("menu-trigger");
	shot.capture("menu-picked");
	await shot.press("escape");

	await reveal(shot, "sub-trigger");
	await shot.click("sub-trigger");
	await shot.hover("sub-move");
	await shot.settle(300);
	shot.capture("sub-open");
	await shot.hover("sub-folder-Design");
	shot.capture("sub-hover");
	await shot.hover("sub-rename");
	await shot.settle(400);
	shot.capture("sub-left-for-rename");
	await shot.hover("sub-move");
	await shot.settle(300);
	await shot.hover("sub-folder-Design");
	await shot.click("sub-folder-Design");
	shot.expectText("Moved to Design", true);
	await shot.click("sub-trigger");
	await shot.press("right");
	shot.capture("sub-keyboard");
	await shot.press("down down left");
	shot.capture("sub-keyboard-left");
	await shot.press("escape");

	// A hover-opened submenu leaves the keys with its parent until Right goes in.
	await shot.click("sub-trigger");
	await shot.hover("sub-move");
	await shot.settle(300);
	shot.expectText("Inbox", true);
	await shot.press("down");
	await shot.settle(300);
	shot.expectText("Inbox", false);
	await shot.press("right");
	await shot.settle(300);
	shot.capture("sub-hover-then-right");
	shot.expectText("Copy link", true);
	await shot.press("escape escape");

	await reveal(shot, "keys-trigger");
	await shot.click("keys-trigger");
	shot.expectText("changes: 1", true);
	// Arrows land on the disabled "Beta"; Enter on it picks nothing.
	await shot.press("down enter");
	shot.expectText("picked:  changes", true);
	shot.capture("keys-disabled-lit");
	await shot.press("down enter");
	shot.expectText("picked: Bravo", true);
	// Closing hands focus back to the trigger, so Up opens on the last row.
	await shot.press("up");
	shot.capture("keys-up-opens-last");
	await shot.press("enter");
	shot.expectText("picked: Charter", true);
	await shot.click("keys-trigger");
	await shot.press("c enter");
	shot.expectText("picked: Charlie", true);
	await shot.click("keys-trigger");
	await shot.press("c c enter");
	shot.expectText("picked: Charter", true);
	// Press on the trigger, hold, release on a row: it picks.
	await shot.down("keys-trigger");
	await shot.settle(300);
	shot.capture("keys-press-held");
	await shot.up("keys-2");
	shot.expectText("picked: Bravo", true);

	await reveal(shot, "multi-trigger");
	await shot.click("multi-trigger");
	shot.capture("multi-open");
	await shot.click("multi-3");
	shot.capture("multi-merged");
	await shot.click("multi-1");
	shot.capture("multi-split");
	await shot.press("escape");

	await reveal(shot, "search-trigger");
	await shot.click("search-trigger");
	shot.capture("search-open");
	await shot.press("down");
	shot.capture("search-row-lit");
	await shot.press("f r");
	shot.capture("search-filtered");
	await shot.press("z z z");
	shot.expectText("No languages found", true);
	shot.capture("search-empty");
	await shot.press("escape");

	await reveal(shot, "labels-trigger");
	await shot.click("labels-trigger");
	await shot.press("down down");
	shot.capture("labels-keyboard");
	await shot.press("enter");
	shot.capture("labels-toggled");
	await shot.press("escape");

	await reveal(shot, "create-trigger");
	await shot.click("create-trigger");
	await shot.press("x y z");
	shot.expectText("Create “xyz”", true);
	shot.capture("create-row");
	await shot.press("escape");

	setThemeChoice("light");
	await reveal(shot, "menu-trigger");
	await shot.click("menu-trigger");
	await shot.hover("menu-2");
	shot.capture("light-menu");
	await shot.press("escape");
	await reveal(shot, "sub-trigger");
	await shot.click("sub-trigger");
	await shot.press("right");
	shot.capture("light-sub");
	await shot.press("escape escape");
	await reveal(shot, "multi-trigger");
	await shot.click("multi-trigger");
	shot.capture("light-multi");
	await shot.press("escape");
	setThemeChoice("dark");
};
