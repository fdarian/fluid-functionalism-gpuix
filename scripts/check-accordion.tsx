/**
 * Accordion paint order, measured on captured pixels (light theme).
 *
 *   bun scripts/check-accordion.tsx
 *
 * The source paints the open tint, then the hover fill, then the rows, with the
 * focus ring above everything. Over the open row's tint:
 *  - the ring's bottom edge must keep the full ring colour,
 *  - the hover fill must darken the tint by exactly its own 4% black, which
 *    it does only when the fill is painted after the tint.
 */
import { mkdirSync } from "node:fs";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";
import { readPng } from "./png-pixels";

const outDir = "/tmp/check-accordion/";
mkdirSync(outDir, { recursive: true });
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
function bounds(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no element ${testId}`);
	const box = renderer.getElementBounds(element.id);
	if (box === null) throw new Error(`no bounds for ${testId}`);
	return box;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

const demos = await loadDemos();
setThemeChoice("light");
test.render(() => <App demos={demos} initialPage="accordion" />);
await settle(800);

const row = bounds("single-1");
// Right of the label, left of the chevron: bare row surface.
const sample = {
	x: Math.round(row.x + row.width - 60),
	y: Math.round(row.y + row.height / 2),
};

renderer.nativeSimulateMouseMove(1180, 700);
await settle(500);
renderer.captureScreenshot(`${outDir}rest.png`);
const rest = readPng(`${outDir}rest.png`).at(sample.x, sample.y);

renderer.nativeSimulateMouseMove(sample.x, sample.y);
await settle(600);
renderer.captureScreenshot(`${outDir}hover.png`);
const hovered = readPng(`${outDir}hover.png`).at(sample.x, sample.y);
for (let channel = 0; channel < 3; channel++) {
	const expected = (rest[channel] as number) * 0.96;
	const got = hovered[channel] as number;
	report(
		`hover fill over the open tint, channel ${channel}`,
		Math.abs(got - expected) <= 0.8,
		`tint ${rest[channel]} -> ${got}, fill-after-tint gives ${expected.toFixed(1)}`,
	);
}

renderer.nativeSimulateMouseMove(1180, 700);
await settle(500);
const element = renderer.findByTestId("single-1");
if (element === undefined) throw new Error("no single-1");
for (let presses = 0; presses < 60; presses++) {
	if (renderer.getFocusedElementId() === element.id) break;
	renderer.simulateKeystrokes("tab");
	await settle(60);
}
if (renderer.getFocusedElementId() !== element.id)
	throw new Error("Tab never reached single-1");
await settle(500);
renderer.captureScreenshot(`${outDir}ring.png`);
const ring = readPng(`${outDir}ring.png`);
const column = Math.round(row.x + row.width / 2);
let best = Infinity;
let bestAt = 0;
for (
	let y = Math.round(row.y + row.height) - 1;
	y <= Math.round(row.y + row.height) + 4;
	y++
) {
	const pixel = ring.at(column, y);
	const distance =
		Math.abs(pixel[0] - 0x6b) +
		Math.abs(pixel[1] - 0x97) +
		Math.abs(pixel[2] - 0xff);
	if (distance < best) {
		best = distance;
		bestAt = y;
	}
}
report(
	"ring bottom edge over the open tint",
	best <= 6,
	`closest to #6B97FF is ${best} off at y=${bestAt}: ${ring.at(column, bestAt)}`,
);

process.exit(failed ? 1 : 0);
