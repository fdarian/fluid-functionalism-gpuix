import { For } from 'solid-js';
import { MONO } from '#/lib/doc-page';
import { color, shape, siteType, weight } from '#/lib/theme';
import { borderFainter, roleStyle, TYPESET_SPACE, type TypeRole } from './step';

/** The axes `fontWeights` sets (lib/font-weight.ts); the port renders the static cut nearest each wght. */
const AXES = {
	normal: { wght: 400, opsz: 14, cut: weight.normal },
	semibold: { wght: 550, opsz: 18, cut: weight.semibold },
	bold: { wght: 700, opsz: 25, cut: 700 },
} as const;

/** The 5 styles the page counts, each with the sample it sets, its weight and its colour. */
const SPEC: readonly {
	role: TypeRole;
	name: string;
	sample: string;
	weight: keyof typeof AXES;
	muted: boolean;
}[] = [
	{
		role: 'display',
		name: 'Display',
		sample: 'Page titles',
		weight: 'bold',
		muted: false,
	},
	{
		role: 'title',
		name: 'Title',
		sample: 'Section titles',
		weight: 'semibold',
		muted: false,
	},
	{
		role: 'subtitle',
		name: 'Subtitle',
		sample: 'Sub-headings and card titles',
		weight: 'semibold',
		muted: false,
	},
	{
		role: 'body',
		name: 'Body',
		sample: 'Labels, menu items, and paragraphs',
		weight: 'normal',
		muted: true,
	},
	{
		role: 'caption',
		name: 'Caption',
		sample: 'Descriptions and meta rows',
		weight: 'normal',
		muted: true,
	},
];

const COLUMNS = '80px minmax(0, 1fr) 64px 72px 56px';

const row = {
	display: 'grid',
	gridTemplateColumns: COLUMNS,
	columnGap: 16,
	alignItems: 'center',
	paddingLeft: 20,
	paddingRight: 20,
} as const;

function Mono(props: { children: string; muted?: boolean }) {
	return (
		<text
			style={{
				...roleStyle('caption'),
				fontFamily: MONO,
				fontVariantNumeric: 'tabular-nums',
				color: props.muted === true ? color.mutedForeground : color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** The 5 styles as a spec sheet: the name, a live sample, and the font size, line height and weight with its optical size, at the page's step. */
export function TypeScaleSpecimen() {
	return (
		<div
			testId="type-scale"
			style={{
				overflowX: 'auto',
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: color.borderFaint,
				borderRadius: shape.container,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					flexShrink: 0,
					minWidth: 560,
				}}
			>
				<div
					style={{
						...row,
						paddingTop: 10,
						paddingBottom: 10,
						borderBottomStyle: 'solid',
						borderBottomWidth: 1,
						borderColor: color.borderFaint,
					}}
				>
					<For each={['Style', 'Sample', 'Font size', 'Line height', 'Weight']}>
						{(label) => (
							<text
								style={{ ...siteType.caption, color: color.mutedForeground }}
							>
								{label}
							</text>
						)}
					</For>
				</div>
				<For each={SPEC}>
					{(spec, index) => {
						const axes = AXES[spec.weight];
						return (
							<div
								style={{
									...row,
									paddingTop: 16,
									paddingBottom: 16,
									borderBottomStyle: 'solid',
									borderBottomWidth: index() === SPEC.length - 1 ? 0 : 1,
									borderColor: borderFainter(),
								}}
							>
								<text
									style={{
										...siteType.body,
										fontWeight: weight.semibold,
										color: color.foreground,
									}}
								>
									{spec.name}
								</text>
								<text
									style={{
										...roleStyle(spec.role),
										fontWeight: axes.cut,
										color: spec.muted
											? color.mutedForeground
											: color.foreground,
										whiteSpace: 'nowrap',
										textOverflow: 'ellipsis',
										overflow: 'hidden',
										minWidth: 0,
									}}
								>
									{spec.sample}
								</text>
								<Mono>{`${roleStyle(spec.role).fontSize}px`}</Mono>
								<Mono>{roleStyle(spec.role).lineHeight}</Mono>
								<div style={{ display: 'flex', flexDirection: 'column' }}>
									<Mono>{String(axes.wght)}</Mono>
									<Mono muted>{`opsz ${axes.opsz}`}</Mono>
								</div>
							</div>
						);
					}}
				</For>
			</div>
		</div>
	);
}

/** The sheet's gaps, named by the styles they sit around. A caption takes the same room as the space under a heading. */
const GAPS: readonly (readonly [keyof typeof TYPESET_SPACE, string])[] = [
	['section', 'Above display and title'],
	['subsection', 'Above subtitle'],
	['heading', 'Below display, title, and subtitle'],
	['block', 'Between body blocks'],
	['heading', 'Above caption'],
	['item', 'Between list items'],
	['rule', 'Around a divider'],
];

const cell = {
	paddingLeft: 12,
	paddingRight: 12,
	paddingTop: 8,
	paddingBottom: 8,
} as const;

/** `th` / `td` of the sheet's table: `px-3 py-2 text-left`, the first column flush left. */
function GapCell(props: {
	first: boolean;
	rule: string;
	header?: boolean;
	muted?: boolean;
	children: string;
}) {
	return (
		<div
			style={{
				display: 'table-cell',
				verticalAlign: 'middle',
				...cell,
				...(props.first ? { paddingLeft: 0 } : {}),
				borderBottomStyle: 'solid',
				borderBottomWidth: 1,
				borderBottomColor: props.rule,
			}}
		>
			<text
				style={{
					...siteType.body,
					textAlign: 'left',
					fontVariantNumeric: 'tabular-nums',
					...(props.header === true ? { fontWeight: weight.semibold } : {}),
					color:
						props.muted === true ? color.mutedForeground : color.foreground,
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

/** Read from the sheet's own values, styled like the PropsTable: a `w-full` table whose columns size to their content, the first flush left. */
export function GapTable() {
	return (
		<div
			testId="gap-table"
			style={{
				display: 'table',
				borderCollapse: 'collapse',
				width: '100%',
			}}
		>
			<div style={{ display: 'table-header-group' }}>
				<div style={{ display: 'table-row' }}>
					<For each={['Gap', 'Default', 'Compact']}>
						{(label, index) => (
							<GapCell header first={index() === 0} rule={color.border}>
								{label}
							</GapCell>
						)}
					</For>
				</div>
			</div>
			<div style={{ display: 'table-row-group' }}>
				<For each={GAPS}>
					{(entry) => (
						<div style={{ display: 'table-row' }}>
							<GapCell first muted rule={borderFainter()}>
								{entry[1]}
							</GapCell>
							<GapCell first={false} rule={borderFainter()}>
								{`${TYPESET_SPACE[entry[0]].default}px`}
							</GapCell>
							<GapCell first={false} rule={borderFainter()}>
								{`${TYPESET_SPACE[entry[0]].compact}px`}
							</GapCell>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}
