import type { AskUserQuestion } from "#/components/ask-user-questions";

/** `askUserExampleQuestions` of `app/components/bento-previews.tsx:430-529`: the same eight questions as the docs page's first example. */
export const ASK_USER_EXAMPLE_QUESTIONS: AskUserQuestion[] = [
	{
		id: "role",
		title: "How do you plan to use Fluid Functionalism?",
		options: [
			{
				id: "design",
				title: "Designer",
				description: "Prototyping flows and pages",
			},
			{
				id: "eng",
				title: "Engineer",
				description: "Shipping production UI",
			},
			{
				id: "pm",
				title: "PM",
				description: "Aligning the team on patterns",
			},
			{
				id: "founder",
				title: "Founder",
				description: "Bootstrapping a product",
			},
		],
	},
	{
		id: "shape",
		title: "Which shape language fits your brand?",
		options: [
			{
				id: "rounded",
				title: "Rounded",
				description: "Soft, familiar corners",
			},
			{ id: "pill", title: "Pill", description: "Fully rounded, friendly" },
		],
	},
	{
		id: "components",
		title: "Which components are you reaching for first?",
		multiSelect: true,
		options: [
			{
				id: "input",
				title: "InputMessage",
				description: "Chat-style composer with attachments",
			},
			{
				id: "thinking",
				title: "ThinkingSteps",
				description: "Streamed reasoning steps",
			},
			{
				id: "ask",
				title: "AskUserQuestions",
				description: "Stepped question flows",
			},
			{ id: "tabs", title: "TabsSubtle", description: "Quiet segmented tabs" },
			{ id: "nav", title: "NavMenu", description: "Sidebar navigation" },
		],
		nextLabel: "Continue",
	},
	{
		id: "drew",
		title: "What drew you to Fluid Functionalism?",
		options: [
			{ id: "motion", title: "Motion", description: "Springs that feel alive" },
			{ id: "craft", title: "Craft", description: "Pixel-level polish" },
			{
				id: "tokens",
				title: "Tokens",
				description: "Shape and elevation systems",
			},
		],
		allowOther: true,
		otherPlaceholder: "Something else?",
	},
	{
		id: "frameworks",
		title: "Where will you ship these components?",
		multiSelect: true,
		options: [
			{ id: "next", title: "Next.js", description: "App Router projects" },
			{ id: "remix", title: "Remix", description: "Full-stack apps" },
			{ id: "vite", title: "Vite + React", description: "SPAs and dashboards" },
			{ id: "astro", title: "Astro", description: "Content-first sites" },
		],
	},
	{
		id: "themes",
		title: "Which theme mode do you support?",
		options: [
			{ id: "light", title: "Light only" },
			{ id: "dark", title: "Dark only" },
			{ id: "system", title: "System-aware" },
			{ id: "toggle", title: "User toggle" },
		],
	},
	{
		id: "missing",
		title: "What's missing from the registry today?",
		multiSelect: true,
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
		otherPlaceholder: "Tell us what to build next…",
		nextLabel: "Send feedback",
	},
	{
		id: "recommend",
		title: "Would you recommend Fluid Functionalism to a teammate?",
		skippable: false,
		options: [
			{ id: "yes", title: "Yes", description: "Already have" },
			{ id: "soon", title: "Soon", description: "Once it covers more ground" },
			{
				id: "unsure",
				title: "Not sure yet",
				description: "Still evaluating",
			},
		],
	},
];
