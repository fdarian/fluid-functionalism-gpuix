import { createSignal, For, type JSX } from "solid-js";
import {
	TabsSubtle,
	TabsSubtleItem,
	TabsSubtlePanel,
} from "../components/tabs-subtle";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import type { IconRef } from "../lib/icons";
import { color, type as scale } from "../lib/theme";


const TABS: { icon: IconRef; label: string }[] = [
	{ icon: "square-library", label: "Teamspaces" },
	{ icon: "clock", label: "Recents" },
	{ icon: "star", label: "Favorites" },
	{ icon: "users", label: "Shared" },
];
const BASIC_TABS = ["Teamspaces", "Recents", "Favorites", "Shared"];

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
		<div style={{ paddingLeft: 12, paddingTop: 4 }}>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				{props.children}
			</text>
		</div>
	);
}

export const title = "TabsSubtle";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	const [basic, setBasic] = createSignal(0);
	const [icons, setIcons] = createSignal(0);
	const [activeLabel, setActiveLabel] = createSignal(0);
	const [compact, setCompact] = createSignal(0);
	const [keyboard, setKeyboard] = createSignal(0);
	return (
		<DemoCard title="TabsSubtle">
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<Section caption="Basic">
					<TabsSubtle
						testId="basic-list"
						idPrefix="basic-demo"
						selectedIndex={basic()}
						onSelect={setBasic}
					>
						<For each={BASIC_TABS}>
							{(label: string, index: () => number) => (
								<TabsSubtleItem
									testId={`basic-${index()}`}
									index={index()}
									label={label}
								/>
							)}
						</For>
					</TabsSubtle>
					<For each={BASIC_TABS}>
						{(label: string, index: () => number) => (
							<TabsSubtlePanel
								index={index()}
								selectedIndex={basic()}
								idPrefix="basic-demo"
							>
								<Content>{`${label} content goes here.`}</Content>
							</TabsSubtlePanel>
						)}
					</For>
				</Section>
				<Section caption="With icons">
					<TabsSubtle
						idPrefix="icons-demo"
						selectedIndex={icons()}
						onSelect={setIcons}
					>
						<For each={TABS}>
							{(tab: (typeof TABS)[number], index: () => number) => (
								<TabsSubtleItem
									testId={`icons-${index()}`}
									index={index()}
									icon={tab.icon}
									label={tab.label}
								/>
							)}
						</For>
					</TabsSubtle>
					<For each={TABS}>
						{(tab: (typeof TABS)[number], index: () => number) => (
							<TabsSubtlePanel
								index={index()}
								selectedIndex={icons()}
								idPrefix="icons-demo"
							>
								<Content>{`${tab.label} content goes here.`}</Content>
							</TabsSubtlePanel>
						)}
					</For>
				</Section>
				<Section caption="Active label">
					<TabsSubtle
						activeLabel
						idPrefix="active-label-demo"
						selectedIndex={activeLabel()}
						onSelect={setActiveLabel}
					>
						<For each={TABS}>
							{(tab: (typeof TABS)[number], index: () => number) => (
								<TabsSubtleItem
									testId={`active-${index()}`}
									index={index()}
									icon={tab.icon}
									label={tab.label}
								/>
							)}
						</For>
					</TabsSubtle>
					<For each={TABS}>
						{(tab: (typeof TABS)[number], index: () => number) => (
							<TabsSubtlePanel
								index={index()}
								selectedIndex={activeLabel()}
								idPrefix="active-label-demo"
							>
								<Content>{`${tab.label} content goes here.`}</Content>
							</TabsSubtlePanel>
						)}
					</For>
				</Section>
				<Section caption="Compact">
					<TabsSubtle
						size="compact"
						idPrefix="compact-demo"
						selectedIndex={compact()}
						onSelect={setCompact}
					>
						<For each={TABS}>
							{(tab: (typeof TABS)[number], index: () => number) => (
								<TabsSubtleItem
									index={index()}
									icon={tab.icon}
									label={tab.label}
								/>
							)}
						</For>
					</TabsSubtle>
				</Section>
				<Section caption="Keyboard: arrows move focus, Enter selects">
					<TabsSubtle
						testId="kb-list"
						idPrefix="keyboard-demo"
						selectedIndex={keyboard()}
						onSelect={setKeyboard}
					>
						<For each={["A", "B", "C"]}>
							{(label: string, index: () => number) => (
								<TabsSubtleItem
									testId={`kb-${index()}`}
									index={index()}
									label={label}
								/>
							)}
						</For>
					</TabsSubtle>
					<For each={["A", "B", "C"]}>
						{(label: string, index: () => number) => (
							<TabsSubtlePanel
								index={index()}
								selectedIndex={keyboard()}
								idPrefix="keyboard-demo"
							>
								<Content>{`Kb panel ${label}`}</Content>
							</TabsSubtlePanel>
						)}
					</For>
				</Section>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-2");
	shot.capture("hover-other-tab");
	await shot.click("basic-1");
	shot.capture("selected-second");
	shot.expectAria("basic-1", {
		selected: true,
		controls: ["basic-demo-panel-1"],
	});
	shot.expectAria("basic-demo-panel-1", {
		role: "TabPanel",
		labelled_by: ["basic-demo-tab-1"],
	});
	shot.expectAria("basic-0", { selected: false, controls: undefined });
	await shot.moveTo(1180, 700);
	shot.capture("pointer-left-list");
	await shot.click("active-2");
	shot.capture("active-label-unfolded");
	await shot.moveTo(1180, 700);
	await shot.click("icons-0");
	await shot.press("ArrowRight");
	shot.capture("keyboard-focus-moved");
	await shot.press("Enter");
	shot.capture("keyboard-selected");

	await shot.click("kb-0");
	shot.expectText("Kb panel A", true);
	// Manual activation: the arrow moves focus only.
	await shot.press("ArrowRight");
	shot.expectText("Kb panel A", true);
	shot.expectText("Kb panel B", false);
	await shot.press("End");
	await shot.press("Enter");
	shot.expectText("Kb panel C", true);
	// A modifier chord is not a navigation key.
	await shot.press("Meta+ArrowLeft");
	await shot.press("Enter");
	shot.expectText("Kb panel C", true);
	await shot.press("ArrowLeft");
	await shot.press("Enter");
	shot.expectText("Kb panel B", true);
	shot.capture("keyboard-manual");
};
