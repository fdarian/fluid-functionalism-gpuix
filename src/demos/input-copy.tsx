import { createSignal, type JSX } from "solid-js";
import { InputCopy } from "../components/input-copy";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

const COMMAND =
	"npx shadcn@latest add https://www.fluidfunctionalism.com/r/input-copy.json";

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
					<InputCopy
						testId="basic"
						value={COMMAND}
					/>
				</Field>
				<Field label="With label">
					<InputCopy
						testId="label"
						label="Install command"
						value={COMMAND}
					/>
				</Field>
				<Field label="Button">
					<InputCopy
						testId="button"
						variant="button"
						value={COMMAND}
					/>
				</Field>
				<Field label="Left, icon">
					<InputCopy
						testId="left-icon"
						align="left"
						value={COMMAND}
					/>
				</Field>
				<Field label="Left, button">
					<InputCopy
						testId="left-button"
						variant="button"
						align="left"
						value={COMMAND}
					/>
				</Field>
				<Field label="Disabled">
					<InputCopy
						testId="disabled"
						label="Invite code"
						value="ABCD-1234-EFGH"
						disabled
					/>
				</Field>
				<Field label="Callback">
					<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
						<InputCopy
							testId="callback"
							label="Share link"
							value="https://fluidfunctionalism.com/r/input-copy"
							onCopy={() => setCopyCount(copyCount() + 1)}
						/>
						<div style={{ paddingLeft: 4 }}>
							<text style={{ ...scale.caption, color: color.mutedForeground }}>
								{`Copied ${copyCount()} ${copyCount() === 1 ? "time" : "times"}`}
							</text>
						</div>
					</div>
				</Field>
				<Field label="Compact">
					<InputCopy
						testId="compact"
						size="compact"
						variant="button"
						value="ABCD-1234-EFGH"
					/>
				</Field>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic");
	await shot.settle(700);
	shot.capture("hover-tooltip");
	await shot.click("basic");
	shot.capture("copied");
	await shot.settle(2300);
	shot.capture("reset");

	// The pointer on the value's own glyphs, then on the icon.
	await shot.moveTo(1180, 700);
	const labelled = shot.centerOf("label");
	await shot.moveTo(labelled.x - 100, labelled.y + 12);
	await shot.moveTo(labelled.x - 96, labelled.y + 12);
	shot.capture("hover-value-text");
	await shot.moveTo(labelled.x + 134, labelled.y + 12);
	await shot.moveTo(labelled.x + 133, labelled.y + 12);
	shot.capture("hover-icon");

	await shot.moveTo(1180, 700);
	await shot.hover("button");
	shot.capture("button-hover");
	await shot.click("button");
	shot.capture("button-copied");
	shot.expectText("Copied", true);

	await shot.click("callback");
	shot.capture("callback");
	shot.expectText("Copied 1 time", true);

	const writeText = navigator.clipboard.writeText;
	navigator.clipboard.writeText = async () => {
		throw new Error("Clipboard access denied");
	};
	try {
		await shot.click("compact");
		shot.expectText("Failed", true);
		shot.capture("failed");
	} finally {
		navigator.clipboard.writeText = writeText;
	}
};
