import type { ThemeChoice } from './theme';

export const SITE_URL = 'https://www.fluidfunctionalism.com';

export const OVERWRITE_NOTE =
	"--overwrite replaces same-named stock shadcn files (button.tsx, dialog.tsx, ...) with this library's versions. Without it the CLI prompts per existing file and exits in a non-interactive shell before any component is written.";

const SKILL_LINE =
	'For the design details behind it (exact behaviors and values), add the Fluid Functionalism skill: npx skills add mickadesign/fluid-functionalism';

/**
 * The slug the source's `starterSlug` gives the port's settings: Base UI,
 * rounded, default size, lucide icons (the source's default set is Untitled UI),
 * so the icons and a non-system theme are what differ.
 */
function starterSlug(theme: ThemeChoice): string {
	return theme === 'system' ? 'lucide' : `lucide-${theme}`;
}

/** The home page's "Copy install prompt" text: the source's `buildStarterPrompt` for the port's settings. */
export function buildStarterPrompt(theme: ThemeChoice): string {
	const slug = starterSlug(theme);
	const settings = `Base UI, rounded, default size, Lucide icons, ${theme} theme`;
	return [
		`Start a new React app with Fluid Functionalism: every component installed, every system wired, set to ${settings}.`,
		'',
		'Run (shadcn CLI, Next.js template, asks nothing):',
		`npx shadcn@latest create -n my-app -t next ${SITE_URL}/r/starter/${slug}.json`,
		"It creates the app in ./my-app; use the project's name instead. Then run npm run dev in it.",
		'',
		'What it sets up:',
		'- Every component in components/ui (Base UI flavor), with the libs and hooks they share in lib and hooks.',
		'- app/layout.tsx loads Inter with its opsz axis, so labels change weight without changing width.',
		`- components/providers.tsx holds the settings: next-themes (${theme} by default, D flips light and dark) and FluidProvider (rounded corners, default size step, Lucide icons, reduced motion that follows the OS). Change a value there and every component follows.`,
		'- app/page.tsx: an app shell (sidebar and topbar) around a home screen to replace.',
		'- components.json registers @fluid, so a later add is short: npx shadcn@latest add @fluid/base/<name> (drop base/ for components with one flavor).',
		'',
		'Already in an app with components.json? Install the same components and settings into it instead:',
		`npx shadcn@latest add ${SITE_URL}/r/setup/${slug}.json --overwrite`,
		OVERWRITE_NOTE,
		`Then wrap the root layout's children in <FluidRoot> from components/fluid-root.tsx (inside the theme provider, if any), load Inter with axes: ["opsz"], and default the theme to ${theme}.`,
		'',
		SKILL_LINE,
		`Docs: ${SITE_URL}/docs`,
	].join('\n');
}
