// The monthly release files in content/changelog/ are Markdown in one strict
// shape (see the source's changelog-guidelines.md). This module turns a file
// into data and throws on anything outside that shape, so a malformed release
// fails at startup instead of rendering half a page. The source parses with
// mdast; the shape is small enough that a line scanner covers it without a
// Markdown dependency, and it rejects every construct the shape leaves out.

export const CHANGE_KINDS = ['new', 'breaking', 'updated'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const KIND_LABEL: Record<ChangeKind, string> = {
	breaking: 'Breaking',
	new: 'New',
	updated: 'Updated',
};

/** Sentence text: plain runs and inline code, nothing else. */
export type Inline =
	| { type: 'text'; value: string }
	| { type: 'code'; value: string };

export type ChangeRef =
	| { type: 'pr'; number: number }
	| { type: 'commit'; sha: string };

/** The languages a Breaking diff can be written in, TSX first. */
export const DIFF_LANGS = ['tsx', 'ts', 'css', 'json', 'bash'] as const;
export type DiffLang = (typeof DIFF_LANGS)[number];

export interface ChangeEntry {
	kind: ChangeKind;
	name: string;
	/** A site route (`/docs/banner`), or null for a change that spans many components (a bold label in the file). */
	href: string | null;
	text: Inline[];
	refs: ChangeRef[];
	/** The ```diff block a Breaking entry carries, without its fence. */
	diff: string | null;
	/** ```diff alone is TSX; ```diff css (or ts, json, bash) names another. Null without a diff. */
	diffLang: DiffLang | null;
}

export interface ChangeGroup {
	kind: ChangeKind;
	entries: ChangeEntry[];
}

export interface Release {
	/** `YYYY-MM`, the month the release covers. */
	month: string;
	/** `YYYY-MM-DD`, the first Friday it shipped. Null for backfilled months. */
	released: string | null;
	title: string;
	intro: Inline[] | null;
	groups: ChangeGroup[];
}

export class ChangelogFormatError extends Error {
	constructor(file: string, line: number | undefined, message: string) {
		super(`${file}${line ? `:${line}` : ''}: ${message}`);
		this.name = 'ChangelogFormatError';
	}
}

type Fail = (line: number | undefined, message: string) => never;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const REF = /^(#\d+|[0-9a-f]{7,12})$/;
const REFS_TAIL = /\s*\(([^()]+)\)$/;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/;
const HEADING = /^(#{1,6})(?:\s+(.*?))?\s*#*\s*$/;
const BULLET = /^- /;
const ORDERED = /^\d+[.)]\s/;
const HEADINGS: Record<string, ChangeKind> = {
	Breaking: 'breaking',
	New: 'new',
	Updated: 'updated',
};

/** The month after `YYYY-MM`, as `YYYY-MM`. */
export function nextMonth(month: string): string {
	const year = Number(month.slice(0, 4));
	const number = Number(month.slice(5));
	return number === 12
		? `${year + 1}-01`
		: `${year}-${String(number + 1).padStart(2, '0')}`;
}

export function parseRelease(source: string, file = 'release.md'): Release {
	const fail: Fail = (line, message) => {
		throw new ChangelogFormatError(file, line, message);
	};

	// Em dashes are out everywhere (tone-of-voice.md), fences included.
	const dash = source.split('\n').findIndex((line) => line.includes('—'));
	if (dash !== -1)
		fail(dash + 1, 'em dash; use a comma, a colon, or a full stop');

	const front = FRONTMATTER.exec(source);
	if (front === null) return fail(1, 'missing the --- frontmatter block');
	const meta: Record<string, string> = {};
	const frontLines = front[1].split(/\r?\n/);
	for (let index = 0; index < frontLines.length; index += 1) {
		const line = frontLines[index].trim();
		if (!line) continue;
		const match = /^([a-z]+):\s*(.+)$/.exec(line);
		if (match === null) {
			fail(index + 2, `frontmatter line is not \`key: value\`: ${line}`);
		}
		const key = match[1];
		if (!['month', 'released', 'title'].includes(key)) {
			fail(index + 2, `unknown frontmatter key \`${key}\``);
		}
		meta[key] = match[2].trim();
	}

	const month = meta.month;
	const released = meta.released;
	const title = meta.title;
	if (!month || !MONTH.test(month)) return fail(2, '`month` must be YYYY-MM');
	if (!title) return fail(2, '`title` is required');
	if (title.length > 90) fail(2, '`title` runs past 90 characters');
	if (/\.$/.test(title)) fail(2, '`title` ends with a period');
	if (released !== undefined) {
		if (!DAY.test(released)) fail(2, '`released` must be YYYY-MM-DD');
		// The pattern lets 2026-02-31 through; Date would roll it into March.
		if (
			new Date(`${released}T00:00:00Z`).toISOString().slice(0, 10) !== released
		) {
			fail(2, `\`released\` is not a real day: ${released}`);
		}
		if (released < `${nextMonth(month)}-01`) {
			fail(2, '`released` falls before the month ended');
		}
	}

	// Line numbers in the body are offset by the frontmatter block.
	const offset = front[0].split('\n').length - 1;
	const lines = source.slice(front[0].length).split(/\r?\n/);
	const lineNumber = (index: number) => index + 1 + offset;

	let intro: Inline[] | null = null;
	const groups: ChangeGroup[] = [];
	let current: ChangeGroup | null = null;
	let listSeen = false;
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];
		if (line.trim() === '') {
			index += 1;
			continue;
		}

		const heading = HEADING.exec(line);
		if (heading !== null) {
			if (heading[1].length !== 2) {
				fail(lineNumber(index), 'only `##` headings are allowed');
			}
			const label = heading[2] ?? '';
			const kind = HEADINGS[label];
			if (kind === undefined) {
				fail(
					lineNumber(index),
					`unknown section \`${label}\`; use New, Breaking, or Updated`,
				);
			}
			const last = groups[groups.length - 1];
			if (
				last &&
				CHANGE_KINDS.indexOf(kind) <= CHANGE_KINDS.indexOf(last.kind)
			) {
				fail(
					lineNumber(index),
					'sections run New, Breaking, Updated, each once',
				);
			}
			if (current !== null && !listSeen) {
				fail(lineNumber(index), 'the previous section has no entries');
			}
			current = { kind, entries: [] };
			groups.push(current);
			listSeen = false;
			index += 1;
			continue;
		}

		if (current === null) {
			if (intro !== null || BULLET.test(line) || ORDERED.test(line)) {
				fail(
					lineNumber(index),
					'only one intro paragraph may sit above the first section',
				);
			}
			const start = index;
			const paragraph: string[] = [];
			while (
				index < lines.length &&
				lines[index].trim() !== '' &&
				!HEADING.test(lines[index])
			) {
				paragraph.push(lines[index]);
				index += 1;
			}
			intro = parseInline(paragraph.join(' '), fail, lineNumber(start));
			continue;
		}

		if (ORDERED.test(line)) {
			fail(lineNumber(index), 'use `-` bullets, not a numbered list');
		}
		if (!BULLET.test(line) || listSeen) {
			fail(
				lineNumber(index),
				'a section holds exactly one bullet list and nothing else',
			);
		}
		listSeen = true;
		while (index < lines.length && BULLET.test(lines[index])) {
			const start = index;
			index += 1;
			// An item runs over its indented lines, its blank lines, and a lazy
			// paragraph continuation; trailing blanks belong to the gap after it.
			while (index < lines.length && itemContinues(lines, index)) index += 1;
			let end = index;
			while (end > start + 1 && lines[end - 1].trim() === '') end -= 1;
			current.entries.push(
				parseEntry(
					lines.slice(start, end),
					current.kind,
					fail,
					lineNumber(start),
				),
			);
			// Blank lines between items keep the list going.
			while (index < lines.length && lines[index].trim() === '') index += 1;
		}
	}

	if (current !== null && !listSeen)
		fail(undefined, 'the last section has no entries');
	if (groups.length === 0)
		fail(undefined, 'a release needs at least one section');

	return { month, released: released ?? null, title, intro, groups };
}

/** Whether `lines[index]` belongs to the bullet item above it. */
function itemContinues(lines: string[], index: number): boolean {
	const line = lines[index];
	if (line.trim() === '') {
		// A blank line holds the item only when an indented line follows it.
		let next = index + 1;
		while (next < lines.length && lines[next].trim() === '') next += 1;
		return next < lines.length && lines[next].startsWith('  ');
	}
	if (line.startsWith('  ')) return true;
	return (
		!BULLET.test(line) && !HEADING.test(line) && lines[index - 1].trim() !== ''
	);
}

function parseEntry(
	itemLines: string[],
	kind: ChangeKind,
	fail: Fail,
	line: number,
): ChangeEntry {
	// Dedent the item's content by the bullet's 2 columns.
	const content = itemLines.map((raw, index) =>
		index === 0 ? raw.slice(2) : raw.replace(/^ {1,2}/, ''),
	);

	let cursor = 0;
	const paragraph: string[] = [];
	while (
		cursor < content.length &&
		content[cursor].trim() !== '' &&
		!content[cursor].startsWith('```')
	) {
		paragraph.push(content[cursor]);
		cursor += 1;
	}
	if (paragraph.length === 0) {
		fail(line, 'an entry starts with its label and sentence');
	}

	let diff: string | null = null;
	let diffLang: DiffLang | null = null;
	while (cursor < content.length) {
		if (content[cursor].trim() === '') {
			cursor += 1;
			continue;
		}
		const fenceLine = line + cursor;
		const fence = /^```(\S*)\s*(.*?)\s*$/.exec(content[cursor]);
		if (fence === null) {
			fail(
				fenceLine,
				'an entry holds one line, plus a diff block when Breaking',
			);
		}
		if (kind !== 'breaking') {
			fail(fenceLine, 'only Breaking entries carry a code block');
		}
		if (fence?.[1] !== 'diff') {
			fail(fenceLine, 'the migration block must be fenced as ```diff');
		}
		if (diff !== null) {
			fail(fenceLine, 'a Breaking entry carries exactly one diff block');
		}
		const language = fence?.[2] || 'tsx';
		if (!(DIFF_LANGS as readonly string[]).includes(language)) {
			fail(
				fenceLine,
				`\`\`\`diff ${language}\` is not a diff language; use ${DIFF_LANGS.join(', ')}`,
			);
		}
		const body: string[] = [];
		cursor += 1;
		while (cursor < content.length && !content[cursor].startsWith('```')) {
			body.push(content[cursor]);
			cursor += 1;
		}
		if (cursor === content.length)
			fail(fenceLine, 'the diff block is never closed');
		cursor += 1;
		diff = body.join('\n');
		diffLang = language as DiffLang;
	}
	if (kind === 'breaking' && diff === null) {
		fail(line, 'a Breaking entry needs a ```diff block');
	}

	// The label: [Name](/route) or **Name**.
	const text = paragraph.join(' ');
	let name: string;
	let href: string | null;
	let rest: string;
	const link = /^\[([^\]]*)\]\(([^)]*)\)/.exec(text);
	const strong = /^\*\*([^*]+)\*\*/.exec(text);
	if (link !== null) {
		name = link[1];
		href = link[2];
		rest = text.slice(link[0].length);
		// A site route: one leading slash. `//host` and `/\host` leave the site.
		if (!/^\/(?![/\\])/.test(href)) {
			fail(line, `label links to \`${href}\`; use a site route`);
		}
	} else if (strong !== null) {
		name = strong[1];
		href = null;
		rest = text.slice(strong[0].length);
	} else {
		return fail(
			line,
			'an entry starts with `[Name](/docs/slug)` or `**Name**`',
		);
	}
	if (!name) fail(line, 'the label is empty');

	const sentence = parseInline(rest, fail, line);
	const head = sentence[0];
	if (!head || head.type !== 'text' || !head.value.startsWith(': ')) {
		return fail(line, 'a colon and a space follow the label');
	}
	head.value = head.value.slice(2);
	if (!head.value) sentence.shift();

	const tail = sentence[sentence.length - 1];
	const refsMatch = tail?.type === 'text' ? REFS_TAIL.exec(tail.value) : null;
	if (tail === undefined || refsMatch === null) {
		return fail(
			line,
			'an entry ends with its refs: `(#52)` or `(#52, a28dd34)`',
		);
	}
	const refs = refsMatch[1].split(',').map((raw): ChangeRef => {
		const ref = raw.trim();
		if (!REF.test(ref)) {
			fail(line, `\`${ref}\` is not a PR (#52) or a 7-character SHA`);
		}
		return ref.startsWith('#')
			? { type: 'pr', number: Number(ref.slice(1)) }
			: { type: 'commit', sha: ref };
	});
	if (refs.length > 3) {
		fail(
			line,
			'3 refs at most; keep the PR, or the commits that carry the change',
		);
	}
	tail.value = tail.value.slice(0, refsMatch.index);
	if (!tail.value) sentence.pop();

	const last = sentence[sentence.length - 1];
	if (!last || last.type !== 'text' || !/[.!?]$/.test(last.value)) {
		fail(line, 'the sentence ends with a period before the refs');
	}
	const lead = sentence[0];
	if (lead.type === 'text' && !/^[A-Z0-9]/.test(lead.value)) {
		fail(line, 'the sentence starts with a capital');
	}

	return { kind, name, href, text: sentence, refs, diff, diffLang };
}

/** Plain text and `code` spans. Anything else Markdown would turn into a node (emphasis, links, HTML, escapes) throws. */
function parseInline(text: string, fail: Fail, line: number): Inline[] {
	const out: Inline[] = [];
	const pushText = (raw: string) => {
		if (raw === '') return;
		const forbidden = /[*[<\\]|!\[/.exec(raw);
		if (forbidden !== null) {
			fail(
				line,
				`only plain text and inline code go in a sentence, found \`${forbidden[0]}\``,
			);
		}
		const value = raw.replace(/\s+/g, ' ');
		const previous = out[out.length - 1];
		if (previous?.type === 'text') previous.value += value;
		else out.push({ type: 'text', value });
	};

	let cursor = 0;
	while (cursor < text.length) {
		const open = text.indexOf('`', cursor);
		if (open === -1) {
			pushText(text.slice(cursor));
			break;
		}
		pushText(text.slice(cursor, open));
		let ticks = 1;
		while (text[open + ticks] === '`') ticks += 1;
		const delimiter = '`'.repeat(ticks);
		let close = open + ticks;
		for (;;) {
			close = text.indexOf(delimiter, close);
			if (close === -1) fail(line, 'an inline code span is never closed');
			if (text[close + ticks] !== '`') break;
			close += ticks;
			while (text[close] === '`') close += 1;
		}
		let value = text.slice(open + ticks, close).replace(/\s+/g, ' ');
		if (value.length > 2 && value.startsWith(' ') && value.endsWith(' ')) {
			value = value.slice(1, -1);
		}
		out.push({ type: 'code', value });
		cursor = close + ticks;
	}
	return out;
}

/** Every entry in a release, in page order. */
export function releaseEntries(release: Release): ChangeEntry[] {
	return release.groups.flatMap((group) => group.entries);
}
