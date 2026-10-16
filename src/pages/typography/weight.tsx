import { motion } from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import { color, fade, type as scale, shape, weight } from "../../lib/theme";
import { createVisibility } from "../surfaces/visibility";
import { MARK_BLUE, MARK_RED, Specimen, TweakFrame } from "./specimen";

const MENU_LABEL = "Open the settings dialog";

/** The row's inset in its frame (`p-1`) and its own padding (`px-2`): where the label starts. */
const FRAME_PAD = 4;
const ROW_PAD = 8;
const ROW_HEIGHT = 36;
const LABEL_LEFT = FRAME_PAD + ROW_PAD;

const width = (px: number) =>
	Math.abs(px) < 0.25 ? "same width" : `${Math.abs(px).toFixed(1)}px wider`;

const wider = (px: number | undefined) =>
	px === undefined ? "" : `: ${width(px)}`;

interface Cursor {
	y: Accessor<number>;
	over: Accessor<boolean>;
}

/** The scripted pointer's arrow; its tip sits 3px in from the SVG's corner. */
function FakeCursor(props: { x: number; y: Accessor<number> }) {
	return (
		<motion.div
			animate={{ top: props.y() - 3 }}
			transition={{ duration: 0.6, ease: "easeInOut" }}
			style={{
				position: "absolute",
				left: props.x - 3,
				top: props.y() - 3,
				pointerEvents: "none",
			}}
		>
			<svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
				<path
					d="m4 4 7.07 17 2.51-7.39L21 11.07z"
					fill={color.foreground}
					stroke={color.background}
					strokeWidth={1.5}
					strokeLinejoin="round"
				/>
			</svg>
		</motion.div>
	);
}

/**
 * One menu item that behaves like a sidebar row: a hover background under the
 * pointer, and a click that sets the active background and turns the label
 * semibold. The blue line marks the unselected width; whatever runs past it is
 * tinted red.
 */
function WeightItem(props: {
	selected: boolean;
	onToggle: () => void;
	cursor: Cursor | null;
	onDelta: (px: number) => void;
}) {
	const [pointerOver, setPointerOver] = createSignal(false);
	// The label at both weights, out of sight, so the line and the tint know both widths whichever one shows.
	const [regularWidth, setRegularWidth] = createSignal<number>();
	const [heavyWidth, setHeavyWidth] = createSignal<number>();
	const hovered = () =>
		props.cursor === null ? pointerOver() : props.cursor.over();
	const over = () => {
		const regular = regularWidth();
		const heavy = heavyWidth();
		return regular === undefined || heavy === undefined ? 0 : heavy - regular;
	};
	createEffect(() => {
		if (regularWidth() !== undefined && heavyWidth() !== undefined) {
			props.onDelta(over());
		}
	});
	const labelStyle = (heavy: boolean) => ({
		...scale.body,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});

	return (
		<div style={{ position: "relative", padding: FRAME_PAD }}>
			<div
				style={{
					position: "absolute",
					left: FRAME_PAD,
					right: FRAME_PAD,
					top: FRAME_PAD,
					height: ROW_HEIGHT,
					borderRadius: shape.bg,
					backgroundColor: color.active,
					opacity: props.selected ? 1 : 0,
					...fade(["opacity"], 80),
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: FRAME_PAD,
					right: FRAME_PAD,
					top: FRAME_PAD,
					height: ROW_HEIGHT,
					borderRadius: shape.bg,
					backgroundColor: color.hover,
					opacity: hovered() ? 1 : 0,
					...fade(["opacity"], 80),
				}}
			/>
			<div
				onMouseEnter={() => setPointerOver(true)}
				onMouseLeave={() => setPointerOver(false)}
				onClick={props.onToggle}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					height: ROW_HEIGHT,
					paddingLeft: ROW_PAD,
					paddingRight: ROW_PAD,
					cursor: "pointer",
				}}
			>
				<text
					style={{
						...labelStyle(props.selected),
						color:
							props.selected || hovered()
								? color.foreground
								: color.mutedForeground,
						...fade(["color"], 80),
					}}
				>
					{MENU_LABEL}
				</text>
			</div>
			{[false, true].map((heavy) => (
				<text
					aria-hidden
					onLayout={(event) =>
						(heavy ? setHeavyWidth : setRegularWidth)(event.width)
					}
					style={{
						...labelStyle(heavy),
						position: "absolute",
						left: LABEL_LEFT,
						top: 0,
						opacity: 0,
						pointerEvents: "none",
					}}
				>
					{MENU_LABEL}
				</text>
			))}
			{regularWidth() === undefined ? null : (
				<div
					style={{
						position: "absolute",
						top: 8,
						bottom: 8,
						left: LABEL_LEFT + (regularWidth() ?? 0),
						width: 1,
						backgroundColor: MARK_BLUE,
						pointerEvents: "none",
					}}
				/>
			)}
			{props.selected && over() >= 0.5 ? (
				<div
					style={{
						position: "absolute",
						left: LABEL_LEFT + (regularWidth() ?? 0),
						width: over(),
						top: FRAME_PAD + (ROW_HEIGHT - scale.body.lineHeight) / 2 - 3,
						height: scale.body.lineHeight + 6,
						backgroundColor: MARK_RED,
						pointerEvents: "none",
					}}
				/>
			) : null}
			{props.cursor === null ? null : (
				<FakeCursor x={CURSOR_X} y={props.cursor.y} />
			)}
		</div>
	);
}

// The script, one loop shared by both items so they click together: the cursor
// comes down onto the label, rests a beat, clicks it on, holds long enough to
// read the result, clicks it off, and leaves.
const OUT_Y = -28;
const IN_Y = 24;
const CURSOR_X = 56;
const GLIDE_MS = 600;
const REST_MS = 200;
const ON_MS = 1400;
const OFF_MS = 600;
const AWAY_MS = 400;
/** The glide crosses the item's top edge (y 4) a third of the way in. */
const REACH_MS = 330;

/** The demo plays while at least half of it is on screen and no pointer is inside. */
function createScript(
	playing: Accessor<boolean>,
	setSelected: (on: boolean) => void,
) {
	const [y, setY] = createSignal(OUT_Y);
	const [over, setOver] = createSignal(false);
	createEffect(
		on(playing, (active) => {
			if (!active) return;
			const timers: ReturnType<typeof setTimeout>[] = [];
			const at = (ms: number, run: () => void) => {
				timers.push(setTimeout(run, ms));
			};
			const loop = () => {
				let t = 0;
				setSelected(false);
				setY(IN_Y);
				at(t + REACH_MS, () => setOver(true));
				t += GLIDE_MS + REST_MS;
				at(t, () => setSelected(true));
				t += ON_MS;
				at(t, () => setSelected(false));
				t += OFF_MS;
				at(t, () => setY(OUT_Y));
				at(t + 250, () => setOver(false));
				t += GLIDE_MS + AWAY_MS;
				at(t, loop);
			};
			loop();
			onCleanup(() => {
				for (const timer of timers) clearTimeout(timer);
				setOver(false);
			});
		}),
	);
	return { y, over } satisfies Cursor;
}

export function WeightOpszDemo() {
	const [plain, setPlain] = createSignal<number>();
	const [paired, setPaired] = createSignal<number>();
	const [selected, setSelected] = createSignal(true);
	const [userInside, setUserInside] = createSignal(false);
	const visibility = createVisibility(0.5);
	const scripted = () => visibility.visible() && !userInside();
	const cursor = createScript(scripted, setSelected);
	const pairedCaption = () => {
		const px = paired();
		const note = px === undefined ? "" : ` (${width(px)} here)`;
		return `Weight + optical size needs variable axes${note}`;
	};

	return (
		<TweakFrame
			testId="tweak-weight"
			ref={visibility.ref}
			onEnter={() => setUserInside(true)}
			onLeave={() => setUserInside(false)}
		>
			<Specimen
				good={false}
				testId="weight-plain"
				caption={`Weight only${wider(plain())}`}
			>
				<WeightItem
					selected={selected()}
					onToggle={() => setSelected(!selected())}
					cursor={scripted() ? cursor : null}
					onDelta={setPlain}
				/>
			</Specimen>
			{/* gpuix renders only a font's static cuts, so the paired axes cannot be set: this side is the same cut as the left (drift/typography.md). */}
			<Specimen good mark="⚠️" testId="weight-paired" caption={pairedCaption()}>
				<WeightItem
					selected={selected()}
					onToggle={() => setSelected(!selected())}
					cursor={scripted() ? cursor : null}
					onDelta={setPaired}
				/>
			</Specimen>
		</TweakFrame>
	);
}
