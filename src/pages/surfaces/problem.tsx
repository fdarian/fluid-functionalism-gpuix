import { For } from "solid-js";
import { ComponentPreview } from "#/lib/doc-page";
import { color } from "#/lib/theme";
import {
	ANNOTATION_BLUE,
	ANNOTATION_RED,
	type Arrow,
	type ArrowDial,
	ArrowOverlay,
	buildArrow,
	Callout,
	type Point,
} from "./annotations";
import { InviteDialog } from "./invite-dialog";
import { PROBLEM_CODE } from "./snippets";

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 640;
const DIALOG_WIDTH = 320;

type ArrowKey = "page" | "dialog" | "dropdown";

/** Each callout: a label chip plus a curved arrow in the shared canvas, tuned so the arrowheads land on the three surfaces. */
const ANNOTATIONS: readonly {
	key: ArrowKey;
	title: string;
	hex: string;
	color: string;
	label: { left: number; top: number };
	start: Point;
	end: Point;
}[] = [
	{
		key: "page",
		title: "Page background",
		hex: "#171717",
		color: ANNOTATION_BLUE,
		label: { left: 14, top: 24 },
		start: { x: 118, y: 74 },
		end: { x: 84, y: 150 },
	},
	{
		key: "dialog",
		title: "Dialog",
		hex: "#333333",
		color: ANNOTATION_RED,
		label: { left: 8, top: 300 },
		start: { x: 118, y: 300 },
		end: { x: 152, y: 214 },
	},
	{
		key: "dropdown",
		title: "Role dropdown",
		hex: "#333333",
		color: ANNOTATION_RED,
		label: { left: 442, top: 300 },
		start: { x: 500, y: 338 },
		end: { x: 434, y: 306 },
	},
];

/** Hand-tuned arrow transforms per annotation. */
const ARROW_VALUES: Record<ArrowKey, ArrowDial> = {
	page: { x: -50, y: 0, rotation: -60, curve: 23, labelX: 0, labelY: 10 },
	dialog: { x: -20, y: -10, rotation: 20, curve: -18, labelX: 30, labelY: 0 },
	dropdown: {
		x: -20,
		y: -20,
		rotation: -40,
		curve: 18,
		labelX: 60,
		labelY: 0,
	},
};

const ARROWS: readonly Arrow[] = ANNOTATIONS.map((annotation) => ({
	...buildArrow(annotation.start, annotation.end, ARROW_VALUES[annotation.key]),
	color: annotation.color,
}));

export function ProblemDemo() {
	return (
		<ComponentPreview
			scheme="dark"
			testId="problem"
			code={PROBLEM_CODE}
			padding="none"
		>
			<div
				style={{
					width: "100%",
					overflow: "hidden",
					display: "flex",
					flexDirection: "row",
				}}
			>
				{/* The canvas is 600px, two more than the 1px-bordered frame holds. */}
				<div
					style={{
						position: "relative",
						width: CANVAS_WIDTH,
						height: CANVAS_HEIGHT,
						flexShrink: 0,
						marginLeft: -1,
						backgroundColor: color.background,
					}}
				>
					<InviteDialog
						variant="problem"
						style={{
							position: "absolute",
							left: (CANVAS_WIDTH - DIALOG_WIDTH) / 2,
							top: 32,
							width: DIALOG_WIDTH,
						}}
					/>
					<ArrowOverlay
						width={CANVAS_WIDTH}
						height={CANVAS_HEIGHT}
						arrows={ARROWS}
					/>
					<For each={ANNOTATIONS}>
						{(annotation) => (
							<Callout
								title={annotation.title}
								hex={annotation.hex}
								left={
									annotation.label.left + ARROW_VALUES[annotation.key].labelX
								}
								top={annotation.label.top + ARROW_VALUES[annotation.key].labelY}
								width={150}
							/>
						)}
					</For>
				</div>
			</div>
		</ComponentPreview>
	);
}
