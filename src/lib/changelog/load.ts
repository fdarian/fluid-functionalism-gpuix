import changelogFiles from 'virtual:changelog';
import {
	type ChangeKind,
	ChangelogFormatError,
	parseRelease,
	type Release,
	releaseEntries,
} from './parse';

export interface ChangelogFile {
	/** `YYYY-MM.md` */
	name: string;
	text: string;
}

const FILE = /^(\d{4}-\d{2})\.md$/;

/** Every release, newest month first. Throws on a malformed file. */
export function loadReleases(
	files: readonly ChangelogFile[] = changelogFiles,
): Release[] {
	return [...files]
		.filter((file) => FILE.test(file.name))
		.sort((a, b) => b.name.localeCompare(a.name))
		.map((file) => {
			const name = file.name;
			const release = parseRelease(file.text, `content/changelog/${name}`);
			if (release.month !== FILE.exec(name)?.[1]) {
				throw new ChangelogFormatError(
					`content/changelog/${name}`,
					2,
					'`month` does not match the file name',
				);
			}
			return release;
		});
}

export interface AheadOfRelease {
	/** The month the pages landed in: `YYYY-MM`. */
	month: string;
	slugs: string[];
}

/**
 * Docs pages that landed after the latest release, badged New ahead of the
 * release that will list them. An entry lapses on its own once a release for
 * its month exists, so nothing needs undoing on release day. The sidebar's
 * dots stay release-only.
 */
export const AHEAD_OF_RELEASE: AheadOfRelease[] = [
	// Merged in October 2026; the October release ships Friday 2026-11-06.
	{ month: '2026-10', slugs: ['banner', 'typography'] },
];

/** The doc slugs the latest release marks, and the pages listed ahead of the next one. */
export interface ReleaseMarks {
	new: string[];
	updated: string[];
	/** Landed after the latest release: badged New until the release that lists them. */
	ahead: string[];
}

/**
 * The doc slugs the latest release marks: New for its New entries, Updated for
 * its Updated and Breaking ones, plus the pages listed ahead of the next
 * release. The sidebar dots the release's New ones, so every marker moves on
 * with each release.
 */
export function latestMarks(
	releases: readonly Release[],
	ahead = AHEAD_OF_RELEASE,
): ReleaseMarks {
	const latest = releases[0];
	const pending = ahead
		.filter((entry) => latest === undefined || entry.month > latest.month)
		.flatMap((entry) => entry.slugs);
	if (latest === undefined) return { new: [], updated: [], ahead: pending };

	const slugs = (kinds: ChangeKind[]) =>
		releaseEntries(latest)
			.filter((entry) => kinds.includes(entry.kind))
			.flatMap((entry) => {
				const slug =
					entry.href === null
						? undefined
						: /^\/docs\/([^/#?]+)/.exec(entry.href)?.[1];
				return slug === undefined ? [] : [slug];
			});
	const added = slugs(['new']);
	return {
		new: added,
		updated: slugs(['updated', 'breaking']).filter(
			(slug) => !added.includes(slug) && !pending.includes(slug),
		),
		ahead: pending,
	};
}
