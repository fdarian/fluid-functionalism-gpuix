import { createSignal, For } from "solid-js";
import { CheckboxGroup, CheckboxItem } from "../components/checkbox-group";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";

const ITEMS = ["Apples", "Bananas", "Cherries", "Dates"];

function Group(props: {
	testId: string;
	initial: number[];
	size?: "default" | "compact";
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
						size={props.size}
						checked={checked().has(index())}
						onToggle={() => toggle(index())}
					/>
				)}
			</For>
		</CheckboxGroup>
	);
}

export const title = "Checkbox Group";
export const group = "Components";

export function Demo() {
	return (
		<DemoCard title="CheckboxGroup">
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				<DemoRow label="Default">
					<Group testId="box" initial={[0]} />
				</DemoRow>
				<DemoRow label="Compact">
					<Group testId="small" initial={[1, 2]} size="compact" />
				</DemoRow>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("box-2");
	shot.capture("hover");
	await shot.click("box-1");
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
};
