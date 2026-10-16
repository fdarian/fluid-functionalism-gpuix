import { createSignal, For, type JSX } from "solid-js";
import type { ShotContext } from "../lib/demo";
import {
	color,
	type Scheme,
	type as scale,
	setThemeChoice,
	weight,
} from "../lib/theme";
import { ColorPickerDemo, InviteDialogDemo } from "./surfaces/examples";
import { ProblemDemo } from "./surfaces/problem";
import {
	ElevatedDemo,
	ElevationStackDemo,
	SubstrateDemo,
	TokensDemo,
} from "./surfaces/solution";

export const title = "Surfaces";
export const group = "System";
/** The sidebar's System group is alphabetical: Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography. */
export const order = 6;
export const layout = "docs";
export const listed = "sidebar";
export const menuKeywords = [
	"surfaces",
	"Eight",
	"level",
	"surface",
	"and",
	"shadow",
	"ladder",
	"for",
	"elevation",
	"in",
	"light",
	"and",
	"dark",
	"mode",
];

/** `text-site-subtitle`: the type scale has no such role yet. */
const SUBTITLE = { fontSize: 14, lineHeight: 20 } as const;

export async function scenarios(shot: ShotContext) {
	// The wheel keeps GPUI's sign: negative scrolls down.
	const scrollTo = async (testId: string) => {
		for (let tick = 0; tick < 40; tick++) {
			const centre = shot.centerOf(testId);
			if (centre.y < 460) return;
			await shot.scroll(600, 400, 0, -300);
		}
		throw new Error(`${testId} never scrolled into view`);
	};
	/** The dark previews must stay dark when the page is light. */
	const inLight = async (name: string) => {
		setThemeChoice("light");
		await shot.settle(600);
		shot.capture(name);
		setThemeChoice("dark");
		await shot.settle(600);
	};

	await scrollTo("problem");
	shot.capture("problem");
	await shot.click("problem-code");
	shot.capture("problem-code");
	await shot.click("problem-preview");
	await inLight("problem-light");
	await scrollTo("tokens");
	shot.capture("tokens");
	await inLight("tokens-light");
	await scrollTo("substrate");
	shot.capture("substrate");
	await scrollTo("elevated");
	shot.capture("elevated");
	await scrollTo("stack");
	await shot.hover("stack");
	shot.capture("stack");
	// A press on the track's far end moves the nearer knob there: surface-1 to surface-4 becomes 1 to 8.
	const slider = shot.centerOf("stack-slider");
	await shot.clickAt(slider.x + 245, slider.y);
	shot.capture("stack-all-levels");
	await scrollTo("invite");
	shot.capture("invite-dialog");
	await scrollTo("color-picker");
	shot.capture("color-picker");
	await inLight("color-picker-light");
}

function Prose(props: { children: string }) {
	return (
		<text style={{ ...scale.body, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

/** `text-site-subtitle text-foreground`, with the `mt-*` the source gives it. */
function Subtitle(props: { children: string; marginTop?: number }) {
	return (
		<div style={{ marginTop: props.marginTop }}>
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

/** `DocSection`: 24px of air above, a 16px title tucked 8px against what follows. */
function Section(props: { title: string; children: JSX.Element }) {
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
				<text
					style={{
						...scale.title,
						lineHeight: 16,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					{props.title}
				</text>
			</div>
			{props.children}
		</div>
	);
}

type Word = { text: string; theme?: Scheme };

const DESCRIPTION: readonly Word[] = [
	..."Eight surface levels that nest. Components read their substrate from context and lift relative to it, so popovers, dropdowns, and dialogs stay visible at any depth — in both"
		.split(" ")
		.map((text) => ({ text })),
	{ text: "light", theme: "light" },
	{ text: "and" },
	{ text: "dark", theme: "dark" },
	{ text: "mode." },
];

function ThemeLink(props: { theme: Scheme; children: string }) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<text
			role="button"
			testId={`theme-${props.theme}`}
			onClick={() => setThemeChoice(props.theme)}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				...scale.body,
				color: hovered() ? color.foreground : color.mutedForeground,
				textDecoration: "underline",
				cursor: "pointer",
			}}
		>
			{props.children}
		</text>
	);
}

/**
 * The description's "light" and "dark" switch the theme. A clickable run
 * cannot sit inside a paragraph in gpuix, so the sentence is laid out word by
 * word and wraps as a row of items.
 */
function Description() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				flexWrap: "wrap",
				columnGap: 3.6,
			}}
		>
			<For each={DESCRIPTION}>
				{(word) =>
					word.theme === undefined ? (
						<Prose>{word.text}</Prose>
					) : (
						<ThemeLink theme={word.theme}>{word.text}</ThemeLink>
					)
				}
			</For>
		</div>
	);
}

export function Page(): JSX.Element {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
			{/* The page heading is `App`'s, a column gap above; the source sets it 8px above the description. */}
			<div style={{ marginTop: -16 }}>
				<Description />
			</div>

			<Section title="The problem">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Prose>
						In light mode, we use shadow behind white surfaces to signify
						elevation. In dark mode, we use progressively lighter backgrounds
						instead.
					</Prose>
					<Prose>
						But traditional components have a fixed background — a dropdown
						often ends up the same color as the dialog it sits in. That makes
						your interface look like this:
					</Prose>
				</div>
				<ProblemDemo />
			</Section>

			<Section title="The solution">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Prose>
						Three pieces: tokens, substrate context, and the primitive.
					</Prose>
				</div>

				<Subtitle marginTop={8}>Tokens</Subtitle>
				<Prose>
					Eight bg/shadow pairs. Light mode flattens to white after step 2
					(shadow alone carries elevation). Dark mode keeps adding white-opacity
					plus a layered shadow recipe.
				</Prose>
				<TokensDemo />

				<Subtitle marginTop={24}>Substrate</Subtitle>
				<Prose>
					Each container knows its own level and tells whatever opens inside. A
					popover on the page and the same popover inside a dialog both end up
					at the right depth, without anything passed between them.
				</Prose>
				<SubstrateDemo />

				<Subtitle marginTop={24}>Elevated</Subtitle>
				<Prose>
					Wrap a panel and the background settles at the level it belongs to.
					The shadow doesn't change, so a popover still reads as a popover three
					layers down.
				</Prose>
				<ElevatedDemo />

				<Subtitle marginTop={24}>Move through levels</Subtitle>
				<Prose>
					Drag both knobs to choose which slice of the ladder to nest. Each
					layer lifts a single step off the one it sits in — whether you span
					two levels or all eight.
				</Prose>
				<ElevationStackDemo />
			</Section>

			<Section title="Examples">
				<Subtitle>Invite dialog</Subtitle>
				<Prose>
					Dialog at surface 5, role picker at surface 7 — no props passed
					between them.
				</Prose>
				<InviteDialogDemo />

				<Subtitle marginTop={24}>Color picker</Subtitle>
				<Prose>
					The format dropdown sits one level above the picker panel.
				</Prose>
				<ColorPickerDemo />
			</Section>
		</div>
	);
}
