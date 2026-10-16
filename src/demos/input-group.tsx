import { createSignal } from "solid-js";
import { InputField, InputGroup } from "#/components/input-group";
import type { DemoModule, ShotContext } from "#/lib/demo";
import { DemoCard } from "#/lib/demo-kit";

export const title = "InputGroup";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	const [search, setSearch] = createSignal("");
	const [name, setName] = createSignal("");
	const [email, setEmail] = createSignal("");
	const [errorEmail, setErrorEmail] = createSignal("bad@");
	const [disabled, setDisabled] = createSignal("Read only");
	const [compactName, setCompactName] = createSignal("");
	const [compactEmail, setCompactEmail] = createSignal("");

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Basic">
				<InputGroup>
					<InputField
						testId="search"
						index={0}
						label="Search"
						placeholder="Search teamspaces..."
						icon="search"
						value={search()}
						onChange={setSearch}
					/>
				</InputGroup>
			</DemoCard>
			<DemoCard title="Multiple fields, default and compact">
				<div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
					<InputGroup>
						<InputField
							testId="name"
							index={0}
							label="Name"
							placeholder="Your name"
							value={name()}
							onChange={setName}
						/>
						<InputField
							testId="email"
							index={1}
							label="Email"
							placeholder="you@example.com"
							icon="mail"
							value={email()}
							onChange={setEmail}
						/>
					</InputGroup>
					<InputGroup size="compact">
						<InputField
							testId="compact-name"
							index={0}
							label="Name"
							placeholder="Your name"
							value={compactName()}
							onChange={setCompactName}
						/>
						<InputField
							testId="compact-email"
							index={1}
							label="Email"
							placeholder="you@example.com"
							icon="mail"
							value={compactEmail()}
							onChange={setCompactEmail}
						/>
					</InputGroup>
				</div>
			</DemoCard>
			<DemoCard title="Error state, default and compact, and disabled">
				<div style={{ display: "flex", flexDirection: "row", gap: 16 }}>
					<InputGroup>
						<InputField
							testId="error"
							index={0}
							label="Email"
							placeholder="you@example.com"
							icon="mail"
							value={errorEmail()}
							onChange={setErrorEmail}
							error="Please enter a valid email address."
						/>
					</InputGroup>
					<InputGroup size="compact">
						<InputField
							testId="compact-error"
							index={0}
							label="Email"
							placeholder="you@example.com"
							icon="mail"
							value={errorEmail()}
							onChange={setErrorEmail}
							error="Enter a valid email."
						/>
					</InputGroup>
					<InputGroup>
						<InputField
							testId="disabled"
							index={0}
							label="Workspace"
							icon="folder"
							value={disabled()}
							onChange={setDisabled}
							disabled
						/>
					</InputGroup>
				</div>
			</DemoCard>
		</div>
	);
}

/** The test pointer's first moves into a group only enter it, and fluid hover picks a field on a move: step twice more inside it. */
async function pointAt(shot: ShotContext, testId: string) {
	await shot.hover(testId);
	const point = shot.centerOf(testId);
	await shot.moveTo(point.x + 8, point.y + 4);
	await shot.moveTo(point.x + 14, point.y + 6);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await pointAt(shot, "name");
	shot.capture("hover");
	// Between the two fields the pointer still resolves to the nearest one.
	const name = shot.centerOf("name");
	const emailCenter = shot.centerOf("email");
	await shot.moveTo(name.x, (name.y + emailCenter.y) / 2 + 2);
	shot.capture("hover-gap");

	// Over the label text and over the icon, not the field's middle.
	await shot.moveTo(1180, 700);
	const email = shot.centerOf("email");
	await shot.moveTo(email.x - 100, email.y - 20);
	await shot.moveTo(email.x - 96, email.y - 20);
	await shot.moveTo(email.x - 92, email.y - 20);
	shot.capture("hover-label");
	await shot.moveTo(email.x - 118, email.y + 8);
	await shot.moveTo(email.x - 117, email.y + 8);
	await shot.moveTo(email.x - 116, email.y + 8);
	shot.capture("hover-icon");

	await shot.click("email-input");
	await shot.press("a @");
	shot.capture("focused");

	await shot.moveTo(1180, 700);
	await pointAt(shot, "error");
	shot.capture("error-hover");
	await shot.click("error-input");
	shot.capture("error-focused");

	await shot.moveTo(1180, 700);
	await pointAt(shot, "compact-email");
	shot.capture("compact-hover");
};
