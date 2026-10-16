import { motion } from "@gpuix/solid";
import { createUniqueId } from "solid-js";
import { pressProps, ScLabel } from "./parts";
import { twShadow } from "#/lib/theme";
import { sc, scRing } from "./theme";

const TRACK_WIDTH = 36;
const TRACK_HEIGHT = 20;
const THUMB = 16;
/** `translate-x-px` and `translate-x-[17px]` inside the 1px border. */
const OFF_X = 1;
const ON_X = 17;

/** `components/shadcn/switch.tsx` and its `Label`. */
export function ScSwitch(props: {
	label: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	testId?: string;
}) {
	const labelId = createUniqueId();
	const toggle = () => props.onCheckedChange(!props.checked);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
			}}
		>
			<div
				{...pressProps({ onClick: toggle })}
				role="switch"
				aria-checked={props.checked}
				aria-labelledby={labelId}
				testId={props.testId}
				style={{
					position: "relative",
					flexShrink: 0,
					width: TRACK_WIDTH,
					height: TRACK_HEIGHT,
					borderRadius: TRACK_HEIGHT / 2,
					borderWidth: 1,
					borderColor: sc.input,
					backgroundColor: props.checked ? sc.primary : sc.input,
					boxShadow: twShadow.sm,
					cursor: "pointer",
					keyboardFocusDim: false,
					focusVisible: scRing(),
				}}
			>
				<motion.div
					initial={false}
					animate={{ left: props.checked ? ON_X : OFF_X }}
					transition={{ duration: 0.15 }}
					style={{
						position: "absolute",
						top: 1,
						width: THUMB,
						height: THUMB,
						borderRadius: THUMB / 2,
						backgroundColor: props.checked ? sc.primaryForeground : "#FFFFFF",
						boxShadow: twShadow.lg,
						pointerEvents: "none",
					}}
				/>
			</div>
			<div id={labelId}>
				<ScLabel onClick={toggle}>{props.label}</ScLabel>
			</div>
		</div>
	);
}
