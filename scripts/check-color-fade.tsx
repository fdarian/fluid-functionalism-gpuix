/**
 * `colorFade` and `fade(...)` on captured pixels: a colour list that eases whether the change comes from a signal or
 * from a state style, and a comma list that carries a box shadow beside the colours.
 *
 *   bun scripts/check-color-fade.tsx
 *
 * The motion clock is held and stepped by hand, so a slow frame cannot skip the middle of the 80 ms.
 */
import { createSignal } from "solid-js";
import { colorFade, fade } from "#/lib/theme";
import { createCheck } from "./check-kit";
import { readPng } from "./png-pixels";

const [on, setOn] = createSignal(false);

const k = await createCheck(
	() => (
		<div
			style={{ display: "flex", flexDirection: "row", gap: 20, padding: 20 }}
		>
			<div
				testId="signal"
				style={{
					width: 40,
					height: 40,
					backgroundColor: on() ? "#ffffff" : "#000000",
					...colorFade,
				}}
			/>
			<div
				testId="hover"
				style={{
					width: 40,
					height: 40,
					backgroundColor: "#000000",
					...colorFade,
					hover: { backgroundColor: "#ffffff" },
				}}
			/>
			<div
				testId="border"
				style={{
					width: 40,
					height: 40,
					borderWidth: 10,
					borderStyle: "solid",
					borderColor: on() ? "#ffffff" : "#000000",
					...colorFade,
				}}
			/>
			<div
				testId="shadow"
				style={{
					width: 40,
					height: 40,
					margin: 20,
					boxShadow: on() ? "0 0 0 20px #ffffff" : "0 0 0 20px #000000",
					...fade(["color", "box-shadow"], 80),
				}}
			/>
			<div
				testId="plain"
				style={{
					width: 40,
					height: 40,
					backgroundColor: on() ? "#ffffff" : "#000000",
				}}
			/>
		</div>
	),
	{ width: 500, height: 150, initialSettleMs: 300 },
);
const renderer = k.renderer;

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}

/** The red channel at `dx`, `dy` from the element's top-left. */
function red(testId: string, dx: number, dy: number) {
	renderer.captureScreenshot(`/tmp/check-color-fade-${process.pid}.png`);
	const box = k.bounds(testId);
	return readPng(`/tmp/check-color-fade-${process.pid}.png`).at(
		Math.round(box.x + dx),
		Math.round(box.y + dy),
	)[0];
}

const probes = [
	{ id: "signal", dx: 20, dy: 20 },
	{ id: "hover", dx: 20, dy: 20 },
	{ id: "border", dx: 5, dy: 20 },
	{ id: "shadow", dx: -10, dy: 20 },
];

renderer.clockPause();
const before = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
setOn(true);
const hoverPoint = k.center("hover");
renderer.nativeSimulateMouseMove(hoverPoint.x - 1, hoverPoint.y);
renderer.nativeSimulateMouseMove(hoverPoint.x, hoverPoint.y);
step(0);
step(16);
const middle = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
const plainMiddle = red("plain", 20, 20);
step(300);
const after = probes.map((probe) => red(probe.id, probe.dx, probe.dy));
renderer.clockResume();

for (const [index, probe] of probes.entries()) {
	k.check(
		`${probe.id}: 16 ms in, between the old and the new colour`,
		middle[index] > before[index] + 2 && middle[index] < after[index] - 2,
		`before ${before[index]}, 16 ms ${middle[index]}, end ${after[index]}`,
	);
}
k.check("unfaded element: switches on the first frame", plainMiddle > 240, `${plainMiddle}`);

await k.finish();
