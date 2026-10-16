import { type HostElement, useGpuixRequired } from "@gpuix/solid";
import { weight } from "../../../lib/theme";
import { ScLabel } from "./parts";
import { sc, scRadius, scRing } from "./theme";

/** A shadcn `Label` over an `Input`: `space-y-1.5`, an `h-10` bordered field with `px-3`. */
export function ScInputField(props: {
	label: string;
	placeholder: string;
	value: string;
	onChange: (value: string) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	let input: HostElement | undefined;
	const focusInput = () => {
		if (input === undefined) throw new Error("ScInputField is not mounted");
		renderer.focusElement?.(input.id);
	};
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
			<ScLabel size={12} onClick={focusInput}>
				{props.label}
			</ScLabel>
			<div
				onClick={focusInput}
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					height: 40,
					paddingLeft: 12,
					paddingRight: 12,
					borderRadius: scRadius.md,
					borderWidth: 1,
					borderColor: sc.input,
					backgroundColor: sc.background,
					cursor: "text",
					focusWithin: scRing(),
				}}
			>
				<input
					ref={(element) => {
						input = element;
					}}
					testId={props.testId}
					aria-label={props.label}
					value={props.value}
					placeholder={props.placeholder}
					theme={{
						text: sc.foreground,
						textMuted: sc.mutedForeground,
						textFaint: sc.mutedForeground,
						textDim: sc.mutedForeground,
						caret: sc.foreground,
					}}
					onChange={(event) => {
						if (event.value === undefined) {
							throw new Error("Input change without a value");
						}
						props.onChange(event.value);
					}}
					style={{
						flexGrow: 1,
						minWidth: 0,
						height: 24,
						fontSize: 14,
						fontWeight: weight.normal,
						color: sc.foreground,
						backgroundColor: "rgba(0,0,0,0)",
						keyboardFocusDim: false,
					}}
				/>
			</div>
		</div>
	);
}
