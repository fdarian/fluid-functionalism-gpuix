/**
 * Select scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-select.tsx
 *
 * Most opens start from the keyboard; "Open with the pointer" presses for real.
 */
import { createSignal } from "solid-js";
import { Button } from "#/components/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "#/components/dialog";
import { Select } from "#/components/select";
import { createCheck } from "./check-kit";
import { readPng } from "./png-pixels";

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
				<Select
					testId="ease"
					variant="bordered"
					items={[
						{ value: "a", label: "Settings", icon: "settings" },
						{ value: "b", label: "Profile", icon: "user" },
					]}
					placeholder="Pick"
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
await k.press("Enter");
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
await k.press("ArrowDown");
k.expect(
	"empty: ArrowDown focuses the next row",
	fruitFocus("empty"),
	"empty-option-banana",
);
await k.press("ArrowUp ArrowUp");
k.expect(
	"empty: ArrowUp at the first row stays (no wrap)",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("End");
k.expect(
	"empty: End focuses the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("ArrowDown");
k.expect(
	"empty: ArrowDown at the last row stays (no wrap)",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("Home");
k.expect(
	"empty: Home focuses the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("Escape");
k.check("empty: Escape closes", !isOpen("empty"));
k.expect(
	"empty: Escape returns focus to the trigger",
	fruitFocus("empty"),
	"empty-trigger",
);

await k.press("ArrowUp");
k.expect(
	"empty: ArrowUp on the trigger opens on the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("Escape");
await k.press("ArrowDown");
k.expect(
	"empty: ArrowDown on the trigger opens on the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("Escape");
await k.press("Space");
k.expect(
	"empty: Space opens on the first row",
	fruitFocus("empty"),
	"empty-option-apple",
);
await k.press("ArrowDown ArrowDown Enter");
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
for (const key of ["Enter", "ArrowDown", "ArrowUp", "Space"]) {
	await k.press(key);
	k.expect(
		`valued: ${key} opens on the checked row`,
		fruitFocus("valued"),
		"valued-option-cherry",
	);
	await k.press("Escape");
}
await k.press("Enter");
await k.press("ArrowDown ArrowDown");
k.expect(
	"valued: the last row stops the arrows",
	fruitFocus("valued"),
	"valued-option-mango",
);
await k.press("ArrowUp ArrowUp ArrowUp ArrowUp");
k.expect(
	"valued: the first row stops the arrows",
	fruitFocus("valued"),
	"valued-option-apple",
);
await k.press("Enter");
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
await k.press("Enter");
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
await k.press("l i m e Space j");
k.expect(
	"keys: Space continues a session instead of picking",
	keysFocus(),
	"keys-option-lime",
);
k.check("keys: the popup is still open", isOpen("keys"));
await k.press("Escape");

// ─── Disabled rows, Tab and Shift+Tab ────────────────────────────────────────

const GAP_IDS = ["a", "b", "c"];
const gapsFocus = () =>
	focusedAmong([
		"gaps-trigger",
		...GAP_IDS.map((value) => `gaps-option-${value}`),
	]);
await k.focus("gaps-trigger");
await k.press("Enter");
await k.press("ArrowDown");
k.expect("gaps: arrows land on a disabled row", gapsFocus(), "gaps-option-b");
await k.press("Enter");
k.check("gaps: Enter on a disabled row does nothing", isOpen("gaps"));
await k.press("Escape");

await k.focus("gaps-trigger");
await k.press("Tab");
const afterTrigger = renderer.getFocusedElementId();
await k.focus("gaps-trigger");
await k.press("Enter");
await k.press("ArrowDown");
await k.press("Tab");
k.check("tab: Tab closes", !isOpen("gaps"));
k.check(
	"tab: Tab focuses what follows the trigger",
	afterTrigger !== null && renderer.getFocusedElementId() === afterTrigger,
	`${renderer.getFocusedElementId()} vs ${afterTrigger}`,
);
await k.focus("gaps-trigger");
await k.press("Enter");
await k.press("Shift+Tab");
k.check("tab: Shift+Tab closes", !isOpen("gaps"));
k.expect("tab: Shift+Tab focuses the trigger", gapsFocus(), "gaps-trigger");

// ─── Pointer movement (no press, so it runs in the test renderer) ────────────

await k.focus("empty-trigger");
await k.press("Enter");
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
await k.press("ArrowDown");
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
await k.press("ArrowUp");
k.expect(
	"pointer: ArrowUp on the panel focuses the last row",
	fruitFocus("empty"),
	"empty-option-mango",
);
await k.press("Escape");

// ─── Row ring: only a keyboard focus draws it ────────────────────────────────

await k.focus("valued-trigger");
await k.press("Enter");
k.check("ring: a keyboard open draws it", k.exists("valued-focus-ring"));
await k.press("Escape");
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
await k.press("Enter");
k.check("filter: opens", isOpen("filter"));
await k.press("Escape");

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
await k.press("Enter");
k.check("dialog: the select opens", isOpen("inside"));
k.expect(
	"dialog: its first row is focused",
	fruitFocus("inside"),
	"inside-option-apple",
);
await k.press("Escape");
await k.settle(300);
k.check("dialog: Escape closes the select", !isOpen("inside"));
k.check("dialog: Escape leaves the dialog open", k.exists("dialog"));
k.expect(
	"dialog: focus is back on the trigger",
	fruitFocus("inside"),
	"inside-trigger",
);
await k.press("Escape");
await k.settle(400);
k.check("dialog: the next Escape closes the dialog", !k.exists("dialog"));

// ─── Open with the pointer ───────────────────────────────────────────────────

const point = (testId: string) => k.center(testId);
await k.clickAt(point("invalid-trigger").x, point("invalid-trigger").y);
k.check("press: pressing the trigger opens the popup", isOpen("invalid"));
k.expect(
	"press: with no value the panel takes focus",
	fruitFocus("invalid"),
	"invalid-list",
);
await k.clickAt(790, 890);
await k.settle(300);
k.check("press: a press on bare background closes it", !isOpen("invalid"));
k.expect(
	"press: the trigger takes focus back",
	fruitFocus("invalid"),
	"invalid-trigger",
);
await k.clickAt(point("filter-trigger").x, point("filter-trigger").y);
k.expect(
	"press: with a value the checked row takes focus",
	fruitFocus("filter"),
	"filter-option-banana",
);
await k.clickAt(
	point("filter-option-mango").x,
	point("filter-option-mango").y,
);
await k.settle(600);
k.check("press: pressing a row picks it and closes", !isOpen("filter"));
k.expect(
	"press: focus is back on the trigger after a pick",
	fruitFocus("filter"),
	"filter-trigger",
);

// ─── Hovering the trigger eases its fill over 80 ms ──────────────────────────

{
	const probe = (testId: string) => {
		const box = k.bounds(testId);
		renderer.captureScreenshot(`/tmp/check-select-fade-${process.pid}.png`);
		return readPng(`/tmp/check-select-fade-${process.pid}.png`).at(
			Math.round(box.x + 5),
			Math.round(box.y + 5),
		)[0];
	};
	const hoverPoint = k.center("ease-trigger");
	renderer.nativeSimulateMouseMove(1, 1);
	await k.settle(300);
	renderer.clockPause();
	const rest = probe("ease-trigger");
	renderer.nativeSimulateMouseMove(hoverPoint.x - 1, hoverPoint.y);
	renderer.nativeSimulateMouseMove(hoverPoint.x, hoverPoint.y);
	for (const ms of [0, 16]) {
		renderer.clockFastForward(ms);
		renderer.flush();
		renderer.dispatchNativeEvents();
	}
	const early = probe("ease-trigger");
	renderer.clockFastForward(300);
	renderer.flush();
	renderer.dispatchNativeEvents();
	const lit = probe("ease-trigger");
	renderer.clockResume();
	k.check(
		"fade: the trigger's hover fill is partway 16 ms in",
		early > rest + 1 && early < lit - 1,
		`rest ${rest}, early ${early}, lit ${lit}`,
	);
	renderer.nativeSimulateMouseMove(1, 1);
	await k.settle(300);
}

// ─── Lighting a row eases its icon stroke and colour over 80 ms ──────────────

await k.focus("ease-trigger");
await k.press("Enter");
await k.settle(300);
{
	const row = k.bounds("ease-option-b");
	const iconBox = {
		x: row.x + 8,
		y: row.y + 4,
		width: 16,
		height: row.height - 8,
	};
	const rest = k.ink(iconBox);
	const point = k.center("ease-option-b");
	renderer.clockPause();
	renderer.nativeSimulateMouseMove(point.x - 1, point.y);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	for (const ms of [0, 16]) {
		renderer.clockFastForward(ms);
		renderer.flush();
		renderer.dispatchNativeEvents();
	}
	const early = k.ink(iconBox);
	renderer.clockResume();
	await k.settle(400);
	const lit = k.ink(iconBox);
	k.check(
		"ease: the row icon's stroke and colour are partway 16 ms after the row lights",
		early > rest + 0.1 * (lit - rest) && early < lit - 0.1 * (lit - rest),
		`rest ${rest}, early ${early}, lit ${lit}`,
	);
}

await k.press("Escape");
await k.settle(300);
k.finish();
