import { createSignal, For } from "solid-js";
import {
	Tooltip,
	TooltipProvider,
	type TooltipSide,
	type TooltipTrigger,
} from "../components/tooltip";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { color, height, radius, type as scale, weight } from "../lib/theme";

const SIDES: TooltipSide[] = ["top", "right", "bottom", "left"];

function sideLabel(side: TooltipSide) {
	return side[0].toUpperCase() + side.slice(1);
}

/** Button's look, but with the tooltip's handlers on the filled element itself. */
function TriggerButton(props: {
	trigger: TooltipTrigger;
	primary?: boolean;
	compact?: boolean;
	onClick?: () => void;
	children: string;
}) {
	return (
		<div
			{...props.trigger}
			onClick={props.onClick}
			style={{
				height: props.compact ? height.controlCompact : height.control,
				paddingLeft: props.compact ? 12 : 16,
				paddingRight: props.compact ? 12 : 16,
				display: "flex",
				alignItems: "center",
				borderRadius: radius.item,
				cursor: "pointer",
				userSelect: "none",
				backgroundColor: props.primary ? color.foreground : color.tint,
				hover: {
					backgroundColor: props.primary ? color.primaryHover : color.tintHover,
				},
			}}
		>
			<text
				style={{
					...(props.compact ? scale.bodyCompact : scale.body),
					color: props.primary ? color.background : color.foreground,
					whiteSpace: "nowrap",
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

function FollowArea(props: {
	axis: "x" | "y";
	side: TooltipSide;
	width: number;
	height: number;
}) {
	return (
		<Tooltip
			testId={`follow-${props.axis}`}
			content={`Following ${props.axis}`}
			side={props.side}
			followCursor={props.axis}
		>
			<div
				style={{
					width: props.width,
					height: props.height,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: 8,
					borderWidth: 1,
					borderColor: color.border,
					cursor: "default",
				}}
			>
				<div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
					<For each={props.axis === "x" ? ["Move along me"] : ["Move", "along", "me"]}>
						{(word) => (
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{word}
							</text>
						)}
					</For>
				</div>
			</div>
		</Tooltip>
	);
}

export const title = "Tooltip";
export const group = "Components";

export function Demo() {
	const [saves, setSaves] = createSignal(0);
	const [opened, setOpened] = createSignal(0);
	return (
		<>
			<DemoCard title="Tooltip">
				<TooltipProvider>
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<DemoRow label="Basic">
							<Tooltip
								testId="basic"
								content="Save your changes"
								onOpenChange={(open) => open && setOpened(opened() + 1)}
							>
								{(trigger: TooltipTrigger) => (
									<TriggerButton
										trigger={trigger}
										primary
										onClick={() => setSaves(saves() + 1)}
									>
										Hover me
									</TriggerButton>
								)}
							</Tooltip>
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{`Clicked ${saves()} times, opened ${opened()}`}
							</text>
						</DemoRow>
						<DemoRow label="Rich content">
							<Tooltip
								testId="rich"
								content={
									<div
										style={{ display: "flex", flexDirection: "column", gap: 4 }}
									>
										<text
											style={{
												...scale.caption,
												color: color.background,
												fontWeight: weight.semibold,
											}}
										>
											Keyboard shortcut
										</text>
										<text
											style={{ ...scale.caption, color: color.mutedForeground }}
										>
											⌘ + S
										</text>
									</div>
								}
							>
								{(trigger: TooltipTrigger) => (
									<TriggerButton trigger={trigger} primary>
										Save
									</TriggerButton>
								)}
							</Tooltip>
						</DemoRow>
						<DemoRow label="Delay">
							<Tooltip testId="delay-0" content="Instant" delayDuration={0}>
								{(trigger: TooltipTrigger) => <TriggerButton trigger={trigger}>No delay</TriggerButton>}
							</Tooltip>
							<Tooltip testId="delay-500" content="Slow" delayDuration={500}>
								{(trigger: TooltipTrigger) => <TriggerButton trigger={trigger}>500ms delay</TriggerButton>}
							</Tooltip>
						</DemoRow>
						<DemoRow label="Placement">
							{SIDES.map((side) => (
								<Tooltip testId={`side-${side}`} content={sideLabel(side)} side={side}>
									{(trigger: TooltipTrigger) => (
										<TriggerButton trigger={trigger}>{sideLabel(side)}</TriggerButton>
									)}
								</Tooltip>
							))}
						</DemoRow>
					</div>
				</TooltipProvider>
			</DemoCard>
			<DemoCard title="Near the window edge">
				{/* The chip is wider than the room right of the trigger, so it flips to its left. */}
				<div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-end" }}>
					<Tooltip
						testId="collide"
						content="This label is far too wide to fit between the trigger and the right edge of the window"
						side="right"
					>
						{(trigger: TooltipTrigger) => (
							<TriggerButton trigger={trigger}>Right edge</TriggerButton>
						)}
					</Tooltip>
				</div>
			</DemoCard>
			<DemoCard title="Follow cursor">
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: 24,
					}}
				>
					<FollowArea axis="x" side="top" width={248} height={48} />
					<FollowArea axis="y" side="right" width={48} height={96} />
				</div>
			</DemoCard>
			<DemoCard title="Forced open">
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						justifyContent: "center",
						gap: 76,
						paddingTop: 20,
						paddingBottom: 20,
					}}
				>
					{SIDES.map((side) => (
						<Tooltip content={sideLabel(side)} side={side} forceOpen>
							{(trigger: TooltipTrigger) => (
								<TriggerButton trigger={trigger} compact>
									{sideLabel(side)}
								</TriggerButton>
							)}
						</Tooltip>
					))}
				</div>
			</DemoCard>
		</>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic");
	shot.expectText("Save your changes", true);
	await shot.settle(300);
	shot.capture("basic");
	await shot.click("basic");
	shot.expectText("Clicked 1 times, opened", true);
	shot.expectText("opened 1", true);

	// Escape closes it, and the pointer reaching the chip keeps it open.
	await shot.moveTo(900, 700);
	await shot.hover("basic");
	await shot.settle(300);
	shot.expectText("Save your changes", true);
	await shot.press("escape");
	shot.expectText("Save your changes", false);
	await shot.moveTo(900, 700);
	await shot.hover("basic");
	await shot.settle(300);
	const chip = shot.centerOf("basic-chip");
	await shot.moveTo(chip.x, chip.y);
	await shot.settle(400);
	shot.expectText("Save your changes", true);
	shot.capture("hover-chip");
	await shot.moveTo(900, 700);
	await shot.settle(300);
	shot.expectText("Save your changes", false);

	await shot.hover("rich");
	await shot.settle(300);
	shot.capture("rich");

	for (const side of SIDES) {
		await shot.hover(`side-${side}`);
		await shot.settle(300);
	shot.capture(`placement-${side}`);
	}

	// Too wide for the room on its right: the chip flips to the left of the trigger.
	await shot.hover("collide");
	await shot.settle(300);
	shot.capture("flipped-left");
	if (!(shot.centerOf("collide-chip").x < shot.centerOf("collide").x)) {
		throw new Error("the wide tooltip did not flip to the left");
	}

	await shot.moveTo(900, 700);
	// Let the provider's skip window (300 ms after a close) run out, or the slow tooltip would open at once.
	await shot.settle(600);
	await shot.hover("delay-500");
	shot.expectText("Slow", false);
	await shot.settle(500);
	shot.expectText("Slow", true);
	await shot.settle(300);
	shot.capture("delay-500");

	await shot.hover("follow-x");
	await shot.settle(300);
	shot.capture("follow-x-centre");
	const area = shot.centerOf("follow-x");
	await shot.moveTo(area.x - 90, area.y);
	await shot.settle(300);
	shot.capture("follow-x-left");
	const tall = shot.centerOf("follow-y");
	await shot.moveTo(tall.x, tall.y + 30);
	await shot.settle(300);
	shot.capture("follow-y-low");

	await shot.moveTo(900, 700);
	shot.expectText("Following y", false);
};
