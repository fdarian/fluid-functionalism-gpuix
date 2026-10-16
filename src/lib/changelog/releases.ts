import { latestMarks, loadReleases } from './load';

/** Parsed once, when the app starts, so a malformed release fails there; the Changelog page and the site nav's dots both read this list. */
export const releases = loadReleases();
export const marks = latestMarks(releases);
