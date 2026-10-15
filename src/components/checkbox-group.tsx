import { AnimatePresence, motion } from "@gpuix/solid";
import { type JSX, Show } from "solid-js";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { color } from "../lib/theme";
import {
	ChoiceGroup,
	ChoiceRow,
	type ChoiceSize,
	createSelectionRuns,
	indicatorBorder,
	ROW,
} from "./choice-group";

const CHECK = defineIcon('<path d="M6 12L10 16L18 8"/>');

/** The check draws in 80 ms ease-out and retracts in 40 ms ease-in. */
const DRAW_IN = { duration: 0.08, ease: "easeOut" } as const;
const DRAW_OUT = { duration: 0.04, ease: "easeIn" } as const;

export function CheckboxGroup(props: {
	/** The whole checked set: the group merges contiguous checked rows into one background. */
	checkedIndices: ReadonlySet<number>;
	size?: ChoiceSize;
	testId?: string;
	children: JSX.Element;
}) {
	const runs = createSelectionRuns(() => [...props.checkedIndices]);
	return (
		<ChoiceGroup
			role="group"
			size={props.size}
			runs={runs}
			testId={props.testId}
		>
			{props.children}
		</ChoiceGroup>
	);
}

/** The square and its check mark, sized from the group's step. */
function Checkbox(props: {
	checked: boolean;
	active: boolean;
	size: ChoiceSize;
}) {
	const box = () => ROW[props.size].box;
	const glyph = () => (props.size === "compact" ? 16 : 18);
	const inset = () => (box() - glyph()) / 2;
	return (
		<div
			style={{
				position: "relative",
				flexShrink: 0,
				width: box(),
				height: box(),
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: props.size === "compact" ? 4 : 5,
					borderWidth: 1.5,
					borderColor: indicatorBorder(props.checked, props.active),
				}}
			/>
			<AnimatePresence initial={false}>
				<Show when={props.checked}>
					{/* gpuix cannot animate a stroke, so the check is wiped in from the left under a clip, which reads as the draw. */}
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: glyph() }}
						exit={{ width: 0 }}
						transition={props.checked ? DRAW_IN : DRAW_OUT}
						style={{
							position: "absolute",
							top: inset(),
							left: inset(),
							height: glyph(),
							overflow: "hidden",
						}}
					>
						<Icon
							name={CHECK}
							size={glyph()}
							strokeWidth={2}
							color={color.foreground}
						/>
					</motion.div>
				</Show>
			</AnimatePresence>
		</div>
	);
}

export function CheckboxItem(props: {
	label: string;
	index: number;
	checked: boolean;
	onToggle: () => void;
	size?: ChoiceSize;
	testId?: string;
}) {
	return (
		<ChoiceRow
			index={props.index}
			label={props.label}
			role="checkbox"
			checked={props.checked}
			tabbable
			onActivate={props.onToggle}
			testId={props.testId}
			indicator={(active) => (
				<Checkbox
					checked={props.checked}
					active={active()}
					size={props.size ?? "default"}
				/>
			)}
		/>
	);
}
