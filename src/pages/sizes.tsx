import type { JSX } from "solid-js";
import type { ShotContext } from "#/lib/demo";
import { Code, DocPage, DocSection, Prose } from "#/lib/doc-page";
import { CompactRegionDemo } from "#/pages/sizes/compact-region";
import { SIZES_INSTALL_PROMPT } from "#/pages/sizes/install-prompt";
import { TokenInspectorDemo } from "#/pages/sizes/token-inspector";
import { TokenTable } from "#/pages/sizes/token-table";
import { ToolbarDemo } from "#/pages/sizes/toolbar";

export const title = "Sizes";
export const group = "System";
/** The sidebar's System group is alphabetical: Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography. */
export const order = 4;
export const layout = "docs";
export const listed = "sidebar";

/** `systemList`'s description of the page, which the source's site menu splits into keywords. */
const LIST_DESCRIPTION =
	"A two-step size ladder — a 36px default and a 28px compact — shared by buttons, inputs, selects, tabs, and rows.";
export const menuKeywords = ["sizes", ...LIST_DESCRIPTION.split(/\W+/)];

/** An `<a>` in the source. An inline box takes no click in gpuix, so the link is underlined text that goes nowhere. */
function Link(props: { children: string }) {
	return <span style={{ textDecoration: "underline" }}>{props.children}</span>;
}

export async function scenarios(shot: ShotContext) {
	shot.capture("top");
	await shot.click("toolbar-code-tab");
	shot.capture("toolbar-code");
	await shot.click("toolbar-preview-tab");

	await shot.scroll(600, 400, 0, 700);
	shot.capture("compact-region");
	await shot.click("compact-region-default");
	shot.capture("compact-region-default");
	await shot.click("compact-region-compact");

	await shot.scroll(600, 400, 0, 500);
	shot.capture("token-inspector");
	await shot.hover("inspect-button");
	shot.capture("inspect-button");
	await shot.hover("inspect-select");
	shot.capture("inspect-select");
	await shot.hover("inspect-row-1");
	shot.capture("inspect-row");
	await shot.click("token-inspector-compact");
	await shot.hover("inspect-button");
	shot.capture("inspect-button-compact");
	await shot.hover("inspect-row-0");
	shot.capture("inspect-row-compact");
	await shot.click("token-inspector-default");

	await shot.scroll(600, 400, 0, 500);
	shot.capture("token-table");
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={
				<Prose>
					Two component sizes: a 36px default and a 28px compact. Press{" "}
					<Code>S</Code> to toggle on the website.
				</Prose>
			}
			installNote="Installs the size-context lib: SizeProvider, the useSize and useTypeScale hooks, the token maps behind both steps, and the type-scale tokens."
			installPrompt={SIZES_INSTALL_PROMPT}
		>
			<DocSection title="The principle">
				<Prose>
					An interface reads as one product when its controls share a sizing
					rhythm. A button next to a select next to a tab should land on the
					same height.
				</Prose>
				<Prose>Each size scales text, icons, and padding together.</Prose>
				<Prose>
					Compact is for dense, data-heavy tools; default is the right call for
					everything else.
				</Prose>
				<ToolbarDemo />
			</DocSection>

			<DocSection title="Typography scale">
				<Prose>
					Type follows the ladder. Compact drops each of the six roles one
					notch, size and leading together, so a dense screen keeps the same
					hierarchy at a smaller size. The full scale lives on{" "}
					<Link>Typography</Link>.
				</Prose>
			</DocSection>

			<DocSection title="Compact regions">
				<Prose>
					Density is a region decision, not a per-control one. Wrap the region
					in a <Code>SizeProvider</Code> and everything inside follows — menus
					included, since React context crosses portals.
				</Prose>
				<CompactRegionDemo />
			</DocSection>

			<DocSection title="Token reference">
				<Prose>
					The table, measured live: hover a control below and every number in
					the readout is a token from this table. Flip the step and the element
					re-measures under your cursor.
				</Prose>
				<TokenInspectorDemo />
				<TokenTable />
			</DocSection>
		</DocPage>
	);
}
