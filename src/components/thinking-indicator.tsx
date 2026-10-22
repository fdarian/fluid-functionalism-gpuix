import {
	AnimatePresence,
	createReducedMotion,
	defineKeyframes,
	type MotionTransition,
	motion,
	type StyleDesc,
	useIsPresent,
} from '@gpuix/solid';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { useOnScreen } from '#/lib/cull';
import { Icon } from '#/lib/icon';
import { defineIcon } from '#/lib/icons';
import { color, linePx, type as scale } from '#/lib/theme';

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

const SHIMMER_PERIOD = '1.5s';
/** Even samples of the colour over one cycle, 2.5% (37.5 ms) apart; gpuix blends between them in Oklab. */
const SHIMMER_SAMPLES = 40;

function hexToRgb(hex: string) {
	const value = Number.parseInt(hex.slice(1), 16);
	return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The `easeInOut` progress `eased` was reached at, found by bisection (the curve only rises). */
function easeInOutAt(eased: number) {
	let low = 0;
	let high = 1;
	for (let step = 0; step < 24; step++) {
		const mid = (low + high) / 2;
		if (easeInOut(mid) < eased) low = mid;
		else high = mid;
	}
	return (low + high) / 2;
}

/**
 * Where the 300%-wide gradient of `.shimmer-text` sits over a letter: `along`
 * is the letter's place in the gradient, `0` to `1`, and the band is the
 * triangle from 35% to 65% peaking at 50%.
 */
function bandStrength(along: number) {
	if (along <= 0.35 || along >= 0.65) return 0;
	return along < 0.5 ? (along - 0.35) / 0.15 : (0.65 - along) / 0.15;
}

/** A letter's `along` at the sweep's `progress` (eased, `0` to `1`). */
function alongAt(count: number, index: number, progress: number) {
	return (index + 0.5) / count / 3 + (progress * 2) / 3;
}

const definedShimmers = new Set<string>();

/**
 * The name of the keyframes that colour letter `index` of `count` through one
 * sweep, defined on first use. gpuix cannot animate `background-position`, so
 * the colour the source's gradient shows at the letter is sampled over the
 * cycle, with the source's ease-in-out already applied, and played linear. The
 * stops include the three corners of the band, so the ramps are not rounded off.
 */
function shimmerKeyframes(count: number, index: number) {
	const base = color.shimmerBase;
	const bright = color.shimmerBright;
	const name = `ff-shimmer-${count}-${index}-${base.slice(1)}-${bright.slice(1)}`;
	if (definedShimmers.has(name)) return name;
	const from = hexToRgb(base);
	const to = hexToRgb(bright);
	const offsets = new Set<number>();
	for (let sample = 0; sample <= SHIMMER_SAMPLES; sample++)
		offsets.add(sample / SHIMMER_SAMPLES);
	for (const corner of [0.35, 0.5, 0.65]) {
		const progress = ((corner - alongAt(count, index, 0)) * 3) / 2;
		if (progress > 0 && progress < 1) offsets.add(easeInOutAt(progress));
	}
	const frames: Record<string, { color: string }> = {};
	for (const offset of offsets) {
		const strength = bandStrength(alongAt(count, index, easeInOut(offset)));
		const mixed = from.map((channel, i) =>
			Math.round(channel + (to[i] - channel) * strength),
		);
		frames[`${Number((offset * 100).toFixed(2))}%`] = {
			color: `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`,
		};
	}
	defineKeyframes(name, frames);
	definedShimmers.add(name);
	return name;
}

/**
 * `.shimmer-text`: transparent text over a 300%-wide gradient clipped to the
 * letters, sweeping once per 1.5s. gpuix has `backgroundClip: 'text'` but
 * cannot animate `background-position`, so each letter is its own `<text>`
 * playing its own native colour keyframes (`shimmerKeyframes`). Letters sit in
 * a flex row, so kerning between them is lost. The loop starts when the
 * element mounts, as in the source. `still` leaves the letters at the base
 * colour, for a copy that only reserves width.
 */
export function Shimmer(props: {
	children: string;
	style?: StyleDesc;
	still?: boolean;
}) {
	// A flex item holding only a collapsible space draws nothing, so a space becomes a no-break space to keep the gap between words.
	const letters = () =>
		[...props.children].map((letter) => (letter === ' ' ? '\u00a0' : letter));

	return (
		<div style={{ display: 'flex', flexDirection: 'row' }}>
			<For each={letters()}>
				{(letter, index) => (
					<text
						style={{
							...props.style,
							whiteSpace: 'nowrap',
							color: color.shimmerBase,
							animation:
								props.still === true
									? 'none'
									: `${shimmerKeyframes(letters().length, index())} ${SHIMMER_PERIOD} linear infinite`,
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
	'M 12 8 C 14.21 8 16 9.79 16 12 C 16 14.21 14.21 16 12 16 C 9.79 16 8 14.21 8 12 C 8 9.79 9.79 8 12 8 Z';
const infinity =
	'M 12 12 C 14 8.5 19 8.5 19 12 C 19 15.5 14 15.5 12 12 C 10 8.5 5 8.5 5 12 C 5 15.5 10 15.5 12 12 Z';
const circleB =
	'M 12 16 C 14.21 16 16 14.21 16 12 C 16 9.79 14.21 8 12 8 C 9.79 8 8 9.79 8 12 C 8 14.21 9.79 16 12 16 Z';

const GLYPH = {
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 1.5,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
} as const;

const staticGlyph = defineIcon(`<path d="${infinity}"/>`);

/** Runs only while the glyph is on screen; a culled one holds the first shape. */
function MorphingGlyph(props: { size: number }) {
	const onScreen = useOnScreen();
	return (
		<svg
			viewBox="0 0 24 24"
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: color.mutedForeground,
			}}
		>
			<Show when={onScreen()} fallback={<path {...GLYPH} d={circleA} />}>
				<motion.path
					{...GLYPH}
					d={circleA}
					animate={{ d: [circleA, infinity, circleB, infinity, circleA] }}
					transition={{
						d: {
							duration: 6,
							ease: 'easeInOut',
							repeat: Infinity,
							times: [0, 0.25, 0.5, 0.75, 1],
						},
					}}
				/>
			</Show>
		</svg>
	);
}

// ─── Word slot ────────────────────────────────────────────────────────────

const words = ['Thinking', 'Moonwalking', 'Planning', 'Refining'];
const WORD_INTERVAL_MS = 4000;
const longestWord = words.reduce((a, b) => (a.length >= b.length ? a : b));
const ROLL = linePx(scale.body.lineHeight) * 0.8;

const enterTransition = {
	duration: 0.24,
	ease: [0.4, 0, 0.2, 1],
} satisfies MotionTransition;
const exitTransition = {
	duration: 0.16,
	ease: [0.4, 0, 0.2, 1],
} satisfies MotionTransition;

const SLOT_CELL = { gridRow: 1, gridColumn: 1 } as const;

/** One word, rolling in from below on mount and out through the top when removed. */
function RollingWord(props: { word: string }) {
	const present = useIsPresent();
	return (
		<motion.div
			initial={{ top: ROLL, opacity: 0 }}
			animate={{ top: 0, opacity: 1 }}
			exit={{ top: -ROLL, opacity: 0 }}
			transition={present() ? enterTransition : exitTransition}
			style={{ ...SLOT_CELL, position: 'relative' }}
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
	const reduced = createReducedMotion();
	const [index, setIndex] = createSignal(0);
	const onScreen = useOnScreen();
	createEffect(() => {
		if (reduced() || !onScreen()) return;
		const timer = setInterval(() => {
			setIndex((current) => (current + 1) % words.length);
		}, WORD_INTERVAL_MS);
		onCleanup(() => clearInterval(timer));
	});
	return (
		<div
			role="status"
			aria-label="Thinking…"
			testId={props.testId}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<Show when={props.showIcon !== false}>
				<Show
					when={!reduced()}
					fallback={
						<Icon
							name={staticGlyph}
							size={20}
							strokeWidth={1.5}
							color={color.mutedForeground}
						/>
					}
				>
					<MorphingGlyph size={20} />
				</Show>
			</Show>
			<div
				style={{
					display: 'grid',
					overflow: 'hidden',
					height: scale.body.lineHeight,
				}}
			>
				{/* Reserves the width of the longest word, so the cycle never shifts what sits next to it. Laid out as letters like the visible words: their summed advance is wider than the whole string's. */}
				<div style={{ ...SLOT_CELL, opacity: 0 }}>
					<Shimmer style={scale.body} still>
						{longestWord}
					</Shimmer>
				</div>
				<Show
					when={!reduced()}
					fallback={
						<div style={SLOT_CELL}>
							<Shimmer style={scale.body}>{words[0]}</Shimmer>
						</div>
					}
				>
					<AnimatePresence initial={false}>
						<Show when={words[index()]} keyed>
							{(word: string) => <RollingWord word={word} />}
						</Show>
					</AnimatePresence>
				</Show>
			</div>
		</div>
	);
}
