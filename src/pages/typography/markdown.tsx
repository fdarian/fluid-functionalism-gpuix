import { type Accessor, createSignal, For, type JSX, Show } from 'solid-js';
import { MONO } from '#/lib/doc-page';
import { color, shape, sizeChoice, weight, withAlpha } from '#/lib/theme';
import {
	roleStyle,
	space,
	TYPESET_CHECK,
	TYPESET_SUB_INDENT,
	type TypeRole,
} from './step';

const NBSP = '\u00a0';
/** The tick of lib/typeset/generate.ts, in a 24px grid. */
const TICK_PATH = 'M6 12L10 16L18 8';

// ---- Inline runs ----------------------------------------------------------

function Strong(props: { children: JSX.Element }) {
	return <span style={{ fontWeight: weight.semibold }}>{props.children}</span>;
}

function Em(props: { children: JSX.Element }) {
	return <span style={{ fontStyle: 'italic' }}>{props.children}</span>;
}

function Strike(props: { children: JSX.Element }) {
	return (
		<span style={{ textDecoration: 'line-through' }}>{props.children}</span>
	);
}

/** `:not(pre) > code`: foreground, a 7% wash, `padding: 0.1em 0.3em`. An inline run takes no padding, so the 0.3em is a no-break space and the size stays the paragraph's. */
function Code(props: { children: string }) {
	return (
		<span
			style={{
				fontFamily: MONO,
				color: color.foreground,
				backgroundColor: withAlpha(color.foreground, 0.07),
			}}
		>
			{NBSP}
			{props.children}
			{NBSP}
		</span>
	);
}

/** `a`: foreground, underlined at 35%. A run takes no events, so it does not navigate. */
function Link(props: { children: string }) {
	return (
		<span
			style={{
				color: color.foreground,
				textDecoration: 'underline',
				textDecorationColor: withAlpha(color.foreground, 0.35),
			}}
		>
			{props.children}
		</span>
	);
}

// ---- Blocks ---------------------------------------------------------------

type Kind =
	| 'h1'
	| 'h2'
	| 'h3'
	| 'p'
	| 'list'
	| 'quote'
	| 'table'
	| 'pre'
	| 'hr';

function Paragraph(props: { children: JSX.Element }) {
	return (
		<text style={{ ...roleStyle('body'), color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

function Heading(props: { role: TypeRole; bold?: boolean; children: string }) {
	return (
		<text
			style={{
				...roleStyle(props.role),
				fontWeight: props.bold === true ? 700 : weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** The `.typeset` margin above a block, from what comes before it. Later rules win, as in the sheet: block, h1 / h2, h3, after a heading, a rule on both sides. */
function marginAbove(previous: Kind | undefined, kind: Kind): number {
	if (previous === undefined) return 0;
	if (kind === 'hr' || previous === 'hr') return space('rule');
	if (previous === 'h1' || previous === 'h2' || previous === 'h3') {
		return space('heading');
	}
	if (kind === 'h1' || kind === 'h2') return space('section');
	if (kind === 'h3') return space('subsection');
	return space('block');
}

// ---- Lists ----------------------------------------------------------------

interface Node {
	text: string;
	children?: readonly Node[];
}

/** A list item's text starts here, in the list's own box: `indent` for the first level, the sub-indent in a sub-list. */
function textStart(depth: number) {
	if (depth > 0) return TYPESET_SUB_INDENT[sizeChoice()];
	return TYPESET_CHECK.box[sizeChoice()] + TYPESET_CHECK.gap[sizeChoice()];
}

function alpha(n: number) {
	return String.fromCharCode(96 + n);
}

function roman(n: number) {
	const numerals: readonly (readonly [number, string])[] = [
		[10, 'x'],
		[9, 'ix'],
		[5, 'v'],
		[4, 'iv'],
		[1, 'i'],
	];
	let rest = n;
	let out = '';
	for (const [value, symbol] of numerals) {
		while (rest >= value) {
			out += symbol;
			rest -= value;
		}
	}
	return out;
}

/** `ol` outlines 1. then a. then i., and the cycle repeats. */
function orderedMarker(depth: number, index: number) {
	const n = index + 1;
	const kind = depth % 3;
	if (kind === 0) return `${n}.`;
	return `${kind === 1 ? alpha(n) : roman(n)}.`;
}

function Marker(props: {
	ordered: boolean;
	depth: number;
	index: number;
	start: number;
}) {
	const lineHeight = () => roleStyle('body').lineHeight;
	return (
		<Show
			when={props.ordered}
			fallback={
				<div
					style={{
						position: 'absolute',
						left: props.start - 15,
						top: (lineHeight() - 5) / 2,
						width: 5,
						height: 5,
						borderRadius: 2.5,
						// `ul ul` is a circle: an outline, not a fill.
						...(props.depth > 0
							? { borderWidth: 1, borderColor: color.mutedForeground }
							: { backgroundColor: color.mutedForeground }),
					}}
				/>
			}
		>
			<text
				style={{
					...roleStyle('body'),
					position: 'absolute',
					left: props.start - 38,
					width: 30,
					textAlign: 'right',
					fontVariantNumeric: 'tabular-nums',
					color: color.mutedForeground,
				}}
			>
				{orderedMarker(props.depth, props.index)}
			</text>
		</Show>
	);
}

function List(props: {
	ordered: boolean;
	items: readonly Node[];
	depth: number;
}) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<For each={props.items}>
				{(item, index) => (
					<div
						style={{
							position: 'relative',
							paddingLeft: textStart(props.depth),
							marginTop: index() === 0 ? 0 : space('item'),
						}}
					>
						<Marker
							ordered={props.ordered}
							depth={props.depth}
							index={index()}
							start={textStart(props.depth)}
						/>
						<Paragraph>{item.text}</Paragraph>
						<Show when={item.children}>
							{(children: Accessor<readonly Node[]>) => (
								<div style={{ marginTop: space('item') }}>
									<List
										ordered={props.ordered}
										items={children()}
										depth={props.depth + 1}
									/>
								</div>
							)}
						</Show>
					</div>
				)}
			</For>
		</div>
	);
}

interface Task {
	text: string;
	done: boolean;
	children?: readonly Task[];
}

/** The library's checkbox, as the sheet draws it: an outline that steps aside for the tick alone when checked, never a filled box. Hovered, the outline darkens, and on a checked box it comes back around the tick. */
function Checkbox(props: {
	testId: string;
	checked: boolean;
	onToggle: () => void;
}) {
	const [hovered, setHovered] = createSignal(false);
	const box = () => TYPESET_CHECK.box[sizeChoice()];
	const inner = () => box() - 3;
	const tick = () => box() + 2;
	return (
		<div
			testId={props.testId}
			role="checkbox"
			aria-checked={props.checked}
			onClick={props.onToggle}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: 'relative',
				flexShrink: 0,
				width: box(),
				height: box(),
				borderWidth: 1.5,
				borderRadius: TYPESET_CHECK.radius[sizeChoice()],
				borderColor: hovered()
					? withAlpha(color.foreground, 0.4)
					: props.checked
						? color.transparent
						: color.border,
				cursor: 'pointer',
				transitionProperty: 'border-color',
				transitionDuration: '80ms',
				transitionTimingFunction: 'ease-out',
			}}
		>
			<Show when={props.checked}>
				<svg
					viewBox="0 0 24 24"
					style={{
						position: 'absolute',
						left: (inner() - tick()) / 2,
						top: (inner() - tick()) / 2,
						width: tick(),
						height: tick(),
						color: color.foreground,
					}}
				>
					<path
						d={TICK_PATH}
						fill="none"
						stroke="currentColor"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</Show>
		</div>
	);
}

function TaskItem(props: { task: Task; first: boolean }) {
	const [done, setDone] = createSignal(props.task.done);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-start',
				columnGap: TYPESET_CHECK.gap[sizeChoice()],
				marginTop: props.first ? 0 : space('item'),
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					flexShrink: 0,
					height: roleStyle('body').lineHeight,
				}}
			>
				<Checkbox
					testId={`task-${props.task.text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
					checked={done()}
					onToggle={() => setDone(!done())}
				/>
			</div>
			<div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
				{/* A checked item strikes its own text; its sub-tasks keep their own state. */}
				<text
					style={{
						...roleStyle('body'),
						color: color.mutedForeground,
						textDecoration: done() ? 'line-through' : 'none',
					}}
				>
					{props.task.text}
				</text>
				<Show when={props.task.children}>
					{(children: Accessor<readonly Task[]>) => (
						<div
							style={{
								marginTop: space('item'),
								marginLeft: TYPESET_SUB_INDENT[sizeChoice()] - textStart(0),
							}}
						>
							<TaskList tasks={children()} />
						</div>
					)}
				</Show>
			</div>
		</div>
	);
}

function TaskList(props: { tasks: readonly Task[] }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<For each={props.tasks}>
				{(task, index) => <TaskItem task={task} first={index() === 0} />}
			</For>
		</div>
	);
}

// ---- Quote, table, code, rule ----------------------------------------------

function Quote(props: { children: string }) {
	return (
		<div
			style={{
				paddingLeft: roleStyle('body').fontSize,
				borderLeftWidth: 2,
				borderColor: color.border,
			}}
		>
			<Paragraph>{props.children}</Paragraph>
		</div>
	);
}

const TABLE: readonly (readonly string[])[] = [
	['Speed', 'Duration', 'Used for'],
	['fast', '0.08s', 'Hover, tooltips, focus rings'],
	['moderate', '0.16s', 'Dropdowns and tabs'],
	['slow', '0.24s', 'Dialogs and drawers'],
];

/** Column widths follow the longest cell, as an auto-layout table's do. */
const TABLE_COLUMNS = TABLE[0].map((_, column) =>
	Math.max(...TABLE.map((row) => row[column].length)),
);

function Table() {
	const columns = TABLE_COLUMNS.map(
		(length) => `minmax(max-content, ${length}fr)`,
	).join(' ');
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: columns,
				fontVariantNumeric: 'tabular-nums',
			}}
		>
			<For each={TABLE}>
				{(row, rowIndex) => (
					<For each={row}>
						{(cell, column) => (
							<text
								style={{
									...roleStyle('body'),
									textAlign: 'left',
									paddingTop: roleStyle('body').fontSize * 0.5,
									paddingBottom: roleStyle('body').fontSize * 0.5,
									paddingLeft:
										column() === 0 ? 0 : roleStyle('body').fontSize * 0.75,
									paddingRight: roleStyle('body').fontSize * 0.75,
									borderBottomWidth: 1,
									borderColor: color.border,
									...(rowIndex() === 0
										? { fontWeight: weight.semibold, color: color.foreground }
										: { color: color.mutedForeground }),
								}}
							>
								{cell}
							</text>
						)}
					</For>
				)}
			</For>
		</div>
	);
}

const CODE = [
	'# One component',
	'npx shadcn@latest add https://www.fluidfunctionalism.com/r/dropdown.json',
	'',
	'# The skill for your coding agent',
	'npx skills add mickadesign/fluid-functionalism',
];

/** `pre`: caption size, a 7% wash, 8px corners, `padding: 0.75em 1em`, scrolling sideways. */
function CodeBlock() {
	const size = () => roleStyle('caption');
	return (
		<div
			style={{
				overflowX: 'auto',
				borderRadius: 8,
				backgroundColor: withAlpha(color.foreground, 0.07),
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flexShrink: 0,
					paddingTop: size().fontSize * 0.75,
					paddingBottom: size().fontSize * 0.75,
					paddingLeft: size().fontSize,
					paddingRight: size().fontSize,
				}}
			>
				<For each={CODE}>
					{(line) => (
						<text
							style={{
								...size(),
								fontFamily: MONO,
								color: color.foreground,
								whiteSpace: 'pre',
							}}
						>
							{line === '' ? ' ' : line}
						</text>
					)}
				</For>
			</div>
		</div>
	);
}

function Rule() {
	return <div style={{ height: 1, backgroundColor: color.border }} />;
}

// ---- The sample --------------------------------------------------------------

const TASKS: readonly Task[] = [
	{ text: 'Install the type scale and the markdown styles', done: true },
	{ text: 'Add a dropdown and a dialog', done: true },
	{
		text: 'Move every list to fluid hover',
		done: false,
		children: [
			{ text: 'Sidebar', done: true },
			{ text: 'Command menu', done: false },
		],
	},
	{ text: 'Switch dense screens to compact', done: false },
];

const BULLETS: readonly Node[] = [
	{
		text: 'Components in 2 flavors',
		children: [{ text: 'Radix' }, { text: 'Base UI' }],
	},
	{ text: 'A size ladder of 36px and 28px rows' },
	{ text: 'A skill for your coding agent' },
];

const STEPS: readonly Node[] = [
	{ text: 'Read the craft notes for each component' },
	{
		text: 'Install the skill',
		children: [
			{ text: 'Let it read your stack' },
			{ text: 'Fix what it flags' },
		],
	},
	{ text: 'Ship it' },
];

interface Block {
	kind: Kind;
	node: () => JSX.Element;
}

/** `MARKDOWN_SAMPLE` of lib/docs/typeset-sample.tsx, block by block. */
const BLOCKS: readonly Block[] = [
	{
		kind: 'h1',
		node: () => (
			<Heading role="display" bold>
				Getting started with Fluid Functionalism
			</Heading>
		),
	},
	{
		kind: 'p',
		node: () => (
			<Paragraph>
				<Strong>Flavors</Strong> Radix and Base UI · <Strong>Stack</Strong>{' '}
				React and Tailwind v4 · <Strong>License</Strong> MIT
			</Paragraph>
		),
	},
	{ kind: 'h2', node: () => <Heading role="title">Setup</Heading> },
	{ kind: 'list', node: () => <TaskList tasks={TASKS} /> },
	{ kind: 'h2', node: () => <Heading role="title">How it moves</Heading> },
	{
		kind: 'p',
		node: () => (
			<Paragraph>
				Every component animates with <Strong>3 spring speeds</Strong>, and
				hover <Em>glides</Em> to the item under your cursor instead of blinking.
				A label turns <Code>semibold</Code> without moving its neighbors, since{' '}
				<Code>fontWeights</Code> pairs each weight with an optical size. The{' '}
				<Link>motion page</Link> has every value.
			</Paragraph>
		),
	},
	{
		kind: 'quote',
		node: () => (
			<Quote>
				No component invents its own timing, so everything moves at the same
				pace.
			</Quote>
		),
	},
	{ kind: 'h3', node: () => <Heading role="subtitle">What you get</Heading> },
	{
		kind: 'list',
		node: () => <List ordered={false} items={BULLETS} depth={0} />,
	},
	{ kind: 'h3', node: () => <Heading role="subtitle">Spring speeds</Heading> },
	{ kind: 'table', node: () => <Table /> },
	{ kind: 'h2', node: () => <Heading role="title">Install</Heading> },
	{
		kind: 'p',
		node: () => (
			<Paragraph>
				Each piece installs with the shadcn CLI. We planned to{' '}
				<Strike>ship one big bundle</Strike> ship one item per component, so you
				only add what you use:
			</Paragraph>
		),
	},
	{ kind: 'pre', node: () => <CodeBlock /> },
	{ kind: 'h3', node: () => <Heading role="subtitle">Next steps</Heading> },
	{ kind: 'list', node: () => <List ordered items={STEPS} depth={0} /> },
	{ kind: 'hr', node: () => <Rule /> },
	{
		kind: 'p',
		node: () => (
			<Paragraph>
				Found a bug? Open an issue on <Strong>GitHub</Strong>.
			</Paragraph>
		),
	},
];

/**
 * The Markdown section's document, set in the `.typeset` sheet's styles. The
 * source is a Tiptap editor on that sheet; gpuix has no rich-text editing
 * primitive, so this is the same sample as static styled content, with the
 * to-dos still checkable (drift/typography.md).
 */
export function TypesetSample() {
	return (
		<div
			testId="markdown-sample"
			style={{
				display: 'flex',
				flexDirection: 'column',
				borderWidth: 1,
				borderColor: color.borderFaint,
				borderRadius: shape.container,
				overflow: 'hidden',
				backgroundColor: color.background,
				transitionProperty: 'border-color',
				transitionDuration: '150ms',
				transitionTimingFunction: 'ease-out',
				focusWithin: { borderColor: withAlpha(color.foreground, 0.4) },
			}}
		>
			<div style={{ padding: 32, display: 'flex', flexDirection: 'column' }}>
				<For each={BLOCKS}>
					{(block, index) => (
						<div
							style={{
								marginTop: marginAbove(BLOCKS[index() - 1]?.kind, block.kind),
							}}
						>
							{block.node()}
						</div>
					)}
				</For>
			</div>
		</div>
	);
}
