import {
	type AnimationPlaybackControls,
	animate,
	createMotionValue,
	createMotionValueEvent,
	createReducedMotion,
	type HostElement,
	IntersectionObserver,
} from '@gpuix/solid';
import {
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	useContext,
} from 'solid-js';
import { PageScrollerContext } from '#/lib/cull';
import { Code, ComponentPreview } from '#/lib/doc-page';
import { createFluidHover } from '#/lib/fluid-hover';
import { PAUSE_ICON, PLAY_ICON } from '#/lib/playback-icons';
import { usePreviewPlayback } from '#/lib/preview-playback';
import { color, siteType } from '#/lib/theme';
import {
	FakeCursor,
	FluidRow,
	LIST_PADDING,
	ListFrame,
	ListHighlight,
	PlainRow,
	ROW_GAP,
	ROW_HEIGHT,
} from './parts';
import { FLUID_HOVER_CODE } from './snippets';

export const ROWS = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash'];

// The cursor turns around 2px inside the padding at both ends, so it spends a beat above the first row and below the last.
const CURSOR_X = 120;
const CURSOR_TOP = 2;
const CURSOR_BOTTOM =
	LIST_PADDING * 2 + ROWS.length * ROW_HEIGHT + (ROWS.length - 1) * ROW_GAP - 2;
/** One pass is three round trips, each faster than the last: reading speed, pointing speed, then a flick. Seconds per leg. */
const LEG_SECONDS = [2, 2, 0.8, 0.8, 0.3, 0.3];
const PASS_S = LEG_SECONDS.reduce((sum, leg) => sum + leg, 0);

/** The source's keyframes: the y the cursor is at when each leg starts, and ends. `CURSOR_TIMES` is the share of the pass each is reached at. */
const CURSOR_KEYFRAMES = LEG_SECONDS.map((_leg, index) =>
	index % 2 === 0 ? CURSOR_TOP : CURSOR_BOTTOM,
).concat(CURSOR_TOP);
const CURSOR_TIMES = LEG_SECONDS.map(
	(_leg, index) =>
		LEG_SECONDS.slice(0, index).reduce((sum, leg) => sum + leg, 0) / PASS_S,
).concat(1);

/** Which row a y (in list coordinates) is inside, or null in a gap or the padding: what plain :hover would report. */
function rowUnder(y: number) {
	if (y < LIST_PADDING) return null;
	const index = Math.floor((y - LIST_PADDING) / (ROW_HEIGHT + ROW_GAP));
	const within = y - LIST_PADDING - index * (ROW_HEIGHT + ROW_GAP) < ROW_HEIGHT;
	return index < ROWS.length && within ? index : null;
}

function Caption(props: { mark: string; children: JSX.Element }) {
	return (
		<text
			style={{
				...siteType.caption,
				color: color.mutedForeground,
				textAlign: 'center',
			}}
		>
			{props.mark} {props.children}
		</text>
	);
}

function Stage(props: { paused: () => boolean }) {
	const scroller = useContext(PageScrollerContext);
	const hover = createFluidHover();
	const [inView, setInView] = createSignal(false);
	// A real pointer inside the demo owns both lists until it leaves.
	const [userInside, setUserInside] = createSignal(false);
	const reduced = createReducedMotion();
	const scripted = () => inView() && !reduced() && !userInside();
	const running = () => scripted() && !props.paused();
	const cursorY = createMotionValue(CURSOR_TOP);
	const [fakeIndex, setFakeIndex] = createSignal<number | null>(null);
	let root: HostElement | undefined;
	let fluid: HostElement | undefined;

	createEffect(() => {
		const rootElement = scroller?.();
		if (rootElement === undefined || root === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => setInView(entries[entries.length - 1].isIntersecting),
			{ root: rootElement, threshold: 0.35 },
		);
		observer.observe(root);
		onCleanup(() => observer.disconnect());
	});

	// Each scripted entry is a fresh session, like a real pointer coming in.
	let wasScripted = false;
	createEffect(() => {
		const now = scripted();
		if (now && !wasScripted) hover.handlers.onMouseEnter();
		if (!now && wasScripted) {
			hover.handlers.onMouseLeave();
			setFakeIndex(null);
		}
		wasScripted = now;
	});

	// The script is one animation, paused and resumed in place so the pause button and a visiting pointer both hold the current frame.
	let controls: AnimationPlaybackControls | undefined;
	createEffect(() => {
		if (!running()) {
			controls?.pause();
			return;
		}
		if (controls !== undefined) {
			controls.play();
			return;
		}
		controls = animate(cursorY, CURSOR_KEYFRAMES, {
			duration: PASS_S,
			times: CURSOR_TIMES,
			ease: 'easeInOut',
			repeat: Infinity,
		});
	});
	onCleanup(() => controls?.stop());

	// Every frame of the cursor: the plain list gets what :hover would say, the fluid list the same point as a real mouse move. The signal is only written when the row under the cursor changes.
	createMotionValueEvent(cursorY, 'change', (y) => {
		if (!scripted()) return;
		setFakeIndex(rowUnder(y));
		if (fluid === undefined || !fluid.mounted) return;
		const box = hover.containerBox();
		hover.handlers.onMouseMove({ x: box.x + CURSOR_X, y: box.y + y });
	});

	const listStyle = {
		position: 'relative',
		display: 'flex',
		flexDirection: 'column',
		gap: ROW_GAP,
		padding: LIST_PADDING,
	} as const;
	const columnStyle = {
		flexGrow: 1,
		flexBasis: 0,
		minWidth: 0,
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: 12,
	} as const;

	return (
		<div
			ref={(element) => {
				root = element;
			}}
			onMouseEnter={() => setUserInside(true)}
			onMouseMove={() => setUserInside(true)}
			onMouseDown={() => setUserInside(true)}
			onMouseLeave={() => setUserInside(false)}
			style={{
				width: '100%',
				maxWidth: 576,
				display: 'flex',
				flexDirection: 'row',
				gap: 20,
			}}
		>
			<div style={columnStyle}>
				<ListFrame>
					<div style={listStyle}>
						<For each={ROWS}>
							{(label, index) => (
								<PlainRow
									testId={`pvf-plain-${index()}`}
									label={label}
									lit={scripted() && fakeIndex() === index()}
								/>
							)}
						</For>
						{scripted() ? (
							<FakeCursor testId="pvf-cursor-plain" x={CURSOR_X} y={cursorY} />
						) : null}
					</div>
				</ListFrame>
				<Caption mark="❌">
					Plain <Code variant="prose">:hover</Code> blinks at every gap
				</Caption>
			</div>
			<div style={columnStyle}>
				<ListFrame>
					<div
						ref={(element) => {
							fluid = element;
							hover.containerRef(element);
						}}
						onMouseEnter={hover.handlers.onMouseEnter}
						onMouseMove={hover.handlers.onMouseMove}
						onMouseLeave={hover.handlers.onMouseLeave}
						style={listStyle}
					>
						<ListHighlight hover={hover} />
						<For each={ROWS}>
							{(label, index) => (
								<FluidRow
									testId={`pvf-fluid-${index()}`}
									hover={hover}
									index={index()}
									label={label}
								/>
							)}
						</For>
						{scripted() ? (
							<FakeCursor testId="pvf-cursor-fluid" x={CURSOR_X} y={cursorY} />
						) : null}
					</div>
				</ListFrame>
				<Caption mark="✅">Fluid hover glides, one pass, one target</Caption>
			</div>
		</div>
	);
}

/** The comparison alone, for a host with its own frame; it plays while the host's `PreviewPlaybackContext` says so. */
export function PlainVsFluidPreview() {
	const playing = usePreviewPlayback();
	return <Stage paused={() => !playing()} />;
}

/** The comparison's frame: the pause button in the preview header holds the cursors on any frame. */
export function PlainVsFluidDemo() {
	const [paused, setPaused] = createSignal(false);
	return (
		<ComponentPreview
			testId="plain-vs-fluid-preview"
			code={FLUID_HOVER_CODE}
			playback={{
				icon: paused() ? PLAY_ICON : PAUSE_ICON,
				tooltip: paused() ? 'Play' : 'Pause',
				testId: 'plain-vs-fluid-playback',
				onClick: () => setPaused(!paused()),
			}}
		>
			<Stage paused={paused} />
		</ComponentPreview>
	);
}
