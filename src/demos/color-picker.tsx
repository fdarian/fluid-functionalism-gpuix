import { type Accessor, createSignal, Show } from "solid-js";
import { ColorPicker, ColorPickerPopover } from "../components/color-picker";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

const SWATCHES = [
	"#000000",
	"#FFFFFF",
	"#FF3B30",
	"#F0F0F0",
	"#E5E5E5",
	"#D0D0D0",
	"rgba(0,0,0,0.5)",
];

type Section = "default" | "swatches" | "oklch" | "controlled";

/** The page is taller than the window; scenarios show one card at a time. */
const [only, setOnly] = createSignal<Section | null>(null);
const shows = (section: Section) => only() === null || only() === section;

export const title = "Color Picker";
export const group = "Components";

function Caption(props: { children: string }) {
	return (
		<text style={{ ...scale.caption, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

export function Demo() {
	const [controlled, setControlled] = createSignal("#6B97FF");
	const [fill, setFill] = createSignal<string | null>("#6B97FF");

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<Show when={shows("default")}>
				<DemoCard title="Default and popover">
					<div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
						<ColorPicker testId="default" defaultValue="#6B97FF" />
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: 8,
								alignItems: "flex-start",
							}}
						>
							<Caption>Popover</Caption>
							<ColorPickerPopover
								testId="popover"
								triggerLabel="Fill"
								defaultValue="#6B97FF"
							/>
							<div style={{ height: 8 }} />
							<Caption>Removable trigger</Caption>
							<Show
								when={fill()}
								fallback={
									<div
										role="button"
										testId="add-fill"
										onClick={() => setFill("#6B97FF")}
										style={{
											height: 36,
											paddingLeft: 12,
											paddingRight: 12,
											display: "flex",
											alignItems: "center",
											borderRadius: 8,
											borderWidth: 1,
											borderColor: color.border,
											cursor: "pointer",
										}}
									>
										<text
											style={{ ...scale.body, color: color.mutedForeground }}
										>
											+ Add fill
										</text>
									</div>
								}
							>
								{(value: Accessor<string>) => (
									<ColorPickerPopover
										testId="removable"
										triggerLabel="Fill"
										triggerShowRemove
										onTriggerRemove={() => setFill(null)}
										value={value()}
										onValueChange={setFill}
									/>
								)}
							</Show>
						</div>
					</div>
				</DemoCard>
			</Show>
			<Show when={shows("swatches")}>
				<DemoCard title="With swatches">
					<ColorPicker
						testId="swatches"
						defaultValue="#6B97FF"
						swatches={SWATCHES}
					/>
				</DemoCard>
			</Show>
			<Show when={shows("oklch")}>
				<DemoCard title="OKLCH format">
					<ColorPicker
						testId="oklch"
						defaultFormat="oklch"
						defaultValue="#6B97FF"
					/>
				</DemoCard>
			</Show>
			<Show when={shows("controlled")}>
				<DemoCard title="Controlled">
					<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
						<ColorPicker
							testId="controlled"
							value={controlled()}
							onValueChange={setControlled}
						/>
						<text style={{ ...scale.body, color: color.mutedForeground }}>
							{`Current: ${controlled()}`}
						</text>
					</div>
				</DemoCard>
			</Show>
		</div>
	);
}

/** A tooltip chip from the field under the pointer can sit over the trigger, so leave the field before opening the menu. */
async function pickFormat(shot: ShotContext, picker: string, format: string) {
	await shot.moveTo(1180, 700);
	await shot.click(`${picker}-format`);
	await shot.click(`${picker}-format-${format}`);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	setOnly("default");
	await shot.settle(500);
	shot.capture("default");

	// The square: hover ghost, a press, a drag.
	const square = shot.centerOf("default-square");
	await shot.moveTo(square.x - 60, square.y - 20);
	await shot.moveTo(square.x - 50, square.y - 15);
	shot.capture("square-hover");
	await shot.down("default-square");
	await shot.moveHeld(square.x + 70, square.y + 40);
	await shot.moveHeld(square.x + 80, square.y + 45);
	shot.capture("square-drag");
	// Past the edge the thumb pins to the border.
	await shot.moveHeld(square.x + 400, square.y + 300);
	shot.capture("square-drag-past-edge");
	await shot.up("default-square");
	shot.expectText("#", true);

	// The rails.
	const hue = shot.centerOf("default-hue");
	await shot.clickAt(hue.x - 90, hue.y);
	const alpha = shot.centerOf("default-alpha");
	await shot.clickAt(alpha.x + 30, alpha.y);
	shot.capture("hue-and-alpha");
	await shot.down("default-hue");
	await shot.moveHeld(hue.x + 60, hue.y);
	await shot.moveHeld(hue.x + 90, hue.y + 30);
	shot.capture("hue-drag");
	await shot.up("default-hue");
	await shot.down("default-alpha");
	await shot.moveHeld(alpha.x - 60, alpha.y);
	await shot.moveHeld(alpha.x - 400, alpha.y);
	shot.capture("alpha-drag-past-edge");
	await shot.up("default-alpha");

	// The hex field: replace its text.
	await shot.click("default-hex-input");
	await shot.press(
		"end backspace backspace backspace backspace backspace backspace backspace backspace",
	);
	await shot.press("f f 3 b 3 0");
	await shot.press("enter");
	shot.capture("hex-typed");

	// Keyboard: the square takes focus, Tab reaches the hue thumb and arrows move it.
	await shot.click("default-square");
	await shot.press("left left left shift-down");
	shot.capture("keyboard-square");
	await shot.press("tab");
	await shot.press("right right right shift-right");
	shot.capture("keyboard-hue");

	// The format menu, and each format's channels.
	await shot.moveTo(1180, 700);
	await shot.click("default-format");
	shot.capture("format-open");
	await shot.click("default-format-rgb");
	shot.capture("rgb");
	await pickFormat(shot, "default", "hsl");
	shot.capture("hsl");
	await pickFormat(shot, "default", "oklch");
	shot.capture("oklch");
	await pickFormat(shot, "default", "rgb");

	// A channel scrubs by dragging sideways.
	await shot.moveTo(1180, 700);
	const red = shot.centerOf("default-r");
	await shot.down("default-r");
	await shot.moveHeld(red.x - 30, red.y);
	await shot.moveHeld(red.x - 60, red.y);
	shot.capture("scrub");
	await shot.up("default-r");

	// Over text: a channel's digits, then the format trigger's label.
	await shot.moveTo(1180, 700);
	const green = shot.centerOf("default-g");
	await shot.moveTo(green.x - 6, green.y);
	await shot.moveTo(green.x - 4, green.y);
	await shot.moveTo(green.x - 2, green.y);
	shot.capture("hover-channel-text");
	const format = shot.centerOf("default-format");
	await shot.moveTo(format.x - 40, format.y);
	await shot.moveTo(format.x - 38, format.y);
	shot.capture("hover-format-text");

	// The popover.
	// The trigger's label and value text.
	const trigger = shot.centerOf("popover-trigger");
	await shot.moveTo(trigger.x - 40, trigger.y);
	await shot.moveTo(trigger.x - 38, trigger.y);
	shot.capture("hover-trigger-text");
	await shot.click("popover-trigger");
	shot.capture("popover-open");
	await shot.moveTo(1180, 700);
	await shot.click("popover-format");
	shot.capture("popover-format-open");
	await shot.click("popover-format-rgb");
	await shot.clickAt(1100, 600);
	shot.capture("popover-closed");

	setOnly("swatches");
	await shot.settle(400);
	await shot.click("swatches-swatch-2");
	shot.capture("swatches");

	setOnly("oklch");
	await shot.settle(400);
	shot.capture("oklch-format");

	setOnly("controlled");
	await shot.settle(400);
	await shot.clickAt(
		shot.centerOf("controlled-square").x + 40,
		shot.centerOf("controlled-square").y,
	);
	shot.capture("controlled");

	setOnly(null);
	await shot.settle(400);
};
