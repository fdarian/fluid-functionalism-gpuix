import type { EventPayload } from "@gpuix/solid";
import { createSignal, For, type JSX } from "solid-js";
import { AskUserQuestions } from "../components/ask-user-questions";
import {
	Card,
	CardGroup,
	CardHeader,
	CardMedia,
	CardTitle,
} from "../components/card";
import { ChatMessage } from "../components/chat-message";
import { CheckboxGroup, CheckboxItem } from "../components/checkbox-group";
import { Combobox } from "../components/combobox";
import {
	CommandMenu,
	CommandMenuEmpty,
	CommandMenuInput,
	CommandMenuList,
	CommandMenuPanel,
} from "../components/command-menu";
import { InputMessage } from "../components/input-message";
import { RadioGroup, RadioItem } from "../components/radio-group";
import { Select } from "../components/select";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarSearchField,
} from "../components/sidebar";
import { Switch } from "../components/switch";
import { TabsSubtle, TabsSubtleItem } from "../components/tabs-subtle";
import { ThinkingIndicator } from "../components/thinking-indicator";
import {
	ThinkingStep,
	ThinkingStepDetails,
	ThinkingStepSource,
	ThinkingStepSources,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from "../components/thinking-steps";
import type { IconRef } from "../lib/icons";
import { color, siteType, weight } from "../lib/theme";
import { ASK_USER_EXAMPLE_QUESTIONS } from "./ask-user-example";
import {
	COMMAND_MENU_ITEMS,
	COMMAND_MENU_SUGGESTIONS,
} from "./command-menu-items";

/** The docs' `w-full max-w-[N]` column around a preview, centred in the stage. */
function Capped(props: { maxWidth: number; children: JSX.Element }) {
	return (
		<div style={{ width: "100%", maxWidth: props.maxWidth }}>
			{props.children}
		</div>
	);
}

function InputMessagePreview() {
	const [value, setValue] = createSignal("");
	return (
		<Capped maxWidth={440}>
			<InputMessage
				testId="bento-input-message"
				value={value()}
				onValueChange={setValue}
				onSend={() => setValue("")}
				placeholderSuggestion="Why is every other input box so stiff?"
			/>
		</Capped>
	);
}

function ThinkingIndicatorPreview() {
	return <ThinkingIndicator />;
}

function CommandMenuPreview() {
	return (
		<CommandMenuPanel maxHeight={440}>
			<CommandMenu
				testId="bento-command-menu"
				items={COMMAND_MENU_ITEMS}
				suggestions={COMMAND_MENU_SUGGESTIONS}
			>
				<CommandMenuInput placeholder="Type a command or search…" />
				<CommandMenuList>
					<CommandMenuEmpty>No results.</CommandMenuEmpty>
				</CommandMenuList>
			</CommandMenu>
		</CommandMenuPanel>
	);
}

const COMBOBOX_COMPONENTS = [
	"Accordion",
	"Badge",
	"Button",
	"Card",
	"CheckboxGroup",
	"ColorPicker",
	"Combobox",
	"Dialog",
	"Dropdown",
	"InputGroup",
	"RadioGroup",
	"Select",
	"Sidebar",
	"Slider",
	"Switch",
	"Table",
	"Tabs",
];

const COMBOBOX_WIDTH = 280;

/** Single-select, where the source's tile is a multiple combobox with two chips: the port has no chips. */
function ComboboxPreview() {
	const [value, setValue] = createSignal<string | null>("Button");
	// The combobox takes a pixel width, so the `w-full max-w-[280px]` column reports the width it got.
	const [width, setWidth] = createSignal(COMBOBOX_WIDTH);
	return (
		<div
			style={{ width: "100%", maxWidth: COMBOBOX_WIDTH }}
			onLayout={(event: EventPayload) => {
				if (event.width === undefined) {
					throw new Error("onLayout reported no width");
				}
				setWidth(event.width);
			}}
		>
			<Combobox
				testId="bento-combobox"
				width={width()}
				items={COMBOBOX_COMPONENTS}
				value={value()}
				onValueChange={setValue}
				placeholder="Add components…"
				emptyText="No component found."
			/>
		</div>
	);
}

const SWITCH_ITEMS = [
	{ id: "notifications", label: "Notifications", initial: true },
	{ id: "sound", label: "Sound effects", initial: false },
];

function SwitchPreview() {
	const [on, setOn] = createSignal<ReadonlySet<string>>(
		new Set(SWITCH_ITEMS.filter((item) => item.initial).map((item) => item.id)),
	);
	const toggle = (id: string) => {
		const next = new Set(on());
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setOn(next);
	};
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<For each={SWITCH_ITEMS}>
				{(item) => (
					<Switch
						label={item.label}
						checked={on().has(item.id)}
						onToggle={() => toggle(item.id)}
					/>
				)}
			</For>
		</div>
	);
}

const SIDEBAR_THREADS = [
	{ label: "Sidebar component height in demo", badge: "2" },
	{ label: "Dark mode token audit", badge: "3" },
	{ label: "Scrollbar fade regression", badge: "1" },
	{ label: "Registry deploy pipeline", badge: "7" },
];

/** A row the menu's fluid hover does not own: the workspace and the user, which carry an avatar the port's menu button cannot. */
function IdentityRow(props: { avatar: JSX.Element; label: string }) {
	return (
		<div
			style={{
				height: 32,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 8,
				paddingRight: 8,
			}}
		>
			{props.avatar}
			<text
				style={{
					...siteType.body,
					fontWeight: weight.semibold,
					color: color.foreground,
					whiteSpace: "nowrap",
				}}
			>
				{props.label}
			</text>
		</div>
	);
}

const MICKA = new URL("../../assets/chat-ai/micka.png", import.meta.url)
	.pathname;

/** A whole app shell in miniature: workspace row, search, a thread list and a user row beside a blank main region. */
function SidebarPreview() {
	const [active, setActive] = createSignal(SIDEBAR_THREADS[0].label);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				height: 380,
				width: "100%",
				maxWidth: 620,
				overflow: "hidden",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
			}}
		>
			<Sidebar>
				<SidebarHeader>
					<IdentityRow
						label="Acme Inc"
						avatar={
							<div
								style={{
									width: 20,
									height: 20,
									flexShrink: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									borderRadius: 6,
									backgroundColor: color.foreground,
								}}
							>
								<text
									style={{
										fontSize: 10,
										lineHeight: 12,
										fontWeight: weight.semibold,
										color: color.background,
									}}
								>
									A
								</text>
							</div>
						}
					/>
					<div style={{ display: "flex", flexDirection: "column" }}>
						<SidebarSearchField placeholder="Search" shortcut="⌘K" />
						<SidebarMenu>
							<SidebarMenuButton icon="plus" label="New thread" />
						</SidebarMenu>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroupLabel>Threads</SidebarGroupLabel>
					<SidebarMenu>
						<For each={SIDEBAR_THREADS}>
							{(thread) => (
								<SidebarMenuButton
									label={thread.label}
									badge={thread.badge}
									active={active() === thread.label}
									onClick={() => setActive(thread.label)}
								/>
							)}
						</For>
					</SidebarMenu>
				</SidebarContent>
				<SidebarFooter>
					<IdentityRow
						label="Micka Touillaud"
						avatar={
							<img
								src={MICKA}
								style={{
									width: 20,
									height: 20,
									flexShrink: 0,
									borderRadius: 10,
								}}
							/>
						}
					/>
				</SidebarFooter>
			</Sidebar>
		</div>
	);
}

const RADIO_ITEMS = [
	{ value: "fast", label: "Fast spring" },
	{ value: "moderate", label: "Moderate spring" },
	{ value: "slow", label: "Slow spring" },
	{ value: "comfortable", label: "Comfortable" },
	{ value: "none", label: "No animation" },
];

function RadioGroupPreview() {
	const [value, setValue] = createSignal<string | undefined>("moderate");
	return (
		<Capped maxWidth={220}>
			<RadioGroup value={value()} onValueChange={setValue}>
				<For each={RADIO_ITEMS}>
					{(item, index) => (
						<RadioItem value={item.value} index={index()} label={item.label} />
					)}
				</For>
			</RadioGroup>
		</Capped>
	);
}

/** The source's tile pins these to `size="compact"`: the port's ChatMessage has no size prop. */
function ChatMessagePreview() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 4,
				width: "100%",
				maxWidth: 300,
			}}
		>
			<ChatMessage from="user">
				Why is every other input box so stiff?
			</ChatMessage>
			<ChatMessage from="assistant">
				Because nothing about them moves with you.
			</ChatMessage>
		</div>
	);
}

const CARD_ROWS: { icon: IconRef; title: string }[] = [
	{ icon: "circle", title: "Fluid motion" },
	{ icon: "shield", title: "Accessible" },
	{ icon: "palette", title: "Yours to theme" },
	{ icon: "search", title: "Fluid hover" },
];

/** A medium tile: four compact inline rows (icon and title) under one fluid hover. The descriptions stay on the docs page. */
function CardPreview() {
	return (
		<Capped maxWidth={520}>
			<CardGroup orientation="inline" fluidHover>
				<For each={CARD_ROWS}>
					{(row) => (
						<Card size="compact" label={row.title} onClick={() => {}}>
							<CardMedia icon={row.icon} />
							<CardHeader>
								<CardTitle>{row.title}</CardTitle>
							</CardHeader>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

const SELECT_ROLES = ["Owner", "Editor", "Viewer", "Guest"].map((role) => ({
	value: role,
	label: role,
}));

function SelectPreview() {
	const [value, setValue] = createSignal<string | null>("Viewer");
	return (
		<Capped maxWidth={280}>
			<Select
				variant="bordered"
				items={SELECT_ROLES}
				value={value()}
				onValueChange={setValue}
				placeholder="Select role..."
			/>
		</Capped>
	);
}

function ThinkingStepsPreview() {
	return (
		<Capped maxWidth={380}>
			<ThinkingSteps defaultOpen width="100%">
				<ThinkingStepsHeader>Research Agent</ThinkingStepsHeader>
				<ThinkingStepsContent>
					<ThinkingStep
						status="complete"
						icon="search"
						label="Searching profiles"
					>
						<ThinkingStepSources>
							<ThinkingStepSource>x.com</ThinkingStepSource>
							<ThinkingStepSource>github.com</ThinkingStepSource>
						</ThinkingStepSources>
					</ThinkingStep>
					<ThinkingStep
						status="complete"
						icon="globe"
						label="Reading portfolio"
					>
						<ThinkingStepDetails
							summary="Explored 4 pages"
							details={[
								"Read about.html",
								"Read projects.html",
								"Read resume.pdf",
								"Read contact.html",
							]}
						/>
					</ThinkingStep>
					<ThinkingStep
						status="complete"
						icon="search"
						label="Searching recent work"
					>
						<ThinkingStepSources>
							<ThinkingStepSource>figma.com</ThinkingStepSource>
							<ThinkingStepSource>behance.net</ThinkingStepSource>
						</ThinkingStepSources>
					</ThinkingStep>
					<ThinkingStep
						status="active"
						icon="brain"
						label="Analyzing results"
						description="Compiling findings into a summary."
						isLast
					/>
				</ThinkingStepsContent>
			</ThinkingSteps>
		</Capped>
	);
}

const TABS_SUBTLE_ITEMS: { icon: IconRef; label: string }[] = [
	{ icon: "home", label: "Home" },
	{ icon: "message-circle", label: "Chat" },
	{ icon: "inbox", label: "Inbox" },
];

function TabsSubtlePreview() {
	const [tab, setTab] = createSignal(0);
	return (
		<TabsSubtle
			idPrefix="bento-tabs"
			selectedIndex={tab()}
			onSelect={setTab}
			activeLabel
		>
			<For each={TABS_SUBTLE_ITEMS}>
				{(item, index) => (
					<TabsSubtleItem index={index()} icon={item.icon} label={item.label} />
				)}
			</For>
		</TabsSubtle>
	);
}

const CHECKBOX_ITEMS = [
	"Spring physics",
	"Fluid hover",
	"Font weight transitions",
	"Keyboard navigation",
	"Dark mode support",
];

function CheckboxGroupPreview() {
	const [checked, setChecked] = createSignal<ReadonlySet<number>>(new Set());
	const toggle = (index: number) => {
		const next = new Set(checked());
		if (next.has(index)) next.delete(index);
		else next.add(index);
		setChecked(next);
	};
	return (
		<Capped maxWidth={220}>
			<CheckboxGroup checkedIndices={checked()}>
				<For each={CHECKBOX_ITEMS}>
					{(label, index) => (
						<CheckboxItem
							index={index()}
							label={label}
							checked={checked().has(index())}
							onToggle={() => toggle(index())}
						/>
					)}
				</For>
			</CheckboxGroup>
		</Capped>
	);
}

/** Flush with the stage's bottom edge: the card's height changes per question, and anchoring the bottom keeps the footer button and chip column where they are. */
function AskUserQuestionsPreview() {
	return (
		<div
			style={{
				flexGrow: 1,
				width: "100%",
				maxWidth: 420,
				display: "flex",
				flexDirection: "column",
				justifyContent: "flex-end",
			}}
		>
			<AskUserQuestions questions={ASK_USER_EXAMPLE_QUESTIONS} />
		</div>
	);
}

/** Slug -> the live preview a home tile shows; a slug with no entry renders an empty stage. */
export const previewMap: Record<string, () => JSX.Element> = {
	"input-message": InputMessagePreview,
	"thinking-indicator": ThinkingIndicatorPreview,
	"command-menu": CommandMenuPreview,
	combobox: ComboboxPreview,
	switch: SwitchPreview,
	sidebar: SidebarPreview,
	"radio-group": RadioGroupPreview,
	"chat-message": ChatMessagePreview,
	card: CardPreview,
	select: SelectPreview,
	"thinking-steps": ThinkingStepsPreview,
	"tabs-subtle": TabsSubtlePreview,
	"checkbox-group": CheckboxGroupPreview,
	"ask-user-questions": AskUserQuestionsPreview,
};
