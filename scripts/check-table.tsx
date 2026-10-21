/**
 * Table layout and fluid hover, measured on layout bounds.
 *
 *   bun scripts/check-table.tsx
 *
 * The table is a real `display: table`: columns size to their widest cell and line up across the header and body
 * rows, the table fills its parent, a cell's `width` sets its column, and the rows are the 36px / 28px ladder
 * plus the 1px rule (37 / 29 as the grid measures them). The hover highlight sits on the row under the pointer, and the header
 * lights the first body row. The hover glide, on the fixture and on the real Table page, must not rebuild more layout than the sidebar's
 * (a border-color transition on the rows once made it rebuild the table every frame).
 */
import { SidebarMenu, SidebarMenuButton } from '#/components/sidebar';
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
		<div style={{ width: 256 }}>
			<SidebarMenu testId="sb">
				{[0, 1, 2, 3].map((index) => (
					<SidebarMenuButton testId={`sb-${index}`} label={`Row ${index}`} />
				))}
			</SidebarMenu>
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

type Check = typeof kit;
type Point = { x: number; y: number };
type TreeNode = {
	id: number;
	type: string;
	testId?: string;
	children?: TreeNode[];
};

function findNode(
	node: TreeNode,
	test: (node: TreeNode) => boolean,
): TreeNode | undefined {
	if (test(node)) return node;
	for (const child of node.children ?? []) {
		const hit = findNode(child, test);
		if (hit !== undefined) return hit;
	}
	return undefined;
}

/** The sidebar's hover fill carries no testId: it is a childless, unnamed div among its menu's children (the other leaves are text). */
function sidebarFills(check: Check, isMenu: (node: TreeNode) => boolean) {
	const tree = JSON.parse(check.renderer.getAutomationTree()) as TreeNode;
	const menu = findNode(tree, isMenu);
	if (menu === undefined) throw new Error('no sidebar menu');
	return (menu.children ?? [])
		.filter(
			(child) =>
				child.type === 'div' &&
				child.testId === undefined &&
				child.children === undefined,
		)
		.map((child) => child.id);
}
const lastFill = (check: Check, isMenu: (node: TreeNode) => boolean) => {
	const fill = sidebarFills(check, isMenu).at(-1);
	if (fill === undefined) throw new Error('no sidebar hover fill');
	return fill;
};

const FRAME_MS = 8;
/**
 * Layout subtrees rebuilt per frame of motion that the highlight's own travel costs (it animates top / left, drift/table.md
 * "Highlight travel"), measured at 5.5 in the fixture and 64 on the page. A border-color transition on the rows adds ten times
 * that (55 and 640) for the 80 ms after each hover change, so these allowances sit between the two.
 */
const HIGHLIGHT_LAYOUT_BUILDS_FIXTURE = 20;
const HIGHLIGHT_LAYOUT_BUILDS_PAGE = 200;
const above = (check: Check, testId: string): Point => {
	const box = check.bounds(testId);
	return { x: box.x + 40, y: box.y + box.height / 2 };
};

type Frame = { y: number; height: number };
type Glide = {
	frames: Frame[];
	/** Layout subtrees rebuilt over the glide. */
	layoutBuilds: number;
};

/** Holds the motion clock, moves the pointer onto `to`, and samples the highlight on each 8 ms frame. */
function trace(check: Check, highlight: number, to: Point, count: number) {
	const renderer = check.renderer;
	const frames: Frame[] = [];
	renderer.clockPause();
	const retainedBefore = renderer.getRetainedCounters();
	renderer.nativeSimulateMouseMove(to.x - 1, to.y);
	renderer.nativeSimulateMouseMove(to.x, to.y);
	for (let frame = 0; frame < count; frame++) {
		check.step(frame === 0 ? 0 : FRAME_MS);
		const box = renderer.getElementBounds(highlight);
		if (box === null) throw new Error(`highlight ${highlight} not painted`);
		frames.push({ y: box.y, height: box.height });
	}
	renderer.clockResume();
	return {
		frames,
		layoutBuilds: renderer.getRetainedCounters().builds - retainedBefore.builds,
	} satisfies Glide;
}

function summary(glide: Glide) {
	const frames = glide.frames;
	const first = frames[0] as Frame;
	const last = frames[frames.length - 1] as Frame;
	const direction = Math.sign(last.y - first.y);
	let reversals = 0;
	let stalls = 0;
	let moving = 0;
	for (let i = 1; i < frames.length; i++) {
		const step =
			((frames[i] as Frame).y - (frames[i - 1] as Frame).y) * direction;
		if (step < -0.01) reversals++;
		const unsettled = Math.abs((frames[i - 1] as Frame).y - last.y) > 0.5;
		if (unsettled && Math.abs(step) < 0.01) stalls++;
		if (Math.abs(step) >= 0.01) moving++;
	}
	return {
		travel: Math.abs(last.y - first.y),
		reversals,
		stalls,
		moving,
		layoutBuilds: glide.layoutBuilds,
		ys: frames.map((f) => f.y.toFixed(0)).join(' '),
	};
}
type Summary = ReturnType<typeof summary>;
const show = (value: Summary) =>
	`travel ${value.travel.toFixed(0)}px over ${value.moving} frames [${value.ys}], ${value.reversals} reversals, ${value.stalls} stalls, ${value.layoutBuilds} layout builds`;

/** Hovers `fromId`, then moves the pointer to `toId` with the clock held. */
async function glideOf(
	check: Check,
	fromId: string,
	toId: string,
	highlight: () => number,
) {
	await check.hoverFor(above(check, fromId), 400);
	const glide = trace(check, highlight(), above(check, toId), 24);
	await check.settle(300);
	return summary(glide);
}

// The fixture: a table and a sidebar menu side by side, nothing else in the window.
const fixtureTable = await glideOf(
	kit,
	't-row-0',
	't-row-2',
	() => kit.element('t-highlight').id,
);
await kit.hoverFor({ x: 2, y: 2 }, 400);
const fixtureSidebar = await glideOf(kit, 'sb-0', 'sb-2', () =>
	lastFill(kit, (node) => node.testId === 'sb'),
);
kit.check(
	'hover glide: the highlight advances without reversing or stalling',
	fixtureTable.reversals === 0 && fixtureTable.stalls === 0,
	`table ${show(fixtureTable)}`,
);
kit.check(
	'hover glide: the glide rebuilds layout about as little as the sidebar does',
	fixtureTable.layoutBuilds / fixtureTable.moving <=
		fixtureSidebar.layoutBuilds / fixtureSidebar.moving +
			HIGHLIGHT_LAYOUT_BUILDS_FIXTURE,
	`table ${fixtureTable.layoutBuilds} over ${fixtureTable.moving} frames vs sidebar ${fixtureSidebar.layoutBuilds} over ${fixtureSidebar.moving}`,
);
kit.check(
	'hover glide: as many frames in motion as the sidebar over the same distance',
	fixtureTable.moving >= fixtureSidebar.moving,
	`table ${fixtureTable.moving} vs sidebar ${fixtureSidebar.moving}: ${show(fixtureSidebar)}`,
);

// The real Table page: the app's sidebar and the demo's tables share one window, as in the owner's report.
const page = await createCheck('table');
await page.scrollIntoView('basic-row-0');
const isNavMenu = (node: TreeNode) =>
	(node.children ?? []).some((child) => child.testId === 'nav-button');

const pageTable = await glideOf(
	page,
	'basic-row-0',
	'basic-row-2',
	() => page.element('basic-highlight').id,
);
await page.hoverFor({ x: 2, y: 2 }, 400);
const pageSidebar = await glideOf(page, 'nav-button', 'nav-card', () =>
	lastFill(page, isNavMenu),
);
await page.hoverFor({ x: 2, y: 2 }, 400);
kit.check(
	'page hover glide: the highlight advances without reversing or stalling',
	pageTable.reversals === 0 && pageTable.stalls === 0,
	`table ${show(pageTable)}`,
);
kit.check(
	'page hover glide: the glide rebuilds layout about as little as the sidebar does',
	pageTable.layoutBuilds / pageTable.moving <=
		pageSidebar.layoutBuilds / pageSidebar.moving +
			HIGHLIGHT_LAYOUT_BUILDS_PAGE,
	`table ${pageTable.layoutBuilds} over ${pageTable.moving} frames vs sidebar ${pageSidebar.layoutBuilds} over ${pageSidebar.moving}`,
);
kit.finish();
