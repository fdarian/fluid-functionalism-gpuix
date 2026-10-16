/**
 * The changelog parser against the shipped releases and against malformed ones.
 *
 *   bun scripts/check-changelog.ts
 *
 * The releases must load, run newest first, and have every Breaking entry carry
 * a diff; each malformed release must throw a `ChangelogFormatError`.
 */
import { latestMarks, loadReleases } from "../src/lib/changelog/load";
import { ChangelogFormatError, parseRelease } from "../src/lib/changelog/parse";

function assert(condition: boolean, message: string) {
	if (!condition) throw new Error(`check-changelog: ${message}`);
}

const releases = loadReleases();
assert(releases.length === 3, `expected 3 releases, got ${releases.length}`);
assert(
	releases.map((release) => release.month).join() === "2026-09,2026-08,2026-07",
	"releases are not newest first",
);
for (const release of releases) {
	for (const group of release.groups) {
		for (const entry of group.entries) {
			assert(
				(entry.kind === "breaking") === (entry.diff !== null),
				`${release.month} ${entry.name}: a diff belongs to Breaking entries only`,
			);
		}
	}
}
const marks = latestMarks(releases);
assert(marks.new.includes("combobox"), "combobox is New in 2026-09");
assert(marks.ahead.includes("banner"), "banner is listed ahead of 2026-10");

const HEAD = "---\nmonth: 2026-09\ntitle: T\n---\n\n";
const malformed: Record<string, string> = {
	"no frontmatter": "## New\n",
	"em dash": `${HEAD}## New\n\n- **A**: One — two. (#1)\n`,
	"unknown section": `${HEAD}## Fixed\n\n- **A**: One. (#1)\n`,
	"sections out of order": `${HEAD}## Updated\n\n- **A**: One. (#1)\n\n## New\n\n- **A**: One. (#1)\n`,
	"empty section": `${HEAD}## New\n\n## Updated\n\n- **A**: One. (#1)\n`,
	"breaking without a diff": `${HEAD}## Breaking\n\n- **A**: One. (#1)\n`,
	"no refs": `${HEAD}## New\n\n- **A**: One.\n`,
	"lowercase sentence": `${HEAD}## New\n\n- **A**: one. (#1)\n`,
	"emphasis in a sentence": `${HEAD}## New\n\n- **A**: One *two*. (#1)\n`,
	"off-site link": `${HEAD}## New\n\n- [A](//evil.example): One. (#1)\n`,
};
for (const [name, source] of Object.entries(malformed)) {
	let thrown: unknown;
	try {
		parseRelease(source, `${name}.md`);
	} catch (error) {
		thrown = error;
	}
	assert(
		thrown instanceof ChangelogFormatError,
		`"${name}" should throw a ChangelogFormatError`,
	);
}
console.log("check-changelog: ok");
