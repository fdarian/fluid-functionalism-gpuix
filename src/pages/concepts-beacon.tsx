import {
	createMemo,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
} from 'solid-js';
import { AskUserQuestions } from '#/components/ask-user-questions';
import { Badge, type BadgeColor, badgeColors } from '#/components/badge';
import { Button } from '#/components/button';
import {
	Dropdown,
	DropdownLabel,
	DropdownSeparator,
	MenuItem,
} from '#/components/dropdown';
import { InputField, InputGroup } from '#/components/input-group';
import { ScrollArea } from '#/components/scroll-area';
import { Select, type SelectItem } from '#/components/select';
import { Switch } from '#/components/switch';
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/table';
import {
	TabsSubtle,
	TabsSubtleItem,
	TabsSubtlePanel,
} from '#/components/tabs-subtle';
import { ThinkingIndicator } from '#/components/thinking-indicator';
import type { ShotContext } from '#/lib/demo';
import { MONO } from '#/lib/doc-page';
import { Icon } from '#/lib/icon';
import {
	color,
	shadow,
	shape,
	siteType,
	sizeChoice,
	weight,
} from '#/lib/theme';
import { ConceptFrame } from '#/pages/concepts/frame';

export const title = 'Beacon';
export const group = 'Pages';
export const order = 33;
export const layout = 'full';
export const listed = 'none';

/** How long the triage panel shows "analyzing" before it asks. */
const ANALYZING_MS = 1500;

export async function scenarios(shot: ShotContext) {
	await shot.click('beacon-view-tab-1');
	shot.capture('backlog');
	await shot.click('beacon-view-tab-2');
	shot.capture('board');
	await shot.click('beacon-view-tab-0');
	await shot.click('beacon-display');
	shot.capture('display-menu');
	await shot.click('beacon-display');
	await shot.click('beacon-search-input');
	await shot.press('c i');
	shot.expectText('ENG-131', true);
	shot.expectText('ENG-128', false);
	shot.capture('search');
	await shot.press('Backspace Backspace');
	await shot.focus('beacon-priority-trigger');
	await shot.press('Enter ArrowDown ArrowDown Enter');
	shot.expectText('ENG-131', true);
	shot.expectText('ENG-124', false);
	shot.capture('priority');
	await shot.click('beacon-triage');
	shot.capture('triage-analyzing');
	await shot.settle(ANALYZING_MS + 400);
	shot.capture('triage-asking');
	await shot.click('beacon-triage-ask-option-0');
	await shot.click('beacon-triage-ask-continue');
	await shot.settle(600);
	shot.expectText('Applied 3 changes', true);
	shot.capture('triage-done');
}

// ── Fixtures ────────────────────────────────────────────────────────────

type StatusKey = 'todo' | 'progress' | 'review' | 'done';
type PriorityKey = 'urgent' | 'high' | 'medium' | 'low' | 'none';

interface Issue {
	key: string;
	title: string;
	status: StatusKey;
	priority: PriorityKey;
	assignee: string;
}

const STATUS: Record<StatusKey, { label: string; color: BadgeColor }> = {
	todo: { label: 'Todo', color: 'gray' },
	progress: { label: 'In Progress', color: 'amber' },
	review: { label: 'In Review', color: 'violet' },
	done: { label: 'Done', color: 'green' },
};

const PRIORITY: Record<PriorityKey, { label: string; color: BadgeColor }> = {
	urgent: { label: 'Urgent', color: 'red' },
	high: { label: 'High', color: 'orange' },
	medium: { label: 'Medium', color: 'yellow' },
	low: { label: 'Low', color: 'blue' },
	none: { label: 'None', color: 'gray' },
};

const ACTIVE: Issue[] = [
	{
		key: 'ENG-128',
		title: 'Auth token refresh fails for ~4% of sessions',
		status: 'progress',
		priority: 'urgent',
		assignee: 'DK',
	},
	{
		key: 'ENG-131',
		title: 'Flaky CI on the e2e shard',
		status: 'todo',
		priority: 'high',
		assignee: 'MR',
	},
	{
		key: 'ENG-124',
		title: 'Virtualize the issues table for >1k rows',
		status: 'review',
		priority: 'medium',
		assignee: 'AJ',
	},
	{
		key: 'ENG-140',
		title: 'Dark-mode contrast on status pills',
		status: 'todo',
		priority: 'low',
		assignee: 'SL',
	},
	{
		key: 'ENG-118',
		title: 'Command palette: fuzzy match on labels',
		status: 'progress',
		priority: 'medium',
		assignee: 'DK',
	},
	{
		key: 'ENG-142',
		title: 'Webhook retries should be idempotent',
		status: 'todo',
		priority: 'high',
		assignee: 'MR',
	},
	{
		key: 'ENG-109',
		title: 'Migrate avatars to signed URLs',
		status: 'review',
		priority: 'low',
		assignee: 'AJ',
	},
	{
		key: 'ENG-145',
		title: 'Rate-limit the public search endpoint',
		status: 'progress',
		priority: 'high',
		assignee: 'DK',
	},
	{
		key: 'ENG-133',
		title: 'Empty states for the board columns',
		status: 'todo',
		priority: 'low',
		assignee: 'SL',
	},
	{
		key: 'ENG-126',
		title: 'Persist column widths across sessions',
		status: 'review',
		priority: 'medium',
		assignee: 'AJ',
	},
	{
		key: 'ENG-147',
		title: 'Audit log for permission changes',
		status: 'todo',
		priority: 'urgent',
		assignee: 'MR',
	},
	{
		key: 'ENG-121',
		title: 'Debounce the live filter input',
		status: 'progress',
		priority: 'low',
		assignee: 'SL',
	},
	{
		key: 'ENG-138',
		title: 'Keyboard shortcut to assign issues',
		status: 'todo',
		priority: 'medium',
		assignee: 'DK',
	},
	{
		key: 'ENG-156',
		title: 'Surface SLA breaches in the inbox',
		status: 'review',
		priority: 'high',
		assignee: 'AJ',
	},
];

const BACKLOG: Issue[] = [
	{
		key: 'ENG-150',
		title: 'Offline draft sync for the composer',
		status: 'todo',
		priority: 'medium',
		assignee: 'SL',
	},
	{
		key: 'ENG-151',
		title: 'Per-team notification digests',
		status: 'todo',
		priority: 'low',
		assignee: 'MR',
	},
	{
		key: 'ENG-152',
		title: 'Docs polish for the public API',
		status: 'todo',
		priority: 'none',
		assignee: 'AJ',
	},
	{
		key: 'ENG-153',
		title: 'Investigate p99 latency on search',
		status: 'todo',
		priority: 'high',
		assignee: 'DK',
	},
	{
		key: 'ENG-154',
		title: 'Keyboard-only triage flow',
		status: 'todo',
		priority: 'medium',
		assignee: 'SL',
	},
];

/** Tailwind's blue / violet / emerald / rose 500 and neutral-500 for the fallback: the badge palette has the same hues. */
const ASSIGNEE_COLOR: Record<string, string> = {
	DK: badgeColors.blue,
	MR: badgeColors.violet,
	AJ: badgeColors.emerald,
	SL: badgeColors.rose,
};
const FALLBACK_ASSIGNEE_COLOR = '#737373';

type PriorityFilter = 'all' | Exclude<PriorityKey, 'none'>;

const PRIORITY_FILTER: SelectItem<PriorityFilter>[] = [
	{ value: 'all', label: 'All priorities' },
	{ value: 'urgent', label: 'Urgent' },
	{ value: 'high', label: 'High' },
	{ value: 'medium', label: 'Medium' },
	{ value: 'low', label: 'Low' },
];

const ORDERINGS = ['Status', 'Priority', 'Created'];

// ── Small pieces ────────────────────────────────────────────────────────

function Avatar(props: { initials: string }) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				width: 24,
				height: 24,
				borderRadius: 12,
				backgroundColor:
					ASSIGNEE_COLOR[props.initials] ?? FALLBACK_ASSIGNEE_COLOR,
			}}
		>
			<text
				style={{
					fontSize: 10,
					lineHeight: '14px',
					fontWeight: weight.semibold,
					color: color.background,
				}}
			>
				{props.initials}
			</text>
		</div>
	);
}

/** The Table's own cell takes text only, so a body cell with a badge or an avatar is drawn here with the same padding as `TableCell`. */
function BodyCell(props: { width?: number; children: JSX.Element }) {
	return (
		<div
			style={{
				flexGrow: props.width === undefined ? 1 : 0,
				flexShrink: props.width === undefined ? 1 : 0,
				flexBasis: props.width === undefined ? 0 : props.width,
				minWidth: 0,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				paddingLeft: sizeChoice() === 'compact' ? 10 : 12,
				paddingRight: sizeChoice() === 'compact' ? 10 : 12,
				paddingTop: sizeChoice() === 'compact' ? 5 : 8,
				paddingBottom: sizeChoice() === 'compact' ? 5 : 8,
			}}
		>
			{props.children}
		</div>
	);
}

/** A badge or an avatar keeps its own width: a column cell would stretch it. */
function Inline(props: { center?: boolean; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: props.center === true ? 'center' : 'flex-start',
			}}
		>
			{props.children}
		</div>
	);
}

function IssueTable(props: { rows: Issue[]; testId: string }) {
	return (
		<Table testId={props.testId}>
			<TableHeader>
				<TableRow>
					<TableHead width={150}>Status</TableHead>
					<TableHead width={90}>ID</TableHead>
					<TableHead>Title</TableHead>
					<TableHead width={110}>Priority</TableHead>
					<TableHead width={70}>Owner</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<For each={props.rows}>
					{(issue, index) => (
						<TableRow index={index()}>
							<BodyCell width={150}>
								<Inline>
									<Badge
										variant="dot"
										size="compact"
										color={STATUS[issue.status].color}
									>
										{STATUS[issue.status].label}
									</Badge>
								</Inline>
							</BodyCell>
							<BodyCell width={90}>
								<text
									style={{
										...siteType.caption,
										fontFamily: MONO,
										color: color.mutedForeground,
									}}
								>
									{issue.key}
								</text>
							</BodyCell>
							<BodyCell>
								<text style={{ ...siteType.body, color: color.foreground }}>
									{issue.title}
								</text>
							</BodyCell>
							<BodyCell width={110}>
								<Inline>
									<Badge size="compact" color={PRIORITY[issue.priority].color}>
										{PRIORITY[issue.priority].label}
									</Badge>
								</Inline>
							</BodyCell>
							<BodyCell width={70}>
								<Inline center>
									<Avatar initials={issue.assignee} />
								</Inline>
							</BodyCell>
						</TableRow>
					)}
				</For>
			</TableBody>
		</Table>
	);
}

const BOARD_COLUMNS: { key: StatusKey; label: string }[] = [
	{ key: 'todo', label: 'Todo' },
	{ key: 'progress', label: 'In Progress' },
	{ key: 'review', label: 'In Review' },
];

function Board(props: { rows: Issue[] }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
			<For each={BOARD_COLUMNS}>
				{(column) => {
					const items = () =>
						props.rows.filter((row) => row.status === column.key);
					return (
						<div
							style={{
								flexGrow: 1,
								flexBasis: 0,
								minWidth: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 10,
							}}
						>
							<div
								style={{
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									gap: 8,
									paddingLeft: 4,
									paddingRight: 4,
								}}
							>
								<Badge
									variant="dot"
									size="compact"
									color={STATUS[column.key].color}
								>
									{column.label}
								</Badge>
								<text
									style={{
										...siteType.caption,
										color: color.mutedForeground,
										fontVariantNumeric: 'tabular-nums',
									}}
								>
									{String(items().length)}
								</text>
							</div>
							<For each={items()}>{(issue) => <BoardCard issue={issue} />}</For>
						</div>
					);
				}}
			</For>
		</div>
	);
}

function BoardCard(props: { issue: Issue }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				padding: 12,
				borderRadius: shape.container,
				backgroundColor: color.surface2,
				boxShadow: shadow(2),
			}}
		>
			<text style={{ ...siteType.body, color: color.foreground }}>
				{props.issue.title}
			</text>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<text
					style={{
						fontSize: 11,
						lineHeight: '14px',
						fontFamily: MONO,
						color: color.mutedForeground,
					}}
				>
					{props.issue.key}
				</text>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Badge size="compact" color={PRIORITY[props.issue.priority].color}>
						{PRIORITY[props.issue.priority].label}
					</Badge>
					<Avatar initials={props.issue.assignee} />
				</div>
			</div>
		</div>
	);
}

// ── Display popover (Dropdown showcase) ─────────────────────────────────

function DisplayMenu() {
	const [open, setOpen] = createSignal(false);
	const [ordering, setOrdering] = createSignal(0);
	const [subIssues, setSubIssues] = createSignal(true);
	return (
		<div
			onMouseDownOutside={() => {
				if (open()) setOpen(false);
			}}
			style={{ position: 'relative' }}
		>
			<Button
				testId="beacon-display"
				variant="tertiary"
				size="compact"
				leadingIcon="settings"
				trailingIcon="chevron-down"
				onClick={() => setOpen((current) => !current)}
			>
				Display
			</Button>
			<Show when={open()}>
				<div
					style={{
						position: 'absolute',
						right: 0,
						top: '100%',
						marginTop: 6,
					}}
				>
					<Dropdown checkedIndex={ordering()} testId="beacon-display-menu">
						<DropdownLabel>Ordering</DropdownLabel>
						<For each={ORDERINGS}>
							{(name, index) => (
								<MenuItem
									index={index()}
									label={name}
									checked={index() === ordering()}
									onSelect={() => setOrdering(index())}
								/>
							)}
						</For>
						<DropdownSeparator />
						<div
							style={{
								paddingLeft: 8,
								paddingRight: 8,
								paddingTop: 6,
								paddingBottom: 6,
							}}
						>
							<Switch
								label="Show sub-issues"
								checked={subIssues()}
								onToggle={() => setSubIssues((current) => !current)}
							/>
						</div>
					</Dropdown>
				</div>
			</Show>
		</div>
	);
}

// ── AI triage panel ─────────────────────────────────────────────────────

type TriageState = 'idle' | 'analyzing' | 'asking' | 'done';

function TriagePanel(props: {
	state: TriageState;
	onAdvance: (next: TriageState) => void;
	onClose: () => void;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				padding: 16,
				borderRadius: shape.container + 4,
				backgroundColor: color.surface2,
				boxShadow: shadow(2),
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Icon
						name="brain"
						size={16}
						strokeWidth={2}
						color={color.foreground}
					/>
					<text
						style={{
							...siteType.subtitle,
							fontWeight: weight.semibold,
							color: color.foreground,
						}}
					>
						AI triage
					</text>
				</div>
				<Button
					testId="beacon-triage-dismiss"
					variant="ghost"
					size="compact"
					onClick={props.onClose}
				>
					Dismiss
				</Button>
			</div>

			<Show when={props.state === 'analyzing'}>
				<ThinkingIndicator />
			</Show>

			<Show when={props.state === 'asking'}>
				<AskUserQuestions
					testId="beacon-triage-ask"
					questions={[
						{
							id: 'triage',
							title: '3 active issues look mis-prioritized. Apply these?',
							multiSelect: true,
							allowOther: true,
							nextLabel: 'Apply changes',
							layout: 'stacked',
							options: [
								{
									id: 'bump',
									title: 'Bump ENG-128 to Urgent',
									description: 'Auth refresh is failing for ~4% of sessions',
								},
								{
									id: 'assign',
									title: 'Assign ENG-131 to @dane',
									description: 'He owns the CI pipeline',
								},
								{
									id: 'defer',
									title: 'Move ENG-152 to Backlog',
									description: 'Docs polish has no deadline',
								},
							],
						},
					]}
					onComplete={() => props.onAdvance('done')}
				/>
			</Show>

			<Show when={props.state === 'done'}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Icon
						name="check"
						size={16}
						strokeWidth={2}
						color={badgeColors.emerald}
					/>
					<text style={{ ...siteType.body, color: color.foreground }}>
						Applied 3 changes · re-ranked the Active view.
					</text>
				</div>
			</Show>
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────

export function Page() {
	const [view, setView] = createSignal(0);
	const [priority, setPriority] = createSignal<PriorityFilter | null>(null);
	const [query, setQuery] = createSignal('');
	const [triage, setTriage] = createSignal<TriageState>('idle');
	let triageTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(triageTimer));

	const filterRows = (rows: Issue[]) => {
		const needle = query().trim().toLowerCase();
		return rows.filter(
			(row) =>
				(priority() === null ||
					priority() === 'all' ||
					row.priority === priority()) &&
				(needle === '' ||
					row.title.toLowerCase().includes(needle) ||
					row.key.toLowerCase().includes(needle)),
		);
	};
	const activeRows = createMemo(() => filterRows(ACTIVE));
	const backlogRows = createMemo(() => filterRows(BACKLOG));

	const startTriage = () => {
		setTriage('analyzing');
		triageTimer = setTimeout(() => setTriage('asking'), ANALYZING_MS);
	};
	const closeTriage = () => {
		clearTimeout(triageTimer);
		setTriage('idle');
	};

	return (
		<ConceptFrame>
			<div
				style={{
					width: '100%',
					height: '100%',
					maxWidth: 960,
					alignSelf: 'center',
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
					paddingLeft: 24,
					paddingRight: 24,
					paddingTop: 48,
					paddingBottom: 48,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						flexWrap: 'wrap',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
						// Lifts the Display popover over the table, whose own positioned root would paint above a static toolbar.
						position: 'relative',
						zIndex: 1,
					}}
				>
					<TabsSubtle
						testId="beacon-view"
						idPrefix="beacon-view"
						selectedIndex={view()}
						onSelect={setView}
					>
						<TabsSubtleItem
							testId="beacon-view-tab-0"
							index={0}
							label="Active"
						/>
						<TabsSubtleItem
							testId="beacon-view-tab-1"
							index={1}
							label="Backlog"
						/>
						<TabsSubtleItem
							testId="beacon-view-tab-2"
							index={2}
							label="Board"
						/>
					</TabsSubtle>

					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 8,
						}}
					>
						<Button
							testId="beacon-triage"
							variant="secondary"
							size="compact"
							leadingIcon="brain"
							onClick={startTriage}
							disabled={triage() !== 'idle'}
						>
							Triage with AI
						</Button>
						<DisplayMenu />
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						flexWrap: 'wrap',
						alignItems: 'flex-end',
						gap: 12,
					}}
				>
					<div style={{ display: 'flex', width: 224 }}>
						<InputGroup>
							<InputField
								testId="beacon-search"
								index={0}
								label="Search"
								icon="search"
								placeholder="Title or ID…"
								value={query()}
								onChange={setQuery}
							/>
						</InputGroup>
					</div>
					<div style={{ display: 'flex', minWidth: 150 }}>
						<Select
							testId="beacon-priority"
							variant="bordered"
							items={PRIORITY_FILTER}
							value={priority()}
							onValueChange={setPriority}
							placeholder="Priority"
						/>
					</div>
				</div>

				<div style={{ flexGrow: 1, minHeight: 0 }}>
					<ScrollArea height="100%">
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
							<Show when={triage() !== 'idle'}>
								<TriagePanel
									state={triage()}
									onAdvance={setTriage}
									onClose={closeTriage}
								/>
							</Show>
							<TabsSubtlePanel
								index={0}
								selectedIndex={view()}
								idPrefix="beacon-view"
							>
								<IssueTable rows={activeRows()} testId="beacon-active" />
							</TabsSubtlePanel>
							<TabsSubtlePanel
								index={1}
								selectedIndex={view()}
								idPrefix="beacon-view"
							>
								<IssueTable rows={backlogRows()} testId="beacon-backlog" />
							</TabsSubtlePanel>
							<TabsSubtlePanel
								index={2}
								selectedIndex={view()}
								idPrefix="beacon-view"
							>
								<Board rows={ACTIVE} />
							</TabsSubtlePanel>
						</div>
					</ScrollArea>
				</div>
			</div>
		</ConceptFrame>
	);
}
