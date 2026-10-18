import {
	buttonProps,
	type HostElement,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import { createSignal, For } from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover, useHoverItem } from '#/lib/fluid-hover';
import { CheckMark, Icon, LIST_CHECK } from '#/lib/icon';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	focusRing,
	shape,
	siteType,
	motion as tween,
} from '#/lib/theme';
import {
	Compare,
	clickStep,
	createLoop,
	createPlayback,
	createScriptCursor,
	glideStep,
	type LoopStep,
	type Side,
	turns,
} from './playback';

// The same menu twice. Left is what an agent writes on its own: a per-row
// hover that snaps on and off, a selected background that jumps, and a bold
// label that pushes its count. Right is what it writes with the skill: fluid
// hover, a selection that springs to the picked row, and a weight change that
// moves nothing.

const ROWS = [
	{ label: 'Inbox', count: 12 },
	{ label: 'Drafts', count: 3 },
	{ label: 'Sent', count: 48 },
	{ label: 'Archive', count: 210 },
	{ label: 'Trash', count: 7 },
];

/** Rows are 36px stacked with no gap inside 8px of padding, the same on both sides so the only difference is behavior. */
const ROW_H = 36;
const LIST_PAD = 8;
const rowTop = (index: number) => LIST_PAD + index * ROW_H;

/** One turn: glide to a row, sometimes click it. The generic side plays it, then the skill side plays the same turn. */
const TURN: { row: number; click?: boolean }[] = [
	{ row: 3, click: true },
	{ row: 0, click: true },
	{ row: 4 },
	{ row: 1, click: true },
];
const HOLD_MS = 600;

const rowStyle = {
	display: 'flex',
	flexDirection: 'row',
	alignItems: 'center',
	flexShrink: 0,
	gap: 8,
	width: '100%',
	height: ROW_H,
	paddingLeft: 12,
	paddingRight: 12,
	cursor: 'pointer',
	keyboardFocusDim: false,
} as const;

function Count(props: { n: number }) {
	return (
		<text
			style={{
				...siteType.caption,
				color: color.mutedForeground,
				fontVariantNumeric: 'tabular-nums',
			}}
		>
			{props.n}
		</text>
	);
}

/** Generic: a hover per row with no transition, bold that widens the label, and a selected background that jumps. */
function GenericList(props: {
	selected: number;
	onSelect: (index: number) => void;
}) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal<number>();
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				padding: LIST_PAD,
			}}
		>
			<For each={ROWS}>
				{(row, index) => (
					<div
						{...buttonProps(
							{ onClick: () => props.onSelect(index()) },
							renderer,
						)}
						testId={`menu-generic-row-${index()}`}
						onMouseEnter={() => setHovered(index())}
						onMouseLeave={() => setHovered(undefined)}
						style={{
							...rowStyle,
							borderRadius: shape.item,
							// Hover louder than the selection: the cursor, not the pick, is what the eye lands on.
							backgroundColor:
								hovered() === index()
									? color.selected
									: props.selected === index()
										? color.selectedWash
										: color.transparent,
							focusVisible: focusRing(0),
						}}
					>
						<text
							style={{
								...siteType.body,
								// The generic version, bold on purpose to show the reflow.
								fontWeight: props.selected === index() ? 700 : 400,
								color: color.foreground,
								whiteSpace: 'nowrap',
							}}
						>
							{row.label}
						</text>
						<Count n={row.count} />
						{/* Static check: pops in and out with the selection. */}
						<div style={{ marginLeft: 'auto', width: 16, height: 16 }}>
							{props.selected === index() && (
								<Icon
									name="check"
									size={16}
									strokeWidth={2}
									color={color.foreground}
								/>
							)}
						</div>
					</div>
				)}
			</For>
		</div>
	);
}

function FluidRow(props: {
	hover: ReturnType<typeof createFluidHover>;
	index: number;
	selected: boolean;
	onSelect: (index: number) => void;
	label: string;
	count: number;
}) {
	const renderer = useGpuixRequired();
	const [element, setElement] = createSignal<HostElement>();
	useHoverItem(props.hover, () => props.index, element);
	return (
		<div
			ref={setElement}
			{...buttonProps({ onClick: () => props.onSelect(props.index) }, renderer)}
			testId={`menu-skill-row-${props.index}`}
			style={{
				...rowStyle,
				borderRadius: shape.item,
				focusVisible: focusRing(0),
			}}
		>
			{/* The hidden semibold copy inside StableLabel holds the width, so the count never moves when the label gets heavier. */}
			<StableLabel
				text={props.label}
				heavy={props.selected}
				color={color.foreground}
			/>
			<Count n={props.count} />
			<div style={{ marginLeft: 'auto' }}>
				<CheckMark
					checked={props.selected}
					size={16}
					strokeWidth={2}
					color={color.foreground}
					path={LIST_CHECK}
				/>
			</div>
		</div>
	);
}

/** With the skill: one fluid highlight, a selected background that springs on the moderate tier, and weight without reflow. */
function SkillList(props: {
	selected: number;
	onSelect: (index: number) => void;
}) {
	const hover = createFluidHover();
	const rect = () => {
		const index = hover.activeIndex();
		return hover.isMeasured() && index !== null
			? (hover.rects()[index] ?? null)
			: null;
	};
	return (
		<div
			ref={hover.containerRef}
			onMouseEnter={hover.handlers.onMouseEnter}
			onMouseMove={hover.handlers.onMouseMove}
			onMouseLeave={hover.handlers.onMouseLeave}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				padding: LIST_PAD,
			}}
		>
			<motion.div
				initial={false}
				animate={{ top: rowTop(props.selected) }}
				transition={tween.moderate}
				style={{
					position: 'absolute',
					left: LIST_PAD,
					right: LIST_PAD,
					height: ROW_H,
					borderRadius: shape.bg,
					backgroundColor: color.selectedWash,
					pointerEvents: 'none',
				}}
			/>
			<FluidHighlight
				rect={rect}
				session={hover.session}
				radius={shape.bg}
				background={color.hover}
			/>
			<For each={ROWS}>
				{(row, index) => (
					<FluidRow
						hover={hover}
						index={index()}
						selected={props.selected === index()}
						onSelect={props.onSelect}
						label={row.label}
						count={row.count}
					/>
				)}
			</For>
		</div>
	);
}

export function MenuExample() {
	const playback = createPlayback();
	const cursor = createScriptCursor(playback);
	const [generic, setGeneric] = createSignal(0);
	const [skill, setSkill] = createSignal(0);
	const [active, setActive] = createSignal<Side | null>(null);
	const select = (side: Side) => (side === 'generic' ? setGeneric : setSkill);
	const row = (side: Side, index: number) => `menu-${side}-row-${index}`;
	createLoop(
		playback.playing,
		turns(setActive, (side) =>
			TURN.flatMap((step): LoopStep[] =>
				step.click === true
					? clickStep(
							cursor,
							row(side, step.row),
							() => select(side)(step.row),
							HOLD_MS,
						)
					: [glideStep(cursor, row(side, step.row), HOLD_MS)],
			),
		),
	);

	return (
		<Compare
			playback={playback}
			cursor={cursor}
			bare
			active={playback.playing() ? active() : null}
			generic={<GenericList selected={generic()} onSelect={setGeneric} />}
			skill={<SkillList selected={skill()} onSelect={setSkill} />}
		/>
	);
}
