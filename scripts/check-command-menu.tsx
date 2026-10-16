/**
 * Scenario checks for the command menu and the site shell, through the offscreen renderer.
 *
 *   bun scripts/check-command-menu.tsx
 *
 * Prints PASS / FAIL lines and exits 1 on any FAIL. Covers: modified arrows with
 * tabs mounted, the scrim finishing its fade, keyboard focus after a tab click,
 * the `mod++` cap, the site menu's ⌘K matching, and the home hero's buttons.
 */
import { clipboard } from "@gpuix/solid";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { formatShortcut } from "../src/components/command-menu";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { IS_MAC } from "../src/lib/platform";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

let failures = 0;
function check(name: string, pass: boolean, detail?: string) {
	if (!pass) failures++;
	console.log(
		`${pass ? "PASS" : "FAIL"} ${name}${detail === undefined ? "" : ` (${detail})`}`,
	);
}

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
function find(testId: string) {
	return renderer.findByTestId(testId);
}
function present(testId: string) {
	return find(testId) !== undefined;
}
function boundsOf(testId: string) {
	const element = find(testId);
	if (element === undefined) throw new Error(`no element ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no bounds for ${testId}`);
	return bounds;
}
async function click(testId: string) {
	const bounds = boundsOf(testId);
	renderer.nativeSimulateClick(
		bounds.x + bounds.width / 2,
		bounds.y + bounds.height / 2,
	);
	await settle(300);
}
async function press(keystrokes: string, ms = 250) {
	renderer.simulateKeystrokes(keystrokes);
	await settle(ms);
}
function focusedTestId() {
	const id = renderer.getFocusedElementId();
	if (id === null || id === undefined) return undefined;
	const input = find("site-menu-input");
	return input !== undefined && input.id === id
		? "site-menu-input"
		: `element ${id}`;
}

// ─── formatShortcut ──────────────────────────────────────────────────────────

const plus = formatShortcut("mod++");
check(
	"mod++ keeps the + key",
	plus.length === 2 && plus[1] === "+",
	JSON.stringify(plus),
);
const comma = formatShortcut("mod+,");
check(
	"mod+, keeps the comma",
	comma.length === 2 && comma[1] === ",",
	JSON.stringify(comma),
);
check("a bare + is one cap", JSON.stringify(formatShortcut("+")) === '["+"]');

const demos = await loadDemos();
setThemeChoice("dark");
test.render(() => <App demos={demos} />);
await settle(800);

// ─── The site menu ───────────────────────────────────────────────────────────

const isOpen = () => present("site-menu-input");
const tabState = () => {
	const pages = present("site-menu-row-showcase");
	const settings = present("site-menu-row-theme:dark");
	if (pages && settings) return "all";
	if (pages) return "page";
	if (settings) return "setting";
	return "none";
};
const mod = IS_MAC ? "cmd" : "ctrl";

// The key a layout types is what counts: gpuix's `code` is derived from `key`, so
// the key that types "t" (Dvorak's physical K) reports key "t", code "KeyT".
await press(`${mod}-t`);
check(`${mod}-t does not open the menu`, !isOpen());
await press(`${mod}-alt-k`);
check(`${mod}-alt-k does not open the menu`, !isOpen());
await press(`${mod}-k`);
check(`${mod}-k opens the menu`, isOpen());
await press(`${mod}-k`, 400);
check(`${mod}-k closes it again`, !isOpen());

// ─── Modified arrows ─────────────────────────────────────────────────────────

await press(`${mod}-k`, 400);
check("menu open for the arrow checks", isOpen());
check("starts on All", tabState() === "all", tabState());
for (const modifier of ["shift", "alt", "ctrl", "cmd"]) {
	await press(`${modifier}-right`);
	check(`${modifier}-right keeps the tab`, tabState() === "all", tabState());
	await press(`${modifier}-left`);
	check(`${modifier}-left keeps the tab`, tabState() === "all", tabState());
}
await press("right");
check("bare right switches to Pages", tabState() === "page", tabState());
await press("left");
check("bare left switches back to All", tabState() === "all", tabState());

// ─── A tab click keeps the keyboard in the field ─────────────────────────────

await click("site-menu-tab-page");
check("tab click switches to Pages", tabState() === "page", tabState());
const focused = focusedTestId();
check(
	"the field keeps focus after a tab click",
	focused === "site-menu-input",
	focused,
);
await press("right");
check("right after a tab click moves to Settings", tabState() === "setting", tabState());

// ─── The scrim finishes its fade ─────────────────────────────────────────────

await press("escape", 400);
check("escape closes the menu", !isOpen());
await press(`${mod}-k`, 500);
renderer.simulateKeystrokes("escape");
const closedAt = performance.now();
while (isOpen() && performance.now() - closedAt < 1000) {
	frame();
	await sleep(2);
}
const unmountMs = performance.now() - closedAt;
// The scrim's exit tween (`moderateExit`) runs 120 ms.
check(
	"the layer outlives the scrim's 120 ms exit",
	unmountMs >= 120,
	`${unmountMs.toFixed(0)} ms`,
);

// ─── The home hero ───────────────────────────────────────────────────────────

await click("nav-showcase");
await clipboard.writeText("untouched");
await click("hero-copy");
const copied = await clipboard.readText();
check(
	"Copy install prompt writes the starter prompt",
	copied.startsWith("Start a new React app with Fluid Functionalism"),
	JSON.stringify(copied.slice(0, 50)),
);

console.log(failures === 0 ? "all passed" : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
