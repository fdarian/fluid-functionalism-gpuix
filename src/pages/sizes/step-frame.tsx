import type { JSX } from "solid-js";
import { TabsSubtle, TabsSubtleItem } from "../../components/tabs-subtle";
import { color, type SizeChoice, shape } from "../../lib/theme";

/**
 * The stripped preview frame of the compact-region and token-inspector demos:
 * a 52px header holding a Default / Compact toggle where `ComponentPreview`
 * has its Preview / Code tabs, over a `bg-background` body.
 */
export function StepFrame(props: {
	testId: string;
	step: SizeChoice;
	onStep: (step: SizeChoice) => void;
	minHeight: number;
	children: JSX.Element;
}) {
	return (
		<div
			testId={props.testId}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				width: "100%",
				borderWidth: 1,
				borderColor: color.borderFaint,
				borderRadius: shape.container,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					minHeight: 52,
					padding: 12,
					borderBottomWidth: 1,
					borderColor: color.borderFaint,
				}}
			>
				<TabsSubtle
					testId={`${props.testId}-step`}
					selectedIndex={props.step === "default" ? 0 : 1}
					onSelect={(index) =>
						props.onStep(index === 0 ? "default" : "compact")
					}
				>
					<TabsSubtleItem
						testId={`${props.testId}-default`}
						index={0}
						label="Default"
					/>
					<TabsSubtleItem
						testId={`${props.testId}-compact`}
						index={1}
						label="Compact"
					/>
				</TabsSubtle>
			</div>
			<div
				style={{
					overflow: "hidden",
					borderBottomLeftRadius: shape.container - 1,
					borderBottomRightRadius: shape.container - 1,
				}}
			>
				<div
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "center",
						minHeight: props.minHeight,
						paddingLeft: 32,
						paddingRight: 32,
						paddingTop: 48,
						paddingBottom: 48,
						backgroundColor: color.background,
					}}
				>
					{props.children}
				</div>
			</div>
		</div>
	);
}
