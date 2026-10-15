import type { HostElement } from "@gpuix/solid";
import { createSignal } from "solid-js";
import { Button } from "../components/button";
import { Combobox, type ComboboxItem } from "../components/combobox";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

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

export const title = "Combobox";
export const group = "Components";

export function Demo() {
	const [framework, setFramework] = createSignal<string | null>("Solid");
	const [view, setView] = createSignal<string | null>(null);
	const [stack, setStack] = createSignal<string | null>(null);
	const [submitted, setSubmitted] = createSignal("");
	let form: HostElement | undefined;
	return (
		<>
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
		await shot.scroll(700, 400, 0, -(y - 200));
	}
	throw new Error(`could not scroll ${testId} into view`);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
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
	await shot.press("down");
	shot.expectAria("form-stack-input", { expanded: true });
	const listbox = shot.aria("form-stack-input").controls;
	if (!Array.isArray(listbox) || listbox.length !== 1)
		throw new Error("an open combobox controls its list");
	shot.expectAria(String(listbox[0]), { role: "ListBox" });
	shot.expectAria("form-stack-input", {
		active_descendant: shot.idOf("form-stack-option-Astro"),
	});
	await shot.press("enter");
	await shot.settle(300);
	await shot.click("form-submit");
	shot.expectText("submitted: stack=Astro", true);
	await shot.scroll(700, 400, 0, 2000);

	// Opens on mouse-down; the release leaves it open.
	await shot.down("framework-input");
	shot.expectText("Angular", true);
	await shot.up("framework-input");
	shot.expectText("Angular", true);
	shot.capture("open");

	await shot.press("backspace backspace backspace backspace backspace");
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
	await shot.press("escape");
	shot.expectText("Angular", false);
	await shot.press("tab shift-tab");
	shot.expectText("Angular", false);
	await shot.press("up");
	shot.expectText("Angular", true);
	await shot.press("escape");

	// Arrows loop and reach the disabled row; Enter refuses it and the popup stays.
	await shot.click("views-input");
	shot.expectText("Inbox", true);
	await shot.press("up");
	await shot.press("enter");
	shot.expectText("Private", true);
	shot.capture("views-disabled-highlight");
	await shot.press("down enter");
	await shot.settle(400);
	shot.expectText("Private", false);
	shot.expectText("Value: inbox", true);

	// Closed, Escape empties the field and the pick.
	await shot.press("escape");
	shot.expectText("Value: none", true);

	// Leaving the list puts the highlight back on the first row, so Enter picks it.
	await shot.press("down");
	await shot.hover("views-option-starred");
	await shot.moveTo(1180, 700);
	await shot.press("enter");
	await shot.settle(400);
	shot.expectText("Value: inbox", true);

	// Emptying the text drops the pick; the match ignores accents.
	await shot.press("backspace backspace backspace backspace backspace");
	shot.expectText("Value: none", true);
	await shot.press("c a f e");
	shot.expectText("Café", true);
	shot.expectText("Recent", false);
	shot.capture("views-accent");
	await shot.press("enter");
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
	await shot.click("tall-input");
	shot.capture("tall-open");
	await shot.press("backspace backspace backspace s");
	shot.expectText("Astro", false);
	shot.expectText("Solid", true);
	shot.capture("tall-prefix");
	await shot.press("escape");

	await shot.click("off-input");
	shot.expectText("Angular", false);
	await shot.moveTo(1180, 700);
};
