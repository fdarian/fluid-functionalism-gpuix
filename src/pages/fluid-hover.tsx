import { For, type JSX } from "solid-js";
import type { ShotContext } from "#/lib/demo";
import {
	Code,
	DocPage,
	DocSection,
	Prose,
	SectionTitle,
} from "#/lib/doc-page";
import { color } from "#/lib/theme";
import { AxesDemo } from "#/pages/fluid-hover/axes";
import { CostDemo } from "#/pages/fluid-hover/cost";
import { ListsDemo } from "#/pages/fluid-hover/lists";
import { FLUID_HOVER_INSTALL_PROMPT } from "#/pages/fluid-hover/install-prompt";
import { PlainVsFluidDemo } from "#/pages/fluid-hover/plain-vs-fluid";
import { ShowTheMathDemo } from "#/pages/fluid-hover/show-the-math";

export const title = "Fluid Hover";
export const group = "System";
export const order = 1;
export const layout = "docs";
export const listed = "sidebar";

const DESCRIPTION =
	"Hover that never blinks and always follows your cursor to the nearest item.";

// The source builds these from the slug and the description's words.
export const menuKeywords = [
	"fluid-hover",
	...DESCRIPTION.split(/\W+/).filter((word) => word !== ""),
];

export async function scenarios(shot: ShotContext) {
	const scrollTo = async (testId: string) => {
		for (let tick = 0; tick < 40; tick++) {
			const centre = shot.centerOf(testId);
			if (centre.y < 460) return;
			await shot.scroll(600, 400, 0, 300);
		}
		throw new Error(`${testId} never scrolled into view`);
	};
	// The scripted cursors ride both lists until a real pointer enters.
	await shot.settle(1800);
	shot.capture("blink-or-glide-scripted");
	// A real pointer over the demo takes both lists off the script.
	await shot.hover("pvf-fluid-2");
	shot.capture("blink-or-glide-fluid");
	await shot.hover("pvf-plain-2");
	shot.capture("blink-or-glide-plain");
	await shot.click("plain-vs-fluid-playback");
	await shot.moveTo(1100, 400);
	shot.capture("blink-or-glide-paused");
	await shot.click("plain-vs-fluid-preview-code-tab");
	shot.capture("blink-or-glide-code");
	await shot.click("plain-vs-fluid-preview-preview-tab");
	await scrollTo("math-row-1");
	await shot.hover("math-row-1");
	shot.capture("show-the-math");
	await shot.click("math-switch");
	await shot.hover("math-row-3");
	shot.capture("show-the-math-off");
	await scrollTo("axes-tab-Settings");
	await shot.hover("axes-tab-Settings");
	shot.capture("axes-x");
	await scrollTo("axes-list-3");
	await shot.hover("axes-list-3");
	shot.capture("axes-y");
	await scrollTo("axes-grid-3");
	await shot.hover("axes-grid-3");
	shot.capture("axes-xy");
	await scrollTo("lists-Yesterday");
	await shot.hover("lists-Yesterday");
	shot.capture("lists-children");
	await shot.hover("lists-Knowledge");
	shot.capture("lists-disabled");
	await shot.hover("lists-Log out");
	shot.capture("lists-second");
	await shot.click("lists-Chat");
	await shot.settle(800);
	shot.capture("lists-collapsed");
	await scrollTo("cost-row-first");
	await shot.hover("cost-row-first");
	await shot.hover("cost-row-first");
	shot.capture("cost-first-row");
	await shot.scroll(600, 200, 0, 200);
	shot.capture("cost-scrolled");
	await shot.scroll(600, 600, 0, 2000);
	shot.capture("use-when");
}

function UseList(props: { title: string; items: readonly string[] }) {
	return (
		<div
			style={{
				flexGrow: 1,
				flexBasis: 0,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 8,
			}}
		>
			<SectionTitle>{props.title}</SectionTitle>
			<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
				<For each={props.items}>
					{(item) => (
						<div style={{ display: "flex", flexDirection: "row" }}>
							<div
								style={{
									width: 24,
									flexShrink: 0,
									paddingLeft: 7,
									paddingTop: 8,
								}}
							>
								<div
									style={{
										width: 5,
										height: 5,
										borderRadius: 3,
										backgroundColor: color.mutedForeground,
									}}
								/>
							</div>
							<div style={{ flexGrow: 1, minWidth: 0 }}>
								<Prose>{item}</Prose>
							</div>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={<Prose>{DESCRIPTION}</Prose>}
			installNote="The useFluidHover hook and its highlight, already in every list and menu."
			installPrompt={FLUID_HOVER_INSTALL_PROMPT}
		>
			<DocSection title="Blink or glide">
				<Prose>
					Watch both cursors. The left blinks off and on 9 times per pass, and
					each blink pulls your eye back to the list. The right glides once, and
					your eye stays on the task.
				</Prose>
				<PlainVsFluidDemo />
			</DocSection>

			<DocSection title="Show the math">
				<Prose>
					1 rule, no dead zones: the nearest dot wins. Flip the switch and that
					is the whole algorithm.
				</Prose>
				<ShowTheMathDemo />
			</DocSection>

			<DocSection title="3 axes">
				<Prose>
					Menus, tabs, and card grids all feel the same under the cursor. Pass{" "}
					<Code>y</Code>, <Code>x</Code>, or <Code>xy</Code> and the highlight
					follows you down the list, across the strip, or to the closest card.
				</Prose>
				<AxesDemo />
			</DocSection>

			<DocSection title="When to split a list">
				<Prose>
					Split at the divider. Rows that are alternatives to each other share 1
					list, children included, and the highlight never crosses into the next
					one.
				</Prose>
				<ListsDemo />
			</DocSection>

			<DocSection title="What it costs">
				<Prose>
					1 element, 1 transform, 1 loop per move. 200 rows below: hover and
					watch the meter.
				</Prose>
				<CostDemo />
			</DocSection>

			{/* Two columns, no section title: the column headings carry it. Same rhythm as a DocSection. */}
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					gap: 24,
					paddingTop: 24,
				}}
			>
				<UseList
					title="Use when"
					items={[
						"Everything in the list can be clicked: a menu, a list, tabs, a grid of links.",
						"The items sit close together.",
						"The items stay where they are while you look at them.",
					]}
				/>
				<UseList
					title="Skip when"
					items={[
						"A wrong click would hurt.",
						"Only some of the cards can be clicked.",
						"There is a lot of empty space around the items.",
						"Rows change place as you scroll.",
					]}
				/>
			</div>

			<DocSection title="Reduced motion">
				<Prose>
					The highlight respects the OS setting on its own. Turn on reduced
					motion and the travel drops out: the highlight still fades in on the
					nearest row, it just stops sliding between rows. No{" "}
					<Code>{"<MotionConfig>"}</Code> needed, so a copied component behaves
					the same in your app.
				</Prose>
			</DocSection>
		</DocPage>
	);
}
