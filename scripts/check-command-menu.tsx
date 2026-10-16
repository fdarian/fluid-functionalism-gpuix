/**
 * Scenario checks for the command menu and the site shell, through the offscreen renderer.
 *
 *   bun scripts/check-command-menu.tsx
 *
 * Prints PASS / FAIL lines and exits 1 on any FAIL. Covers: the list's scroll
 * travel (arrows animate, Home and a re-filter snap, a second arrow takes over),
 * modified arrows with tabs mounted, the scrim finishing its fade, keyboard
 * focus after a tab click, the `mod++` cap, the site menu's ⌘K matching, and the
 * home hero's buttons.
 */

import { clipboard } from "@gpuix/solid";
import { createHostElement } from "../node_modules/@gpuix/solid/dist/host.js";
import { formatShortcut } from "../src/components/command-menu";
import { IS_MAC } from "../src/lib/platform";
import { createCheck } from "./check-kit";

const kit = await createCheck("command-menu");
const renderer = kit.renderer;
const mod = IS_MAC ? "cmd" : "ctrl";

// ─── formatShortcut ──────────────────────────────────────────────────────────

const plus = formatShortcut("mod++");
kit.check(
	"mod++ keeps the + key",
	plus.length === 2 && plus[1] === "+",
	JSON.stringify(plus),
);
const comma = formatShortcut("mod+,");
kit.check(
	"mod+, keeps the comma",
	comma.length === 2 && comma[1] === ",",
	JSON.stringify(comma),
);
kit.check(
	"a bare + is one cap",
	JSON.stringify(formatShortcut("+")) === '["+"]',
);

// ─── The list's scroll travel ────────────────────────────────────────────────

interface ScrollWrite {
	id: number;
	top: number;
}
const writes: ScrollWrite[] = [];
// The list is scrolled by code only: every write to a scroller's offset passes through here, so a scenario can tell a travel from a jump.
const hostPrototype = Object.getPrototypeOf(createHostElement("div"));
const scrollTopSetter = Object.getOwnPropertyDescriptor(
	hostPrototype,
	"scrollTop",
);
const scrollTo = Object.getOwnPropertyDescriptor(hostPrototype, "scrollTo");
if (scrollTopSetter?.set === undefined || scrollTo?.value === undefined) {
	throw new Error("The host element's scroll members moved");
}
Object.defineProperty(hostPrototype, "scrollTop", {
	...scrollTopSetter,
	set(top: number) {
		writes.push({ id: this.id, top });
		scrollTopSetter.set?.call(this, top);
	},
});
Object.defineProperty(hostPrototype, "scrollTo", {
	...scrollTo,
	value(options: { top?: number }) {
		if (options.top !== undefined)
			writes.push({ id: this.id, top: options.top });
		scrollTo.value.call(this, options);
	},
});

const LIST = "details-list";
const INPUT = "details-input";
const offset = () => {
	const metrics = renderer.getScrollMetrics(kit.element(LIST).id);
	if (metrics === null) throw new Error("the list has no scroll metrics");
	return metrics[1];
};
const listWrites = () =>
	writes.filter((write) => write.id === kit.element(LIST).id);
const sinceMark = (from: number) =>
	listWrites()
		.slice(from)
		.map((w) => w.top);

await kit.focus(INPUT);
// The motion clock is stepped by hand: against wall time a slow frame carries the whole travel in one step.
const FRAME_MS = 16;
const stepFrames = async () => {
	// The travel starts in a microtask after the key handler, so let one run before the first step.
	await Promise.resolve();
	for (let frame = 0; frame < 40; frame++) {
		renderer.clockFastForward(FRAME_MS);
		renderer.flush();
		renderer.dispatchNativeEvents();
		await Promise.resolve();
	}
};
const steppedPress = async (keystrokes: string) => {
	renderer.simulateKeystrokes(keystrokes);
	await stepFrames();
};
renderer.clockPause();
for (let step = 0; step < 4; step++) await steppedPress("down");
const before = offset();
let mark = listWrites().length;
// The travel lasts a handful of frames; stepping the motion clock by hand keeps the sampling independent of how long a real frame takes.
renderer.clockPause();
renderer.simulateKeystrokes("down");
// The menu starts the travel in a microtask after the key handler returns.
await Promise.resolve();
for (let frame = 0; frame < 40; frame++) {
	renderer.clockFastForward(8);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
renderer.clockResume();
const travel = sinceMark(mark);
const after = offset();
kit.check(
	"an arrow past the middle scrolls the list",
	after > before,
	`${before} -> ${after}`,
);
kit.check(
	"the scroll travels in steps, it does not jump",
	travel.filter((top) => top > before + 0.5 && top < after - 0.5).length >= 2,
	travel.map((top) => top.toFixed(1)).join(" "),
);
kit.check(
	"the travel never reverses",
	travel.every((top, index) => index === 0 || top >= travel[index - 1] - 0.01),
);

// A second arrow while the first is travelling takes over from where it is.
await steppedPress("down");
mark = listWrites().length;
renderer.simulateKeystrokes("down");
renderer.simulateKeystrokes("down");
await stepFrames();
const chained = sinceMark(mark);
kit.check(
	"two quick arrows end at the later row",
	offset() >= chained[0],
	`${offset()}`,
);
kit.check(
	"a quick second arrow does not send the scroll backwards",
	chained.every(
		(top, index) => index === 0 || top >= chained[index - 1] - 0.01,
	),
	chained.map((top) => top.toFixed(0)).join(" "),
);

// Home and a move to row 0 snap.
await steppedPress("up");
kit.check("still scrolled one arrow up", offset() > 0, `${offset()}`);
mark = listWrites().length;
renderer.simulateKeystrokes("home");
await stepFrames();
const home = sinceMark(mark);
kit.check(
	"Home snaps to the top in one write",
	home.length > 0 && home.every((top) => top === 0),
	home.join(" "),
);
kit.expect("Home ends at the top", offset(), 0);

// A re-filter snaps to the top too.
await steppedPress("end");
kit.check("End scrolls the list down", offset() > 0, `${offset()}`);
mark = listWrites().length;
renderer.simulateKeystrokes("a");
await stepFrames();
kit.check(
	"typing snaps the list to the top",
	offset() === 0 && sinceMark(mark).every((top) => top === 0),
	sinceMark(mark).join(" "),
);
renderer.clockResume();

// ─── The site menu ───────────────────────────────────────────────────────────

const isOpen = () => kit.exists("site-menu-input");
const tabState = () => {
	const pages = kit.exists("site-menu-row-showcase");
	const settings = kit.exists("site-menu-row-theme:dark");
	if (pages && settings) return "all";
	if (pages) return "page";
	if (settings) return "setting";
	return "none";
};
const focusedTestId = () => {
	const id = renderer.getFocusedElementId();
	if (id === null || id === undefined) return undefined;
	return kit.exists("site-menu-input") &&
		kit.element("site-menu-input").id === id
		? "site-menu-input"
		: `element ${id}`;
};

// The key a layout types is what counts: gpuix's `code` is derived from `key`, so
// the key that types "t" (Dvorak's physical K) reports key "t", code "KeyT".
await kit.press(`${mod}-t`);
kit.check(`${mod}-t does not open the menu`, !isOpen());
await kit.press(`${mod}-alt-k`);
kit.check(`${mod}-alt-k does not open the menu`, !isOpen());
await kit.press(`${mod}-k`);
kit.check(`${mod}-k opens the menu`, isOpen());
await kit.settle(400);
await kit.press(`${mod}-k`);
await kit.settle(400);
kit.check(`${mod}-k closes it again`, !isOpen());

// ─── Modified arrows ─────────────────────────────────────────────────────────

await kit.press(`${mod}-k`);
await kit.settle(400);
kit.check("menu open for the arrow checks", isOpen());
kit.check("starts on All", tabState() === "all", tabState());
for (const modifier of ["shift", "alt", "ctrl", "cmd"]) {
	await kit.press(`${modifier}-right`);
	kit.check(
		`${modifier}-right keeps the tab`,
		tabState() === "all",
		tabState(),
	);
	await kit.press(`${modifier}-left`);
	kit.check(`${modifier}-left keeps the tab`, tabState() === "all", tabState());
}
await kit.press("right");
kit.check("bare right switches to Pages", tabState() === "page", tabState());
await kit.press("left");
kit.check("bare left switches back to All", tabState() === "all", tabState());

// ─── A tab click keeps the keyboard in the field ─────────────────────────────

await kit.click("site-menu-tab-page");
kit.check("tab click switches to Pages", tabState() === "page", tabState());
const focused = focusedTestId();
kit.check(
	"the field keeps focus after a tab click",
	focused === "site-menu-input",
	focused,
);
await kit.press("right");
kit.check(
	"right after a tab click moves to Settings",
	tabState() === "setting",
	tabState(),
);

// ─── The scrim finishes its fade ─────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await kit.press("escape");
await kit.settle(400);
kit.check("escape closes the menu", !isOpen());
await kit.press(`${mod}-k`);
await kit.settle(500);
renderer.simulateKeystrokes("escape");
const closedAt = performance.now();
while (isOpen() && performance.now() - closedAt < 1000) {
	renderer.flush();
	renderer.dispatchNativeEvents();
	await sleep(2);
}
const unmountMs = performance.now() - closedAt;
// The scrim's exit tween (`slowExit`) runs 160 ms.
kit.check(
	"the layer outlives the scrim's 160 ms exit",
	unmountMs >= 160,
	`${unmountMs.toFixed(0)} ms`,
);

// ─── The home hero ───────────────────────────────────────────────────────────

await kit.click("nav-showcase");
await clipboard.writeText("untouched");
await kit.click("hero-copy");
const copied = await clipboard.readText();
kit.check(
	"Copy install prompt writes the starter prompt",
	copied.startsWith("Start a new React app with Fluid Functionalism"),
	JSON.stringify(copied.slice(0, 50)),
);

kit.finish();
