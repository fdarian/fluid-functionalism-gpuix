import type { IconName } from "#/lib/icons";

/**
 * The copy both sides of a slide render (`app/components/demo-data.ts`), so the
 * comparison stays honest: edit content here, once.
 */

export const ACCORDION_ITEMS = [
	{
		value: "item-1",
		title: "What is Fluid Functionalism?",
		content:
			"A design philosophy where every animation serves a functional purpose — motion is information, not decoration.",
	},
	{
		value: "item-2",
		title: "How does fluid hover work?",
		content:
			"The closest item to your cursor is highlighted before you click, reducing targeting errors.",
	},
	{
		value: "item-3",
		title: "Why spring physics?",
		content:
			"Springs respond naturally to interruption — if a user reverses mid-transition, the animation adapts.",
	},
	{
		value: "item-4",
		title: "Is it compatible with shadcn/ui?",
		content:
			"Yes. Your existing theme, radius tokens, and setup apply automatically.",
	},
	{
		value: "item-5",
		title: "How do I install a component?",
		content:
			"One CLI command — dependencies and shared utilities resolve themselves.",
	},
] as const;

export const CHECKBOX_ITEMS = [
	{ id: "spring", label: "Spring physics" },
	{ id: "fluid-hover", label: "Fluid hover" },
	{ id: "weight", label: "Font weight transitions" },
	{ id: "kbd", label: "Keyboard navigation" },
	{ id: "dark", label: "Dark mode support" },
] as const;

export const DROPDOWN_ITEMS: readonly {
	value: string;
	icon: IconName;
	label: string;
}[] = [
	{ value: "spring", icon: "circle", label: "Spring animations" },
	{ value: "fluid-hover", icon: "star", label: "Fluid hover" },
	{ value: "weight", icon: "plus", label: "Font weight shifts" },
	{ value: "a11y", icon: "heart", label: "Accessible by default" },
	{ value: "primitives", icon: "check", label: "Radix or Base UI" },
	{ value: "clarity", icon: "brain", label: "Functional clarity" },
];

/** The first row starts checked. */
export const DROPDOWN_DEFAULT = "spring";

export const INPUT_FIELDS: readonly {
	key: string;
	label: string;
	placeholder: string;
}[] = [
	{ key: "name", label: "Name", placeholder: "Your name" },
	{ key: "email", label: "Email", placeholder: "you@example.com" },
	{
		key: "website",
		label: "Website",
		placeholder: "fluidfunctionalism.com",
	},
];

export const RADIO_ITEMS = [
	{ value: "fast", label: "Fast spring" },
	{ value: "moderate", label: "Moderate spring" },
	{ value: "slow", label: "Slow spring" },
	{ value: "comfortable", label: "Comfortable" },
	{ value: "none", label: "No animation" },
] as const;

export const RADIO_DEFAULT = "moderate";

export const SLIDER_OPACITY = { label: "Opacity", initial: 35 } as const;
export const SLIDER_VOLUME = { label: "Volume", initial: 60 } as const;

export const SWITCH_ITEMS = [
	{ id: "notifications", label: "Notifications", initial: true },
	{ id: "sound", label: "Sound effects", initial: false },
] as const;

export const TABLE_COLUMNS = ["Name", "Role", "Status"] as const;
export const TABLE_ROWS = [
	["Alice", "Engineer", "Active"],
	["Bob", "Designer", "Away"],
	["Carol", "PM", "Active"],
	["Dan", "Engineer", "Offline"],
	["Erin", "Researcher", "Active"],
	["Farid", "Support", "Away"],
	["Gwen", "Designer", "Active"],
] as const;

export const TABS_ITEMS = [
	{ value: "overview", label: "Overview" },
	{ value: "analytics", label: "Analytics" },
	{ value: "settings", label: "Settings" },
	{ value: "logs", label: "Logs" },
] as const;

export const TABS_DEFAULT = "overview";
