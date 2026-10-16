/**
 * Regression checks for color-picker, run through the offscreen renderer.
 *
 *   bun scripts/check-color-picker.tsx
 *
 * Prints PASS / FAIL lines and exits non-zero on any FAIL.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { ColorPicker } from "../src/components/color-picker";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

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
	page.test.render(() => <App demos={demos} initialPage="color-picker" />);
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

console.log(failed ? "FAILED" : "ALL PASSED");
process.exit(failed ? 1 : 0);
