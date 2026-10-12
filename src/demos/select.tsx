import { createSignal } from "solid-js";
import { Select, type SelectEntry } from "../components/select";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { defineIcon } from "../lib/icons";

const monitor = defineIcon(
	'<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
);
const shield = defineIcon(
	'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
);

const FRUITS = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
	{ value: "mango", label: "Mango" },
] as const;

const THEMES = [
	{ value: "system", label: "System", icon: monitor },
	{ value: "light", label: "Light", icon: "sun" },
	{ value: "dark", label: "Dark", icon: "moon" },
] as const;

const GROUPS: readonly SelectEntry<string>[] = [
	{ type: "label", label: "Account" },
	{ value: "profile", label: "Profile", icon: "user" },
	{ value: "email", label: "Email", icon: "mail" },
	{ type: "separator" },
	{ type: "label", label: "Preferences" },
	{ value: "notifications", label: "Notifications", icon: "bell" },
	{ value: "privacy", label: "Privacy", icon: shield },
];

const TIMEZONES = [
	["utc-8", "(UTC-8) Pacific Time"],
	["utc-7", "(UTC-7) Mountain Time"],
	["utc-6", "(UTC-6) Central Time"],
	["utc-5", "(UTC-5) Eastern Time"],
	["utc-4", "(UTC-4) Atlantic Time"],
	["utc-3", "(UTC-3) Buenos Aires"],
	["utc-1", "(UTC-1) Azores"],
	["utc+0", "(UTC+0) London"],
	["utc+1", "(UTC+1) Paris"],
	["utc+2", "(UTC+2) Helsinki"],
	["utc+3", "(UTC+3) Moscow"],
	["utc+5:30", "(UTC+5:30) Mumbai"],
	["utc+8", "(UTC+8) Singapore"],
	["utc+9", "(UTC+9) Tokyo"],
	["utc+10", "(UTC+10) Sydney"],
	["utc+12", "(UTC+12) Auckland"],
].map(([value, label]) => ({ value, label }));

const ROLES = [
	{ value: "admin", label: "Admin" },
	{ value: "editor", label: "Editor" },
	{ value: "viewer", label: "Viewer" },
];

const SOME_DISABLED = [
	{ value: "a", label: "Available" },
	{ value: "b", label: "Unavailable", disabled: true },
	{ value: "c", label: "Also available" },
];

export const title = "Select";
export const group = "Components";

export function Demo() {
	const [fruit, setFruit] = createSignal<string | null>(null);
	const [bordered, setBordered] = createSignal<string | null>(null);
	const [borderless, setBorderless] = createSignal<string | null>(null);
	const [theme, setTheme] = createSignal<string | null>("system");
	const [compact, setCompact] = createSignal<string | null>("banana");
	const [setting, setSetting] = createSignal<string | null>(null);
	const [timezone, setTimezone] = createSignal<string | null>(null);
	const [role, setRole] = createSignal<string | null>(null);
	const [some, setSome] = createSignal<string | null>(null);

	const themeIcon = () => {
		const picked = THEMES.find((entry) => entry.value === theme());
		return picked === undefined ? undefined : picked.icon;
	};

	return (
		<>
			<DemoCard title="Select">
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<DemoRow label="Basic">
						<Select
							testId="basic"
							variant="bordered"
							items={FRUITS}
							value={fruit()}
							onValueChange={setFruit}
							placeholder="Select a fruit…"
						/>
					</DemoRow>
					<DemoRow label="Variants">
						<Select
							testId="bordered"
							variant="bordered"
							items={FRUITS}
							value={bordered()}
							onValueChange={setBordered}
							placeholder="Bordered"
						/>
						<Select
							testId="borderless"
							variant="borderless"
							items={FRUITS}
							value={borderless()}
							onValueChange={setBorderless}
							placeholder="Borderless"
						/>
					</DemoRow>
					<DemoRow label="With icons">
						<Select
							testId="icons"
							variant="bordered"
							items={THEMES}
							value={theme()}
							onValueChange={setTheme}
							icon={themeIcon()}
							placeholder="Theme"
						/>
					</DemoRow>
					<DemoRow label="Compact">
						<Select
							testId="compact"
							variant="bordered"
							size="compact"
							items={FRUITS}
							value={compact()}
							onValueChange={setCompact}
						/>
					</DemoRow>
				</div>
			</DemoCard>
			<DemoCard title="Select, groups and states">
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					<DemoRow label="Groups">
						<Select
							testId="groups"
							variant="bordered"
							items={GROUPS}
							value={setting()}
							onValueChange={setSetting}
							placeholder="Settings…"
						/>
					</DemoRow>
					<DemoRow label="Scrollable">
						<Select
							testId="timezone"
							variant="bordered"
							items={TIMEZONES}
							value={timezone()}
							onValueChange={setTimezone}
							icon="globe"
							placeholder="Select timezone…"
							popupWidth={220}
						/>
					</DemoRow>
					<DemoRow label="Error">
						<Select
							testId="error"
							variant="bordered"
							items={ROLES}
							value={role()}
							onValueChange={setRole}
							placeholder="Select a role…"
							error="Please select a role to continue."
						/>
					</DemoRow>
					<DemoRow label="Disabled">
						<Select
							testId="disabled"
							variant="bordered"
							items={ROLES}
							value={null}
							onValueChange={() => {}}
							placeholder="Disabled"
							disabled
						/>
						<Select
							testId="some-disabled"
							variant="bordered"
							items={SOME_DISABLED}
							value={some()}
							onValueChange={setSome}
							placeholder="Some disabled…"
						/>
					</DemoRow>
				</div>
			</DemoCard>
		</>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.click("basic");
	await shot.settle(300);
	shot.expectText("Banana", true);
	shot.capture("basic-open");

	await shot.hover("basic-option-banana");
	shot.capture("basic-hover");

	await shot.click("basic-option-banana");
	shot.expectText("Banana", true);
	await shot.settle(500);
	shot.expectText("Cherry", false);
	shot.capture("basic-picked");

	await shot.click("basic");
	await shot.settle(300);
	shot.capture("basic-reopened");
	await shot.press("c");
	await shot.settle(300);
	shot.capture("basic-typeahead");
	await shot.press("escape");
	shot.expectText("Cherry", false);

	await shot.click("icons");
	await shot.settle(300);
	shot.capture("icons-open");
	await shot.press("escape");

	await shot.click("groups");
	await shot.settle(300);
	shot.expectText("Preferences", true);
	shot.capture("groups-open");
	await shot.press("escape");

	await shot.click("timezone");
	await shot.settle(300);
	shot.capture("timezone-open");
	for (let step = 0; step < 14; step++) await shot.press("down");
	await shot.settle(400);
	shot.capture("timezone-scrolled");
	await shot.press("enter");
	await shot.settle(300);
	await shot.click("timezone");
	await shot.settle(400);
	shot.capture("timezone-reopened");
	await shot.press("escape");

	await shot.click("some-disabled");
	await shot.settle(300);
	shot.capture("some-disabled-open");
	await shot.press("escape");
	await shot.moveTo(1180, 700);
};
