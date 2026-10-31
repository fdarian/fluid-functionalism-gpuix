import { realpathSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * One runtime instance of solid-js and @ghia/solid across this app and
 * base-ui-solid-gpuix: a second copy of either gives a second reactive graph
 * or renderer registry, and nothing fails loudly. `file:` deps get a store
 * path per project directory, so this holds only while the base-ui folder is a
 * member of this pnpm workspace and installs from here.
 */
const root = `${import.meta.dir}/..`;
const baseUi = realpathSync(`${root}/node_modules/base-ui-solid-gpuix`);
const gpuixSolid = dirname(
	realpathSync(Bun.resolveSync('@ghia/solid/package.json', root)),
);

const importers = [
	['app', realpathSync(root)],
	['base-ui-solid-gpuix', baseUi],
	['@ghia/solid', gpuixSolid],
] as const;

let failed = false;
for (const specifier of ['solid-js', '@ghia/solid']) {
	const resolved = new Map<string, string[]>();
	for (const importer of importers) {
		const name = importer[0];
		const file = realpathSync(Bun.resolveSync(specifier, importer[1]));
		resolved.set(file, [...(resolved.get(file) ?? []), name]);
	}
	for (const [file, names] of resolved)
		console.log(specifier, names.join(', '), file);
	if (resolved.size !== 1) {
		failed = true;
		console.error(`${specifier}: ${resolved.size} instances`);
	}
}
if (failed) process.exit(1);
console.log('check-single-instance: one instance of solid-js and @ghia/solid');
