import { createSignal, For, type JSX, onCleanup, Show } from "solid-js";
import { Badge, type BadgeColor, badgeColors } from "../components/badge";
import { Button } from "../components/button";
import { ChatMessage } from "../components/chat-message";
import {
	DropdownContent,
	DropdownLabel,
	DropdownMenu,
	DropdownTrigger,
	MenuItem,
} from "../components/dropdown";
import { InputMessage } from "../components/input-message";
import { ScrollArea } from "../components/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../components/table";
import {
	TabsSubtle,
	TabsSubtleItem,
	TabsSubtlePanel,
} from "../components/tabs-subtle";
import {
	ThinkingStep,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from "../components/thinking-steps";
import type { ShotContext } from "../lib/demo";
import { Icon } from "../lib/icon";
import type { IconName } from "../lib/icons";
import { color, siteType, weight } from "../lib/theme";
import { ConceptFrame } from "./concepts/frame";
import { shadowSurface } from "./surfaces/elevated";

export const title = "Quill";
export const group = "Pages";
export const order = 34;
export const layout = "full";
export const listed = "none";

/** How long the AI block shows "Drafting with Quill AI" before the draft lands. */
const DRAFTING_MS = 1700;
const BOLD = 700;

export async function scenarios(shot: ShotContext) {
	shot.capture("document");
	await shot.focus("quill-add-block");
	await shot.press("Enter");
	await shot.settle(300);
	shot.capture("add-block-menu");
	await shot.press("ArrowDown ArrowDown");
	shot.capture("add-block-menu-keyboard");
	await shot.press("Escape");
	await shot.click("quill-tab-1");
	shot.capture("comments");
	await shot.click("quill-tab-2");
	shot.capture("activity");
	await shot.click("quill-tab-0");
	await shot.scroll(580, 400, 0, 2000);
	await shot.click("input-message-textarea");
	await shot.press("p l a n");
	await shot.press("Enter");
	await shot.settle(300);
	await shot.scroll(580, 400, 0, 2000);
	shot.expectText("Drafting with Quill AI", true);
	shot.capture("drafting");
	await shot.settle(DRAFTING_MS + 600);
	await shot.scroll(580, 400, 0, 2000);
	shot.expectText("Draft — plan", true);
	shot.capture("drafted");
}

// ── Fixtures ────────────────────────────────────────────────────────────

interface Initiative {
	name: string;
	owner: string;
	status: { label: string; color: BadgeColor };
	target: string;
}

const INITIATIVES: Initiative[] = [
	{
		name: "Self-serve onboarding",
		owner: "Dana",
		status: { label: "On track", color: "green" },
		target: "Aug 15",
	},
	{
		name: "Billing v2 migration",
		owner: "Mara",
		status: { label: "At risk", color: "amber" },
		target: "Sep 1",
	},
	{
		name: "Mobile offline mode",
		owner: "Alex",
		status: { label: "Planned", color: "gray" },
		target: "Sep 20",
	},
	{
		name: "SOC 2 Type II",
		owner: "Sam",
		status: { label: "On track", color: "green" },
		target: "Oct 30",
	},
];

const COMMENTS = [
	{
		id: "c1",
		from: "user" as const,
		text: "Should Billing v2 block the mobile work, or can they run in parallel?",
	},
	{
		id: "c2",
		from: "assistant" as const,
		text: "They can run in parallel — the only shared surface is the pricing API, and that's already versioned. I'd only serialize them if Mara's team gets pulled into the SOC 2 evidence collection.",
	},
];

const BLOCK_TYPES: { label: string; icon: IconName }[] = [
	{ label: "Text", icon: "pencil" },
	{ label: "Heading", icon: "square-library" },
	{ label: "To-do list", icon: "check" },
	{ label: "Table", icon: "rectangle-horizontal" },
	{ label: "AI block", icon: "brain" },
];

const GOALS = [
	"Cut time-to-first-value to under 5 minutes",
	"Move 60% of new accounts onto self-serve billing",
	"Close SOC 2 Type II without slipping the roadmap",
];

const ACTIVITY = [
	"Dana added the Initiatives table · 2h ago",
	"Mara changed Billing v2 to “At risk” · 5h ago",
	"Sam created this page · yesterday",
];

// ── Add-block menu ──────────────────────────────────────────────────────

function AddBlockMenu() {
	return (
		<DropdownMenu testId="quill-add-block-menu">
			<DropdownTrigger>
				{(trigger) => (
					<Button
						testId="quill-add-block"
						variant="ghost"
						size="compact"
						leadingIcon="plus"
						{...trigger.attributes}
						onMouseDown={trigger.onMouseDown}
						onClick={trigger.onClick}
					>
						Add block
					</Button>
				)}
			</DropdownTrigger>
			<DropdownContent>
				<DropdownLabel>Basic blocks</DropdownLabel>
				<For each={BLOCK_TYPES}>
					{(block, index) => (
						<MenuItem
							testId={`quill-block-${index()}`}
							index={index()}
							icon={block.icon}
							label={block.label}
						/>
					)}
				</For>
			</DropdownContent>
		</DropdownMenu>
	);
}

// ── Blocks ──────────────────────────────────────────────────────────────

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				paddingTop: 8,
				fontSize: 18,
				lineHeight: 28,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** A `surface-2` card: the callout and the drafted AI blocks. */
function SurfaceCard(props: {
	padding: number;
	gap: number;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				gap: props.gap,
				padding: props.padding,
				borderRadius: 12,
				backgroundColor: color.surface2,
				boxShadow: shadowSurface(2),
			}}
		>
			{props.children}
		</div>
	);
}

// ── AI composer block ───────────────────────────────────────────────────

function AIBlock() {
	const [draft, setDraft] = createSignal("");
	const [drafting, setDrafting] = createSignal(false);
	const [blocks, setBlocks] = createSignal<string[]>([]);
	const timers = new Set<ReturnType<typeof setTimeout>>();
	onCleanup(() => {
		for (const timer of timers) clearTimeout(timer);
	});

	const send = (value: string) => {
		const trimmed = value.trim();
		if (trimmed === "") return;
		setDraft("");
		setDrafting(true);
		const timer = setTimeout(() => {
			timers.delete(timer);
			setBlocks((previous) => [
				...previous,
				`Draft — ${trimmed}: We'll ship in three slices. First, the smallest end-to-end path that proves the data model. Second, the collaborative layer once the schema settles. Third, polish and empty states. Each slice is demoable on its own, so we can cut scope at any boundary without leaving half-built UI.`,
			]);
			setDrafting(false);
		}, DRAFTING_MS);
		timers.add(timer);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<For each={blocks()}>
				{(block) => (
					<SurfaceCard padding={14} gap={10}>
						<div style={{ marginTop: 2 }}>
							<Icon
								name="brain"
								size={16}
								strokeWidth={1.5}
								color={color.mutedForeground}
							/>
						</div>
						<text
							style={{
								...siteType.subtitle,
								color: color.foreground,
								flexShrink: 1,
								minWidth: 0,
							}}
						>
							{block}
						</text>
					</SurfaceCard>
				)}
			</For>

			<Show when={drafting()}>
				<ThinkingSteps defaultOpen width="100%">
					<ThinkingStepsHeader>Drafting with Quill AI</ThinkingStepsHeader>
					<ThinkingStepsContent>
						<ThinkingStep
							icon="search"
							label="Reading the page context"
							status="complete"
						/>
						<ThinkingStep
							icon="brain"
							label="Outlining the response"
							status="complete"
						/>
						<ThinkingStep icon="dot" label="Writing" status="active" isLast />
					</ThinkingStepsContent>
				</ThinkingSteps>
			</Show>

			<InputMessage
				value={draft()}
				onValueChange={setDraft}
				onSend={send}
				placeholder="Ask Quill AI to draft, summarize, or plan…"
				minRows={1}
				maxRows={4}
				leftSlot={
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 6,
							paddingLeft: 4,
						}}
					>
						<Icon
							name="brain"
							size={14}
							strokeWidth={1.5}
							color={color.mutedForeground}
						/>
						<text style={{ ...siteType.caption, color: color.mutedForeground }}>
							Quill AI
						</text>
					</div>
				}
			/>
		</div>
	);
}

// ── Document body ───────────────────────────────────────────────────────

function DocumentBody() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
			<text
				style={{
					fontSize: 15,
					lineHeight: 24,
					color: color.mutedForeground,
				}}
			>
				The single source of truth for what we’re building this quarter, why,
				and who owns each bet. Edit freely — every block here is a Fluid
				Functionalism component.
			</text>

			<SurfaceCard padding={16} gap={12}>
				<text style={{ fontSize: 18, lineHeight: 18 }}>💡</text>
				<text
					style={{
						...siteType.subtitle,
						color: color.foreground,
						flexShrink: 1,
						minWidth: 0,
					}}
				>
					Decisions are final once they land in the Initiatives table. Use
					comments for anything still in debate.
				</text>
			</SurfaceCard>

			<Heading>Goals</Heading>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 8,
					paddingLeft: 4,
				}}
			>
				<For each={GOALS}>
					{(goal) => (
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "flex-start",
								gap: 8,
							}}
						>
							<div
								style={{
									marginTop: 8,
									width: 6,
									height: 6,
									flexShrink: 0,
									borderRadius: 3,
									backgroundColor: color.mutedForeground,
								}}
							/>
							<text
								style={{
									...siteType.subtitle,
									color: color.foreground,
									flexShrink: 1,
									minWidth: 0,
								}}
							>
								{goal}
							</text>
						</div>
					)}
				</For>
			</div>

			<div style={{ alignSelf: "flex-start" }}>
				<AddBlockMenu />
			</div>

			<Heading>Initiatives</Heading>
			<Table testId="quill-initiatives">
				<TableHeader>
					<TableRow>
						<TableHead>Initiative</TableHead>
						<TableHead width={110}>Owner</TableHead>
						<TableHead width={130}>Status</TableHead>
						<TableHead width={110}>Target</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<For each={INITIATIVES}>
						{(initiative, index) => (
							<TableRow index={index()}>
								<TableCell>{initiative.name}</TableCell>
								<TableCell width={110}>{initiative.owner}</TableCell>
								<TableCell width={130}>
									<div style={{ display: "flex", flexDirection: "row" }}>
										<Badge
											variant="dot"
											size="compact"
											color={initiative.status.color}
										>
											{initiative.status.label}
										</Badge>
									</div>
								</TableCell>
								<TableCell width={110}>{initiative.target}</TableCell>
							</TableRow>
						)}
					</For>
				</TableBody>
			</Table>

			<Heading>Draft with AI</Heading>
			<AIBlock />
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────

export function Page() {
	const [tab, setTab] = createSignal(0);
	return (
		<ConceptFrame>
			<ScrollArea height="100%">
				<div
					style={{
						width: "100%",
						maxWidth: 760,
						alignSelf: "center",
						display: "flex",
						flexDirection: "column",
						paddingLeft: 32,
						paddingRight: 32,
						paddingTop: 48,
						paddingBottom: 48,
					}}
				>
					<text style={{ fontSize: 40, lineHeight: 48, marginBottom: 8 }}>
						🗓️
					</text>
					<text
						style={{
							fontSize: 34,
							lineHeight: 42,
							fontWeight: BOLD,
							color: color.foreground,
						}}
					>
						Q3 Planning
					</text>
					<div
						style={{
							marginTop: 8,
							marginBottom: 24,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 8,
						}}
					>
						<div
							style={{
								width: 20,
								height: 20,
								flexShrink: 0,
								borderRadius: 10,
								backgroundColor: badgeColors.blue,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<text
								style={{ fontSize: 9, lineHeight: 12, color: color.background }}
							>
								DK
							</text>
						</div>
						<text style={{ ...siteType.caption, color: color.mutedForeground }}>
							Dana Kim · edited just now
						</text>
					</div>

					<TabsSubtle
						testId="quill-tabs"
						idPrefix="quill"
						selectedIndex={tab()}
						onSelect={setTab}
					>
						<TabsSubtleItem
							testId="quill-tab-0"
							index={0}
							icon="pencil"
							label="Document"
						/>
						<TabsSubtleItem
							testId="quill-tab-1"
							index={1}
							icon="message-circle"
							label="Comments"
						/>
						<TabsSubtleItem
							testId="quill-tab-2"
							index={2}
							icon="clock"
							label="Activity"
						/>
					</TabsSubtle>

					<div style={{ marginTop: 24 }}>
						<TabsSubtlePanel index={0} selectedIndex={tab()} idPrefix="quill">
							<DocumentBody />
						</TabsSubtlePanel>
						<TabsSubtlePanel index={1} selectedIndex={tab()} idPrefix="quill">
							<div
								style={{ display: "flex", flexDirection: "column", gap: 16 }}
							>
								<For each={COMMENTS}>
									{(comment) => (
										<ChatMessage from={comment.from} fullWidth>
											{comment.text}
										</ChatMessage>
									)}
								</For>
							</div>
						</TabsSubtlePanel>
						<TabsSubtlePanel index={2} selectedIndex={tab()} idPrefix="quill">
							<div
								style={{ display: "flex", flexDirection: "column", gap: 12 }}
							>
								<For each={ACTIVITY}>
									{(entry) => (
										<text
											style={{
												...siteType.body,
												color: color.mutedForeground,
											}}
										>
											{entry}
										</text>
									)}
								</For>
							</div>
						</TabsSubtlePanel>
					</div>
				</div>
			</ScrollArea>
		</ConceptFrame>
	);
}
