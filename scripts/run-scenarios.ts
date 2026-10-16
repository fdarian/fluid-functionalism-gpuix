import { Glob } from 'bun';

const checks = [
	...new Glob('check-*.{ts,tsx}').scanSync(import.meta.dir),
].sort();

for (const check of checks) {
	console.log(`\n=== ${check}`);
	const run = Bun.spawnSync(['bun', `scripts/${check}`], {
		cwd: `${import.meta.dir}/..`,
		stdout: 'inherit',
		stderr: 'inherit',
	});
	if (run.exitCode !== 0) {
		console.error(`\ncheck:scenarios failed: ${check} exited ${run.exitCode}`);
		process.exit(1);
	}
}
console.log(`\ncheck:scenarios: all ${checks.length} scripts passed`);
