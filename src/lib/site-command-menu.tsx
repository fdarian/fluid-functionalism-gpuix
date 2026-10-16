import { type DomEvent, window as appWindow } from "@gpuix/solid";
import { createMemo, createSignal, onCleanup } from "solid-js";
import {
	CommandMenu,
	CommandMenuDialog,
	CommandMenuEmpty,
	CommandMenuFooter,
	CommandMenuInput,
	type CommandMenuItemData,
	CommandMenuList,
	CommandMenuTabs,
} from "../components/command-menu";
import type { Demo, Page } from "./demo";
import type { IconRef } from "./icons";
import { IS_MAC } from "./platform";
import { setThemeChoice, THEMES, themeChoice } from "./theme";

type Kind = "page" | "setting";

type SiteItem = CommandMenuItemData & { kind: Kind };

const TABS = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Pages" },
	{ value: "setting", label: "Settings" },
];

const RECENT_MAX = 3;

/** Pages opened through the menu, newest first. Lives for the session: the port persists no settings. */
const [recent, setRecent] = createSignal<readonly string[]>([]);

function remember(slug: string) {
	setRecent(
		[slug, ...recent().filter((value) => value !== slug)].slice(0, RECENT_MAX),
	);
}

/** What the sidebar's Search row shows next to the label. */
export const SITE_MENU_SHORTCUT = IS_MAC ? "⌘K" : "Ctrl K";

export type SiteMenu = {
	open: () => boolean;
	setOpen: (open: boolean) => void;
};

/** FF's `matchesShortcut` for "mod+k": the key, or its physical key when Alt or a non-Latin layout changes the character; Meta or Ctrl, no Alt, Shift free. */
function isModK(event: DomEvent): boolean {
	if (event.altKey === true) return false;
	if (event.metaKey !== true && event.ctrlKey !== true) return false;
	return event.key?.toLowerCase() === "k" || event.code === "KeyK";
}

/** The menu's open state plus the window-wide Mod+K that toggles it. Call it once, inside the app root: the listener leaves with that owner. */
export function createSiteMenu(): SiteMenu {
	const [open, setOpen] = createSignal(false);
	const onKeyDown = (event: DomEvent) => {
		if (event.repeat === true || event.defaultPrevented) return;
		if (!isModK(event)) return;
		event.preventDefault();
		setOpen(!open());
	};
	appWindow.addEventListener("keydown", onKeyDown);
	onCleanup(() => appWindow.removeEventListener("keydown", onKeyDown));
	return { open, setOpen };
}

/** FF's Site menu: every page the sidebar lists and the theme, in one field. */
export function SiteCommandMenu(props: {
	menu: SiteMenu;
	demos: readonly Demo[];
	pages: readonly Page[];
	showcase: string;
	onPage: (page: string) => void;
}) {
	const [tab, setTab] = createSignal("all");
	const items = createMemo<SiteItem[]>(() => {
		const page = (
			value: string,
			label: string,
			group: string,
			icon?: IconRef,
			keywords?: readonly string[],
		): SiteItem => ({
			kind: "page",
			value,
			label,
			action: `Open ${label}`,
			icon,
			keywords,
			group,
			onSelect: () => {
				remember(value);
				props.onPage(value);
			},
		});
		const listedPages = (group: Page["group"]) =>
			props.pages
				.filter(
					(candidate) =>
						candidate.group === group && candidate.listed !== "none",
				)
				.map((entry) =>
					page(
						entry.slug,
						entry.title,
						group,
						entry.menuIcon,
						entry.menuKeywords,
					),
				);
		const current = themeChoice();
		return [
			page(props.showcase, "Showcase", "Pages", "home", [
				"home",
				"bento",
				"gallery",
			]),
			...listedPages("Pages"),
			...listedPages("System"),
			...props.demos.map((demo) => page(demo.slug, demo.title, "Components")),
			...THEMES.map(
				(theme): SiteItem => ({
					kind: "setting",
					value: `theme:${theme.value}`,
					label: `Theme: ${theme.label}`,
					action: `Set theme to ${theme.label}`,
					description: current === theme.value ? "Current" : undefined,
					icon: theme.icon,
					keywords: ["theme", "appearance", "mode", theme.value],
					group: "Settings",
					onSelect: () => setThemeChoice(theme.value),
				}),
			),
		];
	});
	const visible = createMemo(() =>
		tab() === "all" ? items() : items().filter((item) => item.kind === tab()),
	);
	return (
		<CommandMenuDialog
			open={props.menu.open()}
			onOpenChange={props.menu.setOpen}
		>
			<CommandMenu
				testId="site-menu"
				items={visible()}
				suggestions={recent()}
				suggestionsLabel="Recent"
			>
				<CommandMenuInput
					testId="site-menu-input"
					placeholder="Go to a page, change a setting…"
				/>
				<CommandMenuTabs tabs={TABS} value={tab()} onValueChange={setTab} />
				<CommandMenuList>
					<CommandMenuEmpty>Nothing matches.</CommandMenuEmpty>
				</CommandMenuList>
				<CommandMenuFooter />
			</CommandMenu>
		</CommandMenuDialog>
	);
}
