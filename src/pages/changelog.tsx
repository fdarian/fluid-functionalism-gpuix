import type { JSX } from "solid-js";
import { loadReleases } from "../lib/changelog/load";
import type { ShotContext } from "../lib/demo";
import { defineIcon } from "../lib/icons";
import { ChangelogView } from "./changelog/changelog-view";

export const title = "Changelog";
export const group = "Pages";
export const order = 2;
export const layout = "docs";
export const listed = "sidebar";
/** lucide `clock`. */
export const menuIcon = defineIcon(
	'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
);
export const menuKeywords = ["releases", "what's new", "updates", "breaking"];

/** Read when the page loads, so a malformed release fails at startup instead of rendering half a page. */
const releases = loadReleases();

export async function scenarios(shot: ShotContext) {
	const target = shot.centerOf("copy-migration-2026-09-breaking-2");
	await shot.scroll(600, 400, 0, target.y - 300);
	shot.capture("breaking");
	const august = shot.centerOf("changelog-heading-2026-08");
	await shot.scroll(600, 400, 0, august.y - 400);
	shot.capture("month-divider");
}

export function Page(): JSX.Element {
	return <ChangelogView releases={releases} />;
}
