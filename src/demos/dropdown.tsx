import { createMemo, createSignal, For, Show } from "solid-js";
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
import { color, setThemeChoice, type as scale } from "../lib/theme";


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
					<text style={{ ...scale.caption, color: color.mutedForeground }}>{picked()}</text>
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

/** Wheels the page until the trigger sits near the top, where its popup has room below, or the page ends. */
async function reveal(shot: ShotContext, testId: string) {
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 8; attempt++) {
		const y = shot.centerOf(testId).y;
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, -(y - 200));
	}
	throw new Error(`could not scroll ${testId} into view`);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The inline panel holds the focus itself and names the row its ring is on.
	await shot.focus("groups");
	shot.expectAria("groups", { active_descendant: shot.idOf("groups-0") });
	await shot.press("down");
	await shot.press("up");
	shot.expectAria("groups", { active_descendant: shot.idOf("groups-0") });
	// Opened by key, which the test renderer can run: the trigger names its popup and the row the keys lit.
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
	shot.expectAria("menu-trigger", { active_descendant: shot.idOf("menu-0") });
	await shot.press("down");
	shot.expectAria("menu-trigger", { active_descendant: shot.idOf("menu-1") });
	shot.expectAria("menu-1", { role: "MenuItemRadio", toggled: "False" });
	await shot.press("escape");
	// Submenu: the trigger row names its popup, and once the keys are inside the lit row is the submenu's.
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
	shot.expectAria("sub-trigger", {
		active_descendant: shot.idOf("sub-folder-Inbox"),
	});
	await shot.press("escape escape");
	// Arrows land on a disabled row; it says so.
	await shot.focus("keys-trigger");
	await shot.press("enter");
	shot.expectAria("keys-1", { disabled: true });
	await shot.press("escape");

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
