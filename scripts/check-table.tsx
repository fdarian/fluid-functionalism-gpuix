/**
 * Table layout and fluid hover, measured on layout bounds.
 *
 *   bun scripts/check-table.tsx
 *
 * The table is a real `display: table`: columns size to their widest cell and line up across the header and body
 * rows, the table fills its parent, a cell's `width` sets its column, and the rows are the 36px / 28px ladder
 * plus the 1px rule (37 / 29 as the grid measures them). The hover highlight sits on the row under the pointer, and the header
 * lights the first body row.
 */
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/table';
import { createCheck } from './check-kit';

const ROWS = [
	['Alice', 'Engineer on the platform team', '12'],
	['Bob', 'Designer', '1,204'],
	['Carol', 'Manager', '7'],
];

function Fixture(props: { size: 'default' | 'compact'; id: string }) {
	return (
		<Table size={props.size} testId={props.id}>
			<TableHeader>
				<TableRow testId={`${props.id}-head`}>
					<TableHead testId={`${props.id}-h0`}>Name</TableHead>
					<TableHead testId={`${props.id}-h1`}>Role</TableHead>
					<TableHead testId={`${props.id}-h2`} alignRight tabularNums>
						Open
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{ROWS.map((row, index) => (
					<TableRow index={index} testId={`${props.id}-row-${index}`}>
						<TableCell testId={`${props.id}-c${index}-0`}>{row[0]}</TableCell>
						<TableCell testId={`${props.id}-c${index}-1`}>{row[1]}</TableCell>
						<TableCell
							testId={`${props.id}-c${index}-2`}
							alignRight
							tabularNums
						>
							{row[2]}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}

const kit = await createCheck(() => (
	<div
		style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 20 }}
	>
		<div style={{ width: 600 }}>
			<Fixture size="default" id="t" />
		</div>
		<div style={{ width: 600 }}>
			<Fixture size="compact" id="k" />
		</div>
		<div style={{ width: 600 }}>
			<Table testId="w">
				<TableBody>
					<TableRow index={0}>
						<TableCell testId="w-0" width={200}>
							Fixed
						</TableCell>
						<TableCell testId="w-1">Rest</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</div>
	</div>
));
await kit.settle(400);

const near = (a: number, b: number, tolerance = 0.5) =>
	Math.abs(a - b) <= tolerance;

const table = kit.bounds('t');
kit.check('table: fills its parent', near(table.width, 600), `${table.width}`);

const column = (id: string, index: number) => {
	const cells = [
		kit.bounds(`${id}-h${index}`),
		...ROWS.map((_, row) => kit.bounds(`${id}-c${row}-${index}`)),
	];
	return cells;
};
for (const index of [0, 1, 2]) {
	const cells = column('t', index);
	const first = cells[0];
	if (first === undefined) throw new Error('no header cell');
	kit.check(
		`column ${index}: header and body cells share one x and width`,
		cells.every(
			(cell) => near(cell.x, first.x) && near(cell.width, first.width),
		),
		cells
			.map((cell) => `${cell.x.toFixed(1)}+${cell.width.toFixed(1)}`)
			.join(' '),
	);
}

const widths = [0, 1, 2].map((index) => {
	const cell = column('t', index)[0];
	if (cell === undefined) throw new Error('no header cell');
	return cell.width;
});
const roleWidth = widths[1] as number;
kit.check(
	'columns size to content: the long Role column is the widest',
	roleWidth > (widths[0] as number) + 80 &&
		roleWidth > (widths[2] as number) + 80,
	widths.map((value) => value.toFixed(1)).join(' / '),
);
kit.check(
	'columns are not equal thirds',
	!near(widths[0] as number, 200, 20),
	`${widths[0]}`,
);
kit.check(
	'columns add up to the table',
	near(
		widths.reduce((sum, value) => sum + value, 0),
		600,
		1,
	),
);

const lastCell = kit.bounds('t-c0-2');
const row0 = kit.bounds('t-row-0');
kit.check(
	'alignRight: the last column ends at the table edge',
	near(lastCell.x + lastCell.width, table.x + table.width),
);
kit.check(
	'rows: the 36px / 28px ladder plus the collapsed 1px rule',
	near(row0.height, 37) && near(kit.bounds('k-row-0').height, 29),
	`${row0.height} / ${kit.bounds('k-row-0').height}`,
);
const head = kit.bounds('t-head');
kit.check(
	'the header row is above the body and as tall',
	near(head.height, row0.height, 1) && head.y < row0.y,
);

const fixed = kit.bounds('w-0');
const rest = kit.bounds('w-1');
kit.check(
	'a cell width sets its column; the rest takes what is left',
	near(fixed.width, 200) && near(rest.width, 400),
	`${fixed.width} / ${rest.width}`,
);

const place = (id: string) => kit.bounds(id);
async function lights(rowId: string, pointer: { x: number; y: number }) {
	await kit.hoverFor(pointer, 500);
	if (!kit.exists('t-highlight')) return null;
	const highlight = place('t-highlight');
	const row = place(rowId);
	return { highlight, row };
}
const second = place('t-row-1');
const hit = await lights('t-row-1', {
	x: second.x + 40,
	y: second.y + second.height / 2,
});
kit.check(
	'hover: the highlight sits on the row under the pointer',
	hit !== null &&
		near(hit.highlight.y, hit.row.y, 1) &&
		near(hit.highlight.height, hit.row.height, 1) &&
		near(hit.highlight.width, hit.row.width, 1),
	hit === null
		? 'no highlight'
		: `${hit.highlight.y.toFixed(1)}/${hit.highlight.height.toFixed(1)} vs ${hit.row.y.toFixed(1)}/${hit.row.height.toFixed(1)}`,
);

const header = place('t-head');
const onHeader = await lights('t-row-0', {
	x: header.x + 40,
	y: header.y + header.height / 2,
});
kit.check(
	'hover: the header lights the first body row',
	onHeader !== null && near(onHeader.highlight.y, onHeader.row.y, 1),
);

await kit.hoverFor({ x: 2, y: 2 }, 500);
kit.finish();
