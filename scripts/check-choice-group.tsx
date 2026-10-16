/**
 * Checkbox / radio group fixes, measured on captured pixels per frame (dark theme).
 *
 *   bun scripts/check-choice-group.tsx
 *
 *  - the group's `size` sizes the checkbox square (14 px compact, 16 px default),
 *  - a selected run is there at once when it mounts (no fade-in),
 *  - a run that vanishes fades out over its 0.12 s exit instead of cutting.
 */
import { mkdirSync } from "node:fs";
import { createTestRoot } from "@gpuix/solid/testing";
import { App } from "../src/app";
import { loadDemos, loadPages } from "../src/lib/demo";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";
import { readPng } from "./png-pixels";

const outDir = "/tmp/check-choice-group/";
mkdirSync(outDir, { recursive: true });
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 1000, height: 400, fonts });
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

/** Right of the label, so nothing but the row's fills shows there. */
function pointIn(testId: string) {
	const box = bounds(testId);
	return {
		x: Math.round(box.x + box.width - 20),
		y: Math.round(box.y + box.height / 2),
	};
}

interface Sample {
	ms: number;
	value: number;
}

/** The red channel at each point on every frame for `ms`, stamped from `start`. */
async function sampleFrames(
	points: Record<string, () => { x: number; y: number } | undefined>,
	ms: number,
	start = performance.now(),
) {
	const series: Record<string, Sample[]> = {};
	for (const name of Object.keys(points)) series[name] = [];
	do {
		frame();
		renderer.captureScreenshot(`${outDir}frame.png`);
		const stamp = performance.now() - start;
		const pixels = readPng(`${outDir}frame.png`);
		for (const [name, point] of Object.entries(points)) {
			const at = point();
			if (at !== undefined) {
				(series[name] as Sample[]).push({
					ms: Math.round(stamp),
					value: pixels.at(at.x, at.y)[0],
				});
			}
		}
		await sleep(4);
	} while (performance.now() - start < ms);
	return series;
}
const show = (samples: Sample[]) =>
	samples.map((sample) => `${sample.ms}:${sample.value}`).join(" ");

const demos = await loadDemos();
const pages = await loadPages(demos);
setThemeChoice("dark");

// Mount: checked row 0 against unchecked row 3, from the first frame.
const mountStart = performance.now();
test.render(() => <App demos={demos} pages={pages} initialPage="checkbox-group" />);
const optional = (testId: string) => () => {
	const element = renderer.findByTestId(testId);
	if (element === undefined || renderer.getElementBounds(element.id) === null) {
		return undefined;
	}
	return pointIn(testId);
};
const mount = await sampleFrames(
	{ checked: optional("box-0"), plain: optional("box-3") },
	1200,
	mountStart,
);
const checked = mount.checked as Sample[];
const plain = mount.plain as Sample[];
const settled = (checked[checked.length - 1] as Sample).value;
const rest = (plain[plain.length - 1] as Sample).value;
console.log("mount", show(checked));
const firstLit = checked.find((sample) => sample.value > rest + 1);
if (firstLit === undefined) throw new Error("the checked row never lit");
report(
	"a checked run appears without a fade-in",
	firstLit.value >= settled - 1,
	`row at rest ${rest}, checked ${settled}, first lit frame ${firstLit.ms} ms: ${firstLit.value}`,
);

// Size: the group pins the square.
for (const [id, expected] of [
	["box-0-box", 16],
	["small-0-box", 14],
] as const) {
	const box = bounds(id);
	report(
		`${id} width`,
		Math.round(box.width) === expected,
		`${box.width} (want ${expected})`,
	);
}

// Vanish: uncheck the only checked row; the pointer leaves with the click, so its hover fill is gone within 60 ms.
const row = pointIn("box-0");
renderer.nativeSimulateMouseMove(990, 390);
await settle(400);
const clickedAt = performance.now();
renderer.nativeSimulateClick(row.x, row.y);
renderer.nativeSimulateMouseMove(990, 390);
const vanish = await sampleFrames({ row: () => row }, 450, clickedAt);
const fade = vanish.row as Sample[];
console.log("vanish", show(fade));
const lingering = fade.filter(
	(sample) => sample.ms >= 75 && sample.ms <= 105 && sample.value > rest + 3,
);
report(
	"a vanishing run fades out",
	lingering.length > 0,
	`between 75 and 105 ms after the click ${lingering.length > 0 ? `still ${show(lingering)}` : "the fill is already gone"} (rest ${rest})`,
);

test.unmount();
process.exit(failed ? 1 : 0);
