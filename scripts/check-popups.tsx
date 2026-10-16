/**
 * Scenarios for the shared popup chrome and the select / combobox bugs, run
 * through the offscreen renderer in real time. Prints PASS / FAIL lines.
 *
 *   bun scripts/check-popups.tsx
 */
import { createTestRoot, type TestElement } from "@gpuix/solid/testing";
import { createSignal } from "solid-js";
import { App } from "../src/app";
import { Combobox } from "../src/components/combobox";
import { Select } from "../src/components/select";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { color, setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
function report(ok: boolean, label: string, detail: string) {
	if (!ok) failures++;
	console.log(`${ok ? "PASS" : "FAIL"} ${label}: ${detail}`);
}

function session() {
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
	const find = (testId: string) =>
		renderer.findByTestId(testId) as TestElement | undefined;
	const need = (testId: string) => {
		const element = find(testId);
		if (element === undefined) throw new Error(`no element ${testId}`);
		return element;
	};
	const centre = (testId: string) => {
		const bounds = renderer.getElementBounds(need(testId).id);
		if (bounds === null) throw new Error(`no bounds for ${testId}`);
		return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
	};
	/** Keyboard stand-in for a click: a pointer press that mounts a dismiss layer throws in the test renderer (the root view is held during the press), though the live window opens it. */
	const focus = async (testId: string) => {
		renderer.focusElement(need(testId).id);
		await settle(100);
	};
	const click = async (testId: string) => {
		const point = centre(testId);
		renderer.nativeSimulateClick(point.x, point.y);
		await settle(500);
	};
	const press = async (keys: string, ms = 300) => {
		renderer.simulateKeystrokes(keys);
		await settle(ms);
	};
	/** Milliseconds until `testId` leaves the tree after `action`, or null when it never does. */
	const timeToUnmount = async (testId: string, action: () => void) => {
		action();
		const start = performance.now();
		while (performance.now() - start < 600) {
			frame();
			if (find(testId) === undefined) return performance.now() - start;
			await sleep(4);
		}
		return null;
	};
	/** Opacity of an element times that of every ancestor. */
	const effectiveOpacity = (testId: string) => {
		let opacity = 1;
		let element: TestElement | undefined = need(testId);
		while (element !== undefined) {
			const own = element.style.opacity;
			if (typeof own === "number") opacity *= own;
			element =
				element.parentId === null
					? undefined
					: (renderer.getElement(element.parentId) as TestElement | undefined);
		}
		return opacity;
	};
	return {
		test,
		renderer,
		frame,
		settle,
		find,
		need,
		focus,
		click,
		press,
		timeToUnmount,
		effectiveOpacity,
	};
}

async function popupExit() {
	setThemeChoice("light");
	const ui = session();
	const demos = await loadDemos();
	for (const slug of ["select", "combobox"]) {
		ui.test.render(() => <App demos={demos} initialPage={slug} />);
		await ui.settle(800);
		const id = slug === "select" ? "basic" : "framework";
		const trigger = slug === "select" ? `${id}-trigger` : `${id}-input`;
		await ui.focus(trigger);
		await ui.press("down");
		if (ui.find(`${id}-popup`) === undefined)
			throw new Error(`${slug} popup did not open`);
		const ms = await ui.timeToUnmount(`${id}-popup`, () =>
			ui.renderer.simulateKeystrokes("escape"),
		);
		report(
			ms !== null && ms < 110,
			`${slug} popup unmounts with its 60 ms exit`,
			ms === null ? "never unmounted" : `${ms.toFixed(0)} ms`,
		);
	}
}

async function dialogSurface() {
	setThemeChoice("dark");
	const ui = session();
	const demos = await loadDemos();
	ui.test.render(() => <App demos={demos} initialPage="dialog" />);
	await ui.settle(800);
	await ui.click("stack-open");
	await ui.focus("stack-select-trigger");
	await ui.press("down");
	const dialog = ui.need("stack-popup").style.backgroundColor;
	const popup = ui.need("stack-select-popup").style.backgroundColor;
	report(
		popup === color.surface7,
		"select popup in a dialog sits two levels above it",
		`dialog ${String(dialog)}, popup ${String(popup)}, surface-7 ${color.surface7}`,
	);
}

async function disabledError() {
	setThemeChoice("light");
	const ui = session();
	ui.test.render(() => (
		<div style={{ padding: 40, width: 400 }}>
			<Select
				testId="s"
				variant="bordered"
				items={[{ value: "a", label: "A" }]}
				value={null}
				disabled
				placeholder="Disabled"
				error="Pick one."
			/>
		</div>
	));
	await ui.settle(500);
	const error = ui.effectiveOpacity("s-error");
	const trigger = ui.effectiveOpacity("s-trigger");
	report(
		error === 1,
		"disabled select leaves its error text undimmed",
		`error ${error}`,
	);
	report(
		trigger === 0.5,
		"disabled select dims its trigger",
		`trigger ${trigger}`,
	);
}

async function comboboxEnter() {
	setThemeChoice("light");
	const ui = session();
	let submits = 0;
	const items = [
		{ value: "a", label: "Alpha" },
		{ value: "b", label: "Beta" },
	];
	ui.test.render(() => {
		const [value, setValue] = createSignal<string | null>(null);
		return (
			<form testId="form" onSubmit={() => submits++} style={{ padding: 40 }}>
				<Combobox
					testId="c"
					items={items}
					value={value()}
					onValueChange={setValue}
				/>
			</form>
		);
	});
	await ui.settle(500);
	await ui.focus("c-input");
	const before = submits;
	renderer(ui).simulateKeystrokes("enter");
	await ui.settle(200);
	report(
		submits === before + 1,
		"Enter in a closed combobox reaches the form",
		`submits ${submits - before}`,
	);

	await ui.press("down");
	await ui.press("z");
	const second = submits;
	renderer(ui).simulateKeystrokes("enter");
	await ui.settle(200);
	report(
		submits === second + 1,
		"Enter with no row highlighted closes the list and reaches the form",
		`submits ${submits - second}, popup ${ui.find("c-popup") === undefined ? "gone" : "still there"}`,
	);

	renderer(ui).simulateKeystrokes("backspace");
	await ui.settle(300);
	const third = submits;
	renderer(ui).simulateKeystrokes("enter");
	await ui.settle(300);
	report(
		submits === third,
		"Enter on a highlighted row picks it without submitting",
		`submits ${submits - third}`,
	);
}

function renderer(ui: ReturnType<typeof session>) {
	return ui.renderer;
}

await popupExit();
await dialogSurface();
await disabledError();
await comboboxEnter();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAIL`);
process.exit(failures === 0 ? 0 : 1);
