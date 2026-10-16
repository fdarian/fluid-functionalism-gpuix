import { createSignal, For } from "solid-js";
import {
	type AskUserAnswer,
	type AskUserQuestion,
	AskUserQuestions,
} from "../components/ask-user-questions";
import { Button } from "../components/button";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from "../lib/playground";
import { color, type as scale } from "../lib/theme";

const multipleQuestions: AskUserQuestion[] = [
	{
		id: "role",
		title: "What's your role?",
		options: [
			{ id: "design", title: "Designer", description: "Visual / interaction" },
			{ id: "eng", title: "Engineer", description: "Frontend / backend" },
			{ id: "pm", title: "PM", description: "Product / program" },
			{
				id: "research",
				title: "Researcher",
				description: "User / market research",
			},
		],
	},
	{
		id: "tools",
		title: "Which tool do you use most?",
		options: [
			{ id: "figma", title: "Figma", description: "Design source of truth" },
			{ id: "vscode", title: "VS Code", description: "Code editor" },
			{ id: "linear", title: "Linear", description: "Issue tracker" },
			{ id: "notion", title: "Notion", description: "Docs and planning" },
		],
	},
	{
		id: "team",
		title: "How big is your team?",
		options: [
			{
				id: "solo",
				title: "Just me",
				description: "Solo founder or freelancer",
			},
			{ id: "small", title: "2–10", description: "Small team or pod" },
			{
				id: "mid",
				title: "11–50",
				description: "A few cross-functional teams",
			},
			{ id: "large", title: "50+", description: "Full org" },
		],
	},
	{
		id: "experience",
		title: "How long have you been doing this?",
		options: [
			{
				id: "lt1",
				title: "Less than a year",
				description: "Just getting started",
			},
			{ id: "1to3", title: "1–3 years", description: "Finding your rhythm" },
			{
				id: "3to7",
				title: "3–7 years",
				description: "Comfortable in the craft",
			},
			{ id: "gt7", title: "7+ years", description: "Seasoned" },
		],
	},
];

const multiSelectQuestions: AskUserQuestion[] = [
	{
		id: "features",
		title: "Which features should we prioritize?",
		multiSelect: true,
		options: [
			{
				id: "dm",
				title: "Dark mode",
				description: "System-aware theme switching",
			},
			{
				id: "a11y",
				title: "Accessibility",
				description: "Screen-reader and keyboard support",
			},
			{ id: "perf", title: "Performance", description: "Faster initial load" },
			{
				id: "i18n",
				title: "Translations",
				description: "Multi-language support",
			},
		],
		nextLabel: "Continue",
	},
	{
		id: "platforms",
		title: "Which platforms do you target?",
		multiSelect: true,
		options: [
			{ id: "web", title: "Web", description: "Desktop browsers" },
			{ id: "ios", title: "iOS", description: "iPhone and iPad" },
			{ id: "android", title: "Android", description: "Phones and tablets" },
			{
				id: "desktop",
				title: "Native desktop",
				description: "macOS / Windows / Linux apps",
			},
		],
	},
	{
		id: "integrations",
		title: "Which integrations matter most?",
		multiSelect: true,
		options: [
			{
				id: "slack",
				title: "Slack",
				description: "Notifications and approvals",
			},
			{ id: "github", title: "GitHub", description: "PR and issue sync" },
			{ id: "linear", title: "Linear", description: "Two-way ticket linking" },
			{ id: "figma", title: "Figma", description: "Design hand-off" },
			{
				id: "calendar",
				title: "Calendar",
				description: "Schedule-aware reminders",
			},
		],
	},
];

const otherQuestions: AskUserQuestion[] = [
	{
		id: "blocker",
		title: "What's blocking you most right now?",
		options: [
			{ id: "scope", title: "Scope", description: "Too much on the plate" },
			{ id: "review", title: "Review", description: "Waiting on feedback" },
			{ id: "infra", title: "Infra", description: "Tooling slows me down" },
		],
		allowOther: true,
		otherPlaceholder: "Describe in your own words…",
	},
	{
		id: "improve",
		title: "Which area needs the most improvement?",
		options: [
			{ id: "speed", title: "Speed", description: "Make the loop faster" },
			{
				id: "clarity",
				title: "Clarity",
				description: "Sharpen what good looks like",
			},
			{
				id: "alignment",
				title: "Alignment",
				description: "Get on the same page sooner",
			},
			{ id: "quality", title: "Quality", description: "Raise the craft bar" },
		],
		allowOther: true,
	},
	{
		id: "easier",
		title: "What would make your week easier?",
		options: [
			{
				id: "fewer",
				title: "Fewer meetings",
				description: "Reclaim deep work time",
			},
			{
				id: "decisions",
				title: "Faster decisions",
				description: "Unblock without escalation",
			},
			{
				id: "context",
				title: "More context",
				description: "Know the why upfront",
			},
		],
		allowOther: true,
		otherPlaceholder: "Anything else?",
	},
];

const stackedQuestions: AskUserQuestion[] = [
	{
		id: "template",
		title: "Which starting template fits your project?",
		layout: "stacked",
		options: [
			{
				id: "marketing",
				title: "Marketing site",
				description:
					"Polished landing page with hero, features grid, pricing table, and a footer. Best when you need to ship a story-driven page fast.",
			},
			{
				id: "chat",
				title: "AI chat app",
				description:
					"Full conversation UI with InputMessage, ThinkingSteps, and message bubbles wired up. Ideal for assistants and copilots.",
			},
			{
				id: "admin",
				title: "Admin dashboard",
				description:
					"Sidebar shell, sortable data tables, and form-heavy detail views. Built for back-office tools and operational apps.",
			},
			{
				id: "onboarding",
				title: "Onboarding flow",
				description:
					"Stepped intake using AskUserQuestions with a progress indicator and inline validation. Great for setup wizards.",
			},
		],
	},
	{
		id: "shape",
		title: "Which shape language fits your brand?",
		layout: "stacked",
		options: [
			{
				id: "rounded",
				title: "Rounded",
				description:
					"Soft 16–24px corners that feel approachable and read as software. Pairs well with editorial typography and dense layouts.",
			},
			{
				id: "pill",
				title: "Pill",
				description:
					"Fully rounded shapes that lean playful and consumer-friendly. Best when controls are sparse and breathing room is generous.",
			},
		],
	},
	{
		id: "components",
		title: "Which components will you reach for first?",
		layout: "stacked",
		multiSelect: true,
		nextLabel: "Continue",
		options: [
			{
				id: "input",
				title: "InputMessage",
				description:
					"Chat-style composer with attachments, dropdowns, and submit affordances. The backbone of any AI surface.",
			},
			{
				id: "thinking",
				title: "ThinkingSteps",
				description:
					"Animated, streamable reasoning steps with collapse and expand. Great for showing AI work in progress.",
			},
			{
				id: "ask",
				title: "AskUserQuestions",
				description:
					"This component — stepped flows with single and multi-select, optional Other, and fluid hover throughout.",
			},
			{
				id: "tabs",
				title: "TabsSubtle",
				description:
					"Quiet segmented tabs that morph between selections. Reach for these when section headers would be too loud.",
			},
			{
				id: "nav",
				title: "NavMenu",
				description:
					"Sidebar navigation with active-state morphing, grouped sections, and keyboard support out of the box.",
			},
		],
	},
	{
		id: "drew",
		title: "What drew you to Fluid Functionalism?",
		layout: "stacked",
		allowOther: true,
		otherPlaceholder: "Something else? Tell us in a sentence…",
		options: [
			{
				id: "motion",
				title: "Motion that feels alive",
				description:
					"Spring tokens, fluid hover, and morphing backgrounds make every interaction feel intentional rather than scripted.",
			},
			{
				id: "craft",
				title: "Pixel-level craft",
				description:
					"Every component is tuned for typography, spacing, focus rings, and dark mode — no defaults left untouched.",
			},
			{
				id: "tokens",
				title: "A token system, not just components",
				description:
					"Shape, elevation, color, and font-weight tokens compose cleanly so the registry scales beyond what you see.",
			},
		],
	},
	{
		id: "frameworks",
		title: "Where will you ship these components?",
		layout: "stacked",
		multiSelect: true,
		options: [
			{
				id: "next",
				title: "Next.js (App Router)",
				description:
					"Server components, client islands, and route-level layouts. The primary target the registry is tuned for.",
			},
			{
				id: "remix",
				title: "Remix",
				description:
					"Full-stack data loading with nested routes. Most components transplant cleanly; framer-motion stays client-only.",
			},
			{
				id: "vite",
				title: "Vite + React",
				description:
					"Single-page apps and internal dashboards. The fastest dev loop for prototyping new flows against the registry.",
			},
			{
				id: "astro",
				title: "Astro",
				description:
					"Content-first sites with interactive islands. Good fit for marketing pages that need a handful of live components.",
			},
		],
	},
	{
		id: "theme",
		title: "How will you handle theme mode?",
		layout: "stacked",
		options: [
			{
				id: "light",
				title: "Light only",
				description:
					"Tune one palette deeply. Best when the product is consumer-facing and the brand voice is bright.",
			},
			{
				id: "dark",
				title: "Dark only",
				description:
					"Lean into the dark-mode aesthetic the registry was designed in. Cuts theme work in half.",
			},
			{
				id: "system",
				title: "System-aware",
				description:
					"Follow the OS preference automatically. No toggle UI, no user friction, and it matches what most apps do today.",
			},
			{
				id: "toggle",
				title: "User toggle",
				description:
					"Give users an explicit switch with persistence. The most flexible option, but it adds a small surface to design.",
			},
		],
	},
	{
		id: "missing",
		title: "What's missing from the registry today?",
		layout: "stacked",
		multiSelect: true,
		allowOther: true,
		otherPlaceholder: "Tell us what to build next…",
		nextLabel: "Send feedback",
		options: [
			{
				id: "data",
				title: "Data table",
				description:
					"Sortable, filterable, virtualized rows with column resizing and density modes. The most-asked-for primitive.",
			},
			{
				id: "calendar",
				title: "Calendar / date picker",
				description:
					"Single date, range, and inline calendar — with keyboard support and locale-aware formatting baked in.",
			},
			{
				id: "command",
				title: "Command menu",
				description:
					"Keyboard-first launcher with recents, grouped actions, and fuzzy matching. The connective tissue for power users.",
			},
		],
	},
	{
		id: "recommend",
		title: "Would you recommend Fluid Functionalism to a teammate?",
		layout: "stacked",
		skippable: false,
		options: [
			{
				id: "yes",
				title: "Yes, already have",
				description:
					"It's clear from the first install where the bar is. You'd hand it to anyone shipping a polished React surface.",
			},
			{
				id: "soon",
				title: "Once it covers more ground",
				description:
					"Once the missing pieces (data table, calendar, command) land you'd recommend it without reservation.",
			},
			{
				id: "unsure",
				title: "Still evaluating",
				description:
					"You like the direction but want to ship one real flow against it before passing it on to others.",
			},
		],
	},
];

const chipLeftQuestions: AskUserQuestion[] = [
	{
		id: "role",
		title: "Pick your role",
		chipPosition: "left",
		options: [
			{ id: "design", title: "Designer", description: "Prototyping flows" },
			{ id: "eng", title: "Engineer", description: "Shipping production UI" },
			{ id: "pm", title: "PM", description: "Aligning the team" },
		],
	},
	{
		id: "template",
		title: "Which starting template fits your project?",
		chipPosition: "left",
		layout: "stacked",
		options: [
			{
				id: "marketing",
				title: "Marketing site",
				description:
					"Hero, features grid, pricing, footer. Best when you need to ship a story-driven page fast.",
			},
			{
				id: "chat",
				title: "AI chat app",
				description:
					"InputMessage, ThinkingSteps and message bubbles wired together. Ideal for assistants and copilots.",
			},
			{
				id: "admin",
				title: "Admin dashboard",
				description:
					"Sidebar shell, sortable tables, and form-heavy detail views. Built for back-office tools.",
			},
		],
	},
	{
		id: "frameworks",
		title: "Where will you ship these components?",
		chipPosition: "left",
		multiSelect: true,
		nextLabel: "Continue",
		options: [
			{ id: "next", title: "Next.js", description: "App Router projects" },
			{ id: "remix", title: "Remix", description: "Full-stack apps" },
			{ id: "vite", title: "Vite + React", description: "SPAs and dashboards" },
			{ id: "astro", title: "Astro", description: "Content-first sites" },
		],
	},
	{
		id: "feedback",
		title: "Anything else we should build?",
		chipPosition: "left",
		options: [
			{
				id: "data",
				title: "Data table",
				description: "Sortable, filterable rows",
			},
			{
				id: "calendar",
				title: "Calendar",
				description: "Date picker and range",
			},
			{
				id: "command",
				title: "Command menu",
				description: "Fast keyboard launcher",
			},
		],
		allowOther: true,
		otherPlaceholder: "Tell us in a few lines…",
	},
	{
		id: "recommend",
		title: "Would you recommend Fluid Functionalism?",
		chipPosition: "left",
		skippable: false,
		options: [
			{ id: "yes", title: "Yes", description: "Already have" },
			{ id: "soon", title: "Soon", description: "Once it covers more ground" },
			{ id: "unsure", title: "Not sure yet", description: "Still evaluating" },
		],
	},
];

const freeTextQuestions: AskUserQuestion[] = [
	{
		id: "name",
		title: "What should we call your workspace?",
		freeText: true,
		freeTextMultiline: false,
		freeTextPlaceholder: "e.g. Acme Design",
	},
	{
		id: "goal",
		title: "Describe what you're hoping to build.",
		freeText: true,
		freeTextPlaceholder: "A sentence or two is plenty…",
	},
	{
		id: "feedback",
		title: "Anything else you'd like us to know?",
		freeText: true,
		skippable: false,
		nextLabel: "Finish",
	},
];

const validateQuestions: AskUserQuestion[] = [
	{
		id: "email",
		title: "Your work email?",
		freeText: true,
		freeTextMultiline: false,
		freeTextPlaceholder: "you@company.com",
		freeTextValidate: (value) =>
			/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)
				? null
				: "Please enter a valid email so we can reach out.",
	},
];

const skipQuestions: AskUserQuestion[] = [
	{
		id: "experience",
		title: "How long have you been using the product?",
		options: [
			{
				id: "new",
				title: "Less than a week",
				description: "Just getting started",
			},
			{
				id: "mid",
				title: "A few months",
				description: "Comfortable with basics",
			},
			{ id: "long", title: "Over a year", description: "Power user" },
		],
	},
	{
		id: "frequency",
		title: "How often do you use it?",
		options: [
			{ id: "daily", title: "Daily", description: "Part of my routine" },
			{
				id: "weekly",
				title: "A few times a week",
				description: "When the work calls for it",
			},
			{
				id: "monthly",
				title: "A few times a month",
				description: "Occasional use",
			},
			{ id: "rarely", title: "Rarely", description: "Once in a while" },
		],
	},
	{
		id: "recommend",
		title: "Would you recommend it to a colleague?",
		options: [
			{ id: "yes", title: "Yes", description: "Already have" },
			{ id: "maybe", title: "Maybe", description: "Depends on the role" },
			{ id: "no", title: "Not yet", description: "Needs more polish first" },
		],
	},
];

export const title = "Ask User Questions";
export const group = "Components";

const PLAY_OPTION_QUESTIONS = [
	{
		id: "role",
		title: "How do you plan to use Fluid Functionalism?",
		options: [
			{
				id: "design",
				title: "Designer",
				short: "Prototyping flows and pages",
				long: "Prototyping flows and pages fast, then handing the patterns to the team.",
			},
			{
				id: "eng",
				title: "Engineer",
				short: "Shipping production UI",
				long: "Shipping production UI with springs and tokens instead of hand-rolled CSS.",
			},
			{
				id: "pm",
				title: "PM",
				short: "Aligning the team on patterns",
				long: "Aligning the team on one set of interaction patterns everyone can point to.",
			},
			{
				id: "founder",
				title: "Founder",
				short: "Bootstrapping a product",
				long: "Bootstrapping a product that needs to look credible from day one.",
			},
		],
	},
	{
		id: "drew",
		title: "What drew you to Fluid Functionalism?",
		options: [
			{
				id: "motion",
				title: "Motion",
				short: "Springs that feel alive",
				long: "Spring-driven motion that feels alive instead of scripted.",
			},
			{
				id: "craft",
				title: "Craft",
				short: "Pixel-level polish",
				long: "Pixel-level polish across typography, spacing, and focus states.",
			},
			{
				id: "tokens",
				title: "Tokens",
				short: "Shape and elevation systems",
				long: "Shape and elevation systems that compose beyond single components.",
			},
		],
	},
	{
		id: "recommend",
		title: "Would you recommend Fluid Functionalism to a teammate?",
		options: [
			{
				id: "yes",
				title: "Yes",
				short: "Already have",
				long: "Already have — it sets the bar for polished React surfaces.",
			},
			{
				id: "soon",
				title: "Soon",
				short: "Once it covers more ground",
				long: "Once it covers more ground — a few primitives are still missing.",
			},
			{
				id: "unsure",
				title: "Not sure yet",
				short: "Still evaluating",
				long: "Still evaluating — one real flow will settle it.",
			},
		],
	},
];

const PLAY_FREE_TEXT_QUESTIONS = [
	{
		id: "name",
		title: "What should we call your workspace?",
		placeholder: "e.g. Acme Design",
	},
	{
		id: "goal",
		title: "Describe what you're hoping to build.",
		placeholder: "A sentence or two is plenty…",
	},
	{
		id: "feedback",
		title: "Anything else you'd like us to know?",
		placeholder: "Type your answer…",
	},
];

type PlayType = "options" | "freeText";
type PlayLayout = "inline" | "stacked";
type PlayChip = "right" | "left";
type PlayCount = "1" | "2" | "3";

interface PlayConfig {
	type: PlayType;
	layout: PlayLayout;
	chip: PlayChip;
	multiSelect: boolean;
	allowOther: boolean;
	multiline: boolean;
	count: PlayCount;
	skippable: boolean;
}

function buildPlayQuestions(config: PlayConfig): AskUserQuestion[] {
	const count = Number(config.count);
	if (config.type === "freeText") {
		return PLAY_FREE_TEXT_QUESTIONS.slice(0, count).map((question) => ({
			id: question.id,
			title: question.title,
			freeText: true,
			freeTextMultiline: config.multiline ? undefined : false,
			freeTextPlaceholder: question.placeholder,
			skippable: config.skippable ? undefined : false,
		}));
	}
	return PLAY_OPTION_QUESTIONS.slice(0, count).map((question) => ({
		id: question.id,
		title: question.title,
		layout: config.layout === "stacked" ? "stacked" : undefined,
		chipPosition: config.chip === "left" ? "left" : undefined,
		multiSelect: config.multiSelect || undefined,
		allowOther: config.allowOther || undefined,
		otherPlaceholder: config.allowOther ? "Something else?" : undefined,
		skippable: config.skippable ? undefined : false,
		options: question.options.map((option) => ({
			id: option.id,
			title: option.title,
			description: config.layout === "stacked" ? option.long : option.short,
		})),
	}));
}

/** The flow holds its own step and answers, so any control change remounts it from question 1. */
function Playground() {
	const [type, setType] = createSignal<PlayType>("options");
	const [layout, setLayout] = createSignal<PlayLayout>("inline");
	const [chip, setChip] = createSignal<PlayChip>("right");
	const [multiSelect, setMultiSelect] = createSignal(false);
	const [allowOther, setAllowOther] = createSignal(false);
	const [multiline, setMultiline] = createSignal(true);
	const [count, setCount] = createSignal<PlayCount>("3");
	const [skippable, setSkippable] = createSignal(true);
	const [replay, setReplay] = createSignal(0);

	const freeText = () => type() === "freeText";
	const config = (): PlayConfig => ({
		type: type(),
		layout: layout(),
		chip: chip(),
		multiSelect: multiSelect(),
		allowOther: allowOther(),
		multiline: multiline(),
		count: count(),
		skippable: skippable(),
	});
	const flowKey = () =>
		[
			type(),
			layout(),
			chip(),
			multiSelect(),
			allowOther(),
			multiline(),
			count(),
			skippable(),
			replay(),
		].join("|");

	const shuffle = () => {
		setType(pick(["options", "options", "options", "freeText"] as const));
		setLayout(pick(["inline", "inline", "stacked"] as const));
		setChip(pick(["right", "right", "left"] as const));
		setMultiSelect(Math.random() > 0.6);
		setAllowOther(Math.random() > 0.7);
		setMultiline(Math.random() > 0.3);
		setCount(pick(["1", "2", "3"] as const));
		setSkippable(Math.random() > 0.2);
		setReplay(replay() + 1);
	};

	return (
		<PlaygroundLayout
			minHeight={560}
			preview={
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "flex-end",
						flexGrow: 1,
						width: "100%",
						maxWidth: 420,
						gap: 12,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							justifyContent: "flex-end",
						}}
					>
						<Button
							testId="play-replay"
							variant="ghost"
							size="compact"
							onClick={() => setReplay(replay() + 1)}
						>
							Replay
						</Button>
					</div>
					<For each={[flowKey()]}>
						{() => (
							<AskUserQuestions
								testId="play"
								questions={buildPlayQuestions(config())}
							/>
						)}
					</For>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Question" />
					<PlayField label="Type">
						<PlaySelect
							testId="play-type"
							value={type()}
							onChange={setType}
							options={[
								{ value: "options", label: "Options" },
								{ value: "freeText", label: "Free text" },
							]}
						/>
					</PlayField>
					<PlayField label="Layout" disabled={freeText()}>
						<PlaySelect
							testId="play-layout"
							value={layout()}
							onChange={setLayout}
							options={[
								{ value: "inline", label: "Inline" },
								{ value: "stacked", label: "Stacked" },
							]}
						/>
					</PlayField>
					<PlayField label="Chip position" disabled={freeText()}>
						<PlaySelect
							testId="play-chip"
							value={chip()}
							onChange={setChip}
							options={[
								{ value: "right", label: "Right" },
								{ value: "left", label: "Left" },
							]}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-multi"
						label="Multi-select"
						checked={multiSelect()}
						onToggle={() => setMultiSelect(!multiSelect())}
						disabled={freeText()}
					/>
					<PlaySwitch
						testId="play-other"
						label="Allow other"
						checked={allowOther()}
						onToggle={() => setAllowOther(!allowOther())}
						disabled={freeText()}
					/>
					<PlaySwitch
						testId="play-multiline"
						label="Multiline"
						checked={multiline()}
						onToggle={() => setMultiline(!multiline())}
						disabled={!freeText()}
					/>
					<PlayDivider />
					<PlaySection label="Flow" />
					<PlayField label="Questions">
						<PlaySelect
							testId="play-count"
							value={count()}
							onChange={setCount}
							options={[
								{ value: "1", label: "1" },
								{ value: "2", label: "2" },
								{ value: "3", label: "3" },
							]}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-skippable"
						label="Skippable"
						checked={skippable()}
						onToggle={() => setSkippable(!skippable())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

/** One flow in its card, with the docs page's Replay button: a new run remounts it. */
function Example(props: {
	title: string;
	id: string;
	questions: AskUserQuestion[];
}) {
	const [run, setRun] = createSignal(0);
	return (
		<DemoCard title={props.title}>
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "flex-end",
					}}
				>
					<Button
						testId={`${props.id}-replay`}
						variant="ghost"
						size="compact"
						onClick={() => setRun(run() + 1)}
					>
						Replay
					</Button>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "center",
					}}
				>
					<For each={[run()]}>
						{() => (
							<AskUserQuestions
								testId={props.id}
								questions={props.questions}
								autoFocus={false}
							/>
						)}
					</For>
				</div>
			</div>
		</DemoCard>
	);
}

/** The Controlled example: the index and answers live out here, next to a readout of them. */
function ControlledExample() {
	const [index, setIndex] = createSignal(0);
	const [answers, setAnswers] = createSignal<Record<string, AskUserAnswer>>({});
	const readout = () =>
		`currentIndex: ${index()}\nanswers: ${JSON.stringify(
			Object.values(answers()).map((answer) => ({
				id: answer.questionId,
				selected: answer.selectedIds,
				skipped: answer.skipped,
			})),
		)}`;
	return (
		<DemoCard title="Controlled">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "flex-end",
					}}
				>
					<Button
						testId="controlled-replay"
						variant="ghost"
						size="compact"
						onClick={() => {
							setIndex(0);
							setAnswers({});
						}}
					>
						Replay
					</Button>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "center",
					}}
				>
					<AskUserQuestions
						testId="controlled"
						questions={multipleQuestions}
						currentIndex={index()}
						onCurrentIndexChange={setIndex}
						answers={answers()}
						onAnswersChange={setAnswers}
						onComplete={() => setIndex(0)}
						autoFocus={false}
					/>
				</div>
				<text
					style={{
						...scale.caption,
						color: color.mutedForeground,
						whiteSpace: "pre-line",
					}}
				>
					{readout()}
				</text>
			</div>
		</DemoCard>
	);
}

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<Playground />
			<Example
				title="Multiple questions"
				id="multiple"
				questions={multipleQuestions}
			/>
			<Example
				title="Multi-select"
				id="multi"
				questions={multiSelectQuestions}
			/>
			<Example title="With other" id="other" questions={otherQuestions} />
			<Example title="Free text" id="free" questions={freeTextQuestions} />
			<Example
				title="Free text validation"
				id="validate"
				questions={validateQuestions}
			/>
			<Example title="Skippable" id="skip" questions={skipQuestions} />
			<Example
				title="Chip on left"
				id="chip-left"
				questions={chipLeftQuestions}
			/>
			<Example
				title="Stacked layout"
				id="stacked"
				questions={stackedQuestions}
			/>
			<ControlledExample />
		</div>
	);
}

/** Scrolls the page until the element with this test id is mid-window. */
async function scrollTo(shot: ShotContext, testId: string) {
	for (let attempt = 0; attempt < 2; attempt++) {
		await shot.scroll(600, 400, 0, shot.centerOf(testId).y - 300);
		await shot.settle();
	}
}

/** Opens a playground select from the keyboard and walks `steps` rows. */
async function pickPlay(shot: ShotContext, testId: string, steps: string) {
	await shot.focus(`${testId}-trigger`);
	await shot.press(`ArrowDown ${steps} Enter`);
	await shot.settle(300);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The playground: the default flow, an answer, then controls rebuild it from question 1.
	shot.capture("playground");
	await shot.click("play-option-1");
	shot.expectText("What drew you to Fluid Functionalism?", true);
	await shot.click("play-multi-track");
	shot.expectText("How do you plan to use Fluid Functionalism?", true);
	await pickPlay(shot, "play-layout", "down");
	await shot.click("play-other-track");
	shot.capture("playground-stacked-multi-other");
	await pickPlay(shot, "play-type", "down");
	shot.expectText("What should we call your workspace?", true);
	shot.capture("playground-free-text");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	// Hover, then a single-select answer advances to the next question.
	await scrollTo(shot, "multiple-option-1");
	await shot.hover("multiple-option-1");
	shot.capture("hover");
	await shot.click("multiple-option-1");
	shot.capture("next-question");
	await shot.click("multiple-back");
	shot.capture("back");

	// Multi-select: contiguous picks merge into one block, a gap makes two.
	await scrollTo(shot, "multi-option-0");
	await shot.click("multi-option-0");
	await shot.click("multi-option-1");
	shot.capture("multi-merged");
	await shot.click("multi-option-3");
	shot.capture("multi-two-runs");
	// Keyboard: the arrows move the highlight and focus, space toggles.
	await shot.press("ArrowUp");
	await shot.press("Space");
	shot.capture("multi-keyboard");
	await shot.press("2");
	shot.capture("multi-digit");
	// The shortcut commits from anywhere in the card.
	await shot.press("Meta+Enter");
	shot.expectText("Which platforms do you target?", true);
	shot.capture("multi-next");

	// An "other" row: the empty field shows its outline, typing fills the row.
	await scrollTo(shot, "other-other");
	await shot.click("other-other-input");
	shot.capture("other-focused");
	await shot.press("h i Space t h e r e");
	shot.capture("other-typed");

	// Free text, and validation on submit.
	await scrollTo(shot, "free-free-input");
	await shot.click("free-free-input");
	await shot.press("A c m e");
	shot.capture("free-typed");
	await scrollTo(shot, "validate-free-input");
	await shot.click("validate-free-input");
	await shot.press("a b c");
	await shot.click("validate-continue");
	shot.capture("validate-error");

	await scrollTo(shot, "skip-option-0");
	shot.capture("skippable");
	await scrollTo(shot, "chip-left-option-0");
	await shot.hover("chip-left-option-1");
	shot.capture("chip-left");
	await scrollTo(shot, "stacked-option-0");
	await shot.hover("stacked-option-1");
	shot.capture("stacked");

	await scrollTo(shot, "controlled-option-0");
	await shot.click("controlled-option-0");
	await shot.click("controlled-option-1");
	shot.capture("controlled");
};
