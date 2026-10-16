import type { JSX } from "solid-js";
import type { IconRef } from "./icons";

/**
 * Drives one demo page from scripts/screenshots.tsx. Each helper settles the
 * UI afterwards, so a scenario reads as a script of what a person would do.
 */
export interface ShotContext {
	/** Window-space centre of the element with this `testId`. */
	centerOf(testId: string): { x: number; y: number };
	/** Focus the element, as a script would: a pointer press that opens a popup cannot run in the test renderer. */
	focus(testId: string): Promise<void>;
	hover(testId: string): Promise<void>;
	click(testId: string): Promise<void>;
	/** Mouse button down / up on an element (hold a press while capturing). */
	down(testId: string): Promise<void>;
	up(testId: string): Promise<void>;
	/** Space-separated keystrokes, e.g. `"s o l"` or `"down enter"`. */
	press(keystrokes: string): Promise<void>;
	/** Pointer to a window position, e.g. to leave a popup. */
	moveTo(x: number, y: number): Promise<void>;
	clickAt(x: number, y: number): Promise<void>;
	/** A wheel tick at a window position. The test harness keeps GPUI's sign, so negative `deltaY` scrolls down and negative `deltaX` scrolls right: the reverse of the positive-down deltas `onWheel` handlers see. */
	scroll(x: number, y: number, deltaX: number, deltaY: number): Promise<void>;
	/** Pointer to a window position with the left button held, e.g. mid-drag. */
	moveHeld(x: number, y: number): Promise<void>;
	/** Wait for timers and springs. */
	settle(ms?: number): Promise<void>;
	/** Throws if the painted text does not (or does) contain `text`. */
	expectText(text: string, present: boolean): void;
	/** Writes `screenshots/<demo>/<name>.png`. */
	capture(name: string): void;
	/** The DOM `id` of the element with this `testId`; throws when it has none. */
	idOf(testId: string): string;
	/**
	 * What assistive technology gets for an element, from the last painted
	 * frame: given as a `testId`, or as a DOM `id` (e.g. a panel a trigger
	 * `controls`). Relations (`controls`, `labelled_by`, ...) are lists of DOM
	 * `id`s. Throws when the element has no node.
	 */
	aria(target: string): AriaSnapshot;
	/** Whether the element is in the accessibility tree. */
	hasAriaNode(target: string): boolean;
	/** How many elements Tab reaches in the last painted frame. */
	tabStopCount(): number;
	/** Throws unless every given key of `aria(target)` equals the expected value. */
	expectAria(target: string, expected: AriaSnapshot): void;
}

export type AriaSnapshot = Record<string, unknown>;

/**
 * What a file in `src/demos/` exports. The app finds these at startup, so a
 * new component adds a demo file and never edits a shared one.
 */
export interface DemoModule {
	/** Sidebar label and page heading. */
	title: string;
	group: "Components";
	/** The page body: one or more `DemoCard`s. */
	Demo: () => JSX.Element;
	/** Optional states beyond the first paint for `scripts/screenshots.tsx <demo>` to capture. */
	scenarios?: (shot: ShotContext) => Promise<void>;
}

export interface Demo extends DemoModule {
	/** The file name without `.tsx`, e.g. `button`. Used for routing, test ids and screenshot folders. */
	slug: string;
}

const demosDir = new URL("../demos/", import.meta.url).pathname;

function assertDemoModule(
	slug: string,
	module: unknown,
): asserts module is DemoModule {
	const candidate = module as Partial<DemoModule>;
	if (typeof candidate.title !== "string") {
		throw new Error(`src/demos/${slug}.tsx must export a string \`title\``);
	}
	if (candidate.group !== "Components") {
		throw new Error(
			`src/demos/${slug}.tsx must export \`group: "Components"\``,
		);
	}
	if (typeof candidate.Demo !== "function") {
		throw new Error(`src/demos/${slug}.tsx must export a \`Demo\` component`);
	}
}

/** Imports every `src/demos/*.tsx`, sorted by title. A demo that does not match the contract throws. */
export async function loadDemos(): Promise<Demo[]> {
	const demos: Demo[] = [];
	for await (const file of new Bun.Glob("*.tsx").scan({
		cwd: demosDir,
		absolute: true,
	})) {
		const slug = file.slice(file.lastIndexOf("/") + 1, -".tsx".length);
		const module: unknown = await import(file);
		assertDemoModule(slug, module);
		demos.push({
			slug,
			title: module.title,
			group: module.group,
			Demo: module.Demo,
			scenarios: module.scenarios,
		});
	}
	return demos.sort((a, b) => a.title.localeCompare(b.title));
}

/** The slug of the landing page, which `App` renders itself: no demo or page may take it. */
export const SHOWCASE_SLUG = "showcase";

/**
 * What a file in `src/pages/` exports: a page of its own in the sidebar and
 * the site menu, beside the component demos.
 */
export interface PageModule {
	/** Sidebar label, menu row and (for "docs" pages) the heading's text. */
	title: string;
	/** The "docs" heading when it differs from the sidebar label. */
	heading?: string;
	/** The sidebar section the page sits under; its menu group too. */
	group: "Pages" | "System";
	/** Sorts within the group, ascending. */
	order: number;
	/** "docs": the sidebar, the page column with a heading, and the right column. "full": the page alone in the window frame. */
	layout: "docs" | "full";
	/** Where the page is linked: sidebar and site menu, the site menu only, or neither (reached by `navigate`). */
	listed: "sidebar" | "menu" | "none";
	Page: () => JSX.Element;
	/** Optional states beyond the first paint for `scripts/screenshots.tsx <page>` to capture. */
	scenarios?: (shot: ShotContext) => Promise<void>;
	/** The site menu row's glyph. */
	menuIcon?: IconRef;
	/** Extra words the site menu matches. */
	menuKeywords?: readonly string[];
}

export interface Page extends PageModule {
	/** The file name without `.tsx`. Shares one namespace with demo slugs. */
	slug: string;
}

const pagesDir = new URL("../pages/", import.meta.url).pathname;

function assertPageModule(
	slug: string,
	module: unknown,
): asserts module is PageModule {
	const candidate = module as Partial<PageModule>;
	const fail = (what: string): never => {
		throw new Error(`src/pages/${slug}.tsx must export ${what}`);
	};
	if (typeof candidate.title !== "string") fail("a string `title`");
	if (candidate.heading !== undefined && typeof candidate.heading !== "string") {
		fail("`heading` as a string, or not at all");
	}
	if (candidate.group !== "Pages" && candidate.group !== "System") {
		fail('`group: "Pages" | "System"`');
	}
	if (typeof candidate.order !== "number") fail("a numeric `order`");
	if (candidate.layout !== "docs" && candidate.layout !== "full") {
		fail('`layout: "docs" | "full"`');
	}
	if (
		candidate.listed !== "sidebar" &&
		candidate.listed !== "menu" &&
		candidate.listed !== "none"
	) {
		fail('`listed: "sidebar" | "menu" | "none"`');
	}
	if (typeof candidate.Page !== "function") fail("a `Page` component");
	if (
		candidate.scenarios !== undefined &&
		typeof candidate.scenarios !== "function"
	) {
		fail("`scenarios` as a function, or not at all");
	}
	if (
		candidate.menuIcon !== undefined &&
		typeof candidate.menuIcon !== "string" &&
		typeof candidate.menuIcon !== "object"
	) {
		fail("`menuIcon` as an icon name or `defineIcon(...)`, or not at all");
	}
	if (
		candidate.menuKeywords !== undefined &&
		!(
			Array.isArray(candidate.menuKeywords) &&
			candidate.menuKeywords.every((word) => typeof word === "string")
		)
	) {
		fail("`menuKeywords` as an array of strings, or not at all");
	}
}

/**
 * Imports every `src/pages/*.tsx`, sorted by `order` then title. Demos and
 * pages are routed by slug alone, so a page that shares a slug with a demo
 * (or with the showcase) throws.
 */
export async function loadPages(demos: readonly Demo[]): Promise<Page[]> {
	const taken = new Set([SHOWCASE_SLUG, ...demos.map((demo) => demo.slug)]);
	const pages: Page[] = [];
	for await (const file of new Bun.Glob("*.tsx").scan({
		cwd: pagesDir,
		absolute: true,
	})) {
		const slug = file.slice(file.lastIndexOf("/") + 1, -".tsx".length);
		if (taken.has(slug)) {
			throw new Error(
				`src/pages/${slug}.tsx has the slug "${slug}", which a demo or the showcase already uses`,
			);
		}
		const module: unknown = await import(file);
		assertPageModule(slug, module);
		pages.push({
			slug,
			title: module.title,
			heading: module.heading,
			group: module.group,
			order: module.order,
			layout: module.layout,
			listed: module.listed,
			Page: module.Page,
			scenarios: module.scenarios,
			menuIcon: module.menuIcon,
			menuKeywords: module.menuKeywords,
		});
	}
	return pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
