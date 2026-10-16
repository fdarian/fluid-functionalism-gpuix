import { createSignal, For, type JSX, Show } from "solid-js";
import { TabsSubtle, TabsSubtleItem } from "../../components/tabs-subtle";
import {
	color,
	radius,
	SchemeScope,
	type as scale,
	weight,
} from "../../lib/theme";

export const MONO = "Menlo";

/**
 * `DarkPreview` around `ComponentPreview`: the whole frame, header included,
 * renders in dark whatever the page's theme. The Inspect switch and the
 * highlighting of the Code tab are not ported (drift/surfaces.md).
 */
export function PreviewFrame(props: {
	code: string;
	/** "compact" is the source's `px-4 py-4`, "none" lets the demo bleed to the frame. */
	padding: "compact" | "none";
	testId: string;
	children: JSX.Element;
}) {
	const [tab, setTab] = createSignal(0);
	const lines = () => props.code.split("\n");
	return (
		<SchemeScope scheme="dark">
			<div
				style={{
					backgroundColor: color.background,
					borderRadius: radius.container,
				}}
			>
				<div
					testId={props.testId}
					style={{
						display: "flex",
						flexDirection: "column",
						borderWidth: 1,
						borderColor: color.borderFaint,
						borderRadius: radius.container,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							minHeight: 52,
							flexShrink: 0,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							padding: 12,
							borderBottomWidth: 1,
							borderColor: color.borderFaint,
							backgroundColor: color.background,
						}}
					>
						<TabsSubtle
							testId={`${props.testId}-tabs`}
							selectedIndex={tab()}
							onSelect={setTab}
						>
							<TabsSubtleItem
								index={0}
								label="Preview"
								testId={`${props.testId}-preview`}
							/>
							<TabsSubtleItem
								index={1}
								label="Code"
								testId={`${props.testId}-code`}
							/>
						</TabsSubtle>
					</div>
					<Show
						when={tab() === 0}
						fallback={
							<div
								style={{
									minHeight: 120,
									overflowX: "scroll",
									backgroundColor: color.background,
								}}
							>
								<div
									style={{
										flexShrink: 0,
										display: "flex",
										flexDirection: "column",
										padding: 16,
									}}
								>
									<For each={lines()}>
										{(line) => (
											<text
												style={{
													fontFamily: MONO,
													fontSize: scale.body.fontSize,
													lineHeight: scale.body.lineHeight,
													fontWeight: weight.normal,
													color: color.foreground,
													whiteSpace: "pre",
												}}
											>
												{line === "" ? " " : line}
											</text>
										)}
									</For>
								</div>
							</div>
						}
					>
						<div
							style={{
								minHeight: 120,
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								padding: props.padding === "compact" ? 16 : 0,
								backgroundColor: color.background,
							}}
						>
							{props.children}
						</div>
					</Show>
				</div>
			</div>
		</SchemeScope>
	);
}
