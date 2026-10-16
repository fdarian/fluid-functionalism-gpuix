/** Components with a Radix and a Base UI flavour, plus the single-source ones that depend on one: both ship a `base/` registry payload. Copied from the source's `lib/dual-flavor-slugs.mjs`. */
const BASE_FLAVORED_SLUGS = new Set([
	'accordion',
	'button',
	'checkbox-group',
	'combobox',
	'dialog',
	'dropdown',
	'mobile-drawer',
	'radio-group',
	'scroll-area',
	'select',
	'sidebar',
	'slider',
	'switch',
	'tabs',
	'tabs-subtle',
	'thinking-steps',
	'tooltip',
	'ask-user-questions',
	'banner',
	'color-picker',
	'command-menu',
	'dialog-sidebar',
	'input-copy',
	'input-message',
	'queued-stack',
	'sidebar-app',
	'sidebar-inset-topbar',
	'sidebar-search-field',
	'sidebar-user-footer',
	'sidebar-workspace-header',
]);

/** The registry URL `shadcn add` takes for a component. The port is Base UI only, so this is the site's `installUrl(slug, "base")`. */
export function installUrl(slug: string): string {
	const path = BASE_FLAVORED_SLUGS.has(slug) ? `base/${slug}` : slug;
	return `https://www.fluidfunctionalism.com/r/${path}.json`;
}
