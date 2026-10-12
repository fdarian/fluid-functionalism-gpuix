import { createSignal } from "solid-js";
import { Switch } from "../components/switch";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";

export const title = "Switch";
export const group = "Components";

export function Demo() {
	const [basic, setBasic] = createSignal(false);
	const [compact, setCompact] = createSignal(true);
	return (
		<>
			<DemoCard title="Switch">
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<DemoRow label="Basic">
						<Switch
							testId="basic"
							label="Notifications"
							checked={basic()}
							onToggle={() => setBasic(!basic())}
						/>
					</DemoRow>
					<DemoRow label="On">
						<Switch
							testId="on"
							label="Notifications"
							checked
							onToggle={() => {}}
						/>
					</DemoRow>
					<DemoRow label="Disabled">
						<Switch
							label="Disabled option"
							checked={false}
							onToggle={() => {}}
							disabled
						/>
					</DemoRow>
					<DemoRow label="Compact">
						<Switch
							testId="compact"
							size="compact"
							label="Notifications"
							checked={compact()}
							onToggle={() => setCompact(!compact())}
						/>
					</DemoRow>
				</div>
			</DemoCard>
		</>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-track");
	shot.capture("hover-off");
	await shot.down("basic-track");
	shot.capture("pressed");
	await shot.up("basic-track");
	shot.capture("toggled-on");
	await shot.hover("basic-track");
	shot.capture("hover-on");

	// Drag the thumb from the on end back to the off end, releasing past the midpoint.
	const track = shot.centerOf("basic-track");
	await shot.down("basic-track");
	await shot.moveTo(track.x + 10, track.y);
	await shot.moveTo(track.x - 6, track.y);
	shot.capture("dragging");
	await shot.moveTo(track.x - 14, track.y);
	await shot.up("basic-track");
	shot.capture("dragged-off");

	// Past the row, the thumb should still follow: the press owns the pointer until release.
	await shot.down("basic-track");
	await shot.moveTo(track.x + 300, track.y + 150);
	shot.capture("drag-outside");
	await shot.up("basic-track");

	// A press focuses the track; a key then makes the focus ring visible.
	await shot.click("basic-track");
	await shot.moveTo(1180, 700);
	await shot.press("space");
	shot.capture("focus");
	await shot.press("enter");
	shot.capture("focus-off");
};
