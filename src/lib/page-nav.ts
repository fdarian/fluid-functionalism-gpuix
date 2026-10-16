import { createContext, useContext } from 'solid-js';
import { type Demo, type Page, SHOWCASE_SLUG } from './demo';

/** The order the site's previous / next actions walk: Showcase, the sidebar's Pages, the System pages, then the components. */
export function pageOrder(
	pages: readonly Page[],
	demos: readonly Demo[],
): string[] {
	const listed = (group: Page['group']) =>
		pages
			.filter((page) => page.group === group && page.listed === 'sidebar')
			.map((page) => page.slug);
	return [
		SHOWCASE_SLUG,
		...listed('Pages'),
		...listed('System'),
		...demos
			.filter((demo) => demo.listed === 'sidebar')
			.map((demo) => demo.slug),
	];
}

export type PageNav = {
	/** Shows the page or demo with this slug, or the showcase. */
	navigate: (slug: string) => void;
	/** The slug on screen. */
	current: () => string;
};

export const PageNavContext = createContext<PageNav>();

export function usePageNav(): PageNav {
	const nav = useContext(PageNavContext);
	if (nav === undefined) throw new Error('usePageNav must be inside <App>');
	return nav;
}
