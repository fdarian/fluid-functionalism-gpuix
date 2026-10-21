/**
 * Entry point. `bun --hot src/main.tsx`: no bundler, the Solid JSX transform
 * is a Bun preload (see bunfig.toml). Demos in `src/demos/` are discovered at
 * startup, so a new one shows up after a restart.
 */
import { render } from '@gpuix/solid';
import { loadDemos, loadPages, SHOWCASE_SLUG } from '#/lib/demo';
import { windowOptions } from '#/lib/window-options';
import { App } from './app';

const demos = await loadDemos();
const pages = await loadPages(demos);

if (process.env.FF_PERF === '1') {
	// Opt-in harness: see scripts/perf.tsx.
	const { startPerf } = await import('#/lib/perf');
	startPerf({
		windowOptions,
		pages: [
			{ slug: SHOWCASE_SLUG, kind: 'showcase', sidebar: true },
			...pages.map((page) => ({
				slug: page.slug,
				kind: 'page' as const,
				sidebar: page.layout === 'docs',
			})),
			...demos.map((demo) => ({
				slug: demo.slug,
				kind: 'demo' as const,
				sidebar: true,
			})),
		],
		mount: (renderer, slug) =>
			render(() => <App demos={demos} pages={pages} initialPage={slug} />, {
				renderer,
			}),
	});
} else {
	render(() => <App demos={demos} pages={pages} />, windowOptions);
}
