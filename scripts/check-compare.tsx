/**
 * The previous arrows of the home hero and the compare page, and the compare page's transforms,
 * read through the transformed boxes and captured pixels.
 *
 *   bun scripts/check-compare.tsx
 *
 * The shadcn accordion's chevron turns 180 degrees over 200 ms (`transition-transform duration-200`),
 * the shadcn switch's thumb slides on `translate-x-px` / `translate-x-[17px]` over 150 ms, and the
 * previous arrow is `ArrowRight` with `rotate-180`: its head points left, the next one's right.
 */
import { createCheck } from './check-kit';
import { readPng } from './png-pixels';

type Kit = Awaited<ReturnType<typeof createCheck>>;

const SHOT = `/tmp/check-compare-${process.pid}.png`;
const home = await createCheck('showcase');

/** The ink centroid's x within a box, minus its middle: positive when the mass is on the right. */
function inkSkew(kit: Kit, testId: string) {
	const box = kit.bounds(testId);
	kit.renderer.captureScreenshot(SHOT);
	const pixels = readPng(SHOT);
	const left = Math.round(box.x);
	const top = Math.round(box.y);
	const ground = pixels.at(left + 2, top + 2);
	let mass = 0;
	let moment = 0;
	for (let y = top + 4; y < top + box.height - 4; y++)
		for (let x = left + 4; x < left + box.width - 4; x++) {
			const pixel = pixels.at(x, y);
			const weight =
				Math.abs(pixel[0] - ground[0]) +
				Math.abs(pixel[1] - ground[1]) +
				Math.abs(pixel[2] - ground[2]);
			mass += weight;
			moment += weight * (x + 0.5 - (left + box.width / 2));
		}
	return moment / mass;
}
const heroPrevious = inkSkew(home, 'hero-prev');
const heroNext = inkSkew(home, 'hero-next');
home.check(
	"the home hero's previous arrow points left and the next one right",
	heroPrevious < -0.4 && heroNext > 0.4,
	`ink skew ${heroPrevious.toFixed(2)} previous, ${heroNext.toFixed(2)} next`,
);
const homeFailures = home.unmount();

const kit = await createCheck('compare');
const renderer = kit.renderer;
await kit.click('compare-pill-accordion');
await kit.settle(800);
const previous = inkSkew(kit, 'compare-prev');
const next = inkSkew(kit, 'compare-next');
kit.check(
	'the previous arrow points left and the next one right',
	previous < -0.4 && next > 0.4,
	`ink skew ${previous.toFixed(2)} previous, ${next.toFixed(2)} next`,
);

const chevron = 'sc-accordion-item-2-chevron';
await kit.scrollIntoView(chevron);
const chevronRest = kit.bounds(chevron).width;
renderer.clockPause();
try {
	await kit.click('sc-accordion-item-2');
	let widest = chevronRest;
	for (let frame = 0; frame < 8; frame++) {
		kit.step(25);
		widest = Math.max(widest, kit.bounds(chevron).width);
	}
	kit.check(
		'the shadcn chevron turns while its row opens',
		widest > chevronRest + 2,
		`widest ${widest.toFixed(2)} against ${chevronRest.toFixed(2)} at rest`,
	);
	kit.step(400);
	kit.check(
		'the shadcn chevron rests square',
		Math.abs(kit.bounds(chevron).width - chevronRest) < 0.1,
		`${kit.bounds(chevron).width.toFixed(2)} against ${chevronRest.toFixed(2)}`,
	);
} finally {
	renderer.clockResume();
}

await kit.click('compare-pill-switch');
await kit.settle(800);
const switchId = 'sc-switch-sound';
await kit.scrollIntoView(switchId);
const thumbOffset = () =>
	kit.bounds(`${switchId}-thumb`).x - kit.bounds(switchId).x;
const first = thumbOffset();
renderer.clockPause();
try {
	await kit.click(switchId);
	kit.step(75);
	const middle = thumbOffset();
	kit.step(400);
	const last = thumbOffset();
	const [from, to] = first < last ? [first, last] : [last, first];
	kit.check(
		'the shadcn thumb sits on translate-x-px and translate-x-[17px]',
		Math.abs(Math.abs(last - first) - 16) < 0.6 && from > 1.5 && to < 19,
		`${first.toFixed(2)} -> ${last.toFixed(2)}`,
	);
	kit.check(
		'the shadcn thumb is part of the way across after half the transition',
		Math.abs(middle - first) > 2 && Math.abs(last - middle) > 2,
		`${first.toFixed(2)} / ${middle.toFixed(2)} / ${last.toFixed(2)}`,
	);
} finally {
	renderer.clockResume();
}

const failures = homeFailures + kit.unmount();
console.log(failures === 0 ? 'all passed' : `${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
