/**
 * Card scenarios: a footer button must not click the card behind it, the root
 * carries the source's ARIA, and CardFeature's compact icon gap is 4.
 *
 *   bun scripts/check-card.tsx
 */
import { createSignal } from "solid-js";
import {
	Card,
	CardButton,
	CardFeature,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../src/components/card";
import { createCheck } from "./check-kit";

const [cardClicks, setCardClicks] = createSignal(0);
const [buttonClicks, setButtonClicks] = createSignal(0);

const check = await createCheck(() => (
	<div
		style={{
			display: "flex",
			flexDirection: "column",
			gap: 12,
			padding: 20,
			width: 360,
		}}
	>
		<Card
			testId="card"
			label="Open card"
			onClick={() => setCardClicks(cardClicks() + 1)}
		>
			<CardHeader>
				<CardTitle>Clickable</CardTitle>
			</CardHeader>
			<CardFooter>
				<CardButton
					testId="button"
					onClick={() => setButtonClicks(buttonClicks() + 1)}
				>
					Action
				</CardButton>
			</CardFooter>
		</Card>
		<Card testId="selected" label="Chosen" selected onClick={() => {}}>
			<CardHeader>
				<CardTitle>Selected</CardTitle>
			</CardHeader>
		</Card>
		<Card testId="disabled" label="Off" disabled onClick={() => {}}>
			<CardHeader>
				<CardTitle>Disabled</CardTitle>
			</CardHeader>
		</Card>
		<Card testId="info" label="Info">
			<CardHeader>
				<CardTitle>Informational</CardTitle>
			</CardHeader>
		</Card>
		<Card testId="compact" size="compact">
			<CardFeature
				testId="feature"
				icon="moon"
				title="Dark mode"
				description="Tokens adapt"
			/>
		</Card>
	</div>
));

await check.settle();

await check.click("button");
check.expect(
	"pointer click on CardButton: button handler runs once",
	buttonClicks(),
	1,
);
check.expect(
	"pointer click on CardButton: card handler does not run",
	cardClicks(),
	0,
);

await check.focus("button");
await check.press("enter");
check.expect(
	"Enter on CardButton: button handler runs once more",
	buttonClicks(),
	2,
);
check.expect("Enter on CardButton: card handler does not run", cardClicks(), 0);

const cardBox = check.bounds("card");
await check.clickAt(cardBox.x + cardBox.width - 20, cardBox.y + 14);
check.expect(
	"click on the card body still runs the card handler",
	cardClicks(),
	1,
);

const open = check.aria("Open card");
check.expect("clickable card: role", open?.role, "Button");
check.expect("clickable card: label", open?.label, "Open card");
check.expect("unselected card: no toggled state", open?.toggled, undefined);
check.expect("unselected card: no selected state", open?.selected, undefined);
const chosen = check.aria("Chosen");
check.expect("selected card: toggled (aria-pressed)", chosen?.toggled, "True");
check.expect("selected card: no selected state", chosen?.selected, undefined);
console.log("disabled card node:", JSON.stringify(check.aria("Off")));
console.log("informational card node:", JSON.stringify(check.aria("Info")));

const icon = check.bounds("feature-icon");
const text = check.bounds("feature-text");
check.expect("compact CardFeature gap", text.x - (icon.x + icon.width), 4);

check.finish();
