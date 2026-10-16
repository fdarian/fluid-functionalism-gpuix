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
import type { Demo } from "./demo";
import { IS_MAC } from "./platform";
import { setThemeChoice, THEMES, themeChoice } from "./theme";

type Kind = "page" | "setting";

type SiteItem = CommandMenuItemData & { kind: Kind };

const TABS = [
	{ value: "all", label: "All" },
	{ value: "page", label: "Pages" },
	{ value: "setting", label: "Settings" },
];

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
	showcase: string;
	onPage: (page: string) => void;
}) {
	const [tab, setTab] = createSignal("all");
	const items = createMemo<SiteItem[]>(() => {
		const page = (
			value: string,
			label: string,
			group: string,
			icon?: "home",
		): SiteItem => ({
			kind: "page",
			value,
			label,
			action: `Open ${label}`,
			icon,
			group,
			onSelect: () => props.onPage(value),
		});
		const current = themeChoice();
		return [
			page(props.showcase, "Showcase", "Pages", "home"),
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
			<CommandMenu testId="site-menu" items={visible()}>
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
