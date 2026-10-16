/**
 * Tabs: the pills move on a click, before a controlled parent answers.
 *
 *   bun scripts/check-tabs.tsx
 *
 * `veto` is a controlled list whose parent never accepts a change; `late` is a
 * controlled list whose parent accepts it 600 ms after the click. The source
 * keeps an optimistic index, so a click moves the selected pill at once and a
 * vetoed click leaves it on the clicked tab.
 */
import { createSignal } from "solid-js";
import { TabItem, Tabs, TabsList } from "../src/components/tabs";
import { createCheck } from "./check-kit";

const [lateValue, setLateValue] = createSignal("a");
const kit = await createCheck(() => (
	<div
		style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}
	>
		<Tabs value="a" onValueChange={() => {}}>
			<TabsList testId="veto">
				<TabItem testId="veto-a" value="a" label="Overview" />
				<TabItem testId="veto-b" value="b" label="Analytics" />
			</TabsList>
		</Tabs>
		<Tabs
			value={lateValue()}
			onValueChange={(value) => setTimeout(() => setLateValue(value), 600)}
		>
			<TabsList testId="late">
				<TabItem testId="late-a" value="a" label="Overview" />
				<TabItem testId="late-b" value="b" label="Analytics" />
			</TabsList>
		</Tabs>
	</div>
));
await kit.settle(800);

const near = (a: number, b: number) => Math.abs(a - b) < 0.5;

const vetoStart = kit.bounds("veto-selected").x;
kit.check(
	"the pill starts on the selected tab",
	near(vetoStart, kit.bounds("veto-a").x),
);
await kit.click("veto-b");
await kit.settle(400);
kit.check(
	"a vetoed click leaves the pill on the clicked tab",
	near(kit.bounds("veto-selected").x, kit.bounds("veto-b").x),
	`pill ${kit.bounds("veto-selected").x.toFixed(1)}, tab ${kit.bounds("veto-b").x.toFixed(1)}`,
);
kit.check(
	"the tab itself stays unselected",
	kit.aria("veto-b")?.selected !== true,
);

const lateStart = kit.bounds("late-a").x;
const lateTarget = kit.bounds("late-b").x;
kit.renderer.nativeSimulateClick(
	kit.center("late-b").x,
	kit.center("late-b").y,
);
await kit.settle(150);
const pill = kit.bounds("late-selected").x;
kit.check(
	"the pill has left for the clicked tab before the parent answers",
	pill > lateStart + (lateTarget - lateStart) * 0.5,
	`pill ${pill.toFixed(1)} of ${lateStart.toFixed(1)}..${lateTarget.toFixed(1)}`,
);
await kit.settle(900);
kit.check(
	"it settles on the tab once the parent answers",
	near(kit.bounds("late-selected").x, kit.bounds("late-b").x),
);

kit.finish();
