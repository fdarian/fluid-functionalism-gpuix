import { readdirSync } from 'node:fs';
import solid from 'rolldown-plugin-solid';
import { defineConfig } from 'tsdown';

const componentEntries = Object.fromEntries(
	readdirSync('src/components')
		.filter((file) => /\.tsx?$/.test(file))
		.map((file) => [file.replace(/\.tsx?$/, ''), `src/components/${file}`]),
);

export default defineConfig({
	entry: {
		...componentEntries,
		theme: 'src/lib/theme.ts',
		icon: 'src/lib/icon.tsx',
		icons: 'src/lib/icons.ts',
	},
	format: ['esm'],
	dts: true,
	clean: true,
	outDir: 'lib',
	fixedExtension: false,
	// Same compile as @ghia/solid/bun-plugin: universal output importing from @ghia/solid, never solid-js/web.
	plugins: [
		solid({ solid: { generate: 'universal', moduleName: '@ghia/solid' } }),
	],
	// The peer dependencies, subpaths included (@ghia/solid, ghia-base-ui/tooltip), stay external so the consumer has one instance of each.
	deps: {
		neverBundle: [
			/^@ghia\/(solid|native)(\/|$)/,
			/^ghia-base-ui(\/|$)/,
			/^solid-js(\/|$)/,
		],
	},
});
