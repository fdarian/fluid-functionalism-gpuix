import { installUrl } from '#/lib/install-url';
import { OVERWRITE_NOTE, SITE_URL } from '#/lib/starter-prompt';
import type { EntryInstall } from './install';
import type { ChangeEntry, Inline } from './parse';

export function inlineToText(inline: Inline[]): string {
	return inline
		.map((part) => (part.type === 'code' ? `\`${part.value}\`` : part.value))
		.join('');
}

export function monthLabel(month: string): string {
	return new Date(
		Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1, 1),
	).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC',
	});
}

/** Step 1: get the new code. The port is Base UI only, so an item installs from `installUrl`'s path. */
function reinstallStep(install: EntryInstall): string[] {
	switch (install.kind) {
		case 'item':
			return [
				'1. Re-install it (shadcn CLI):',
				`npx shadcn@latest add ${installUrl(install.name)} --overwrite`,
				OVERWRITE_NOTE,
			];
		case 'skill':
			return [
				'1. Update the agent skill:',
				'npx skills add mickadesign/fluid-functionalism',
			];
		case 'all':
			return [
				`1. Re-install every Fluid Functionalism component this project uses, with the shadcn CLI and --overwrite, from the same URLs they came from (${SITE_URL}/r/<name>.json, or /r/base/<name>.json for the Base UI flavor).`,
				OVERWRITE_NOTE,
			];
		case 'none':
			return [
				`1. Re-install the Fluid Functionalism items the sentence above names, with the shadcn CLI and --overwrite, from the same URLs they came from (${SITE_URL}/r/<name>.json, or /r/base/<name>.json for the Base UI flavor).`,
				OVERWRITE_NOTE,
			];
	}
}

/**
 * The text behind a Breaking entry's "Copy migration prompt": a brief an AI
 * coding agent can act on without opening the changelog. It re-installs the
 * component, then rewrites call sites from the diff's `-` lines to its `+`
 * lines.
 */
export function buildMigrationPrompt(options: {
	entry: ChangeEntry;
	month: string;
	install: EntryInstall;
}): string {
	const entry = options.entry;
	if (entry.diff === null) {
		throw new Error(`${entry.name} is Breaking but has no diff`);
	}
	const lines: string[] = [];
	lines.push(
		`Migrate my React app to the ${monthLabel(options.month)} release of ${entry.name} from Fluid Functionalism. It has a breaking change.`,
	);
	lines.push('');
	lines.push(`What changed: ${inlineToText(entry.text)}`);
	lines.push('');
	lines.push(...reinstallStep(options.install));
	lines.push('');
	lines.push(
		'2. Find every call site that matches the - lines below and rewrite it to the + lines. Leave everything else as it is, then run the type checker.',
	);
	lines.push('```diff');
	lines.push(entry.diff.replace(/\n+$/, ''));
	lines.push('```');
	lines.push('');
	lines.push(`Changelog: ${SITE_URL}/changelog#${options.month}`);
	if (entry.href !== null) lines.push(`Docs: ${SITE_URL}${entry.href}`);
	return lines.join('\n');
}
