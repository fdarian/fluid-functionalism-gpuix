import { type HostElement, motion } from '@gpuix/solid';
import { createMemo, createSignal, For } from 'solid-js';
import {
	createFluidHover,
	type ItemRect,
	useHoverItem,
} from '#/lib/fluid-hover';
import {
	color,
	colorFade,
	siteType,
	motion as tween,
	weight,
	withAlpha,
} from '#/lib/theme';

// The "What it does" timeline: one continuous line from the top of the first
// title to the end of the last description. ONE dot glides between steps with
// fluid hover on the fast spring, lighting the lines above and below it (each
// brightest at the dot, fading away from it) and bringing the step's title up
// to full strength.

/** The dot: 6px, like CarouselDots. */
const DOT = 6;
/** The title's line box is 24px tall with its text centered 13px below the step's top. The dot centers there. */
const TITLE_CENTER = 13;
/** Where the title's text starts inside a step, 8px above its center. The line begins here on the first step. */
const TITLE_TOP = TITLE_CENTER - 8;
/** One axis for everything: the line's center, 4px in. The 1px line sits half a pixel either side of it; every dot centers on it. */
const AXIS = 4;
const LINE_LEFT = AXIS - 0.5;
const DOT_LEFT = AXIS - DOT / 2;

const dotCenter = (rect: ItemRect) => rect.top + TITLE_CENTER;

export function Timeline(props: { steps: { title: string; body: string }[] }) {
	const hover = createFluidHover();

	const active = () => {
		const index = hover.activeIndex();
		return hover.isMeasured() && index !== null ? index : null;
	};
	// After the pointer leaves, the highlight fades out where it last was instead of sliding back to the first step.
	let lastActive = 0;
	const index = createMemo(() => {
		const current = active();
		if (current !== null) lastActive = current;
		return lastActive;
	});
	const shown = () => active() !== null;
	const rects = () => hover.rects();
	const centers = () =>
		rects().map((rect) => (rect === undefined ? undefined : dotCenter(rect)));

	// The line runs from the top of the first title to the end of the last description, past the first and last dots.
	const lineStart = () => {
		const first = rects()[0];
		return first === undefined ? 0 : first.top + TITLE_TOP;
	};
	const lineEnd = () => {
		const last = rects()[props.steps.length - 1];
		return last === undefined ? 0 : last.top + last.height;
	};
	const center = () => centers()[index()];
	// The highlight runs from the hovered dot's edge to the neighbor dots' centers, over the one continuous line.
	const above = () => {
		const at = center();
		if (at === undefined) return { top: 0, height: 0 };
		const from = centers()[index() - 1] ?? lineStart();
		return { top: from, height: Math.max(at - DOT / 2 - from, 0) };
	};
	const below = () => {
		const at = center();
		if (at === undefined) return { top: 0, height: 0 };
		const to = centers()[index() + 1] ?? lineEnd();
		return { top: at + DOT / 2, height: Math.max(to - (at + DOT / 2), 0) };
	};

	// Positions jump while the highlight is hidden (it appears on the step you enter and fades out where you left it) and glide on the fast spring while it shows.
	let wasShown = false;
	const move = createMemo(() => {
		index();
		const gliding = wasShown && shown();
		wasShown = shown();
		return gliding ? tween.fast : tween.snap;
	});

	const gradient = (direction: 'to top' | 'to bottom') =>
		`linear-gradient(${direction}, ${withAlpha(color.mutedForeground, 0.7)}, ${withAlpha(color.mutedForeground, 0)})`;

	return (
		<div style={{ marginTop: 8 }}>
			<div
				ref={hover.containerRef}
				testId="skill-timeline"
				onMouseEnter={hover.handlers.onMouseEnter}
				onMouseMove={hover.handlers.onMouseMove}
				onMouseLeave={hover.handlers.onMouseLeave}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				<div
					style={{
						position: 'absolute',
						left: LINE_LEFT,
						top: lineStart(),
						width: 1,
						height: lineEnd() - lineStart(),
						backgroundColor: color.border,
						pointerEvents: 'none',
					}}
				/>
				{/* The gliding highlight: lines above and below the dot, then the dot. It is positioned, so it paints over the in-flow rows, as the source's `z-10` lines and dot do. */}
				<motion.div
					initial={false}
					animate={{
						...above(),
						opacity: shown() && above().height > 0 ? 1 : 0,
					}}
					transition={move()}
					style={{
						position: 'absolute',
						left: LINE_LEFT,
						width: 1,
						backgroundImage: gradient('to top'),
						pointerEvents: 'none',
					}}
				/>
				<motion.div
					initial={false}
					animate={{
						...below(),
						opacity: shown() && below().height > 0 ? 1 : 0,
					}}
					transition={move()}
					style={{
						position: 'absolute',
						left: LINE_LEFT,
						width: 1,
						backgroundImage: gradient('to bottom'),
						pointerEvents: 'none',
					}}
				/>
				<motion.div
					initial={false}
					animate={{ top: (center() ?? 0) - DOT / 2 }}
					transition={move()}
					style={{
						position: 'absolute',
						left: DOT_LEFT,
						width: DOT,
						height: DOT,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						pointerEvents: 'none',
					}}
				>
					{/* Grows from nothing as it fades in and shrinks back to nothing as it fades out; leaving, the fade waits half the spring so the shrink reads first. */}
					<motion.div
						initial={false}
						animate={{
							width: shown() ? DOT : 0,
							height: shown() ? DOT : 0,
							opacity: shown() ? 1 : 0,
						}}
						transition={{
							default: tween.fast,
							opacity: shown() ? tween.fast : { ...tween.fast, delay: 0.04 },
						}}
						style={{ borderRadius: DOT / 2, backgroundColor: color.foreground }}
					/>
				</motion.div>
				<For each={props.steps}>
					{(step, position) => (
						<Step
							hover={hover}
							index={position()}
							last={position() === props.steps.length - 1}
							title={step.title}
							body={step.body}
							active={active() === position()}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

/** One step: a title and description that rest muted and come up to full strength while the step is active. Steps touch (no gap) so the highlight never drops out. */
function Step(props: {
	hover: ReturnType<typeof createFluidHover>;
	index: number;
	last: boolean;
	title: string;
	body: string;
	active: boolean;
}) {
	const [element, setElement] = createSignal<HostElement>();
	useHoverItem(props.hover, () => props.index, element);
	return (
		<div
			ref={setElement}
			style={{
				display: 'flex',
				flexDirection: 'column',
				paddingLeft: 24,
				paddingBottom: props.last ? 0 : 16,
			}}
		>
			<div style={{ height: 24, paddingTop: 2 }}>
				<text
					style={{
						...siteType.body,
						fontVariationSettings: weight.semibold,
						color: props.active ? color.foreground : color.mutedForeground,
						...colorFade,
					}}
				>
					{props.title}
				</text>
			</div>
			<div style={{ marginTop: 2 }}>
				<text
					style={{
						...siteType.body,
						lineHeight: '18px',
						color: color.mutedForeground,
					}}
				>
					{props.body}
				</text>
			</div>
		</div>
	);
}
