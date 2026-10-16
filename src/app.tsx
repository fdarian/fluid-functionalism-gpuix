import {
	createAppearance,
	type HostElement,
	useGpuixRequired,
} from "@gpuix/solid";
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
import { ScrollArea } from "./components/scroll-area";
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
import { type Demo, type Page, SHOWCASE_SLUG } from "./lib/demo";
import { PageScrollerContext } from "./lib/demo-kit";
import { type PageNav, PageNavContext, usePageNav } from "./lib/page-nav";
import {
	createRightRail,
	RightRailContext,
	RightRailTarget,
} from "./lib/playground";
import {
	ICON_LIBRARIES,
	type IconLibrary,
	iconLibrary,
	setIconLibrary,
} from "./lib/icons";
import {
	createSiteMenu,
	SITE_MENU_SHORTCUT,
	SiteCommandMenu,
} from "./lib/site-command-menu";
import {
	bindSystemScheme,
	color,
	siteType,
	setShapeChoice,
	setSizeChoice,
	setThemeChoice,
	SHAPES,
	type ShapeChoice,
	shapeChoice,
	SIZES,
	type SizeChoice,
	sizeChoice,
	THEMES,
	type ThemeChoice,
	themeChoice,
	weight,
} from "./lib/theme";

const SHOWCASE = SHOWCASE_SLUG;
const PAGE_WIDTH = 600;
export const WINDOW_TITLE = "Fluid Functionalism on gpuix";

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.display,
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
	pages: readonly Page[];
	page: string;
	onPage: (page: string) => void;
	onSearch: () => void;
}) {
	const sidebarPages = (group: Page["group"]) =>
		props.pages.filter(
			(page) => page.group === group && page.listed === "sidebar",
		);
	const row = (page: Page) => (
		<SidebarMenuButton
			testId={`nav-${page.slug}`}
			label={page.title}
			active={props.page === page.slug}
			onClick={() => props.onPage(page.slug)}
		/>
	);
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
					<For each={sidebarPages("Pages")}>{row}</For>
				</SidebarMenu>
				<Show when={sidebarPages("System").length > 0}>
					<SidebarGroupLabel count={sidebarPages("System").length}>
						System
					</SidebarGroupLabel>
					<SidebarMenu>
						<For each={sidebarPages("System")}>{row}</For>
					</SidebarMenu>
				</Show>
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
			<text style={{ ...siteType.body, color: color.mutedForeground }}>
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
function Showcase(props: { demos: readonly Demo[] }) {
	const nav = usePageNav();
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
							onClick={() => nav.navigate(demo.slug)}
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
							<text style={{ ...siteType.body, color: color.foreground }}>
								{demo.title}
							</text>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

export function CustomizeCard() {
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
					...siteType.title,
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
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					Theme
				</text>
				<Select
					testId="theme"
					items={THEMES}
					value={themeChoice()}
					onValueChange={(value: ThemeChoice) => setThemeChoice(value)}
				/>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					height: 28,
				}}
			>
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					Radius
				</text>
				<Select
					testId="radius"
					items={SHAPES}
					value={shapeChoice()}
					onValueChange={(value: ShapeChoice) => setShapeChoice(value)}
				/>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					height: 28,
				}}
			>
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					Size
				</text>
				<Select
					testId="size"
					items={SIZES}
					value={sizeChoice()}
					onValueChange={(value: SizeChoice) => setSizeChoice(value)}
				/>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					height: 28,
				}}
			>
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					Icons
				</text>
				<Select
					testId="icons"
					items={ICON_LIBRARIES}
					value={iconLibrary()}
					onValueChange={(value: IconLibrary) => setIconLibrary(value)}
				/>
			</div>
		</div>
	);
}

export function App(props: {
	demos: readonly Demo[];
	pages: readonly Page[];
	initialPage?: string;
}) {
	const [page, setPage] = createSignal(props.initialPage ?? SHOWCASE);
	const nav: PageNav = { navigate: setPage, current: page };
	const current = (): Demo | undefined =>
		props.demos.find((demo) => demo.slug === page());
	const currentPage = (): Page | undefined =>
		props.pages.find((candidate) => candidate.slug === page());
	const isFull = () => currentPage()?.layout === "full";
	bindSystemScheme(createAppearance());
	const siteMenu = createSiteMenu();
	const rail = createRightRail();
	const [pageScroller, setPageScroller] = createSignal<HostElement>();
	const renderer = useGpuixRequired();
	const setAppearance = renderer.setAppearance;
	if (setAppearance === undefined) {
		throw new Error("This renderer does not expose setAppearance");
	}
	// Native chrome and traffic lights follow the override; "system" clears it.
	createEffect(() => setAppearance.call(renderer, themeChoice()));
	return (
		<AppFrame title={WINDOW_TITLE}>
			<RightRailContext.Provider value={rail}>
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
				<Show when={!isFull()}>
					<AppSidebar
						demos={props.demos}
						pages={props.pages}
						page={page()}
						onPage={setPage}
						onSearch={() => siteMenu.setOpen(true)}
					/>
				</Show>
				<div
					ref={setPageScroller}
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
							width: isFull() ? "100%" : PAGE_WIDTH,
							...(isFull() ? { height: "100%" } : {}),
							flexShrink: 0,
							display: "flex",
							flexDirection: "column",
							gap: isFull() ? 0 : 24,
							paddingTop: isFull() ? 0 : 40,
							paddingBottom: isFull() ? 0 : 40,
						}}
					>
						<PageScrollerContext.Provider value={pageScroller}>
							<PageNavContext.Provider value={nav}>
								<Switch>
									<Match when={page() === SHOWCASE}>
										<Showcase demos={props.demos} />
									</Match>
									<Match when={current()} keyed>
										{(demo: Demo) => <DemoPage demo={demo} />}
									</Match>
									<Match when={currentPage()} keyed>
										{(entry: Page) => <PageBody page={entry} />}
									</Match>
								</Switch>
							</PageNavContext.Provider>
						</PageScrollerContext.Provider>
					</div>
				</div>
				<Show when={!isFull()}>
					<div style={{ width: 296, flexShrink: 0 }}>
						<ScrollArea height="100%" fade>
							<div
								style={{
									display: "flex",
									flexDirection: "column",
									gap: 12,
									padding: 16,
								}}
							>
								<CustomizeCard />
								<RightRailTarget />
							</div>
						</ScrollArea>
					</div>
				</Show>
			</div>
			</RightRailContext.Provider>
			<SiteCommandMenu
				menu={siteMenu}
				demos={props.demos}
				pages={props.pages}
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

/** A "docs" page sits under the heading in the page column; a "full" page is the whole panel. */
function PageBody(props: { page: Page }): JSX.Element {
	return (
		<Show
			when={props.page.layout === "docs"}
			fallback={<props.page.Page />}
		>
			<Heading>{props.page.title}</Heading>
			<props.page.Page />
		</Show>
	);
}
