import { createSignal, For } from "solid-js";
import { Button } from "../components/button";
import { MobileDrawer } from "../components/mobile-drawer";
import { SidebarMenu, SidebarMenuButton } from "../components/sidebar";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import type { IconName } from "../lib/icons";
import { color, type as scale, setThemeChoice, weight } from "../lib/theme";

const ROWS: { label: string; icon: IconName }[] = [
	{ label: "Overview", icon: "globe" },
	{ label: "Inbox", icon: "mail" },
	{ label: "Notifications", icon: "bell" },
	{ label: "Team", icon: "users" },
	{ label: "Projects", icon: "folder" },
	{ label: "Starred", icon: "star" },
	{ label: "Activity", icon: "clock" },
	{ label: "Profile", icon: "user" },
	{ label: "Billing", icon: "copy" },
	{ label: "Integrations", icon: "plus" },
	{ label: "Appearance", icon: "sun" },
	{ label: "Dark mode", icon: "moon" },
	{ label: "Search", icon: "search" },
	{ label: "Settings", icon: "settings" },
];

export const title = "Mobile Drawer";
export const group = "Components";

export function Demo() {
	const [open, setOpen] = createSignal(false);
	const [active, setActive] = createSignal("Overview");
	return (
		<DemoCard title="Mobile drawer">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div style={{ display: "flex", flexDirection: "row" }}>
					<Button
						testId="drawer-open"
						variant="tertiary"
						onClick={() => setOpen(true)}
					>
						Open navigation
					</Button>
				</div>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					{`Current page: ${active()}`}
				</text>
			</div>
			<MobileDrawer
				open={open()}
				onClose={() => setOpen(false)}
				testId="drawer-popup"
			>
				<div style={{ paddingBottom: 12, paddingLeft: 8 }}>
					<text
						style={{
							...scale.title,
							color: color.foreground,
							fontWeight: weight.semibold,
						}}
					>
						Navigation
					</text>
				</div>
				<SidebarMenu>
					<For each={ROWS}>
						{(row) => (
							<SidebarMenuButton
								testId={`drawer-row-${row.label}`}
								label={row.label}
								icon={row.icon}
								active={active() === row.label}
								onClick={() => {
									setActive(row.label);
									setOpen(false);
								}}
							/>
						)}
					</For>
				</SidebarMenu>
				<div style={{ display: "flex", flexDirection: "row", paddingTop: 12 }}>
					<Button
						testId="drawer-done"
						variant="ghost"
						onClick={() => setOpen(false)}
					>
						Done
					</Button>
				</div>
			</MobileDrawer>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.click("drawer-open");
	shot.expectText("Navigation", true);
	shot.capture("open");
	await shot.hover("drawer-row-Team");
	shot.capture("row-hover");
	await shot.press("Escape");
	shot.expectText("Navigation", false);
	shot.capture("closed");

	// A press inside the panel keeps it open; a click that presses and releases on the backdrop closes it.
	await shot.click("drawer-open");
	await shot.settle(800);
	await shot.clickAt(120, 700);
	shot.expectText("Navigation", true);
	await shot.clickAt(700, 400);
	shot.expectText("Navigation", false);

	await shot.click("drawer-open");
	await shot.click("drawer-row-Projects");
	shot.expectText("Current page: Projects", true);
	shot.expectText("Navigation", false);
	shot.capture("picked");

	// Focus moves into the drawer once it has settled, onto its first tab stop (the rows are not tab stops yet): Enter presses Done.
	await shot.click("drawer-open");
	await shot.settle(800);
	await shot.press("Enter");
	shot.expectText("Navigation", false);

	setThemeChoice("light");
	await shot.settle(300);
	await shot.click("drawer-open");
	shot.capture("open-light");
	await shot.press("Escape");
	setThemeChoice("dark");
	await shot.settle(300);
};
