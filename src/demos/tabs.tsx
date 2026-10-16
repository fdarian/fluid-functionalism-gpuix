import { createSignal, type JSX } from "solid-js";
import { TabItem, TabPanel, Tabs, TabsList } from "../components/tabs";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";


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
export const listed = "sidebar";

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
							<TabItem value="library" icon="square-library" label="Library" />
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
					<text style={{ ...scale.caption, color: color.mutedForeground }}>
						Active:{" "}
						<span style={{ color: color.foreground }}>{controlled()}</span>
					</text>
				</Section>
				<Section caption="Compact">
					<Tabs defaultValue="library" size="compact">
						<TabsList>
							<TabItem value="library" icon="square-library" label="Library" />
							<TabItem value="recents" icon="clock" label="Recents" />
							<TabItem value="favorites" icon="star" label="Favorites" />
						</TabsList>
					</Tabs>
				</Section>
				<Section caption="Keyboard: the arrows land on a disabled tab but never select it">
					<Tabs defaultValue="one">
						<TabsList>
							<TabItem testId="kb-one" value="one" label="One" />
							<TabItem testId="kb-two" value="two" label="Two" disabled />
							<TabItem testId="kb-three" value="three" label="Three" />
						</TabsList>
						<TabPanel value="one">
							<Content>Panel one</Content>
						</TabPanel>
						<TabPanel value="two">
							<Content>Panel two</Content>
						</TabPanel>
						<TabPanel value="three">
							<Content>Panel three</Content>
						</TabPanel>
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
	await shot.press("ArrowRight");
	shot.capture("keyboard-arrow");

	await shot.click("kb-one");
	shot.expectText("Panel one", true);
	// The arrow lands on the disabled tab; the selection stays.
	await shot.press("ArrowRight");
	shot.expectText("Panel one", true);
	shot.expectText("Panel two", false);
	await shot.press("Enter");
	shot.expectText("Panel two", false);
	// The next arrow selects Three; one more wraps round to One.
	await shot.press("ArrowRight");
	shot.expectText("Panel three", true);
	await shot.press("ArrowRight");
	shot.expectText("Panel one", true);
	await shot.press("ArrowLeft");
	shot.expectText("Panel three", true);
	await shot.press("Home");
	shot.expectText("Panel one", true);
	// A modifier chord is not a navigation key.
	await shot.press("Meta+ArrowRight");
	shot.expectText("Panel one", true);
	shot.capture("keyboard-disabled");
	// Only the selected tab has a mounted panel to control; the panel is named by its tab.
	const controls = shot.aria("kb-one").controls;
	if (!Array.isArray(controls) || controls.length !== 1)
		throw new Error("the selected tab controls its panel");
	shot.expectAria(String(controls[0]), {
		role: "TabPanel",
		labelled_by: [shot.idOf("kb-one")],
	});
	shot.expectAria("kb-two", { disabled: true, controls: undefined });
	await shot.click("kb-two");
	shot.expectText("Panel two", false);
};
