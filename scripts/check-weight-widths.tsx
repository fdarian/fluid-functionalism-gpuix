/**
 * What the weight tokens do to a label's width.
 *
 *   bun scripts/check-weight-widths.tsx [part of a part-B scenario name]
 *
 * A. Against the browser. The source's `font-weight.ts` says `semibold` keeps
 *    every string of a 4-40 character corpus within 0.4 px of `normal` at 13 px.
 *    Chromium, measuring the same `InterVariable.ttf` and tokens, does not
 *    reproduce that: Analytics grows 1.05 px, FLUID FUNCTIONALISM REGISTRY DEPLOY
 *    shrinks 1.13 px. So the assertion is that gpuix's delta equals the
 *    browser's; how many strings the source's claim misses is printed. Each
 *    string is measured at 13 px, as rendered: gpuix's bounds are fractional
 *    (1/64 px), like the browser's.
 *
 * B. In the components. Each one that renders a `StableLabel` is mounted through
 *    its demo page (so Inter Variable applies) and clicked until labels go
 *    heavy or light. With the motion clock held and stepped every 8 ms across
 *    the weight ease, the label's box and everything in its row must stay
 *    exactly where they were. `skill/menu-example` is scripted playback with no
 *    input to drive, so it is not mounted. Its `StableLabel` and the role menu's
 *    are covered by the synthetic mounts at the end. The test window is 1x:
 *    widths at a retina display's 2x scale are not measured.
 *
 *    `StableLabel` reserves both the normal and the semibold copy, so its box
 *    is as wide as the wider of the two and never changes width with the
 *    weight, also for a label narrower at semibold (the browser's ghost span
 *    holds the semibold copy only and shrinks there). The synthetic mount of
 *    such strings ("Pro plan", "Toggle dark mode") asserts that the cell
 *    equals the wider copy, light and heavy, exactly.
 */
import type { HostElement } from '@gpuix/solid';
import { createSignal, For, type JSX } from 'solid-js';
import { StableLabel } from '#/lib/stable-label';
import { color, fontFamily, type as scale, weight } from '#/lib/theme';
import { ROLES, StaticRoleItem, SurfaceMenu } from '#/pages/surfaces/role-menu';
import { createCheck } from './check-kit';

const CORPUS = [
	'Teamspaces',
	'Recents',
	'Favorites',
	'Shared',
	'Library',
	'Settings',
	'Overview',
	'Analytics',
	'Notifications',
	'Fluid Hover',
	'Scrollbars',
	'Toggle dark mode',
	'Copy link',
	'Export as PDF',
	'Contact support',
	'Less than a year',
	'Native desktop',
	'Registry deploy pipeline',
	'Dark mode token audit',
	'Sidebar component height in demo',
	'Which features should we prioritize?',
	'Notifications and billing settings',
	'Restricted member',
	'One at a time',
	'HEX',
	'OKLCH',
	'ILLEGAL MINIMUM',
	'FLUID FUNCTIONALISM REGISTRY DEPLOY',
	'lowercase heavy mixed iiillljjj',
	'mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm',
	'WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW',
	'iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii',
	'2–10 · 11–50 · 50+ people',
] as const;

/** Width change from `normal` at 13 px as [semibold, bold], measured in Chromium (getBoundingClientRect, same font file and tokens). */
const BROWSER_DELTAS: Record<
	(typeof CORPUS)[number],
	readonly [number, number]
> = {
	Teamspaces: [0.17, -0.14],
	Recents: [0.39, 0.58],
	Favorites: [0.44, 0.8],
	Shared: [0.19, 0.34],
	Library: [0.22, 0.36],
	Settings: [0.64, 1.27],
	Overview: [0.39, 0.47],
	Analytics: [1.05, 1.77],
	Notifications: [0.91, 1.61],
	'Fluid Hover': [-0.11, -0.5],
	Scrollbars: [0.42, 0.78],
	'Toggle dark mode': [-0.56, -1.7],
	'Copy link': [0.14, -0.06],
	'Export as PDF': [-0.38, -0.86],
	'Contact support': [0.69, 1.16],
	'Less than a year': [-0.39, -1.23],
	'Native desktop': [0.36, 0.41],
	'Registry deploy pipeline': [0.39, 0.0],
	'Dark mode token audit': [-0.14, -0.69],
	'Sidebar component height in demo': [-0.08, -0.95],
	'Which features should we prioritize?': [0.67, 0.61],
	'Notifications and billing settings': [1.09, 1.44],
	'Restricted member': [0.56, 0.83],
	'One at a time': [-0.34, -0.94],
	HEX: [0.2, 0.31],
	OKLCH: [0.08, 0.0],
	'ILLEGAL MINIMUM': [-0.39, -0.98],
	'FLUID FUNCTIONALISM REGISTRY DEPLOY': [-1.13, -2.66],
	'lowercase heavy mixed iiillljjj': [0.63, 0.34],
	mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm: [5.66, 9.81],
	WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW: [7.66, 11.44],
	iiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii: [3.98, 6.95],
	'2–10 · 11–50 · 50+ people': [-0.69, -2.91],
};

/**
 * The worst difference measured against the browser's table is 0.018 px: the table is rounded to 0.01 px
 * and gpuix's widths to 1/64 px (0.016), each width of the pair carrying its own rounding.
 */
const PARITY_TOLERANCE_PX = 0.03;
/** What the source's font-weight.ts claims for semibold. */
const SOURCE_CLAIM_PX = 0.4;
const [probe, setProbe] = createSignal<string>(CORPUS[0]);
const partA = await createCheck(
	() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				fontFamily,
				fontSize: 13,
				lineHeight: '15px',
			}}
		>
			{(['normal', 'semibold', 'bold'] as const).map((name) => (
				<text
					testId={`probe-${name}`}
					style={{
						whiteSpace: 'nowrap',
						fontVariationSettings: weight[name],
						color: '#fff',
					}}
				>
					{probe()}
				</text>
			))}
		</div>
	),
	{ width: 700, height: 60 },
);

type Row = { text: string; semibold: number; bold: number };
const rows: Row[] = [];
for (const text of CORPUS) {
	setProbe(text);
	await partA.settle(60);
	const normal = partA.bounds('probe-normal').width;
	rows.push({
		text,
		semibold: partA.bounds('probe-semibold').width - normal,
		bold: partA.bounds('probe-bold').width - normal,
	});
}

console.log('width change from normal at 13px, gpuix (browser), in px');
console.log('  semibold         bold            chars  text');
for (const row of rows) {
	const browser = BROWSER_DELTAS[row.text as (typeof CORPUS)[number]];
	const cell = (gpuix: number, reference: number) =>
		`${gpuix.toFixed(2).padStart(5)} (${reference.toFixed(2).padStart(5)})`;
	console.log(
		`  ${cell(row.semibold, browser[0])}  ${cell(row.bold, browser[1])}  ${row.text.length.toString().padStart(3)}    ${row.text}`,
	);
}
const worst = (pick: (row: Row) => number) =>
	Math.max(...rows.map((row) => Math.abs(pick(row))));
console.log(
	`worst |delta|: semibold ${worst((row) => row.semibold).toFixed(1)} px, bold ${worst((row) => row.bold).toFixed(1)} px`,
);
const beyondClaim = CORPUS.filter(
	(text) => Math.abs(BROWSER_DELTAS[text][0]) > SOURCE_CLAIM_PX,
);
console.log(
	`semibold beyond the source's ±${SOURCE_CLAIM_PX} px in the browser itself: ${beyondClaim.length} of ${CORPUS.length}`,
);

for (const row of rows) {
	const reference = BROWSER_DELTAS[row.text as (typeof CORPUS)[number]][0];
	partA.check(
		`semibold delta matches the browser: ${row.text}`,
		Math.abs(row.semibold - reference) <= PARITY_TOLERANCE_PX,
		`gpuix ${row.semibold.toFixed(2)}, browser ${reference.toFixed(2)}`,
	);
}
let failures = partA.unmount();

type Kit = Awaited<ReturnType<typeof createCheck>>;
type Box = { x: number; y: number; width: number; height: number };

type Step = {
	name: string;
	/** Runs before the labels are read: scroll, hover, open a popup. */
	prepare?: (kit: Kit) => Promise<void>;
	/** Runs once, synchronously, so the first sampled frame is the first frame of the change. */
	act: (kit: Kit) => void;
};

type Scenario = {
	name: string;
	mount: string | (() => JSX.Element);
	/**
	 * What of a box must hold. A list that opens or closes content moves what is below it, so it compares
	 * `horizontal` (x and width). A text column that shares its row with a check mark takes the mark's width
	 * (16 + gap 12) out of the label's cell, as in the source, so the description rewraps and the rows change height:
	 * it compares `left` (x only).
	 */
	compare?: 'box' | 'horizontal' | 'left';
	/** A popup that slides as it closes: boxes are compared relative to this test id's box. */
	anchor?: string;
	/** Only labels under this test id are read: one that unmounts when a popup closes, or a page with too many labels to read fast. */
	watch?: string;
	setup?: (kit: Kit) => Promise<void>;
	steps: (kit: Kit) => Step[];
};

type TreeNode = {
	type: string;
	id: number;
	testId?: string;
	text?: string;
	bounds?: Box;
	children?: TreeNode[];
};

type Tree = {
	nodes: Map<number, TreeNode>;
	parents: Map<number, number>;
};

/** The motion clock is held and stepped by hand, so the 80 ms weight ease is sampled every 8 ms however slow the tree reads are. */
const FRAME_MS = 8;
const FRAMES = 24;
/** The frame at which the labels are read again. Their style is the target weight, so this is early: a popup that closes on selection has not unmounted them yet. */
const READ_AGAIN_AT = 2;
const SEMIBOLD_WGHT = '"wght" 550';

/**
 * One native call for the whole tree with bounds. `getElement` and `findByTestId`
 * each cost a native round trip of about 10 ms, so a frame can afford the tree
 * but not a walk with them.
 */
function readTree(kit: Kit): Tree {
	const root = JSON.parse(kit.renderer.getAutomationTree()) as TreeNode;
	const nodes = new Map<number, TreeNode>();
	const parents = new Map<number, number>();
	const visit = (node: TreeNode, parent: number | null) => {
		nodes.set(node.id, node);
		if (parent !== null) parents.set(node.id, parent);
		for (const child of node.children === undefined ? [] : node.children)
			visit(child, node.id);
	};
	visit(root, null);
	return { nodes, parents };
}

function nodeOf(tree: Tree, id: number) {
	const found = tree.nodes.get(id);
	if (found === undefined) throw new Error(`no node ${id}`);
	return found;
}

function childrenOf(tree: Tree, id: number) {
	const node = nodeOf(tree, id);
	return node.children === undefined ? [] : node.children;
}

function textOf(node: TreeNode): string {
	if (node.text !== undefined) return node.text;
	return (node.children === undefined ? [] : node.children)
		.map(textOf)
		.join('');
}

function styleOf(kit: Kit, id: number) {
	const element = kit.renderer.getElement(id);
	if (element === undefined) throw new Error(`no element ${id}`);
	return element.style;
}

function under(tree: Tree, id: number, testId: string) {
	for (
		let at: number | undefined = id;
		at !== undefined;
		at = tree.parents.get(at)
	) {
		if (nodeOf(tree, at).testId === testId) return true;
	}
	return false;
}

const inlineGrids = new Map<number, boolean>();

/**
 * A `StableLabel`: an inline-grid div of texts with the same words (hidden
 * copies and the visible one last). The tree has no styles, so the grid is
 * confirmed once per element.
 */
function findLabels(kit: Kit, tree: Tree, watch: string | undefined) {
	const found: number[] = [];
	for (const node of tree.nodes.values()) {
		if (node.type !== 'div' || node.bounds === undefined) continue;
		const copies = childrenOf(tree, node.id);
		if (copies.length < 2 || copies.some((copy) => copy.type !== 'text'))
			continue;
		const words = textOf(copies[0]);
		if (words === '' || copies.some((copy) => textOf(copy) !== words)) continue;
		if (watch !== undefined && !under(tree, node.id, watch)) continue;
		let isGrid = inlineGrids.get(node.id);
		if (isGrid === undefined) {
			isGrid = styleOf(kit, node.id).display === 'inline-grid';
			inlineGrids.set(node.id, isGrid);
		}
		if (isGrid) found.push(node.id);
	}
	return found;
}

function visibleCopy(tree: Tree, label: number) {
	return childrenOf(tree, label).at(-1) as TreeNode;
}

/** Whether the visible copy of the label (the last of the three) is semibold; null once it is unmounted. */
function isHeavy(kit: Kit, tree: Tree, label: number) {
	if (!tree.nodes.has(label)) return null;
	const visible = visibleCopy(tree, label);
	const element = kit.renderer.getElement(visible.id);
	if (element === undefined) return null;
	return String(element.style.fontVariationSettings).includes(SEMIBOLD_WGHT);
}

const absolute = new Map<number, boolean>();

/** What is in the label's row: the parent's other children and the grandparent's, but not what is absolutely positioned (pills, rings). */
function neighboursOf(kit: Kit, tree: Tree, label: number) {
	const parent = tree.parents.get(label);
	if (parent === undefined) return [];
	const grandparent = tree.parents.get(parent);
	const ids = [
		...childrenOf(tree, parent),
		...(grandparent === undefined ? [] : childrenOf(tree, grandparent)),
	]
		.map((node) => node.id)
		.filter((id) => id !== label && nodeOf(tree, id).bounds !== undefined);
	return ids.filter((id) => {
		let isAbsolute = absolute.get(id);
		if (isAbsolute === undefined) {
			const element = kit.renderer.getElement(id);
			// Gone already (a popup that closed): nothing left to compare.
			if (element === undefined) return false;
			isAbsolute = element.style.position === 'absolute';
			absolute.set(id, isAbsolute);
		}
		return !isAbsolute;
	});
}

function differs(
	before: Box,
	after: Box,
	compare: NonNullable<Scenario['compare']>,
) {
	if (compare === 'left') return before.x !== after.x;
	const sameX = before.x === after.x && before.width === after.width;
	if (compare === 'horizontal') return !sameX;
	return !sameX || before.y !== after.y || before.height !== after.height;
}

const describe = (box: Box) => `x${box.x} y${box.y} ${box.width}x${box.height}`;

async function reveal(
	kit: Kit,
	testId: string,
	scrollAt: { x: number; y: number },
) {
	for (let attempt = 0; attempt < 30; attempt++) {
		const box = kit.renderer.getElementBounds(kit.element(testId).id);
		const middle = box === null ? null : box.y + box.height / 2;
		if (middle !== null && middle > 120 && middle < 650) return;
		kit.renderer.nativeSimulateScrollWheel(
			scrollAt.x,
			scrollAt.y,
			0,
			middle === null ? 400 : middle - 300,
		);
		await kit.settle(150);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

function clickStep(testId: string, scrollAt = { x: 700, y: 400 }): Step {
	return {
		name: `click ${testId}`,
		prepare: async (kit) => {
			await reveal(kit, testId, scrollAt);
			const point = kit.center(testId);
			kit.renderer.nativeSimulateMouseMove(point.x - 1, point.y);
			kit.renderer.nativeSimulateMouseMove(point.x, point.y);
			await kit.settle(250);
		},
		act: (kit) => {
			const point = kit.center(testId);
			kit.renderer.nativeSimulateClick(point.x, point.y);
		},
	};
}

function anchorOf(tree: Tree, testId: string | undefined) {
	if (testId === undefined) return undefined;
	for (const node of tree.nodes.values())
		if (node.testId === testId) return node.id;
	throw new Error(`no anchor ${testId}`);
}

function shifted(box: Box | undefined, slide: { x: number; y: number } | null) {
	if (box === undefined || slide === null) return undefined;
	return { ...box, x: box.x - slide.x, y: box.y - slide.y };
}

function boundsOf(tree: Tree) {
	const found = new Map<number, Box>();
	for (const node of tree.nodes.values())
		if (node.bounds !== undefined) found.set(node.id, node.bounds);
	return found;
}

async function runStep(kit: Kit, scenario: Scenario, step: Step) {
	await step.prepare?.(kit);
	const before = readTree(kit);
	const labels = findLabels(kit, before, scenario.watch);
	const heavyBefore = labels.map((label) => isHeavy(kit, before, label));
	const frames: Map<number, Box>[] = [boundsOf(before)];
	kit.renderer.clockPause();
	step.act(kit);
	// A signal set from outside an event reaches the tree on the next task.
	await new Promise((resolve) => setTimeout(resolve, 0));
	let heavyAfter: (boolean | null)[] | undefined;
	for (let frame = 0; frame < FRAMES; frame++) {
		kit.step(FRAME_MS);
		const tree = readTree(kit);
		frames.push(boundsOf(tree));
		if (frame === READ_AGAIN_AT)
			heavyAfter = labels.map((label) => isHeavy(kit, tree, label));
	}
	kit.renderer.clockResume();
	const again = heavyAfter;
	if (again === undefined) throw new Error('never read the labels again');

	const anchorId = anchorOf(before, scenario.anchor);
	const anchorHome =
		anchorId === undefined ? undefined : nodeOf(before, anchorId).bounds;
	/** How far the anchor has moved from where it was, or null when the frame has lost it. */
	const slideOf = (frame: Map<number, Box>) => {
		if (anchorId === undefined || anchorHome === undefined)
			return { x: 0, y: 0 };
		const now = frame.get(anchorId);
		return now === undefined
			? null
			: { x: now.x - anchorHome.x, y: now.y - anchorHome.y };
	};
	const violations = new Set<string>();
	let toHeavy = 0;
	let toLight = 0;
	labels.forEach((label, index) => {
		const was = heavyBefore[index];
		const now = again[index];
		if (was === null || now === null || was === now) return;
		if (now) toHeavy++;
		else toLight++;
		const words = textOf(visibleCopy(before, label));
		const home = nodeOf(before, label).bounds as Box;
		const compare = scenario.compare === undefined ? 'box' : scenario.compare;
		const neighbours = neighboursOf(kit, before, label).map((id) => ({
			id,
			type: nodeOf(before, id).type,
			box: nodeOf(before, id).bounds as Box,
		}));
		for (const frame of frames) {
			const slide = slideOf(frame);
			const box = shifted(frame.get(label), slide);
			if (box !== undefined && differs(home, box, compare))
				violations.add(`"${words}" ${describe(home)} -> ${describe(box)}`);
			for (const neighbour of neighbours) {
				const moved = shifted(frame.get(neighbour.id), slide);
				if (moved !== undefined && differs(neighbour.box, moved, compare))
					violations.add(
						`beside "${words}": ${neighbour.type} ${describe(neighbour.box)} -> ${describe(moved)}`,
					);
			}
		}
	});
	const detail = `${labels.length} labels read, ${toHeavy} went heavy, ${toLight} went light, ${frames.length} frames`;
	kit.check(
		`${scenario.name}: ${step.name} moves nothing`,
		violations.size === 0 && toHeavy + toLight > 0,
		violations.size === 0
			? detail
			: `${detail}; ${[...violations].slice(0, 4).join('; ')}`,
	);
}

async function runScenario(scenario: Scenario) {
	const kit = await createCheck(scenario.mount);
	await kit.settle(300);
	await scenario.setup?.(kit);
	for (const step of scenario.steps(kit)) {
		await runStep(kit, scenario, step);
		await kit.settle(300);
	}
	return kit.unmount();
}

const NAV_SCROLL = { x: 130, y: 400 };
const popupStep =
	(open: string, then: string): ((kit: Kit) => Promise<void>) =>
	async (kit) => {
		await kit.click(open);
		await kit.settle(400);
		if (!kit.exists(then)) throw new Error(`${open} did not open ${then}`);
	};

/** Labels whose normal copy is as wide as or wider than the semibold one, so the semibold-only ghost would shrink them. */
const WEIGHT_SENSITIVE_LABELS = [
	'Pro plan',
	'Toggle dark mode',
	'FLUID FUNCTIONALISM REGISTRY DEPLOY',
	'2–10 · 11–50 · 50+ people',
	'Less than a year',
	'Export as PDF',
] as const;

const PARITY_VARIANTS = [
	{ name: 'plain', props: {} },
	{ name: 'nowrap', props: { nowrap: true } },
	{ name: 'truncate', props: { truncate: true } },
] as const;

/** `StableLabel`'s cell is as wide as the wider of the normal and semibold copies, at either weight. */
async function runSyntheticParity() {
	console.log('\nStableLabel on its own (width never changes)');
	const [selected, setSelected] = createSignal(-1);
	const labels = new Map<string, HostElement>();
	const key = (variant: string, index: number) => `${variant}-${index}`;
	const kit = await createCheck(() => (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				padding: 20,
				fontFamily,
				backgroundColor: color.background,
			}}
		>
			<For each={PARITY_VARIANTS}>
				{(variant) => (
					<For each={WEIGHT_SENSITIVE_LABELS}>
						{(text, index) => (
							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									gap: 8,
									width: 500,
								}}
							>
								<StableLabel
									text={text}
									heavy={selected() === index()}
									color={color.foreground}
									fade
									labelRef={(element) =>
										labels.set(key(variant.name, index()), element)
									}
									{...variant.props}
								/>
								<text style={{ color: color.mutedForeground, fontSize: 13 }}>
									after
								</text>
							</div>
						)}
					</For>
				)}
			</For>
			<For each={WEIGHT_SENSITIVE_LABELS}>
				{(text, index) => (
					<div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
						<For each={['normal', 'semibold'] as const}>
							{(name) => (
								<text
									testId={`copy-${name}-${index()}`}
									style={{
										...scale.body,
										whiteSpace: 'nowrap',
										fontVariationSettings: weight[name],
									}}
								>
									{text}
								</text>
							)}
						</For>
					</div>
				)}
			</For>
		</div>
	));
	await kit.settle(300);
	const widthOf = (variant: string, index: number) => {
		const element = labels.get(key(variant, index));
		if (element === undefined) throw new Error(`no label ${variant} ${index}`);
		const box = kit.renderer.getElementBounds(element.id);
		if (box === null) throw new Error(`no painted bounds ${variant} ${index}`);
		return box.width;
	};
	const light = PARITY_VARIANTS.map((variant) =>
		WEIGHT_SENSITIVE_LABELS.map((_, index) => widthOf(variant.name, index)),
	);
	for (const [variantIndex, variant] of PARITY_VARIANTS.entries()) {
		for (const [index, text] of WEIGHT_SENSITIVE_LABELS.entries()) {
			setSelected(index);
			await kit.settle(250);
			const heavy = widthOf(variant.name, index);
			setSelected(-1);
			await kit.settle(250);
			const normal = kit.bounds(`copy-normal-${index}`).width;
			const semibold = kit.bounds(`copy-semibold-${index}`).width;
			const wider = Math.max(normal, semibold);
			const lightWidth = light[variantIndex][index];
			console.log(
				`  ${variant.name.padEnd(8)} light ${lightWidth} px, heavy ${heavy} px (normal ${normal}, semibold ${semibold})  ${text}`,
			);
			kit.check(
				`${variant.name}: the cell keeps its width going heavy: ${text}`,
				lightWidth === heavy,
				`light ${lightWidth}, heavy ${heavy}`,
			);
			kit.check(
				`${variant.name}: light cell is the wider copy's width: ${text}`,
				lightWidth === wider,
				`cell ${lightWidth}, normal ${normal}, semibold ${semibold}`,
			);
			kit.check(
				`${variant.name}: heavy cell is the wider copy's width: ${text}`,
				heavy === wider,
				`cell ${heavy}, normal ${normal}, semibold ${semibold}`,
			);
		}
	}
	return kit.unmount();
}

/** The check mark only exists on the checked row and takes room from the label's flexible cell, so only left edges are compared. */
function syntheticRoleMenu(): Scenario {
	const [checked, setChecked] = createSignal(0);
	return {
		name: 'role-menu (SurfaceMenu and StaticRoleItem)',
		compare: 'left',
		mount: () => (
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					gap: 24,
					padding: 20,
					fontFamily,
					backgroundColor: color.background,
				}}
			>
				<div style={{ width: 300 }}>
					<SurfaceMenu
						options={ROLES}
						checkedIndex={checked()}
						variant="menu"
					/>
				</div>
				<div style={{ width: 300 }}>
					<SurfaceMenu
						options={ROLES}
						checkedIndex={checked()}
						variant="role"
					/>
				</div>
				<div style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
					<For each={ROLES}>
						{(role, index) => (
							<StaticRoleItem role={role} checked={checked() === index()} />
						)}
					</For>
				</div>
			</div>
		),
		steps: () =>
			[1, 2, 0].map((index) => ({
				name: `check ${ROLES[index].label}`,
				act: () => setChecked(index),
			})),
	};
}

/** `bun scripts/check-weight-widths.tsx <part of a scenario name>` runs the matching scenarios of part B. */
const only = process.argv[2];

const scenarios: Scenario[] = [
	{
		name: 'tabs',
		mount: 'tabs',
		steps: () => [
			clickStep('basic-recents'),
			clickStep('basic-favorites'),
			clickStep('basic-recents'),
		],
	},
	{
		name: 'tabs-subtle (With icons, Teamspaces)',
		mount: 'tabs-subtle',
		steps: () => [
			clickStep('icons-1'),
			clickStep('icons-0'),
			clickStep('icons-2'),
			clickStep('icons-0'),
			clickStep('icons-3'),
		],
	},
	{
		name: 'tabs-subtle (Basic, Teamspaces)',
		mount: 'tabs-subtle',
		steps: () => [
			clickStep('basic-1'),
			clickStep('basic-0'),
			clickStep('basic-3'),
		],
	},
	{
		name: 'checkbox-group',
		mount: 'checkbox-group',
		steps: () => [
			clickStep('box-1'),
			clickStep('box-0'),
			clickStep('box-3'),
			clickStep('narrow-2'),
		],
	},
	{
		name: 'radio-group',
		mount: 'radio-group',
		steps: () => [
			clickStep('radio-1'),
			clickStep('radio-2'),
			clickStep('plan-1'),
			clickStep('narrow-2'),
			clickStep('narrow-0'),
		],
	},
	{
		name: 'menu-item (inline Dropdown)',
		mount: 'dropdown',
		steps: () => [
			clickStep('basic-2'),
			clickStep('basic-4'),
			clickStep('basic-2'),
		],
	},
	{
		name: 'menu-item (multiple selection popup)',
		mount: 'dropdown',
		setup: async (kit) => {
			await reveal(kit, 'multi-trigger', { x: 700, y: 400 });
			await popupStep('multi-trigger', 'multi-0')(kit);
		},
		steps: () => [
			clickStep('multi-3'),
			clickStep('multi-0'),
			clickStep('multi-3'),
		],
	},
	{
		name: 'accordion',
		mount: 'accordion',
		compare: 'horizontal',
		steps: () => [
			clickStep('single-2'),
			clickStep('single-3'),
			clickStep('multi-1'),
			clickStep('multi-2'),
			clickStep('multi-1'),
		],
	},
	{
		name: 'nav-item (the app nav)',
		mount: 'tabs',
		steps: () => [
			clickStep('nav-badge', NAV_SCROLL),
			clickStep('nav-banner', NAV_SCROLL),
			clickStep('nav-button', NAV_SCROLL),
		],
	},
	{
		name: 'sidebar',
		mount: 'sidebar',
		steps: () => [
			clickStep('sidebar-demo-Motion'),
			clickStep('sidebar-demo-Skill'),
			clickStep('sidebar-demo-Variants'),
			clickStep('sidebar-demo-Icons'),
			clickStep('play-row-Dark mode token audit'),
			clickStep('play-row-Sidebar component height in demo'),
		],
	},
	{
		// A single-select answer advances at once and unmounts the row, so only multi-select rows change weight in place.
		name: 'ask-user-questions (inline description)',
		mount: 'ask-user-questions',
		steps: () => [
			clickStep('multi-option-0'),
			clickStep('multi-option-1'),
			clickStep('multi-option-0'),
		],
	},
	{
		name: 'ask-user-questions (stacked)',
		mount: 'ask-user-questions',
		setup: async (kit) => {
			await kit.click('play-multi-track');
			await kit.focus('play-layout-trigger');
			await kit.press('ArrowDown ArrowDown Enter');
			await kit.settle(300);
		},
		steps: () => [
			clickStep('play-option-0'),
			clickStep('play-option-1'),
			clickStep('play-option-0'),
		],
	},
	{
		name: 'thinking-steps',
		mount: 'thinking-steps',
		compare: 'horizontal',
		steps: () => [
			clickStep('basic-header'),
			clickStep('basic-header'),
			clickStep('streaming-header'),
		],
	},
	{
		name: 'color-picker (format menu)',
		mount: 'color-picker',
		watch: 'default-format-popup',
		anchor: 'default-format-popup',
		setup: popupStep('default-format', 'default-format-rgb'),
		steps: () => [clickStep('default-format-rgb')],
	},
	syntheticRoleMenu(),
];

for (const scenario of scenarios) {
	if (only !== undefined && !scenario.name.includes(only)) continue;
	console.log(`\n${scenario.name}`);
	failures += await runScenario(scenario);
}
if (only === undefined || 'StableLabel on its own'.includes(only))
	failures += await runSyntheticParity();
console.log(failures === 0 ? '\nall passed' : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
