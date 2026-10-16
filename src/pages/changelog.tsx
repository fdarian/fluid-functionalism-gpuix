import type { JSX } from "solid-js";
import { releases } from "../lib/changelog/releases";
import type { ShotContext } from "../lib/demo";
import { defineIcon } from "../lib/icons";
import { ChangelogView } from "./changelog/changelog-view";
import { ReleaseIndexCard } from "./changelog/release-index";

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

export async function scenarios(shot: ShotContext) {
	// A click on a Releases row scrolls its month to the top: from the first month, down past stages that mount on the way.
	await shot.click("release-row-2026-08");
	await shot.settle(2500);
	shot.capture("releases-click");
	// A New entry's stage mounts its preview as it nears the viewport; the carousel's is animated, so it carries the page-wide Pause.
	const stage = shot.centerOf("changelog-stage-carousel-dots");
	await shot.scroll(600, 400, 0, stage.y - 400);
	await shot.settle(600);
	shot.capture("preview-stage");
	await shot.click("changelog-playback-carousel-dots");
	shot.capture("preview-stage-paused");
	const target = shot.centerOf("copy-migration-2026-09-breaking-2");
	await shot.scroll(600, 400, 0, target.y - 300);
	shot.capture("breaking");
	// The Releases card follows the month in view: once August's top is above the quarter line its row is filled and its dot grows.
	const august = shot.centerOf("changelog-heading-2026-08");
	await shot.scroll(600, 400, 0, august.y - 250);
	await shot.hover("release-row-2026-07");
	shot.capture("releases-rail");
	const divider = shot.centerOf("changelog-heading-2026-08");
	await shot.scroll(600, 400, 0, divider.y - 400);
	shot.capture("month-divider");
}

export function Page(): JSX.Element {
	return <ChangelogView releases={releases} />;
}

/** The right column's Releases index, in place of "Make them yours". */
export function Rail(): JSX.Element {
	return <ReleaseIndexCard releases={releases} />;
}
