/**
 * Drift-audit scenarios for the sidebar: keyboard, collapsed-row clicks, aria-current, dot colours.
 *
 *   bun scripts/check-sidebar.tsx
 *
 * Prints PASS / FAIL lines; exits 1 on any FAIL.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

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
	const found = renderer.getElementBounds(element(testId).id);
	if (found === null) throw new Error(`no bounds ${testId}`);
	return found;
}
async function clickAt(x: number, y: number) {
	renderer.nativeSimulateClick(x, y);
	await settle(600);
}
async function click(testId: string) {
	const box = bounds(testId);
	await clickAt(box.x + box.width / 2, box.y + box.height / 2);
}
async function press(keys: string) {
	renderer.simulateKeystrokes(keys);
	await settle(300);
}
function focusedRow() {
	const focused = renderer.getFocusedElementId();
	return ROWS.find((id) => element(id).id === focused);
}
function focus(testId: string) {
	renderer.focusElement(element(testId).id);
}
function current(testId: string) {
	const id = element(testId).customProps?.id;
	for (const node of Object.values(renderer.getA11yTree().nodes ?? {})) {
		if (node.aria?.author_id === id) return (node.aria as { aria_current?: string }).aria_current;
	}
	throw new Error(`no accessibility node for ${testId}`);
}
function ringBounds() {
	for (const menu of ["main", "system", "components"]) {
		const found = renderer.findByTestId(`sidebar-demo-${menu}-focus-ring`);
		if (found === undefined) continue;
		const box = renderer.getElementBounds(found.id);
		if (box !== null) return box;
	}
	return undefined;
}

const ROWS = [
	"sidebar-demo-Showcase",
	"sidebar-demo-Fluid Hover",
	"sidebar-demo-Motion",
	"sidebar-demo-Scrollbars",
	"sidebar-demo-Skill",
	"sidebar-demo-Accordion",
	"sidebar-demo-Button",
	"sidebar-demo-Variants",
	"sidebar-demo-Sizes",
	"sidebar-demo-Icons",
	"sidebar-demo-Badge",
	"sidebar-demo-Banner",
];

const demos = await loadDemos();
setThemeChoice("dark");
test.render(() => <App demos={demos} initialPage="sidebar" />);
await settle(800);

// aria-current: absent on an inactive row, "page" on the active one.
check(
	"inactive row has no aria-current",
	current("sidebar-demo-Motion") === undefined,
	String(current("sidebar-demo-Motion")),
);
check(
	"active row has aria-current=Page",
	current("sidebar-demo-Showcase") === "Page",
	String(current("sidebar-demo-Showcase")),
);

// A collapsed sub-menu's rows are not clickable. Icons lays out below Banner,
// over empty content, so nothing else paints where it would be hit.
await click("sidebar-demo-Button");
await settle(600);
const icons = bounds("sidebar-demo-Icons");
await clickAt(icons.x + icons.width / 2, icons.y + icons.height - 4);
check(
	"click on a collapsed sub-row does not activate it",
	current("sidebar-demo-Icons") === undefined,
	String(current("sidebar-demo-Icons")),
);
await click("sidebar-demo-Button");
await settle(600);
const open = bounds("sidebar-demo-Icons");
await clickAt(open.x + open.width / 2, open.y + open.height - 4);
check("click on an open sub-row activates it", current("sidebar-demo-Icons") === "Page", String(current("sidebar-demo-Icons")));
await click("sidebar-demo-Showcase");

// Tab reaches the rows: the active row is the one tab stop of its menu.
focus("sidebar-demo-Showcase");
await settle();
check("Showcase takes focus", focusedRow() === "sidebar-demo-Showcase");
await press("tab");
check(
	"Tab leaves the one-row menu for the next menu's tab stop",
	focusedRow() === "sidebar-demo-Fluid Hover",
	String(focusedRow()),
);
await press("tab");
check(
	"Tab skips the System menu's other rows and the sub-menu's",
	focusedRow() === "sidebar-demo-Accordion",
	String(focusedRow()),
);
await press("shift-tab");
check(
	"Shift+Tab goes back",
	focusedRow() === "sidebar-demo-Fluid Hover",
	String(focusedRow()),
);

// Arrows move within one menu (the System menu here) and wrap at its ends.
focus("sidebar-demo-Fluid Hover");
await settle();
await press("down");
check("ArrowDown moves to the next row", focusedRow() === "sidebar-demo-Motion", String(focusedRow()));
check("ring shows after keyboard focus", ringBounds() !== undefined);
await press("up");
check("ArrowUp moves back", focusedRow() === "sidebar-demo-Fluid Hover", String(focusedRow()));
await press("up");
check("ArrowUp wraps to the menu's last row", focusedRow() === "sidebar-demo-Skill", String(focusedRow()));
await press("home");
check("Home goes to the first row", focusedRow() === "sidebar-demo-Fluid Hover", String(focusedRow()));
await press("end");
check("End goes to the last row", focusedRow() === "sidebar-demo-Skill", String(focusedRow()));
await press("home");
await press("right");
check("ArrowRight moves to the next row", focusedRow() === "sidebar-demo-Motion", String(focusedRow()));
await press("left");
check("ArrowLeft moves to the previous row", focusedRow() === "sidebar-demo-Fluid Hover", String(focusedRow()));

// Enter and Space activate.
await press("down");
await press("enter");
check("Enter activates the row", current("sidebar-demo-Motion") === "Page", String(current("sidebar-demo-Motion")));
await press("down");
// simulateKeystrokes sends the key down only; Space activates on release.
const space = element("sidebar-demo-Scrollbars").id;
renderer.nativeSimulateKeyDown(space, "space");
renderer.nativeSimulateKeyUp(space, "space");
await settle(300);
check("Space activates the row", current("sidebar-demo-Scrollbars") === "Page", String(current("sidebar-demo-Scrollbars")));

// Sub-menu rows are in the order while open and skipped while collapsed.
focus("sidebar-demo-Button");
await settle();
await press("down");
check(
	"ArrowDown from the open Button row enters the sub-menu",
	focusedRow() === "sidebar-demo-Variants",
	String(focusedRow()),
);
focus("sidebar-demo-Button");
await settle();
await press("enter");
await settle(600);
focus("sidebar-demo-Button");
await settle();
await press("down");
check(
	"ArrowDown skips collapsed sub-rows",
	focusedRow() === "sidebar-demo-Badge",
	String(focusedRow()),
);
await press("up");
check(
	"ArrowUp skips collapsed sub-rows",
	focusedRow() === "sidebar-demo-Button",
	String(focusedRow()),
);

// A pointer click shows no ring.
await click("sidebar-demo-Motion");
await settle(300);
check("pointer click leaves no ring", ringBounds() === undefined);

// The page's own sidebar scrolls: keyboard focus brings the row into view.
const lastNav = demos[demos.length - 1];
if (lastNav === undefined) throw new Error("no demos");
focus("nav-accordion");
await settle();
await press("end");
await settle(400);
const lastBox = bounds(`nav-${lastNav.slug}`);
check(
	"End on the page sidebar scrolls the last row into view",
	renderer.getFocusedElementId() === element(`nav-${lastNav.slug}`).id &&
		lastBox.y + lastBox.height <= 780,
	`y ${lastBox.y} h ${lastBox.height}`,
);

process.exit(failed ? 1 : 0);
