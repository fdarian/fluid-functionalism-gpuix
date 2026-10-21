import {
	buttonProps,
	createMotionValue,
	createReducedMotion,
	createTransform,
	type HostElement,
	type MotionValue,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import { createEffect, createMemo, For, onCleanup } from 'solid-js';
import { useOnScreen } from '#/lib/cull';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover } from '#/lib/fluid-hover';
import { color, focusRing, motion as tween, withAlpha } from '#/lib/theme';

/** Dot height, and the diameter of every resting dot. */
const DOT_PX = 6;
/** Width of the current dot's pill. */
const PILL_PX = 24;
/** Every dot sits in an equal 6px padding: an 18px round click area. */
const CLICK_PAD = 6;
const DEFAULT_DURATION_MS = 3000;
/** `color-mix(in oklab, var(--foreground), transparent 85% / 60%)`. */
const trackColor = () => withAlpha(color.foreground, 0.15);
const fillColor = () => withAlpha(color.foreground, 0.4);

export interface CarouselDotsAutoplay {
	/** How long each slide plays before the next one, in ms. Default 3000. */
	duration?: number;
	/** Holds the fill where it is, e.g. while the pointer is over the slide. */
	paused?: boolean;
	/** After the last slide, go back to the first. Default true. */
	loop?: boolean;
}

/**
 * A row of 6px dots, one per slide. The current one stretches into a 24px
 * pill. Static it is solid; with `autoplay` it fills over each slide's
 * duration and then moves on. One fluid highlight glides between the dots'
 * click areas on hover.
 */
export function CarouselDots(props: {
	count: number;
	value: number;
	/** The clicked dot's index, and the next index each time autoplay finishes a slide. */
	onValueChange?: (index: number) => void;
	autoplay?: boolean | CarouselDotsAutoplay;
	/** Drive the fill yourself, 0 to 1. Takes precedence over `autoplay`. */
	progress?: number | (() => number);
	getLabel?: (index: number) => string;
	testId?: string;
}) {
	const hover = createFluidHover({ axis: 'x' });

	const options = (): CarouselDotsAutoplay | null => {
		const autoplay = props.autoplay;
		if (autoplay === undefined || autoplay === false) return null;
		return autoplay === true ? {} : autoplay;
	};
	// A memo, so a change to `paused` or `duration` inside the options object does not count as autoplay starting over.
	const autoplaying = createMemo(
		() => options() !== null && props.progress === undefined,
	);
	const drivenFill = () => {
		const driven = props.progress;
		if (driven === undefined) return 1;
		return typeof driven === 'function' ? driven() : driven;
	};

	// The current dot's fill, 0 to 1, as a native motion value: autoplay plays it on gpuix's clock, so a playing carousel costs no JS frame and no redraw from this side.
	const fill = createMotionValue(autoplaying() ? 0 : drivenFill());
	createEffect(() => {
		if (!autoplaying()) fill.jump(drivenFill());
	});

	const reduced = createReducedMotion();
	const onScreen = useOnScreen();
	const playing = () =>
		autoplaying() && !reduced() && onScreen() && !(options()?.paused ?? false);
	// One effect restarts the fill and plays it. Two effects would depend on running in order: Solid reorders observers, and a play that ran before the reset would read the old fill (1) and never start, or have its animation ended by the reset's jump.
	createEffect((restartedFor: number | null) => {
		// Reduced motion: no timer moves the page on the reader's behalf. A held fill (paused, reduced, off screen) is stopped where it is and plays on from there with the time it has left, so its progress is kept. A finished fill (1) is never replayed, so the next slide is asked for once.
		const slide = props.value;
		if (!autoplaying()) return null;
		if (slide !== restartedFor) fill.jump(0);
		if (!playing() || fill.get() >= 1) return slide;
		const duration = options()?.duration ?? DEFAULT_DURATION_MS;
		const play = fill.animate(1, {
			duration: ((1 - fill.get()) * duration) / 1000,
			ease: 'linear',
		});
		onCleanup(() => play.stop());
		play.finished.then(() => {
			const live = options();
			if (live === null) return;
			if (!(live.loop ?? true) && slide >= props.count - 1) return;
			props.onValueChange?.((slide + 1) % props.count);
		});
		return slide;
	}, null);
	const fillWidth = createTransform(fill, [0, 1], [DOT_PX, PILL_PX]);

	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const label = (index: number) =>
		props.getLabel?.(index) ?? `Go to slide ${index + 1}`;

	return (
		<div
			testId={props.testId}
			role="group"
			aria-label="Slides"
			{...hover.containerProps}
			style={{
				position: 'relative',
				width: 'fit-content',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
			}}
		>
			<FluidHighlight
				rect={hoverRect}
				session={hover.session}
				radius={DOT_PX / 2 + CLICK_PAD}
				background={color.hover}
			/>
			<For each={Array.from({ length: props.count }, (_, index) => index)}>
				{(index: number) => (
					<Dot
						index={index}
						label={label(index)}
						current={index === props.value}
						fillTestId={
							props.testId === undefined ? undefined : `${props.testId}-fill`
						}
						fillWidth={fillWidth}
						register={hover.registerItem}
						onSelect={() => props.onValueChange?.(index)}
					/>
				)}
			</For>
		</div>
	);
}

function Dot(props: {
	index: number;
	label: string;
	current: boolean;
	fillTestId: string | undefined;
	fillWidth: MotionValue<number>;
	register: (index: number, element: HostElement) => void;
	onSelect: () => void;
}) {
	const renderer = useGpuixRequired();
	let element: HostElement | undefined;
	createEffect(() => {
		if (element === undefined) throw new Error('Dot is not mounted');
		props.register(props.index, element);
	});

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps({ onClick: props.onSelect, tabIndex: 0 }, renderer)}
			aria-label={props.label}
			aria-current={props.current ? true : undefined}
			style={{
				position: 'relative',
				zIndex: 10,
				display: 'flex',
				alignItems: 'center',
				padding: CLICK_PAD,
				borderRadius: DOT_PX / 2 + CLICK_PAD,
				cursor: 'pointer',
				keyboardFocusDim: false,
				focusVisible: focusRing(0),
			}}
		>
			<motion.div
				initial={false}
				animate={{ width: props.current ? PILL_PX : DOT_PX }}
				transition={tween.moderate}
				style={{
					position: 'relative',
					height: DOT_PX,
					overflow: 'hidden',
					borderRadius: DOT_PX / 2,
					backgroundColor: trackColor(),
				}}
			>
				{props.current && (
					// The original slides a full-width pill in from the left behind the dot's rounded clip, so the fill always ends in a round cap. Here the fill is a pill that grows from a dot (p = 0) to the whole pill (p = 1).
					<div
						testId={props.fillTestId}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: props.fillWidth,
							height: DOT_PX,
							borderRadius: DOT_PX / 2,
							backgroundColor: fillColor(),
						}}
					/>
				)}
			</motion.div>
		</div>
	);
}
