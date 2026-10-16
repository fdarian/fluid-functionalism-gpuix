/**
 * `Icon easeStroke` against a plain `Icon`, measured on captured pixels.
 *
 *   bun scripts/check-icon.tsx
 *
 * Both draw a chevron whose stroke goes 1.5 to 2. The plain one swaps its SVG
 * source, so it is at the final width on the first frame; the eased one starts
 * at the old width and reaches the final one over 80 ms. The motion clock is
 * held and stepped by hand so a slow frame cannot skip the middle.
 */
import { createSignal } from "solid-js";
import { Icon } from "../src/lib/icon";
import { color } from "../src/lib/theme";
import { createCheck } from "./check-kit";

const [stroke, setStroke] = createSignal(1.5);

const k = await createCheck(
	() => (
		<div
			style={{ display: "flex", flexDirection: "row", gap: 40, padding: 40 }}
		>
			<div testId="eased" style={{ width: 64, height: 64 }}>
				<Icon
					name="chevron-down"
					size={64}
					strokeWidth={stroke()}
					easeStroke
					color={color.foreground}
				/>
			</div>
			<div testId="plain" style={{ width: 64, height: 64 }}>
				<Icon
					name="chevron-down"
					size={64}
					strokeWidth={stroke()}
					color={color.foreground}
				/>
			</div>
		</div>
	),
	{ width: 300, height: 200, initialSettleMs: 400 },
);
const renderer = k.renderer;

function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
const eased = () => k.coverage(k.bounds("eased"));
const plain = () => k.coverage(k.bounds("plain"));

const easedThin = eased();
const plainThin = plain();
renderer.clockPause();
setStroke(2);
step(0);
const easedStart = eased();
const plainStart = plain();
step(16);
const easedMid = eased();
step(300);
const easedEnd = eased();
const plainEnd = plain();
renderer.clockResume();

k.check(
	"plain: the stroke switches on the first frame",
	plainStart > plainThin + 1 && Math.abs(plainStart - plainEnd) < 0.5,
	`thin ${plainThin.toFixed(2)}, first frame ${plainStart.toFixed(2)}, end ${plainEnd.toFixed(2)}`,
);
k.check(
	"easeStroke: the first frame is still the old width",
	Math.abs(easedStart - easedThin) < 0.5,
	`thin ${easedThin.toFixed(2)}, first frame ${easedStart.toFixed(2)}`,
);
k.check(
	"easeStroke: 16 ms in, the stroke is between the old and the new width",
	easedMid > easedStart + 0.5 && easedMid < easedEnd - 0.5,
	`first ${easedStart.toFixed(2)}, 16 ms ${easedMid.toFixed(2)}, end ${easedEnd.toFixed(2)}`,
);
k.check(
	"easeStroke: ends at the same width as the plain icon",
	Math.abs(easedEnd - plainEnd) < 1,
	`eased ${easedEnd.toFixed(2)}, plain ${plainEnd.toFixed(2)}`,
);

k.finish();
