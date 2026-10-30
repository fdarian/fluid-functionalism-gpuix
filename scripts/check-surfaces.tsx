/**
 * The surfaces page's static transforms.
 *
 *   bun scripts/check-surfaces.tsx
 *
 * The Problem canvas centres its dialog on `left-1/2 -translate-x-1/2`, and both invite dialogs' role
 * trigger carries a `ChevronDown` with `rotate-180`, so its point is at the top.
 */
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

const SHOT = `/tmp/check-surfaces-${process.pid}.png`;
const kit = await createCheck('surfaces');
const renderer = kit.renderer;

await kit.scrollIntoView('problem-dialog');
await kit.settle(600);
const canvas = kit.bounds('problem-canvas');
const dialog = kit.bounds('problem-dialog');
kit.check(
	'the Problem dialog is centred on the canvas',
	Math.abs(dialog.x + dialog.width / 2 - (canvas.x + canvas.width / 2)) < 0.5,
	`dialog centre ${(dialog.x + dialog.width / 2).toFixed(2)}, canvas centre ${(canvas.x + canvas.width / 2).toFixed(2)}`,
);

/** How many separate strokes the chevron's ink makes on its top and bottom rows: its two arms are apart at the open end, and one stroke at the point. */
function chevronRows(testId: string) {
	const box = kit.bounds(testId);
	renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const left = Math.round(box.x + box.width - 12 - 14 - 2);
	const top = Math.round(box.y + (box.height - 14) / 2 - 2);
	const ground = pixels.at(left, top);
	const rows: number[] = [];
	for (let y = top; y < top + 18; y++) {
		let runs = 0;
		let inRun = false;
		for (let x = left; x < left + 18; x++) {
			const pixel = pixels.at(x, y);
			const ink =
				Math.abs(pixel[0] - ground[0]) +
					Math.abs(pixel[1] - ground[1]) +
					Math.abs(pixel[2] - ground[2]) >
				60;
			if (ink && !inRun) runs++;
			inRun = ink;
		}
		rows.push(runs);
	}
	const inked = rows.flatMap((runs, index) => (runs > 0 ? [index] : []));
	return {
		top: rows[inked[0]],
		bottom: rows[inked[inked.length - 1]],
	};
}

for (const dialogId of ['problem-dialog', 'invite-dialog']) {
	await kit.scrollIntoView(dialogId);
	await kit.settle(600);
	const rows = chevronRows(`${dialogId}-role-trigger`);
	kit.check(
		`${dialogId}: the role chevron points up`,
		rows.top === 1 && rows.bottom === 2,
		`${rows.top} stroke(s) on the top ink row, ${rows.bottom} on the bottom one`,
	);
}

kit.finish();
