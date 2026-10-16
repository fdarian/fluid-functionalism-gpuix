import { For, type JSX } from "solid-js";
import { InputCopy } from "#/components/input-copy";
import type { ShotContext } from "#/lib/demo";
import {
	color,
	siteType,
	weight,
	withAlpha,
} from "#/lib/theme";

export const title = "Introduction";
export const group = "Pages";
export const order = 1;
export const layout = "docs";
export const listed = "sidebar";
export const menuIcon = "square-library";
export const menuKeywords = ["docs", "getting started", "install"];

const MONO = "Menlo";

export async function scenarios(shot: ShotContext) {
	await shot.scroll(600, 400, 0, 2000);
	shot.capture("installation");
	await shot.hover("install-registry");
	shot.capture("installation-hover");
}

const PRINCIPLES = [
	{
		title: "Motion that communicates",
		body: "Every animation here points at something. When two list items merge their backgrounds, the component tells you they belong together. The hover highlight follows your cursor before you click, so the row you're about to land on confirms itself first. Motion has a job to create meaning.",
	},
	{
		title: "Hover as preview",
		body: "The interaction starts before you click. The closest interactive thing to your cursor gets a faint highlight; buttons gain a little weight as you approach. By the time your finger lands, you've had a moment to reconsider, which is mostly the point.",
	},
	{
		title: "Spring physics, not durations",
		body: "Animations use springs, not fixed-duration eases. Toggle a switch and immediately toggle it back: the spring picks up wherever it was and reverses, instead of finishing the first animation before starting the second. Three presets, named fast, moderate, and slow, cover most of the library.",
	},
	{
		title: "Drop-in compatible",
		body: "Built on shadcn/ui. Each component comes in two flavors, Radix or Base UI, so you can match whichever primitive library you've already chosen. Your theme tokens (colors, radii, fonts) work as-is. One CLI command installs a component along with whatever it needs.",
	},
	{
		title: "Customize using the right panel",
		body: "The panel on the right lets you change things on the fly. Switch between light and dark mode, toggle the corner radius from rounded to pill, cycle through different icon libraries, or pick whether the install command grabs the Radix flavor or the Base UI one. Press T, R, or I to flip the first three from the keyboard. The icon switcher is a preview tool that lives on this site — installed components ship with Lucide only, and you can swap in your own icons (see Icons below).",
	},
];

const ICON_PROVIDER_EXAMPLE = [
	'import { IconProvider } from "@/lib/icon-context";',
	'import { CaretRight, MagnifyingGlass } from "@phosphor-icons/react";',
	"",
	'<IconProvider icons={{ "chevron-right": CaretRight, "search": MagnifyingGlass }}>',
	"  <App />",
	"</IconProvider>",
];

function SectionTitle(props: { children: string }) {
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

function Prose(props: { children: string }) {
	return (
		<text style={{ ...siteType.body, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

/** `<hr className="border-border/60 my-8">` is spaced by its own margin on top of the column's gap. */
function Rule(props: { marginTop: number; marginBottom?: number }) {
	return (
		<div
			style={{
				height: 1,
				flexShrink: 0,
				marginTop: props.marginTop,
				marginBottom: props.marginBottom,
				backgroundColor: color.borderFaint,
			}}
		/>
	);
}

/** A command that fits its text, not the column. */
function Command(props: { value: string; testId?: string }) {
	return (
		<div style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
			<InputCopy value={props.value} align="left" testId={props.testId} />
		</div>
	);
}

function Step(props: {
	number: number;
	children: string;
	command: string;
	testId: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				marginTop: 8,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					marginLeft: 4,
				}}
			>
				<div
					style={{
						width: 18,
						height: 18,
						flexShrink: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: 9,
						backgroundColor: color.muted,
					}}
				>
					<text
						style={{
							fontSize: 11,
							lineHeight: 14,
							fontWeight: weight.normal,
							color: color.mutedForeground,
						}}
					>
						{String(props.number)}
					</text>
				</div>
				<Prose>{props.children}</Prose>
			</div>
			<Command value={props.command} testId={props.testId} />
		</div>
	);
}

function CodeBlock(props: { lines: readonly string[] }) {
	return (
		<div
			style={{
				alignSelf: "flex-start",
				maxWidth: "100%",
				overflowX: "scroll",
				borderRadius: 8,
				backgroundColor: withAlpha(color.muted, 0.6),
			}}
		>
			<div
				style={{
					flexShrink: 0,
					display: "flex",
					flexDirection: "column",
					paddingLeft: 16,
					paddingRight: 16,
					paddingTop: 12,
					paddingBottom: 12,
				}}
			>
				<For each={props.lines}>
					{(line) => (
						<text
							style={{
								fontFamily: MONO,
								fontSize: siteType.caption.fontSize,
								lineHeight: siteType.caption.lineHeight,
								fontWeight: weight.normal,
								color: color.mutedForeground,
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

export function Page(): JSX.Element {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{/* The page heading is `App`'s, a column gap above; the source sets it 8px above the subtitle. */}
			<div style={{ marginTop: -16 }}>
				<Prose>Why these components feel different.</Prose>
			</div>

			<div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
				<For each={PRINCIPLES}>
					{(principle) => (
						<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
							<SectionTitle>{principle.title}</SectionTitle>
							<Prose>{principle.body}</Prose>
						</div>
					)}
				</For>
			</div>

			<Rule marginTop={32} marginBottom={32} />
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
					marginBottom: 16,
				}}
			>
				<SectionTitle>Installation</SectionTitle>
				<Step
					number={1}
					command="npx shadcn@latest registry add @fluid"
					testId="install-registry"
				>
					Add the registry to your project:
				</Step>
				<Step
					number={2}
					command="npx shadcn@latest add @fluid/button"
					testId="install-button"
				>
					Install any component:
				</Step>
				<Rule marginTop={16} />
				<Prose>Or install directly without adding the registry:</Prose>
				<Command value="npx shadcn@latest add https://www.fluidfunctionalism.com/r/button.json" />
				<Prose>
					Dependencies and shared utilities are resolved automatically. Font
					weight animations require the Inter variable font.
				</Prose>
			</div>

			<Rule marginTop={32} marginBottom={32} />
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
					marginBottom: 16,
				}}
			>
				<SectionTitle>Icons</SectionTitle>
				<Prose>
					Components render their icons through named slots with Lucide
					defaults, so lucide-react is the only icon dependency an install
					adds. To use another icon library, wrap your app in the installed
					IconProvider and override any slot — names you leave out keep their
					Lucide default:
				</Prose>
				<CodeBlock lines={ICON_PROVIDER_EXAMPLE} />
			</div>
		</div>
	);
}
