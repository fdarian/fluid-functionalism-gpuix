import { Glob } from 'bun';

const checks = [
	...new Glob('check-*.{ts,tsx}').scanSync(import.meta.dir),
].sort();

const failures: { check: string; exitCode: number }[] = [];

for (const check of checks) {
	console.log(`\n=== ${check}`);
	const run = Bun.spawnSync(['bun', `scripts/${check}`], {
		cwd: `${import.meta.dir}/..`,
		stdout: 'inherit',
		stderr: 'inherit',
	});
	if (run.exitCode !== 0) {
		failures.push({ check, exitCode: run.exitCode });
	}
}

if (failures.length > 0) {
	console.error(
		`\ncheck:scenarios: ${failures.length} of ${checks.length} failed:`,
	);
	for (const failure of failures) {
		console.error(`  ${failure.check} exited ${failure.exitCode}`);
	}
	process.exit(1);
}
console.log(`\ncheck:scenarios: all ${checks.length} scripts passed`);
