/**
 * Where the preview pill starts after the pointer rested on the selected tab.
 *
 *   bun scripts/check-preview-pill.tsx
 *
 * Hover tab 2, then the selected tab 0 (the pill fades in place), then tab 3.
 * The source unmounts the pill after the fade and mounts a new one at the
 * selected pill, so the pill must be seen left of tab 2 on its way out; resuming
 * from tab 2 never goes left of it. The first sample is taken a frame (about
 * 15 ms of spring) after the move, so on the ported pages' slower frames the pill
 * is already near tab 2: only a start left of tab 2's own edge is asserted.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1240, height: 780, fonts });
const renderer = test.renderer;

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
function bounds(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) return undefined;
	return renderer.getElementBounds(element.id) ?? undefined;
}
function need(testId: string) {
	const box = bounds(testId);
	if (box === undefined) throw new Error(`no bounds for ${testId}`);
	return box;
}
async function moveTo(testId: string, ms: number) {
	const box = need(testId);
	renderer.nativeSimulateMouseMove(
		box.x + box.width / 2,
		box.y + box.height / 2,
	);
	await settle(ms);
}

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");
test.render(() => (
	<App demos={demos} pages={pages} initialPage={process.argv[2] ?? "tabs"} />
));
await settle(800);

const list = process.argv[3] ?? "basic-list";
const tabs = (
	process.argv[4] ??
	"basic-library,basic-recents,basic-favorites,basic-settings"
).split(",");
const [selected, , far, last] = tabs as [string, string, string, string];

/** One run of the sequence: the x of the pill on each frame after the last move. A slow first frame lets the spring run ahead, so a run can miss the start; the caller retries. */
async function attempt() {
	await moveTo("theme", 300);
	await moveTo(far, 400);
	await moveTo(selected, 400);
	const lastBox = need(last);
	renderer.nativeSimulateMouseMove(
		lastBox.x + lastBox.width / 2,
		lastBox.y + lastBox.height / 2,
	);
	const xs: number[] = [];
	for (let step = 0; step < 8; step++) {
		frame();
		const pill = bounds(`${list}-preview`);
		if (pill !== undefined) xs.push(pill.x);
		await sleep(2);
	}
	if (xs.length === 0) throw new Error("no preview pill");
	return xs;
}

const box = need(selected);
const farBox = need(far);
let ok = false;
let xs: number[] = [];
for (let tries = 0; tries < 4 && !ok; tries++) {
	xs = await attempt();
	ok = Math.min(...xs) < farBox.x;
}
console.log(
	`${ok ? "PASS" : "FAIL"} preview pill leaves the selected tab: x per frame ${xs.map((x) => x.toFixed(0)).join(" ")}; selected tab x ${box.x.toFixed(1)}, previously hovered tab x ${farBox.x.toFixed(1)}`,
);
process.exit(ok ? 0 : 1);
