/**
 * TabsSubtle label gap, measured on layout bounds.
 *
 *   bun scripts/check-tabs-subtle.tsx
 *
 * An unfolded `activeLabel` tab is the plain icon-and-label tab with the icon
 * gap swapped for the label's own margin: 8 default, 6 compact. The plain tab's
 * gap is 8 / 4, so the width difference is margin - gap.
 */
import { createTestRoot } from "@gpuix/solid/testing";
import { TabsSubtle, TabsSubtleItem } from "../src/components/tabs-subtle";
import { fonts } from "../src/lib/fonts";
import { setThemeChoice } from "../src/lib/theme";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const test = createTestRoot({ width: 600, height: 300, fonts });
const renderer = test.renderer;

async function settle(ms: number) {
	const until = performance.now() + ms;
	do {
		renderer.flush();
		renderer.dispatchNativeEvents();
		await sleep(16);
	} while (performance.now() < until);
}
function width(testId: string) {
	const element = renderer.findByTestId(testId);
	if (element === undefined) throw new Error(`no element ${testId}`);
	const box = renderer.getElementBounds(element.id);
	if (box === null) throw new Error(`no bounds for ${testId}`);
	return box.width;
}
let failed = false;
function report(name: string, ok: boolean, detail: string) {
	if (!ok) failed = true;
	console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}

setThemeChoice("dark");
test.render(() => (
	<div
		style={{ display: "flex", flexDirection: "column", gap: 12, padding: 20 }}
	>
		{(["default", "compact"] as const).map((size) => (
			<>
				<TabsSubtle selectedIndex={0} onSelect={() => {}} size={size}>
					<TabsSubtleItem
						testId={`${size}-plain`}
						index={0}
						icon="clock"
						label="Recents"
					/>
				</TabsSubtle>
				<TabsSubtle
					selectedIndex={0}
					onSelect={() => {}}
					size={size}
					activeLabel
				>
					<TabsSubtleItem
						testId={`${size}-active`}
						index={0}
						icon="clock"
						label="Recents"
					/>
				</TabsSubtle>
			</>
		))}
	</div>
));
await settle(800);

const expected = { default: 8, compact: 6 } as const;
const iconGap = { default: 8, compact: 4 } as const;
for (const size of ["default", "compact"] as const) {
	const margin =
		width(`${size}-active`) - width(`${size}-plain`) + iconGap[size];
	report(
		`${size}: label margin`,
		Math.abs(margin - expected[size]) < 0.5,
		`${margin.toFixed(2)} (want ${expected[size]})`,
	);
}
process.exit(failed ? 1 : 0);
