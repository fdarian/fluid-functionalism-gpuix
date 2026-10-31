import {
	type AnimationPlaybackControls,
	animate,
	createMotionValue,
	createMotionValueEvent,
	createReducedMotion,
	document,
	type HostElement,
	type HostMouseEvent,
	IntersectionObserver,
	motion,
} from '@ghia/solid';
import {
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	untrack,
} from 'solid-js';
import { usePreviewPlayback } from '#/lib/preview-playback';
import { color, shape, siteType } from '#/lib/theme';
import {
	createScriptedPointer,
	findByTestId,
	fromVisitor,
} from './scripted-pointer';

/** Height of every example's frame, so switching tabs never moves the page. Matches the menu: 5 rows of 36px plus 8px padding top and bottom. */
export const FRAME_H = 196;

/** How much of an example must be on screen for its script to play. */
const IN_VIEW_RATIO = 0.35;

export type Side = 'generic' | 'skill';

/**
 * Whether an example should play its script: on screen, motion allowed (by
 * the OS and by the page's `PreviewPlaybackContext`), and no visitor inside. A real pointer takes over until it leaves, and keyboard
 * focus until it moves out, so the script never changes what someone is
 * tabbing through. Only keyboard focus counts: a mouse click leaves focus on
 * its button after the pointer has gone.
 */
export function createPlayback() {
	const [root, setRoot] = createSignal<HostElement>();
	const [inView, setInView] = createSignal(false);
	const [pointerInside, setPointerInside] = createSignal(false);
	const [keyboardInside, setKeyboardInside] = createSignal(false);
	const reducedMotion = createReducedMotion();
	const allowed = usePreviewPlayback();

	createEffect(() => {
		const element = root();
		if (element === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest === undefined) return;
				setInView(latest.intersectionRatio >= IN_VIEW_RATIO);
			},
			{ threshold: [0, IN_VIEW_RATIO] },
		);
		observer.observe(element);
		onCleanup(() => observer.disconnect());
	});

	const enterOrMove = (event: HostMouseEvent) => {
		if (fromVisitor(event)) setPointerInside(true);
	};
	const bind = {
		onMouseEnter: enterOrMove,
		onMouseMove: enterOrMove,
		onMouseDown: enterOrMove,
		onMouseLeave(event: HostMouseEvent) {
			if (fromVisitor(event)) setPointerInside(false);
		},
		onFocusIn() {
			const focused = document.activeElement;
			if (focused === null) return;
			setKeyboardInside(focused.matches(':focus-visible'));
		},
		onFocusOut() {
			setKeyboardInside(false);
		},
	};

	return {
		root,
		setRoot,
		bind,
		playing: () =>
			inView() &&
			allowed() &&
			!reducedMotion() &&
			!pointerInside() &&
			!keyboardInside(),
	};
}

export type Playback = ReturnType<typeof createPlayback>;

/** A beat before the first step, so an example doesn't start mid-glance. */
const FIRST_STEP_MS = 400;

export interface LoopStep {
	ms: number;
	run: () => void;
}

/**
 * Loops `steps` while `playing`: each step fires its action, then waits its
 * ms. Every script ends where it began, so the next pass starts clean.
 * Pausing keeps the position, so the script resumes in place; `reset` then
 * undoes whatever a step left mid-gesture (a button held down, a "Copied!"
 * waiting to revert), so a visitor taking over finds the example at rest.
 */
export function createLoop(
	playing: () => boolean,
	steps: LoopStep[],
	reset?: () => void,
) {
	let index = 0;
	createEffect(() => {
		if (!playing()) return;
		let timer: ReturnType<typeof setTimeout>;
		const tick = () => {
			const step = steps[index];
			if (step === undefined) throw new Error('the script has no steps');
			step.run();
			index = (index + 1) % steps.length;
			timer = setTimeout(tick, step.ms);
		};
		timer = setTimeout(tick, FIRST_STEP_MS);
		onCleanup(() => {
			clearTimeout(timer);
			reset?.();
		});
	});
}

/** How long the cursor takes to glide to its next target. */
const GLIDE_MS = 500;
/** How long the cursor rests on its target before it presses: long enough to read the hover it lands on. */
const HOVER_MS = 450;
/** The cursor lands from this far below and right of its first target. */
const DRIFT_IN = 24;
const CURSOR = 18;

/**
 * A cursor that travels across a whole Compare, generic side to skill side,
 * in its root's coordinates. `goto` glides it to the center of the element
 * with a `testId`; `click` plays the press. While playing, it hovers what it
 * passes over like a real pointer, through the scripted pointer.
 */
export function createScriptCursor(playback: Playback) {
	const pointer = createScriptedPointer(playback.root);
	/** Where the cursor's tip is in the root: native motion values, so a glide costs no JS frame between its start and its end. */
	const x = createMotionValue(0);
	const y = createMotionValue(0);
	const [placed, setPlaced] = createSignal(false);
	const scale = createMotionValue(1);
	let glides: { stop: () => void }[] = [];
	let hovered: { x: number; y: number } | undefined;
	let press: AnimationPlaybackControls | undefined;
	onCleanup(() => press?.stop());

	const rootBox = () => {
		const root = playback.root();
		if (root === undefined) throw new Error('the example has no root');
		return root.getBoundingClientRect();
	};
	const windowPoint = (point: { x: number; y: number }) => {
		const box = rootBox();
		return { x: box.x + point.x, y: box.y + point.y };
	};
	const tip = () => ({ x: x.get(), y: y.get() });
	const stopGlides = () => {
		for (const glide of glides) glide.stop();
		glides = [];
	};

	// While playing, the cursor hovers what it passes over like a real pointer. x and y each report every frame they move; the point is the same for both, so the second report is skipped.
	const hover = () => {
		if (!playback.playing()) return;
		const at = tip();
		if (hovered !== undefined && hovered.x === at.x && hovered.y === at.y) {
			return;
		}
		hovered = at;
		pointer.moveTo(windowPoint(at));
	};
	createMotionValueEvent(x, 'change', hover);
	createMotionValueEvent(y, 'change', hover);

	createEffect(() => {
		if (!playback.playing()) return;
		// Resuming where it paused: hover what is under it again, since the script may press next without gliding first.
		untrack(() => {
			if (placed()) hover();
		});
		onCleanup(() => {
			stopGlides();
			if (untrack(placed)) pointer.release(windowPoint(tip()));
			hovered = undefined;
		});
	});

	return {
		x,
		y,
		placed,
		scale,
		goto(testId: string) {
			const root = playback.root();
			if (root === undefined) throw new Error('the example has no root');
			const box = root.getBoundingClientRect();
			const to = findByTestId(root, testId).getBoundingClientRect();
			const target = {
				x: to.x - box.x + to.width / 2,
				y: to.y - box.y + to.height / 2,
			};
			stopGlides();
			if (!placed()) {
				x.jump(target.x + DRIFT_IN);
				y.jump(target.y + DRIFT_IN);
				setPlaced(true);
			}
			// Framer's `easeInOut`, as the source's glide: cubic-bezier(0.42, 0, 0.58, 1).
			const glide = { duration: GLIDE_MS / 1000, ease: 'easeInOut' } as const;
			glides = [x.animate(target.x, glide), y.animate(target.y, glide)];
		},
		click() {
			press?.stop();
			press = animate(scale, [1, 0.8, 1], { duration: 0.2 });
			pointer.click();
		},
	};
}

export type ScriptCursor = ReturnType<typeof createScriptCursor>;

/** One scripted glide: to the target, then a rest of `restMs` on it before the next step. */
export function glideStep(
	cursor: ScriptCursor,
	testId: string,
	restMs = HOVER_MS,
): LoopStep {
	return { ms: GLIDE_MS + restMs, run: () => cursor.goto(testId) };
}

/** Two steps for one scripted click: glide to the target and rest on it, then press it and run `act`, then wait `holdMs` before the next step. */
export function clickStep(
	cursor: ScriptCursor,
	testId: string,
	act: () => void,
	holdMs: number,
): LoopStep[] {
	return [
		glideStep(cursor, testId),
		{
			ms: holdMs,
			run: () => {
				cursor.click();
				act();
			},
		},
	];
}

/** Builds turn-by-turn steps: the generic side plays its whole turn, then the skill side plays the same one. `turn(side)` returns that side's steps. */
export function turns(
	setActive: (side: Side) => void,
	turn: (side: Side) => LoopStep[],
): LoopStep[] {
	return (['generic', 'skill'] as const).flatMap((side) => {
		const [first, ...rest] = turn(side);
		if (first === undefined) throw new Error('a turn has no steps');
		return [
			{
				ms: first.ms,
				run: () => {
					setActive(side);
					first.run();
				},
			},
			...rest,
		];
	});
}

const arrow = (size: number) =>
	`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z" fill="${color.foreground}" stroke="${color.background}" stroke-width="1.5" stroke-linejoin="round"/></svg>`;

/** The scripted pointer, an arrow whose tip sits at the position, scaling about its top-left corner as it presses. Shared by every example so they all point the same way. */
function ScriptCursorArrow(props: { cursor: ScriptCursor }) {
	return (
		<Show when={props.cursor.placed()}>
			<motion.div
				testId="script-cursor"
				style={{
					position: 'absolute',
					// The arrow's tip sits 3px in from the SVG's corner.
					left: -3,
					top: -3,
					zIndex: 30,
					transformOrigin: 'top left',
					x: props.cursor.x,
					y: props.cursor.y,
					scale: props.cursor.scale,
					pointerEvents: 'none',
				}}
			>
				<svg source={arrow(CURSOR)} style={{ width: CURSOR, height: CURSOR }} />
			</motion.div>
		</Show>
	);
}

function Caption(props: { side: Side; active: boolean; children: string }) {
	return (
		<text
			testId={`caption-${props.side}`}
			style={{
				...siteType.caption,
				color: props.active ? color.foreground : color.mutedForeground,
				transitionProperty: 'color',
				transitionDuration: '150ms',
				transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
			}}
		>
			{props.children}
		</text>
	);
}

/** The two-up frame every example shares: generic on the left, the skill on the right, each captioned. */
export function Compare(props: {
	playback: Playback;
	generic: JSX.Element;
	skill: JSX.Element;
	/** Lists fill their frame themselves; everything else is centered in a fixed-height frame. */
	bare?: boolean;
	/** The side whose turn it is; its caption darkens. */
	active: Side | null;
	/** The scripted cursor, drawn over both sides while the script plays. */
	cursor: ScriptCursor;
}) {
	const frame = (side: Side, content: JSX.Element, caption: string) => (
		<div
			style={{
				flexGrow: 1,
				flexBasis: 0,
				minWidth: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div
				style={{
					position: 'relative',
					width: '100%',
					overflow: 'hidden',
					borderRadius: shape.container,
					...(props.bare === true
						? {}
						: {
								height: FRAME_H,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}),
				}}
			>
				{content}
			</div>
			<Caption side={side} active={props.active === side}>
				{caption}
			</Caption>
		</div>
	);
	return (
		<div
			ref={props.playback.setRoot}
			{...props.playback.bind}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				gap: 20,
				width: '100%',
				maxWidth: 576,
			}}
		>
			{frame('generic', props.generic, '❌ Generic AI output')}
			{frame('skill', props.skill, '✅ With the skill')}
			<Show when={props.playback.playing()}>
				<ScriptCursorArrow cursor={props.cursor} />
			</Show>
		</div>
	);
}
