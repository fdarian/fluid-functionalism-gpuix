import { window as appWindow, type DomEvent, motion } from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
} from "solid-js";
import { Button } from "#/components/button";
import { Tooltip } from "#/components/tooltip";
import type { ShotContext } from "#/lib/demo";
import { usePageNav } from "#/lib/page-nav";
import { color, type as scale, siteType, withAlpha } from "#/lib/theme";
import { ArrowCaptureContext, ArrowKeys } from "#/pages/compare/arrow-keys";
import { CompareCard } from "#/pages/compare/card";
import { fluidPreviews } from "#/pages/compare/fluid-previews";
import { shadcnPreviews } from "#/pages/compare/shadcn-previews";

export const title = "Compare with shadcn";
export const group = "Pages";
export const order = 3;
export const layout = "full";
export const listed = "menu";
export const menuIcon = "scaling";
export const menuKeywords = ["shadcn", "side by side"];

/** `SLIDE_ORDER` of app/compare/page.tsx, without the slides that render nothing there (no shadcn original or no Fluid preview). */
const SLIDES = [
	{ slug: "dropdown", name: "Dropdown" },
	{ slug: "checkbox-group", name: "CheckboxGroup" },
	{ slug: "accordion", name: "Accordion" },
	{ slug: "tabs", name: "Tabs" },
	{ slug: "radio-group", name: "RadioGroup" },
	{ slug: "slider", name: "Slider" },
	{ slug: "input-group", name: "InputGroup" },
	{ slug: "switch", name: "Switch" },
	{ slug: "table", name: "Table" },
	{ slug: "tabs-subtle", name: "TabsSubtle" },
] as const;

type Slide = (typeof SLIDES)[number];

/** The slides whose widget owns the arrow keys: a menu, a tablist, a radio group, a slider, an input. */
const KEEPS_ARROWS: ReadonlySet<string> = new Set([
	"dropdown",
	"tabs",
	"radio-group",
	"slider",
	"input-group",
	"tabs-subtle",
]);

const MAX_WIDTH = 1200;

export async function scenarios(shot: ShotContext) {
	shot.capture("dropdown");
	await shot.click("sc-dropdown-primitives");
	await shot.click("fl-dropdown-primitives");
	await shot.hover("sc-dropdown-clarity");
	shot.capture("dropdown-picked");

	await shot.click("compare-next");
	await shot.click("sc-checkbox-spring");
	await shot.click("sc-checkbox-weight");
	await shot.click("fl-checkbox-spring");
	await shot.click("fl-checkbox-weight");
	shot.capture("checkbox-group");

	// Arrows step the slides while no widget holds focus; the checkbox rows are not among them.
	await shot.press("ArrowRight");
	await shot.click("sc-accordion-item-3");
	await shot.click("fl-accordion-item-3");
	await shot.settle(500);
	shot.capture("accordion");

	await shot.click("compare-next");
	await shot.click("sc-tabs-analytics");
	await shot.click("fl-tabs-analytics");
	shot.capture("tabs");

	await shot.click("compare-next");
	await shot.click("sc-radio-slow");
	await shot.click("fl-radio-slow");
	shot.capture("radio-group");

	await shot.click("compare-next");
	const track = shot.centerOf("sc-slider-opacity");
	await shot.clickAt(track.x + 60, track.y);
	shot.capture("slider");

	await shot.click("compare-next");
	await shot.click("fl-email-input");
	await shot.press("a @ b . c");
	await shot.click("sc-email");
	await shot.press("a @ b . c");
	await shot.settle(300);
	shot.capture("input-group");

	await shot.click("compare-next");
	shot.capture("switch-initial");
	await shot.click("sc-switch-sound");
	await shot.click("fl-switch-sound");
	shot.capture("switch");

	await shot.click("compare-next");
	await shot.hover("sc-table-row-2");
	await shot.hover("fl-table-row-2");
	shot.capture("table");

	await shot.click("compare-next");
	await shot.click("sc-tabs-subtle-recents");
	await shot.click("fl-tabs-subtle-1");
	shot.capture("tabs-subtle");

	await shot.click("compare-pill-accordion");
	shot.capture("pill-jump");
}

function SlideArrow(props: {
	direction: "previous" | "next";
	neighbour: Slide | undefined;
	onClick: () => void;
}) {
	const previous = () => props.direction === "previous";
	const hint = () => {
		const neighbour = props.neighbour;
		if (neighbour === undefined) return previous() ? "No previous" : "No next";
		return (
			<text
				style={{
					...scale.caption,
					color: color.background,
					whiteSpace: "nowrap",
				}}
			>
				{neighbour.name}
				{" "}
				<span
					style={{
						fontFamily: "Menlo",
						color: withAlpha(color.background, 0.5),
					}}
				>
					{previous() ? "←" : "→"}
				</span>
			</text>
		);
	};
	return (
		<Tooltip content={hint()}>
			<Button
				variant="ghost"
				size="icon"
				icon={previous() ? "arrow-left" : "arrow-right"}
				disabled={props.neighbour === undefined}
				aria-label={previous() ? "Previous slide" : "Next slide"}
				testId={previous() ? "compare-prev" : "compare-next"}
				onClick={props.onClick}
			/>
		</Tooltip>
	);
}

function Pill(props: { slide: Slide; current: boolean; onClick: () => void }) {
	return (
		<div
			role="button"
			tabIndex={0}
			aria-label={`Go to ${props.slide.name}`}
			testId={`compare-pill-${props.slide.slug}`}
			onClick={props.onClick}
			onKeyDown={(event) => {
				if (event.key === "Enter") props.onClick();
			}}
			onKeyUp={(event) => {
				if (event.key === " ") props.onClick();
			}}
			style={{ cursor: "pointer", keyboardFocusDim: false }}
		>
			<motion.div
				initial={false}
				animate={{ width: props.current ? 24 : 6 }}
				transition={{ duration: 0.15 }}
				style={{
					height: 6,
					borderRadius: 3,
					backgroundColor: withAlpha(color.foreground, 0.4),
				}}
			/>
		</div>
	);
}

/** `flex flex-col items-center justify-center w-full max-w-[420px] mx-auto`, around one side's preview. */
function Stage(props: {
	slug: string;
	previews: Record<string, () => JSX.Element>;
}) {
	const Preview = props.previews[props.slug];
	if (Preview === undefined) {
		throw new Error(`There is no preview for the ${props.slug} slide`);
	}
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				width: "100%",
				maxWidth: 420,
			}}
		>
			<Show when={KEEPS_ARROWS.has(props.slug)} fallback={<Preview />}>
				<ArrowKeys>
					<Preview />
				</ArrowKeys>
			</Show>
		</div>
	);
}

export function Page(): JSX.Element {
	const nav = usePageNav();
	const [index, setIndex] = createSignal(0);
	const [capturing, setCapturing] = createSignal(0);
	const slide = () => {
		const current = SLIDES[index()];
		if (current === undefined) throw new Error(`There is no slide ${index()}`);
		return current;
	};
	const neighbour = (by: number) => SLIDES[index() + by];

	// The slide a change in flight will land on: two keys in one tick both count from it.
	let target = 0;
	const goTo = (next: number) => {
		if (next < 0 || next >= SLIDES.length) return;
		target = next;
		setIndex(next);
	};
	// A slide that unmounts with focus inside never reports the blur.
	createEffect(on(index, () => setCapturing(0), { defer: true }));

	const onKeyDown = (event: DomEvent) => {
		if (
			event.metaKey === true ||
			event.ctrlKey === true ||
			event.altKey === true ||
			event.shiftKey === true
		) {
			return;
		}
		if (capturing() > 0) return;
		if (event.key === "ArrowRight" || event.key === "ArrowDown") {
			event.preventDefault();
			goTo(target + 1);
		} else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
			event.preventDefault();
			goTo(target - 1);
		}
	};
	appWindow.addEventListener("keydown", onKeyDown);
	onCleanup(() => appWindow.removeEventListener("keydown", onKeyDown));

	return (
		<ArrowCaptureContext.Provider
			value={{
				enter: () => setCapturing(capturing() + 1),
				leave: () => setCapturing(Math.max(0, capturing() - 1)),
			}}
		>
			<div
				style={{
					width: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					paddingLeft: 48,
					paddingRight: 48,
				}}
			>
				<div
					style={{
						width: "100%",
						maxWidth: MAX_WIDTH,
						paddingTop: 96,
						paddingBottom: 32,
						display: "flex",
						flexDirection: "row",
						alignItems: "flex-start",
						justifyContent: "space-between",
						gap: 16,
					}}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						<text
							style={{
								...siteType.display,
								lineHeight: siteType.display.fontSize,
								fontWeight: 700,
								color: color.foreground,
							}}
						>
							Shadcn VS Fluid Functionalism
						</text>
						<text style={{ ...siteType.body, color: color.mutedForeground }}>
							Hover the difference, side by side
						</text>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 8,
								marginTop: 8,
							}}
						>
							<Button
								size="compact"
								testId="compare-learn-more"
								onClick={() => nav.navigate("introduction")}
							>
								Learn more
							</Button>
							{/* /demo is not ported. */}
							<Button
								size="compact"
								variant="tertiary"
								testId="compare-see-demo"
								disabled
							>
								See demo
							</Button>
						</div>
					</div>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 4,
							flexShrink: 0,
						}}
					>
						<SlideArrow
							direction="previous"
							neighbour={neighbour(-1)}
							onClick={() => goTo(target - 1)}
						/>
						<SlideArrow
							direction="next"
							neighbour={neighbour(1)}
							onClick={() => goTo(target + 1)}
						/>
					</div>
				</div>

				<Show when={slide()} keyed>
					{(current: Slide) => (
						<div
							style={{
								width: "100%",
								maxWidth: MAX_WIDTH,
								display: "flex",
								flexDirection: "row",
								gap: 16,
							}}
						>
							<CompareCard name="shadcn/ui" testId="compare-shadcn">
								<Stage slug={current.slug} previews={shadcnPreviews} />
							</CompareCard>
							<CompareCard
								name={current.name}
								testId="compare-fluid"
								link={() => nav.navigate(current.slug)}
							>
								<Stage slug={current.slug} previews={fluidPreviews} />
							</CompareCard>
						</div>
					)}
				</Show>

				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						alignItems: "center",
						justifyContent: "center",
						gap: 10,
						marginTop: 40,
						marginBottom: 48,
					}}
				>
					<For each={SLIDES}>
						{(entry, position) => (
							<Pill
								slide={entry}
								current={position() === index()}
								onClick={() => goTo(position())}
							/>
						)}
					</For>
				</div>
			</div>
		</ArrowCaptureContext.Provider>
	);
}
