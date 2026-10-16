import {
	buttonProps,
	type HostElement,
	IntersectionObserver,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { Button, type ButtonVariant } from "../components/button";
import { TabsSubtle, TabsSubtleItem } from "../components/tabs-subtle";
import { Tooltip } from "../components/tooltip";
import { PageScrollerContext } from "./demo-kit";
import { Icon } from "./icon";
import { defineIcon, type IconRef } from "./icons";
import {
	color,
	focusRing,
	type Scheme,
	SchemeScope,
	scheme,
	siteType,
	weight,
	withAlpha,
} from "./theme";

export const MONO = "Menlo";

const NBSP = " ";

/** lucide `rotate-ccw`. */
const rotateCcw = defineIcon(
	'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
);

export function Prose(props: { children: JSX.Element }) {
	return (
		<text style={{ ...siteType.body, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

/**
 * Inline code chip: `mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5
 * text-site-caption`. An inline box takes no padding, margin, radius or font
 * size, so the 4px of each is a no-break space (Inter's is about 3.6px) around
 * the monospace run, and the chip is 13px where the source's is 12px.
 */
export function Code(props: { children: string }) {
	return (
		<>
			{NBSP}
			<span
				style={{
					backgroundColor: scheme() === "light" ? "#EBEBED" : "#2C2C2C",
					color: color.foreground,
				}}
			>
				{NBSP}
				<span style={{ fontFamily: MONO }}>{props.children}</span>
				{NBSP}
			</span>
			{NBSP}
		</>
	);
}

export function SectionTitle(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.title,
				lineHeight: 16,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

/** `DocSection`: 24px more air above than the page's gap, the title tucked 8px above its text, 16px below. */
export function DocSection(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 16,
				paddingTop: 24,
			}}
		>
			<div style={{ marginBottom: -8 }}>
				<SectionTitle>{props.title}</SectionTitle>
			</div>
			{props.children}
		</div>
	);
}

/** An `h3` (`text-site-subtitle`) at the foot of a section, `marginTop` (32px by default) below what precedes it. */
export function SubHeading(props: { children: string; marginTop?: number }) {
	return (
		<div style={{ marginTop: props.marginTop ?? 32 }}>
			<text
				style={{
					...siteType.subtitle,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

const COPIED_MS = 2000;

/** The docs pages' Copy prompt button; `label` and `variant` serve the changelog's own prompts. */
export function CopyPromptButton(props: {
	prompt: string;
	label?: string;
	variant?: ButtonVariant;
	testId?: string;
}) {
	const [copied, setCopied] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(props.prompt);
		} catch (error) {
			console.error("Copy prompt failed", error);
			return;
		}
		setCopied(true);
		clearTimeout(timer);
		timer = setTimeout(() => setCopied(false), COPIED_MS);
	};

	return (
		<Button
			testId={props.testId ?? "copy-prompt"}
			variant={props.variant ?? "primary"}
			leadingIcon={copied() ? "check" : "copy"}
			onClick={copy}
		>
			{props.label ?? "Copy prompt"}
		</Button>
	);
}

/**
 * `DocPage`'s body: the description under `App`'s heading, the Installation
 * block with its note and Copy prompt button, then the sections.
 */
export function DocPage(props: {
	description: JSX.Element;
	/** A paragraph under the description, 16px below it, read before the install. */
	intro?: string;
	installNote: string;
	installPrompt: string;
	children: JSX.Element;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{/* The heading is `App`'s, a column gap above; the source sets the description 8px under its title. */}
			<div
				style={{
					marginTop: -16,
					display: "flex",
					flexDirection: "column",
					gap: 16,
				}}
			>
				{props.description}
				<Show when={props.intro}>
					{(intro: Accessor<string>) => <Prose>{intro()}</Prose>}
				</Show>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 16,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 8,
						flexShrink: 1,
						minWidth: 0,
					}}
				>
					<SectionTitle>Installation</SectionTitle>
					<Prose>{props.installNote}</Prose>
				</div>
				<CopyPromptButton prompt={props.installPrompt} />
			</div>
			{props.children}
		</div>
	);
}

/** What the preview header's icon button shows and does. */
type Playback = {
	icon: IconRef;
	tooltip: string;
	onClick: () => void;
	testId?: string;
};

function PlaybackButton(props: Required<Playback>) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	return (
		<Tooltip content={props.tooltip} side="top">
			<div
				{...buttonProps({ onClick: props.onClick }, renderer)}
				testId={props.testId}
				aria-label={props.tooltip}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					width: 40,
					height: 40,
					flexShrink: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: 8,
					cursor: "pointer",
					keyboardFocusDim: false,
					backgroundColor: hovered() ? color.hover : color.transparent,
					transitionProperty: "background-color",
					transitionDuration: "100ms",
					transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
					focusVisible: focusRing(0),
				}}
			>
				<Icon
					name={props.icon}
					size={16}
					strokeWidth={1.5}
					color={hovered() ? color.foreground : color.mutedForeground}
					fade
				/>
			</div>
		</Tooltip>
	);
}

function CodeView(props: { code: string; minHeight: number }) {
	return (
		<div style={{ overflowX: "auto" }}>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					flexShrink: 0,
					minHeight: props.minHeight,
					padding: 16,
				}}
			>
				<For each={props.code.split("\n")}>
					{(line) => (
						<text
							style={{
								fontFamily: MONO,
								...siteType.body,
								fontWeight: weight.normal,
								color: color.foreground,
								whiteSpace: "pre",
							}}
						>
							{line === "" ? " " : line}
						</text>
					)}
				</For>
			</div>
		</div>
	);
}

/** The source's `DarkPreview` (`dark bg-background`): the frame, header included, resolves its tokens in `scheme` whatever the page's. */
function ForcedScheme(props: { scheme?: Scheme; children: JSX.Element }) {
	return (
		<Show when={props.scheme} fallback={props.children}>
			{(forced: Accessor<Scheme>) => (
				<SchemeScope scheme={forced()}>
					<div style={{ backgroundColor: color.background, borderRadius: 12 }}>
						{props.children}
					</div>
				</SchemeScope>
			)}
		</Show>
	);
}

const CULL_OVERSCAN = "25% 0px";

/**
 * gpuix lays out and paints everything a scroller clips away, so a preview more
 * than a viewport from the page scroller hides its content with `display: none`
 * and keeps the height it had (the same rule as `DemoCard`). Call it once per
 * preview, and only where the page provides `PageScrollerContext`.
 */
function createCulling() {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"A culled ComponentPreview must be inside the page's PageScrollerContext",
		);
	}
	const [far, setFar] = createSignal(false);
	const [farHeight, setFarHeight] = createSignal<number>();
	let observed: HostElement | undefined;

	createEffect(() => {
		const root = scroller();
		if (root === undefined || observed === undefined) return;
		const target = observed;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest.isIntersecting) {
					setFar(false);
					return;
				}
				setFarHeight(target.getBoundingClientRect().height);
				setFar(true);
			},
			{ root, rootMargin: CULL_OVERSCAN },
		);
		observer.observe(target);
		onCleanup(() => observer.disconnect());
	});

	return {
		far,
		farHeight,
		ref: (element: HostElement) => {
			observed = element;
		},
	};
}

const PREVIEW_PADDING = {
	default: { x: 32, y: 48 },
	compact: { x: 16, y: 16 },
	none: { x: 0, y: 0 },
} as const;

/**
 * The docs' preview frame: a Preview / Code tab bar over the live demo, with
 * an optional replay button. The Inspect switch and ruler overlay are not
 * ported, and the Code tab is plain monospace without highlighting.
 *
 * `scheme` draws the whole frame in that scheme (the source's `DarkPreview`);
 * `padding` is the demo's inset: `default` is `px-8 py-12`, `compact` the
 * source's `px-4 py-4`, `none` lets the demo bleed to the frame. `playback`
 * replaces the replay button with another icon button (a pause / play);
 * `cull` hides the demo while it is far from the page scroller, for pages with
 * many live previews. `cull` is read once, at mount.
 */
export function ComponentPreview(props: {
	testId: string;
	/** Required unless `hideHeader`: the header holds the only way to reach the Code tab. */
	code?: string;
	onReplay?: () => void;
	playback?: Playback;
	cull?: boolean;
	minHeight?: number;
	scheme?: Scheme;
	padding?: keyof typeof PREVIEW_PADDING;
	/** The frame shows just the live demo, with no Preview / Code header. */
	hideHeader?: boolean;
	children: JSX.Element;
}) {
	const culling = props.cull === true ? createCulling() : undefined;
	const [tab, setTab] = createSignal(0);
	const minHeight = () => props.minHeight ?? 120;
	const padding = () => PREVIEW_PADDING[props.padding ?? "default"];
	const codeOf = () => {
		if (props.code === undefined) throw new Error("ComponentPreview needs `code` for its Code tab");
		return props.code;
	};
	return (
		<ForcedScheme scheme={props.scheme}>
			<div
				testId={props.testId}
				style={{
					display: "flex",
					flexDirection: "column",
					borderRadius: 12,
					borderWidth: 1,
					borderColor: color.borderFaint,
					transitionProperty: "border-color",
					transitionDuration: "150ms",
					transitionTimingFunction: "ease-out",
					focusWithin: { borderColor: withAlpha(color.foreground, 0.4) },
				}}
			>
				<Show when={props.hideHeader !== true}>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
							minHeight: 52,
							padding: 12,
							borderBottomWidth: 1,
							borderColor: color.borderFaint,
						}}
					>
						<TabsSubtle
							testId={`${props.testId}-tabs`}
							selectedIndex={tab()}
							onSelect={setTab}
						>
							<TabsSubtleItem
								testId={`${props.testId}-preview-tab`}
								index={0}
								label="Preview"
							/>
							<TabsSubtleItem
								testId={`${props.testId}-code-tab`}
								index={1}
								label="Code"
							/>
						</TabsSubtle>
						<Show when={props.playback}>
							{(playback: Accessor<NonNullable<typeof props.playback>>) => (
								<PlaybackButton
									icon={playback().icon}
									tooltip={playback().tooltip}
									testId={playback().testId ?? `${props.testId}-playback`}
									onClick={playback().onClick}
								/>
							)}
						</Show>
						<Show when={props.playback === undefined ? props.onReplay : undefined}>
							{(replay: Accessor<() => void>) => (
								<PlaybackButton
									icon={rotateCcw}
									tooltip="Replay animation"
									testId={`${props.testId}-replay`}
									onClick={replay()}
								/>
							)}
						</Show>
					</div>
				</Show>
				<div
					style={{
						overflow: "hidden",
						...(props.hideHeader === true
							? { borderRadius: 11 }
							: { borderBottomLeftRadius: 11, borderBottomRightRadius: 11 }),
					}}
				>
					<Show
						when={tab() === 0}
						fallback={<CodeView code={codeOf()} minHeight={minHeight()} />}
					>
						<div
							ref={culling?.ref}
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								minHeight: minHeight(),
								height: culling?.far() ? culling.farHeight() : undefined,
								paddingLeft: padding().x,
								paddingRight: padding().x,
								paddingTop: padding().y,
								paddingBottom: padding().y,
								backgroundColor: color.background,
							}}
						>
							<Show when={culling} fallback={props.children}>
								{(culled: Accessor<NonNullable<typeof culling>>) => (
									<div
										style={{
											display: culled().far() ? "none" : "contents",
										}}
									>
										{props.children}
									</div>
								)}
							</Show>
						</div>
					</Show>
				</div>
			</div>
		</ForcedScheme>
	);
}
