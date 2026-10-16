/**
 * Select scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-select.tsx
 *
 * A pointer press that opens a popup throws in the test renderer, so every open
 * here starts from the keyboard; the pointer paths are for a live check.
 */
import { createSignal } from "solid-js";
import { Button } from "../src/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "../src/components/dialog";
import { Select } from "../src/components/select";
import { createCheck } from "./check-kit";

const FRUITS = [
	{ value: "apple", label: "Apple" },
	{ value: "banana", label: "Banana" },
	{ value: "cherry", label: "Cherry" },
	{ value: "mango", label: "Mango" },
];

const KEYS = [
	{ value: "kiwi", label: "Kiwi" },
	{ value: "lemon", label: "Lemon" },
	{ value: "lime", label: "Lime juice" },
	{ value: "melon", label: "Melon" },
];

const SOME_DISABLED = [
	{ value: "a", label: "Available" },
	{ value: "b", label: "Unavailable", disabled: true },
	{ value: "c", label: "Also available" },
];

const k = await createCheck(
	() => {
		const [picked, setPicked] = createSignal("");
		return (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
					padding: 20,
					width: 360,
				}}
			>
				<Select
					testId="empty"
					variant="bordered"
					items={FRUITS}
					placeholder="Fruit"
					onValueChange={(value) => setPicked(value)}
				/>
				<Select
					testId="valued"
					variant="bordered"
					items={FRUITS}
					defaultValue="cherry"
				/>
				<Select
					testId="keys"
					variant="bordered"
					items={KEYS}
					placeholder="Keys"
				/>
				<Select
					testId="gaps"
					variant="bordered"
					items={SOME_DISABLED}
					placeholder="Gaps"
				/>
				<div style={{ display: "flex", flexDirection: "row" }}>
				<Select
					testId="filter"
					variant="borderless"
					size="compact"
					hug
					label="Type"
					items={FRUITS}
					defaultValue="banana"
					popupWidth={150}
				/>
				</div>
				<Select
					testId="invalid"
					variant="borderless"
					items={FRUITS}
					placeholder="Invalid"
					error="Pick one."
				/>
				<Button testId="after">After</Button>
				<text>{`picked: ${picked()}`}</text>
				<Dialog>
					<DialogTrigger>
						<Button testId="dialog-open">Open dialog</Button>
					</DialogTrigger>
					<DialogContent size="sm" testId="dialog">
						<DialogTitle>Invite</DialogTitle>
						<Select
							testId="inside"
							variant="bordered"
							items={FRUITS}
							placeholder="Fruit"
						/>
					</DialogContent>
				</Dialog>
			</div>
		);
	},
	{ width: 800, height: 900, initialSettleMs: 600 },
);
const renderer = k.renderer;

/** The test id of the focused element, among `candidates`; `null` when focus is elsewhere or nowhere. */
function focusedAmong(candidates: readonly string[]) {
	const focused = renderer.getFocusedElementId();
	if (focused === null) return null;
	return (
		candidates.find((testId) => {
			const element = renderer.findByTestId(testId);
			return element !== undefined && element.id === focused;
		}) ?? null
	);
}

const FRUIT_VALUES = ["apple", "banana", "cherry", "mango"];
/** Where focus is within the select `id` and its fruit rows. */
function fruitFocus(id: string) {
	return focusedAmong([
		`${id}-trigger`,
		`${id}-list`,
		...FRUIT_VALUES.map((value) => `${id}-option-${value}`),
	]);
}
const isOpen = (id: string) => k.exists(`${id}-list`);
const shown = (text: string) =>
	renderer.getAllText().some((line) => line === text);

// ─── Open from the keyboard ──────────────────────────────────────────────────

await k.focus("empty-trigger");
await k.press("enter");
k.expect(
	"empty: Enter opens and focuses the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
k.check(
	"empty: the focused row is the tab stop",
	renderer.matchesFocus(k.element("empty-option-apple").id, ":focus"),
);
k.check(
	"empty: the trigger names no active descendant",
	k.aria("empty-trigger")?.active_descendant === undefined,
);
await k.press("down");
k.expect(
	"empty: ArrowDown focuses the next row",
	fruitFocus("empty"),
	"empty-option-banana",
);
await k.press("up up");
k.expect(
	"empty: ArrowUp at the first row stays (no wrap)",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("end");
k.expect(
	"empty: End focuses the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("down");
k.expect(
	"empty: ArrowDown at the last row stays (no wrap)",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("home");
k.expect(
	"empty: Home focuses the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("escape");
k.check("empty: Escape closes", !isOpen("empty"));
k.expect(
	"empty: Escape returns focus to the trigger",
	fruitFocus("empty"),
	"empty-trigger",
);

await k.press("up");
k.expect(
	"empty: ArrowUp on the trigger opens on the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("escape");
await k.press("down");
k.expect(
	"empty: ArrowDown on the trigger opens on the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("escape");
await k.press("space");
k.expect(
	"empty: Space opens on the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("down down enter");
await k.settle(500);
k.check("empty: Enter on a row closes", !isOpen("empty"));
k.expect(
	"empty: a pick returns focus to the trigger",
	fruitFocus("empty"),
	"empty-trigger",
);
k.check(
	"empty: a pick commits the value",
	shown("picked: cherry") && shown("Cherry"),
);

// With a value the checked row takes focus, whichever key opens.
await k.focus("valued-trigger");
for (const key of ["enter", "down", "up", "space"]) {
	await k.press(key);
	k.expect(
		`valued: ${key} opens on the checked row`,
		fruitFocus("valued"),
		"valued-option-cherry",
	);
	await k.press("escape");
}
await k.press("enter");
await k.press("down down");
k.expect(
	"valued: the last row stops the arrows",
	fruitFocus("valued"),
	"valued-option-mango",
);
await k.press("up up up up");
k.expect(
	"valued: the first row stops the arrows",
	fruitFocus("valued"),
	"valued-option-apple",
);
await k.press("enter");
await k.settle(500);
k.expect(
	"valued: Enter picks the focused row",
	fruitFocus("valued"),
	"valued-trigger",
);
k.check("valued: the trigger shows the pick", shown("Apple"));

// ─── Typeahead ───────────────────────────────────────────────────────────────

const KEY_IDS = ["kiwi", "lemon", "lime", "melon"];
const keysFocus = () =>
	focusedAmong([
		"keys-trigger",
		...KEY_IDS.map((value) => `keys-option-${value}`),
	]);
await k.focus("keys-trigger");
await k.press("m");
k.check("keys: typeahead on the closed trigger does not open", !isOpen("keys"));
k.check(
	"keys: typeahead on the closed trigger commits the match",
	shown("Melon"),
);
await k.settle(800);
await k.press("enter");
k.expect(
	"keys: the picked row has focus on open",
	keysFocus(),
	"keys-option-melon",
);
await k.press("l");
k.expect(
	"keys: typeahead while open focuses the next match",
	keysFocus(),
	"keys-option-lemon",
);
await k.press("l");
k.expect("keys: the same letter cycles", keysFocus(), "keys-option-lime");
await k.settle(800);
await k.press("k");
k.expect(
	"keys: a new session matches from its first letter",
	keysFocus(),
	"keys-option-kiwi",
);
await k.settle(800);
await k.press("l i m e space j");
k.expect(
	"keys: Space continues a session instead of picking",
	keysFocus(),
	"keys-option-lime",
);
k.check("keys: the popup is still open", isOpen("keys"));
await k.press("escape");

// ─── Disabled rows, Tab and Shift+Tab ────────────────────────────────────────

const GAP_IDS = ["a", "b", "c"];
const gapsFocus = () =>
	focusedAmong([
		"gaps-trigger",
		...GAP_IDS.map((value) => `gaps-option-${value}`),
	]);
await k.focus("gaps-trigger");
await k.press("enter");
await k.press("down");
k.expect("gaps: arrows land on a disabled row", gapsFocus(), "gaps-option-b");
await k.press("enter");
k.check("gaps: Enter on a disabled row does nothing", isOpen("gaps"));
await k.press("escape");

await k.focus("gaps-trigger");
await k.press("tab");
const afterTrigger = renderer.getFocusedElementId();
await k.focus("gaps-trigger");
await k.press("enter");
await k.press("down");
await k.press("tab");
k.check("tab: Tab closes", !isOpen("gaps"));
k.check(
	"tab: Tab focuses what follows the trigger",
	afterTrigger !== null && renderer.getFocusedElementId() === afterTrigger,
	`${renderer.getFocusedElementId()} vs ${afterTrigger}`,
);
await k.focus("gaps-trigger");
await k.press("enter");
await k.press("shift-tab");
k.check("tab: Shift+Tab closes", !isOpen("gaps"));
k.expect("tab: Shift+Tab focuses the trigger", gapsFocus(), "gaps-trigger");

// ─── Pointer movement (no press, so it runs in the test renderer) ────────────

await k.focus("empty-trigger");
await k.press("enter");
const third = k.bounds("empty-option-cherry");
renderer.nativeSimulateMouseMove(third.x + 40, third.y + third.height / 2);
await k.settle(300);
k.expect(
	"pointer: hovering a row focuses it",
	fruitFocus("empty"),
	"empty-option-cherry",
);
renderer.nativeSimulateMouseMove(700, 20);
await k.settle(300);
k.expect(
	"pointer: leaving the rows focuses the popup panel",
	fruitFocus("empty"),
	"empty-list",
);
await k.press("down");
k.expect(
	"pointer: ArrowDown on the panel focuses the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
const second = k.bounds("empty-option-banana");
renderer.nativeSimulateMouseMove(second.x + 40, second.y + second.height / 2);
await k.settle(300);
renderer.nativeSimulateMouseMove(700, 20);
await k.settle(300);
await k.press("up");
k.expect(
	"pointer: ArrowUp on the panel focuses the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("escape");

// ─── Row ring: only a keyboard focus draws it ────────────────────────────────

await k.focus("valued-trigger");
await k.press("enter");
k.check("ring: a keyboard open draws it", k.exists("valued-focus-ring"));
await k.press("escape");
await k.settle(300);
k.check("ring: it is gone after the close", !k.exists("valued-focus-ring"));

// ─── Borderless filter: hugs its content, named by its label ─────────────────

k.expect(
	"filter: the trigger carries its label",
	k.aria("Type")?.label,
	"Type",
);
const filterWidth = k.bounds("filter-trigger").width;
const emptyWidth = k.bounds("empty-trigger").width;
k.check(
	"filter: a hugging trigger is narrower than the field minimum",
	filterWidth < 128 && filterWidth < emptyWidth,
	`${filterWidth} vs ${emptyWidth}`,
);
await k.focus("filter-trigger");
await k.press("enter");
k.check("filter: opens", isOpen("filter"));
await k.press("escape");

const invalid = renderer.findByTestId("invalid-trigger");
k.check(
	"invalid: a borderless trigger with an error draws the destructive border",
	invalid !== undefined &&
		String(invalid.style.borderColor) !==
			String(k.element("filter-trigger").style.borderColor),
);

// ─── Inside a dialog ─────────────────────────────────────────────────────────

await k.click("dialog-open");
await k.settle(400);
k.check("dialog: opens", k.exists("dialog"));
await k.focus("inside-trigger");
await k.press("enter");
k.check("dialog: the select opens", isOpen("inside"));
k.expect(
	"dialog: its first row is focused",
	fruitFocus("inside"),
	"inside-option-apple",
);
await k.press("escape");
await k.settle(300);
k.check("dialog: Escape closes the select", !isOpen("inside"));
k.check("dialog: Escape leaves the dialog open", k.exists("dialog"));
k.expect(
	"dialog: focus is back on the trigger",
	fruitFocus("inside"),
	"inside-trigger",
);
await k.press("escape");
await k.settle(400);
k.check("dialog: the next Escape closes the dialog", !k.exists("dialog"));

k.finish();
