/**
 * Card scenarios: a footer button must not click the card behind it, the root
 * carries the source's ARIA, CardFeature's compact icon gap is 4, and the hover fills
 * and the dismiss chip's reveal ease over 80 ms.
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
import { readPng } from "./png-pixels";

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
		<Card testId="act" label="Actions">
			<CardHeader>
				<CardTitle>Actions</CardTitle>
			</CardHeader>
			<CardFooter>
				<CardButton testId="act-button">Go</CardButton>
			</CardFooter>
		</Card>
		<Card testId="dismissable" dismissible onDismiss={() => {}}>
			<CardHeader>
				<CardTitle>Dismissible</CardTitle>
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
), { height: 1000 });

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
await check.press("Enter");
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

// Fades, on a held motion clock so a slow frame cannot skip the middle of the 80 ms. Each is probed at 16 ms: an
// instant switch is already at its end by then.
const FADE_PATH = `/tmp/check-card-fade-${process.pid}.png`;
const renderer = check.renderer;
function step(ms: number) {
	renderer.clockFastForward(ms);
	renderer.flush();
	renderer.dispatchNativeEvents();
}
function sumAt(x: number, y: number) {
	renderer.captureScreenshot(FADE_PATH);
	const pixel = readPng(FADE_PATH).at(Math.round(x), Math.round(y));
	return pixel[0] + pixel[1] + pixel[2];
}
function partway(rest: number, middle: number, end: number) {
	return (
		(middle - rest) * (end - rest) > 0 &&
		Math.abs(middle - rest) < 0.6 * Math.abs(end - rest)
	);
}
async function park() {
	renderer.nativeSimulateMouseMove(2, 2);
	await check.settle(300);
}
function hoverAt(x: number, y: number) {
	renderer.nativeSimulateMouseMove(x - 1, y);
	renderer.nativeSimulateMouseMove(x, y);
}

await park();
{
	// A standalone clickable card tints itself: the body, right of the footer button.
	const box = check.bounds("card");
	const at = { x: box.x + box.width - 14, y: box.y + 14 };
	const rest = sumAt(at.x, at.y);
	renderer.clockPause();
	hoverAt(at.x, at.y);
	step(0);
	step(16);
	const middle = sumAt(at.x, at.y);
	step(300);
	const end = sumAt(at.x, at.y);
	renderer.clockResume();
	check.check(
		"standalone card hover fill eases",
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

await park();
{
	// CardButton in a card that is not clickable, so only the button changes.
	const box = check.bounds("act-button");
	const at = { x: box.x + 5, y: box.y + box.height / 2 };
	const rest = sumAt(at.x, at.y);
	renderer.clockPause();
	hoverAt(box.x + box.width / 2, box.y + box.height / 2);
	step(0);
	step(16);
	const middle = sumAt(at.x, at.y);
	step(300);
	const end = sumAt(at.x, at.y);
	renderer.clockResume();
	check.check(
		"CardButton hover fill eases",
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

await park();
{
	// The dismiss chip shows on card hover: its glyph's ink grows over 80 ms instead of appearing at once.
	const chip = check.bounds("dismissable-dismiss");
	const box = check.bounds("dismissable");
	const rest = check.ink(chip);
	renderer.clockPause();
	hoverAt(box.x + 30, box.y + box.height / 2);
	step(0);
	step(16);
	const middle = check.ink(chip);
	step(300);
	const end = check.ink(chip);
	renderer.clockResume();
	check.check(
		"dismiss chip fades in on card hover",
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

check.finish();
