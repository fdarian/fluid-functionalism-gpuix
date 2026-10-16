import { For } from "solid-js";
import { weight, withAlpha } from "#/lib/theme";
import { sc } from "./theme";

/** Inter at 14px averages about this per character; the cell padding is 12 each side. */
const CHAR_WIDTH = 7.4;
const CELL_PAD = 24;

/**
 * `components/shadcn/table.tsx` with the preview's cell overrides (`px-3 py-2`). A browser's auto table layout
 * shares the row's width out in proportion to each column's longest cell; gpuix has no table layout, so the
 * columns grow in that proportion, estimated from the text lengths.
 */
export function ScTable(props: {
	columns: readonly string[];
	rows: readonly (readonly string[])[];
	testId?: string;
}) {
	const grow = (column: number) =>
		Math.max(
			...[props.columns, ...props.rows].map((cells) => {
				const cell = cells[column];
				if (cell === undefined) throw new Error(`No cell in column ${column}`);
				return cell.length;
			}),
		) *
			CHAR_WIDTH +
		CELL_PAD;

	const cell = (text: string, column: number, header: boolean) => (
		<div
			style={{
				flexBasis: 0,
				flexGrow: grow(column),
				minWidth: 0,
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 8,
				paddingBottom: 8,
			}}
		>
			<text
				style={{
					fontSize: 14,
					lineHeight: 20,
					fontWeight: header ? weight.medium : weight.normal,
					color: header ? sc.mutedForeground : sc.foreground,
					whiteSpace: "nowrap",
				}}
			>
				{text}
			</text>
		</div>
	);

	return (
		<div
			role="table"
			testId={props.testId}
			style={{ display: "flex", flexDirection: "column", width: "100%" }}
		>
			<div
				role="row"
				style={{
					display: "flex",
					flexDirection: "row",
					borderBottomWidth: 1,
					borderColor: sc.border,
				}}
			>
				<For each={props.columns}>
					{(column, index) => cell(column, index(), true)}
				</For>
			</div>
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
							display: "flex",
							flexDirection: "row",
							borderBottomWidth: rowIndex() === props.rows.length - 1 ? 0 : 1,
							borderColor: sc.border,
							transitionProperty: "background-color",
							transitionDuration: "150ms",
							transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
							hover: { backgroundColor: withAlpha(sc.muted, 0.5) },
						}}
					>
						<For each={row}>{(text, index) => cell(text, index(), false)}</For>
					</div>
				)}
			</For>
		</div>
	);
}
