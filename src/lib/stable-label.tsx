import type { HostElement } from "@gpuix/solid";
import { type as scale, weight } from "./theme";

/**
 * A label that gains weight in place. A hidden semibold copy sits in the flow
 * and reserves the widest width; the visible copy is absolutely positioned
 * over it, so going semibold never moves what is beside it.
 */
export function StableLabel(props: {
	text: string;
	heavy: boolean;
	color: string;
	/** Fills the row's spare width (a menu row) instead of hugging the text. */
	grow?: boolean;
	/** Defaults to the body role. */
	textStyle?: { fontSize: number; lineHeight: number };
	/** The wrapper, for a caller that measures the label's width. */
	labelRef?: (element: HostElement) => void;
	testId?: string;
}) {
	const textStyle = (heavy: boolean) => ({
		...(props.textStyle ?? scale.body),
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});
	return (
		<div
			ref={props.labelRef}
			style={{
				position: "relative",
				...(props.grow === true
					? { flexGrow: 1, minWidth: 0 }
					: { flexShrink: 0 }),
			}}
		>
			<text style={{ ...textStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				testId={props.testId}
				style={{
					...textStyle(props.heavy),
					position: "absolute",
					top: 0,
					left: 0,
					color: props.color,
				}}
			>
				{props.text}
			</text>
		</div>
	);
}
