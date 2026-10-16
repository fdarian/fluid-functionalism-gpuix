import {
	createEffect,
	createMemo,
	createSignal,
	For,
	on,
	onCleanup,
} from "solid-js";
import { color, type as scale } from "../../lib/theme";
import { createVisibility } from "../surfaces/visibility";
import { MARK_BLUE, MARK_RED, Specimen, TweakFrame } from "./specimen";

// Measured at 13px: Inter's default "1" is 5.3px wide and its "0" 8.2px, so the
// line drifts as the count climbs from 10 to 48. Tabular digits are all 8.4px,
// and the line holds still.
const COUNT_FROM = 10;
const COUNT_TO = 48;
const countLabel = (n: number) => `Installed ${n} of ${COUNT_TO} components`;
const COUNTS = Array.from(
	{ length: COUNT_TO - COUNT_FROM + 1 },
	(_, i) => COUNT_FROM + i,
);
const TICK_MS = 120;
/** Ticks the finished count holds before the next run. */
const HOLD_TICKS = 10;
const CYCLE_TICKS = COUNT_TO - COUNT_FROM + 1 + HOLD_TICKS;

const FRAME_PAD = 4;
const ROW_PAD = 8;
const ROW_HEIGHT = 36;
const LABEL_LEFT = FRAME_PAD + ROW_PAD;

type Numeric = "normal" | "tabular-nums";

/** A row whose count climbs. The blue line marks the narrowest count's width; whatever runs past it is tinted red. */
function CountRow(props: {
	numeric: Numeric;
	count: number;
	onDrift: (px: number) => void;
}) {
	// Every count's label out of sight, to measure it.
	const [widths, setWidths] = createSignal<readonly (number | undefined)[]>(
		COUNTS.map(() => undefined),
	);
	const measured = createMemo(() => {
		const all = widths();
		return all.every((width) => width !== undefined)
			? (all as readonly number[])
			: undefined;
	});
	const rest = () => {
		const all = measured();
		return all === undefined ? undefined : Math.min(...all);
	};
	createEffect(() => {
		const all = measured();
		if (all !== undefined) props.onDrift(Math.max(...all) - Math.min(...all));
	});
	const over = () => {
		const all = measured();
		const narrowest = rest();
		if (all === undefined || narrowest === undefined) return 0;
		return all[props.count - COUNT_FROM] - narrowest;
	};
	const textStyle = () => ({
		...scale.body,
		fontVariantNumeric: props.numeric,
		whiteSpace: "nowrap" as const,
	});

	return (
		<div style={{ position: "relative", padding: FRAME_PAD }}>
			{rest() === undefined ? null : (
				<div
					style={{
						position: "absolute",
						top: 8,
						bottom: 8,
						left: LABEL_LEFT + (rest() ?? 0),
						width: 1,
						backgroundColor: MARK_BLUE,
						pointerEvents: "none",
					}}
				/>
			)}
			{over() >= 0.5 ? (
				<div
					style={{
						position: "absolute",
						left: LABEL_LEFT + (rest() ?? 0),
						width: over(),
						top: FRAME_PAD + (ROW_HEIGHT - scale.body.lineHeight) / 2 - 3,
						height: scale.body.lineHeight + 6,
						backgroundColor: MARK_RED,
						pointerEvents: "none",
					}}
				/>
			) : null}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					height: ROW_HEIGHT,
					paddingLeft: ROW_PAD,
					paddingRight: ROW_PAD,
				}}
			>
				<text style={{ ...textStyle(), color: color.foreground }}>
					{countLabel(props.count)}
				</text>
			</div>
			<For each={COUNTS}>
				{(n, index) => (
					<text
						aria-hidden
						onLayout={(event) =>
							setWidths((all) =>
								all.map((width, i) => (i === index() ? event.width : width)),
							)
						}
						style={{
							...textStyle(),
							position: "absolute",
							left: LABEL_LEFT,
							top: 0,
							opacity: 0,
							pointerEvents: "none",
						}}
					>
						{countLabel(n)}
					</text>
				)}
			</For>
		</div>
	);
}

const drift = (px: number | undefined) =>
	px === undefined
		? ""
		: px < 0.25
			? ": holds still"
			: `: drifts ${px.toFixed(1)}px`;

export function NumbersDemo() {
	const [proportional, setProportional] = createSignal<number>();
	const [tabular, setTabular] = createSignal<number>();
	// The count climbs in both rows at once while the demo is on screen, and
	// holds while a pointer is inside so a frame can be read.
	const [held, setHeld] = createSignal(false);
	const [tick, setTick] = createSignal(0);
	const visibility = createVisibility(0.5);
	const playing = () => visibility.visible() && !held();
	createEffect(
		on(playing, (active) => {
			if (!active) return;
			const id = setInterval(
				() => setTick((t) => (t + 1) % CYCLE_TICKS),
				TICK_MS,
			);
			onCleanup(() => clearInterval(id));
		}),
	);
	const count = () => Math.min(COUNT_FROM + tick(), COUNT_TO);

	return (
		<TweakFrame
			testId="tweak-numbers"
			ref={visibility.ref}
			onEnter={() => setHeld(true)}
			onLeave={() => setHeld(false)}
		>
			<Specimen
				good={false}
				testId="numbers-proportional"
				caption={`Proportional digits${drift(proportional())}`}
			>
				<CountRow numeric="normal" count={count()} onDrift={setProportional} />
			</Specimen>
			<Specimen
				good
				testId="numbers-tabular"
				caption={`Tabular digits${drift(tabular())}`}
			>
				<CountRow numeric="tabular-nums" count={count()} onDrift={setTabular} />
			</Specimen>
		</TweakFrame>
	);
}
