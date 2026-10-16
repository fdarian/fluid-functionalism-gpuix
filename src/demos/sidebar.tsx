import { createSignal, For } from "solid-js";
import {
	Sidebar,
	SidebarContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarSearchField,
} from "../components/sidebar";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, shape } from "../lib/theme";
import { SidebarPlayground } from "./sidebar/playground";

// The source's blue dot is a fixed Tailwind `bg-blue-500`; its second dot is `var(--warning)`, which follows the theme, so a dot colour is read when it paints.
const blue = () => "#3B82F6";
const warning = () => color.warning;

interface RowData {
	label: string;
	dot?: () => string;
}

const SYSTEM_ROWS: RowData[] = [
	{ label: "Fluid Hover", dot: blue },
	{ label: "Motion" },
	{ label: "Scrollbars" },
	{ label: "Skill", dot: warning },
];

const COMPONENT_ROWS: RowData[] = [
	{ label: "Accordion" },
	{ label: "Badge" },
	{ label: "Banner", dot: blue },
];

const BUTTON_PAGES = ["Variants", "Sizes", "Icons"];

export const title = "Sidebar";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	const [active, setActive] = createSignal("Showcase");
	const [buttonOpen, setButtonOpen] = createSignal(true);
	const row = (label: string, dot?: () => string) => (
		<SidebarMenuButton
			testId={`sidebar-demo-${label}`}
			label={label}
			dot={dot?.()}
			active={active() === label}
			onClick={() => setActive(label)}
		/>
	);
	return (
		<>
			<SidebarPlayground />
			<DemoCard title="Sidebar">
				<div
					style={{
						height: 480,
						display: "flex",
						flexDirection: "row",
						overflow: "hidden",
						borderRadius: shape.container,
						backgroundColor: color.background,
					}}
				>
					<Sidebar>
						<SidebarHeader>
							<SidebarSearchField placeholder="Search" shortcut="⌘K" />
						</SidebarHeader>
						<SidebarContent>
							<SidebarMenu testId="sidebar-demo-main">
								{row("Showcase")}
							</SidebarMenu>
							<SidebarGroupLabel count={SYSTEM_ROWS.length}>
								System
							</SidebarGroupLabel>
							<SidebarMenu testId="sidebar-demo-system">
								<For each={SYSTEM_ROWS}>
									{(item) => row(item.label, item.dot)}
								</For>
							</SidebarMenu>
							<SidebarGroupLabel count={COMPONENT_ROWS.length + 1}>
								Components
							</SidebarGroupLabel>
							<SidebarMenu testId="sidebar-demo-components">
								<For each={COMPONENT_ROWS.slice(0, 1)}>
									{(item) => row(item.label, item.dot)}
								</For>
								<SidebarMenuButton
									testId="sidebar-demo-Button"
									label="Button"
									active={BUTTON_PAGES.includes(active())}
									trailingIcon={() =>
										buttonOpen() ? "chevron-down" : "chevron-right"
									}
									onClick={() => setButtonOpen(!buttonOpen())}
								/>
								<SidebarMenuSub open={buttonOpen()}>
									<For each={BUTTON_PAGES}>
										{(page) => (
											<SidebarMenuButton
												testId={`sidebar-demo-${page}`}
												level={1}
												label={page}
												active={active() === page}
												disabled={() => !buttonOpen()}
												onClick={() => setActive(page)}
											/>
										)}
									</For>
								</SidebarMenuSub>
								<For each={COMPONENT_ROWS.slice(1)}>
									{(item) => row(item.label, item.dot)}
								</For>
							</SidebarMenu>
						</SidebarContent>
					</Sidebar>
				</div>
			</DemoCard>
		</>
	);
}

/** The page is taller than the window: scroll an element to the upper part of it. */
async function reveal(shot: ShotContext, testId: string) {
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 8; attempt++) {
		const y = shot.centerOf(testId).y;
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, y - 200);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

/** Opens a playground select from the keyboard and walks `steps` rows from the current one. */
async function pickOption(shot: ShotContext, testId: string, steps: string) {
	await shot.focus(`${testId}-trigger`);
	await shot.press(`ArrowDown ${steps} Enter`);
	await shot.settle(300);
}

/** The controls panel is taller than the window: scroll the right column. */
async function scrollControls(shot: ShotContext) {
	await shot.scroll(1080, 500, 0, 500);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	shot.capture("playground");
	await pickOption(shot, "play-header-stack", "ArrowUp");
	await pickOption(shot, "play-header-actions", "ArrowDown");
	shot.capture("playground-horizontal-header");
	await shot.click("play-l1-badges-track");
	shot.capture("playground-thread-badges");
	await pickOption(shot, "play-l1-primary", "ArrowUp");
	await shot.click("play-l1-children-track");
	shot.capture("playground-menu-children-badges");
	await shot.click("play-sub-Home-Marketing site");
	await shot.click("play-row-Home");
	await shot.settle(600);
	shot.capture("playground-parent-collapsed");
	await shot.click("play-row-Home");
	await shot.settle(600);
	await shot.click("play-l2-icon-track");
	shot.capture("playground-sub-rows-without-icon");

	await scrollControls(shot);
	await pickOption(shot, "play-footer-stack", "ArrowDown");
	await pickOption(shot, "play-callout", "ArrowDown");
	shot.capture("playground-inline-callout");
	// The dismiss chip shows on hover, at the card's top-right corner.
	await shot.hover("callout");
	const card = shot.centerOf("callout");
	await shot.clickAt(card.x + 98, card.y - 8);
	await shot.settle(300);
	shot.expectText("Sidebar is here", false);
	await pickOption(shot, "play-callout", "ArrowDown ArrowDown");
	shot.capture("playground-banner-callout");
	await shot.click("play-callout-stacked-track");
	await shot.settle(600);
	shot.capture("playground-banner-stack");
	await pickOption(shot, "play-callout", "ArrowUp");
	await shot.settle(600);
	shot.capture("playground-inline-stack");
	await shot.hover("callout-stack");
	await shot.settle(600);
	shot.capture("playground-inline-stack-fanned");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	await reveal(shot, "sidebar-demo-Motion");
	await shot.hover("sidebar-demo-Motion");
	shot.capture("hover");

	// Over the label text, not the row's centre: the absolute label sits above the row, and the hover must still reach it.
	await shot.hover("sidebar-demo-Scrollbars-label");
	shot.capture("hover-label");

	await shot.click("sidebar-demo-Sizes");
	await shot.hover("sidebar-demo-Icons");
	shot.capture("sub-menu");

	await shot.click("sidebar-demo-Button");
	await shot.settle(600);
	await shot.hover("sidebar-demo-Badge");
	shot.capture("sub-menu-collapsed");

	await shot.moveTo(1180, 700);
	await shot.focus("sidebar-demo-Fluid Hover");
	await shot.press("ArrowDown");
	shot.capture("keyboard-focus");
};
