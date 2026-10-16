/**
 * Input group checks through the offscreen renderer: PASS / FAIL lines.
 *
 *   bun scripts/check-input-group.tsx
 *
 * - Tab never lands on the disabled field.
 * - The error caption is 12/16 at the default step and 11/14 at the compact one.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

async function settle(ms: number) {
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
	if (found === undefined) throw new Error(`no element ${testId}`);
	return found;
}
function caption(text: string) {
	const node = renderer.findByText(text);
	if (node === undefined || node.parentId === null)
		throw new Error(`no text ${text}`);
	const found = renderer.getElement(node.parentId);
	if (found === undefined) throw new Error(`no <text> for ${text}`);
	return `${found.style.fontSize}/${found.style.lineHeight}`;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} initialPage="input-group" />);
await settle(800);

const disabledInput = element("disabled-input").id;
const reached = new Set<number>();
for (let presses = 0; presses < 40; presses++) {
	renderer.simulateKeystrokes("Tab");
	await settle(60);
	const focused = renderer.getFocusedElementId();
	if (focused !== null) reached.add(focused);
}
report(
	"disabled field is out of the Tab order",
	!reached.has(disabledInput),
	`Tab reached ${reached.size} elements, the disabled input ${reached.has(disabledInput) ? "among them" : "not among them"}`,
);

const defaultCaption = caption("Please enter a valid email address.");
report(
	"default error caption is 12/16",
	defaultCaption === "12/16",
	defaultCaption,
);
const compactCaption = caption("Enter a valid email.");
report(
	"compact error caption is 11/14",
	compactCaption === "11/14",
	compactCaption,
);

test.unmount();
process.exit(failed ? 1 : 0);
