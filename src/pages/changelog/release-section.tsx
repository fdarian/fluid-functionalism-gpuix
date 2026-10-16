import { createReducedMotion, type HostElement, motion } from "@gpuix/solid";
import { type Accessor, For, type JSX, Show } from "solid-js";
import { monthLabel } from "../../lib/changelog/migration-prompt";
import {
	type ChangeGroup,
	type Inline,
	KIND_LABEL,
	type Release,
} from "../../lib/changelog/parse";
import { color, siteType, motion as tween, weight } from "../../lib/theme";
import { Entry, InlineProse } from "./entry";
import { activeMonth } from "./release-spy";

/** Where a month's dot sits from the top of its block: the middle of the title line. */
const DOT_Y = () => siteType.title.lineHeight / 2;
/** Below the divider: 64px + 1px + 64px, then the title line. */
const DOT_Y_DIVIDED = () => 129 + siteType.title.lineHeight / 2;
const DOT_SIZE = 5;
/** The month in view grows a step, on the same spring as the Releases fill in the rail. */
const ACTIVE_DOT_SCALE = 1.3;
const DOT_RING = 3;

/**
 * The dot at `scale` about its centre. gpuix animates no transform, so the
 * scale is the box's size, its offset to stay centred, its radius and the ring
 * that cuts the timeline's line, each moved by the same factor.
 */
function dot(scale: number, centreY: number) {
	const size = DOT_SIZE * scale;
	return {
		left: DOT_SIZE / 2 - size / 2,
		top: centreY - size / 2,
		width: size,
		height: size,
		borderRadius: size / 2,
		boxShadow: {
			offsetX: 0,
			offsetY: 0,
			blurRadius: 0,
			spreadRadius: DOT_RING * scale,
			color: color.background,
		},
	};
}

function releasedLabel(day: string): string {
	return new Date(
		Date.UTC(
			Number(day.slice(0, 4)),
			Number(day.slice(5, 7)) - 1,
			Number(day.slice(8)),
		),
	).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

/**
 * A dot on each month's heading, joined by one line down the 24px gutter.
 * Each month draws its own stretch of the line: the first starts at its dot,
 * and the last runs on to the end of the page.
 */
function TimelineMark(props: { first: boolean; active: boolean }) {
	const reduced = createReducedMotion();
	const dotY = () => (props.first ? DOT_Y() : DOT_Y_DIVIDED());
	return (
		<>
			<div
				style={{
					position: "absolute",
					left: 2,
					top: props.first ? dotY() : 0,
					bottom: 0,
					width: 1,
					backgroundColor: color.border,
				}}
			/>
			<motion.div
				style={{ position: "absolute", backgroundColor: color.foreground }}
				initial={false}
				animate={dot(props.active ? ACTIVE_DOT_SCALE : 1, dotY())}
				transition={reduced() ? tween.snap : tween.moderate}
			/>
		</>
	);
}

function MonthHeading(props: { release: Release }) {
	return (
		<div
			testId={`changelog-heading-${props.release.month}`}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<text
				style={{
					...siteType.title,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				{monthLabel(props.release.month)}
			</text>
			<Show when={props.release.released}>
				{(released: Accessor<string>) => (
					<text
						style={{
							...siteType.caption,
							fontVariantNumeric: "tabular-nums",
							color: color.mutedForeground,
						}}
					>
						{`Released ${releasedLabel(released())}`}
					</text>
				)}
			</Show>
		</div>
	);
}

/** A hairline above every group, the first included, so it also closes the month's header: 40px on each side. */
function KindGroup(props: { group: ChangeGroup; month: string }): JSX.Element {
	return (
		<div style={{ display: "flex", flexDirection: "column", paddingTop: 40 }}>
			<div
				style={{ height: 1, flexShrink: 0, backgroundColor: color.border }}
			/>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "baseline",
					gap: 8,
					paddingTop: 40,
				}}
			>
				<text
					style={{
						...siteType.subtitle,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					{KIND_LABEL[props.group.kind]}
				</text>
				<text
					style={{
						...siteType.caption,
						fontWeight: weight.normal,
						fontVariantNumeric: "tabular-nums",
						color: color.mutedForeground,
					}}
				>
					{String(props.group.entries.length)}
				</text>
			</div>
			<div style={{ display: "flex", flexDirection: "column", marginTop: 8 }}>
				<For each={props.group.entries}>
					{(entry, index) => (
						<Entry
							id={`${props.month}-${props.group.kind}-${index()}`}
							entry={entry}
							month={props.month}
							first={index() === 0}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

/** One month of the changelog, with its stretch of the timeline in the 24px gutter to its left. */
export function ReleaseSection(props: {
	release: Release;
	first: boolean;
	/** Hands the month's block to the scroll-spy. */
	sectionRef: (element: HostElement) => void;
}) {
	return (
		<div
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				paddingLeft: 24,
			}}
		>
			<TimelineMark
				first={props.first}
				active={activeMonth() === props.release.month}
			/>
			{/* A hairline between months, 64px on each side. -22px reaches back across the gutter to the timeline's line at 2px, so it branches off it. */}
			<Show when={!props.first}>
				<div style={{ paddingTop: 64 }}>
					<div
						style={{
							height: 1,
							marginLeft: -22,
							backgroundColor: color.border,
						}}
					/>
				</div>
			</Show>
			<div
				ref={props.sectionRef}
				testId={`changelog-${props.release.month}`}
				style={{
					display: "flex",
					flexDirection: "column",
					paddingTop: props.first ? 0 : 64,
				}}
			>
				<MonthHeading release={props.release} />
				<div style={{ marginTop: 8 }}>
					<text
						style={{
							...siteType.subtitle,
							fontWeight: weight.semibold,
							color: color.foreground,
						}}
					>
						{props.release.title}
					</text>
				</div>
				<Show when={props.release.intro}>
					{(intro: Accessor<Inline[]>) => (
						<div style={{ marginTop: 8 }}>
							<InlineProse inline={intro()} />
						</div>
					)}
				</Show>
				<For each={props.release.groups}>
					{(group) => <KindGroup group={group} month={props.release.month} />}
				</For>
			</div>
		</div>
	);
}
