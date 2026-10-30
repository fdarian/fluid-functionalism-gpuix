/**
 * Scenarios for the shared popup chrome and the select / combobox bugs, run
 * through the offscreen renderer in real time. Prints PASS / FAIL lines.
 *
 *   bun scripts/check-popups.tsx
 */
import type { TestElement } from '@gpuix/solid/testing';
import { createTestRoot } from '@gpuix/solid/testing';
import { createSignal } from 'solid-js';
import { App } from '#/app';
import { Combobox } from '#/components/combobox';
import { Select } from '#/components/select';
import { loadDemos, loadPages } from '#/lib/demo';
import { fonts } from '#/lib/fonts';
import { color, setThemeChoice } from '#/lib/theme';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let failures = 0;
function report(ok: boolean, label: string, detail: string) {
	if (!ok) failures++;
	console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${detail}`);
}

const sessions: ReturnType<typeof createTestRoot>[] = [];

function session() {
	const test = createTestRoot({ width: 1240, height: 780, fonts });
	sessions.push(test);
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
	/** Milliseconds of the motion clock, held and stepped 4 ms a frame, until `testId` leaves the tree after `action`; null when it never does. */
	const timeToUnmount = (testId: string, action: () => void) => {
		renderer.clockPause();
		try {
			action();
			for (let elapsed = 0; elapsed <= 600; elapsed += 4) {
				renderer.clockFastForward(elapsed === 0 ? 0 : 4);
				frame();
				if (find(testId) === undefined) return elapsed;
			}
			return null;
		} finally {
			renderer.clockResume();
		}
	};
	/** Opacity of an element times that of every ancestor. */
	const effectiveOpacity = (testId: string) => {
		let opacity = 1;
		let element: TestElement | undefined = need(testId);
		while (element !== undefined) {
			const own = element.style.opacity;
			if (typeof own === 'number') opacity *= own;
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
		centre,
		focus,
		click,
		press,
		timeToUnmount,
		effectiveOpacity,
	};
}

async function popupExit() {
	setThemeChoice('light');
	const ui = session();
	const demos = await loadDemos();
	const pages = await loadPages(demos);
	for (const slug of ['select', 'combobox']) {
		ui.test.render(() => (
			<App demos={demos} pages={pages} initialPage={slug} />
		));
		await ui.settle(800);
		const id = slug === 'select' ? 'basic' : 'framework';
		const trigger = slug === 'select' ? `${id}-trigger` : `${id}-input`;
		// The first open pays for cold rendering; the fastest of three is the exit itself.
		const times: number[] = [];
		for (let round = 0; round < 3; round++) {
			await ui.click(trigger);
			if (ui.find(`${id}-popup`) === undefined)
				throw new Error(`${slug} popup did not open`);
			const took = ui.timeToUnmount(`${id}-popup`, () =>
				ui.renderer.simulateKeystrokes('Escape'),
			);
			if (took !== null) times.push(took);
			await ui.settle(300);
		}
		const ms = times.length === 0 ? null : Math.min(...times);
		report(
			ms !== null && ms < 110,
			`${slug} popup unmounts with its 60 ms exit`,
			ms === null ? 'never unmounted' : `${ms.toFixed(0)} ms`,
		);
	}
}

async function dialogSurface() {
	setThemeChoice('dark');
	const ui = session();
	const demos = await loadDemos();
	const pages = await loadPages(demos);
	ui.test.render(() => (
		<App demos={demos} pages={pages} initialPage="dialog" />
	));
	await ui.settle(800);
	await ui.click('stack-open');
	await ui.click('stack-select-trigger');
	const popup = ui.need('stack-select-popup').style.backgroundColor;
	report(
		popup === color.surface7,
		'select popup in a dialog (surface-5) sits on surface-7',
		`popup ${String(popup)}, surface-7 ${color.surface7}, the dialog is ${color.surface5}`,
	);
}

async function disabledError() {
	setThemeChoice('light');
	const ui = session();
	ui.test.render(() => (
		<div style={{ padding: 40, width: 400 }}>
			<Select
				testId="s"
				variant="bordered"
				items={[{ value: 'a', label: 'A' }]}
				value={null}
				disabled
				placeholder="Disabled"
				error="Pick one."
			/>
		</div>
	));
	await ui.settle(500);
	const error = ui.effectiveOpacity('s-error');
	const trigger = ui.effectiveOpacity('s-trigger');
	report(
		error === 1,
		'disabled select leaves its error text undimmed',
		`error ${error}`,
	);
	report(
		trigger === 0.5,
		'disabled select dims its trigger',
		`trigger ${trigger}`,
	);
}

async function comboboxEnter() {
	setThemeChoice('light');
	const ui = session();
	let submits = 0;
	const items = [
		{ value: 'a', label: 'Alpha' },
		{ value: 'b', label: 'Beta' },
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
	await ui.focus('c-input');
	const before = submits;
	await ui.press('Enter');
	report(
		submits === before + 1,
		'Enter in a closed combobox reaches the form',
		`submits ${submits - before}`,
	);

	await ui.press('ArrowDown');
	await ui.press('z');
	const second = submits;
	await ui.press('Enter');
	report(
		submits === second + 1,
		'Enter with no row highlighted closes the list and reaches the form',
		`submits ${submits - second}, popup ${ui.find('c-popup') === undefined ? 'gone' : 'still there'}`,
	);

	await ui.press('Backspace');
	if (ui.find('c-popup') === undefined) await ui.press('ArrowDown');
	const third = submits;
	await ui.press('Enter');
	report(
		submits === third && ui.find('c-popup') === undefined,
		'Enter on a highlighted row picks it and does not submit',
		`submits ${submits - third}, popup ${ui.find('c-popup') === undefined ? 'gone' : 'still there'}`,
	);
}

/** A popup that flips above its trigger slides up and grows from its bottom edge, so that edge never dips below where it rests. The first open starts from the side it asked for (`initial` is read at mount); the reopen knows the side. */
async function flippedEntrance() {
	setThemeChoice('light');
	const ui = session();
	ui.test.render(() => (
		<div style={{ paddingTop: 690, paddingLeft: 40 }}>
			<Select
				testId="f"
				items={['a', 'b', 'c', 'd'].map((value) => ({
					value,
					label: `Row ${value}`,
				}))}
				value={null}
				placeholder="Pick"
			/>
		</div>
	));
	await ui.settle(500);
	await ui.click('f-trigger');
	await ui.press('Escape');
	await ui.settle(300);
	const point = ui.centre('f-trigger');
	ui.renderer.clockPause();
	try {
		ui.renderer.nativeSimulateClick(point.x, point.y);
		ui.frame();
		ui.renderer.clockFastForward(4);
		ui.frame();
		const popup = ui.need('f-popup');
		const entering = ui.renderer.getElementBounds(popup.id);
		ui.renderer.clockFastForward(600);
		ui.frame();
		ui.frame();
		const settled = ui.renderer.getElementBounds(popup.id);
		const trigger = ui.renderer.getElementBounds(ui.need('f-trigger').id);
		if (entering === null || settled === null || trigger === null)
			throw new Error('the flipped popup has no box');
		report(
			settled.y + settled.height <= trigger.y,
			'the popup opened above its trigger',
			`popup bottom ${settled.y + settled.height}, trigger top ${trigger.y}`,
		);
		const dip = entering.y + entering.height - (settled.y + settled.height);
		report(
			dip >= 0 && dip <= 4,
			'above the trigger it grows from its bottom edge',
			`bottom edge ${dip.toFixed(2)} px below rest`,
		);
	} finally {
		ui.renderer.clockResume();
	}
}

await popupExit();
await flippedEntrance();
await dialogSurface();
await disabledError();
await comboboxEnter();
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAIL`);
for (const test of sessions) test.unmount();
process.exit(failures === 0 ? 0 : 1);
