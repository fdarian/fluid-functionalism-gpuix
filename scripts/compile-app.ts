import { join } from 'node:path';
import solidPlugin from '@ghia/solid/bun-plugin';
import { nativeCjsPlugin } from './native-cjs-plugin';
import { registryPlugin } from './registry-plugin';

const root = join(import.meta.dir, '..');

export async function compileApp(outfile: string) {
	const result = await Bun.build({
		entrypoints: [join(root, 'src/main.tsx')],
		// Without autoloadBunfig false the binary reads the bunfig.toml of the directory it is launched from.
		compile: { outfile, autoloadBunfig: false },
		plugins: [
			solidPlugin,
			nativeCjsPlugin,
			registryPlugin({ scenarios: false }),
		],
		minify: true,
		// Makes the FF_PERF branch in src/main.tsx dead, so src/lib/perf.ts is not bundled.
		define: { 'process.env.FF_PERF': '"0"' },
	});
	for (const log of result.logs) {
		// The registry names every optional export; the ones a module lacks are expected.
		if (!log.message.includes('will always be undefined')) console.log(log);
	}
	if (!result.success) throw new Error('Bun.build failed');
}
