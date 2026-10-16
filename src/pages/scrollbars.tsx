import type { JSX } from "solid-js";
import type { ShotContext } from "#/lib/demo";
import { Code, DocPage, DocSection, Prose, SubHeading } from "#/lib/doc-page";
import {
	FadeDemo,
	HorizontalDemo,
	ProblemDemo,
	TableDemo,
} from "#/pages/scrollbars/demos";
import { SCROLLBARS_INSTALL_PROMPT } from "#/pages/scrollbars/install-prompt";

export const title = "Scrollbars";
export const group = "System";
export const order = 3;
export const layout = "docs";
export const listed = "sidebar";

/** `systemList`'s description of the page, which the source's site menu splits into keywords. */
const LIST_DESCRIPTION =
	"A scrollbar that stays out of the way but never disappears, over shadcn's scroll-fade baseline — restyled to the shape system, native scroll on touch.";
export const menuKeywords = ["scrollbars", ...LIST_DESCRIPTION.split(/\W+/)];

/** An `<a>` in the source. An inline box takes no click in gpuix, so the link is underlined text that goes nowhere. */
function Link(props: { children: string }) {
	return <span style={{ textDecoration: "underline" }}>{props.children}</span>;
}

export async function scenarios(shot: ShotContext) {
	shot.capture("top");
	const plain = shot.centerOf("scrollbars-plain");
	await shot.moveTo(plain.x, plain.y);
	await shot.scroll(plain.x, plain.y, 0, 120);
	shot.capture("problem-plain-scrolled");
	const area = shot.centerOf("scrollbars-area");
	await shot.moveTo(area.x - 60, area.y);
	shot.capture("problem-area-hover");
	await shot.scroll(area.x, area.y, 0, 120);
	shot.capture("problem-area-scrolled");
	await shot.click("scrollbars-problem-code-tab");
	shot.capture("problem-code");
	await shot.click("scrollbars-problem-preview-tab");

	await shot.scroll(600, 400, 0, 700);
	shot.capture("fade");
	const fade = shot.centerOf("scrollbars-fade-area");
	await shot.moveTo(fade.x, fade.y);
	await shot.scroll(fade.x, fade.y, 0, 120);
	shot.capture("fade-scrolled");

	await shot.scroll(600, 400, 0, 700);
	shot.capture("horizontal");
	const strip = shot.centerOf("scrollbars-horizontal-area");
	await shot.moveTo(strip.x, strip.y);
	await shot.scroll(strip.x, strip.y, 200, 0);
	shot.capture("horizontal-scrolled");

	await shot.scroll(600, 400, 0, 900);
	shot.capture("table");
	const table = shot.centerOf("scrollbars-table-area");
	await shot.moveTo(table.x, table.y);
	await shot.scroll(table.x, table.y, 240, 90);
	shot.capture("table-scrolled");
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={
				<Prose>
					A scrollbar that stays out of the way but never disappears.
				</Prose>
			}
			installNote="Installs the ScrollArea component with the shape-system scrollbar and the scroll-fade edge treatment."
			installPrompt={SCROLLBARS_INSTALL_PROMPT}
		>
			<DocSection title="The problem">
				<Prose>
					macOS hides the scrollbar until you start scrolling, so a clipped list
					gives no sign it has more below. And the moment it does appear, it's
					the grey OS default sitting on top of your design. You either get no
					affordance or the wrong one.
				</Prose>
				<ProblemDemo />
			</DocSection>

			<DocSection title="The scrollbar">
				<Prose>
					The thumb rests narrow and low-contrast, then widens and darkens on
					hover so it stays quiet until you reach for it. Press <Code>R</Code>{" "}
					to see the radius follow the shape system. On touch-primary devices
					the whole thing steps aside for native overflow scrolling, where
					platform physics beat any custom scrollbar.
				</Prose>
				<Prose>
					Ships in Radix and Base UI flavors with the same API — switch with the
					Primitive toggle. Scrollbar machinery adapted from <Link>Lina</Link>.
				</Prose>
			</DocSection>

			<DocSection title="The fade">
				<Prose>
					The baseline edge treatment is shadcn's <Link>scroll-fade</Link>,
					vendored as a CSS utility in <Code>globals.css</Code>. A mask
					dissolves the content toward the edges that have more to scroll, and a
					scroll-driven animation keeps the true start and end crisp. Drop{" "}
					<Code>scroll-fade</Code> (or <Code>scroll-fade-x</Code>) on the
					viewport and it rides under the scrollbar — no JavaScript.
				</Prose>
				<FadeDemo />
			</DocSection>

			<DocSection title="Examples">
				<SubHeading>Horizontal</SubHeading>
				<Prose>A row wider than its container, faded with the x variant.</Prose>
				<HorizontalDemo />

				<SubHeading>Double overflow</SubHeading>
				<Prose>
					A table taller and wider than its box.{" "}
					<Code>{'orientation="both"'}</Code> adds both scrollbars and the
					corner.
				</Prose>
				<TableDemo />
			</DocSection>
		</DocPage>
	);
}
