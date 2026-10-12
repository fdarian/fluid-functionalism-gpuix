import {
	AnimatePresence,
	type MotionTransition,
	motion,
	type StyleDesc,
	useIsPresent,
} from "@gpuix/solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { color, type as scale, scheme } from "../lib/theme";

const FRAME_MS = 33;

/**
 * One timer for every looping animation in this file: gpuix has no keyframes
 * and no repeat, so a loop is a JS clock that components read. It runs only
 * while something is subscribed to it.
 */
const [clock, setClock] = createSignal(0);
let subscribers = 0;
let clockTimer: ReturnType<typeof setInterval> | undefined;

/** The animation time in ms; reading it inside an effect or JSX re-runs every frame. */
export function useClock(): () => number {
	onMount(() => {
		subscribers += 1;
		if (subscribers === 1) {
			clockTimer = setInterval(() => setClock(performance.now()), FRAME_MS);
		}
	});
	onCleanup(() => {
		subscribers -= 1;
		if (subscribers === 0) clearInterval(clockTimer);
	});
	return clock;
}

/** `cubic-bezier(x1, y1, x2, y2)` solved for `x`, the way CSS and Motion evaluate a named ease. */
function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
	const axis = (a: number, b: number, t: number) =>
		3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
	return (x: number) => {
		let low = 0;
		let high = 1;
		for (let step = 0; step < 24; step++) {
			const mid = (low + high) / 2;
			if (axis(x1, x2, mid) < x) low = mid;
			else high = mid;
		}
		return axis(y1, y2, (low + high) / 2);
	};
}

const easeInOut = cubicBezier(0.42, 0, 0.58, 1);

// ─── Shimmer ──────────────────────────────────────────────────────────────

const SHIMMER_PERIOD_MS = 1500;

function hexToRgb(hex: string) {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * `.shimmer-text`: transparent text over a 300%-wide gradient clipped to the
 * letters, sweeping once per 1.5s. gpuix cannot clip a background to text, so
 * each letter is its own `<text>` and takes the gradient's colour at its
 * position, recomputed every frame. Letters sit in a flex row, so kerning
 * between them is lost.
 */
export function Shimmer(props: { children: string; style?: StyleDesc }) {
	const time = useClock();
	const letters = () => [...props.children];
	const stops = () => ({
		base: hexToRgb(color.shimmerBase),
		bright: hexToRgb(color.shimmerBright),
	});

	const colorAt = (index: number) => {
		const phase = easeInOut((time() % SHIMMER_PERIOD_MS) / SHIMMER_PERIOD_MS);
		const along = (index + 0.5) / letters().length / 3 + (phase * 2) / 3;
		const strength =
			along <= 0.35 || along >= 0.65
				? 0
				: along < 0.5
					? (along - 0.35) / 0.15
					: (0.65 - along) / 0.15;
		const mixed = stops().base.map((channel, i) =>
			Math.round(channel + (stops().bright[i] - channel) * strength),
		);
		return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
	};

	return (
		<div style={{ display: "flex", flexDirection: "row" }}>
			<For each={letters()}>
				{(letter, index) => (
					<text
						style={{
							...props.style,
							whiteSpace: "nowrap",
							color: colorAt(index()),
						}}
					>
						{letter}
					</text>
				)}
			</For>
		</div>
	);
}

// ─── Glyph ────────────────────────────────────────────────────────────────

/**
 * The glyph is one path morphing circle, infinity, circle, infinity, circle.
 * All three shapes share the same commands, so they interpolate point for
 * point. circleA and circleB trace the same circle in opposite directions.
 */
const circleA =
	"M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z";
const infinity =
	"M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z";
const circleB =
	"M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z";

const numbersOf = (path: string) => path.match(/-?\d+(\.\d+)?/g)?.map(Number);

const keyframes = [circleA, infinity, circleB, infinity, circleA].map(
	(path) => {
		const numbers = numbersOf(path);
		if (numbers === undefined)
			throw new Error(`glyph path has no numbers: ${path}`);
		return numbers;
	},
);

const MORPH_SEGMENT_MS = 1500;
const MORPH_PERIOD_MS = MORPH_SEGMENT_MS * (keyframes.length - 1);

/** The path `time` ms into the 6s loop: easeInOut between each pair of the 5 keyframes. */
function morphedPath(time: number) {
	const inLoop = time % MORPH_PERIOD_MS;
	const segment = Math.min(
		Math.floor(inLoop / MORPH_SEGMENT_MS),
		keyframes.length - 2,
	);
	const progress = easeInOut(
		(inLoop - segment * MORPH_SEGMENT_MS) / MORPH_SEGMENT_MS,
	);
	const from = keyframes[segment];
	const to = keyframes[segment + 1];
	const n = (index: number) =>
		(from[index] + (to[index] - from[index]) * progress).toFixed(3);
	return (
		`M ${n(0)} ${n(1)} ` +
		[0, 1, 2, 3]
			.map((curve) => {
				const base = 2 + curve * 6;
				return `C ${n(base)} ${n(base + 1)} ${n(base + 2)} ${n(base + 3)} ${n(base + 4)} ${n(base + 5)}`;
			})
			.join(" ") +
		" Z"
	);
}

function MorphingGlyph(props: { size: number }) {
	const time = useClock();
	// GPUI caches a rasterised SVG by the hash of its bytes, so a path that varies
	// freely would add a new atlas tile every frame. Whole frames repeat every loop.
	const frameTime = () => Math.floor(time() / FRAME_MS) * FRAME_MS;
	return (
		<Icon
			name={defineIcon(`<path d="${morphedPath(frameTime())}"/>`)}
			size={props.size}
			strokeWidth={1.5}
			color={color.mutedForeground}
		/>
	);
}

// ─── Word slot ────────────────────────────────────────────────────────────

const words = ["Thinking", "Moonwalking", "Planning", "Refining"];
const WORD_INTERVAL_MS = 4000;
const longestWord = words.reduce((a, b) => (a.length >= b.length ? a : b));
const ROLL = scale.body.lineHeight * 0.8;

const enterTransition = {
	duration: 0.24,
	ease: [0.4, 0, 0.2, 1],
} satisfies MotionTransition;
const exitTransition = {
	duration: 0.16,
	ease: [0.4, 0, 0.2, 1],
} satisfies MotionTransition;

/** One word, rolling in from below on mount and out through the top when removed. */
function RollingWord(props: { word: string }) {
	const present = useIsPresent();
	return (
		<motion.div
			initial={{ top: ROLL, opacity: 0 }}
			animate={{ top: 0, opacity: 1 }}
			exit={{ top: -ROLL, opacity: 0 }}
			transition={present() ? enterTransition : exitTransition}
			style={{ position: "absolute", left: 0 }}
		>
			<Shimmer style={scale.body}>{props.word}</Shimmer>
		</motion.div>
	);
}

/**
 * Animated status indicator: a morphing glyph, then a label that cycles
 * through `words` every 4s. Every word sits in the same cell and is clipped as
 * it rolls in from below and out the top, like a slot.
 */
export function ThinkingIndicator(props: {
	showIcon?: boolean;
	testId?: string;
}) {
	const [index, setIndex] = createSignal(0);
	const timer = setInterval(
		() => setIndex((current) => (current + 1) % words.length),
		WORD_INTERVAL_MS,
	);
	onCleanup(() => clearInterval(timer));
	return (
		<div
			role="status"
			aria-label="Thinking…"
			testId={props.testId}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<Show when={props.showIcon !== false}>
				<MorphingGlyph size={20} />
			</Show>
			<div
				style={{
					position: "relative",
					overflow: "hidden",
					height: scale.body.lineHeight,
				}}
			>
				{/* Reserves the width of the longest word, so the cycle never shifts what sits next to it. Laid out as letters like the visible words: their summed advance is wider than the whole string's. */}
				<div style={{ opacity: 0 }}>
					<Shimmer style={scale.body}>{longestWord}</Shimmer>
				</div>
				<AnimatePresence initial={false}>
					<Show when={words[index()]} keyed>
						{(word: string) => <RollingWord word={word} />}
					</Show>
				</AnimatePresence>
			</div>
		</div>
	);
}
