/**
 * Regression checks for ask-user-questions, run through the offscreen renderer.
 *
 *   bun scripts/check-ask-user-questions.tsx
 *
 * Prints PASS / FAIL lines and exits non-zero on any FAIL.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;
let failed = false;

function frame() {
	renderer.flush();
	renderer.dispatchNativeEvents();
}
async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		frame();
		await sleep(16);
	} while (performance.now() < until);
	frame();
}
function check(name: string, ok: boolean, detail = "") {
	console.log(
		`${ok ? "PASS" : "FAIL"} ${name}${detail === "" ? "" : ` (${detail})`}`,
	);
	if (!ok) failed = true;
}
function element(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function bounds(testId: string) {
	const box = renderer.getElementBounds(element(testId).id);
	if (box === null) throw new Error(`no bounds for ${testId}`);
	return box;
}
function maybeBounds(testId: string) {
	const found = renderer.findByTestId(testId);
	if (found === undefined) return undefined;
	return renderer.getElementBounds(found.id) ?? undefined;
}
/** Scrolls the page until the element is mid-window, then focuses it. Elements far off-screen have no painted bounds, so it scrolls in steps. */
async function focus(testId: string) {
	for (let attempt = 0; attempt < 40; attempt++) {
		const box = maybeBounds(testId);
		if (box !== undefined) {
			const offset = box.y + box.height / 2 - 300;
			if (Math.abs(offset) < 40) break;
			renderer.nativeSimulateScrollWheel(600, 400, 0, -offset);
		} else {
			renderer.nativeSimulateScrollWheel(600, 400, 0, -500);
		}
		await settle(200);
	}
	renderer.focusElement(element(testId).id);
	await settle(300);
}

/** Largest distance, over 400 ms of frames starting at the key press, between the hint's painted box and the Other row's. */
async function hintOffsetAfter(keystrokes: string) {
	const row = bounds("other-other");
	let worst = 0;
	renderer.simulateKeystrokes(keystrokes);
	const start = performance.now();
	while (performance.now() - start < 400) {
		frame();
		const hint = maybeBounds("other-other-hint");
		if (hint === undefined || hint.width === 0 || hint.height === 0) {
			worst = Math.max(worst, 1000);
		} else {
			worst = Math.max(
				worst,
				Math.abs(hint.x - row.x),
				Math.abs(hint.y - row.y),
				Math.abs(hint.width - row.width),
				Math.abs(hint.height - row.height),
			);
		}
		await sleep(16);
	}
	return worst;
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} initialPage="ask-user-questions" />);
await settle(800);

// The "type here" hint must sit on the Other row from its first frame.
await focus("other-option-2");
const inputId = element("other-other-input").id;
const firstShow = await hintOffsetAfter("tab");
check(
	"tab reaches the Other field",
	renderer.getFocusedElementId() === inputId,
);
check(
	"hint sits on the Other row in every frame (first show)",
	firstShow < 2,
	`worst offset ${firstShow.toFixed(1)}px`,
);
renderer.simulateKeystrokes("tab");
await settle(400);
const secondShow = await hintOffsetAfter("shift-tab");
check(
	"shift-tab returns to the Other field",
	renderer.getFocusedElementId() === inputId,
);
check(
	"hint sits on the Other row in every frame (second show)",
	secondShow < 2,
	`worst offset ${secondShow.toFixed(1)}px`,
);

// Tabbing out of the rows must clear the lit row.
await focus("multiple-option-0");
const lit = () => renderer.findByTestId("multiple-option-0-arrow") !== undefined;
await settle(300);
check("row 0 lit while focused", lit());
renderer.simulateKeystrokes("tab");
await settle(400);
check("row 0 not lit after Tab leaves the group", !lit());

console.log(failed ? "FAILED" : "ALL PASSED");
process.exit(failed ? 1 : 0);
