/**
 * TabsSubtle label gap and fold, measured on layout bounds.
 *
 *   bun scripts/check-tabs-subtle.tsx
 *
 * An unfolded `activeLabel` tab is the plain icon-and-label tab with the icon
 * gap swapped for the label's own margin: 8 default, 6 compact. The plain tab's
 * gap is 8 / 4, so the width difference is margin - gap.
 *
 * Moving the selection folds one label and unfolds another, both on
 * `spring.fast` (a bounce-free 80 ms spring): the widths travel between their
 * two ends in a few frames and never overshoot.
 */
import { createSignal } from "solid-js";
import { TabsSubtle, TabsSubtleItem } from "#/components/tabs-subtle";
import { createCheck } from "./check-kit";

const [selected, setSelected] = createSignal(0);
const kit = await createCheck(() => (
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
		<TabsSubtle
			selectedIndex={selected()}
			onSelect={setSelected}
			activeLabel
			size="default"
		>
			<TabsSubtleItem testId="first" index={0} icon="clock" label="Recents" />
			<TabsSubtleItem testId="second" index={1} icon="star" label="Starred" />
		</TabsSubtle>
	</div>
));
const renderer = kit.renderer;
const width = (testId: string) => kit.bounds(testId).width;
await kit.settle(800);

const expected = { default: 8, compact: 6 } as const;
const iconGap = { default: 8, compact: 4 } as const;
for (const size of ["default", "compact"] as const) {
	const margin =
		width(`${size}-active`) - width(`${size}-plain`) + iconGap[size];
	kit.check(
		`${size}: label margin`,
		Math.abs(margin - expected[size]) < 0.5,
		`${margin.toFixed(2)} (want ${expected[size]})`,
	);
}

const unfolded = width("first");
const folded = width("second");
// The motion clock is held and stepped by hand, so the frames sampled do not depend on how fast the machine runs them.
renderer.clockPause();
setSelected(1);
kit.step(0);
const firstWidths: number[] = [];
const secondWidths: number[] = [];
for (let frame = 0; frame < 40; frame++) {
	kit.step(8);
	firstWidths.push(width("first"));
	secondWidths.push(width("second"));
}
renderer.clockResume();
const first = (index: number) => firstWidths[index] as number;
const second = (index: number) => secondWidths[index] as number;
const last = firstWidths.length - 1;
kit.check(
	"the old label folds to the icon-only width",
	Math.abs(first(last) - folded) < 0.5,
	`${first(last).toFixed(2)} (want ${folded.toFixed(2)})`,
);
kit.check(
	"the selected tab unfolds to the label width",
	second(last) > folded + 20,
	`${second(last).toFixed(2)} against ${folded.toFixed(2)} folded`,
);
kit.check(
	"folding passes through widths between its ends",
	firstWidths.some((value) => value < unfolded - 0.5 && value > folded + 0.5),
	firstWidths
		.slice(0, 8)
		.map((value) => value.toFixed(1))
		.join(" "),
);
kit.check(
	"unfolding passes through widths between its ends",
	secondWidths.some(
		(value) => value > folded + 0.5 && value < second(last) - 0.5,
	),
	secondWidths
		.slice(0, 8)
		.map((value) => value.toFixed(1))
		.join(" "),
);
kit.check(
	"neither width overshoots its end",
	firstWidths.every(
		(value) => value <= unfolded + 0.5 && value >= folded - 0.5,
	) &&
		secondWidths.every(
			(value) => value >= folded - 0.5 && value <= second(last) + 0.5,
		),
);

kit.finish();
