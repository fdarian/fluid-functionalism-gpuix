/**
 * Regression checks for color-picker, run through the offscreen renderer.
 *
 *   bun scripts/check-color-picker.tsx
 *
 * Prints PASS / FAIL lines and exits non-zero on any FAIL. A pointer press that
 * opens a popup throws in the test renderer, so the format menu's scenarios open
 * it from the keyboard; its pointer open is for a live check.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { createSignal, Show } from "solid-js";
import { App } from "../src/app";
import { ColorPicker } from "../src/components/color-picker";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";
import { createCheck } from "./check-kit";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let failed = false;

function check(name: string, ok: boolean, detail = "") {
	console.log(
		`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` (${detail})`}`,
	);
	if (!ok) failed = true;
}

function harness() {
	const test = createTestRoot({ width: 1240, height: 780, fonts });
	const renderer = test.renderer;
	const frame = () => {
		renderer.flush();
		renderer.dispatchNativeEvents();
	};
	const settle = async (ms: number) => {
		const until = performance.now() + ms;
		do {
			frame();
			await sleep(16);
		} while (performance.now() < until);
		frame();
	};
	const find = (testId: string) => renderer.findByTestId(testId);
	const bounds = (testId: string) => {
		const found = find(testId);
		if (found === undefined) throw new Error(`no element ${testId}`);
		const box = renderer.getElementBounds(found.id);
		if (box === null) throw new Error(`no bounds for ${testId}`);
		return box;
	};
	const click = async (testId: string) => {
		const box = bounds(testId);
		renderer.nativeSimulateClick(box.x + box.width / 2, box.y + box.height / 2);
		await settle(500);
	};
	const focus = async (testId: string) => {
		const found = find(testId);
		if (found === undefined) throw new Error(`no element ${testId}`);
		renderer.focusElement(found.id);
		await settle(200);
		return renderer.getFocusedElementId() === found.id;
	};
	const press = async (keystrokes: string) => {
		renderer.simulateKeystrokes(keystrokes);
		await settle(300);
	};
	const value = (testId: string) => {
		const found = find(testId);
		if (found === undefined) throw new Error(`no element ${testId}`);
		const current = found.customProps?.value;
		if (typeof current !== "string") throw new Error(`${testId} has no value`);
		return current;
	};
	return { test, renderer, settle, find, bounds, click, focus, press, value };
}

setThemeChoice("dark");

// The demo page.
{
	const page = harness();
	const demos = await loadDemos();
	const pages = await loadPages(demos);
	page.test.render(() => <App demos={demos} pages={pages} initialPage="color-picker" />);
	await page.settle(800);

	// The rails are the source's 36px tall compact sliders, overlapping by 1px.
	const hue = page.bounds("default-hue");
	const alpha = page.bounds("default-alpha");
	check("hue rail is 36px tall", hue.height === 36, `${hue.height}`);
	check("alpha rail is 36px tall", alpha.height === 36, `${alpha.height}`);
	check("rails overlap by 1px", alpha.y - hue.y === 35, `${alpha.y - hue.y}`);

	// Channel fields drop text that is not a number.
	await page.focus("default-format");
	await page.press("down");
	await page.press("down enter");
	check("rgb channels shown", page.find("default-r-input") !== undefined);
	for (const [label, typed] of [
		["letters", "a b c"],
		["nothing", "backspace backspace backspace backspace"],
	] as const) {
		await page.click("default-r-input");
		await page.press(`cmd-a ${typed}`);
		await page.press("tab");
		check(
			`red field shows its value again after ${label}`,
			page.value("default-r-input") === "107",
			page.value("default-r-input"),
		);
		check(
			`green field is untouched after ${label}`,
			page.value("default-g-input") === "151",
			page.value("default-g-input"),
		);
	}

	// Swatches take focus and Enter / Space picks them.
	const reached = await page.focus("swatches-swatch-3");
	check("swatch takes keyboard focus", reached);
	await page.press("enter");
	check(
		"Enter on a focused swatch picks it",
		page.value("swatches-hex-input") === "F0F0F0",
		page.value("swatches-hex-input"),
	);
	check(
		"second swatch takes keyboard focus",
		await page.focus("swatches-swatch-4"),
	);
	// Space picks on key release, which the test renderer's keystrokes do not send; buttonProps handles it for every Button alike.
	await page.press("enter");
	check(
		"Enter on the second swatch picks it",
		page.value("swatches-hex-input") === "E5E5E5",
		page.value("swatches-hex-input"),
	);

	// Escape in the format menu closes the menu and leaves the popover open.
	await page.click("popover-trigger");
	check("popover opens", page.find("popover-square") !== undefined);
	await page.focus("popover-format");
	await page.press("down");
	check("format menu opens", page.find("popover-format-rgb") !== undefined);
	await page.press("escape");
	await page.settle(400);
	check(
		"Escape closes the format menu",
		page.find("popover-format-rgb") === undefined,
	);
	check(
		"Escape in the format menu leaves the popover open",
		page.find("popover-square") !== undefined,
	);
	await page.focus("popover-format");
	await page.press("escape");
	await page.settle(400);
	check(
		"a second Escape closes the popover",
		page.find("popover-square") === undefined,
	);
}

// A named swatch must not take the panel down.
{
	const page = harness();
	page.test.render(() => (
		<ColorPicker
			testId="named"
			defaultValue="#6B97FF"
			swatches={["#FF0000", "tomato"]}
		/>
	));
	await page.settle(600);
	check(
		"panel with a named swatch renders",
		page.find("named-swatch-1") !== undefined,
	);
	await page.click("named-swatch-1");
	check(
		"clicking a named swatch leaves the colour alone",
		page.find("named-square") !== undefined,
	);
}

// The format menu's focus model: rows take real focus, the keys live on the popup.
{
	const [second, setSecond] = createSignal(false);
	const k = await createCheck(
		() => (
			<div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<div testId="before" tabIndex={0} style={{ width: 40, height: 20 }} />
					<ColorPicker testId="cp" defaultValue="#6B97FF" />
				</div>
				<Show when={second()}>
					<ColorPicker testId="op" defaultValue="#6B97FF" defaultFormatOpen />
				</Show>
			</div>
		),
		{ width: 800, height: 700, initialSettleMs: 600 },
	);
	const renderer = k.renderer;
	const focusedAmong = (testIds: readonly string[]) => {
		const id = renderer.getFocusedElementId();
		if (id === null) return null;
		return (
			testIds.find((testId) => {
				const element = renderer.findByTestId(testId);
				return element !== undefined && element.id === id;
			}) ?? null
		);
	};
	const ROWS = ["hex", "rgb", "hsl", "oklch"].map(
		(format) => `cp-format-${format}`,
	);
	const focused = () =>
		focusedAmong(["cp-format", ...ROWS, "cp-format-popup", "before"]);
	const menuOpen = () => k.exists("cp-format-hex");

	await k.focus("cp-format");
	await k.press("enter");
	k.expect(
		"Enter on the trigger opens on the first row",
		focused(),
		"cp-format-hex",
	);
	k.check(
		"the focused row is the only tab stop",
		renderer.matchesFocus(k.element("cp-format-hex").id, ":focus"),
	);
	k.check(
		"the trigger no longer names the lit row",
		k.aria("cp-format")?.active_descendant === undefined,
	);
	await k.press("down");
	k.expect("ArrowDown focuses the next row", focused(), "cp-format-rgb");
	await k.press("up up");
	k.expect(
		"ArrowUp from the first row loops to the last",
		focused(),
		"cp-format-oklch",
	);
	await k.press("down");
	k.expect(
		"ArrowDown from the last row loops to the first",
		focused(),
		"cp-format-hex",
	);
	await k.press("end");
	k.expect("End focuses the last row", focused(), "cp-format-oklch");
	await k.press("home");
	k.expect("Home focuses the first row", focused(), "cp-format-hex");
	await k.press("o");
	k.expect("typeahead focuses the matching row", focused(), "cp-format-oklch");
	await k.settle(900);
	await k.press("h");
	k.expect(
		"typeahead starts after the focused row and wraps",
		focused(),
		"cp-format-hex",
	);
	await k.press("escape");
	k.check("Escape closes the menu", !menuOpen());
	k.expect("Escape returns focus to the trigger", focused(), "cp-format");

	await k.press("up");
	k.expect(
		"ArrowUp on the trigger opens on the last row",
		focused(),
		"cp-format-oklch",
	);
	await k.press("escape");

	await k.press("space");
	k.expect(
		"Space on the trigger opens on the first row",
		focused(),
		"cp-format-hex",
	);
	await k.press("down enter");
	k.check("Enter on a row closes the menu", !menuOpen());
	k.expect("a pick returns focus to the trigger", focused(), "cp-format");
	k.check("the pick switched the format", k.exists("cp-r-input"));

	await k.press("enter");
	await k.press("down space");
	k.check("Space on a row closes and its release does not reopen", !menuOpen());
	k.expect(
		"Space on a row returns focus to the trigger",
		focused(),
		"cp-format",
	);

	// Tab closes and focus moves to the control after the trigger.
	await k.focus("cp-format");
	await k.press("tab");
	const afterTrigger = renderer.getFocusedElementId();
	await k.focus("cp-format");
	await k.press("enter");
	await k.press("down");
	await k.press("tab");
	k.check("Tab closes the menu", !menuOpen());
	k.check(
		"Tab focuses what follows the trigger",
		afterTrigger !== null && renderer.getFocusedElementId() === afterTrigger,
		`${renderer.getFocusedElementId()} vs ${afterTrigger}`,
	);

	await k.focus("cp-format");
	await k.press("down");
	await k.press("shift-tab");
	k.check("Shift+Tab closes the menu", !menuOpen());
	k.expect("Shift+Tab focuses the trigger", focused(), "cp-format");

	// Pointer movement over the rows (no press, so it runs in the test renderer).
	await k.press("down");
	const third = k.bounds("cp-format-hsl");
	renderer.nativeSimulateMouseMove(third.x + 40, third.y + third.height / 2);
	await k.settle(300);
	k.expect("hovering a row focuses it", focused(), "cp-format-hsl");
	renderer.nativeSimulateMouseMove(780, 20);
	await k.settle(300);
	k.expect(
		"leaving the rows focuses the popup panel",
		focused(),
		"cp-format-popup",
	);
	await k.press("down");
	k.expect(
		"ArrowDown on the panel focuses the first row",
		focused(),
		"cp-format-hex",
	);
	await k.press("escape");

	// A menu that opened with the page keeps the page's focus until the reader reaches in.
	setSecond(true);
	await k.settle(600);
	const focusedIs = (testId: string) =>
		renderer.getFocusedElementId() === k.element(testId).id;
	await k.focus("before");
	k.check("the menu opened with the page is open", k.exists("op-format-hex"));
	k.check("an open menu leaves focus on the page", focusedIs("before"));
	const rgb = k.bounds("op-format-rgb");
	renderer.nativeSimulateMouseMove(rgb.x + 40, rgb.y + rgb.height / 2);
	await k.settle(300);
	k.check("hovering a row of it does not take focus", focusedIs("before"));
	await k.focus("op-format");
	await k.press("down");
	k.check(
		"ArrowDown on the trigger reaches into the menu",
		focusedIs("op-format-hex"),
	);
	await k.press("down");
	k.check("the arrows then walk the rows", focusedIs("op-format-rgb"));
	await k.press("escape");
	k.check("Escape closes it", !k.exists("op-format-hex"));
	k.check("Escape returns focus to the trigger", focusedIs("op-format"));

	if (failed) console.log("FAILED");
	k.finish();
}
