/**
 * Per-feature cost model for gpuix draws, on the real window. Each case renders
 * N copies of one feature inside a fixed 1200 x 700 viewport, keeps a tiny
 * element animating so the window redraws continuously, and reports the p50 of
 * gpui's own CPU draw time (build + layout + paint) over ~1.5 s of draws.
 *
 * `bun scripts/perf-micro.tsx [group|case name ...] [--list] [--foreground] [--ms 1500]`
 * Only one perf run at a time: it takes over a real window.
 */
import { parseArgs } from 'node:util';
import type { GpuixRenderer, WindowOptions } from '@ghia/native';
import { startFrameLoop, type WindowFontsOption } from '@ghia/native/runtime';
import { createRenderer, motion, render } from '@ghia/solid';
import { createSignal, For, type JSX } from 'solid-js';
import { fonts } from '#/lib/fonts';
import { Icon } from '#/lib/icon';
import { colorFade, siteType, weight } from '#/lib/theme';
import { windowPlacement } from '#/lib/window-options';

const args = parseArgs({
	allowPositionals: true,
	options: {
		list: { type: 'boolean', default: false },
		foreground: { type: 'boolean', default: false },
		ms: { type: 'string', default: '1500' },
	},
});
const sampleMs = Number(args.values.ms);

const VIEW_W = 1200;
const VIEW_H = 700;
const INK = '#171717';
const PAPER = '#ffffff';
const GREY = '#8a8a8a';

const PARAGRAPH =
	'Every change, month by month. A release lands on the first Friday, and each entry names what moved, why it moved, and what to do about it if your code leans on the old behaviour. ' +
	'Nothing here is silent: a breaking change carries its diff and a prompt you can hand to an agent.';

type Layout = 'wrap' | 'column' | 'row-wrap-fixed';

type Case = {
	name: string;
	group: string;
	layout: Layout;
	counts: number[];
	item: (index: number) => JSX.Element;
	/** Wraps the whole N-item list, for depth tests. */
	wrap?: (children: JSX.Element) => JSX.Element;
};

const body = () => ({ ...siteType.body, color: INK });

type NestKind = 'block' | 'col' | 'row' | 'col-full';

/** `depth` wrappers around `children`: plain divs, flex columns, the entry's row-with-centre pattern, or columns at width 100%. */
function nest(depth: number, children: () => JSX.Element, kind: NestKind) {
	let build = children;
	for (let level = 0; level < depth; level++) {
		const inner = build;
		build = () => {
			switch (kind) {
				case 'block':
					return <div>{inner()}</div>;
				case 'col':
					return (
						<div style={{ display: 'flex', flexDirection: 'column' }}>
							{inner()}
						</div>
					);
				case 'col-full':
					return (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								width: '100%',
							}}
						>
							{inner()}
						</div>
					);
				case 'row':
					return (
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: 'space-between',
							}}
						>
							{inner()}
						</div>
					);
			}
		};
	}
	return build();
}

const box = (extra: Record<string, unknown> = {}) => (
	<div
		style={{
			width: 20,
			height: 20,
			margin: 2,
			backgroundColor: GREY,
			...extra,
		}}
	/>
);

const cases: Case[] = [
	{
		name: 'box',
		group: 'primitives',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () => box(),
	},
	{
		name: 'box-radius',
		group: 'primitives',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () => box({ borderRadius: 6 }),
	},
	{
		name: 'box-border',
		group: 'primitives',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () =>
			box({
				borderRadius: 6,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: INK,
			}),
	},
	{
		name: 'shadow-ring (0 0 0 3px, KindDot)',
		group: 'paint',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () => box({ boxShadow: `0 0 0 3px ${INK}`, borderRadius: 3 }),
	},
	{
		name: 'shadow-blur-2 (bentoFrame)',
		group: 'paint',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () =>
			box({
				borderRadius: 6,
				boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
			}),
	},
	{
		name: 'shadow-blur-24',
		group: 'paint',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () =>
			box({
				borderRadius: 6,
				boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
			}),
	},
	{
		name: 'clip (overflow hidden + radius + border) + 1 child',
		group: 'paint',
		layout: 'wrap',
		counts: [0, 200, 800],
		item: () => (
			<div
				style={{
					width: 40,
					height: 24,
					margin: 2,
					overflow: 'hidden',
					borderRadius: 8,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: INK,
				}}
			>
				<div style={{ width: 60, height: 30, backgroundColor: GREY }} />
			</div>
		),
	},
	{
		name: 'noclip (same, no overflow)',
		group: 'paint',
		layout: 'wrap',
		counts: [0, 200, 800],
		item: () => (
			<div
				style={{
					width: 40,
					height: 24,
					margin: 2,
					borderRadius: 8,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: INK,
				}}
			>
				<div style={{ width: 60, height: 30, backgroundColor: GREY }} />
			</div>
		),
	},
	{
		name: 'transition style declared (colorFade)',
		group: 'style',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () => box({ ...colorFade }),
	},
	{
		name: 'hover + focusVisible state styles',
		group: 'style',
		layout: 'wrap',
		counts: [0, 500, 2000],
		item: () =>
			box({
				hover: { backgroundColor: INK },
				focusVisible: { boxShadow: `0 0 0 2px ${INK}` },
			}),
	},
	{
		name: 'svg icon 14px (Icon, fade)',
		group: 'svg',
		layout: 'wrap',
		counts: [0, 100, 400],
		item: () => (
			<Icon name="arrow-right" size={14} strokeWidth={1.5} color={INK} fade />
		),
	},
	{
		name: 'svg icon 14px (Icon, no fade)',
		group: 'svg',
		layout: 'wrap',
		counts: [0, 100, 400],
		item: () => (
			<Icon name="arrow-right" size={14} strokeWidth={1.5} color={INK} />
		),
	},
	{
		name: 'display:none subtree (20 children each)',
		group: 'none',
		layout: 'wrap',
		counts: [0, 100, 400],
		item: () => (
			<div style={{ display: 'none' }}>
				<For each={Array.from({ length: 20 })}>{() => box()}</For>
			</div>
		),
	},
	{
		name: 'same subtree shown (20 children each)',
		group: 'none',
		layout: 'wrap',
		counts: [0, 100, 400],
		item: () => (
			<div style={{ display: 'flex', flexDirection: 'row' }}>
				<For each={Array.from({ length: 20 })}>{() => box()}</For>
			</div>
		),
	},
	{
		name: 'text short, direct in column',
		group: 'text',
		layout: 'column',
		counts: [0, 100, 400],
		item: (i) => <text style={body()}>{`Entry name ${i}`}</text>,
	},
	{
		name: 'text short, in flex row (centre)',
		group: 'text',
		layout: 'column',
		counts: [0, 100, 400],
		item: (i) => (
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<text style={body()}>{`Entry name ${i}`}</text>
			</div>
		),
	},
	{
		name: 'text long wrapped (300 chars, 600px)',
		group: 'text',
		layout: 'column',
		counts: [0, 50, 200],
		item: () => (
			<div style={{ width: 600 }}>
				<text style={body()}>{PARAGRAPH}</text>
			</div>
		),
	},
	{
		name: 'text inline mixed (4 code chips)',
		group: 'text',
		layout: 'column',
		counts: [0, 50, 200],
		item: () => (
			<div style={{ width: 600 }}>
				<text style={body()}>
					Swap
					<span
						style={{
							fontFamily: 'Menlo',
							backgroundColor: '#EBEBED',
							borderRadius: 4,
							paddingLeft: 4,
							paddingRight: 4,
							paddingTop: 1,
							paddingBottom: 1,
						}}
					>
						{' Tabs '}
					</span>
					for
					<span
						style={{
							fontFamily: 'Menlo',
							backgroundColor: '#EBEBED',
							borderRadius: 4,
							paddingLeft: 4,
							paddingRight: 4,
						}}
					>
						{' TabsList '}
					</span>
					and the
					<span
						style={{
							fontFamily: 'Menlo',
							backgroundColor: '#EBEBED',
							borderRadius: 4,
							paddingLeft: 4,
							paddingRight: 4,
						}}
					>
						{' size '}
					</span>
					prop, then
					<span
						style={{
							fontFamily: 'Menlo',
							backgroundColor: '#EBEBED',
							borderRadius: 4,
							paddingLeft: 4,
							paddingRight: 4,
						}}
					>
						{' compact '}
					</span>
					moves to the provider.
				</text>
			</div>
		),
	},
	{
		name: 'text inline, same 4 spans, no span style',
		group: 'text',
		layout: 'column',
		counts: [0, 50, 200],
		item: () => (
			<div style={{ width: 600 }}>
				<text style={body()}>
					Swap
					<span>{' Tabs '}</span>
					for
					<span>{' TabsList '}</span>
					and the
					<span>{' size '}</span>
					prop, then
					<span>{' compact '}</span>
					moves to the provider.
				</text>
			</div>
		),
	},
	...(['block', 'col', 'col-full', 'row'] as const).flatMap((kind) =>
		[1, 2, 4, 6, 8, 10, 12].map(
			(depth): Case => ({
				name: `short text under ${depth} nested ${kind}`,
				group: `depth-${kind}`,
				layout: 'column',
				counts: depth >= 6 ? [0, 8, 32] : [0, 50, 200],
				item: (i) =>
					nest(depth, () => <text style={body()}>{`Entry ${i}`}</text>, kind),
			}),
		),
	),
	{
		name: 'boxes in a scroller (overflow:scroll, 400x300), most below the fold',
		group: 'misc',
		layout: 'column',
		counts: [0, 500, 2000],
		item: (i) => box(),
		wrap: (children) => (
			<div
				style={{
					width: 400,
					height: 300,
					overflow: 'scroll',
					display: 'flex',
					flexDirection: 'row',
					flexWrap: 'wrap',
					alignContent: 'flex-start',
				}}
			>
				{children}
			</div>
		),
	},
	{
		name: 'boxes in a 400x300 overflow:hidden box (same list, for comparison)',
		group: 'misc',
		layout: 'column',
		counts: [0, 500, 2000],
		item: () => box(),
		wrap: (children) => (
			<div
				style={{
					width: 400,
					height: 300,
					overflow: 'hidden',
					display: 'flex',
					flexDirection: 'row',
					flexWrap: 'wrap',
					alignContent: 'flex-start',
				}}
			>
				{children}
			</div>
		),
	},
	{
		name: 'boxes in a 400x300 display:none box',
		group: 'misc',
		layout: 'column',
		counts: [0, 500, 2000],
		item: () => box(),
		wrap: (children) => (
			<div
				style={{
					width: 400,
					height: 300,
					display: 'none',
				}}
			>
				{children}
			</div>
		),
	},
	{
		name: 'motion.div idle (initial=false, animate)',
		group: 'misc',
		layout: 'wrap',
		counts: [0, 100, 400],
		item: () => (
			<motion.div
				style={{ width: 20, height: 20, margin: 2, backgroundColor: GREY }}
				initial={false}
				animate={{ width: 20, height: 20, borderRadius: 3 }}
				transition={{ duration: 0.2 }}
			/>
		),
	},
	{
		name: 'text with tabular-nums + semibold (header style)',
		group: 'misc',
		layout: 'column',
		counts: [0, 100, 400],
		item: (i) => (
			<text
				style={{
					...body(),
					fontVariationSettings: weight.semibold,
					fontVariantNumeric: 'tabular-nums',
				}}
			>{`Entry name ${i}`}</text>
		),
	},
	...(
		[
			{
				label: 'col (baseline)',
				style: { display: 'flex', flexDirection: 'column' },
				leaf: 'text',
			},
			{
				label: 'col, leaf is a 20px box',
				style: { display: 'flex', flexDirection: 'column' },
				leaf: 'box',
			},
			{
				label: 'col + alignItems flex-start',
				style: {
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
				},
				leaf: 'text',
			},
			{
				label: 'col + width 100%',
				style: { display: 'flex', flexDirection: 'column', width: '100%' },
				leaf: 'text',
			},
			{
				label: 'col + width 600px',
				style: { display: 'flex', flexDirection: 'column', width: 600 },
				leaf: 'text',
			},
			{
				label: 'col + flexShrink 0',
				style: { display: 'flex', flexDirection: 'column', flexShrink: 0 },
				leaf: 'text',
			},
			{
				label: 'col + minWidth 0',
				style: { display: 'flex', flexDirection: 'column', minWidth: 0 },
				leaf: 'text',
			},
			{
				label: 'col + flexGrow 1',
				style: { display: 'flex', flexDirection: 'column', flexGrow: 1 },
				leaf: 'text',
			},
			{
				label: 'col + gap 8',
				style: { display: 'flex', flexDirection: 'column', gap: 8 },
				leaf: 'text',
			},
			{
				label: 'col + position relative',
				style: {
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
				},
				leaf: 'text',
			},
			{
				label: 'col + paddingLeft 24',
				style: { display: 'flex', flexDirection: 'column', paddingLeft: 24 },
				leaf: 'text',
			},
			{
				label: 'col + overflow hidden',
				style: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
				leaf: 'text',
			},
			{
				label: 'row (no align)',
				style: { display: 'flex', flexDirection: 'row' },
				leaf: 'text',
			},
			{
				label: 'row + alignItems center',
				style: { display: 'flex', flexDirection: 'row', alignItems: 'center' },
				leaf: 'text',
			},
			{ label: 'block', style: {}, leaf: 'text' },
			{ label: 'block + marginTop 8', style: { marginTop: 8 }, leaf: 'text' },
			{ label: 'block + paddingTop 8', style: { paddingTop: 8 }, leaf: 'text' },
		] as const
	).map(
		(variant): Case => ({
			name: `depth 10, ${variant.label}`,
			group: 'exp-variants',
			layout: 'column',
			counts: [0, 8, 32],
			item: (i) => {
				let build: () => JSX.Element =
					variant.leaf === 'text'
						? () => <text style={body()}>{`Entry ${i}`}</text>
						: () => box();
				for (let level = 0; level < 10; level++) {
					const inner = build;
					build = () => <div style={variant.style}>{inner()}</div>;
				}
				return build();
			},
		}),
	),
	{
		name: 'depth 12 alternating col/block (6 cols)',
		group: 'exp-variants',
		layout: 'column',
		counts: [0, 8, 32],
		item: (i) => {
			let build: () => JSX.Element = () => (
				<text style={body()}>{`Entry ${i}`}</text>
			);
			for (let level = 0; level < 12; level++) {
				const inner = build;
				build =
					level % 2 === 0
						? () => (
								<div style={{ display: 'flex', flexDirection: 'column' }}>
									{inner()}
								</div>
							)
						: () => <div>{inner()}</div>;
			}
			return build();
		},
	},
	...[0, 4, 8, 12].map(
		(ancestors): Case => ({
			name: `50 entries (row+text) under ${ancestors} ancestor flex columns`,
			group: 'ancestors',
			layout: 'column',
			counts: [0, 50],
			item: (i) => (
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<text style={body()}>{`Entry name ${i}`}</text>
				</div>
			),
			wrap: (children) => nest(ancestors, () => children, 'col'),
		}),
	),
];

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function percentile(values: number[], percent: number) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(((sorted.length - 1) * percent) / 100)];
}

const renderer: GpuixRenderer = createRenderer();
const windowOptions: WindowOptions & WindowFontsOption = {
	title: 'perf-micro',
	width: VIEW_W + 40,
	height: VIEW_H + 40,
	...windowPlacement(VIEW_W + 40, VIEW_H + 40),
	focus: false,
	fonts,
};
renderer.init(windowOptions);
renderer.setDebugFrameOverlay('hidden');
if (args.values.foreground) renderer.activateWindow();

let draws: number[] | undefined;
let lastFrames = renderer.getDebugFrameOverlayStats().frames;
function sample() {
	const stats = renderer.getDebugFrameOverlayStats();
	if (stats.frames === lastFrames) return;
	lastFrames = stats.frames;
	if (stats.currentMs === undefined || stats.currentMs === null) {
		throw new Error('the overlay counted a frame but kept no duration');
	}
	draws?.push(stats.currentMs);
}
const nativeTick = renderer.tick.bind(renderer);
renderer.tick = () => {
	const running = nativeTick();
	sample();
	return running;
};
const nativeApply = renderer.applyBatch.bind(renderer);
renderer.applyBatch = (json) => {
	const result = nativeApply(json);
	sample();
	return result;
};
startFrameLoop(renderer, {
	onTerminated: () => process.exit(0),
	onError: (error) => console.error('frame error', error),
});

const [scene, setScene] = createSignal<() => JSX.Element>();
const [wiggle, setWiggle] = createSignal(0);
setInterval(() => setWiggle((value) => (value + 1) % 40), 4);

render(
	() => (
		<div
			style={{
				width: VIEW_W,
				height: VIEW_H,
				position: 'relative',
				backgroundColor: PAPER,
				overflow: 'hidden',
			}}
		>
			{scene()?.()}
			<div
				style={{
					position: 'absolute',
					right: 4 + wiggle(),
					top: 4,
					width: 4,
					height: 4,
					backgroundColor: '#e00',
				}}
			/>
		</div>
	),
	{ renderer },
);

async function measure(testCase: Case, count: number) {
	const items = Array.from({ length: count }, (_, index) => index);
	const list = (): JSX.Element => (
		<For each={items}>{(index) => testCase.item(index)}</For>
	);
	const content = (): JSX.Element =>
		testCase.wrap === undefined ? list() : testCase.wrap(list());
	setScene(() => () => (
		<div
			style={
				testCase.layout === 'wrap'
					? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }
					: { display: 'flex', flexDirection: 'column' }
			}
		>
			{content()}
		</div>
	));
	await sleep(500);
	draws = [];
	const started = performance.now();
	await sleep(sampleMs);
	const collected = draws;
	draws = undefined;
	while (collected.length < 3 && performance.now() - started < 8000) {
		draws = collected;
		await sleep(500);
	}
	draws = undefined;
	if (collected.length < 1) {
		throw new Error(
			`${testCase.name} x${count}: only ${collected.length} draws in ${(performance.now() - started).toFixed(0)} ms (window occluded? pass --foreground)`,
		);
	}
	return { p50: percentile(collected, 50), draws: collected.length };
}

if (args.values.list) {
	for (const testCase of cases)
		console.log(`${testCase.group}\t${testCase.name}`);
	process.exit(0);
}

const wanted = args.positionals;
const selected =
	wanted.length === 0
		? cases
		: cases.filter((testCase) =>
				wanted.some(
					(token) => testCase.group === token || testCase.name === token,
				),
			);

const rows: string[] = [];
for (const testCase of selected) {
	const results: { count: number; p50: number; draws: number }[] = [];
	for (const count of testCase.counts) {
		results.push({ count, ...(await measure(testCase, count)) });
	}
	const first = results[0];
	const last = results[results.length - 1];
	const mid = results[results.length - 2];
	const perInstance =
		((last.p50 - first.p50) / (last.count - first.count)) * 1000;
	const tail = ((last.p50 - mid.p50) / (last.count - mid.count)) * 1000;
	const row = `| ${testCase.group} | ${testCase.name} | ${results
		.map(
			(result) =>
				`${result.count}: ${result.p50.toFixed(2)} ms (${result.draws} draws)`,
		)
		.join(' ; ')} | ${perInstance.toFixed(1)} | ${tail.toFixed(1)} |`;
	console.log(row);
	rows.push(row);
}
console.log(
	'\n| group | case | draw p50 per N | us/instance (N0 to Nmax) | us/instance (last step) |',
);
console.log('| --- | --- | --- | --- | --- |');
for (const row of rows) console.log(row);
process.exit(0);
