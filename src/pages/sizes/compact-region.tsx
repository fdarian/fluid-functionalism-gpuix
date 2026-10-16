import { createSignal, For } from "solid-js";
import { Button } from "../../components/button";
import { Dropdown } from "../../components/dropdown";
import { MenuItem } from "../../components/menu-item";
import { color, type SizeChoice, siteType, weight } from "../../lib/theme";
import {
	ANNOTATION_BLUE,
	ArrowOverlay,
	buildArrow,
} from "../surfaces/annotations";
import { LADDER } from "./ladder";
import { SORT_OPTIONS } from "./sort-options";
import { StepFrame } from "./step-frame";
import { FILTER_ICON } from "./toolbar";

/** The inline `Dropdown` panel is a fixed 288px (`PANEL_WIDTH`); the source's frozen menu is `!w-48`. */
const MENU_WIDTH = 288;
/** The callout sits right of the menu: the source's arrow tip is 30px beyond its 192px menu. */
const CALLOUT_SHIFT = MENU_WIDTH - 192;
const CALLOUT_TAIL = { x: 312 + CALLOUT_SHIFT, y: 28 };
const CALLOUT_TIP = { x: 222 + CALLOUT_SHIFT, y: 74 };
const CALLOUT_ARROW = buildArrow(CALLOUT_TAIL, CALLOUT_TIP, {
	x: 0,
	y: 0,
	rotation: 0,
	curve: 14,
	labelX: 0,
	labelY: 0,
});

export function CompactRegionDemo() {
	const [step, setStep] = createSignal<SizeChoice>("compact");
	const [sort, setSort] = createSignal(0);

	return (
		<StepFrame
			testId="compact-region"
			step={step()}
			onStep={setStep}
			minHeight={260}
		>
			<div
				style={{
					position: "relative",
					alignSelf: "flex-start",
					paddingRight: 230,
				}}
			>
				{/* A fixed-width column and top alignment keep the origin stable across steps, so the callout does not move when the region re-renders at the other size. */}
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "flex-start",
						gap: 8,
						width: MENU_WIDTH,
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: LADDER[step()].gap,
						}}
					>
						<Button
							variant="tertiary"
							size={step()}
							trailingIcon="chevron-down"
						>
							{SORT_OPTIONS[sort()].label}
						</Button>
						<Button
							variant="tertiary"
							size={step() === "compact" ? "icon-compact" : "icon"}
							icon={FILTER_ICON}
							aria-label="Filter"
						/>
						<Button size={step()} leadingIcon="plus">
							New
						</Button>
					</div>
					{/* The trigger's menu, frozen open (the inline Dropdown panel, as on the surfaces page) so the step shows without a real popup. Pointer-inert: it is an illustration. */}
					<div style={{ pointerEvents: "none", userSelect: "none" }}>
						<Dropdown checkedIndex={sort()}>
							<For each={SORT_OPTIONS}>
								{(option, index) => (
									<MenuItem
										index={index()}
										label={option.label}
										checked={sort() === index()}
										onSelect={() => setSort(index())}
									/>
								)}
							</For>
						</Dropdown>
					</div>
				</div>

				<ArrowOverlay
					width={MENU_WIDTH + 232}
					height={110}
					arrows={[{ ...CALLOUT_ARROW, color: ANNOTATION_BLUE }]}
				/>
				<div
					style={{
						position: "absolute",
						left: 318 + CALLOUT_SHIFT,
						top: 18,
					}}
				>
					<For each={["The menu inherits", "the region's step"]}>
						{(line) => (
							<text
								style={{
									...siteType.caption,
									fontWeight: weight.semibold,
									color: color.foreground,
									whiteSpace: "nowrap",
								}}
							>
								{line}
							</text>
						)}
					</For>
				</div>
			</div>
		</StepFrame>
	);
}
