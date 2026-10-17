import type { HostElement, HostMouseEvent } from '@gpuix/solid';
import { createEffect, createSignal, For } from 'solid-js';
import { onFrame } from '#/lib/clock';
import { ComponentPreview, MONO } from '#/lib/doc-page';
import { createFluidHover, pickNearest } from '#/lib/fluid-hover';
import { color, type as scale, siteType, weight } from '#/lib/theme';
import { FluidRow, ListFrame, ListHighlight } from './parts';
import { COST_CODE } from './snippets';

const COST_ROW_COUNT = 200;
const COST_ROWS = Array.from(
	{ length: COST_ROW_COUNT },
	(_, index) => `Message ${String(index + 1).padStart(3, '0')}`,
);

/** The mean over this many picks is the number shown: one reading is below the clock's resolution. */
const COST_WINDOW = 100;

/** One frame at 60Hz, the budget every move has to fit in. */
const FRAME_MS = 1000 / 60;

/**
 * 200 rows in a scroll frame and a meter that measures, not estimates: the
 * pick is the port's own `pickNearest`, timed on every move with the real
 * rects.
 */
function CostList(props: {
	onMove: (pickMs: number) => void;
	onInside: (inside: boolean) => void;
}) {
	const hover = createFluidHover();
	let container: HostElement | undefined;

	const timePick = (event: HostMouseEvent) => {
		if (
			container === undefined ||
			event.x === undefined ||
			event.y === undefined
		) {
			return;
		}
		const box = hover.containerBox();
		const started = performance.now();
		pickNearest({
			axis: 'y',
			point: { x: event.x, y: event.y },
			rects: hover.rects(),
			containerRect: {
				left: box.x,
				top: box.y,
				width: box.width,
				height: box.height,
			},
			scroll: { x: 0, y: 0 },
			border: { x: 0, y: 0 },
			layoutSize: { width: box.width, height: box.height },
		});
		props.onMove(performance.now() - started);
	};

	return (
		<div
			onScroll={hover.handlers.onScroll}
			style={{
				maxHeight: 256,
				display: 'flex',
				flexDirection: 'column',
				overflowY: 'scroll',
			}}
		>
			{/* The highlight lives inside the scrolled content: gpuix paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
			<div
				ref={(element) => {
					container = element;
					hover.containerRef(element);
				}}
				onMouseEnter={() => {
					props.onInside(true);
					hover.handlers.onMouseEnter();
				}}
				onMouseLeave={() => {
					props.onInside(false);
					hover.handlers.onMouseLeave();
				}}
				onMouseMove={(event: HostMouseEvent) => {
					props.onInside(true);
					timePick(event);
					hover.handlers.onMouseMove(event);
				}}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					padding: 8,
				}}
			>
				<ListHighlight hover={hover} />
				<For each={COST_ROWS}>
					{(label, index) => (
						<FluidRow
							hover={hover}
							index={index()}
							label={label}
							testId={index() === 0 ? 'cost-row-first' : undefined}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

function Stat(props: { value: string; label: string; hint: string }) {
	return (
		<div
			style={{
				flexGrow: 1,
				flexBasis: 0,
				minWidth: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 2,
			}}
		>
			<text
				style={{
					fontFamily: MONO,
					...siteType.body,
					fontWeight: weight.normal,
					color: color.foreground,
					fontVariantNumeric: 'tabular-nums',
				}}
			>
				{props.value}
			</text>
			<text
				style={{
					...siteType.caption,
					color: color.mutedForeground,
					textAlign: 'center',
				}}
			>
				{props.label}
			</text>
			<text
				style={{
					...scale.micro,
					color: color.mutedForeground,
					textAlign: 'center',
				}}
			>
				{props.hint}
			</text>
		</div>
	);
}

export function CostDemo() {
	const [moves, setMoves] = createSignal(0);
	const [pickMs, setPickMs] = createSignal(0);
	const [longestFrameMs, setLongestFrameMs] = createSignal(0);
	const [inside, setInside] = createSignal(false);
	const samples: number[] = [];

	// The longest gap between two ticks of the shared 16 ms clock while the pointer is inside: a stall in this process shows up here.
	createEffect(() => {
		if (!inside()) return;
		onFrame((dt) => {
			if (dt > longestFrameMs()) setLongestFrameMs(dt);
		});
	});

	const onMove = (ms: number) => {
		samples.push(ms);
		if (samples.length > COST_WINDOW) samples.shift();
		setMoves(moves() + 1);
		setPickMs(samples.reduce((sum, value) => sum + value, 0) / samples.length);
	};

	return (
		<ComponentPreview testId="cost-preview" code={COST_CODE} cull>
			<div
				style={{
					width: '100%',
					maxWidth: 448,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 16,
				}}
			>
				<ListFrame>
					<CostList onMove={onMove} onInside={setInside} />
				</ListFrame>
				{/* One number per claim in the copy that the port can observe: the loop. `moves` counts up so the reader sees the meter is live. */}
				<div
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'row',
						gap: 16,
					}}
				>
					<Stat
						value={String(moves())}
						label="moves"
						hint="counts as you hover"
					/>
					<Stat
						value={`${pickMs().toFixed(3)} ms`}
						label="pick per move"
						hint={`${((pickMs() / FRAME_MS) * 100).toFixed(2)}% of a ${FRAME_MS.toFixed(1)} ms frame`}
					/>
					<Stat
						value={`${longestFrameMs().toFixed(1)} ms`}
						label="longest frame"
						hint={`one timer tick, budget ${FRAME_MS.toFixed(1)} ms`}
					/>
				</div>
			</div>
		</ComponentPreview>
	);
}
