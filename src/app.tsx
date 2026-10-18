import {
	createAppearance,
	type HostElement,
	MotionConfig,
	useGpuixRequired,
} from '@gpuix/solid';
import {
	type Accessor,
	createEffect,
	createSignal,
	For,
	type JSX,
	Match,
	onCleanup,
	Show,
	Switch,
} from 'solid-js';
import { Button } from '#/components/button';
import { ScrollArea } from '#/components/scroll-area';
import { Select } from '#/components/select';
import {
	Sidebar,
	SidebarContent,
	SidebarMenu,
	SidebarMenuButton,
} from '#/components/sidebar';
import { Tooltip } from '#/components/tooltip';
import { BentoGrid } from '#/home/bento-grid';
import { AppFrame, PANEL_INNER_RADIUS } from '#/lib/app-frame';
import { kindDotColor } from '#/lib/changelog/kind-style';
import { marks } from '#/lib/changelog/releases';
import { PageScrollContext, PageScrollerContext } from '#/lib/cull';
import { type Demo, type Page, SHOWCASE_SLUG } from '#/lib/demo';
import { MONO } from '#/lib/doc-page';
import {
	ICON_LIBRARIES,
	type IconLibrary,
	iconLibrary,
	setIconLibrary,
} from '#/lib/icons';
import { createMeasuredHeight } from '#/lib/measured-height';
import { openUrl } from '#/lib/open-url';
import { type PageNav, PageNavContext, usePageNav } from '#/lib/page-nav';
import {
	createRightRail,
	RightRailContext,
	RightRailTarget,
} from '#/lib/playground';
import {
	createSiteMenu,
	SITE_MENU_SHORTCUT,
	SiteCommandMenu,
} from '#/lib/site-command-menu';
import { buildStarterPrompt, SITE_URL } from '#/lib/starter-prompt';
import {
	bindSystemScheme,
	color,
	height,
	SHAPES,
	type ShapeChoice,
	SIZES,
	type SizeChoice,
	type as scale,
	setShapeChoice,
	setSizeChoice,
	shapeChoice,
	siteType,
	sizeChoice,
	THEMES,
	type ThemeChoice,
	themeChoice,
	weight,
} from '#/lib/theme';
import { changeTheme, ThemeFade } from '#/lib/theme-fade';

const SHOWCASE = SHOWCASE_SLUG;
const PAGE_WIDTH = 600;
export const WINDOW_TITLE = 'Fluid Functionalism on gpuix';

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.display,
				fontVariationSettings: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/**
 * One section of the site nav, as `NavGroup` in the source's `app/components/sidebar.tsx`: an
 * 8px-padded group, 16px above a labelled one. The name is foreground, not the
 * library label's muted, with the count muted beside it and a hairline under
 * both. The hairline runs from the name's first letter to the count's last
 * digit and leaves 4px before the first row, so its hover fill clears the line.
 */
function NavGroup(props: {
	label?: string;
	count?: number;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flexShrink: 0,
				paddingTop: props.label === undefined ? 8 : 16,
				paddingBottom: 8,
			}}
		>
			<Show when={props.label}>
				{(label: Accessor<string>) => (
					<>
						<div
							style={{
								height: height.groupLabel,
								flexShrink: 0,
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								paddingLeft: 8,
								paddingRight: 8,
							}}
						>
							<text
								style={{
									...scale.caption,
									color: color.foreground,
									flexGrow: 1,
								}}
							>
								{label()}
							</text>
							<div
								style={{
									height: 20,
									minWidth: 20,
									paddingLeft: 4,
									paddingRight: 4,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<text
									style={{
										...siteType.caption,
										color: color.mutedForeground,
										fontVariantNumeric: 'tabular-nums',
									}}
								>
									{props.count}
								</text>
							</div>
						</div>
						<div
							style={{
								height: 1,
								flexShrink: 0,
								marginLeft: 8,
								marginRight: 12,
								marginBottom: 4,
								backgroundColor: color.border,
							}}
						/>
					</>
				)}
			</Show>
			<SidebarMenu>{props.children}</SidebarMenu>
		</div>
	);
}

function AppSidebar(props: {
	demos: readonly Demo[];
	pages: readonly Page[];
	page: string;
	onPage: (page: string) => void;
	onSearch: () => void;
}) {
	const sidebarPages = (group: Page['group']) =>
		props.pages.filter(
			(page) => page.group === group && page.listed === 'sidebar',
		);
	const sidebarDemos = () =>
		props.demos.filter((demo) => demo.listed === 'sidebar');
	const newDot = (isNew: boolean) =>
		isNew ? { dot: kindDotColor('new'), dotLabel: 'New' } : {};
	const row = (page: Page, isNew: boolean) => (
		<SidebarMenuButton
			testId={`nav-${page.slug}`}
			label={page.title}
			{...newDot(isNew)}
			active={props.page === page.slug}
			onClick={() => props.onPage(page.slug)}
		/>
	);
	return (
		<Sidebar leftCornerRadius={PANEL_INNER_RADIUS}>
			<SidebarContent>
				{/* The source's SidebarContent is `py-2`: the first group starts 8px lower than the library's content does. */}
				<div style={{ height: 8, flexShrink: 0 }} />
				<NavGroup>
					<SidebarMenuButton
						testId="nav-search"
						icon="search"
						label="Search"
						badge={SITE_MENU_SHORTCUT}
						badgeType={siteType.caption}
						onClick={props.onSearch}
					/>
				</NavGroup>
				<NavGroup>
					<SidebarMenuButton
						testId="nav-showcase"
						label="Showcase"
						active={props.page === SHOWCASE}
						onClick={() => props.onPage(SHOWCASE)}
					/>
					<For each={sidebarPages('Pages')}>
						{/* The Changelog page itself is new: dotted by hand, unlike the docs rows, which follow the latest release. */}
						{(page) => row(page, page.slug === 'changelog')}
					</For>
				</NavGroup>
				<Show when={sidebarPages('System').length > 0}>
					<NavGroup label="System" count={sidebarPages('System').length}>
						<For each={sidebarPages('System')}>
							{(page) => row(page, marks.new.includes(page.slug))}
						</For>
					</NavGroup>
				</Show>
				<NavGroup label="Components" count={sidebarDemos().length}>
					<For each={sidebarDemos()}>
						{(demo) => (
							<SidebarMenuButton
								testId={`nav-${demo.slug}`}
								label={demo.title}
								{...newDot(marks.new.includes(demo.slug))}
								active={props.page === demo.slug}
								onClick={() => props.onPage(demo.slug)}
							/>
						)}
					</For>
				</NavGroup>
			</SidebarContent>
		</Sidebar>
	);
}

const COPIED_MS = 2000;

function Hero() {
	const nav = usePageNav();
	const [copied, setCopied] = createSignal(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(resetTimer));
	const copyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(buildStarterPrompt(themeChoice()));
		} catch (error) {
			console.error('Copy install prompt failed', error);
			return;
		}
		setCopied(true);
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => setCopied(false), COPIED_MS);
	};
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
			<Heading>Fluid Functionalism</Heading>
			<text style={{ ...siteType.body, color: color.mutedForeground }}>
				Refined UI components with satisfying hover.
			</text>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 8,
					paddingTop: 12,
				}}
			>
				<Button
					testId="hero-copy"
					size="compact"
					leadingIcon={copied() ? 'check' : 'copy'}
					onClick={copyPrompt}
				>
					Copy install prompt
				</Button>
				<Button
					testId="hero-learn-more"
					size="compact"
					variant="secondary"
					onClick={() => nav.navigate('introduction')}
				>
					Learn more
				</Button>
				<Button
					testId="hero-see-demo"
					size="compact"
					variant="ghost"
					onClick={() => openUrl(`${SITE_URL}/demo`)}
				>
					See demo
				</Button>
			</div>
		</div>
	);
}

function HeroArrows() {
	const nav = usePageNav();
	// Square icon buttons follow the site-wide size step.
	const iconSize = () => (sizeChoice() === 'compact' ? 'icon-compact' : 'icon');
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 4,
				flexShrink: 0,
			}}
		>
			<Button
				testId="hero-prev"
				variant="ghost"
				size={iconSize()}
				icon="arrow-left"
				disabled
				aria-label="No previous page"
			/>
			<Tooltip
				content={
					<text style={{ ...siteType.caption, color: color.background }}>
						{'Introduction  '}
						<span style={{ fontFamily: MONO, opacity: 0.5 }}>{'\u2192'}</span>
					</text>
				}
			>
				<Button
					testId="hero-next"
					variant="ghost"
					size={iconSize()}
					icon="arrow-right"
					aria-label="Next: Introduction"
					onClick={() => nav.navigate('introduction')}
				/>
			</Tooltip>
		</div>
	);
}

/** The hero over the bento grid of live component previews. */
function Showcase() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
			<div
				style={{
					width: '100%',
					maxWidth: 680,
					alignSelf: 'center',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 16,
					paddingLeft: 24,
					paddingRight: 24,
				}}
			>
				<Hero />
				<HeroArrows />
			</div>
			<div
				style={{
					width: '100%',
					maxWidth: 1200,
					alignSelf: 'center',
					paddingLeft: 24,
					paddingRight: 24,
				}}
			>
				<BentoGrid />
			</div>
		</div>
	);
}

export function CustomizeCard() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				padding: 16,
				borderRadius: 12,
				backgroundColor: color.surface2,
			}}
		>
			<text
				style={{
					...siteType.title,
					fontVariationSettings: weight.semibold,
					color: color.foreground,
				}}
			>
				Make them yours
			</text>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
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
					onValueChange={(value: ThemeChoice) => changeTheme(value)}
				/>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
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
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
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
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
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
	const navigate = (slug: string) => setPage(slug);
	const nav: PageNav = { navigate, current: page };
	const current = (): Demo | undefined =>
		props.demos.find((demo) => demo.slug === page());
	const currentPage = (): Page | undefined =>
		props.pages.find((candidate) => candidate.slug === page());
	const isFull = () => currentPage()?.layout === 'full';
	bindSystemScheme(createAppearance());
	const siteMenu = createSiteMenu();
	const rail = createRightRail();
	const [pageScroller, setPageScroller] = createSignal<HostElement>();
	const scrollListeners = new Set<() => void>();
	const onPageScroll = (listener: () => void) => {
		scrollListeners.add(listener);
		return () => scrollListeners.delete(listener);
	};
	const viewport = createMeasuredHeight();
	const renderer = useGpuixRequired();
	const setAppearance = renderer.setAppearance;
	if (setAppearance === undefined) {
		throw new Error('This renderer does not expose setAppearance');
	}
	// Native chrome and traffic lights follow the override; "system" clears it.
	createEffect(() => setAppearance.call(renderer, themeChoice()));
	return (
		<MotionConfig reducedMotion="user">
			<ThemeFade />
			{/* The viewport the source's breakpoints read (home grid columns): gpuix has no media queries, so this container is as wide as the window. */}
			<div
				testId="viewport"
				style={{
					width: '100%',
					height: '100%',
					containerType: 'inline-size',
					containerName: 'viewport',
				}}
			>
				<AppFrame title={WINDOW_TITLE}>
					<RightRailContext.Provider value={rail}>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								width: '100%',
								height: '100%',
								backgroundColor: color.background,
								borderRadius: PANEL_INNER_RADIUS,
							}}
						>
							<Show when={!isFull()}>
								<AppSidebar
									demos={props.demos}
									pages={props.pages}
									page={page()}
									onPage={navigate}
									onSearch={() => siteMenu.setOpen(true)}
								/>
							</Show>
							<div
								ref={setPageScroller}
								onLayout={viewport.onLayout}
								onScroll={() => {
									for (const listener of scrollListeners) listener();
								}}
								style={{
									flexGrow: 1,
									minWidth: 0,
									display: 'flex',
									flexDirection: 'row',
									overflowY: 'scroll',
								}}
							>
								<div
									style={{
										flexGrow: 1,
										minWidth: 0,
										display: 'flex',
										flexDirection: 'column',
										alignItems: 'center',
									}}
								>
									<div
										style={{
											width:
												isFull() || page() === SHOWCASE ? '100%' : PAGE_WIDTH,
											...(isFull() ? { height: '100%' } : {}),
											flexShrink: 0,
											display: 'flex',
											flexDirection: 'column',
											gap: isFull() ? 0 : 24,
											paddingTop: isFull() ? 0 : 40,
											paddingBottom: isFull() ? 0 : 40,
										}}
									>
										<PageScrollerContext.Provider value={pageScroller}>
											<PageScrollContext.Provider value={onPageScroll}>
												<PageNavContext.Provider value={nav}>
													<Switch>
														<Match when={page() === SHOWCASE}>
															<Showcase />
														</Match>
														<Match when={current()} keyed>
															{(demo: Demo) => <DemoPage demo={demo} />}
														</Match>
														<Match when={currentPage()} keyed>
															{(entry: Page) => <PageBody page={entry} />}
														</Match>
													</Switch>
												</PageNavContext.Provider>
											</PageScrollContext.Provider>
										</PageScrollerContext.Provider>
									</div>
								</div>
								{/* Sticky needs a definite height to stick at, and gpuix has no `100svh`: it is the scroller's own, measured. */}
								<Show when={!isFull() && viewport.height()}>
									{(height: Accessor<number>) => (
										<div
											style={{
												position: 'sticky',
												top: 0,
												alignSelf: 'flex-start',
												width: 296,
												height: height(),
												flexShrink: 0,
											}}
										>
											<ScrollArea height="100%" fade>
												<div
													style={{
														display: 'flex',
														flexDirection: 'column',
														gap: 12,
														padding: 16,
													}}
												>
													<Show
														when={currentPage()?.Rail}
														fallback={<CustomizeCard />}
														keyed
													>
														{(Rail: () => JSX.Element) => <Rail />}
													</Show>
													<RightRailTarget />
												</div>
											</ScrollArea>
										</div>
									)}
								</Show>
							</div>
						</div>
					</RightRailContext.Provider>
					<SiteCommandMenu
						menu={siteMenu}
						demos={props.demos}
						pages={props.pages}
						showcase={SHOWCASE}
						current={page()}
						onPage={navigate}
					/>
				</AppFrame>
			</div>
		</MotionConfig>
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
		<Show when={props.page.layout === 'docs'} fallback={<props.page.Page />}>
			<Heading>{props.page.heading ?? props.page.title}</Heading>
			<props.page.Page />
		</Show>
	);
}
