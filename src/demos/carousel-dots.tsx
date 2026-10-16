import { AnimatePresence, motion } from "@gpuix/solid";
import { createSignal, For, type JSX } from "solid-js";
import { CarouselDots } from "../components/carousel-dots";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, shape, type as scale, motion as tween } from "../lib/theme";

export const SLIDES = ["Inbox", "Drafts", "Sent", "Archive"];
/** How far a slide's label travels sideways on a change, in px. */
const SLIDE_SHIFT = 24;
const SLIDE_SIZE = 160;

/** Slide state plus the direction of the last change. A dot picked by hand goes the way the index goes; autoplay wrapping around keeps moving forward. */
export function createSlides() {
	const [state, setState] = createSignal({ slide: 0, direction: 1 });
	let byHand = false;
	return {
		state,
		/** Pointer or keyboard on the dots marks the next change as a pick. */
		markByHand: {
			onMouseDown: () => {
				byHand = true;
			},
			onKeyDown: () => {
				byHand = true;
			},
		},
		onValueChange(next: number) {
			const picked = byHand;
			byHand = false;
			const { slide } = state();
			setState({
				slide: next,
				direction: picked ? (next > slide ? 1 : -1) : 1,
			});
		},
	};
}

/** The label slides sideways: the new one comes in from the direction of travel and the old one leaves the other way. */
export function Slide(props: {
	index: number;
	direction: number;
	width?: number;
	height?: number;
}) {
	return (
		<div
			style={{
				position: "relative",
				width: props.width ?? SLIDE_SIZE,
				height: props.height ?? SLIDE_SIZE,
				overflow: "hidden",
				borderRadius: shape.container,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
			}}
		>
			<AnimatePresence initial={false}>
				<For each={[props.index]}>
					{(index: number) => (
						<motion.div
							initial={{
								opacity: 0,
								left: props.direction * SLIDE_SHIFT,
								right: -props.direction * SLIDE_SHIFT,
							}}
							animate={{ opacity: 1, left: 0, right: 0 }}
							exit={{
								opacity: 0,
								left: -props.direction * SLIDE_SHIFT,
								right: props.direction * SLIDE_SHIFT,
							}}
							transition={tween.moderate}
							style={{
								position: "absolute",
								top: 0,
								bottom: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<text style={{ ...scale.body, color: color.foreground }}>
								{SLIDES[index]}
							</text>
						</motion.div>
					)}
				</For>
			</AnimatePresence>
		</div>
	);
}

function Section(props: { caption: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				flexBasis: 0,
				flexGrow: 1,
				gap: 12,
			}}
		>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.caption}
			</text>
			{props.children}
		</div>
	);
}

export const title = "Carousel Dots";
export const group = "Components";

export function Demo() {
	const staticSlides = createSlides();
	const autoplaySlides = createSlides();
	const [hovering, setHovering] = createSignal(false);
	return (
		<DemoCard title="CarouselDots">
			<div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
				<Section caption="Static: hover a dot to see its click area">
					<Slide
						index={staticSlides.state().slide}
						direction={staticSlides.state().direction}
					/>
					<div {...staticSlides.markByHand}>
						<CarouselDots
							testId="static"
							count={SLIDES.length}
							value={staticSlides.state().slide}
							onValueChange={staticSlides.onValueChange}
							getLabel={(index: number) => `Show ${SLIDES[index]}`}
						/>
					</div>
				</Section>
				<Section caption="Autoplay: hover the slide to pause">
					<div
						testId="autoplay-slide"
						onMouseEnter={() => setHovering(true)}
						onMouseLeave={() => setHovering(false)}
					>
						<Slide
							index={autoplaySlides.state().slide}
							direction={autoplaySlides.state().direction}
						/>
					</div>
					<div {...autoplaySlides.markByHand}>
						<CarouselDots
							testId="autoplay"
							count={SLIDES.length}
							value={autoplaySlides.state().slide}
							onValueChange={autoplaySlides.onValueChange}
							autoplay={{ duration: 3000, paused: hovering() }}
							getLabel={(index: number) => `Show ${SLIDES[index]}`}
						/>
					</div>
				</Section>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	const dots = shot.centerOf("static");
	await shot.moveTo(dots.x - 36, dots.y);
	shot.capture("hover-dot");
	await shot.moveTo(dots.x + 18, dots.y);
	shot.capture("hover-next-dot");
	await shot.clickAt(dots.x + 18, dots.y);
	shot.capture("picked-third");
	await shot.moveTo(1180, 700);
	shot.capture("pointer-left");
	await shot.hover("autoplay-slide");
	await shot.settle(900);
	shot.capture("autoplay-paused-mid-fill");
	await shot.moveTo(1180, 700);
	await shot.settle(3400);
	shot.capture("autoplay-advanced");
};
