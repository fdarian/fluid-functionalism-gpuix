/**
 * Samples a shared focus ring frame by frame through the offscreen renderer.
 *
 *   bun scripts/focus-check.tsx <demo> <ringTestId> <rowTestIds,comma> <key> [steps]
 *
 * A pointer click on the first row must show no ring. Then `key` is pressed
 * `steps` times (default 2), printing the ring's painted bounds per frame so
 * the spring between rows is visible, and a final click back on the first row must
 * clear the ring. Captures land in `/tmp/focus-check/<demo>/`; set TAB=1 to enter the group with Tab instead of a click, FOCUS=1 to Tab until the first id has focus, POINT=<id> to end with a pointer move there.
 */
import { mkdirSync } from "node:fs";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const [slug, ringId, rowList, key, stepsArg] = process.argv.slice(2);
if (
	slug === undefined ||
	ringId === undefined ||
	rowList === undefined ||
	key === undefined
) {
	console.error(
		"usage: bun scripts/focus-check.tsx <demo> <ringTestId> <rows> <key> [steps]",
	);
	process.exit(1);
}
const rows = rowList.split(",");
const steps = Number(stepsArg ?? 2);
const outDir = `/tmp/focus-check/${slug}/`;
mkdirSync(outDir, { recursive: true });

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
function ring() {
	const element = renderer.findByTestId(ringId as string);
	if (element === undefined) return undefined;
	return renderer.getElementBounds(element.id) ?? undefined;
}
function fmt(bounds: ReturnType<typeof ring>) {
	if (bounds === undefined) return "none";
	return `x${bounds.x.toFixed(1)} y${bounds.y.toFixed(1)} w${bounds.width.toFixed(1)} h${bounds.height.toFixed(1)}`;
}
function rowBounds(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no row ${testId}`);
	const bounds = renderer.getElementBounds(element.id);
	if (bounds === null) throw new Error(`no bounds for ${testId}`);
	return bounds;
}
async function click(testId: string) {
	const bounds = rowBounds(testId);
	renderer.nativeSimulateClick(
		bounds.x + bounds.width / 2,
		bounds.y + bounds.height / 2,
	);
	await settle(500);
}
async function trace(label: string, keystrokes: string) {
	renderer.simulateKeystrokes(keystrokes);
	console.log(`-- ${label}`);
	const start = performance.now();
	let previous = "";
	do {
		frame();
		const now = fmt(ring());
		if (now !== previous) {
			console.log(
				`${(performance.now() - start).toFixed(0).padStart(4)}ms ${now}`,
			);
			previous = now;
		}
		await sleep(16);
	} while (performance.now() - start < 400);
}

const demos = await loadDemos();
setThemeChoice("dark");
test.render(() => <App demos={demos} initialPage={slug} />);
await settle(800);

const first = rows[0] as string;
const last = first;
for (const row of rows) console.log(row, fmt(rowBounds(row)));
if (process.env.TAB !== undefined) {
	// Keyboard entry: Tab from the top of the page until the ring shows.
	for (let presses = 1; presses <= 40 && ring() === undefined; presses++) {
		renderer.simulateKeystrokes("tab");
		await settle(120);
		if (ring() !== undefined)
			console.log(`tab #${presses} shows the ring: ${fmt(ring())}`);
	}
} else if (process.env.FOCUS !== undefined) {
	// Virtual highlight (select): the trigger keeps focus, keys drive the ring.
	const element = renderer.findByTestId(first);
	if (element === undefined) throw new Error(`no element ${first}`);
	for (let presses = 1; presses <= 60; presses++) {
		if (renderer.getFocusedElementId() === element.id) break;
		renderer.simulateKeystrokes("tab");
		await settle(60);
	}
	if (renderer.getFocusedElementId() !== element.id) {
		throw new Error(`Tab never reached ${first}`);
	}
} else {
	await click(first);
	console.log(`after pointer click on ${first}: ring ${fmt(ring())}`);
}
for (let step = 0; step < steps; step++) {
	await trace(`${key} #${step + 1}`, key);
	renderer.captureScreenshot(`${outDir}focus-${step + 1}.png`);
}
if (process.env.POINT !== undefined) {
	const bounds = rowBounds(process.env.POINT);
	renderer.nativeSimulateMouseMove(bounds.x + 20, bounds.y + bounds.height / 2);
	await settle(300);
	console.log(`after pointer move over ${process.env.POINT}: ring ${fmt(ring())}`);
} else {
	await click(last);
	console.log(`after pointer click on ${last}: ring ${fmt(ring())}`);
}
renderer.captureScreenshot(`${outDir}focus-pointer.png`);
process.exit(0);
