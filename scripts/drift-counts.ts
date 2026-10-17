/**
 * Prints the README's drift-count table from `drift/*.md`.
 *
 *   bun scripts/drift-counts.ts
 *
 * An entry is a `## ` section with a `- **Cause:**` line, counted once. The tags
 * in backticks on that line decide the column: one tag is its own column, two or
 * more is "mixed", none (an exact or additive note) is not counted. Paste the
 * output over the table and the intro total in README's "Drift from the source".
 */
import { readdirSync, readFileSync } from 'node:fs';

const TAGS = ['gpuix gap', 'port choice', 'not ported yet'] as const;
type Tag = (typeof TAGS)[number];

type Counts = { gap: number; choice: number; notYet: number; mixed: number };

const driftDir = `${import.meta.dir}/../drift`;

function countFile(path: string): Counts {
	const counts: Counts = { gap: 0, choice: 0, notYet: 0, mixed: 0 };
	const sections = readFileSync(path, 'utf8').split(/^## /m).slice(1);
	for (const section of sections) {
		const cause = section
			.split('\n')
			.find((line) => line.startsWith('- **Cause:**'));
		if (cause === undefined) continue;
		const tags: Tag[] = TAGS.filter((tag) => cause.includes(`\`${tag}\``));
		if (tags.length === 0) continue;
		if (tags.length > 1) counts.mixed++;
		else if (tags[0] === 'gpuix gap') counts.gap++;
		else if (tags[0] === 'port choice') counts.choice++;
		else counts.notYet++;
	}
	return counts;
}

const files = readdirSync(driftDir)
	.filter((name) => name.endsWith('.md') && !name.startsWith('_'))
	.sort();

const total: Counts = { gap: 0, choice: 0, notYet: 0, mixed: 0 };
const rows: string[] = [];
for (const file of files) {
	const counts = countFile(`${driftDir}/${file}`);
	const name = file.replace(/\.md$/, '');
	const sum = counts.gap + counts.choice + counts.notYet + counts.mixed;
	total.gap += counts.gap;
	total.choice += counts.choice;
	total.notYet += counts.notYet;
	total.mixed += counts.mixed;
	rows.push(
		`| [${name}](drift/${file}) | ${counts.gap} | ${counts.choice} | ${counts.notYet} | ${counts.mixed} | ${sum} |`,
	);
}
const all = total.gap + total.choice + total.notYet + total.mixed;

console.log(
	'| Component or page | gpuix gap | port choice | not ported yet | mixed | total |',
);
console.log('|---|---:|---:|---:|---:|---:|');
for (const row of rows) console.log(row);
console.log(
	`| **Total** | **${total.gap}** | **${total.choice}** | **${total.notYet}** | **${total.mixed}** | **${all}** |`,
);
console.log(`\n${all} entries`);
