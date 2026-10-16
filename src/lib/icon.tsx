import { motion } from "@gpuix/solid";
import { type IconRef, iconSource } from "./icons";
import { colorFade } from "./theme";

export function Icon(props: {
	name: IconRef;
	size: number;
	strokeWidth: number;
	color: string;
	/** Ease a colour change over 80 ms. The stroke width still switches at once: it is part of the SVG source. */
	fade?: boolean;
}) {
	return (
		<svg
			source={iconSource(props.name, props.strokeWidth)}
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: props.color,
				...(props.fade === true ? colorFade : {}),
			}}
		/>
	);
}

/** The check of FF's select and combobox, running left to right. */
export const LIST_CHECK = "M4 12L9 17L20 6";

/** The check draws in 80 ms ease-out and retracts in 40 ms ease-in. */
const DRAW_IN = { duration: 0.08, ease: "easeOut" } as const;
const DRAW_OUT = { duration: 0.04, ease: "easeIn" } as const;

/**
 * A check whose stroke draws in and retracts as `checked` flips. The path is
 * always mounted and starts at its current state, so a row that is checked
 * on mount shows the finished check. Opacity only hides the zero-length dot
 * that a round cap leaves at `pathLength: 0`, switching at the end of the
 * retract and the start of the draw.
 */
export function CheckMark(props: {
	checked: boolean;
	size: number;
	strokeWidth: number;
	color: string;
	/** A path in a 24 x 24 box, drawn from its first point. */
	path: string;
}) {
	return (
		<svg
			viewBox="0 0 24 24"
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: props.color,
			}}
		>
			<motion.path
				d={props.path}
				fill="none"
				stroke="currentColor"
				strokeWidth={props.strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={false}
				animate={{
					pathLength: props.checked ? 1 : 0,
					opacity: props.checked ? 1 : 0,
				}}
				transition={
					props.checked
						? { pathLength: DRAW_IN, opacity: { duration: 0 } }
						: {
								pathLength: DRAW_OUT,
								opacity: { duration: 0, delay: DRAW_OUT.duration },
							}
				}
			/>
		</svg>
	);
}
