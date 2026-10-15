import type { JSX } from "solid-js";

/**
 * Drives one demo page from scripts/screenshots.tsx. Each helper settles the
 * UI afterwards, so a scenario reads as a script of what a person would do.
 */
export interface ShotContext {
	/** Window-space centre of the element with this `testId`. */
	centerOf(testId: string): { x: number; y: number };
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
