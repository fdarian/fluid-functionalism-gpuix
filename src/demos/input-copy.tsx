import { createSignal, type JSX } from "solid-js";
import { InputCopy } from "../components/input-copy";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

const COMMAND =
	"npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json";

/** The screenshot script presses these buttons: it must not overwrite the clipboard of whoever runs it. */
let capturing = false;
const copyUnlessCapturing = async (text: string) => {
	if (capturing) return;
	const { copyToClipboard } = await import("../components/input-copy");
	await copyToClipboard(text);
};
const failToCopy = async () => {
	throw new Error("Clipboard access denied");
};

export const title = "Input Copy";
export const group = "Components";

function Field(props: { label: string; children: JSX.Element }) {
	return (
		<DemoRow label={props.label}>
			<div style={{ width: 288 }}>{props.children}</div>
		</DemoRow>
	);
}

export function Demo() {
	const [copyCount, setCopyCount] = createSignal(0);
	return (
		<DemoCard title="Input Copy">
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				<Field label="Basic">
					<InputCopy testId="basic" value={COMMAND} copy={copyUnlessCapturing} />
				</Field>
				<Field label="With label">
					<InputCopy
						testId="label"
						label="Install command"
						value={COMMAND}
						copy={copyUnlessCapturing}
					/>
				</Field>
				<Field label="Button">
					<InputCopy
						testId="button"
						variant="button"
						value={COMMAND}
						copy={copyUnlessCapturing}
					/>
				</Field>
				<Field label="Left, icon">
					<InputCopy
						testId="left-icon"
						align="left"
						value={COMMAND}
						copy={copyUnlessCapturing}
					/>
				</Field>
				<Field label="Left, button">
					<InputCopy
						testId="left-button"
						variant="button"
						align="left"
						value={COMMAND}
						copy={copyUnlessCapturing}
					/>
				</Field>
				<Field label="Disabled">
					<InputCopy
						testId="disabled"
						label="Invite code"
						value="ABCD-1234-EFGH"
						disabled
						copy={copyUnlessCapturing}
					/>
				</Field>
				<Field label="Callback">
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<InputCopy
							testId="callback"
							label="Share link"
							value="https://fluidfunctionalism.com/r/input-copy"
							copy={copyUnlessCapturing}
							onCopy={() => setCopyCount(copyCount() + 1)}
						/>
						<div style={{ paddingLeft: 4 }}>
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{`Copied ${copyCount()} ${copyCount() === 1 ? "time" : "times"}`}
							</text>
						</div>
					</div>
				</Field>
				<Field label="Copy fails">
					<InputCopy
						testId="failing"
						variant="button"
						value="ABCD-1234-EFGH"
						copy={failToCopy}
					/>
				</Field>
				<Field label="Compact">
					<InputCopy
						testId="compact"
						size="compact"
						variant="button"
						value="ABCD-1234-EFGH"
						copy={copyUnlessCapturing}
					/>
				</Field>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	capturing = true;

	await shot.hover("basic");
	await shot.settle(700);
	shot.capture("hover-tooltip");
	await shot.click("basic");
	shot.capture("copied");
	await shot.settle(2300);
	shot.capture("reset");

	await shot.moveTo(1180, 700);
	await shot.hover("button");
	shot.capture("button-hover");
	await shot.click("button");
	shot.capture("button-copied");
	shot.expectText("Copied", true);

	await shot.click("callback");
	shot.capture("callback");
	shot.expectText("Copied 1 time", true);

	await shot.click("failing");
	shot.expectText("Failed", true);
	shot.capture("failed");
};
