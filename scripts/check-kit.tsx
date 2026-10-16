/**
 * Shared harness for the `scripts/check-<component>.tsx` scenarios: mounts either
 * a demo page of the app or one component tree in the offscreen renderer and
 * drives it in real time.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import type { JSX } from "solid-js";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";
import { readPng } from "./png-pixels";

const INK_PATH = "/tmp/check-kit-ink.png";

type CheckOptions = {
	width?: number;
	height?: number;
	/** Frames to run after mounting; a demo page needs time to load, a bare view does not. */
	initialSettleMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** `target` is a demo page slug, or a view to mount on its own. */
export async function createCheck(
	target: string | (() => JSX.Element),
	options: CheckOptions = {},
) {
	const isPage = typeof target === "string";
	const test = createTestRoot({
		width: options.width ?? (isPage ? 1240 : 800),
		height: options.height ?? (isPage ? 780 : 600),
		fonts,
	});
	const renderer = test.renderer;
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

	function element(testId: string) {
		const found = renderer.findByTestId(testId);
		if (found === undefined)
			throw new Error(`no element with testId ${testId}`);
		return found;
	}

	function bounds(testId: string) {
		const result = renderer.getElementBounds(element(testId).id);
		if (result === null) throw new Error(`no painted bounds for ${testId}`);
		return result;
	}

	function center(testId: string) {
		const box = bounds(testId);
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
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

	/**
	 * How much of `box` differs from the pixel at its top-left corner, summed over the channels: a measure of how
	 * much ink a glyph or label leaves on its own background, so it grows with stroke width and with contrast.
	 */
	function ink(box: { x: number; y: number; width: number; height: number }) {
		renderer.captureScreenshot(INK_PATH);
		const pixels = readPng(INK_PATH);
		const left = Math.round(box.x);
		const top = Math.round(box.y);
		const ground = pixels.at(left, top);
		let total = 0;
		for (let y = top; y < Math.round(box.y + box.height); y++)
			for (let x = left; x < Math.round(box.x + box.width); x++) {
				const pixel = pixels.at(x, y);
				total +=
					Math.abs(pixel[0] - ground[0]) +
					Math.abs(pixel[1] - ground[1]) +
					Math.abs(pixel[2] - ground[2]);
			}
		return total;
	}

	/**
	 * How much area of `box` the glyph covers: each pixel counts by its difference from the corner pixel as a share
	 * of the largest difference in the box. Unlike `ink` it does not move when only the colour or the background
	 * changes, so it isolates a stroke width.
	 */
	function coverage(box: {
		x: number;
		y: number;
		width: number;
		height: number;
	}) {
		renderer.captureScreenshot(INK_PATH);
		const pixels = readPng(INK_PATH);
		const left = Math.round(box.x);
		const top = Math.round(box.y);
		const ground = pixels.at(left, top);
		const diffs: number[] = [];
		for (let y = top; y < Math.round(box.y + box.height); y++)
			for (let x = left; x < Math.round(box.x + box.width); x++) {
				const pixel = pixels.at(x, y);
				diffs.push(
					Math.abs(pixel[0] - ground[0]) +
						Math.abs(pixel[1] - ground[1]) +
						Math.abs(pixel[2] - ground[2]),
				);
			}
		const strongest = Math.max(...diffs);
		return diffs.reduce((sum, diff) => sum + diff / strongest, 0);
	}

	/** Moves the pointer onto `point` and returns once `afterMs` have passed, the frames flushed by hand. */
	async function hoverFor(point: { x: number; y: number }, afterMs: number) {
		renderer.nativeSimulateMouseMove(point.x - 1, point.y);
		renderer.nativeSimulateMouseMove(point.x, point.y);
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(afterMs);
		renderer.flush();
		renderer.dispatchNativeEvents();
	}

	setThemeChoice("dark");
	if (isPage) {
		const demos = await loadDemos();
		test.render(() => <App demos={demos} initialPage={target} />);
	} else {
		test.render(target);
	}
	const initialSettleMs = options.initialSettleMs ?? (isPage ? 800 : 0);
	if (initialSettleMs > 0) await settle(initialSettleMs);

	return {
		renderer,
		settle,
		element,
		bounds,
		center,
		aria,
		ink,
		coverage,
		hoverFor,
		exists: (testId: string) => renderer.findByTestId(testId) !== undefined,
		async click(testId: string) {
			const point = center(testId);
			renderer.nativeSimulateClick(point.x, point.y);
			await settle();
		},
		async clickAt(x: number, y: number) {
			renderer.nativeSimulateClick(x, y);
			await settle();
		},
		async focus(testId: string) {
			renderer.focusElement(element(testId).id);
			await settle();
		},
		async press(keystrokes: string) {
			renderer.simulateKeystrokes(keystrokes);
			await settle();
		},
		check(name: string, ok: boolean, detail = "") {
			if (!ok) failures++;
			console.log(
				`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` (${detail})`}`,
			);
		},
		expect(label: string, actual: unknown, expected: unknown) {
			const ok = JSON.stringify(actual) === JSON.stringify(expected);
			if (!ok) failures++;
			console.log(
				`${ok ? "PASS" : "FAIL"} ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`,
			);
		},
		finish() {
			console.log(failures === 0 ? "all passed" : `${failures} failed`);
			process.exit(failures === 0 ? 0 : 1);
		},
	};
}
