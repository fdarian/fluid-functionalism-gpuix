/**
 * `pnpm build`: compiles the app to one binary and wraps it in
 * `bundle/Fluid Functionalism.app`. Needs `cargo-packager` on PATH
 * (`cargo install cargo-packager --locked`).
 */
import { mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { compileApp } from './compile-app';

const root = join(import.meta.dir, '..');
const dist = join(root, 'dist');
const iconSource = join(root, 'assets/icon/icon-1024.png');
const icns = join(dist, 'AppIcon.icns');

// [pixel size, iconset file name], the set `iconutil` expects.
const ICONSET: [number, string][] = [
	[16, 'icon_16x16'],
	[32, 'icon_16x16@2x'],
	[32, 'icon_32x32'],
	[64, 'icon_32x32@2x'],
	[128, 'icon_128x128'],
	[256, 'icon_128x128@2x'],
	[256, 'icon_256x256'],
	[512, 'icon_256x256@2x'],
	[512, 'icon_512x512'],
	[1024, 'icon_512x512@2x'],
];

function run(
	command: string[],
	options: { env?: Record<string, string | undefined>; quiet?: boolean } = {},
) {
	const result = Bun.spawnSync(command, {
		cwd: root,
		env: options.env ?? process.env,
		stdout: options.quiet ? 'ignore' : 'inherit',
		stderr: 'inherit',
	});
	if (result.exitCode !== 0) {
		throw new Error(`${command.join(' ')} exited with ${result.exitCode}`);
	}
}

function makeIcns() {
	const iconset = join(dist, 'AppIcon.iconset');
	rmSync(iconset, { recursive: true, force: true });
	mkdirSync(iconset, { recursive: true });
	for (const [size, name] of ICONSET) {
		run(
			[
				'sips',
				'-z',
				String(size),
				String(size),
				iconSource,
				'--out',
				join(iconset, `${name}.png`),
			],
			{ quiet: true },
		);
	}
	run(['iconutil', '-c', 'icns', iconset, '-o', icns]);
	rmSync(iconset, { recursive: true });
}

function pack() {
	const cargoBin = join(homedir(), '.cargo/bin');
	const env = {
		...process.env,
		PATH: `${process.env.PATH}:${cargoBin}`,
	};
	const probe = Bun.spawnSync(['cargo', 'packager', '--version'], {
		env,
		stdout: 'ignore',
		stderr: 'ignore',
	}).exitCode;
	if (probe !== 0) {
		throw new Error(
			'cargo-packager is missing: run `cargo install cargo-packager --locked`',
		);
	}
	run(['cargo', 'packager', '--release', '--config', 'packager.json'], { env });
}

mkdirSync(dist, { recursive: true });
await compileApp(join(dist, 'fluid-functionalism'));
makeIcns();
pack();
