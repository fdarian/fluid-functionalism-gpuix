/**
 * ScrollArea scenarios: keys typed into a focused input inside the area stay
 * with the input (Space types, arrows do not scroll), while the same keys on
 * the focused viewport itself still scroll it; a wheel at the end of the range
 * chains to the page, including over the scrollbar track with fractional
 * content; a continuous wheel gesture stays on the area it started on.
 *
 *   bun scripts/check-scroll-area.tsx
 */
import { createSignal, For } from 'solid-js';
import { ScrollArea } from '#/components/scroll-area';
import { createCheck } from './check-kit';

const [text, setText] = createSignal('');
const [listKeys, setListKeys] = createSignal(0);

const check = await createCheck(() => (
	<div style={{ padding: 20 }}>
		<ScrollArea testId="area" width={300} height={160}>
			<div style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
				<input
					testId="field"
					aria-label="Field"
					value={text()}
					style={{ height: 24, width: 200 }}
					onChange={(event) => {
						if (event.value === undefined) throw new Error('no value');
						setText(event.value);
					}}
				/>
				<div
					testId="own-handler"
					tabIndex={0}
					onKeyDown={(event) => {
						if (event.key === 'ArrowDown') {
							event.preventDefault();
							setListKeys(listKeys() + 1);
						}
					}}
					style={{ height: 24, width: 200 }}
				>
					<text>Handles arrows itself</text>
				</div>
				<For each={Array.from({ length: 30 }, (_, index) => index)}>
					{(index) => (
						<text testId={`row-${index}`} style={{ height: 20 }}>
							{`Row ${index}`}
						</text>
					)}
				</For>
			</div>
		</ScrollArea>
	</div>
));

await check.settle();

const top = () => check.bounds('row-0').y;
const start = top();

// Positive control: the focused viewport itself still scrolls with the keys.
await check.click('row-3');
await check.press('ArrowDown');
check.expect(
	'ArrowDown on the focused viewport scrolls 40px',
	top(),
	start - 40,
);
await check.press('Home');
check.expect('Home on the focused viewport scrolls back', top(), start);

await check.focus('field');
await check.press('a Space b');
check.expect('Space and letters type into the input', text(), 'a b');
check.expect('Space in the input does not scroll the area', top(), start);

await check.press('ArrowDown ArrowDown PageDown');
check.expect(
	'arrows and PageDown in the input do not scroll the area',
	top(),
	start,
);

await check.press('End');
check.expect('End in the input does not scroll the area', top(), start);

await check.focus('own-handler');
await check.press('ArrowDown');
check.expect("a child's own ArrowDown handler runs", listKeys(), 1);
check.expect(
	'a child that handles ArrowDown does not also scroll the area',
	top(),
	start,
);

const keyFailures = check.unmount();

// ── Wheel at the end of the range ───────────────────────────────────────────
// gpuix reports `scrollHeight` and `clientHeight` rounded half up, but the scroller ends at the snapped content end, so 29 half-pixel rows leave the real range one short of `scrollHeight - clientHeight`. The track wheel must still chain to the page once the viewport is at its real end.

interface Content {
	label: string;
	fontSize: number;
	lineHeight: number;
	rows: number;
}

/** 29 rows of 19.5px + 16px padding = 581.5: the real range ends at 418, `scrollHeight - clientHeight` says 419. */
const HALF_PIXEL: Content = {
	label: 'half-pixel rows',
	fontSize: 13,
	lineHeight: 1.5,
	rows: 29,
};
/** 28 rows of 19.5px + 16px padding = 562: both agree. */
const WHOLE_PIXEL: Content = {
	...HALF_PIXEL,
	label: 'whole-pixel rows',
	rows: 28,
};

type ReachEnd = 'wheel' | 'thumb drag' | 'End key';

interface WheelRun {
	content: Content;
	/** Deltas fed one per event, cycling. */
	deltas: number[];
	events: number;
	/** The pointer is over the content, or over the scrollbar track. */
	over: 'content' | 'track';
	reachEnd: ReachEnd;
}

async function chainsAtEnd(run: WheelRun) {
	const label = `${run.content.label}, wheel over ${run.over}, ${run.deltas.length > 1 ? 'trackpad 0.5-3px' : `${run.deltas[0]}px`}, end by ${run.reachEnd}`;
	const kit = await createCheck(() => (
		<div
			testId="page"
			style={{ width: 400, height: 400, overflowY: 'scroll', padding: 20 }}
		>
			<ScrollArea testId="inner" width={300} height={163}>
				<div style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
					<For each={Array.from({ length: run.content.rows }, (_, i) => i)}>
						{() => (
							<text
								style={{
									fontSize: run.content.fontSize,
									lineHeight: run.content.lineHeight,
								}}
							>
								Row
							</text>
						)}
					</For>
				</div>
			</ScrollArea>
			<div style={{ height: 3000, flexShrink: 0 }} />
		</div>
	));
	await kit.settle();
	const pageId = kit.element('page').id;
	const viewportId = kit.element('inner').children[0];
	if (viewportId === undefined) throw new Error('no viewport');
	const metrics = (id: number) => {
		const found = kit.renderer.getScrollMetrics(id);
		if (found === null) throw new Error('no scroll metrics');
		return found;
	};
	const pageTop = () => metrics(pageId)[1] as number;
	const innerTop = () => metrics(viewportId)[1] as number;
	/** The range `scrollAlong` clamps to. */
	const roundedMax = () =>
		(metrics(viewportId)[3] as number) - (metrics(viewportId)[5] as number);

	const area = kit.bounds('inner');
	const pointer =
		run.over === 'track'
			? { x: area.x + area.width - 4, y: area.y + area.height / 2 }
			: { x: area.x + area.width / 2, y: area.y + area.height / 2 };
	kit.renderer.nativeSimulateMouseMove(pointer.x - 1, pointer.y);
	kit.renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
	await kit.settle(300);

	if (run.reachEnd === 'wheel') {
		const inner = { x: area.x + 50, y: area.y + 50 };
		for (let tick = 0; tick < 100 && pageTop() === 0; tick++) {
			kit.renderer.nativeSimulateScrollWheel(inner.x, inner.y, 0, 40);
			await kit.settle(30);
		}
	} else if (run.reachEnd === 'thumb drag') {
		const thumb = kit.bounds('inner-y-thumb');
		const track = kit.bounds('inner-y-track');
		const grab = {
			x: thumb.x + thumb.width / 2,
			y: thumb.y + thumb.height / 2,
		};
		kit.renderer.nativeSimulateMouseMove(grab.x, grab.y);
		await kit.settle(100);
		kit.renderer.nativeSimulateMouseDown(grab.x, grab.y);
		kit.renderer.nativeSimulateMouseMove(grab.x, track.y + track.height + 80);
		await kit.settle(100);
		kit.renderer.nativeSimulateMouseUp(grab.x, track.y + track.height + 80);
		await kit.settle(100);
		kit.renderer.nativeSimulateMouseMove(pointer.x - 1, pointer.y);
		kit.renderer.nativeSimulateMouseMove(pointer.x, pointer.y);
	} else {
		await kit.click('inner-y-track');
		kit.renderer.focusElement(viewportId);
		await kit.press('End');
	}
	await kit.settle(700);
	const startPage = pageTop();
	const atEnd = `scrollTop ${innerTop()}, scrollHeight - clientHeight ${roundedMax()}`;

	let stuck = 0;
	let first = '';
	for (let tick = 0; tick < run.events; tick++) {
		const dy = run.deltas[tick % run.deltas.length] as number;
		const before = pageTop();
		const innerBefore = innerTop();
		kit.renderer.nativeSimulateScrollWheel(pointer.x, pointer.y, 0, dy);
		await kit.settle(20);
		if (pageTop() <= before && stuck === 0) {
			first = `event ${tick} (${dy}px): page ${before} -> ${pageTop()}, inner ${innerBefore} -> ${innerTop()}`;
		}
		if (pageTop() <= before) stuck++;
	}
	kit.check(
		`${label}: all ${run.events} events reach the page`,
		stuck === 0,
		stuck === 0
			? `page ${startPage} -> ${pageTop()}`
			: `${stuck} stuck, first ${first}; ${atEnd}`,
	);
	return kit.unmount();
}

const WHEELS = [[40], [2.5], [0.5, 1, 1.5, 2, 3, 0.7]] as const;
let wheelFailures = 0;
for (const content of [WHOLE_PIXEL, HALF_PIXEL]) {
	for (const over of ['content', 'track'] as const) {
		for (const deltas of WHEELS) {
			wheelFailures += await chainsAtEnd({
				content,
				deltas: [...deltas],
				events: deltas.length > 1 ? 40 : deltas[0] === 40 ? 6 : 24,
				over,
				reachEnd: 'wheel',
			});
		}
	}
}
for (const reachEnd of ['thumb drag', 'End key'] as const) {
	wheelFailures += await chainsAtEnd({
		content: HALF_PIXEL,
		deltas: [40],
		events: 6,
		over: 'track',
		reachEnd,
	});
}

// gpuix latches a scroll sequence to the scroller it started on, as Chrome does (a mouse wheel has no phases, so every event is `moved`, and the latch holds until 500 ms pass without one). A continuous gesture that runs past the inner end therefore stays on the inner area; a new gesture after the gap chains to the page.
async function latching() {
	const kit = await createCheck(() => (
		<div
			testId="page"
			style={{ width: 400, height: 400, overflowY: 'scroll', padding: 20 }}
		>
			<ScrollArea testId="inner" width={300} height={163}>
				<div style={{ display: 'flex', flexDirection: 'column', padding: 8 }}>
					<For each={Array.from({ length: 28 }, (_, i) => i)}>
						{() => <text style={{ height: 20 }}>Row</text>}
					</For>
				</div>
			</ScrollArea>
			<div style={{ height: 3000, flexShrink: 0 }} />
		</div>
	));
	await kit.settle();
	const pageId = kit.element('page').id;
	const viewportId = kit.element('inner').children[0];
	if (viewportId === undefined) throw new Error('no viewport');
	const top = (id: number) =>
		(kit.renderer.getScrollMetrics(id) as number[])[1];
	const area = kit.bounds('inner');
	const x = area.x + 50;
	const y = area.y + 50;
	const wheel = async (phase: 'started' | 'moved') => {
		kit.renderer.nativeSimulateScrollWheel(x, y, 0, 40, undefined, phase);
		await kit.settle(30);
	};

	// 28 rows of 20px + 16px padding in 163px: the inner range ends at 413.
	const innerEnd = 413;
	await wheel('started');
	for (let tick = 0; tick < 60 && top(viewportId) < innerEnd; tick++) {
		await wheel('moved');
	}
	kit.check(
		`one gesture scrolls the inner area to its end (${top(viewportId)})`,
		top(viewportId) === innerEnd,
	);
	for (let more = 0; more < 4; more++) await wheel('moved');
	kit.check(
		`the same gesture running past the end stays on the inner area (page ${top(pageId)})`,
		top(pageId) === 0,
	);

	await kit.settle(600);
	await wheel('started');
	for (let more = 0; more < 3; more++) await wheel('moved');
	kit.check(
		`a new gesture after a 600ms gap chains to the page (page ${top(pageId)})`,
		top(pageId) > 0,
	);
	return kit.unmount();
}
const latchFailures = await latching();

const failed = keyFailures + wheelFailures + latchFailures;
console.log(failed === 0 ? 'all passed' : `${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
