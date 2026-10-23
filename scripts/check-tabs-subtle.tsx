/**
 * TabsSubtle label gap and fold, measured on layout bounds.
 *
 *   bun scripts/check-tabs-subtle.tsx
 *
 * An unfolded `activeLabel` tab is the plain icon-and-label tab with the icon
 * gap swapped for the label's own margin: 8 default, 6 compact. The plain tab's
 * gap is 8 / 4, so the width difference is margin - gap.
 *
 * Moving the selection folds one label and unfolds another, both on
 * `spring.fast` (a bounce-free 80 ms spring): the widths travel between their
 * two ends in a few frames and never overshoot.
 */
import { createSignal } from 'solid-js';
import { TabsSubtle, TabsSubtleItem } from '#/components/tabs-subtle';
import { createCheck } from './check-kit';

const [selected, setSelected] = createSignal(0);
const kit = await createCheck(() => (
	<div
		style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}
	>
		{(['default', 'compact'] as const).map((size) => (
			<>
				<TabsSubtle selectedIndex={0} onSelect={() => {}} size={size}>
					<TabsSubtleItem
						testId={`${size}-plain`}
						index={0}
						icon="clock"
						label="Recents"
					/>
				</TabsSubtle>
				<TabsSubtle
					selectedIndex={0}
					onSelect={() => {}}
					size={size}
					activeLabel
				>
					<TabsSubtleItem
						testId={`${size}-active`}
						index={0}
						icon="clock"
						label="Recents"
					/>
				</TabsSubtle>
			</>
		))}
		{(['default', 'compact'] as const).map((size) => (
			<TabsSubtle selectedIndex={0} onSelect={() => {}} size={size} activeLabel>
				<TabsSubtleItem
					testId={`${size}-teamspaces`}
					index={0}
					icon="folder"
					label="Teamspaces"
				/>
			</TabsSubtle>
		))}
		<div style={{ width: 120, display: 'flex', flexDirection: 'column' }}>
			<TabsSubtle
				testId="narrow"
				selectedIndex={0}
				onSelect={() => {}}
				size="default"
			>
				<TabsSubtleItem testId="narrow-0" index={0} label="Teamspaces" />
				<TabsSubtleItem testId="narrow-1" index={1} label="Recents" />
				<TabsSubtleItem testId="narrow-2" index={2} label="Favorites" />
			</TabsSubtle>
		</div>
		<TabsSubtle
			testId="pair"
			selectedIndex={selected()}
			onSelect={setSelected}
			activeLabel
			size="default"
		>
			<TabsSubtleItem testId="first" index={0} icon="clock" label="Recents" />
			<TabsSubtleItem testId="second" index={1} icon="star" label="Starred" />
		</TabsSubtle>
	</div>
));
const renderer = kit.renderer;
const width = (testId: string) => kit.bounds(testId).width;

// A tab selected at mount is born unfolded: `width: auto` is its target from the first frame, so nothing unfolds as the page appears.
renderer.clockPause();
const mountWidths: number[] = [];
for (let frame = 0; frame < 6; frame++) {
	renderer.flush();
	mountWidths.push(width('default-active'));
	kit.step(16);
}
renderer.clockResume();
await kit.settle(800);
kit.check(
	'the tab selected at mount is at its label width from the first frame',
	mountWidths.every((value) => Math.abs(value - width('default-active')) < 0.5),
	mountWidths.map((value) => value.toFixed(1)).join(' '),
);

const expected = { default: 8, compact: 6 } as const;
const iconGap = { default: 8, compact: 4 } as const;
for (const size of ['default', 'compact'] as const) {
	const margin =
		width(`${size}-active`) - width(`${size}-plain`) + iconGap[size];
	kit.check(
		`${size}: label margin`,
		Math.abs(margin - expected[size]) < 0.5,
		`${margin.toFixed(2)} (want ${expected[size]})`,
	);
}

// The unfolded label sits in a block with the button's 16px / 24px strut, as the source's `overflow-hidden` span does, so the clip is 24px tall and the baseline 18px down it. Chrome's cap boxes inside the tab are 14.55-24.00 (36px tab) and 11.27-20.00 (28px tab).
const chromeBaseline = { default: 24.0, compact: 20.0 } as const;
const chromeCapTop = { default: 14.55, compact: 11.27 } as const;
for (const size of ['default', 'compact'] as const) {
	const testId = `${size}-teamspaces`;
	const tab = kit.bounds(testId);
	const clip = kit.bounds(`${testId}-clip`);
	const cap = kit.bounds(`${testId}-label`);
	const baseline = cap.y + cap.height - tab.y;
	const capTop = cap.y - tab.y;
	kit.check(
		`${size}: the unfolded label's baseline is Chrome's`,
		Math.abs(baseline - chromeBaseline[size]) <= 0.01,
		`${baseline.toFixed(2)} cap ${cap.height.toFixed(2)} (Chrome ${chromeBaseline[size].toFixed(2)})`,
	);
	kit.check(
		`${size}: the unfolded label's cap top is Chrome's`,
		Math.abs(capTop - chromeCapTop[size]) <= 0.02,
		`${capTop.toFixed(3)} (Chrome ${chromeCapTop[size].toFixed(2)})`,
	);
	kit.check(
		`${size}: the unfolded label's clip is the strut's 24px, centred in the tab`,
		Math.abs(clip.height - 24) < 0.01 &&
			Math.abs(clip.y - tab.y - (tab.height - 24) / 2) < 0.5,
		`${clip.height} tall at ${(clip.y - tab.y).toFixed(2)}`,
	);
	const clipBottom = clip.y + clip.height;
	const below = clipBottom - Math.round(cap.y + cap.height) - 1;
	kit.check(
		`${size}: the descender of "Teamspaces" is drawn inside the clip`,
		below >= 2 &&
			kit.ink({
				x: cap.x,
				y: Math.round(cap.y + cap.height) + 1,
				width: cap.width,
				height: below,
			}) > 100,
		`${below}px of clip under the baseline`,
	);
}

// The list is the source's box: -mx-1 px-1 and max-w-[calc(100%+8px)] around the tabs, in a column parent as wide as the parent plus the two 4px.
const narrow = kit.bounds('narrow');
const narrowFirst = kit.bounds('narrow-0');
kit.check(
	'list: spans its parent plus the 4px outset each side',
	Math.abs(narrow.width - 128) < 0.5 &&
		Math.abs(narrowFirst.x - (narrow.x + 4)) < 0.5,
	`${narrow.width} wide, first tab ${narrowFirst.x - narrow.x} in`,
);
kit.check(
	'list: tabs wider than the list overflow it, scrolling',
	kit.bounds('narrow-2').x + kit.bounds('narrow-2').width >
		narrow.x + narrow.width,
);

// The list scrolls, and its pills scroll with the tabs they mark.
renderer.nativeSimulateScrollWheel(narrow.x + 30, narrow.y + 10, 200, 0);
await kit.settle(400);
const scrolledLast = kit.bounds('narrow-2');
await kit.hoverFor(
	{ x: scrolledLast.x + 10, y: scrolledLast.y + scrolledLast.height / 2 },
	500,
);
kit.check(
	'list: scrolled, the hover pill is on the tab under the pointer',
	scrolledLast.x + scrolledLast.width <= narrow.x + narrow.width &&
		kit.exists('narrow-preview') &&
		Math.abs(kit.bounds('narrow-preview').x - scrolledLast.x) < 1,
	`tab ${scrolledLast.x}, pill ${kit.exists('narrow-preview') ? kit.bounds('narrow-preview').x : 'none'}`,
);
await kit.hoverFor({ x: 2, y: 2 }, 300);

const pair = kit.bounds('pair');
await kit.hoverFor(
	{ x: pair.x + pair.width - 10, y: pair.y + pair.height / 2 },
	300,
);
kit.check(
	'list: the pointer in the empty space after the last tab lights it',
	kit.exists('pair-preview'),
);
await kit.hoverFor({ x: 2, y: 2 }, 300);

const unfolded = width('first');
const folded = width('second');
// The motion clock is held and stepped by hand, so the frames sampled do not depend on how fast the machine runs them.
renderer.clockPause();
setSelected(1);
kit.step(0);
const firstAtCommit = width('first');
const secondAtCommit = width('second');
const firstWidths: number[] = [];
const secondWidths: number[] = [];
for (let frame = 0; frame < 40; frame++) {
	kit.step(8);
	firstWidths.push(width('first'));
	secondWidths.push(width('second'));
}
renderer.clockResume();
const first = (index: number) => firstWidths[index] as number;
const second = (index: number) => secondWidths[index] as number;
const last = firstWidths.length - 1;
kit.check(
	'the old label folds to the icon-only width',
	Math.abs(first(last) - folded) < 0.5,
	`${first(last).toFixed(2)} (want ${folded.toFixed(2)})`,
);
kit.check(
	'the selected tab unfolds to the label width',
	second(last) > folded + 20,
	`${second(last).toFixed(2)} against ${folded.toFixed(2)} folded`,
);
kit.check(
	'folding passes through widths between its ends',
	firstWidths.some((value) => value < unfolded - 0.5 && value > folded + 0.5),
	firstWidths
		.slice(0, 8)
		.map((value) => value.toFixed(1))
		.join(' '),
);
kit.check(
	'unfolding passes through widths between its ends',
	secondWidths.some(
		(value) => value > folded + 0.5 && value < second(last) - 0.5,
	),
	secondWidths
		.slice(0, 8)
		.map((value) => value.toFixed(1))
		.join(' '),
);
// The unfold is the fold run backwards: both leave their start on the frame after the commit and cover the same share of their travel at each step, so the `width: auto` clock started at the change, not a frame later.
const folding = (index: number) =>
	(unfolded - first(index)) / (unfolded - folded);
const unfolding = (index: number) =>
	(second(index) - folded) / (second(last) - folded);
kit.check(
	'the commit frame leaves both widths where they were',
	Math.abs(firstAtCommit - unfolded) < 0.5 &&
		Math.abs(secondAtCommit - folded) < 0.5,
	`first ${firstAtCommit.toFixed(1)} of ${unfolded.toFixed(1)}, second ${secondAtCommit.toFixed(1)} of ${folded.toFixed(1)}`,
);
kit.check(
	'the unfold covers the same share of its travel as the fold at every step',
	[0, 1, 2, 3, 4, 5].every(
		(index) => Math.abs(folding(index) - unfolding(index)) < 0.03,
	),
	[0, 1, 2, 3, 4, 5]
		.map(
			(index) => `${folding(index).toFixed(2)}/${unfolding(index).toFixed(2)}`,
		)
		.join(' '),
);
kit.check(
	'neither width overshoots its end',
	firstWidths.every(
		(value) => value <= unfolded + 0.5 && value >= folded - 0.5,
	) &&
		secondWidths.every(
			(value) => value >= folded - 0.5 && value <= second(last) + 0.5,
		),
);

kit.finish();
