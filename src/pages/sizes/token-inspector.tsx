import type { EventPayload } from "@gpuix/solid";
import { type Accessor, createSignal, For, type JSX, Show } from "solid-js";
import { Button } from "../../components/button";
import { CheckboxGroup, CheckboxItem } from "../../components/checkbox-group";
import { Select } from "../../components/select";
import { Tooltip } from "../../components/tooltip";
import { MONO } from "../../lib/doc-page";
import { color, type SizeChoice, weight } from "../../lib/theme";
import { ANNOTATION_BLUE } from "../surfaces/annotations";
import { LADDER } from "./ladder";
import { SORT_OPTIONS } from "./sort-options";
import { StepFrame } from "./step-frame";

/** What a control paints, in the units the ladder is measured in. The port's components keep these in their own step tables, so each target restates its own. */
interface Metrics {
	padLeft: number;
	padRight: number;
	gap: number;
	fontSize: number;
}

interface Box {
	width: number;
	height: number;
}

interface Measured extends Metrics, Box {}

/** The source's `tokenReadout`: what a measured box says about the ladder at `step`. */
function tokenReadout(raw: Measured, step: SizeChoice) {
	const ladder = LADDER[step];
	// ±1px, as the source, so a fractional layout does not knock a measurement off its token.
	const eq = (a: number, b: number) => Math.abs(a - b) < 1;
	const rows: Array<[string, string]> = [];
	if (eq(raw.height, ladder.control))
		rows.push(["control", `${ladder.control}px`]);
	if (eq(raw.width, ladder.icon) && eq(raw.height, ladder.icon))
		rows.push(["icon", `${ladder.icon}px`]);
	if (eq(raw.fontSize, ladder.text.fontSize))
		rows.push(["text", `${ladder.text.fontSize}px`]);
	if (eq(raw.padLeft, ladder.px) || eq(raw.padRight, ladder.px))
		rows.push(["px", `${ladder.px}px`]);
	else if (eq(raw.padLeft, ladder.itemPx) || eq(raw.padRight, ladder.itemPx))
		rows.push(["itemPx", `${ladder.itemPx}px`]);
	if (eq(raw.gap, ladder.gap)) rows.push(["gap", `${ladder.gap}px`]);
	return rows;
}

interface GuideBox {
	top?: number;
	bottom?: number;
	left?: number;
	right?: number;
	width?: number;
	height?: number;
}

const CONTENT_FILL = "rgba(120, 132, 232, 0.20)";
const PADDING_FILL = "rgba(153, 255, 201, 0.35)";
/** The source's guides run the whole frame; clipped by the body's overflow, 2000px is the frame. */
const GUIDE_REACH = 2000;

function ReadoutText(props: { children: JSX.Element; heavy?: boolean }) {
	return (
		<text
			style={{
				fontFamily: MONO,
				fontSize: 11,
				lineHeight: 16,
				fontWeight: props.heavy === true ? weight.semibold : weight.normal,
				color: color.background,
				whiteSpace: "nowrap",
			}}
		>
			{props.children}
		</text>
	);
}

function PaddingStrip(props: { width: number; side: "left" | "right" }) {
	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				bottom: 0,
				[props.side]: 0,
				width: props.width,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: PADDING_FILL,
			}}
		>
			<text
				style={{
					fontFamily: MONO,
					fontSize: 9,
					lineHeight: 9,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				{`${props.width}`}
			</text>
		</div>
	);
}

/**
 * One inspectable control. A transparent layer over it takes the pointer, so
 * the control is frozen while you inspect it, as the source's overlay does; on
 * hover it draws the box model (padding in green, the box edges as guides) and
 * a tooltip with the ladder tokens the measured numbers came from. Controls
 * measure whole, as in the source: their size comes from the layer's own
 * layout, so a step change re-measures under a parked cursor.
 */
function InspectTarget(props: {
	step: SizeChoice;
	metrics: Metrics;
	/** Stretch to the row's width, for list rows. */
	fill?: boolean;
	testId: string;
	children: JSX.Element;
}) {
	const [hovered, setHovered] = createSignal(false);
	const [size, setSize] = createSignal<Box>();

	const guide = (style: GuideBox) => (
		<div
			style={{
				position: "absolute",
				backgroundColor: ANNOTATION_BLUE,
				opacity: 0.55,
				...style,
			}}
		/>
	);

	return (
		<Tooltip
			side="top"
			sideOffset={8}
			forceOpen={hovered()}
			content={
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						paddingLeft: 6,
						paddingRight: 6,
						paddingTop: 8,
						paddingBottom: 8,
					}}
				>
					<Show when={size()}>
						{(box: Accessor<Box>) => {
							const rows = () =>
								tokenReadout({ ...props.metrics, ...box() }, props.step);
							return (
								<Show
									when={rows().length > 0}
									fallback={
										<ReadoutText>
											{`outside the ladder · ${Math.round(box().width)} × ${Math.round(box().height)}`}
										</ReadoutText>
									}
								>
									<For each={rows()}>
										{(row) => (
											<div
												style={{
													display: "flex",
													flexDirection: "row",
													gap: 6,
												}}
											>
												<ReadoutText heavy>{row[0]}</ReadoutText>
												<ReadoutText>{row[1]}</ReadoutText>
											</div>
										)}
									</For>
								</Show>
							);
						}}
					</Show>
				</div>
			}
		>
			<div
				style={{
					position: "relative",
					display: "flex",
					flexDirection: props.fill === true ? "column" : "row",
					flexGrow: props.fill === true ? 1 : 0,
				}}
			>
				{props.children}
				<div
					testId={props.testId}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					onLayout={(event: EventPayload) => {
						if (event.width === undefined || event.height === undefined) {
							throw new Error("onLayout reported no size");
						}
						setSize({ width: event.width, height: event.height });
					}}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						cursor: "crosshair",
					}}
				>
					<Show when={hovered()}>
						<div
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								left: props.metrics.padLeft,
								right: props.metrics.padRight,
								backgroundColor: CONTENT_FILL,
							}}
						/>
						<PaddingStrip width={props.metrics.padLeft} side="left" />
						<PaddingStrip width={props.metrics.padRight} side="right" />
						{guide({
							top: 0,
							left: -GUIDE_REACH,
							right: -GUIDE_REACH,
							height: 1,
						})}
						{guide({
							bottom: 0,
							left: -GUIDE_REACH,
							right: -GUIDE_REACH,
							height: 1,
						})}
						{guide({
							left: 0,
							top: -GUIDE_REACH,
							bottom: -GUIDE_REACH,
							width: 1,
						})}
						{guide({
							right: 0,
							top: -GUIDE_REACH,
							bottom: -GUIDE_REACH,
							width: 1,
						})}
					</Show>
				</div>
			</div>
		</Tooltip>
	);
}

const CHECKBOX_LABELS = ["Design", "Engineering"] as const;

/** Each target restates what its component paints: `Button` `sizes` (leading-icon padding on the left, plain on the right), `Select` `specs`, `ROW` of the choice groups. */
const BUTTON_METRICS = {
	default: { padLeft: 12, padRight: 16, gap: 6, fontSize: 13 },
	compact: { padLeft: 8, padRight: 12, gap: 4, fontSize: 12 },
} as const satisfies Record<SizeChoice, Metrics>;
const SELECT_METRICS = {
	default: { padLeft: 12, padRight: 12, gap: 8, fontSize: 13 },
	compact: { padLeft: 10, padRight: 10, gap: 4, fontSize: 12 },
} as const satisfies Record<SizeChoice, Metrics>;
const ROW_METRICS = {
	default: { padLeft: 12, padRight: 12, gap: 8, fontSize: 13 },
	compact: { padLeft: 10, padRight: 10, gap: 4, fontSize: 12 },
} as const satisfies Record<SizeChoice, Metrics>;

export function TokenInspectorDemo() {
	const [step, setStep] = createSignal<SizeChoice>("default");
	const [sort, setSort] = createSignal("updated");
	const [checked, setChecked] = createSignal<ReadonlySet<number>>(new Set([0]));
	const toggle = (index: number) => {
		const next = new Set(checked());
		if (next.has(index)) next.delete(index);
		else next.add(index);
		setChecked(next);
	};

	return (
		<StepFrame
			testId="token-inspector"
			step={step()}
			onStep={setStep}
			minHeight={200}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					gap: 16,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						alignItems: "center",
						gap: LADDER[step()].gap,
					}}
				>
					<InspectTarget
						step={step()}
						metrics={BUTTON_METRICS[step()]}
						testId="inspect-button"
					>
						<Button size={step()} leadingIcon="plus">
							New project
						</Button>
					</InspectTarget>
					<InspectTarget
						step={step()}
						metrics={SELECT_METRICS[step()]}
						testId="inspect-select"
					>
						<Select
							variant="bordered"
							size={step()}
							items={SORT_OPTIONS}
							value={sort()}
							onValueChange={setSort}
							placeholder="Sort by"
						/>
					</InspectTarget>
				</div>
				<div style={{ display: "flex", width: 176 }}>
					<CheckboxGroup size={step()} checkedIndices={checked()}>
						<For each={CHECKBOX_LABELS}>
							{(label, index) => (
								<InspectTarget
									step={step()}
									metrics={ROW_METRICS[step()]}
									fill
									testId={`inspect-row-${index()}`}
								>
									<CheckboxItem
										index={index()}
										label={label}
										checked={checked().has(index())}
										onToggle={() => toggle(index())}
									/>
								</InspectTarget>
							)}
						</For>
					</CheckboxGroup>
				</div>
			</div>
		</StepFrame>
	);
}
