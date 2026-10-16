import { loadDemos, loadPages } from "../src/lib/demo";

const demos = await loadDemos();
const pages = await loadPages(demos);
const all = [
	"showcase",
	...demos.map((demo) => demo.slug),
	...pages.map((page) => page.slug),
];
const requested = process.argv[2];
if (requested !== undefined && !all.includes(requested)) {
	console.error(`usage: bun scripts/run-screenshots.ts [${all.join("|")}]`);
	process.exit(1);
}

const failed: string[] = [];
for (const slug of requested === undefined ? all : [requested]) {
	const run = Bun.spawnSync(["bun", "scripts/screenshots.tsx", slug], {
		cwd: `${import.meta.dir}/..`,
		stdout: "inherit",
		stderr: "inherit",
	});
	if (run.exitCode !== 0) failed.push(`${slug} (exit ${run.exitCode})`);
}
if (failed.length > 0) {
	console.error(`screenshots failed for: ${failed.join(", ")}`);
	process.exit(1);
}
