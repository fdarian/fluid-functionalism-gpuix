import { createContext, useContext } from "solid-js";

export type PageNav = {
	/** Shows the page or demo with this slug, or the showcase. */
	navigate: (slug: string) => void;
	/** The slug on screen. */
	current: () => string;
};

export const PageNavContext = createContext<PageNav>();

export function usePageNav(): PageNav {
	const nav = useContext(PageNavContext);
	if (nav === undefined) throw new Error("usePageNav must be inside <App>");
	return nav;
}
