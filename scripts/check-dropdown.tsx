/**
 * Dropdown scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-dropdown.tsx
 *
 * A pointer press that opens a popup throws in the test renderer, so every open
 * here starts from the keyboard; the pointer paths are for a live check.
 */
import { mkdirSync } from "node:fs";
import {
	DropdownContent,
	DropdownMenu,
	DropdownTrigger,
	MenuItem,
} from "../src/components/dropdown";
import { Button } from "../src/components/button";
import { createTestRoot } from "@gpuix/solid/testing";
import { fonts } from "../src/lib/fonts";
import { createCheck } from "./check-kit";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const k = await createCheck("dropdown");
const renderer = k.renderer;

async function scrollIntoView(testId: string) {
	for (let attempts = 0; attempts < 30; attempts++) {
		const element = renderer.findByTestId(testId);
		const bounds =
			element === undefined ? null : renderer.getElementBounds(element.id);
		const center = bounds === null ? null : bounds.y + bounds.height / 2;
		if (center !== null && center > 120 && center < 600) return;
		renderer.nativeSimulateScrollWheel(
			700,
			400,
			0,
			center === null ? -400 : -(center - 200),
		);
		await k.settle(150);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

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

// ─── Inline panel ────────────────────────────────────────────────────────────

// A pointer click must not draw the keyboard ring.
await scrollIntoView("basic-0");
// The same steps as the `inline-checked` capture of scripts/screenshots.tsx, which
// cannot run past its submenu step in some environments.
const hovered = k.bounds("basic-2");
renderer.nativeSimulateMouseMove(
	hovered.x + 20,
	hovered.y + hovered.height / 2,
);
await k.settle(300);
await k.click("basic-3");
renderer.nativeSimulateMouseMove(700, 80);
await k.settle(300);
mkdirSync("/tmp/check-dropdown", { recursive: true });
renderer.captureScreenshot("/tmp/check-dropdown/inline-checked.png");
k.check("inline: no ring after clicking a row", !k.exists("basic-ring"));
await k.click("basic-1");
k.check("inline: no ring after a mouse click", !k.exists("basic-ring"));
const next = k.bounds("basic-2");
renderer.nativeSimulateMouseMove(next.x + 20, next.y + next.height / 2);
await k.settle(200);
k.check("inline: no ring after a pointer move", !k.exists("basic-ring"));
await k.press("down");
k.check("inline: ring after an arrow key", k.exists("basic-ring"));

// Keyboard entry: Tab into the group draws the ring.
await scrollIntoView("groups-0");
for (let presses = 0; presses < 40 && !k.exists("groups-ring"); presses++) {
	await k.press("tab");
}
k.check("inline: ring after Tab entry", k.exists("groups-ring"));

// ─── Popup menu: keyboard open, focus on the rows ────────────────────────────

const MENU_ROWS = [0, 1, 2, 3, 4].map((index) => `menu-${index}`);
const menuFocus = () => focusedAmong(["menu-trigger", ...MENU_ROWS, "menu-popup"]);
const menuOpen = () => k.exists("menu-0");

await scrollIntoView("menu-trigger");
await k.focus("menu-trigger");
await k.press("enter");
k.expect("menu: Enter opens and focuses the first row", menuFocus(), "menu-0");
k.check(
	"menu: the focused row is the only tab stop",
	renderer.matchesFocus(k.element("menu-0").id, ":focus"),
);
await k.press("down");
k.expect("menu: ArrowDown focuses the next row", menuFocus(), "menu-1");
await k.press("up up");
k.expect("menu: ArrowUp from the first row loops to the last", menuFocus(), "menu-4");
await k.press("down");
k.expect("menu: ArrowDown from the last row loops to the first", menuFocus(), "menu-0");
await k.press("end");
k.expect("menu: End focuses the last row", menuFocus(), "menu-4");
await k.press("home");
k.expect("menu: Home focuses the first row", menuFocus(), "menu-0");
await k.press("escape");
k.check("menu: Escape closes", !menuOpen());
k.expect("menu: Escape returns focus to the trigger", menuFocus(), "menu-trigger");

await k.press("up");
k.expect("menu: ArrowUp on the trigger opens on the last row", menuFocus(), "menu-4");
await k.press("escape");

await k.press("space");
k.expect("menu: Space opens and focuses the first row", menuFocus(), "menu-0");
await k.press("down down enter");
k.check("menu: Enter on a row closes the menu", !menuOpen());
k.expect("menu: a pick returns focus to the trigger", menuFocus(), "menu-trigger");

await k.press("space");
await k.press("down space");
k.check("menu: Space on a row closes and the key's release does not reopen", !menuOpen());
k.expect("menu: Space on a row returns focus to the trigger", menuFocus(), "menu-trigger");

await k.focus("menu-trigger");
await k.press("tab");
const afterTrigger = renderer.getFocusedElementId();
await k.focus("menu-trigger");
await k.press("enter");
await k.press("down");
await k.press("tab");
k.check("menu: Tab closes", !menuOpen());
k.check(
	"menu: Tab focuses what follows the trigger",
	afterTrigger !== null && renderer.getFocusedElementId() === afterTrigger,
	`${renderer.getFocusedElementId()} vs ${afterTrigger}`,
);

await k.focus("menu-trigger");
await k.press("down");
await k.press("shift-tab");
k.check("menu: Shift+Tab closes", !menuOpen());
k.expect("menu: Shift+Tab focuses the trigger", menuFocus(), "menu-trigger");

// Pointer movement over rows (no press, so it runs in the test renderer).
await k.press("down");
const third = k.bounds("menu-2");
renderer.nativeSimulateMouseMove(third.x + 40, third.y + third.height / 2);
await k.settle(300);
k.expect("menu: hovering a row focuses it", menuFocus(), "menu-2");
renderer.nativeSimulateMouseMove(1200, 40);
await k.settle(300);
k.expect("menu: leaving the rows focuses the popup panel", menuFocus(), "menu-popup");
await k.press("down");
k.expect("menu: ArrowDown on the panel focuses the first row", menuFocus(), "menu-0");
await k.press("escape");

// ─── Typeahead and disabled rows ─────────────────────────────────────────────

const KEY_ROW_IDS = [0, 1, 2, 3, 4].map((index) => `keys-${index}`);
const keysFocus = () => focusedAmong(["keys-trigger", ...KEY_ROW_IDS]);
await scrollIntoView("keys-trigger");
await k.focus("keys-trigger");
await k.press("enter");
k.expect("keys: opens on the first row", keysFocus(), "keys-0");
await k.press("down");
k.expect("keys: arrows land on a disabled row", keysFocus(), "keys-1");
await k.press("enter");
k.check("keys: Enter on a disabled row does nothing", k.exists("keys-0"));
await k.press("c");
k.expect("keys: typeahead focuses the next match", keysFocus(), "keys-3");
await k.press("c");
k.expect("keys: the same letter again cycles", keysFocus(), "keys-4");
await k.settle(800);
await k.press("c h a r t");
k.expect("keys: a longer query narrows the match", keysFocus(), "keys-4");
const pickedText = () =>
	renderer.getAllText().find((line) => line.startsWith("picked:")) ?? "";
const changesBefore = Number(pickedText().split("changes: ")[1]);
await k.press("up up up up enter");
k.expect(
	"keys: Enter picks the focused row and closes",
	pickedText(),
	`picked: Alpha changes: ${changesBefore + 1}`,
);
k.expect("keys: a pick returns focus to the trigger", keysFocus(), "keys-trigger");

// ─── Submenus ────────────────────────────────────────────────────────────────

const SUB_IDS = [
	"sub-trigger",
	"sub-move",
	"sub-share",
	"sub-rename",
	"sub-folder-Inbox",
	"sub-folder-Design",
	"sub-folder-Engineering",
];
const subFocus = () => focusedAmong(SUB_IDS);
await scrollIntoView("sub-trigger");
await k.focus("sub-trigger");
await k.press("enter");
k.expect("sub: opens on the first row", subFocus(), "sub-move");
await k.press("right");
k.expect("sub: ArrowRight on a sub-trigger focuses the submenu's first row", subFocus(), "sub-folder-Inbox");
await k.press("down");
k.expect("sub: arrows move inside the submenu", subFocus(), "sub-folder-Design");
await k.press("left");
k.expect("sub: ArrowLeft closes the submenu and focuses its trigger", subFocus(), "sub-move");
k.check("sub: the submenu is gone", !k.exists("sub-folder-Inbox"));
k.check("sub: the parent menu stays open", k.exists("sub-rename"));
await k.press("enter");
k.expect("sub: Enter on a sub-trigger focuses the submenu's first row", subFocus(), "sub-folder-Inbox");
await k.press("escape");
k.expect("sub: Escape closes only the submenu", subFocus(), "sub-move");
k.check("sub: the parent menu is still open after Escape", k.exists("sub-rename"));
await k.press("down down");
k.expect("sub: the parent keeps arrowing after the submenu closes", subFocus(), "sub-rename");
await k.press("up up enter");
await k.press("tab");
k.check("sub: Tab inside a submenu closes the whole menu", !k.exists("sub-move") && !k.exists("sub-folder-Inbox"));
await k.focus("sub-trigger");
await k.press("enter");
await k.press("escape");
k.expect("sub: Escape in the parent returns focus to the trigger", subFocus(), "sub-trigger");

// A submenu the pointer opened leaves focus on its parent row.
await k.press("enter");
const move = k.bounds("sub-move");
renderer.nativeSimulateMouseMove(move.x + 40, move.y + move.height / 2);
await k.settle(600);
k.check("sub: hover opens the submenu", k.exists("sub-folder-Inbox"));
k.expect("sub: a hover-opened submenu leaves focus on the parent row", subFocus(), "sub-move");
await k.press("right");
k.expect("sub: ArrowRight then enters the hover-opened submenu", subFocus(), "sub-folder-Inbox");
await k.press("escape");
await k.press("escape");

// ─── Searchable menu: the field keeps focus (F2 moves the rows onto it) ─────

const shown = (text: string) =>
	renderer.getAllText().some((line) => line === text);
async function openSearch() {
	await scrollIntoView("search-trigger");
	await k.focus("search-trigger");
	await k.press("enter");
	await k.settle(300);
}
async function pickWith(keys: string, expected: string, label: string) {
	await openSearch();
	await k.press(keys);
	k.check(label, shown(expected), `trigger shows ${expected}`);
	if (k.exists("search-0")) await k.press("escape");
}

await pickWith(
	"down down space",
	"Albanian (Albania)",
	"search: Space activates the lit row",
);
await pickWith(
	"down down down down home down down enter",
	"Arabic",
	"search: Home lights the first row",
);
await pickWith(
	"down end up enter",
	"Ukrainian",
	"search: End lights the last row",
);

// No row lit: the field owns Space. " " keeps only the eight languages with a space.
await openSearch();
await k.press("space");
k.check(
	"search: Space types into the field while no row is lit",
	k.exists("search-7") && !k.exists("search-8") && !shown("Arabic"),
);
await k.press("escape");
k.expect(
	"search: Escape returns focus to the trigger",
	focusedAmong(["search-trigger"]),
	"search-trigger",
);

// ─── A menu opened with no key (what a pointer open does) ────────────────────

// A pointer press that opens a popup throws in the test renderer; `defaultOpen`
// takes the same path through the menu: no keyboard, nothing focused before.
const bare = createTestRoot({ width: 600, height: 400, fonts });
bare.render(() => (
	<DropdownMenu testId="bare" defaultOpen>
		<DropdownTrigger>
			{(trigger) => (
				<Button
					testId="bare-trigger"
					{...trigger.attributes}
					onMouseDown={trigger.onMouseDown}
					onClick={trigger.onClick}
				>
					Open
				</Button>
			)}
		</DropdownTrigger>
		<DropdownContent>
			<MenuItem testId="bare-0" index={0} label="One" />
			<MenuItem testId="bare-1" index={1} label="Two" />
			<MenuItem testId="bare-2" index={2} label="Three" />
		</DropdownContent>
	</DropdownMenu>
));
async function settleBare(ms: number) {
	const until = performance.now() + ms;
	do {
		bare.renderer.flush();
		bare.renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
}
const bareFocus = () => {
	const focused = bare.renderer.getFocusedElementId();
	return (
		["bare-popup", "bare-0", "bare-1", "bare-2"].find((testId) => {
			const element = bare.renderer.findByTestId(testId);
			return element !== undefined && element.id === focused;
		}) ?? null
	);
};
await settleBare(600);
k.expect("pointer open: the popup panel is focused, no row", bareFocus(), "bare-popup");
bare.renderer.simulateKeystrokes("down");
await settleBare(300);
k.expect("pointer open: ArrowDown focuses the first row", bareFocus(), "bare-0");
bare.unmount();

k.finish();
