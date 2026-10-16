/**
 * Shared harness for the `scripts/check-<component>.tsx` scenarios: mounts one
 * component tree in the offscreen renderer and drives it in real time.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import type { JSX } from "solid-js";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createCheck(view: () => JSX.Element) {
	const test = createTestRoot({ width: 800, height: 600, fonts });
	const renderer = test.renderer;
	setThemeChoice("dark");
	test.render(view);

	let failures = 0;

	async function settle(ms = 300) {
		const until = performance.now() + ms;
		do {
			renderer.flush();
			renderer.dispatchNativeEvents();
			await sleep(16);
		} while (performance.now() < until);
		renderer.flush();
		renderer.dispatchNativeEvents();
	}

	function bounds(testId: string) {
		const element = renderer.findByTestId(testId);
		if (element === undefined)
			throw new Error(`no element with testId ${testId}`);
		const box = renderer.getElementBounds(element.id);
		if (box === null) throw new Error(`no painted bounds for ${testId}`);
		return box;
	}

	/** The accessibility node whose author id (or label, when the element has no id) matches. */
	function aria(idOrLabel: string): Record<string, unknown> | undefined {
		const nodes = renderer.getA11yTree().nodes ?? {};
		for (const node of Object.values(nodes)) {
			if (node.aria?.author_id === idOrLabel || node.aria?.label === idOrLabel)
				return node.aria as Record<string, unknown>;
		}
		return undefined;
	}

	return {
		renderer,
		settle,
		bounds,
		aria,
		async click(testId: string) {
			const box = bounds(testId);
			renderer.nativeSimulateClick(
				box.x + box.width / 2,
				box.y + box.height / 2,
			);
			await settle();
		},
		async clickAt(x: number, y: number) {
			renderer.nativeSimulateClick(x, y);
			await settle();
		},
		async focus(testId: string) {
			const element = renderer.findByTestId(testId);
			if (element === undefined)
				throw new Error(`no element with testId ${testId}`);
			renderer.focusElement(element.id);
			await settle();
		},
		async press(keystrokes: string) {
			renderer.simulateKeystrokes(keystrokes);
			await settle();
		},
		expect(label: string, actual: unknown, expected: unknown) {
			const ok = JSON.stringify(actual) === JSON.stringify(expected);
			if (!ok) failures++;
			console.log(
				`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
			);
		},
		finish() {
			process.exit(failures === 0 ? 0 : 1);
		},
	};
}
