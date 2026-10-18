/**
 * How far the weight tokens move a label's width, against the browser.
 *
 *   bun scripts/check-weight-widths.tsx
 *
 * The source's `font-weight.ts` says `semibold` keeps every string of a 4-40
 * character corpus within 0.4 px of `normal` at 13 px. Chromium, measuring the
 * same `InterVariable.ttf` and tokens, does not reproduce that: Analytics grows
 * 1.05 px, FLUID FUNCTIONALISM REGISTRY DEPLOY shrinks 1.13 px. So the assertion
 * is that gpuix's delta equals the browser's, not that it stays under 0.4 px;
 * how many strings the source's claim misses is printed.
 *
 * Bounds snap to whole pixels, so each string is laid out at 130 px (the
 * tokens set `opsz` explicitly, so the advances scale linearly) and the width
 * difference is divided by 10: 0.1 px resolution.
 */
import { createSignal } from 'solid-js';
import { fontFamily, weight } from '#/lib/theme';
import { createCheck } from './check-kit';

const CORPUS = [
	'Teamspaces',
	'Recents',
	'Favorites',
	'Shared',
	'Library',
	'Settings',
	'Overview',
	'Analytics',
	'Notifications',
	'Fluid Hover',
	'Scrollbars',
	'Toggle dark mode',
	'Copy link',
	'Export as PDF',
	'Contact support',
	'Less than a year',
	'Native desktop',
	'Registry deploy pipeline',
	'Dark mode token audit',
	'Sidebar component height in demo',
	'Which features should we prioritize?',
	'Notifications and billing settings',
	'Restricted member',
	'One at a time',
	'HEX',
	'OKLCH',
	'ILLEGAL MINIMUM',
	'FLUID FUNCTIONALISM REGISTRY DEPLOY',
	'lowercase heavy mixed iiillljjj',
	'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
	'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
	'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
	'2–10 · 11–50 · 50+ people',
] as const;

/** Width change from `normal` at 13 px as [semibold, bold], measured in Chromium (getBoundingClientRect, same font file and tokens). */
const BROWSER_DELTAS: Record<
	(typeof CORPUS)[number],
	readonly [number, number]
> = {
	Teamspaces: [0.17, -0.14],
	Recents: [0.39, 0.58],
	Favorites: [0.44, 0.8],
	Shared: [0.19, 0.34],
	Library: [0.22, 0.36],
	Settings: [0.64, 1.27],
	Overview: [0.39, 0.47],
	Analytics: [1.05, 1.77],
	Notifications: [0.91, 1.61],
	'Fluid Hover': [-0.11, -0.5],
	Scrollbars: [0.42, 0.78],
	'Toggle dark mode': [-0.56, -1.7],
	'Copy link': [0.14, -0.06],
	'Export as PDF': [-0.38, -0.86],
	'Contact support': [0.69, 1.16],
	'Less than a year': [-0.39, -1.23],
	'Native desktop': [0.36, 0.41],
	'Registry deploy pipeline': [0.39, 0.0],
	'Dark mode token audit': [-0.14, -0.69],
	'Sidebar component height in demo': [-0.08, -0.95],
	'Which features should we prioritize?': [0.67, 0.61],
	'Notifications and billing settings': [1.09, 1.44],
	'Restricted member': [0.56, 0.83],
	'One at a time': [-0.34, -0.94],
	HEX: [0.2, 0.31],
	OKLCH: [0.08, 0.0],
	'ILLEGAL MINIMUM': [-0.39, -0.98],
	'FLUID FUNCTIONALISM REGISTRY DEPLOY': [-1.13, -2.66],
	'lowercase heavy mixed iiillljjj': [0.63, 0.34],
	mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm: [5.66, 9.81],
	WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW: [7.66, 11.44],
	iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii: [3.98, 6.95],
	'2–10 · 11–50 · 50+ people': [-0.69, -2.91],
};

/** The two whole-pixel snaps of a width each cost up to 0.5 px, divided by the 10x scale. */
const PARITY_TOLERANCE_PX = 0.2;
/** What the source's font-weight.ts claims for semibold. */
const SOURCE_CLAIM_PX = 0.4;
const SCALE_UP = 10;
const [probe, setProbe] = createSignal<string>(CORPUS[0]);
const partA = await createCheck(
	() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				fontFamily,
				fontSize: 130,
				lineHeight: '150px',
			}}
		>
			{(['normal', 'semibold', 'bold'] as const).map((name) => (
				<text
					testId={`probe-${name}`}
					style={{
						whiteSpace: 'nowrap',
						fontVariationSettings: weight[name],
						color: '#fff',
					}}
				>
					{probe()}
				</text>
			))}
		</div>
	),
	{ width: 6000, height: 520 },
);

type Row = { text: string; semibold: number; bold: number };
const rows: Row[] = [];
for (const text of CORPUS) {
	setProbe(text);
	await partA.settle(60);
	const normal = partA.bounds('probe-normal').width;
	rows.push({
		text,
		semibold: (partA.bounds('probe-semibold').width - normal) / SCALE_UP,
		bold: (partA.bounds('probe-bold').width - normal) / SCALE_UP,
	});
}

console.log('width change from normal at 13px, gpuix (browser), in px');
console.log('  semibold         bold            chars  text');
for (const row of rows) {
	const browser = BROWSER_DELTAS[row.text as (typeof CORPUS)[number]];
	const cell = (gpuix: number, reference: number) =>
		`${gpuix.toFixed(1).padStart(5)} (${reference.toFixed(2).padStart(5)})`;
	console.log(
		`  ${cell(row.semibold, browser[0])}  ${cell(row.bold, browser[1])}  ${row.text.length.toString().padStart(3)}    ${row.text}`,
	);
}
const worst = (pick: (row: Row) => number) =>
	Math.max(...rows.map((row) => Math.abs(pick(row))));
console.log(
	`worst |delta|: semibold ${worst((row) => row.semibold).toFixed(1)} px, bold ${worst((row) => row.bold).toFixed(1)} px`,
);
const beyondClaim = CORPUS.filter(
	(text) => Math.abs(BROWSER_DELTAS[text][0]) > SOURCE_CLAIM_PX,
);
console.log(
	`semibold beyond the source's ±${SOURCE_CLAIM_PX} px in the browser itself: ${beyondClaim.length} of ${CORPUS.length}`,
);

for (const row of rows) {
	const reference = BROWSER_DELTAS[row.text as (typeof CORPUS)[number]][0];
	partA.check(
		`semibold delta matches the browser: ${row.text}`,
		Math.abs(row.semibold - reference) <= PARITY_TOLERANCE_PX,
		`gpuix ${row.semibold.toFixed(1)}, browser ${reference.toFixed(2)}`,
	);
}
partA.finish();
