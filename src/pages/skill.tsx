import type { JSX } from "solid-js";
import { For } from "solid-js";
import type { ShotContext } from "../lib/demo";
import {
	ComponentPreview,
	DocPage,
	DocSection,
	Prose,
} from "../lib/doc-page";
import { color, siteType, weight } from "../lib/theme";
import { CopyExample } from "./skill/copy-example";
import { MenuExample } from "./skill/menu-example";
import { PressExample } from "./skill/press-example";
import { TabsExample } from "./skill/tabs-example";
import { Timeline } from "./skill/timeline";

export const title = "Skill";
export const heading = "/fluid-functionalism skill";
export const group = "System";
export const order = 5;
export const layout = "docs";
export const listed = "sidebar";

const DESCRIPTION =
	"Gives your coding agent the components and the craft behind them, then puts both to work on your project.";
export const menuKeywords = ["skill", ...DESCRIPTION.split(/\W+/)];

/**
 * Installation: a prompt rather than the bare command, so the agent goes on to
 * run the skill once on the project. It names the skill, so an agent that
 * already has it skips the install. Global (-g) keeps the skill out of the
 * user's repo; -y skips the CLI's prompts, which an agent shell can't answer.
 */
const INSTALL_PROMPT =
	"Install the fluid-functionalism skill with `npx skills add mickadesign/fluid-functionalism -g -y` (skip this if you already have it). Then read its SKILL.md and use it to audit this project.";

/** What it does: 1 line per job. The detail lives in SKILL.md. */
const JOBS = [
	{ title: "Read your stack", body: "To understand your project." },
	{
		title: "Suggests 2 to 5 upgrades",
		body: "Ranked by what your users will notice.",
	},
	{
		title: "Aligns your UI",
		body: "Installs what fits, matches the rest.",
	},
];

/** One example per recipe the skill teaches: weight without reflow, fluid hover, the icon swap, and a press that never warps. */
const EXAMPLES: {
	slug: string;
	label: string;
	caption: string;
	Example: () => JSX.Element;
}[] = [
	{
		slug: "tabs",
		label: "Tabs",
		caption: "Active labels get heavier without shifting neighboring tabs.",
		Example: TabsExample,
	},
	{
		slug: "menu",
		label: "Menu",
		caption: "One highlight follows your pointer smoothly between menu items.",
		Example: MenuExample,
	},
	{
		slug: "copy",
		label: "Copy field",
		caption: "Hover and click anywhere on the text to copy.",
		Example: CopyExample,
	},
	{
		slug: "press",
		label: "Button press",
		caption: "Buttons scale down the same size no matter the width.",
		Example: PressExample,
	},
];

/** One subsection per example, every one looping while it is on screen. The title is the docs' h3 (`text-site-subtitle`, semibold, `leading-none`), tucked against its caption like a section title is. */
function Example(props: {
	index: number;
	slug: string;
	label: string;
	caption: string;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 16,
				marginTop: props.index === 0 ? 8 : 24,
			}}
		>
			<div style={{ marginBottom: -8 }}>
				<text
					style={{
						...siteType.subtitle,
						lineHeight: siteType.subtitle.fontSize,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					{props.label}
				</text>
			</div>
			<Prose>{props.caption}</Prose>
			<ComponentPreview testId={`skill-${props.slug}`} hideHeader>
				<div
					style={{
						display: "flex",
						width: "100%",
						justifyContent: "center",
					}}
				>
					{props.children}
				</div>
			</ComponentPreview>
		</div>
	);
}

export async function scenarios(shot: ShotContext) {
	// The wheel keeps GPUI's sign: negative scrolls down. It scrolls from the page column's left gutter so the pointer never rests inside an example, where it would stop the script.
	await shot.hover("skill-timeline");
	shot.capture("timeline-hover");
	await shot.moveTo(285, 400);

	// Each example plays on its own once it is on screen: the script's cursor glides and clicks.
	await shot.scroll(285, 400, 0, -700);
	await shot.settle(900);
	shot.capture("tabs-playing");
	await shot.settle(1600);
	shot.capture("tabs-playing-2");
	// A visitor's pointer inside an example takes over from its script.
	await shot.click("tabs-skill-tab-2");
	await shot.hover("tabs-skill-tab-1");
	shot.capture("tabs-visitor");
	await shot.click("tabs-generic-tab-1");
	shot.capture("tabs-visitor-generic");
	await shot.moveTo(285, 400);

	await shot.scroll(285, 400, 0, -500);
	await shot.settle(1200);
	shot.capture("menu-playing");
	await shot.settle(1200);
	shot.capture("menu-playing-2");
	await shot.hover("menu-skill-row-2");
	shot.capture("menu-visitor-hover");
	await shot.click("menu-skill-row-3");
	await shot.hover("menu-skill-row-4");
	shot.capture("menu-visitor-selected");
	await shot.hover("menu-generic-row-1");
	shot.capture("menu-visitor-generic");
	await shot.moveTo(285, 400);

	await shot.scroll(285, 400, 0, -500);
	await shot.settle(1500);
	shot.capture("copy-playing");
	await shot.hover("copy-skill");
	shot.capture("copy-visitor-hover");
	await shot.moveTo(285, 400);

	await shot.scroll(285, 400, 0, -600);
	await shot.settle(1500);
	shot.capture("press-playing");
	await shot.down("press-generic-1");
	shot.capture("press-generic-pressed");
	await shot.up("press-generic-1");
	await shot.down("press-skill-1");
	shot.capture("press-skill-pressed");
	await shot.up("press-skill-1");
	await shot.down("press-generic-0");
	await shot.moveTo(285, 400);
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={DESCRIPTION}
			installNote="One prompt for your coding agent: it installs the skill, then audits your project with it."
			installPrompt={INSTALL_PROMPT}
		>
			<DocSection title="What it does">
				<Timeline steps={JOBS} />
			</DocSection>

			<DocSection title="What it knows">
				<Prose>
					The craft behind every component, distilled from its implementation
					and code comments: exact values, interaction rules, edge cases, and
					why each detail matters. Once the FF components are in place, your
					agent uses this knowledge to apply the final layer of craft to your
					interface, from spacing and alignment to motion and feedback.
				</Prose>
			</DocSection>

			<DocSection title="Examples">
				<Prose>
					What your agent writes on its own, next to what it writes with the
					skill.
				</Prose>
				<For each={EXAMPLES}>
					{(example, index) => (
						<Example
							index={index()}
							slug={example.slug}
							label={example.label}
							caption={example.caption}
						>
							<example.Example />
						</Example>
					)}
				</For>
			</DocSection>
		</DocPage>
	);
}
