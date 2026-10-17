import { For } from 'solid-js';
import { weight, withAlpha } from '#/lib/theme';
import { sc } from './theme';

/**
 * `components/shadcn/table.tsx` with the preview's cell overrides (`px-3 py-2`): a `relative w-full overflow-auto`
 * wrapper around a `w-full text-sm` collapsed-border table, whose columns size to their widest cell as in a browser.
 */
export function ScTable(props: {
	columns: readonly string[];
	rows: readonly (readonly string[])[];
	testId?: string;
}) {
	const cell = (text: string, header: boolean) => (
		<div
			role={header ? 'columnheader' : 'cell'}
			style={{
				display: 'table-cell',
				verticalAlign: 'middle',
				textAlign: 'left',
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<text
				style={{
					fontSize: 14,
					lineHeight: '20px',
					fontWeight: header ? weight.medium : weight.normal,
					color: header ? sc.mutedForeground : sc.foreground,
					whiteSpace: 'nowrap',
				}}
			>
				{text}
			</text>
		</div>
	);

	const ruled = {
		borderBottomStyle: 'solid',
		borderBottomWidth: 1,
		borderBottomColor: sc.border,
	} as const;

	return (
		<div style={{ position: 'relative', width: '100%', overflow: 'auto' }}>
			<div
				role="table"
				testId={props.testId}
				style={{
					display: 'table',
					borderCollapse: 'collapse',
					width: '100%',
				}}
			>
				<div style={{ display: 'table-header-group' }}>
					<div role="row" style={{ display: 'table-row', ...ruled }}>
						<For each={props.columns}>{(column) => cell(column, true)}</For>
					</div>
				</div>
				<div style={{ display: 'table-row-group' }}>
					<For each={props.rows}>
						{(row, rowIndex) => (
							<div
								role="row"
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-row-${rowIndex()}`
								}
								style={{
									display: 'table-row',
									...(rowIndex() === props.rows.length - 1 ? {} : ruled),
									transitionProperty: 'background-color',
									transitionDuration: '150ms',
									transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
									hover: { backgroundColor: withAlpha(sc.muted, 0.5) },
								}}
							>
								<For each={row}>{(text) => cell(text, false)}</For>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);
}
