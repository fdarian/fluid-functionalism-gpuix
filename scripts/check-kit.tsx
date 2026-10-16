import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

/** Shared harness for the `check-<component>.tsx` scenario scripts: real-time frames, testId lookups, PASS/FAIL lines. */
export async function createCheck(slug: string) {
	const demos = await loadDemos();
	const test = createTestRoot({ width: 1240, height: 780, fonts });
	const renderer = test.renderer;
	let failures = 0;

	async function settle(ms = 400) {
		const until = performance.now() + ms;
		do {
			renderer.flush();
			renderer.dispatchNativeEvents();
			await new Promise((resolve) => setTimeout(resolve, 16));
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

	setThemeChoice("dark");
	test.render(() => <App demos={demos} initialPage={slug} />);
	await settle(800);

	return {
		renderer,
		settle,
		element,
		bounds,
		center,
		exists: (testId: string) => renderer.findByTestId(testId) !== undefined,
		check(name: string, ok: boolean, detail = "") {
			if (!ok) failures++;
			console.log(
				`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` (${detail})`}`,
			);
		},
		finish() {
			console.log(failures === 0 ? "all passed" : `${failures} failed`);
			process.exit(failures === 0 ? 0 : 1);
		},
	};
}
