/**
 * Combobox keyboard scenarios run through the offscreen renderer; prints PASS/FAIL lines.
 *
 *   bun scripts/check-combobox.tsx
 *
 * Focus stays in the input the whole time and the lit row is named by
 * `aria-activedescendant` (Base UI with `autoHighlight="always"`, `modal={false}`).
 * Most opens start from the keyboard; "Open with the pointer" presses for real.
 */
import { createSignal } from "solid-js";
import { Button } from "../src/components/button";
import { Combobox } from "../src/components/combobox";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "../src/components/dialog";
import { createCheck } from "./check-kit";
import { readPng } from "./png-pixels";

const FRUITS = ["Apple", "Banana", "Cherry", "Mango"];
const SOME_DISABLED = [
	{ value: "a", label: "Available" },
	{ value: "b", label: "Unavailable", disabled: true },
	{ value: "c", label: "Also available" },
];

const k = await createCheck(
	() => {
		const [picked, setPicked] = createSignal<string | null>(null);
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
				<Combobox
					testId="empty"
					items={FRUITS}
					placeholder="Fruit"
					onValueChange={setPicked}
				/>
				<Combobox
					testId="valued"
					items={FRUITS}
					defaultValue="Cherry"
					placeholder="Valued"
				/>
				<Combobox testId="gaps" items={SOME_DISABLED} placeholder="Gaps" />
				<Combobox
					testId="ease"
					items={[
						{ value: "a", label: "Settings", icon: "settings" },
						{ value: "b", label: "Profile", icon: "user" },
					]}
					placeholder="Ease"
				/>
				<Button testId="after">After</Button>
				<text>{`picked: ${picked() ?? "none"}`}</text>
				<Dialog>
					<DialogTrigger>
						<Button testId="dialog-open">Open dialog</Button>
					</DialogTrigger>
					<DialogContent size="sm" testId="dialog">
						<DialogTitle>Invite</DialogTitle>
						<Combobox testId="inside" items={FRUITS} placeholder="Inside" />
					</DialogContent>
				</Dialog>
			</div>
		);
	},
	{ width: 800, height: 900, initialSettleMs: 600 },
);
const renderer = k.renderer;

const isOpen = (id: string) => k.exists(`${id}-popup`);
/** Where focus is: the combobox input, its popup or a row; `null` when elsewhere or nowhere. */
function focusAt(id: string, values: readonly string[]) {
	const focused = renderer.getFocusedElementId();
	if (focused === null) return null;
	return (
		[
			`${id}-input`,
			`${id}-popup`,
			...values.map((value) => `${id}-option-${value}`),
		].find((testId) => {
			const element = renderer.findByTestId(testId);
			return element !== undefined && element.id === focused;
		}) ?? null
	);
}
const PLACEHOLDER: Record<string, string> = {
	empty: "Fruit",
	valued: "Valued",
	gaps: "Gaps",
	ease: "Ease",
	inside: "Inside",
};
/** The input's accessibility node, found by placeholder. */
function inputNode(id: string) {
	const nodes = renderer.getA11yTree().nodes ?? {};
	const found = Object.values(nodes).find(
		(node) =>
			node.aria?.role === "ComboBox" &&
			node.aria.placeholder === PLACEHOLDER[id],
	);
	if (found === undefined) throw new Error(`no input for ${id}`);
	return found.aria as Record<string, unknown>;
}
/** The row `aria-activedescendant` names, by its value; `null` when none is named. */
function lit(id: string, values: readonly string[]) {
	const target = inputNode(id).active_descendant;
	if (target === undefined) return null;
	const row = renderer.getA11yTree().nodes?.[String(target)]?.aria?.author_id;
	if (typeof row !== "string")
		throw new Error(`no row named ${String(target)}`);
	return values[Number(row.split("-row-")[1])];
}
const shown = (text: string) =>
	renderer.getAllText().some((line) => line === text);
const inputValue = (id: string) => String(inputNode(id).value ?? "");

// ─── Closed: arrows open ─────────────────────────────────────────────────────

await k.focus("empty-input");
k.check("empty: focusing does not open", !isOpen("empty"));
await k.press("ArrowDown");
k.check("empty: ArrowDown on the closed field opens", isOpen("empty"));
k.expect(
	"empty: opening lights the first row (autoHighlight always)",
	lit("empty", FRUITS),
	"Apple",
);
k.expect(
	"empty: focus stays in the input",
	focusAt("empty", FRUITS),
	"empty-input",
);
await k.press("Escape");
k.check("empty: Escape closes", !isOpen("empty"));
k.expect(
	"empty: Escape keeps focus in the input",
	focusAt("empty", FRUITS),
	"empty-input",
);
await k.press("ArrowUp");
k.check("empty: ArrowUp on the closed field opens", isOpen("empty"));
k.expect(
	"empty: ArrowUp opens on the first row too, not the last",
	lit("empty", FRUITS),
	"Apple",
);

// ─── Open: arrows loop and never leave the input ─────────────────────────────

await k.press("ArrowDown ArrowDown");
k.expect("empty: ArrowDown walks the rows", lit("empty", FRUITS), "Cherry");
k.expect(
	"empty: focus is still in the input while arrowing",
	focusAt("empty", FRUITS),
	"empty-input",
);
await k.press("ArrowDown ArrowDown");
k.expect(
	"empty: ArrowDown on the last row loops to the first",
	lit("empty", FRUITS),
	"Apple",
);
await k.press("ArrowUp");
k.expect(
	"empty: ArrowUp on the first row loops to the last",
	lit("empty", FRUITS),
	"Mango",
);
let escaped = false;
for (let step = 0; step < 6; step++) {
	await k.press("ArrowDown");
	if (lit("empty", FRUITS) === null) escaped = true;
}
k.check("empty: a full lap never drops the highlight into the input", !escaped);

// ─── Home and End move the caret only ────────────────────────────────────────

await k.press("Escape");
await k.press("a n");
k.check("empty: typing opens and filters", isOpen("empty"));
k.expect("empty: typed text", inputValue("empty"), "an");
const before = lit("empty", FRUITS);
await k.press("Home");
k.expect("empty: Home keeps the lit row", lit("empty", FRUITS), before);
k.check("empty: Home leaves the popup open", isOpen("empty"));
await k.press("b");
k.expect("empty: Home put the caret at the start", inputValue("empty"), "ban");
await k.press("End");
k.expect("empty: End keeps the lit row", lit("empty", FRUITS), before);
await k.press("a");
k.expect("empty: End put the caret at the end", inputValue("empty"), "bana");
await k.press("Backspace Backspace Backspace Backspace");

// ─── Enter picks, focus stays ────────────────────────────────────────────────

await k.press("Escape");
if (!isOpen("empty")) await k.press("ArrowDown");
await k.press("ArrowDown ArrowDown Enter");
await k.settle(500);
k.check("empty: Enter closes", !isOpen("empty"));
k.check("empty: Enter picks the lit row", shown("picked: Cherry"));
k.expect("empty: the input shows the pick", inputValue("empty"), "Cherry");
k.expect(
	"empty: a pick keeps focus in the input",
	focusAt("empty", FRUITS),
	"empty-input",
);

// ─── Pointer: hover lights without focus, leaving refills the first row ──────

await k.press("ArrowDown");
k.check("pointer: reopened by the keyboard", isOpen("empty"));
const mango = k.center("empty-option-Mango");
renderer.nativeSimulateMouseMove(mango.x, mango.y);
await k.settle(100);
k.expect("pointer: hover lights the row", lit("empty", FRUITS), "Mango");
k.expect(
	"pointer: hover leaves focus in the input",
	focusAt("empty", FRUITS),
	"empty-input",
);
renderer.nativeSimulateMouseMove(700, 800);
await k.settle(100);
k.expect(
	"pointer: leaving the list refills the first row",
	lit("empty", FRUITS),
	"Apple",
);
const banana = k.center("empty-option-Banana");
await k.clickAt(banana.x, banana.y);
await k.settle(400);
k.check("pointer: a click picks the row", shown("picked: Banana"));
k.expect(
	"pointer: a row click keeps focus in the input",
	focusAt("empty", FRUITS),
	"empty-input",
);

// ─── A selected value lights its row on open ─────────────────────────────────

await k.focus("valued-input");
await k.press("ArrowDown");
k.expect(
	"valued: ArrowDown opens on the picked row",
	lit("valued", FRUITS),
	"Cherry",
);
await k.press("Escape");
await k.press("ArrowUp");
k.expect(
	"valued: ArrowUp opens on the picked row too",
	lit("valued", FRUITS),
	"Cherry",
);
await k.press("Escape");

// ─── Disabled rows are reachable by arrows ───────────────────────────────────

await k.focus("gaps-input");
await k.press("ArrowDown");
await k.press("ArrowDown");
k.expect(
	"gaps: arrows visit the disabled row (disabledIndices is empty)",
	lit("gaps", ["a", "b", "c"]),
	"b",
);
await k.press("Escape");

// ─── Escape: open closes only the popup; closed clears the field ─────────────

await k.focus("valued-input");
await k.press("Escape");
k.expect(
	"valued: Escape on the closed field clears it",
	inputValue("valued"),
	"",
);

// ─── Hovering the field eases its fill over 80 ms ────────────────────────────

{
	const probe = () => {
		const box = k.bounds("ease");
		renderer.captureScreenshot("/tmp/check-combobox-fade.png");
		return readPng("/tmp/check-combobox-fade.png").at(
			Math.round(box.x + 5),
			Math.round(box.y + 5),
		)[0];
	};
	const hoverPoint = k.center("ease");
	renderer.nativeSimulateMouseMove(1, 1);
	await k.settle(300);
	renderer.clockPause();
	const rest = probe();
	renderer.nativeSimulateMouseMove(hoverPoint.x - 1, hoverPoint.y);
	renderer.nativeSimulateMouseMove(hoverPoint.x, hoverPoint.y);
	for (const ms of [0, 16]) {
		renderer.clockFastForward(ms);
		renderer.flush();
		renderer.dispatchNativeEvents();
	}
	const early = probe();
	renderer.clockFastForward(300);
	renderer.flush();
	renderer.dispatchNativeEvents();
	const hovered = probe();
	renderer.clockResume();
	k.check(
		"fade: the field's hover fill is partway 16 ms in",
		early > rest + 1 && early < hovered - 1,
		`rest ${rest}, early ${early}, hovered ${hovered}`,
	);
	renderer.nativeSimulateMouseMove(1, 1);
	await k.settle(300);
}

// ─── Lighting a row eases its icon stroke and colour over 80 ms ──────────────

await k.focus("ease-input");
await k.press("ArrowDown");
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
	const litInk = k.ink(iconBox);
	k.check(
		"ease: the row icon's stroke and colour are partway 16 ms after the row lights",
		early > rest + 0.1 * (litInk - rest) &&
			early < litInk - 0.1 * (litInk - rest),
		`rest ${rest}, early ${early}, lit ${litInk}`,
	);
	await k.press("Escape");
	await k.settle(300);
}

// ─── Open with the pointer ───────────────────────────────────────────────────

await k.press("Escape");
await k.clickAt(k.center("gaps-input").x, k.center("gaps-input").y);
k.check("press: pressing the field opens the popup", isOpen("gaps"));
k.expect(
	"press: focus is in the input",
	focusAt("gaps", ["a", "b", "c"]),
	"gaps-input",
);
await k.clickAt(790, 890);
await k.settle(300);
k.check("press: a press outside closes it", !isOpen("gaps"));

// ─── Escape inside a dialog stops at the combobox ────────────────────────────

await k.click("dialog-open");
await k.settle(400);
await k.focus("inside-input");
await k.press("ArrowDown");
k.check("inside: opens in the dialog", isOpen("inside"));
await k.press("Escape");
k.check("inside: Escape closes the popup", !isOpen("inside"));
k.check("inside: the dialog behind stays open", k.exists("dialog"));
await k.press("Escape");
await k.settle(500);
k.check("inside: a second Escape closes the dialog", !k.exists("dialog"));

k.finish();
