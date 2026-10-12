import { type HostElement, useGpuixRequired } from "@gpuix/solid";
import { createMemo, createSignal, For, type JSX, Show } from "solid-js";
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
} from "../components/command-menu";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { isInside, PopupSurface } from "../lib/popup";
import { createPresence } from "../lib/presence";
import { color, radius, type as scale } from "../lib/theme";

const link = defineIcon(
	'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
);
const image = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
);
const home = defineIcon(
	'<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
);
const inbox = defineIcon(
	'<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
);
const calendar = defineIcon(
	'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
);
const library = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7v10"/><path d="M11 7v10"/><path d="m15 7 2 10"/>',
);
const rocket = defineIcon(
	'<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
);
const message = defineIcon('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>');

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
			icon: link,
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
			icon: image,
			keywords: ["download"],
			group: "Actions",
			disabled: true,
		},
		{
			value: "home",
			label: "Home",
			action: "Go to Home",
			icon: home,
			group: "Go to",
		},
		{
			value: "inbox",
			label: "Inbox",
			action: "Go to Inbox",
			description: "3 unread",
			icon: inbox,
			keywords: ["mail", "notifications"],
			group: "Go to",
		},
		{
			value: "calendar",
			label: "Calendar",
			action: "Go to Calendar",
			description: "Today",
			icon: calendar,
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
			icon: library,
			keywords: ["help", "guide"],
			group: "Help",
		},
		{
			value: "whats-new",
			label: "What's new",
			description: "Release notes",
			icon: rocket,
			keywords: ["changelog", "updates"],
			group: "Help",
		},
		{
			value: "support",
			label: "Contact support",
			description: "Reply within a day",
			icon: message,
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
	const renderer = useGpuixRequired();
	return (
		<div
			ref={(element) => {
				sections.set(props.id, element);
				// The first bounds query turns tracking on, so a scenario can read it.
				renderer.getElementBounds?.(element.id);
			}}
		>
			<DemoCard title={props.title}>{props.children}</DemoCard>
		</div>
	);
}

/** A borderless select for the filter row: label, chevron, and a small fluid-less popup. */
function FilterSelect(props: {
	testId: string;
	options: readonly { value: string; label: string }[];
	value: string;
	onValueChange: (value: string) => void;
}) {
	const presence = createPresence();
	const [hovered, setHovered] = createSignal(false);
	let root: HostElement | undefined;
	let popup: HostElement | undefined;
	const label = () =>
		props.options.find((option) => option.value === props.value)?.label;
	return (
		<div
			ref={(element) => {
				root = element;
			}}
			onMouseDownOutside={(event) => {
				if (!isInside(event, [root, popup])) presence.hide();
			}}
			style={{ position: "relative" }}
		>
			<div
				testId={props.testId}
				role="button"
				onClick={() => (presence.open() ? presence.hide() : presence.show())}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 4,
					height: 28,
					paddingLeft: 10,
					paddingRight: 8,
					borderRadius: radius.item,
					cursor: "pointer",
					hover: { backgroundColor: color.hover },
				}}
			>
				<text
					style={{
						...scale.bodyCompact,
						color: hovered() ? color.foreground : color.mutedForeground,
						whiteSpace: "nowrap",
					}}
				>
					{label()}
				</text>
				<Icon
					name="chevron-down"
					size={14}
					strokeWidth={2}
					color={hovered() ? color.foreground : color.mutedForeground}
				/>
			</div>
			<PopupSurface
				presence={presence}
				align="start"
				width={150}
				onDismiss={() => presence.hide()}
				onMouseDownOutside={(event) => {
					if (!isInside(event, [root, popup])) presence.hide();
				}}
				popupRef={(element) => {
					popup = element;
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", padding: 4 }}>
					<For each={props.options}>
						{(option) => (
							<div
								role="option"
								onClick={() => {
									props.onValueChange(option.value);
									presence.hide();
								}}
								style={{
									display: "flex",
									alignItems: "center",
									height: 28,
									paddingLeft: 6,
									paddingRight: 6,
									borderRadius: radius.item,
									cursor: "pointer",
									hover: { backgroundColor: color.hover },
								}}
							>
								<text
									style={{
										...scale.bodyCompact,
										color:
											option.value === props.value
												? color.foreground
												: color.mutedForeground,
									}}
								>
									{option.label}
								</text>
							</div>
						)}
					</For>
				</div>
			</PopupSurface>
		</div>
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
						<FilterSelect
							testId="filters-type"
							options={TYPES}
							value={type()}
							onValueChange={setType}
						/>
						<FilterSelect
							testId="filters-sort"
							options={SORTS}
							value={sort()}
							onValueChange={setSort}
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

function DialogSection() {
	const [open, setOpen] = createSignal(false);
	const [ran, setRan] = createSignal("Nothing yet");
	return (
		<Section id="dialog" title="Dialog">
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
				>
					Open
				</Button>
				<CommandMenuShortcut keys="mod+k" />
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{`Ran: ${ran()}`}
				</text>
			</div>
			<CommandMenuDialog open={open()} onOpenChange={setOpen}>
				<CommandMenu
					testId="dialog"
					items={FULL}
					suggestions={SUGGESTIONS}
					onSelect={(item: CommandMenuItemData) => {
						setRan(item.label);
						setOpen(false);
					}}
				>
					<CommandMenuInput testId="dialog-input" placeholder={PLACEHOLDER} />
					<CommandMenuList>
						<CommandMenuEmpty>{EMPTY}</CommandMenuEmpty>
					</CommandMenuList>
					<CommandMenuFooter />
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
			<Basic />
			<Details />
			<Suggestions />
			<Tabs />
			<Filters />
			<DialogSection />
			<FooterSection />
			<CustomRows />
		</div>
	);
}

/** Wheels the page until the card's top edge sits under the heading. gpuix's scrollIntoView does not reach the page's scroller from here. */
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
	await shot.click("filters-sort");
	shot.capture("filters-open");
	await shot.clickAt(1000, 700);

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
};
