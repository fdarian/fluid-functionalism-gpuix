import { For, type JSX } from 'solid-js';
import { ScrollArea } from '#/components/scroll-area';
import { MONO } from '#/lib/doc-page';
import { color, type SizeChoice, scheme, siteType, weight } from '#/lib/theme';
import { LADDER } from './ladder';

interface TokenRow {
	token: string;
	applies: string;
	value: (step: SizeChoice) => string;
}

const px = (value: number) => `${value}px`;

const TOKEN_ROWS: readonly TokenRow[] = [
	{
		token: 'control',
		applies:
			'Controls and rows — shared so menu rows line up with their trigger',
		value: (step) => px(LADDER[step].control),
	},
	{
		token: 'segmentItem + segmentPad',
		applies: 'Segmented tabs inside their padded list',
		value: (step) =>
			`${px(LADDER[step].segmentItem)} + ${px(LADDER[step].segmentPad)} = ${px(LADDER[step].control)}`,
	},
	{
		token: 'text',
		applies: 'Labels inside controls (the body role)',
		value: (step) =>
			`${LADDER[step].text.fontSize}px / ${LADDER[step].text.lineHeight}`,
	},
	{
		token: 'field',
		applies:
			'Text in editable fields: the body role. A desktop window has no touch step to 16px',
		value: (step) =>
			`${LADDER[step].text.fontSize}px / ${LADDER[step].text.lineHeight}`,
	},
	{
		token: 'icon',
		applies: 'Leading/trailing icons, checkbox square, radio circle',
		value: (step) => px(LADDER[step].icon),
	},
	{
		token: 'px / itemPx',
		applies: 'Control / row horizontal padding',
		value: (step) => `${px(LADDER[step].px)} / ${px(LADDER[step].itemPx)}`,
	},
	{
		token: 'gap',
		applies: 'Icon-to-label and control-to-control gap',
		value: (step) => px(LADDER[step].gap),
	},
];

/** `th` / `td`: `px-3 py-2`, the first column flush left. */
function Cell(props: { first?: boolean; rule: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'table-cell',
				verticalAlign: 'middle',
				paddingTop: 8,
				paddingBottom: 8,
				paddingLeft: props.first === true ? 0 : 12,
				paddingRight: 12,
				borderBottomStyle: 'solid',
				borderBottomWidth: 1,
				borderBottomColor: props.rule,
			}}
		>
			{props.children}
		</div>
	);
}

function HeadText(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.body,
				textAlign: 'left',
				fontVariationSettings: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** `code` chip: `rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption`. */
function TokenChip(props: { children: string }) {
	return (
		<div
			style={{
				width: 'fit-content',
				paddingLeft: 4,
				paddingRight: 4,
				paddingTop: 2,
				paddingBottom: 2,
				borderRadius: 4,
				backgroundColor: scheme() === 'light' ? '#EBEBED' : '#2C2C2C',
			}}
		>
			<text
				style={{
					fontFamily: MONO,
					...siteType.caption,
					color: color.foreground,
					whiteSpace: 'nowrap',
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

export function TokenTable() {
	return (
		<ScrollArea orientation="horizontal" fade width="100%">
			<div
				testId="token-table"
				style={{
					display: 'table',
					borderCollapse: 'collapse',
					width: '100%',
					minWidth: 560,
				}}
			>
				<div style={{ display: 'table-header-group' }}>
					<div style={{ display: 'table-row' }}>
						<For each={['Token', 'Applies to', 'Default', 'Compact']}>
							{(label, index) => (
								<Cell first={index() === 0} rule={color.border}>
									<HeadText>{label}</HeadText>
								</Cell>
							)}
						</For>
					</div>
				</div>
				<div style={{ display: 'table-row-group' }}>
					<For each={TOKEN_ROWS}>
						{(row) => (
							<div style={{ display: 'table-row' }}>
								<Cell first rule={color.borderFaint}>
									<TokenChip>{row.token}</TokenChip>
								</Cell>
								<Cell rule={color.borderFaint}>
									<text
										style={{
											...siteType.body,
											textAlign: 'left',
											color: color.mutedForeground,
										}}
									>
										{row.applies}
									</text>
								</Cell>
								<For each={['default', 'compact'] as const}>
									{(step) => (
										<Cell rule={color.borderFaint}>
											<text
												style={{
													...siteType.body,
													textAlign: 'left',
													color: color.foreground,
													whiteSpace: 'nowrap',
												}}
											>
												{row.value(step)}
											</text>
										</Cell>
									)}
								</For>
							</div>
						)}
					</For>
				</div>
			</div>
		</ScrollArea>
	);
}
