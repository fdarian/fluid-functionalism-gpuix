import type { EventPayload, HostElement } from "@gpuix/solid";
import { type Accessor, createSignal, For, Show } from "solid-js";
import { Switch } from "../../components/switch";
import { ComponentPreview, MONO } from "../../lib/doc-page";
import { createFluidHover } from "../../lib/fluid-hover";
import { color, type as scale, weight, withAlpha } from "../../lib/theme";
import {
	FluidRow,
	ListFrame,
	ListHighlight,
	ROW_GAP,
} from "./parts";
import { ROWS } from "./plain-vs-fluid";
import { MATH_CODE } from "./snippets";

function MathList(props: { showMath: () => boolean }) {
	const hover = createFluidHover();
	const [cursorY, setCursorY] = createSignal<number | null>(null);
	let container: HostElement | undefined;

	const centers = () =>
		hover.isMeasured()
			? ROWS.map((_, index) => {
					const rect = hover.rects()[index];
					return rect === undefined ? null : rect.top + rect.height / 2;
				})
			: [];
	// The highlight flips where the cursor crosses the midpoint between two neighbouring centers.
	const boundaries = () => {
		const all = centers();
		return all.flatMap((center, index) => {
			const next = all[index + 1];
			return center !== null && next !== undefined && next !== null
				? [(center + next) / 2]
				: [];
		});
	};
	const winner = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		const rect = hover.rects()[index];
		return rect === undefined ? null : rect.top + rect.height / 2;
	};
	/** Read inside a `Show` on the same signal, where it cannot be null. */
	const cursorNow = () => {
		const y = cursorY();
		if (y === null) throw new Error("The cursor line has no pointer");
		return y;
	};
	const winnerNow = () => {
		const y = winner();
		if (y === null) throw new Error("The distance has no winning row");
		return y;
	};

	return (
		<div
			ref={(element) => {
				container = element;
				hover.containerRef(element);
			}}
			onMouseEnter={hover.handlers.onMouseEnter}
			onMouseLeave={() => {
				hover.handlers.onMouseLeave();
				setCursorY(null);
			}}
			onMouseMove={(event: EventPayload) => {
				hover.handlers.onMouseMove(event);
				if (container === undefined || event.y === undefined) return;
				setCursorY(event.y - container.getBoundingClientRect().y);
			}}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				gap: ROW_GAP,
				paddingLeft: 8,
				paddingRight: 8,
				paddingTop: 24,
				paddingBottom: 24,
			}}
		>
			<ListHighlight hover={hover} />
			<For each={ROWS}>
				{(label, index) => (
					<FluidRow
						hover={hover}
						index={index()}
						label={label}
						testId={`math-row-${index()}`}
					/>
				)}
			</For>

			<Show when={props.showMath()}>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						pointerEvents: "none",
					}}
				>
					{/* Midpoints between centers: the highlight flips here. */}
					<For each={boundaries()}>
						{(y) => (							<div
								style={{
									position: "absolute",
									left: 8,
									right: 8,
									top: y,
									height: 1,
									// A dashed border on a one-sided, zero-height box paints nothing, so the dashes are a gradient.
									backgroundImage: `repeating-linear-gradient(to right, ${withAlpha(color.foreground, 0.2)} 0px, ${withAlpha(color.foreground, 0.2)} 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)`,
								}}
							/>
						)}
					</For>
					<Show when={cursorY() !== null}>
						<div
							style={{
								position: "absolute",
								left: 8,
								right: 8,
								top: cursorNow(),
								height: 1,
								opacity: 0.7,
								backgroundColor: color.focusRing,
							}}
						/>
					</Show>
					{/* Rail: one dot per row center, and the distance to the winner. */}
					<For each={centers()}>
						{(center, index) => (
							<Show when={center}>
								{(y: Accessor<number>) => (
									<div
										style={{
											position: "absolute",
											right: 16,
											top: y() - 4,
											width: 8,
											height: 8,
											borderRadius: 4,
											backgroundColor:
												index() === hover.activeIndex()
													? color.focusRing
													: withAlpha(color.foreground, 0.25),
										}}
									/>
								)}
							</Show>
						)}
					</For>
					<Show when={cursorY() !== null && winner() !== null}>
						<div
							style={{
								position: "absolute",
								right: 20,
								top: Math.min(cursorNow(), winnerNow()),
								width: 1,
								height: Math.abs(cursorNow() - winnerNow()),
								backgroundColor: color.focusRing,
							}}
						/>
						<div
							style={{
								position: "absolute",
								right: 28,
								top: (cursorNow() + winnerNow()) / 2 - 7,
							}}
						>
							<text
								style={{
									fontFamily: MONO,
									fontSize: scale.micro.fontSize,
									lineHeight: scale.micro.lineHeight,
									fontWeight: weight.normal,
									color: color.foreground,
									whiteSpace: "nowrap",
								}}
							>
								{`${Math.round(Math.abs(cursorNow() - winnerNow()))}px`}
							</text>
						</div>
					</Show>
				</div>
			</Show>
		</div>
	);
}

export function ShowTheMathDemo() {
	const [showMath, setShowMath] = createSignal(true);
	return (
		<ComponentPreview testId="show-the-math-preview" code={MATH_CODE} cull>
			<div
				style={{
					width: "100%",
					maxWidth: 384,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 16,
				}}
			>
				<ListFrame>
					<MathList showMath={showMath} />
				</ListFrame>
				<Switch
					label="Show the math"
					checked={showMath()}
					onToggle={() => setShowMath(!showMath())}
					testId="math-switch"
				/>
			</div>
		</ComponentPreview>
	);
}
