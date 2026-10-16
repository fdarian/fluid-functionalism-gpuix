import type { ChangeEntry } from './parse';

/** What an entry installs, for its Copy migration prompt. */
export type EntryInstall =
	/** A registry item. */
	| { kind: 'item'; name: string }
	/** The agent skill, installed with `npx skills add`. */
	| { kind: 'skill' }
	/** A change across every component. */
	| { kind: 'all' }
	/** No single item: a docs-site feature, or a change the sentence spreads over several named components. */
	| { kind: 'none' };

/**
 * The source's `public/r/*.json`, by item name: the port has no registry on
 * disk, so the answer to the source's `existsSync` check is written out.
 */
const REGISTRY_ITEMS = new Set([
	'accordion',
	'ask-user-questions',
	'badge',
	'banner',
	'button',
	'card',
	'carousel-dots',
	'chat-message',
	'checkbox-group',
	'color-picker',
	'combobox',
	'command-menu',
	'dialog-sidebar',
	'dialog',
	'dropdown',
	'elevated',
	'file-thumbnail',
	'fluid-provider',
	'font-weight',
	'icon-context',
	'input-copy',
	'input-group',
	'input-message',
	'mobile-drawer',
	'omit',
	'popup',
	'queued-stack',
	'radio-group',
	'scroll-area',
	'select',
	'shape-context',
	'sidebar-app',
	'sidebar-inset-topbar',
	'sidebar-menu-grid',
	'sidebar-search-field',
	'sidebar-user-footer',
	'sidebar-workspace-header',
	'sidebar',
	'size-context',
	'slider',
	'springs',
	'surface-classes',
	'surface-context',
	'surfaces',
	'switch',
	'table',
	'tabs-subtle',
	'tabs',
	'thinking-indicator',
	'thinking-steps',
	'tokens',
	'tooltip',
	'type-scale',
	'typography',
	'use-fluid-hover',
	'use-keyboard-nav-gate',
	'use-merge-split',
	'use-touch-primary',
	'utils',
]);

/** The system pages whose install is another registry item (the source's `installSlug`). */
const SYSTEM_INSTALL: Record<string, string> = {
	'fluid-hover': 'use-fluid-hover',
	motion: 'springs',
	scrollbars: 'scroll-area',
	sizes: 'size-context',
	surfaces: 'elevated',
	typography: 'typography',
};

const item = (name: string): EntryInstall =>
	REGISTRY_ITEMS.has(name) ? { kind: 'item', name } : { kind: 'none' };

export function entryInstall(entry: ChangeEntry): EntryInstall {
	const slug =
		entry.href === null
			? undefined
			: /^\/docs\/([^/#]+)$/.exec(entry.href)?.[1];
	if (slug === 'skill') return { kind: 'skill' };
	if (slug !== undefined) return item(SYSTEM_INSTALL[slug] ?? slug);
	if (entry.href !== null) return { kind: 'none' };
	if (entry.name === 'All components') return { kind: 'all' };
	// A bold label naming one registry item (MobileDrawer -> mobile-drawer).
	return item(
		entry.name
			.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
			.replace(/\s+/g, '-')
			.toLowerCase(),
	);
}
