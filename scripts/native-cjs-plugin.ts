import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import type { BunPlugin } from 'bun';

const root = join(import.meta.dir, '..');

/**
 * `@ghia/native`'s ESM entry loads the `.node` addon through
 * `createRequire(import.meta.url)`, which the bundler does not follow, so a
 * compiled binary would fail with "Cannot find native binding". Its CJS entry
 * uses a plain `require`, which embeds the addon. The package's own
 * `dist/*.js` (the test renderer) reach the ESM entry as `../index.js`, so that
 * import is redirected too.
 */
export const nativeCjsPlugin: BunPlugin = {
	name: 'ghia-native-cjs',
	setup(build) {
		const directory = realpathSync(join(root, 'node_modules/@ghia/native'));
		const entry = join(directory, 'index.cjs');
		build.onResolve({ filter: /^@ghia\/native$/ }, () => ({ path: entry }));
		build.onResolve({ filter: /^\.\.\/index\.js$/ }, (resolving) =>
			resolving.importer.startsWith(join(directory, 'dist'))
				? { path: entry }
				: undefined,
		);
	},
};
