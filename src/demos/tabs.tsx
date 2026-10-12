import { createSignal, type JSX } from "solid-js";
import { TabItem, TabPanel, Tabs, TabsList } from "../components/tabs";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { defineIcon } from "../lib/icons";
import { color, type as scale } from "../lib/theme";

const squareLibrary = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7v10"/><path d="M11 7v10"/><path d="m15 7 2 10"/>',
);

function Section(props: { caption: string; children: JSX.Element }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.caption}
			</text>
			{props.children}
		</div>
	);
}

function Content(props: { children: string }) {
	return (
		<div style={{ paddingTop: 12 }}>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				{props.children}
			</text>
		</div>
	);
}

export const title = "Tabs";
export const group = "Components";

export function Demo() {
	const [controlled, setControlled] = createSignal("library");
	return (
		<DemoCard title="Tabs">
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<Section caption="Basic">
					<Tabs defaultValue="library">
						<TabsList testId="basic-list">
							<TabItem testId="basic-library" value="library" label="Library" />
							<TabItem testId="basic-recents" value="recents" label="Recents" />
							<TabItem
								testId="basic-favorites"
								value="favorites"
								label="Favorites"
							/>
							<TabItem
								testId="basic-settings"
								value="settings"
								label="Settings"
							/>
						</TabsList>
						<TabPanel value="library">
							<Content>Library content.</Content>
						</TabPanel>
						<TabPanel value="recents">
							<Content>Recents content.</Content>
						</TabPanel>
						<TabPanel value="favorites">
							<Content>Favorites content.</Content>
						</TabPanel>
						<TabPanel value="settings">
							<Content>Settings content.</Content>
						</TabPanel>
					</Tabs>
				</Section>
				<Section caption="With icons">
					<Tabs defaultValue="library">
						<TabsList>
							<TabItem value="library" icon={squareLibrary} label="Library" />
							<TabItem value="recents" icon="clock" label="Recents" />
							<TabItem value="favorites" icon="star" label="Favorites" />
							<TabItem value="settings" icon="settings" label="Settings" />
						</TabsList>
						<TabPanel value="library">
							<Content>Library content.</Content>
						</TabPanel>
						<TabPanel value="recents">
							<Content>Recents content.</Content>
						</TabPanel>
						<TabPanel value="favorites">
							<Content>Favorites content.</Content>
						</TabPanel>
						<TabPanel value="settings">
							<Content>Settings content.</Content>
						</TabPanel>
					</Tabs>
				</Section>
				<Section caption="Controlled">
					<Tabs value={controlled()} onValueChange={setControlled}>
						<TabsList>
							<TabItem value="library" label="Library" />
							<TabItem value="recents" label="Recents" />
							<TabItem value="favorites" label="Favorites" />
						</TabsList>
						<TabPanel value="library">
							<Content>Library content.</Content>
						</TabPanel>
						<TabPanel value="recents">
							<Content>Recents content.</Content>
						</TabPanel>
						<TabPanel value="favorites">
							<Content>Favorites content.</Content>
						</TabPanel>
					</Tabs>
					<div style={{ flexDirection: "row", display: "flex", gap: 4 }}>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							Active:
						</text>
						<text style={{ ...scale.caption, color: color.foreground }}>
							{controlled()}
						</text>
					</div>
				</Section>
				<Section caption="Compact">
					<Tabs defaultValue="library" size="compact">
						<TabsList>
							<TabItem value="library" icon={squareLibrary} label="Library" />
							<TabItem value="recents" icon="clock" label="Recents" />
							<TabItem value="favorites" icon="star" label="Favorites" />
						</TabsList>
					</Tabs>
				</Section>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-favorites");
	shot.capture("hover-other-tab");
	await shot.click("basic-recents");
	shot.capture("selected-recents");
	await shot.hover("basic-settings");
	shot.capture("hover-then-selected-dimmed");
	await shot.moveTo(1180, 700);
	shot.capture("pointer-left-list");
	await shot.click("basic-library");
	await shot.press("right");
	shot.capture("keyboard-arrow");
};
