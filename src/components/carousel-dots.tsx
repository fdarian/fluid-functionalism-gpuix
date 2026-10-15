import { buttonProps, type HostElement, motion, useGpuixRequired } from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	For,
	on,
	onCleanup,
	untrack,
} from "solid-js";
import { onFrame } from "../lib/clock";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover } from "../lib/fluid-hover";
import { color, scheme, motion as tween, withAlpha, focusRing } from "../lib/theme";

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
	const hover = createFluidHover({ axis: "x" });
	const [clock, setClock] = createSignal(0);

	const options = (): CarouselDotsAutoplay | null => {
		const autoplay = props.autoplay;
		if (autoplay === undefined || autoplay === false) return null;
		return autoplay === true ? {} : autoplay;
	};
	const autoplaying = () => options() !== null && props.progress === undefined;
	const fill = () => {
		const driven = props.progress;
		if (typeof driven === "function") return driven();
		if (driven !== undefined) return driven;
		return autoplaying() ? clock() : 1;
	};

	// Autoplay restarts the fill whenever the slide changes, whoever changed
	// it. `waiting` is set once the clock has asked for the next slide, so it
	// asks once, not every frame, if the parent is slow to move on.
	let waiting = false;
	createEffect(
		on(
			() => [props.value, autoplaying()] as const,
			([, playing]) => {
				waiting = false;
				if (playing) setClock(0);
			},
		),
	);

	createEffect(() => {
		if (!autoplaying()) return;
		onFrame((delta) => {
			const live = untrack(options);
			if (live === null || (live.paused ?? false) || waiting) return;
			const next =
				untrack(clock) + delta / (live.duration ?? DEFAULT_DURATION_MS);
			if (next < 1) {
				setClock(next);
			} else if ((live.loop ?? true) || props.value < props.count - 1) {
				setClock(1);
				waiting = true;
				props.onValueChange?.((props.value + 1) % props.count);
			} else {
				setClock(1);
			}
		});
	});

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
				position: "relative",
				alignSelf: "flex-start",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
			}}
		>
			{/* First child: gpuix has no zIndex, so the dots paint over the highlight by document order. */}
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
						fill={fill}
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
	fill: () => number;
	register: (index: number, element: HostElement) => void;
	onSelect: () => void;
}) {
	const renderer = useGpuixRequired();
	let element: HostElement | undefined;
	createEffect(() => {
		if (element === undefined) throw new Error("Dot is not mounted");
		props.register(props.index, element);
	});

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps({ onClick: props.onSelect, tabIndex: 0 }, renderer)}
			aria-label={props.label}
			aria-selected={props.current}
			style={{
				position: "relative",
				display: "flex",
				alignItems: "center",
				padding: CLICK_PAD,
				borderRadius: DOT_PX / 2 + CLICK_PAD,
				cursor: "pointer",
				keyboardFocusDim: false,
				focusVisible: focusRing(0),
			}}
		>
			<motion.div
				initial={false}
				animate={{ width: props.current ? PILL_PX : DOT_PX }}
				transition={tween.moderate}
				style={{
					position: "relative",
					height: DOT_PX,
					overflow: "hidden",
					borderRadius: DOT_PX / 2,
					backgroundColor: trackColor(),
					// A filled box blocks hits behind it, which would leave only the dot's padding clickable.
					pointerEvents: "none",
				}}
			>
				{props.current && (
					// The original slides a full-width pill in from the left behind the dot's rounded clip, so the fill always ends in a round cap. gpui clips to a rectangle, which would leave a square left edge, so the fill is a pill that grows from a dot (p = 0) to the whole pill (p = 1).
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width:
								DOT_PX +
								Math.min(Math.max(props.fill(), 0), 1) * (PILL_PX - DOT_PX),
							height: DOT_PX,
							borderRadius: DOT_PX / 2,
							backgroundColor: fillColor(),
							pointerEvents: "none",
						}}
					/>
				)}
			</motion.div>
		</div>
	);
}
