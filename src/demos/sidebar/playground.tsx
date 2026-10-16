import { type Accessor, createSignal, For, type JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Button } from "#/components/button";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarSearchField,
} from "#/components/sidebar";
import { Tooltip } from "#/components/tooltip";
import type { IconName } from "#/lib/icons";
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from "#/lib/playground";
import { color, shape, surface } from "#/lib/theme";
import {
	type CalloutVariant,
	FooterCallout,
	FooterCalloutStack,
} from "./callout";

type Stack = "horizontal" | "vertical";
type Count2 = 0 | 1 | 2;

interface PlayState {
	headerStack: Stack;
	headerActions: Count2;
	l1Primary: "threads" | "menu";
	l1Children: boolean;
	l1Badges: boolean;
	l2Icon: boolean;
	l2Badges: boolean;
	footerStack: Stack;
	footerActions: Count2;
	footerCallout: "none" | CalloutVariant;
	footerCalloutStacked: boolean;
}

const DEFAULT_STATE: PlayState = {
	headerStack: "vertical",
	headerActions: 1,
	l1Primary: "threads",
	l1Children: false,
	l1Badges: false,
	l2Icon: true,
	l2Badges: true,
	footerStack: "horizontal",
	footerActions: 2,
	footerCallout: "none",
	footerCalloutStacked: false,
};

interface PlayRow {
	label: string;
	badge: string;
	icon?: IconName;
	active?: boolean;
}

const THREADS: readonly PlayRow[] = [
	{ label: "Sidebar component height in demo", badge: "2", active: true },
	{ label: "Sidebar component creation", badge: "5" },
	{ label: "Dark mode token audit", badge: "3" },
	{ label: "Scrollbar fade regression", badge: "1" },
	{ label: "Registry deploy pipeline", badge: "7" },
];

const MENU: readonly PlayRow[] = [
	{ icon: "home", label: "Home", badge: "3", active: true },
	{ icon: "inbox", label: "Inbox", badge: "12" },
	{ icon: "calendar", label: "Calendar", badge: "5" },
	{ icon: "bell", label: "Notifications", badge: "8" },
	{ icon: "star", label: "Favorites", badge: "2" },
];

const LEVEL_2 = [
	{ icon: "folder", label: "Design system", badge: "4" },
	{ icon: "folder", label: "Marketing site", badge: "2" },
	{ icon: "folder", label: "Travel app" },
] as const;

const SECTION_LABELS = {
	threads: ["fluid-functionalism", "portfolio-site"],
	menu: ["Platform", "Workspace"],
} as const;

const SEARCH_SHORTCUT = "⌘K";

const HEADER_ACTIONS = [
	{ icon: "plus", label: "New" },
	{ icon: "users", label: "Invite" },
] as const;

const FOOTER_ACTIONS = [
	{ icon: "settings", label: "Settings" },
	{ icon: "moon", label: "Theme" },
] as const;

const SHELL_HEIGHT = 520;

const COUNT_OPTIONS = [
	{ value: "0", label: "None" },
	{ value: "1", label: "One" },
	{ value: "2", label: "Two" },
] as const;

const STACK_OPTIONS = [
	{ value: "horizontal", label: "Horizontal" },
	{ value: "vertical", label: "Vertical" },
] as const;

function countOf(value: "0" | "1" | "2"): Count2 {
	return Number(value) as Count2;
}

/** A 24px ghost icon button with a tooltip: the horizontal header's and footer's action. */
function IconAction(props: {
	icon: IconName;
	label: string;
	side: "top" | "bottom";
	testId: string;
}) {
	return (
		<Tooltip content={props.label} side={props.side}>
			<Button
				testId={props.testId}
				variant="ghost"
				size="icon-compact"
				icon={props.icon}
				aria-label={props.label}
			/>
		</Tooltip>
	);
}

function HorizontalRow(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 4,
				paddingRight: 6,
			}}
		>
			{props.children}
		</div>
	);
}

export function SidebarPlayground() {
	const [state, setState] = createStore<PlayState>({ ...DEFAULT_STATE });
	const [closedRows, setClosedRows] = createSignal<Record<string, boolean>>({});
	// The row clicked last: leaf and sub rows are selectable, so the active fill follows the pointer. Until the first click the data's own active row holds it.
	const [selected, setSelected] = createSignal<string>();

	const isRowOpen = (key: string) => closedRows()[key] !== true;
	const toggleRow = (key: string) =>
		setClosedRows({ ...closedRows(), [key]: isRowOpen(key) });

	const shuffle = () => {
		// Selection keys are row labels, which differ between the two primary elements.
		setSelected(undefined);
		setState({
			headerStack: pick(["horizontal", "vertical"] as const),
			headerActions: pick([0, 1, 2, 2] as const),
			l1Primary: pick(["threads", "menu"] as const),
			l1Children: Math.random() > 0.5,
			l1Badges: Math.random() > 0.5,
			l2Icon: Math.random() > 0.4,
			l2Badges: Math.random() > 0.5,
			footerStack: pick(["horizontal", "horizontal", "vertical"] as const),
			footerActions: pick([0, 1, 2, 2] as const),
			footerCallout: pick(["none", "inline", "banner", "banner"] as const),
			footerCalloutStacked: Math.random() > 0.65,
		});
	};

	const headerActions = () => HEADER_ACTIONS.slice(0, state.headerActions);
	const footerActions = () => FOOTER_ACTIONS.slice(0, state.footerActions);
	// Only icon menus nest; a thread row is a leaf.
	const canNest = () => state.l1Primary === "menu";
	const nests = () => canNest() && state.l1Children;
	const rows = () => (state.l1Primary === "threads" ? THREADS : MENU);
	const showFooter = () =>
		footerActions().length > 0 || state.footerCallout !== "none";
	// A callout with nothing under it sits on the rail's bottom edge.
	const calloutOnly = () =>
		state.footerCallout !== "none" && footerActions().length === 0;
	const calloutVariant = () =>
		state.footerCallout === "none" ? undefined : state.footerCallout;

	const section = (index: 0 | 1) => (
		<>
			<SidebarGroupLabel>
				{SECTION_LABELS[state.l1Primary][index]}
			</SidebarGroupLabel>
			<SidebarMenu>
				<For each={rows().slice(index === 0 ? 0 : 3, index === 0 ? 3 : 5)}>
					{(row) => {
						const key = `${index}/${row.label}`;
						const active = () =>
							selected() === undefined
								? row.active === true
								: selected() === key;
						return (
							<>
								<SidebarMenuButton
									testId={`play-row-${row.label}`}
									icon={row.icon}
									label={row.label}
									badge={state.l1Badges ? row.badge : undefined}
									active={active()}
									trailingIcon={
										nests()
											? () =>
													isRowOpen(key) ? "chevron-down" : "chevron-right"
											: undefined
									}
									onClick={() => (nests() ? toggleRow(key) : setSelected(key))}
								/>
								<Show when={nests()}>
									<SidebarMenuSub open={isRowOpen(key)}>
										<For each={LEVEL_2}>
											{(child) => (
												<SidebarMenuButton
													testId={`play-sub-${row.label}-${child.label}`}
													level={1}
													icon={state.l2Icon ? child.icon : undefined}
													label={child.label}
													badge={
														state.l2Badges && "badge" in child
															? child.badge
															: undefined
													}
													active={selected() === `${key}/${child.label}`}
													disabled={() => !isRowOpen(key)}
													onClick={() => setSelected(`${key}/${child.label}`)}
												/>
											)}
										</For>
									</SidebarMenuSub>
								</Show>
							</>
						);
					}}
				</For>
			</SidebarMenu>
		</>
	);

	const shell = (
		<div
			style={{
				width: "100%",
				height: SHELL_HEIGHT,
				display: "flex",
				flexDirection: "row",
				overflow: "hidden",
				borderRadius: shape.container,
				backgroundColor: color.background,
			}}
		>
			{/* The inset layout, which has no control here: the rail with a vertical gutter beside a rounded card. */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
					paddingTop: 8,
					paddingBottom: 8,
				}}
			>
				<Sidebar>
					<SidebarHeader>
						<Show
							when={state.headerStack === "horizontal"}
							fallback={
								<div style={{ display: "flex", flexDirection: "column" }}>
									<SidebarSearchField
										placeholder="Search"
										shortcut={SEARCH_SHORTCUT}
									/>
									<Show when={headerActions().length > 0}>
										<SidebarMenu>
											<For each={headerActions()}>
												{(action) => (
													<SidebarMenuButton
														testId={`play-header-${action.label}`}
														icon={action.icon}
														label={action.label}
													/>
												)}
											</For>
										</SidebarMenu>
									</Show>
								</div>
							}
						>
							<HorizontalRow>
								<div style={{ flexGrow: 1 }} />
								<IconAction
									testId="play-header-search"
									icon="search"
									label="Search"
									side="bottom"
								/>
								<For each={headerActions()}>
									{(action) => (
										<IconAction
											testId={`play-header-${action.label}`}
											icon={action.icon}
											label={action.label}
											side="bottom"
										/>
									)}
								</For>
							</HorizontalRow>
						</Show>
					</SidebarHeader>
					<SidebarContent>
						{section(0)}
						{section(1)}
					</SidebarContent>
					<Show when={showFooter()}>
						<SidebarFooter flushBottom={calloutOnly()}>
							<Show when={calloutVariant()}>
								{(variant: Accessor<CalloutVariant>) => (
									<Show
										when={state.footerCalloutStacked}
										fallback={
											<FooterCallout
												variant={variant()}
												onDismiss={() => setState("footerCallout", "none")}
											/>
										}
									>
										<FooterCalloutStack
											variant={variant()}
											onEmpty={() => setState("footerCallout", "none")}
										/>
									</Show>
								)}
							</Show>
							<Show
								when={
									state.footerStack === "vertical" && footerActions().length > 0
								}
							>
								<SidebarMenu>
									<For each={footerActions()}>
										{(action) => (
											<SidebarMenuButton
												testId={`play-footer-${action.label}`}
												icon={action.icon}
												label={action.label}
											/>
										)}
									</For>
								</SidebarMenu>
							</Show>
							<Show
								when={
									state.footerStack === "horizontal" &&
									footerActions().length > 0
								}
							>
								<HorizontalRow>
									<For each={footerActions()}>
										{(action) => (
											<IconAction
												testId={`play-footer-${action.label}`}
												icon={action.icon}
												label={action.label}
												side="top"
											/>
										)}
									</For>
								</HorizontalRow>
							</Show>
						</SidebarFooter>
					</Show>
				</Sidebar>
			</div>
			<div
				style={{
					flexGrow: 1,
					minWidth: 0,
					margin: 8,
					marginLeft: 0,
					borderRadius: shape.container,
					backgroundColor: surface(2),
				}}
			/>
		</div>
	);

	return (
		<PlaygroundLayout
			minHeight={SHELL_HEIGHT}
			preview={shell}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Header" />
					<PlayField label="Stacking">
						<PlaySelect
							testId="play-header-stack"
							value={state.headerStack}
							onChange={(value) => setState("headerStack", value)}
							options={STACK_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Header actions">
						<PlaySelect
							testId="play-header-actions"
							value={String(state.headerActions) as "0" | "1" | "2"}
							onChange={(value) => setState("headerActions", countOf(value))}
							options={COUNT_OPTIONS}
						/>
					</PlayField>

					<PlayDivider />
					<PlaySection label="Content level 1" />
					<PlayField label="Primary element">
						<PlaySelect
							testId="play-l1-primary"
							value={state.l1Primary}
							onChange={(value) => {
								setState("l1Primary", value);
								setSelected(undefined);
							}}
							options={[
								{ value: "menu", label: "Menu" },
								{ value: "threads", label: "Thread" },
							]}
						/>
					</PlayField>
					{/* Threads are leaves: a discussion doesn't own a sub-tree. */}
					<PlaySwitch
						testId="play-l1-children"
						label="Has children"
						checked={nests()}
						onToggle={() => setState("l1Children", !state.l1Children)}
						disabled={!canNest()}
					/>
					<PlaySwitch
						testId="play-l1-badges"
						label="Badges"
						checked={state.l1Badges}
						onToggle={() => setState("l1Badges", !state.l1Badges)}
					/>

					<PlayDivider />
					<PlaySection label="Content level 2" />
					<PlaySwitch
						testId="play-l2-icon"
						label="Leading icon"
						checked={nests() && state.l2Icon}
						onToggle={() => setState("l2Icon", !state.l2Icon)}
						disabled={!nests()}
					/>
					<PlaySwitch
						testId="play-l2-badges"
						label="Badges"
						checked={nests() && state.l2Badges}
						onToggle={() => setState("l2Badges", !state.l2Badges)}
						disabled={!nests()}
					/>

					<PlayDivider />
					<PlaySection label="Footer" />
					<PlayField label="Stacking">
						<PlaySelect
							testId="play-footer-stack"
							value={state.footerStack}
							onChange={(value) => setState("footerStack", value)}
							options={STACK_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Footer actions">
						<PlaySelect
							testId="play-footer-actions"
							value={String(state.footerActions) as "0" | "1" | "2"}
							onChange={(value) => setState("footerActions", countOf(value))}
							options={COUNT_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Callout">
						<PlaySelect
							testId="play-callout"
							value={state.footerCallout}
							onChange={(value) => setState("footerCallout", value)}
							options={[
								{ value: "none", label: "None" },
								{ value: "inline", label: "Inline" },
								{ value: "banner", label: "Banner" },
							]}
						/>
					</PlayField>
					{/* Either anatomy stacks: a sonner-style pile of three cards. */}
					<PlaySwitch
						testId="play-callout-stacked"
						label="Stacked"
						checked={
							state.footerCallout !== "none" && state.footerCalloutStacked
						}
						onToggle={() =>
							setState("footerCalloutStacked", !state.footerCalloutStacked)
						}
						disabled={state.footerCallout === "none"}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}
