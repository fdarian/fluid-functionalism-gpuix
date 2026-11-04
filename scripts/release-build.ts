/**
 * Builds what a release ships: `dist/cli.js` (the npx shim), the darwin-arm64
 * tarball of the compiled app in `dist/releases/`, and `dist/checksums.json`
 * with the tarball's sha256, which the shim checks after downloading it.
 */
import { join } from 'node:path';
import { compileApp } from './compile-app';

const NAME = 'ghia-fluid-functionalism';
const TARGET = 'darwin-arm64';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const binDir = join(dist, 'bin');
const releasesDir = join(dist, 'releases');
const tarball = join(releasesDir, `${NAME}-${TARGET}.tar.gz`);
const checksums = join(dist, 'checksums.json');

function run(command: string[]) {
	const result = Bun.spawnSync(command, {
		stdout: 'inherit',
		stderr: 'inherit',
	});
	if (result.exitCode !== 0) {
		throw new Error(`${command.join(' ')} exited ${result.exitCode}`);
	}
}

const shim = await Bun.build({
	entrypoints: [join(root, 'src/cli.ts')],
	outdir: dist,
	target: 'node',
	format: 'esm',
});
if (!shim.success) {
	for (const log of shim.logs) console.error(log);
	throw new Error('Bun.build of src/cli.ts failed');
}

await compileApp(join(binDir, NAME));

// Bun's own signature is not trusted on Apple Silicon: re-sign before tarring.
run(['codesign', '--force', '--sign', '-', join(binDir, NAME)]);

run(['mkdir', '-p', releasesDir]);
run(['tar', '-czf', tarball, '-C', binDir, NAME]);

const hasher = new Bun.CryptoHasher('sha256');
hasher.update(await Bun.file(tarball).arrayBuffer());
await Bun.write(
	checksums,
	`${JSON.stringify({ [TARGET]: hasher.digest('hex') }, null, '\t')}\n`,
);
console.log(`${tarball}\n${checksums}`);
