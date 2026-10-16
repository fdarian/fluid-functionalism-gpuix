import { createSignal, For, Show } from "solid-js";
import { CheckboxGroup, CheckboxItem } from "../components/checkbox-group";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

const ITEMS = ["Apples", "Bananas", "Cherries", "Dates"];

function Group(props: {
	testId: string;
	initial: number[];
	size?: "default" | "compact";
	readout?: boolean;
}) {
	const [checked, setChecked] = createSignal<ReadonlySet<number>>(
		new Set(props.initial),
	);
	const toggle = (index: number) => {
		const next = new Set(checked());
		if (next.has(index)) next.delete(index);
		else next.add(index);
		setChecked(next);
	};
	return (
		<>
			<CheckboxGroup
				testId={props.testId}
				checkedIndices={checked()}
				size={props.size}
			>
				<For each={ITEMS}>
					{(label: string, index) => (
						<CheckboxItem
							testId={`${props.testId}-${index()}`}
							index={index()}
							label={label}
							checked={checked().has(index())}
							onToggle={() => toggle(index())}
						/>
					)}
				</For>
			</CheckboxGroup>
			<Show when={props.readout === true}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{`Checked: ${[...checked()].sort().join(",")}`}
				</text>
			</Show>
		</>
	);
}

export const title = "Checkbox Group";
export const group = "Components";

export function Demo() {
	return (
		<DemoCard title="CheckboxGroup">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<DemoRow label="Default">
					<Group testId="box" initial={[0]} readout />
				</DemoRow>
				<DemoRow label="Compact">
					<Group testId="small" initial={[1, 2]} size="compact" />
				</DemoRow>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The label is the likeliest thing under the pointer: hover and click must work over it.
	const row = shot.centerOf("box-2");
	await shot.moveTo(row.x - 144 + 60, row.y);
	shot.capture("hover");
	await shot.clickAt(shot.centerOf("box-1").x - 144 + 60, shot.centerOf("box-1").y);
	shot.expectText("Bananas", true);
	await shot.hover("box-2");
	shot.capture("checked-pair");
	// Checking the row between two checked runs merges them.
	await shot.click("box-3");
	await shot.click("box-2");
	await shot.moveTo(1180, 700);
	shot.capture("merged");
	await shot.click("box-1");
	await shot.moveTo(1180, 700);
	shot.capture("split");
	await shot.click("box-0");
	await shot.press("down");
	shot.capture("keyboard-focus");
	await shot.press("space");
	shot.capture("keyboard-toggled");
	// Enter and Space both toggle the focused row; End and Home jump to the last and first row without toggling.
	shot.expectText("Checked: 1,2,3", true);
	await shot.press("enter");
	shot.expectText("Checked: 2,3", true);
	await shot.press("end");
	shot.expectText("Checked: 2,3", true);
	await shot.press("space");
	shot.expectText("Checked: 2", true);
	await shot.press("home");
	await shot.press("space");
	shot.expectText("Checked: 0,2", true);
	shot.expectAria("box-0", { role: "CheckBox", toggled: "True" });
	shot.expectAria("box-1", { toggled: "False" });
};
