import {
	buttonProps,
	type EventPayload,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import { createSignal, For } from "solid-js";
import { fill } from "../../lib/press";
import {
	color,
	focusRing,
	shape,
	siteType,
	weight,
} from "../../lib/theme";
import {
	Compare,
	clickStep,
	createLoop,
	createPlayback,
	createScriptCursor,
	type Side,
	turns,
} from "./playback";

// Button press: 1px per side, not a scale.

/**
 * The same press on 2 sizes: the compact rung of the ladder above a wide
 * default button. The script presses them one after the other, so the
 * difference between them is felt, not just seen.
 */
const SIZES = [
	{ height: 28, padX: 12, text: "caption", label: "Skip" },
	{
		height: 36,
		padX: 0,
		text: "body",
		label: "Continue",
		width: 256,
	},
] as const;

/** The scale the generic side presses to. */
const GENERIC_SCALE = 0.9;
const PRESS_IN_S = 0.15;

interface PressProps {
	pressed: number | null;
	setPressed: (index: number | null) => void;
}

/** Script and pointer both drive which button is down, since the native press state cannot be scripted. `pressed` is the index of the button held, or null. */
function pressHandlers(
	index: number,
	props: PressProps,
	setHovered: (hovered: boolean) => void,
) {
	return {
		onMouseEnter: () => setHovered(true),
		onMouseDown: () => props.setPressed(index),
		onMouseUp: () => props.setPressed(null),
		onMouseLeave: () => {
			setHovered(false);
			props.setPressed(null);
		},
	};
}

/**
 * Generic: scale(0.9) takes 10% of each button, not a fixed amount. The 28px
 * button loses about 1.4px a side; the 256px one loses about 13px a side but
 * under 2px top and bottom, so it squashes. It takes the same pressed color as
 * the skill side, so the geometry is the only difference. gpuix has no
 * transform, so the shrunk box is the button with a margin of 5% of each
 * dimension.
 */
function GenericButton(props: { index: number; press: PressProps }) {
	const renderer = useGpuixRequired();
	const size = SIZES[props.index];
	if (size === undefined) throw new Error(`no size ${props.index}`);
	const [hovered, setHovered] = createSignal(false);
	const [measured, setMeasured] = createSignal<number>();
	const down = () => props.press.pressed === props.index;
	const insetX = () => {
		const width = measured();
		return down() && width !== undefined
			? (width * (1 - GENERIC_SCALE)) / 2
			: 0;
	};
	const insetY = () => (down() ? (size.height * (1 - GENERIC_SCALE)) / 2 : 0);
	return (
		<div
			{...buttonProps({}, renderer)}
			testId={`press-generic-${props.index}`}
			{...pressHandlers(props.index, props.press, setHovered)}
			onLayout={(event: EventPayload) => {
				if (event.width === undefined)
					throw new Error("onLayout reported no width");
				setMeasured(event.width);
			}}
			style={{
				height: size.height,
				...("width" in size ? { width: size.width, maxWidth: "100%" } : {}),
				display: "flex",
				flexDirection: "row",
				cursor: "pointer",
				keyboardFocusDim: false,
			}}
		>
			<motion.div
				initial={false}
				animate={{
					marginLeft: insetX(),
					marginRight: insetX(),
					marginTop: insetY(),
					marginBottom: insetY(),
					backgroundColor: down()
						? color.primaryActive
						: hovered()
							? color.primaryHover
							: color.foreground,
				}}
				transition={{ duration: PRESS_IN_S }}
				style={{
					flexGrow: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					paddingLeft: size.padX,
					paddingRight: size.padX,
					borderRadius: shape.button,
				}}
			>
				<text
					style={{
						...siteType[size.text],
						fontWeight: weight.normal,
						color: color.background,
						whiteSpace: "nowrap",
					}}
				>
					{size.label}
				</text>
			</motion.div>
		</div>
	);
}

/**
 * With the skill: the Button's press. The surface sits 1px inside and a
 * same-color 1px spread fills it out; pressing collapses the spread, so the
 * surface shrinks exactly 1px per side at any size. Fast in (80ms), slow out
 * (180ms).
 */
function SkillButton(props: { index: number; press: PressProps }) {
	const renderer = useGpuixRequired();
	const size = SIZES[props.index];
	if (size === undefined) throw new Error(`no size ${props.index}`);
	const [hovered, setHovered] = createSignal(false);
	const down = () => props.press.pressed === props.index;
	const surface = () =>
		down()
			? color.primaryActive
			: hovered()
				? color.primaryHover
				: color.foreground;
	return (
		<div
			testId={`press-skill-${props.index}`}
			style={{
				height: size.height,
				...("width" in size ? { width: size.width, maxWidth: "100%" } : {}),
				display: "flex",
				flexDirection: "row",
			}}
		>
			<motion.div
				{...buttonProps({}, renderer)}
				{...pressHandlers(props.index, props.press, setHovered)}
				initial={false}
				animate={{ boxShadow: fill(surface(), down() ? 0 : 1) }}
				transition={{ duration: down() ? 0.08 : 0.18 }}
				style={{
					flexGrow: 1,
					margin: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					paddingLeft: size.padX - 1,
					paddingRight: size.padX - 1,
					borderRadius: shape.button,
					cursor: "pointer",
					keyboardFocusDim: false,
					focusVisible: focusRing(1),
				}}
			>
				<text
					style={{
						...siteType[size.text],
						fontWeight: weight.normal,
						color: color.background,
						whiteSpace: "nowrap",
					}}
				>
					{size.label}
				</text>
			</motion.div>
		</div>
	);
}

function Buttons(props: { side: Side; press: PressProps }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: 16,
				width: "100%",
			}}
		>
			<For each={SIZES}>
				{(_size, index) =>
					props.side === "generic" ? (
						<GenericButton index={index()} press={props.press} />
					) : (
						<SkillButton index={index()} press={props.press} />
					)
				}
			</For>
		</div>
	);
}

export function PressExample() {
	const playback = createPlayback();
	const cursor = createScriptCursor(playback);
	const [generic, setGeneric] = createSignal<number | null>(null);
	const [skill, setSkill] = createSignal<number | null>(null);
	const [active, setActive] = createSignal<Side | null>(null);
	const set = (side: Side) => (side === "generic" ? setGeneric : setSkill);
	// Each turn clicks the small button, then the wide one.
	const target = (side: Side, index: number) => `press-${side}-${index}`;
	createLoop(
		playback.playing,
		turns(setActive, (side) => [
			...clickStep(cursor, target(side, 0), () => set(side)(0), 260),
			{ ms: 400, run: () => set(side)(null) },
			...clickStep(cursor, target(side, 1), () => set(side)(1), 260),
			{ ms: 800, run: () => set(side)(null) },
		]),
		// Never leave a button held down for the visitor taking over.
		() => {
			setGeneric(null);
			setSkill(null);
		},
	);

	return (
		<Compare
			playback={playback}
			cursor={cursor}
			active={playback.playing() ? active() : null}
			generic={
				<Buttons
					side="generic"
					press={{ pressed: generic(), setPressed: setGeneric }}
				/>
			}
			skill={
				<Buttons
					side="skill"
					press={{ pressed: skill(), setPressed: setSkill }}
				/>
			}
		/>
	);
}
