/**
 * Opt-in frame-time harness, started by `FF_PERF=1 bun src/main.tsx` and driven
 * over Bun IPC by `scripts/perf.tsx`. It owns the real renderer so it can read
 * gpuix's draw-time stats, wrap the JS-side hot spots, and synthesise pointer
 * input into the live window. Nothing here loads unless FF_PERF=1.
 */
import { writeSync } from 'node:fs';
import type { GpuixRenderer, WindowOptions } from '@ghia/native';
import { startFrameLoop, type WindowFontsOption } from '@ghia/native/runtime';
import { createRenderer } from '@ghia/solid';

/** Page sweeps run over this column of x; the sidebar is 256 wide. */
const SWEEP_X = 128;
const SWEEP_TOP = 70;
const SWEEP_BOTTOM_MARGIN = 24;
/** One full top-to-bottom-to-top pass, so the highlight glides across every row. */
const SWEEP_PERIOD_MS = 2400;
const SWEEP_MOVES_PER_SECOND = 120;

export type PerfPage = {
	slug: string;
	kind: 'showcase' | 'demo' | 'page';
	/** A "full" page has no sidebar, so the sweep moves over page content instead. */
	sidebar: boolean;
};

export type PerfPhase = 'idle' | 'sweep';

export type PerfRequest =
	| { id: number; type: 'mount'; slug: string }
	| { id: number; type: 'activate' }
	| {
			id: number;
			type: 'measure';
			phase: PerfPhase;
			label: string;
			ms: number;
	  };

export type PerfMessage =
	| {
			type: 'ready';
			window: { width: number; height: number };
			pages: PerfPage[];
	  }
	| { type: 'reply'; id: number; result: unknown }
	| { type: 'error'; id: number; message: string };

export interface Distribution {
	n: number;
	p50: number;
	p95: number;
	p99: number;
	max: number;
	mean: number;
}

export interface PhaseResult {
	label: string;
	wallMs: number;
	/** Window draws the native side counted in the phase. */
	frames: number;
	/** Draws whose duration was read after the tick or move that ran them; `frames - draw.n` were missed. */
	draw: Distribution | null;
	missedDraws: number;
	/** ms between consecutive draws, as seen at the tick or move that ran them. */
	drawGap: Distribution | null;
	/** The native overlay's own tail over the same phase, as a cross-check of `draw`. */
	nativeDraw: { p90: number; p99: number; max: number } | null;
	/** Time inside `renderer.tick()` per call: the AppKit pump, the draw, and any JS event handler it runs. */
	tick: Distribution | null;
	/** Total ms in `applyBatch` (Solid mutations applied natively). */
	applyMs: number;
	batches: number;
	ops: Record<string, number>;
	/** Total ms in `setInterval` callbacks: the clock.ts `onFrame` subscribers. */
	intervalMs: number;
	/** Total ms in the injected `simulateMouseMove` calls (their hover handlers and any draw they trigger included). */
	moveMs: number;
	moves: number;
	/** Process CPU time (user + system, every thread) over the phase. */
	cpuMs: number;
}

export interface MountResult {
	/** Elements created minus elements `applyBatch` reported destroyed, since startup. */
	retained: number;
}

export interface PerfHost {
	windowOptions: WindowOptions & WindowFontsOption;
	pages: PerfPage[];
	/** Mounts the app on the given page, replacing what is mounted. */
	mount: (renderer: GpuixRenderer, slug: string) => void;
}

interface Recording {
	startFrames: number;
	lastFrames: number;
	draws: number[];
	drawTimes: number[];
	/** Draws the overlay counted beyond one per sample, whose duration was never read. */
	missedDraws: number;
	ticks: number[];
	applyMs: number;
	batches: number;
	ops: Map<string, number>;
	intervalMs: number;
	moveMs: number;
	moves: number;
}

const OP_PATTERN = /(?:^\[|\],)\["(\w+)"/g;

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Same rank gpui's overlay uses, so `draw` and `nativeDraw` agree on a shared tail. */
function distribution(values: number[]): Distribution | null {
	if (values.length === 0) return null;
	const sorted = [...values].sort((a, b) => a - b);
	const at = (percent: number) =>
		sorted[Math.floor(((sorted.length - 1) * percent) / 100)];
	return {
		n: sorted.length,
		p50: at(50),
		p95: at(95),
		p99: at(99),
		max: sorted[sorted.length - 1],
		mean: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
	};
}

function send(message: PerfMessage) {
	if (process.send === undefined) {
		throw new Error('FF_PERF=1 needs an IPC parent: run scripts/perf.tsx');
	}
	process.send(message);
}

/**
 * `renderer.tick` and `applyBatch` are per-instance, so wrapping them here
 * leaves the library untouched. `setInterval` is the one global wrapped: the
 * frame loop uses `setTimeout`, so what is timed there is only app callbacks.
 */
function instrument(renderer: GpuixRenderer, state: { recording?: Recording }) {
	let created = 0;
	let destroyed = 0;

	const tick = renderer.tick.bind(renderer);
	renderer.tick = () => {
		const started = performance.now();
		const running = tick();
		const recording = state.recording;
		if (recording !== undefined) {
			recording.ticks.push(performance.now() - started);
			sampleDraw(renderer, recording);
		}
		return running;
	};

	const applyBatch = renderer.applyBatch.bind(renderer);
	renderer.applyBatch = (json) => {
		const recording = state.recording;
		const ops: string[] = [];
		for (const match of json.matchAll(OP_PATTERN)) ops.push(match[1]);
		const started = performance.now();
		const result = applyBatch(json);
		const elapsed = performance.now() - started;
		if (recording !== undefined) sampleDraw(renderer, recording);
		for (const op of ops) if (op === 'createElement') created++;
		destroyed += result.length;
		if (recording !== undefined) {
			recording.applyMs += elapsed;
			recording.batches++;
			for (const op of ops) {
				recording.ops.set(op, (recording.ops.get(op) ?? 0) + 1);
			}
		}
		return result;
	};

	const nativeSetInterval = globalThis.setInterval;
	globalThis.setInterval = ((
		callback: (...args: unknown[]) => void,
		delay?: number,
		...args: unknown[]
	) =>
		nativeSetInterval(
			(...inner: unknown[]) => {
				const started = performance.now();
				try {
					callback(...inner);
				} finally {
					const recording = state.recording;
					if (recording !== undefined) {
						recording.intervalMs += performance.now() - started;
					}
				}
			},
			delay,
			...args,
		)) as typeof setInterval;

	return { retained: () => created - destroyed };
}

function nativeTail(stats: {
	p90Ms?: number | null;
	p99Ms?: number | null;
	maxMs?: number | null;
}) {
	if (stats.p90Ms == null || stats.p99Ms == null || stats.maxMs == null) {
		return null;
	}
	return { p90: stats.p90Ms, p99: stats.p99Ms, max: stats.maxMs };
}

/** Reads the duration of the draw that just ran, if one did. */
function sampleDraw(renderer: GpuixRenderer, recording: Recording) {
	const stats = renderer.getDebugFrameOverlayStats();
	if (stats.frames === recording.lastFrames) return;
	recording.missedDraws += stats.frames - recording.lastFrames - 1;
	recording.lastFrames = stats.frames;
	recording.drawTimes.push(performance.now());
	if (stats.currentMs === undefined || stats.currentMs === null) {
		throw new Error('the overlay counted a frame but kept no duration');
	}
	recording.draws.push(stats.currentMs);
}

async function sweepPointer(
	renderer: GpuixRenderer,
	recording: Recording,
	ms: number,
) {
	const size = renderer.getWindowSize();
	const top = SWEEP_TOP;
	const bottom = size.height - SWEEP_BOTTOM_MARGIN;
	const interval = 1000 / SWEEP_MOVES_PER_SECOND;
	const started = performance.now();
	for (let step = 1; ; step++) {
		const due = started + step * interval;
		const wait = due - performance.now();
		if (wait > 0) await sleep(wait);
		const elapsed = performance.now() - started;
		if (elapsed >= ms) break;
		const phase = (elapsed % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS;
		const along = phase < 0.5 ? phase * 2 : (1 - phase) * 2;
		const moveStarted = performance.now();
		renderer.simulateMouseMove(SWEEP_X, top + (bottom - top) * along);
		recording.moveMs += performance.now() - moveStarted;
		recording.moves++;
		sampleDraw(renderer, recording);
	}
	// Off the window, so the next page starts with nothing hovered.
	renderer.simulateMouseMove(-50, -50);
	sampleDraw(renderer, recording);
}

export function startPerf(host: PerfHost): void {
	const state: { recording?: Recording } = {};
	const renderer = createRenderer();
	renderer.init(host.windowOptions);
	const counters = instrument(renderer, state);
	renderer.setDebugFrameOverlay('hidden');
	// A window opened behind others is occluded and macOS stops its display link;
	// this is the opt-in way out, at the cost of taking focus.
	if (process.env.FF_PERF_FOREGROUND === '1') renderer.activateWindow();
	startFrameLoop(renderer, {
		onTerminated: () => process.exit(0),
		onError: (error) => console.error('[ffperf] frame error', error),
	});

	async function measure(
		phase: PerfPhase,
		label: string,
		ms: number,
	): Promise<PhaseResult> {
		renderer.resetDebugFrameOverlayStats();
		const startFrames = renderer.getDebugFrameOverlayStats().frames;
		const recording: Recording = {
			startFrames,
			lastFrames: startFrames,
			draws: [],
			drawTimes: [],
			missedDraws: 0,
			ticks: [],
			applyMs: 0,
			batches: 0,
			ops: new Map(),
			intervalMs: 0,
			moveMs: 0,
			moves: 0,
		};
		const cpuBefore = process.cpuUsage();
		const started = performance.now();
		writeSync(2, `[ffperf] begin ${label}\n`);
		state.recording = recording;
		if (phase === 'sweep') await sweepPointer(renderer, recording, ms);
		else await sleep(ms);
		state.recording = undefined;
		writeSync(2, `[ffperf] end ${label}\n`);
		const wallMs = performance.now() - started;
		const cpu = process.cpuUsage(cpuBefore);
		const stats = renderer.getDebugFrameOverlayStats();
		return {
			label,
			wallMs,
			frames: stats.frames - recording.startFrames,
			draw: distribution(recording.draws),
			missedDraws: recording.missedDraws,
			drawGap: distribution(
				recording.drawTimes
					.slice(1)
					.map((at, i) => at - recording.drawTimes[i]),
			),
			nativeDraw: nativeTail(stats),
			tick: distribution(recording.ticks),
			applyMs: recording.applyMs,
			batches: recording.batches,
			ops: Object.fromEntries(recording.ops),
			intervalMs: recording.intervalMs,
			moveMs: recording.moveMs,
			moves: recording.moves,
			cpuMs: (cpu.user + cpu.system) / 1000,
		};
	}

	async function handle(request: PerfRequest): Promise<unknown> {
		if (request.type === 'mount') {
			host.mount(renderer, request.slug);
			// One macrotask for Solid's microtask flush to reach applyBatch.
			await sleep(50);
			const result: MountResult = { retained: counters.retained() };
			return result;
		}
		if (request.type === 'activate') {
			renderer.activateWindow();
			return null;
		}
		return measure(request.phase, request.label, request.ms);
	}

	process.on('message', (request: PerfRequest) => {
		handle(request).then(
			(result) => send({ type: 'reply', id: request.id, result }),
			(error: unknown) =>
				send({
					type: 'error',
					id: request.id,
					message: error instanceof Error ? error.message : String(error),
				}),
		);
	});
	send({
		type: 'ready',
		window: renderer.getWindowSize(),
		pages: host.pages,
	});
}
