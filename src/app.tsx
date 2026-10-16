import { createAppearance, useGpuixRequired } from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	For,
	type JSX,
	Match,
	Show,
	Switch,
} from "solid-js";
import { Button } from "./components/button";
import { Select } from "./components/select";
import {
	Sidebar,
	SidebarContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
} from "./components/sidebar";
import { AppFrame, PANEL_INNER_RADIUS } from "./lib/app-frame";
import type { Demo } from "./lib/demo";
import {
	createSiteMenu,
	SITE_MENU_SHORTCUT,
	SiteCommandMenu,
} from "./lib/site-command-menu";
import {
	bindSystemScheme,
	color,
	setThemeChoice,
	type ThemeChoice,
	THEMES,
	themeChoice,
	type as scale,
	weight,
} from "./lib/theme";

const SHOWCASE = "showcase";
const PAGE_WIDTH = 600;
export const WINDOW_TITLE = "Fluid Functionalism on gpuix";

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				...scale.display,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

function AppSidebar(props: {
	demos: readonly Demo[];
	page: string;
	onPage: (page: string) => void;
	onSearch: () => void;
}) {
	return (
		<Sidebar leftCornerRadius={PANEL_INNER_RADIUS}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuButton
						testId="nav-search"
						icon="search"
						label="Search"
						badge={SITE_MENU_SHORTCUT}
						onClick={props.onSearch}
					/>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu>
					<SidebarMenuButton
						testId="nav-showcase"
						label="Showcase"
						active={props.page === SHOWCASE}
						onClick={() => props.onPage(SHOWCASE)}
					/>
				</SidebarMenu>
				<SidebarGroupLabel count={props.demos.length}>
					Components
				</SidebarGroupLabel>
				<SidebarMenu>
					<For each={props.demos}>
						{(demo) => (
							<SidebarMenuButton
								testId={`nav-${demo.slug}`}
								label={demo.title}
								active={props.page === demo.slug}
								onClick={() => props.onPage(demo.slug)}
							/>
						)}
					</For>
				</SidebarMenu>
			</SidebarContent>
		</Sidebar>
	);
}

function Hero() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<Heading>Fluid Functionalism</Heading>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				Refined UI components with satisfying hover.
			</text>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					paddingTop: 12,
				}}
			>
				<Button size="compact" leadingIcon="copy">
					Copy install prompt
				</Button>
				<Button size="compact" variant="secondary">
					Learn more
				</Button>
				<Button size="compact" variant="ghost">
					See demo
				</Button>
			</div>
		</div>
	);
}

/** A card per discovered demo; the landing page is a table of contents. */
function Showcase(props: {
	demos: readonly Demo[];
	onPage: (page: string) => void;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			<Hero />
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					flexWrap: "wrap",
					gap: 12,
				}}
			>
				<For each={props.demos}>
					{(demo) => (
						<div
							testId={`card-${demo.slug}`}
							role="button"
							onClick={() => props.onPage(demo.slug)}
							style={{
								width: 144,
								height: 72,
								display: "flex",
								alignItems: "flex-end",
								padding: 12,
								borderRadius: 12,
								borderWidth: 1,
								borderColor: color.border,
								backgroundColor: color.surface2,
								cursor: "pointer",
								hover: { backgroundColor: color.hover },
							}}
						>
							<text style={{ ...scale.body, color: color.foreground }}>
								{demo.title}
							</text>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

function CustomizeCard() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 12,
				padding: 16,
				borderRadius: 12,
				backgroundColor: color.surface2,
			}}
		>
			<text
				style={{
					...scale.title,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				Make them yours
			</text>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					height: 28,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					Theme
				</text>
				<Select
					testId="theme"
					items={THEMES}
					value={themeChoice()}
					onValueChange={(value: ThemeChoice) => setThemeChoice(value)}
				/>
			</div>
		</div>
	);
}

export function App(props: { demos: readonly Demo[]; initialPage?: string }) {
	const [page, setPage] = createSignal(props.initialPage ?? SHOWCASE);
	const current = (): Demo | undefined =>
		props.demos.find((demo) => demo.slug === page());
	bindSystemScheme(createAppearance());
	const siteMenu = createSiteMenu();
	const renderer = useGpuixRequired();
	const setAppearance = renderer.setAppearance;
	if (setAppearance === undefined) {
		throw new Error("This renderer does not expose setAppearance");
	}
	// Native chrome and traffic lights follow the override; "system" clears it.
	createEffect(() => setAppearance.call(renderer, themeChoice()));
	return (
		<AppFrame title={WINDOW_TITLE}>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					width: "100%",
					height: "100%",
					backgroundColor: color.background,
					borderRadius: PANEL_INNER_RADIUS,
				}}
			>
				<AppSidebar
					demos={props.demos}
					page={page()}
					onPage={setPage}
					onSearch={() => siteMenu.setOpen(true)}
				/>
				<div
					style={{
						flexGrow: 1,
						minWidth: 0,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						overflowY: "scroll",
					}}
				>
					<div
						style={{
							width: PAGE_WIDTH,
							flexShrink: 0,
							display: "flex",
							flexDirection: "column",
							gap: 24,
							paddingTop: 40,
							paddingBottom: 40,
						}}
					>
						<Switch>
							<Match when={page() === SHOWCASE}>
								<Showcase demos={props.demos} onPage={setPage} />
							</Match>
							<Match when={current()} keyed>
								{(demo: Demo) => <DemoPage demo={demo} />}
							</Match>
						</Switch>
					</div>
				</div>
				<div style={{ width: 296, flexShrink: 0, padding: 16 }}>
					<CustomizeCard />
				</div>
			</div>
			<SiteCommandMenu
				menu={siteMenu}
				demos={props.demos}
				showcase={SHOWCASE}
				onPage={setPage}
			/>
		</AppFrame>
	);
}

function DemoPage(props: { demo: Demo }): JSX.Element {
	return (
		<>
			<Heading>{props.demo.title}</Heading>
			<props.demo.Demo />
		</>
	);
}
