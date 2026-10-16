import { window as appWindow, type DomEvent } from "@gpuix/solid";
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
import { installUrl } from "./install-url";
import { pageOrder } from "./page-nav";
import { IS_MAC, openUrl } from "./platform";
import { setThemeChoice, THEMES, themeChoice } from "./theme";

type Kind = "page" | "setting" | "action";

type SiteItem = CommandMenuItemData & { kind: Kind };

const TABS = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Pages" },
	{ value: "setting", label: "Settings" },
	{ value: "action", label: "Actions" },
];

const GITHUB_REPOSITORY = "mickadesign/fluid-functionalism";

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

/**
 * FF's `matchesShortcut` for "mod+k": Meta or Ctrl, no Alt, Shift free. The web
 * falls back to the physical key (`code`) when `key` is not a Latin letter or Alt
 * is held. gpuix derives `code` from `key`, so it never names a different key and
 * the fallback adds nothing: on Dvorak the key that types "t" reports "t", and on
 * macOS a non-Latin layout reports its Cmd layout's letter.
 */
function isModK(event: DomEvent): boolean {
	if (event.altKey === true) return false;
	if (event.metaKey !== true && event.ctrlKey !== true) return false;
	return event.key?.toLowerCase() === "k";
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
	/** The slug on screen: the Actions group acts on it. */
	current: string;
	onPage: (page: string) => void;
}) {
	const [tab, setTab] = createSignal("all");
	const go = (slug: string) => {
		remember(slug);
		props.onPage(slug);
	};
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
			onSelect: () => go(value),
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
		const order = pageOrder(props.pages, props.demos);
		const index = order.indexOf(props.current);
		const component = props.demos.find((demo) => demo.slug === props.current);
		const action = (item: Omit<SiteItem, "kind" | "group">): SiteItem => ({
			...item,
			kind: "action",
			group: "Actions",
		});
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
			...(component === undefined
				? []
				: [
						action({
							value: "action:copy-install",
							label: "Copy install command",
							description: component.title,
							icon: "copy",
							keywords: ["npx", "shadcn", "add", "registry"],
							onSelect: () => {
								navigator.clipboard
									.writeText(
										`npx shadcn@latest add ${installUrl(component.slug)}`,
									)
									.catch((error: unknown) =>
										console.error("Copy install command failed", error),
									);
							},
						}),
					]),
			...(index > 0
				? [
						action({
							value: "action:previous",
							label: "Previous page",
							action: "Go to the previous page",
							icon: "arrow-left",
							shortcut: "left",
							onSelect: () => go(order[index - 1]),
						}),
					]
				: []),
			...(index >= 0 && index < order.length - 1
				? [
						action({
							value: "action:next",
							label: "Next page",
							action: "Go to the next page",
							icon: "arrow-right",
							shortcut: "right",
							onSelect: () => go(order[index + 1]),
						}),
					]
				: []),
			action({
				value: "action:github",
				label: "Open on GitHub",
				description: GITHUB_REPOSITORY,
				icon: "link",
				keywords: ["source", "star", "repository"],
				onSelect: () => openUrl(`https://github.com/${GITHUB_REPOSITORY}`),
			}),
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
