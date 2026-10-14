import { createSignal, type JSX, Show } from "solid-js";
import { Slider, type SliderValue } from "../components/slider";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";

const AMPERE_RATINGS = [0.1, 0.5, 0.7, 1.1, 1.3];
const QUALITY = ["Off", "Low", "Medium", "High", "Ultra"];

/** Sliders are `w-72` in the docs. */
function Well(props: { children: JSX.Element }) {
	return <div style={{ width: 288 }}>{props.children}</div>;
}

/** A scenario shows one card at a time so its sliders are inside the capture window. */
const [only, setOnly] = createSignal<"compact" | "display" | "default">();
const visible = (card: "compact" | "display" | "default") => () =>
	only() === undefined || only() === card;

/** The resize rows' width: a scenario narrows it to show the thumbs and fill follow the layout. */
const [resizeWidth, setResizeWidth] = createSignal(288);

export const title = "Slider";
export const group = "Components";

export function Demo() {
	const [basic, setBasic] = createSignal<SliderValue>(25);
	const [range, setRange] = createSignal<SliderValue>([25, 75]);
	const [stepped, setStepped] = createSignal<SliderValue>(50);
	const [stepped10, setStepped10] = createSignal<SliderValue>(50);
	const [decimal, setDecimal] = createSignal<SliderValue>(0.2);
	const [resizable, setResizable] = createSignal<SliderValue>(50);
	const [resizablePips, setResizablePips] = createSignal(2);
	const [rating, setRating] = createSignal<SliderValue>(0.7);
	const [left, setLeft] = createSignal<SliderValue>(40);
	const [right, setRight] = createSignal<SliderValue>(60);
	const [tooltip, setTooltip] = createSignal<SliderValue>(50);
	const [formatted, setFormatted] = createSignal<SliderValue>(75);
	const [roundness, setRoundness] = createSignal<SliderValue>(2);
	const [volume, setVolume] = createSignal<SliderValue>(50);
	const [quality, setQuality] = createSignal<SliderValue>(2);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<Show when={visible("compact")()}>
				<DemoCard title="Slider: compact">
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						<DemoRow label="Compact">
							<Well>
								<Slider
									testId="basic"
									size="compact"
									value={basic()}
									onChange={setBasic}
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Range">
							<Well>
								<Slider testId="range" value={range()} onChange={setRange} />
							</Well>
						</DemoRow>
						<DemoRow label="Steps 25">
							<Well>
								<Slider
									testId="steps25"
									value={stepped()}
									onChange={setStepped}
									step={25}
									showSteps
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Steps 10">
							<Well>
								<Slider
									testId="steps10"
									value={stepped10()}
									onChange={setStepped10}
									step={10}
									showSteps
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Decimal">
							<Well>
								<Slider
									testId="decimal"
									size="compact"
									value={decimal()}
									onChange={setDecimal}
									min={0}
									max={100}
									step={0.1}
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Resize">
							<div style={{ width: resizeWidth() }}>
								<Slider
									testId="resize"
									size="compact"
									value={resizable()}
									onChange={setResizable}
									showValue={false}
								/>
							</div>
						</DemoRow>
						<DemoRow label="Non-uniform">
							<Well>
								<Slider
									testId="rating"
									value={rating()}
									onChange={setRating}
									steps={AMPERE_RATINGS}
									showSteps
									label="Rating"
									formatValue={(v) => `${v} A`}
								/>
							</Well>
						</DemoRow>
					</div>
				</DemoCard>
			</Show>
			<Show when={visible("display")()}>
				<DemoCard title="Slider: value display">
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						<DemoRow label="Left">
							<Well>
								<Slider
									testId="left"
									value={left()}
									onChange={setLeft}
									valuePosition="left"
									label="Volume"
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Right">
							<Well>
								<Slider
									testId="right"
									value={right()}
									onChange={setRight}
									valuePosition="right"
									label="Volume"
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Tooltip">
							<Well>
								<Slider
									testId="tooltip"
									value={tooltip()}
									onChange={setTooltip}
									valuePosition="tooltip"
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Format">
							<Well>
								<Slider
									testId="format"
									size="compact"
									value={formatted()}
									onChange={setFormatted}
									formatValue={(v) => `${v}%`}
									label="Opacity"
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Disabled">
							<Well>
								<Slider
									size="compact"
									value={50}
									onChange={() => {}}
									disabled
								/>
							</Well>
						</DemoRow>
					</div>
				</DemoCard>
			</Show>
			<Show when={visible("default")()}>
				<DemoCard title="Slider: default">
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<DemoRow label="Pips">
							<Well>
								<Slider
									testId="pips"
									size="default"
									label="Roundness"
									value={roundness()}
									onChange={setRoundness}
									min={0}
									max={4}
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Scrubber">
							<Well>
								<Slider
									testId="scrubber"
									size="default"
									variant="scrubber"
									label="Volume"
									value={volume()}
									onChange={setVolume}
									min={0}
									max={100}
									formatValue={(v) => `${v}%`}
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Resize">
							<div style={{ width: resizeWidth() }}>
								<Slider
									testId="resize-pips"
									size="default"
									label="Roundness"
									value={resizablePips()}
									onChange={setResizablePips}
									min={0}
									max={4}
								/>
							</div>
						</DemoRow>
						<DemoRow label="Format">
							<Well>
								<Slider
									testId="quality"
									size="default"
									label="Quality"
									value={quality()}
									onChange={setQuality}
									min={0}
									max={4}
									formatValue={(v) => QUALITY[v]}
								/>
							</Well>
						</DemoRow>
						<DemoRow label="Disabled">
							<Well>
								<Slider
									size="default"
									label="Roundness"
									value={2}
									onChange={() => {}}
									min={0}
									max={4}
									disabled
								/>
							</Well>
						</DemoRow>
					</div>
				</DemoCard>
			</Show>
		</div>
	);
}

/** A drag, as a person would: press at the centre of the element, move along it, hold, release. */
async function drag(
	shot: Parameters<NonNullable<DemoModule["scenarios"]>>[0],
	testId: string,
	moves: number[],
	capture: string,
) {
	const start = shot.centerOf(testId);
	await shot.down(testId);
	for (const dx of moves) await shot.moveTo(start.x + dx, start.y);
	shot.capture(capture);
	await shot.up(testId);
}

async function hoverAt(
	shot: Parameters<NonNullable<DemoModule["scenarios"]>>[0],
	testId: string,
	dx: number,
	capture: string,
) {
	const centre = shot.centerOf(testId);
	await shot.moveTo(centre.x + dx, centre.y);
	await shot.settle(400);
	shot.capture(capture);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	setOnly("compact");
	await shot.settle(300);
	shot.capture("compact");
	// Keys, reached by walking back through the tab order from cold: theme, rating, resize, decimal, steps10, steps25, range, basic.
	await shot.press("shift-tab shift-tab shift-tab shift-tab");
	await shot.press("right");
	shot.expectText("0.3", true);
	shot.expectText("0.30000", false);
	await shot.press("shift-tab shift-tab");
	// Page Up is 10 value units whatever the step, so step 25 lands off the grid, as in FF.
	await shot.press("pageup");
	shot.expectText("60", true);
	await shot.press("pagedown pagedown");
	shot.expectText("40", true);
	await shot.press("shift-tab shift-tab shift-tab");
	await shot.press("shift-right");
	shot.expectText("35", true);
	await shot.press("pageup");
	shot.expectText("45", true);
	shot.capture("compact-keys");
	await shot.clickAt(1180, 700);
	await hoverAt(shot, "basic-track", 40, "compact-hover");
	await drag(shot, "basic-track", [60, 100], "compact-drag");
	await shot.moveTo(1180, 700);
	shot.capture("compact-dragged");
	// Pressing right of the first thumb takes the second; dragging it back stops 10px short of the first.
	await shot.clickAt(shot.centerOf("range-track").x - 90, shot.centerOf("range-track").y);
	await drag(shot, "range-track", [-30, -60, -120], "range-drag");
	await shot.moveTo(1180, 700);
	await drag(shot, "steps25-track", [40, 100], "steps-drag");
	await shot.moveTo(1180, 700);
	await drag(shot, "rating-track", [-30, -90], "list-drag");
	await shot.moveTo(1180, 700);
	shot.capture("compact-after");

	// The track follows its container: narrower, the thumb and fill stay on the value.
	setResizeWidth(160);
	await shot.settle(400);
	shot.capture("compact-resized");
	setResizeWidth(288);

	setOnly("display");
	await shot.settle(300);
	await hoverAt(shot, "tooltip-track", 50, "value-display-tooltip");
	await hoverAt(shot, "left-track", 30, "value-display-hover");
	await shot.moveTo(1180, 700);
	await shot.click("left-value-0");
	shot.capture("editing");
	await shot.press("backspace backspace backspace 7 2 enter");
	await shot.settle(300);
	shot.expectText("72", true);
	shot.capture("edited");

	setOnly("default");
	await shot.settle(300);
	await shot.moveTo(1180, 700);
	shot.capture("default");
	await hoverAt(shot, "pips-row", 40, "pips-hover");
	await drag(shot, "pips-row", [60, 110], "pips-drag");
	await shot.moveTo(1180, 700);
	await hoverAt(shot, "scrubber-row", 40, "scrubber-hover");
	await drag(shot, "scrubber-row", [-40, -90], "scrubber-drag");
	await shot.moveTo(1180, 700);
	shot.capture("scrubber-dragged");
	// Pointer presses never focus a slider, so reach the last one by walking back through the tab order.
	await shot.press("shift-tab shift-tab");
	shot.capture("keyboard-focus");
	await shot.press("right");
	shot.capture("keyboard-moved");
	shot.expectText("High", true);
	// Shift jumps 10 and clamps to the end; Page Down jumps back past the start.
	await shot.press("shift-right");
	shot.expectText("Ultra", true);
	await shot.press("pagedown");
	shot.expectText("Off", true);
	await shot.clickAt(1180, 700);
	setResizeWidth(160);
	await shot.settle(400);
	shot.capture("default-resized");
	setResizeWidth(288);
	setOnly(undefined);
};
