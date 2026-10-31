/**
 * The queued-to-sent morph on the queued-stack page: a text-only card that leaves the queue hands its box to the sent
 * bubble, which starts as the card and glides and scales into place on `spring.moderate`. A card with attachments
 * does not morph: its bubble enters the way any message does.
 *
 *   bun scripts/check-queued-morph.tsx
 *
 * The replies stream in real time. From the dispatch on the motion clock is held, so the bubble's transformed box is
 * read at exact times after it. The morph is read where the transcript has not scrolled: a scroll between the
 * dispatch's commit and its first frame moves the bubble's start box by the distance scrolled (README, gpuix gap).
 */
import { createCheck } from './check-kit';

type Box = { x: number; y: number; width: number; height: number };

const ROUND = (box: Box) =>
	JSON.stringify([box.x, box.y, box.width, box.height].map(Math.round));
const near = (actual: number, expected: number, tolerance: number) =>
	Math.abs(actual - expected) <= tolerance;
const between = (value: number, one: number, other: number) =>
	value > Math.min(one, other) && value < Math.max(one, other);

/** Starts the reply, holds the motion clock, and samples the bubble of queued message `id` from the frame it is sent. */
async function dispatch(
	kit: Awaited<ReturnType<typeof createCheck>>,
	id: string,
) {
	await kit.click('chat-playback');
	kit.renderer.clockPause();
	let card: Box | undefined;
	await kit.until(
		() => {
			if (kit.exists(`queued-${id}`)) card = kit.bounds(`queued-${id}`);
			return kit.exists(`sent-${id}`);
		},
		`${id} to be sent`,
		30000,
	);
	if (card === undefined) throw new Error(`${id} was never a card`);
	const samples = [kit.bounds(`sent-${id}`)];
	const texts: Box[] = [];
	for (let elapsed = 0; elapsed < 800; elapsed += 16) {
		kit.step(16);
		samples.push(kit.bounds(`sent-${id}`));
		texts.push(
			kit.exists(`sent-${id}-text`)
				? kit.bounds(`sent-${id}-text`)
				: samples[samples.length - 1],
		);
	}
	return { card, samples, texts };
}

// A card with two files comes first in the seeded queue: its bubble enters like any message, from below.
const withFiles = await createCheck('queued-stack');
await withFiles.scrollIntoView('chat-stack');
withFiles.check('no bubble is sent yet', !withFiles.exists('sent-chat-1'));
const filesSent = await dispatch(withFiles, 'chat-1');
withFiles.renderer.clockResume();
withFiles.check(
	'a card with attachments does not morph: its bubble does not start as the card',
	filesSent.samples[0].width < filesSent.card.width / 2,
	`bubble ${ROUND(filesSent.samples[0])}, card ${ROUND(filesSent.card)}`,
);
let failures = withFiles.unmount();

// Without it the text card is next, with no scroll in the transcript yet.
const kit = await createCheck('queued-stack');
await kit.scrollIntoView('chat-stack');
await kit.hoverFor(kit.center('queued-chat-1'), 700);
await kit.click('remove-chat-1');
await kit.settle(500);
kit.check('the card with files is gone', !kit.exists('queued-chat-1'));
const morph = await dispatch(kit, 'chat-2');
const first = morph.samples[0];
const rest = morph.samples[morph.samples.length - 1];
kit.check(
	'a text card morphs: its bubble starts as the card',
	near(first.x, morph.card.x, 3) &&
		near(first.y, morph.card.y, 3) &&
		near(first.width, morph.card.width, 3) &&
		near(first.height, morph.card.height, 3),
	`card ${ROUND(morph.card)}, bubble ${ROUND(first)}`,
);
kit.check(
	'and ends as a bubble of the width its text asks for',
	rest.width < morph.card.width / 2 && rest.width > 100,
	`${rest.width.toFixed(1)}px`,
);
const mid = morph.samples.find(
	(box) => box.width < (first.width + rest.width) / 2,
);
if (mid === undefined) throw new Error('the bubble never narrowed');
kit.check(
	'mid-morph the transformed box is between the two, on both axes and in size',
	between(mid.x, first.x, rest.x) &&
		between(mid.y, first.y, rest.y) &&
		between(mid.width, first.width, rest.width) &&
		between(mid.height, first.height, rest.height),
	`${ROUND(first)} -> ${ROUND(mid)} -> ${ROUND(rest)}`,
);
// The words are a `layout="position"` box of their own, so they travel with the bubble and are never stretched by it.
const outside = morph.samples.filter((bubble, index) => {
	const text = morph.texts[index - 1];
	return (
		index > 0 &&
		(text.x < bubble.x - 1 ||
			text.x + text.width > bubble.x + bubble.width + 1 ||
			text.y < bubble.y - 1 ||
			text.y + text.height > bubble.y + bubble.height + 1)
	);
});
kit.check(
	'the words stay inside the bubble through the morph',
	outside.length === 0,
	`${outside.length} of ${morph.samples.length - 1} frames outside`,
);
const widths = morph.samples.map((box) => box.width);
kit.check(
	'the width reaches the bubble and stays there',
	near(widths[widths.length - 1], widths[widths.length - 30], 0.1),
	`${widths[widths.length - 30].toFixed(1)} then ${widths[widths.length - 1].toFixed(1)}`,
);
kit.renderer.clockResume();
await kit.settle(600);
const settled = kit.bounds('sent-chat-2');
kit.check(
	'once the morph props are dropped the bubble has not moved',
	near(settled.x, rest.x, 0.5) &&
		near(settled.y, rest.y, 0.5) &&
		near(settled.width, rest.width, 0.5),
	`${ROUND(settled)} against ${ROUND(rest)}`,
);
failures += kit.unmount();
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
