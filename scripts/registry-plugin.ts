import { join } from 'node:path';
import type { BunPlugin } from 'bun';

const root = join(import.meta.dir, '..');
const NAMESPACE = 'registry';

/** The exports `DemoModule` and `PageModule` define; keep in sync with `src/lib/demo.ts`. */
const DEMO_EXPORTS = ['title', 'group', 'listed', 'Demo'];
const PAGE_EXPORTS = [
	'title',
	'heading',
	'group',
	'order',
	'layout',
	'listed',
	'Page',
	'Rail',
	'menuIcon',
	'menuKeywords',
];

async function scan(dir: string, pattern: string): Promise<string[]> {
	const files: string[] = [];
	for await (const file of new Bun.Glob(pattern).scan({ cwd: dir })) {
		files.push(file);
	}
	return files.sort();
}

async function moduleRegistry(
	dir: string,
	exports: string[],
	scenarios: boolean,
): Promise<string> {
	const files = await scan(dir, '*.tsx');
	const picks = scenarios ? [...exports, 'scenarios'] : exports;
	const imports = files.map(
		(file, index) =>
			`import * as m${index} from ${JSON.stringify(join(dir, file))};`,
	);
	const entries = files.map((file, index) => {
		const module = picks.map((name) => `${name}: m${index}.${name}`).join(', ');
		return `{ file: ${JSON.stringify(file)}, module: { ${module} } }`;
	});
	return `${imports.join('\n')}\nexport default [${entries.join(',\n')}];\n`;
}

async function changelogRegistry(dir: string): Promise<string> {
	const names = await scan(dir, '*.md');
	const entries = await Promise.all(
		names.map(async (name) => {
			const text = await Bun.file(join(dir, name)).text();
			return `{ name: ${JSON.stringify(name)}, text: ${JSON.stringify(text)} }`;
		}),
	);
	return `export default [${entries.join(',\n')}];\n`;
}

type RegistryOptions = { scenarios: boolean };

const SPECIFIERS = ['virtual:demos', 'virtual:pages', 'virtual:changelog'];

function registrySource(
	specifier: string,
	options: RegistryOptions,
): Promise<string> {
	switch (specifier) {
		case 'virtual:demos':
			return moduleRegistry(
				join(root, 'src/demos'),
				DEMO_EXPORTS,
				options.scenarios,
			);
		case 'virtual:pages':
			return moduleRegistry(
				join(root, 'src/pages'),
				PAGE_EXPORTS,
				options.scenarios,
			);
		case 'virtual:changelog':
			return changelogRegistry(join(root, 'content/changelog'));
		default:
			throw new Error(`registry: unknown specifier ${specifier}`);
	}
}

/**
 * For `Bun.build`: serves `virtual:demos`, `virtual:pages` and
 * `virtual:changelog`, the files the app would otherwise scan from disk at
 * startup, which a compiled binary cannot do. With `scenarios: false` the
 * `scenarios` exports are never read, so the bundler can drop them.
 */
export function registryPlugin(options: RegistryOptions): BunPlugin {
	return {
		name: 'registry',
		setup(build) {
			build.onResolve(
				{ filter: /^virtual:(demos|pages|changelog)$/ },
				(args) => ({ path: args.path, namespace: NAMESPACE }),
			);
			build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async (args) => ({
				contents: await registrySource(args.path, options),
				loader: 'js',
			}));
		},
	};
}

/**
 * The same modules for `Bun.plugin()` at runtime. Bun 1.4.3 never asks a
 * runtime `onResolve` about a specifier that does not resolve on disk, and
 * `build.module` does not exist in `Bun.build`, hence two plugins.
 */
export function registryRuntimePlugin(options: RegistryOptions): BunPlugin {
	return {
		name: 'registry-runtime',
		setup(build) {
			for (const specifier of SPECIFIERS) {
				build.module(specifier, async () => ({
					contents: await registrySource(specifier, options),
					loader: 'js',
				}));
			}
		},
	};
}
