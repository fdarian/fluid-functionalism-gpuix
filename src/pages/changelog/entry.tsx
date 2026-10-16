import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import { type Accessor, createSignal, For, type JSX, Show } from "solid-js";
import { entryInstall } from "../../lib/changelog/install";
import { kindDotColor } from "../../lib/changelog/kind-style";
import { buildMigrationPrompt } from "../../lib/changelog/migration-prompt";
import type {
	ChangeEntry,
	ChangeKind,
	ChangeRef,
	Inline,
} from "../../lib/changelog/parse";
import { Code, CopyPromptButton, MONO, Prose } from "../../lib/doc-page";
import { Icon } from "../../lib/icon";
import { openUrl } from "../../lib/open-url";
import { usePageNav } from "../../lib/page-nav";
import { color, colorFade, focusRing, siteType, weight } from "../../lib/theme";
import { DiffBlock } from "./diff-block";

const REPO = "https://github.com/mickadesign/fluid-functionalism";

/** The port routes by slug alone: `/docs/banner` is the page `banner`. */
function pageSlug(href: string): string {
	const slug = /^\/docs\/([^/#]+)$/.exec(href)?.[1];
	if (slug === undefined) {
		throw new Error(
			`The changelog links to ${href}, which is not a /docs/<slug> page`,
		);
	}
	return slug;
}

function InlineText(props: { inline: Inline[] }): JSX.Element {
	return (
		<For each={props.inline}>
			{(part) =>
				part.type === "code" ? <Code>{part.value}</Code> : part.value
			}
		</For>
	);
}

export function InlineProse(props: { inline: Inline[] }) {
	return (
		<Prose>
			<InlineText inline={props.inline} />
		</Prose>
	);
}

/**
 * The kind's colour on the timeline, level with an entry's name. The name line
 * starts 24px right of the timeline, so -24px puts this 5px dot's centre on
 * it; the 3px ring of page colour keeps the line from touching it. The outer
 * box is the page colour, so Updated's translucent gray reads as the line's
 * own colour instead of letting the line show through.
 */
function KindDot(props: { kind: ChangeKind }) {
	return (
		<div
			style={{
				position: "absolute",
				left: -24,
				top: (siteType.body.lineHeight - 5) / 2,
				width: 5,
				height: 5,
				borderRadius: 2.5,
				backgroundColor: color.background,
				boxShadow: `0 0 0 3px ${color.background}`,
			}}
		>
			<div
				style={{
					width: 5,
					height: 5,
					borderRadius: 2.5,
					backgroundColor: kindDotColor(props.kind),
				}}
			/>
		</div>
	);
}

/** The name of an entry that has a page: the arrow beside it nudges right and brightens on hover. */
function NameLink(props: { name: string; slug: string }) {
	const renderer = useGpuixRequired();
	const nav = usePageNav();
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			{...buttonProps({ onClick: () => nav.navigate(props.slug) }, renderer)}
			testId={`changelog-link-${props.slug}`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 6,
				borderRadius: 6,
				cursor: "pointer",
				focusVisible: focusRing(0),
			}}
		>
			<text
				style={{
					...siteType.body,
					fontWeight: weight.normal,
					color: color.foreground,
				}}
			>
				{props.name}
			</text>
			<div
				style={{
					marginLeft: hovered() ? 2 : 0,
					transitionProperty: "margin-left",
					transitionDuration: "80ms",
				}}
			>
				<Icon
					name="arrow-right"
					size={14}
					strokeWidth={1.5}
					color={hovered() ? color.foreground : color.mutedForeground}
					fade
				/>
			</div>
		</div>
	);
}

function RefChip(props: { gitRef: ChangeRef }) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	const label = () =>
		props.gitRef.type === "pr"
			? `#${props.gitRef.number}`
			: props.gitRef.sha.slice(0, 7);
	const url = () =>
		props.gitRef.type === "pr"
			? `${REPO}/pull/${props.gitRef.number}`
			: `${REPO}/commit/${props.gitRef.sha}`;
	return (
		<div
			{...buttonProps(
				{
					onClick: () => {
						openUrl(url()).catch((error: unknown) => {
							console.error("Opening the changelog ref failed", error);
						});
					},
				},
				renderer,
			)}
			aria-label={
				props.gitRef.type === "pr"
					? `Pull request ${props.gitRef.number} on GitHub`
					: `Commit ${props.gitRef.sha} on GitHub`
			}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				height: 20,
				display: "flex",
				alignItems: "center",
				paddingLeft: 6,
				paddingRight: 6,
				borderRadius: 6,
				cursor: "pointer",
				backgroundColor: hovered() ? color.active : color.transparent,
				...colorFade,
				focusVisible: focusRing(0),
			}}
		>
			<text
				style={{
					fontFamily: MONO,
					fontSize: siteType.caption.fontSize,
					lineHeight: siteType.caption.lineHeight,
					fontWeight: weight.normal,
					fontVariantNumeric: "tabular-nums",
					color: hovered() ? color.foreground : color.mutedForeground,
				}}
			>
				{label()}
			</text>
		</div>
	);
}

/**
 * An entry: the name (linked to its page when it has one) with the refs on
 * the right, the sentence under them, and for Breaking the diff and a
 * migration prompt. Space goes above a block: 24px between entries, 4px under
 * the name, 12px above a diff. New entries' preview stages are not ported yet.
 */
export function Entry(props: {
	/** `month-kind-index`, which names the entry's test ids. */
	id: string;
	entry: ChangeEntry;
	month: string;
	first: boolean;
}) {
	const entry = () => props.entry;
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				paddingTop: props.first ? 0 : 24,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 16,
					paddingTop: 8,
				}}
			>
				<div style={{ position: "relative", display: "flex" }}>
					<KindDot kind={entry().kind} />
					<Show
						when={entry().href}
						fallback={
							<text
								style={{
									...siteType.body,
									fontWeight: weight.normal,
									color: color.foreground,
								}}
							>
								{entry().name}
							</text>
						}
					>
						{(href: Accessor<string>) => <NameLink name={entry().name} slug={pageSlug(href())} />}
					</Show>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						marginRight: -6,
					}}
				>
					<For each={entry().refs}>
						{(gitRef) => <RefChip gitRef={gitRef} />}
					</For>
				</div>
			</div>
			<div style={{ marginTop: 4 }}>
				<InlineProse inline={entry().text} />
			</div>
			<Show when={entry().diff}>
				{(diff: Accessor<string>) => (
					<div
						style={{
							marginTop: 12,
							display: "flex",
							flexDirection: "column",
							alignItems: "flex-start",
							gap: 12,
						}}
					>
						<DiffBlock diff={diff()} />
						<CopyPromptButton
							label="Copy migration prompt"
							variant="ghost"
							testId={`copy-migration-${props.id}`}
							prompt={buildMigrationPrompt({
								entry: entry(),
								month: props.month,
								install: entryInstall(entry()),
							})}
						/>
					</div>
				)}
			</Show>
		</div>
	);
}
