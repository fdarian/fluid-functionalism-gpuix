/**
 * Card scenarios: a footer button must not click the card behind it, the root
 * carries the source's ARIA, CardFeature's compact icon gap is 4, and the hover fills
 * and the dismiss chip's reveal ease over 80 ms.
 *
 *   bun scripts/check-card.tsx
 */
import { createSignal } from 'solid-js';
import {
	Card,
	CardAction,
	CardButton,
	CardFeature,
	CardFooter,
	CardGroup,
	CardHeader,
	CardImage,
	CardTitle,
} from '#/components/card';
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const IMAGE =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%236B97FF'/%3E%3C/svg%3E";

const [cardClicks, setCardClicks] = createSignal(0);
const [buttonClicks, setButtonClicks] = createSignal(0);
const [actionClicks, setActionClicks] = createSignal(0);
const [imageCardClicks, setImageCardClicks] = createSignal(0);
const [imageButtonClicks, setImageButtonClicks] = createSignal(0);

const check = await createCheck(
	() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
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
					<CardButton testId="act-link" variant="link" external>
						Docs
					</CardButton>
				</CardFooter>
			</Card>
			<Card testId="dismissable" dismissible onDismiss={() => {}}>
				<CardHeader>
					<CardTitle>Dismissible</CardTitle>
				</CardHeader>
			</Card>
			<Card testId="dismiss-focus" dismissible onDismiss={() => {}}>
				<CardHeader>
					<CardTitle>Dismissible with a button</CardTitle>
				</CardHeader>
				<CardFooter>
					<CardButton testId="dismiss-focus-button">Go</CardButton>
				</CardFooter>
			</Card>
			<Card testId="actioned" onClick={() => setCardClicks(cardClicks() + 1)}>
				<CardHeader>
					<CardTitle>With an action</CardTitle>
					<CardAction>
						<CardButton
							testId="header-action"
							onClick={() => setActionClicks(actionClicks() + 1)}
						>
							Edit
						</CardButton>
					</CardAction>
				</CardHeader>
			</Card>
			<CardGroup orientation="inline" testId="inline-group">
				<Card
					testId="inline-image"
					label="Open image card"
					onClick={() => setImageCardClicks(imageCardClicks() + 1)}
				>
					<CardImage src={IMAGE} />
					<CardHeader>
						<CardTitle>Beside an image</CardTitle>
					</CardHeader>
					<CardFooter>
						<CardButton
							testId="inline-button"
							onClick={() => setImageButtonClicks(imageButtonClicks() + 1)}
						>
							Open
						</CardButton>
					</CardFooter>
				</Card>
			</CardGroup>
			<Card testId="compact" size="compact">
				<CardFeature
					testId="feature"
					icon="moon"
					title="Dark mode"
					description="Tokens adapt"
				/>
			</Card>
		</div>
	),
	{ height: 1000 },
);

await check.settle();

await check.click('button');
check.expect(
	'pointer click on CardButton: button handler runs once',
	buttonClicks(),
	1,
);
check.expect(
	'pointer click on CardButton: card handler does not run',
	cardClicks(),
	0,
);

await check.focus('button');
await check.press('Enter');
check.expect(
	'Enter on CardButton: button handler runs once more',
	buttonClicks(),
	2,
);
check.expect('Enter on CardButton: card handler does not run', cardClicks(), 0);

const cardBox = check.bounds('card');
await check.clickAt(cardBox.x + cardBox.width - 20, cardBox.y + 14);
check.expect(
	'click on the card body still runs the card handler',
	cardClicks(),
	1,
);

const open = check.aria('Open card');
check.expect('clickable card: role', open?.role, 'Button');
check.expect('clickable card: label', open?.label, 'Open card');
check.expect('unselected card: no toggled state', open?.toggled, undefined);
check.expect('unselected card: no selected state', open?.selected, undefined);
const chosen = check.aria('Chosen');
check.expect('selected card: toggled (aria-pressed)', chosen?.toggled, 'True');
check.expect('selected card: no selected state', chosen?.selected, undefined);
console.log('disabled card node:', JSON.stringify(check.aria('Off')));
console.log('informational card node:', JSON.stringify(check.aria('Info')));

const icon = check.bounds('feature-icon');
const text = check.bounds('feature-text');
check.expect('compact CardFeature gap', text.x - (icon.x + icon.width), 4);

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
	const box = check.bounds('card');
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
		'standalone card hover fill eases',
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

await park();
{
	// CardButton in a card that is not clickable, so only the button changes.
	const box = check.bounds('act-button');
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
		'CardButton hover fill eases',
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

await park();
{
	// The external arrow is an arrow-right turned -45 degrees: its head is at the top right of its 13px box.
	const box = check.bounds('act-link');
	const ARROW = 13;
	const left = Math.round(box.x + box.width - ARROW);
	const top = Math.round(box.y + (box.height - ARROW) / 2);
	const shot = `/tmp/check-card-arrow-${process.pid}.png`;
	renderer.captureScreenshot(shot);
	const pixels = readPng(shot);
	const ground = pixels.at(left - 3, top);
	let mass = 0;
	let momentX = 0;
	let momentY = 0;
	for (let y = top; y < top + ARROW; y++)
		for (let x = left; x < left + ARROW; x++) {
			const pixel = pixels.at(x, y);
			const weight =
				Math.abs(pixel[0] - ground[0]) +
				Math.abs(pixel[1] - ground[1]) +
				Math.abs(pixel[2] - ground[2]);
			mass += weight;
			momentX += weight * (x + 0.5 - (left + ARROW / 2));
			momentY += weight * (y + 0.5 - (top + ARROW / 2));
		}
	check.check(
		'the external arrow points up and to the right',
		mass > 0 && momentX / mass > 0.3 && momentY / mass < -0.3,
		`ink skew ${(momentX / mass).toFixed(2)} across, ${(momentY / mass).toFixed(2)} down`,
	);
}

await park();
{
	// The dismiss chip shows on card hover: its glyph's ink grows over 80 ms instead of appearing at once.
	const chip = check.bounds('dismissable-dismiss');
	const box = check.bounds('dismissable');
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
		'dismiss chip fades in on card hover',
		partway(rest, middle, end),
		`rest ${rest}, 16 ms ${middle}, end ${end}`,
	);
}

await park();
{
	// Focus inside the card, not on the chip, shows the chip too: group-focus-within/card.
	const chip = check.bounds('dismiss-focus-dismiss');
	const rest = check.ink(chip);
	await check.focus('dismiss-focus-button');
	await new Promise((resolve) => setTimeout(resolve, 300));
	const focused = check.ink(chip);
	check.check(
		'dismiss chip shows while a button inside the card has focus',
		focused > rest,
		`rest ${rest}, focused ${focused}`,
	);
}

// The overlay stands over the content, and what rises over it (z-30) takes its own presses, also
// where the plain wrapper of an inline image card holds the footer.
await check.click('header-action');
check.expect('CardAction: its handler runs', actionClicks(), 1);
check.expect('CardAction: the card does not run', cardClicks(), 1);
{
	const box = check.bounds('actioned');
	await check.clickAt(box.x + 30, box.y + box.height - 8);
	check.expect("the header's own box: the card runs", cardClicks(), 2);
}
await check.click('inline-button');
check.expect(
	'inline image card: the footer button runs',
	imageButtonClicks(),
	1,
);
check.expect('inline image card: the card does not run', imageCardClicks(), 0);
{
	const box = check.bounds('inline-image');
	await check.clickAt(box.x + box.width - 20, box.y + 14);
	check.expect(
		'inline image card: the card body runs the card',
		imageCardClicks(),
		1,
	);
}

check.finish();
