import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import {
	type Accessor,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { Button } from "../../components/button";
import { copyToClipboard } from "../../components/input-copy";
import { TabsSubtle, TabsSubtleItem } from "../../components/tabs-subtle";
import { Tooltip } from "../../components/tooltip";
import { Icon } from "../../lib/icon";
import { defineIcon } from "../../lib/icons";
import {
	color,
	focusRing,
	type as scale,
	scheme,
	weight,
	withAlpha,
} from "../../lib/theme";

export const MONO = "Menlo";
/** `text-site-subtitle`, the role between `title` and `body`. */
export const SUBTITLE = { fontSize: 14, lineHeight: 20 } as const;

const NBSP = " ";

/** lucide `rotate-ccw`. */
const rotateCcw = defineIcon(
	'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
);

export function Prose(props: { children: JSX.Element }) {
	return (
		<text style={{ ...scale.body, color: color.mutedForeground }}>
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

function SectionTitle(props: { children: string }) {
	return (
		<text
			style={{
				...scale.title,
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

/** An `h3` (`text-site-subtitle`) at the foot of a section, 32px below what precedes it. */
export function SubHeading(props: { children: string }) {
	return (
		<div style={{ marginTop: 32 }}>
			<text
				style={{
					...SUBTITLE,
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

function CopyPromptButton(props: { prompt: string }) {
	const [copied, setCopied] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));

	const copy = async () => {
		try {
			await copyToClipboard(props.prompt);
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
			testId="copy-prompt"
			variant="primary"
			leadingIcon={copied() ? "check" : "copy"}
			onClick={copy}
		>
			Copy prompt
		</Button>
	);
}

/**
 * `DocPage`'s body: the description under `App`'s heading, the Installation
 * block with its note and Copy prompt button, then the sections.
 */
export function DocPage(props: {
	description: string;
	installNote: string;
	installPrompt: string;
	children: JSX.Element;
}) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{/* The heading is `App`'s, a column gap above; the source sets the description 8px under its title. */}
			<div style={{ marginTop: -16 }}>
				<Prose>{props.description}</Prose>
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

function ReplayButton(props: { testId: string; onClick: () => void }) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	return (
		<Tooltip content="Replay animation" side="top">
			<div
				{...buttonProps({ onClick: props.onClick }, renderer)}
				testId={props.testId}
				aria-label="Replay animation"
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
					name={rotateCcw}
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
								...scale.body,
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

/**
 * The docs' preview frame: a Preview / Code tab bar over the live demo, with
 * an optional replay button. The Inspect switch and ruler overlay are not
 * ported, and the Code tab is plain monospace without highlighting.
 */
export function ComponentPreview(props: {
	testId: string;
	code: string;
	onReplay?: () => void;
	minHeight?: number;
	children: JSX.Element;
}) {
	const [tab, setTab] = createSignal(0);
	const minHeight = () => props.minHeight ?? 120;
	return (
		<div
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
				<Show when={props.onReplay}>
					{(replay: Accessor<() => void>) => (
						<ReplayButton
							testId={`${props.testId}-replay`}
							onClick={replay()}
						/>
					)}
				</Show>
			</div>
			<div
				style={{
					overflow: "hidden",
					borderBottomLeftRadius: 11,
					borderBottomRightRadius: 11,
				}}
			>
				<Show
					when={tab() === 0}
					fallback={<CodeView code={props.code} minHeight={minHeight()} />}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							minHeight: minHeight(),
							paddingLeft: 32,
							paddingRight: 32,
							paddingTop: 48,
							paddingBottom: 48,
							backgroundColor: color.background,
						}}
					>
						{props.children}
					</div>
				</Show>
			</div>
		</div>
	);
}
