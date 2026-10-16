import type { HostElement } from "@gpuix/solid";
import { createSignal } from "solid-js";
import { Button } from "#/components/button";
import { Combobox, type ComboboxItem } from "#/components/combobox";
import type { DemoModule, ShotContext } from "#/lib/demo";
import { DemoCard, DemoRow } from "#/lib/demo-kit";
import {
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySwitch,
} from "#/lib/playground";
import { color, type as scale } from "#/lib/theme";

const FRAMEWORKS = [
	"Astro",
	"Angular",
	"Next.js",
	"Nuxt",
	"Qwik",
	"Remix",
	"Solid",
	"SolidStart",
	"Svelte",
	"SvelteKit",
	"TanStack Start",
	"Vue",
];

const VIEWS: readonly ComboboxItem[] = [
	{ value: "inbox", label: "Inbox", icon: "mail" },
	{ value: "starred", label: "Starred", icon: "star" },
	{ value: "recent", label: "Recent", icon: "clock" },
	{ value: "cafe", label: "Café" },
	{ value: "private", label: "Private", disabled: true },
];

const TIMEZONES = [
	"(UTC−12) Baker Island",
	"(UTC−10) Honolulu",
	"(UTC−9) Anchorage",
	"(UTC−8) Los Angeles",
	"(UTC−7) Denver",
	"(UTC−6) Mexico City",
	"(UTC−5) New York",
	"(UTC−4) Santiago",
	"(UTC−3) São Paulo",
	"(UTC−2) South Georgia",
	"(UTC−1) Azores",
	"(UTC+0) London",
	"(UTC+1) Paris",
	"(UTC+2) Cairo",
	"(UTC+3) Moscow",
	"(UTC+4) Dubai",
	"(UTC+5) Karachi",
	"(UTC+5:30) Mumbai",
	"(UTC+6) Dhaka",
	"(UTC+7) Bangkok",
	"(UTC+8) Singapore",
	"(UTC+9) Tokyo",
	"(UTC+10) Sydney",
	"(UTC+11) Nouméa",
	"(UTC+12) Auckland",
];

const PLAY_COMPONENTS = [
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
].map((label) => ({ value: label.toLowerCase(), label }));

export const title = "Combobox";
export const group = "Components";
export const listed = "sidebar";

function Playground() {
	const [icon, setIcon] = createSignal(false);
	const [clearable, setClearable] = createSignal(false);
	const [disabled, setDisabled] = createSignal(false);
	const [value, setValue] = createSignal<string | null>(null);

	const shuffle = () => {
		setIcon(Math.random() > 0.5);
		setClearable(Math.random() > 0.6);
		setDisabled(Math.random() > 0.9);
		setValue(null);
	};

	return (
		<PlaygroundLayout
			preview={
				<div style={{ paddingTop: 24 }}>
					<Combobox
						testId="play"
						items={PLAY_COMPONENTS}
						value={value()}
						onValueChange={setValue}
						icon={icon() ? "search" : undefined}
						clearable={clearable()}
						disabled={disabled()}
						placeholder="Pick a component…"
						emptyText="No component found."
					/>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Field" />
					<PlaySwitch
						testId="play-icon"
						label="Leading icon"
						checked={icon()}
						onToggle={() => setIcon(!icon())}
					/>
					<PlaySwitch
						testId="play-clearable"
						label="Clear button"
						checked={clearable()}
						onToggle={() => setClearable(!clearable())}
					/>
					<PlaySwitch
						testId="play-disabled"
						label="Disabled"
						checked={disabled()}
						onToggle={() => setDisabled(!disabled())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

export function Demo() {
	const [framework, setFramework] = createSignal<string | null>("Solid");
	const [view, setView] = createSignal<string | null>(null);
	const [stack, setStack] = createSignal<string | null>(null);
	const [submitted, setSubmitted] = createSignal("");
	const [timezone, setTimezone] = createSignal<string | null>(null);
	let form: HostElement | undefined;
	return (
		<>
		<Playground />
		<DemoCard title="Combobox">
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					paddingTop: 12,
					paddingBottom: 12,
				}}
			>
				<Combobox
					testId="framework"
					items={FRAMEWORKS}
					value={framework()}
					onValueChange={setFramework}
					icon="search"
					placeholder="Select framework…"
					emptyText="No framework found."
				/>
			</div>
		</DemoCard>
		<DemoCard title="Combobox, items and states">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<DemoRow label="Views">
					<Combobox
						testId="views"
						items={VIEWS}
						value={view()}
						onValueChange={setView}
						placeholder="Jump to view…"
						clearable
					/>
					<text style={{ ...scale.caption, color: color.mutedForeground }}>
						{`Value: ${view() ?? "none"}`}
					</text>
					<Button
						testId="views-reset"
						variant="tertiary"
						size="compact"
						onClick={() => setView("starred")}
					>
						Set from outside
					</Button>
				</DemoRow>
				<DemoRow label="Prefix filter">
					<Combobox
						testId="tall"
						items={FRAMEWORKS}
						defaultValue="Vue"
						filter={(row, query) =>
							row.label.toLowerCase().startsWith(query.toLowerCase())
						}
					/>
				</DemoRow>
				<DemoRow label="Disabled">
					<Combobox testId="off" items={FRAMEWORKS} disabled placeholder="Disabled" />
				</DemoRow>
			</div>
		</DemoCard>
		<DemoCard title="Combobox, long list">
			<div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 12 }}>
				<Combobox
					testId="tz"
					items={TIMEZONES}
					value={timezone()}
					onValueChange={setTimezone}
					icon="globe"
					placeholder="Search timezones…"
					emptyText="No timezone matches."
				/>
			</div>
		</DemoCard>
		<DemoCard title="Combobox, in a form">
			<form
				ref={form}
				testId="form"
				onSubmit={(event) =>
					setSubmitted(
						Array.from(event.formData.entries(), (entry) => `${entry[0]}=${entry[1]}`).join("&"),
					)
				}
				style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}
			>
				<text id="form-stack-label" style={{ ...scale.caption, color: color.mutedForeground }}>
					Stack
				</text>
				<Combobox
					testId="form-stack"
					items={FRAMEWORKS}
					value={stack()}
					onValueChange={setStack}
					name="stack"
					required
					labelledBy="form-stack-label"
					placeholder="Pick one…"
				/>
				<Button
					testId="form-submit"
					variant="secondary"
					size="compact"
					onClick={() => form?.requestSubmit()}
				>
					Submit
				</Button>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{`submitted: ${submitted()}`}
				</text>
			</form>
		</DemoCard>
		</>
	);
}

/** The page is taller than the window: scroll an element to the upper part of it. */
async function reveal(shot: ShotContext, testId: string) {
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 8; attempt++) {
		const y = shot.centerOf(testId).y;
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, y - 200);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The sidebar names RadioGroup too, so the list is read by its option's node, not by the page's text.
	const expectOption = (present: boolean) => {
		if (shot.hasAriaNode("play-option-radiogroup") !== present) {
			throw new Error(
				`expected the RadioGroup option to be ${present ? "listed" : "absent"}`,
			);
		}
	};
	// The playground's switches drive the field above the demos.
	shot.capture("playground");
	await shot.click("play-icon-track");
	await shot.click("play-clearable-track");
	await shot.focus("play-input");
	await shot.press("ArrowDown");
	expectOption(true);
	await shot.press("b u");
	expectOption(false);
	await shot.press("ArrowDown Enter");
	await shot.settle(400);
	expectOption(false);
	shot.capture("playground-icon-clearable");
	await shot.click("play-disabled-track");
	shot.capture("playground-disabled");
	await shot.click("play-disabled-track");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	// 25 timezones: the list scrolls and the typed query narrows it.
	await shot.scroll(700, 400, 0, 900);
	await reveal(shot, "tz-input");
	await shot.focus("tz-input");
	await shot.press("ArrowDown");
	shot.expectText("(UTC−12) Baker Island", true);
	shot.capture("long-list-open");
	await shot.press("t o k");
	shot.expectText("(UTC+9) Tokyo", true);
	shot.expectText("(UTC−12) Baker Island", false);
	await shot.press("z z");
	shot.expectText("No timezone matches.", true);
	await shot.press("Escape");

	// Form and ARIA, opened by key: an empty required combobox blocks the submit and takes the focus; the input names its list and the lit row.
	await reveal(shot, "form-submit");
	await shot.click("form-submit");
	shot.expectText("submitted: stack=", false);
	shot.expectAria("form-stack-input", {
		role: "ComboBox",
		has_popup: "Listbox",
		auto_complete: "List",
		required: true,
		expanded: false,
		labelled_by: ["form-stack-label"],
		controls: undefined,
	});
	await shot.press("ArrowDown");
	shot.expectAria("form-stack-input", { expanded: true });
	const listbox = shot.aria("form-stack-input").controls;
	if (!Array.isArray(listbox) || listbox.length !== 1)
		throw new Error("an open combobox controls its list");
	shot.expectAria(String(listbox[0]), { role: "ListBox" });
	shot.expectAria("form-stack-input", {
		active_descendant: shot.idOf("form-stack-option-Astro"),
	});
	await shot.press("Enter");
	await shot.settle(300);
	await shot.click("form-submit");
	shot.expectText("submitted: stack=Astro", true);
	await shot.scroll(700, 400, 0, -2000);

	// Opens on mouse-down; the release leaves it open.
	await shot.down("framework-input");
	shot.expectText("Angular", true);
	await shot.up("framework-input");
	shot.expectText("Angular", true);
	shot.capture("open");

	await shot.press("Backspace Backspace Backspace Backspace Backspace");
	await shot.press("s o l");
	shot.expectText("Angular", false);
	shot.capture("filtered");

	await shot.press("z z");
	shot.expectText("No framework found.", true);
	shot.capture("empty");

	await shot.clickAt(700, 760);
	shot.expectText("No framework found.", false);

	// Focus alone does not open it; ArrowUp does.
	await shot.click("framework-input");
	await shot.press("Escape");
	shot.expectText("Angular", false);
	await shot.press("Tab Shift+Tab");
	shot.expectText("Angular", false);
	await shot.press("ArrowUp");
	shot.expectText("Angular", true);
	await shot.press("Escape");

	// Arrows loop and reach the disabled row; Enter refuses it and the popup stays.
	await shot.click("views-input");
	shot.expectText("Inbox", true);
	await shot.press("ArrowUp");
	await shot.press("Enter");
	shot.expectText("Private", true);
	shot.capture("views-disabled-highlight");
	await shot.press("ArrowDown Enter");
	await shot.settle(400);
	shot.expectText("Private", false);
	shot.expectText("Value: inbox", true);

	// Closed, Escape empties the field and the pick.
	await shot.press("Escape");
	shot.expectText("Value: none", true);

	// Leaving the list puts the highlight back on the first row, so Enter picks it.
	await shot.press("ArrowDown");
	await shot.hover("views-option-starred");
	await shot.moveTo(1180, 700);
	await shot.press("Enter");
	await shot.settle(400);
	shot.expectText("Value: inbox", true);

	// Emptying the text drops the pick; the match ignores accents.
	await shot.press("Backspace Backspace Backspace Backspace Backspace");
	shot.expectText("Value: none", true);
	await shot.press("c a f e");
	shot.expectText("Café", true);
	shot.expectText("Recent", false);
	shot.capture("views-accent");
	await shot.press("Enter");
	await shot.settle(400);
	shot.expectText("Value: cafe", true);

	// A value set from outside reaches the field; the ✕ clears it.
	await shot.click("views-reset");
	shot.expectText("Value: starred", true);
	shot.capture("views-external");
	await shot.click("views-clear");
	shot.expectText("Value: none", true);
	shot.capture("views-cleared");

	// A custom `filter`, and the picked row scrolled into view on open.
	await reveal(shot, "tall-input");
	await shot.click("tall-input");
	shot.capture("tall-open");
	await shot.press("Backspace Backspace Backspace s");
	// Not "Astro": the form's "submitted: stack=Astro" line holds it on the page.
	shot.expectText("Qwik", false);
	shot.expectText("Solid", true);
	shot.capture("tall-prefix");
	await shot.press("Escape");

	await shot.click("off-input");
	shot.expectText("Angular", false);
	await shot.moveTo(1180, 700);
};
