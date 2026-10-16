import { createSignal, For, type JSX } from "solid-js";
import type { ShotContext } from "../lib/demo";
import { DocPage, DocSection, Prose, SubHeading } from "../lib/doc-page";
import {
	color,
	type Scheme,
	setThemeChoice,
	siteType,
} from "../lib/theme";
import { ColorPickerDemo, InviteDialogDemo } from "./surfaces/examples";
import { SURFACES_INSTALL_PROMPT } from "./surfaces/install-prompt";
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
	await shot.click("problem-code-tab");
	shot.capture("problem-code");
	await shot.click("problem-preview-tab");
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
				...siteType.body,
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
		<DocPage
			description={<Description />}
			installNote="Installs the Elevated primitive plus the surface-context and surface-classes libs — the elevation ladder as code."
			installPrompt={SURFACES_INSTALL_PROMPT}
		>
			<DocSection title="The problem">
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
			</DocSection>

			<DocSection title="The solution">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Prose>
						Three pieces: tokens, substrate context, and the primitive.
					</Prose>
				</div>

				<SubHeading marginTop={8}>Tokens</SubHeading>
				<Prose>
					Eight bg/shadow pairs. Light mode flattens to white after step 2
					(shadow alone carries elevation). Dark mode keeps adding white-opacity
					plus a layered shadow recipe.
				</Prose>
				<TokensDemo />

				<SubHeading marginTop={24}>Substrate</SubHeading>
				<Prose>
					Each container knows its own level and tells whatever opens inside. A
					popover on the page and the same popover inside a dialog both end up
					at the right depth, without anything passed between them.
				</Prose>
				<SubstrateDemo />

				<SubHeading marginTop={24}>Elevated</SubHeading>
				<Prose>
					Wrap a panel and the background settles at the level it belongs to.
					The shadow doesn't change, so a popover still reads as a popover three
					layers down.
				</Prose>
				<ElevatedDemo />

				<SubHeading marginTop={24}>Move through levels</SubHeading>
				<Prose>
					Drag both knobs to choose which slice of the ladder to nest. Each
					layer lifts a single step off the one it sits in — whether you span
					two levels or all eight.
				</Prose>
				<ElevationStackDemo />
			</DocSection>

			<DocSection title="Examples">
				<SubHeading marginTop={0}>Invite dialog</SubHeading>
				<Prose>
					Dialog at surface 5, role picker at surface 7 — no props passed
					between them.
				</Prose>
				<InviteDialogDemo />

				<SubHeading marginTop={24}>Color picker</SubHeading>
				<Prose>
					The format dropdown sits one level above the picker panel.
				</Prose>
				<ColorPickerDemo />
			</DocSection>
		</DocPage>
	);
}
