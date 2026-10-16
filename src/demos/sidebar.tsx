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
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, shape } from "../lib/theme";

const BLUE = "#3B82F6";
const YELLOW = "#FBBF24";

const SYSTEM_ROWS: { label: string; dot?: string }[] = [
	{ label: "Fluid Hover", dot: BLUE },
	{ label: "Motion" },
	{ label: "Scrollbars" },
	{ label: "Skill", dot: YELLOW },
];

const COMPONENT_ROWS: { label: string; dot?: string }[] = [
	{ label: "Accordion" },
	{ label: "Badge" },
	{ label: "Banner", dot: BLUE },
];

const BUTTON_PAGES = ["Variants", "Sizes", "Icons"];

export const title = "Sidebar";
export const group = "Components";

export function Demo() {
	const [active, setActive] = createSignal("Showcase");
	const [buttonOpen, setButtonOpen] = createSignal(true);
	const row = (label: string, dot?: string) => (
		<SidebarMenuButton
			testId={`sidebar-demo-${label}`}
			label={label}
			dot={dot}
			active={active() === label}
			onClick={() => setActive(label)}
		/>
	);
	return (
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
						<SidebarMenu>{row("Showcase")}</SidebarMenu>
						<SidebarGroupLabel count={SYSTEM_ROWS.length}>
							System
						</SidebarGroupLabel>
						<SidebarMenu>
							<For each={SYSTEM_ROWS}>
								{(item) => row(item.label, item.dot)}
							</For>
						</SidebarMenu>
						<SidebarGroupLabel count={COMPONENT_ROWS.length + 1}>
							Components
						</SidebarGroupLabel>
						<SidebarMenu>
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
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
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
};
