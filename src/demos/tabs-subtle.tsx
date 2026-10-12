import { createSignal, For, type JSX } from "solid-js";
import {
	TabsSubtle,
	TabsSubtleItem,
	TabsSubtlePanel,
} from "../components/tabs-subtle";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { defineIcon, type IconRef } from "../lib/icons";
import { color, type as scale } from "../lib/theme";

const squareLibrary = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7v10"/><path d="M11 7v10"/><path d="m15 7 2 10"/>',
);

const TABS: { icon: IconRef; label: string }[] = [
	{ icon: squareLibrary, label: "Teamspaces" },
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

export const title = "Tabs Subtle";
export const group = "Components";

export function Demo() {
	const [basic, setBasic] = createSignal(0);
	const [icons, setIcons] = createSignal(0);
	const [activeLabel, setActiveLabel] = createSignal(0);
	const [compact, setCompact] = createSignal(0);
	return (
		<DemoCard title="TabsSubtle">
			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<Section caption="Basic">
					<TabsSubtle
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
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-2");
	shot.capture("hover-other-tab");
	await shot.click("basic-1");
	shot.capture("selected-second");
	await shot.moveTo(1180, 700);
	shot.capture("pointer-left-list");
	await shot.click("active-2");
	shot.capture("active-label-unfolded");
	await shot.moveTo(1180, 700);
	await shot.click("icons-0");
	await shot.press("right");
	shot.capture("keyboard-focus-moved");
	await shot.press("enter");
	shot.capture("keyboard-selected");
};
