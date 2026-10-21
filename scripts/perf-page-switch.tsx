/**
 * Page-switch hitch tool, headless: mounts App on an away page, clicks a sidebar row through the kit and records every
 * frame from the click until the window settles. The click step is split into mount JS (the handler's Solid mutations),
 * the first draw and the later draws of the harness's observer settle; a 16 ms loop then covers the rest of the window.
 *
 *   bun scripts/perf-page-switch.tsx <slug[,slug...]> [--away badge] [--visits 4] [--window 1000] [--trace] [--frames] [--json out.json]
 *
 *   --away    page the app starts on and each visit returns to (default badge)
 *   --visits  visits to each slug, every one followed by a visit back to the away page (default 4)
 *   --window  ms of the 16 ms loop recorded after the click (default 1000)
 *   --trace   print every native call over 0.3 ms during the click, with layout counters
 *   --frames  print every frame of each visit; without it, the four worst of each first visit
 *   --json    write the per-visit rows to this file
 *
 * One process per slug gives a cold first visit (text-shape caches empty); slugs in one process share the caches.
 * Columns: mountJs, firstDraw, maxFrame (the longest of mount JS, any draw and any loop frame), over (frames above
 * 16.7 ms), settled (ms from the click until the last native call of the click step ends), shapes (text shapes the
 * visit ran). Compare runs only at a similar load average, which the script prints before and after.
 */
import { loadavg } from 'node:os';
import { parseArgs } from 'node:util';
import { createCheck } from './check-kit';

const args = parseArgs({
	allowPositionals: true,
	options: {
		away: { type: 'string', default: 'badge' },
		visits: { type: 'string', default: '4' },
		window: { type: 'string', default: '1000' },
		json: { type: 'string' },
		frames: { type: 'boolean', default: false },
		trace: { type: 'boolean', default: false },
	},
});
const targets = (args.positionals[0] ?? 'badge').split(',');
const away = args.values.away ?? 'badge';
const visits = Number(args.values.visits);
const windowMs = Number(args.values.window);
const LOOP_FRAME_MS = 16;
const OVER_MS = 16.7;
const WORST_SHOWN = 4;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type NativeCall = {
	t: number;
	name: string;
	dur: number;
	drew: number;
	ops: number;
	creates: number;
	built: number;
	shapes: number;
	wrapped: number;
	nodes: number;
	extent: number;
	prepainted: number;
	culledPrepainted: number;
	culledSubtrees: number;
};

type FrameRecord = {
	label: string;
	t: number;
	busy: number;
	js: number;
	applyMs: number;
	dispatchMs: number;
	opCount: number;
	creates: number;
	nativeMs: number;
	inputMs: number;
	flushMs: number;
	boundsMs: number;
	passes: number;
	painted: number;
	shapes: number;
	wrapped: number;
	measures: number;
	nodesCreated: number;
	extentWalks: number;
	lineHits: number;
	built: number;
	skipped: number;
	prepainted: number;
	culledPrepainted: number;
	paintedEls: number;
	culledPainted: number;
	primitives: number;
	culledSubtrees: number;
	elements: number;
};

const calls: NativeCall[] = [];
const traceOrigin = performance.now();
const acc = {
	applyMs: 0,
	dispatchMs: 0,
	ops: {} as Record<string, number>,
	native: {} as Record<string, { ms: number; calls: number }>,
};

const kit = await createCheck(away, { initialSettleMs: 2500 });
const renderer = kit.renderer;

/** Native calls that run a draw (or, for a bounds read, may run one). */
const DRAW_CALLS = [
	'flush',
	'flushIfDirty',
	'getElementBounds',
	'getBoundingRect',
	'getScrollInfo',
	'getElementScroll',
	'getScrollMetrics',
];
const BOUNDS_CALLS = [
	'getElementBounds',
	'getBoundingRect',
	'getScrollInfo',
	'getElementScroll',
];
/** The input calls carry the synchronous event handler's JS. */
const INPUT_CALLS = ['simulateMouseDown', 'simulateMouseUp', 'drainEvents'];

function instrument() {
	const native = renderer['native'] as unknown as Record<
		string,
		(...callArgs: unknown[]) => unknown
	>;
	for (const name of [...DRAW_CALLS, ...INPUT_CALLS]) {
		const original = native[name];
		if (original === undefined) continue;
		native[name] = (...callArgs: unknown[]) => {
			const paintedBefore = renderer.getPaintedFrameCount();
			const layoutBefore = renderer.getLayoutCounters();
			const workBefore = renderer.getFrameWorkCounters();
			const culledBefore = renderer.getCulledSubtreeCount();
			renderer.resetBuildCounters();
			const start = performance.now();
			try {
				return original.apply(native, callArgs);
			} finally {
				const dur = performance.now() - start;
				const entry = acc.native[name] ?? { ms: 0, calls: 0 };
				entry.ms += dur;
				entry.calls++;
				acc.native[name] = entry;
				const layoutAfter = renderer.getLayoutCounters();
				const workAfter = renderer.getFrameWorkCounters();
				if (dur > 0.3)
					calls.push({
						t: start - traceOrigin,
						name,
						dur,
						drew: renderer.getPaintedFrameCount() - paintedBefore,
						ops: 0,
						creates: 0,
						built: renderer.getBuildCounters().elementsBuilt,
						shapes: layoutAfter.shapes - layoutBefore.shapes,
						wrapped: layoutAfter.wrappedLayouts - layoutBefore.wrappedLayouts,
						nodes: layoutAfter.nodesCreated - layoutBefore.nodesCreated,
						extent: layoutAfter.extentWalks - layoutBefore.extentWalks,
						prepainted: workAfter.prepainted - workBefore.prepainted,
						culledPrepainted:
							workAfter.culledPrepainted - workBefore.culledPrepainted,
						culledSubtrees: renderer.getCulledSubtreeCount() - culledBefore,
					});
			}
		};
	}
	const dispatch = renderer.dispatchNativeEvents.bind(renderer);
	Object.assign(renderer, {
		dispatchNativeEvents() {
			const start = performance.now();
			try {
				dispatch();
			} finally {
				acc.dispatchMs += performance.now() - start;
			}
		},
	});
	const applyBatch = renderer.applyBatch;
	Object.assign(renderer, {
		applyBatch(json: string) {
			const start = performance.now();
			try {
				return applyBatch(json);
			} finally {
				const dur = performance.now() - start;
				acc.applyMs += dur;
				let ops = 0;
				let creates = 0;
				for (const op of JSON.parse(json) as string[][]) {
					const name = String(op[0]);
					acc.ops[name] = (acc.ops[name] ?? 0) + 1;
					ops++;
					if (name === 'createElement') {
						creates++;
						const kind = `createElement:${op[2]}`;
						acc.ops[kind] = (acc.ops[kind] ?? 0) + 1;
					}
				}
				calls.push({
					t: start - traceOrigin,
					name: 'applyBatch',
					dur,
					drew: 0,
					ops,
					creates,
					built: 0,
					shapes: 0,
					wrapped: 0,
					nodes: 0,
					extent: 0,
					prepainted: 0,
					culledPrepainted: 0,
					culledSubtrees: 0,
				});
			}
		},
	});
}
instrument();

function snapshot() {
	return {
		layout: renderer.getLayoutCounters(),
		work: renderer.getFrameWorkCounters(),
		build: renderer.getBuildCounters(),
		passes: renderer.getLayoutPassCount(),
		painted: renderer.getPaintedFrameCount(),
		culled: renderer.getCulledSubtreeCount(),
		applyMs: acc.applyMs,
		dispatchMs: acc.dispatchMs,
		ops: Object.values(acc.ops).reduce((sum, count) => sum + count, 0),
		creates: acc.ops.createElement ?? 0,
		native: Object.fromEntries(
			Object.entries(acc.native).map(([name, entry]) => [name, entry.ms]),
		),
	};
}

function nativeSum(map: Record<string, number>, names: string[]) {
	return Object.entries(map)
		.filter(([name]) => names.includes(name))
		.reduce((sum, [, ms]) => sum + ms, 0);
}

function delta(
	before: ReturnType<typeof snapshot>,
	after: ReturnType<typeof snapshot>,
) {
	const nativeAfter = Object.fromEntries(
		Object.keys(after.native).map((name) => [
			name,
			after.native[name] - (before.native[name] ?? 0),
		]),
	);
	return {
		applyMs: after.applyMs - before.applyMs,
		dispatchMs: after.dispatchMs - before.dispatchMs,
		opCount: after.ops - before.ops,
		creates: after.creates - before.creates,
		nativeMs: nativeSum(nativeAfter, DRAW_CALLS),
		inputMs: nativeSum(nativeAfter, INPUT_CALLS),
		flushMs: nativeSum(nativeAfter, ['flush', 'flushIfDirty']),
		boundsMs: nativeSum(nativeAfter, BOUNDS_CALLS),
		passes: after.passes - before.passes,
		painted: after.painted - before.painted,
		shapes: after.layout.shapes - before.layout.shapes,
		wrapped: after.layout.wrappedLayouts - before.layout.wrappedLayouts,
		measures: after.layout.measures - before.layout.measures,
		nodesCreated: after.layout.nodesCreated - before.layout.nodesCreated,
		extentWalks: after.layout.extentWalks - before.layout.extentWalks,
		lineHits: after.layout.lineLayoutHits - before.layout.lineLayoutHits,
		built: after.build.elementsBuilt,
		skipped: after.build.elementsSkipped,
		prepainted: after.work.prepainted - before.work.prepainted,
		culledPrepainted:
			after.work.culledPrepainted - before.work.culledPrepainted,
		paintedEls: after.work.painted - before.work.painted,
		culledPainted: after.work.culledPainted - before.work.culledPainted,
		primitives: after.work.paintedPrimitives - before.work.paintedPrimitives,
		culledSubtrees: after.culled - before.culled,
	};
}

/** Brings a sidebar row into view; the sidebar's own scroll offset persists across pages. */
async function revealRow(testId: string) {
	for (let attempts = 0; attempts < 40; attempts++) {
		const row = renderer.findByTestId(testId);
		if (row === undefined) throw new Error(`no row ${testId}`);
		const box = renderer.getElementBounds(row.id);
		const center = box === null ? null : box.y + box.height / 2;
		if (center !== null && center > 90 && center < 700) return;
		renderer.nativeSimulateScrollWheel(
			100,
			400,
			0,
			center === null ? 300 : center - 350,
		);
		await kit.settle(120);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

function round(value: number, digits = 1) {
	return Number(value.toFixed(digits));
}

/** What a live window would see from one click: the synchronous handler (mount JS) runs inside native mouse-up, which then draws the first frame; every later draw is a bounds read of the harness's observer settle, one real frame each. */
function anatomy(entries: NativeCall[]) {
	const up = entries.find((entry) => entry.name === 'simulateMouseUp');
	if (up === undefined) throw new Error('the click recorded no mouse-up');
	const upEnd = up.t + up.dur;
	const lastApply = entries
		.filter(
			(entry) =>
				entry.name === 'applyBatch' && entry.t >= up.t && entry.t <= upEnd,
		)
		.at(-1);
	const lastApplyEnd =
		lastApply === undefined ? up.t : lastApply.t + lastApply.dur;
	const later = entries.filter(
		(entry) => entry.t >= upEnd - 0.01 && entry.drew > 0 && entry !== up,
	);
	const clickEnd = entries
		.filter((entry) => entry.t >= up.t)
		.reduce((end, entry) => Math.max(end, entry.t + entry.dur), upEnd);
	return {
		mountJs: lastApplyEnd - up.t,
		firstDraw: upEnd - lastApplyEnd,
		draws: later.map((entry) => entry.dur),
		settled: clickEnd,
	};
}

function printCalls(entries: NativeCall[]) {
	let previousEnd = 0;
	for (const entry of entries) {
		const gap = entry.t - previousEnd;
		console.log(
			`    +${round(entry.t).toString().padStart(6)} gap=${round(gap).toString().padStart(6)} ${entry.name.padEnd(17)} ${round(entry.dur).toString().padStart(6)}${entry.drew > 0 ? ` DREW${entry.drew}` : '     '} ops=${entry.ops} new=${entry.creates} built=${entry.built} shapes=${entry.shapes} wrapped=${entry.wrapped} nodes+=${entry.nodes} extent=${entry.extent} prepaint=${entry.prepainted}/${entry.culledPrepainted}c culled+=${entry.culledSubtrees}`,
		);
		previousEnd = Math.max(previousEnd, entry.t + entry.dur);
	}
}

function printFrame(frame: FrameRecord) {
	console.log(
		`    ${frame.label.padEnd(6)} t=${round(frame.t).toString().padStart(6)} busy=${round(frame.busy).toString().padStart(6)} js=${round(frame.js).toString().padStart(6)} dispatch=${round(frame.dispatchMs)} apply=${round(frame.applyMs).toString().padStart(6)}(${frame.opCount} ops, ${frame.creates} new) native=${round(frame.nativeMs).toString().padStart(6)}(flush ${round(frame.flushMs)} bounds ${round(frame.boundsMs)}) passes=${frame.passes} painted=${frame.painted} shapes=${frame.shapes} wrapped=${frame.wrapped} measures=${frame.measures} nodes+=${frame.nodesCreated} extent=${frame.extentWalks} lineHits=${frame.lineHits} built=${frame.built} skipped=${frame.skipped} prepaint=${frame.prepainted}/${frame.culledPrepainted}c paint=${frame.paintedEls}/${frame.culledPainted}c prims=${frame.primitives} culled+=${frame.culledSubtrees} els=${frame.elements}`,
	);
}

/** Clicks a sidebar row and records frames until `windowMs` passed, then waits for the page to rest. */
async function visit(label: string, slug: string) {
	await revealRow(`nav-${slug}`);
	await kit.settle(400);
	const point = kit.center(`nav-${slug}`);
	renderer.resetBuildCounters();
	for (const key of Object.keys(acc.native))
		acc.native[key] = { ms: 0, calls: 0 };
	acc.applyMs = 0;
	acc.ops = {};
	const records: FrameRecord[] = [];
	const t0 = performance.now();
	let before = snapshot();
	const record = (
		name: string,
		start: number,
		end: number,
		lateness: number,
	) => {
		const after = snapshot();
		const parts = delta(before, after);
		const busy = end - start + lateness;
		records.push({
			label: name,
			t: start - t0,
			busy,
			js: busy - parts.applyMs - parts.nativeMs - parts.inputMs,
			...parts,
			elements: renderer.getRetainedElementCount(),
		});
		renderer.resetBuildCounters();
		before = snapshot();
		before.build = { ...before.build, elementsBuilt: 0, elementsSkipped: 0 };
	};
	// Step 0: the click, with the handler's synchronous mount; the microtask flush of its batch belongs to the step.
	let start = performance.now();
	calls.length = 0;
	renderer.nativeSimulateClick(point.x, point.y);
	await Promise.resolve();
	record('click', start, performance.now(), 0);
	const clickCalls = calls.map((entry) => ({
		...entry,
		t: entry.t - (start - traceOrigin),
	}));
	if (args.values.trace) {
		console.log(
			`  ${label}: elements ${JSON.stringify(Object.fromEntries(Object.entries(acc.ops).filter(([name]) => name.startsWith('createElement:'))))}`,
		);
		printCalls(clickCalls);
	}
	let frame = 0;
	for (;;) {
		const sleepStart = performance.now();
		await sleep(LOOP_FRAME_MS);
		const lateness = Math.max(
			0,
			performance.now() - sleepStart - LOOP_FRAME_MS,
		);
		start = performance.now();
		if (start - t0 > windowMs) break;
		renderer.flush();
		renderer.dispatchNativeEvents();
		record(`f${frame++}`, start, performance.now(), lateness);
	}
	await kit.settle(1200);
	return { label, records, parts: anatomy(clickCalls) };
}

type Visit = Awaited<ReturnType<typeof visit>>;

function row(entry: Visit) {
	const loop = entry.records.filter((frame) => frame.label !== 'click');
	const frames = [
		entry.parts.mountJs,
		entry.parts.firstDraw,
		...entry.parts.draws,
		...loop.map((frame) => frame.busy),
	];
	return {
		label: entry.label,
		mountJs: round(entry.parts.mountJs, 0),
		firstDraw: round(entry.parts.firstDraw, 0),
		maxFrame: round(Math.max(...frames), 0),
		over: frames.filter((ms) => ms > OVER_MS).length,
		settled: round(entry.parts.settled, 0),
		shapes: entry.records.reduce((sum, frame) => sum + frame.shapes, 0),
		creates: entry.records.reduce((sum, frame) => sum + frame.creates, 0),
	};
}

function median(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

const startLoad = loadavg().map((n) => n.toFixed(2));
console.log(
	`load before: ${startLoad.join(' ')}  targets: ${targets.join(',')}  away: ${away}`,
);
const all: Visit[] = [];
for (const target of targets) {
	if (target === away) throw new Error('a target is the away page');
	for (let n = 1; n <= visits; n++) {
		all.push(await visit(`${target}#${n}`, target));
		all.push(await visit(`${away}<-${target}#${n}`, away));
	}
}
console.log(
	`load after: ${loadavg()
		.map((n) => n.toFixed(2))
		.join(' ')}`,
);

const rows = all.map(row);
console.table(rows);

console.log(
	'first visit vs median of the repeats (settled / maxFrame / over):',
);
for (const target of targets) {
	const own = rows.filter((entry) => entry.label.startsWith(`${target}#`));
	const first = own[0];
	const repeats = own.slice(1);
	const summary = (entry: typeof first) =>
		`${entry.settled} / ${entry.maxFrame} / ${entry.over}`;
	console.log(
		`  ${target}: first ${summary(first)}, repeats ${
			repeats.length === 0
				? 'none'
				: `${median(repeats.map((entry) => entry.settled))} / ${median(repeats.map((entry) => entry.maxFrame))} / ${median(repeats.map((entry) => entry.over))}`
		}`,
	);
}

for (const entry of all) {
	if (entry.label.includes('<-')) continue;
	const first = entry.label.endsWith('#1');
	if (!args.values.frames && !first) continue;
	console.log(
		`\n${entry.label}: ${args.values.frames ? 'all frames' : `worst ${WORST_SHOWN} frames`}`,
	);
	const shown = args.values.frames
		? entry.records
		: [...entry.records].sort((a, b) => b.busy - a.busy).slice(0, WORST_SHOWN);
	for (const frame of shown) printFrame(frame);
}
if (args.values.json !== undefined) {
	await Bun.write(args.values.json, JSON.stringify(rows));
}
kit.unmount();
process.exit(0);
