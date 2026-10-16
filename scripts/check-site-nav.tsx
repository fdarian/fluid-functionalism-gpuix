/**
 * Site nav hover: the highlight follows the pointer and keyboard focus, and never
 * sits on a row the pointer is not over once focus has left the menu.
 *
 *   bun scripts/check-site-nav.tsx
 *
 * Prints PASS / FAIL lines; exits 1 on any FAIL.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";
import { readPng } from "./png-pixels";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;
let failed = false;

async function settle(ms = 400) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
	renderer.flush();
	renderer.dispatchNativeEvents();
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
	if (box === null) throw new Error(`no bounds ${testId}`);
	return box;
}
function center(testId: string) {
	const box = bounds(testId);
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function click(testId: string) {
	const point = center(testId);
	renderer.nativeSimulateMouseMove(point.x, point.y);
	await settle(100);
	renderer.nativeSimulateClick(point.x, point.y);
	await settle(600);
}

const SHOT = `/tmp/check-site-nav-${process.pid}.png`;
const UNLIT = 23;
/** The row's fill beside its label: the sidebar's own background when nothing is drawn behind the row. */
function fillOf(testId: string) {
	renderer.captureScreenshot(SHOT);
	const box = bounds(testId);
	return readPng(SHOT).at(
		Math.round(box.x + 3),
		Math.round(box.y + box.height / 2),
	)[0];
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");
test.render(() => <App demos={demos} pages={pages} initialPage="showcase" />);
await settle(800);

// Focus leaving the menu takes the highlight with it, as the source's onBlur does.
await click("nav-sizes");
const lit = fillOf("nav-sizes");
check("the clicked row is lit", lit > UNLIT, String(lit));
renderer.focusElement(element("nav-search").id);
await settle(400);
const active = fillOf("nav-sizes");
check(
	"the row keeps only the active fill once focus has left the menu",
	active > UNLIT && active < lit,
	`${lit} -> ${active}`,
);

// A scroll moves rows under a stationary pointer: the highlight follows.
const probe = center("nav-skill");
renderer.nativeSimulateMouseMove(probe.x, probe.y);
await settle(300);
check("the pointer's row is lit", fillOf("nav-skill") > UNLIT);
renderer.nativeSimulateScrollWheel(probe.x, probe.y, 0, 64);
await settle(600);
const navRows = [...pages, ...demos]
	.filter((entry) => entry.listed === "sidebar")
	.map((entry) => `nav-${entry.slug}`);
const rowsUnderPointer = navRows.filter((id) => {
	const box = bounds(id);
	return box.y <= probe.y && probe.y < box.y + box.height;
});
const under = rowsUnderPointer[0];
if (under === undefined) throw new Error("no row under the pointer");
check(
	"after a wheel scroll the row now under the pointer is lit",
	fillOf(under) > UNLIT && under !== "nav-skill",
	under,
);
check("the row that left the pointer is not", fillOf("nav-skill") === UNLIT);

test.unmount();
process.exit(failed ? 1 : 0);
