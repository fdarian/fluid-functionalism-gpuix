import type { JSX } from "solid-js";
import {
	Accordion,
	AccordionContent,
	AccordionGroup,
	AccordionItem,
	AccordionTrigger,
} from "../components/accordion";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

function Section(props: { caption: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				flexBasis: 0,
				flexGrow: 1,
				minWidth: 0,
				gap: 8,
			}}
		>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.caption}
			</text>
			{props.children}
		</div>
	);
}

function Row(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "flex-start",
				gap: 16,
			}}
		>
			{props.children}
		</div>
	);
}

export const title = "Accordion";
export const group = "Components";

export function Demo() {
	return (
		<DemoCard title="Accordion">
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<Row>
					<Section caption="Standalone: its own hover state">
						<Accordion type="single" defaultValue="item-1">
							<AccordionItem value="item-1">
								<AccordionTrigger testId="standalone-trigger">
									What is this component?
								</AccordionTrigger>
								<AccordionContent>
									A collapsible accordion with animated expand/collapse and
									spring-animated chevron.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</Section>
					<Section caption='highlight="trigger": the tint waits for hover'>
						<AccordionGroup
							type="single"
							defaultValue="item-1"
							highlight="trigger"
						>
							<AccordionItem value="item-1">
								<AccordionTrigger testId="row-1">
									Expanded, but not tinted
								</AccordionTrigger>
								<AccordionContent>
									The panel reads as part of the page rather than a filled
									block.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger testId="row-2">Hover any row</AccordionTrigger>
								<AccordionContent>
									The fill follows your cursor instead of marking a state.
								</AccordionContent>
							</AccordionItem>
						</AccordionGroup>
					</Section>
				</Row>
				<Row>
					<Section caption="Single expand">
						<AccordionGroup type="single" defaultValue="item-1">
							<AccordionItem value="item-1">
								<AccordionTrigger testId="single-1">
									Getting Started
								</AccordionTrigger>
								<AccordionContent>
									Install the component and import it into your project. The
									accordion supports both single and multiple expand modes.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger testId="single-2">Styling</AccordionTrigger>
								<AccordionContent>
									The component integrates with the shape system for pill or
									rounded border-radius variants. All animations use spring
									physics.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger testId="single-3">
									Accessibility
								</AccordionTrigger>
								<AccordionContent>
									Built on Radix UI or Base UI Accordion (your pick) with
									WAI-ARIA attributes, keyboard navigation, and focus
									management.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-4">
								<AccordionTrigger testId="single-4">Animation</AccordionTrigger>
								<AccordionContent>
									Smooth height transitions and spring-animated chevron
									rotation. The fluid hover background tracks your cursor.
								</AccordionContent>
							</AccordionItem>
						</AccordionGroup>
					</Section>
					<Section caption="Multi expand">
						<AccordionGroup type="multiple" defaultValue={["item-1", "item-3"]}>
							<AccordionItem value="item-1">
								<AccordionTrigger testId="multi-1">
									First Section
								</AccordionTrigger>
								<AccordionContent>
									Multiple items can be expanded at the same time.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger testId="multi-2">
									Second Section
								</AccordionTrigger>
								<AccordionContent>
									Click any trigger to expand or collapse independently.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-3">
								<AccordionTrigger testId="multi-3">
									Third Section
								</AccordionTrigger>
								<AccordionContent>
									Each item operates independently in multiple mode.
								</AccordionContent>
							</AccordionItem>
						</AccordionGroup>
					</Section>
				</Row>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("single-2");
	shot.capture("hover-closed-row");
	await shot.click("single-2");
	shot.capture("opened-second");
	await shot.hover("multi-2");
	shot.capture("multi-hover");
	await shot.click("multi-2");
	shot.capture("multi-opened");
	await shot.hover("row-1");
	shot.capture("trigger-highlight-hover-open");
	await shot.click("standalone-trigger");
	shot.capture("standalone-closed");
	await shot.click("single-1");
	await shot.moveTo(1180, 700);
	await shot.press("down");
	shot.capture("keyboard-focus");
};
