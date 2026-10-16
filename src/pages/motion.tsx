import type { JSX } from "solid-js";
import type { ShotContext } from "../lib/demo";
import { Code, DocPage, DocSection, Prose, SubHeading } from "../lib/doc-page";
import { MOTION_INSTALL_PROMPT } from "./motion/install-prompt";
import { ModalExitDemo } from "./motion/modal-exit";
import { SpringReferenceSection } from "./motion/spring-reference";
import { SpringTokensDemo } from "./motion/spring-tokens";

export const title = "Motion";
export const group = "System";
export const order = 2;
export const layout = "docs";
export const listed = "sidebar";

/** `systemList`'s description of the page, which the source's site menu splits into keywords. */
const LIST_DESCRIPTION =
	"Spring tokens, faster exits, fluid hover, and reflow-free weight animation — the motion rules shared by every component.";
export const menuKeywords = ["motion", ...LIST_DESCRIPTION.split(/\W+/)];

export async function scenarios(shot: ShotContext) {
	await shot.scroll(600, 400, 0, 420);
	shot.capture("tokens");
	await shot.click("spring-token-moderate");
	shot.capture("tokens-at-end");
	await shot.click("spring-tokens-replay");
	await shot.click("spring-tokens-code-tab");
	shot.capture("tokens-code");
	await shot.click("spring-tokens-preview-tab");

	await shot.scroll(600, 400, 0, 560);
	shot.capture("modal-exit");
	await shot.click("modal-same-toggle");
	await shot.click("modal-faster-toggle");
	shot.capture("modals-open");
	await shot.click("modal-same-toggle");
	await shot.click("modal-faster-toggle");
	shot.capture("modals-closed");

	await shot.scroll(600, 400, 0, 900);
	shot.capture("reference");
	await shot.hover("chip-dropdown");
	shot.capture("reference-chip-hover");
	await shot.click("reference-moderate");
	shot.capture("reference-played");
	await shot.scroll(600, 400, 0, 2000);
	shot.capture("reduced-motion");
}

export function Page(): JSX.Element {
	return (
		<DocPage
			description={
				<Prose>
					Three spring speeds, exits a little faster than entrances, and one fluid hover shared by every list. Pick a speed, wire it in — every component follows the same pattern.
				</Prose>
			}
			installNote="Installs the springs lib — the fast / moderate / slow spring presets every component animates with."
			installPrompt={MOTION_INSTALL_PROMPT}
		>
			<DocSection title="Three speeds">
				<Prose>
					All animations come from one of three springs in{" "}
					<Code>lib/springs</Code>. Hover states and small toggles use{" "}
					<Code>fast</Code>. Dropdowns and tabs use <Code>moderate</Code>.
					Dialogs and drawers use <Code>slow</Code>. No component invents its
					own timing, so things you've never thought about together will move at
					the same pace. <Code>moderate</Code> is critically damped — it lands
					exactly with no overshoot, so it also carries panels and sheets that
					must settle precisely (the mobile drawer, the merged selection
					backgrounds).
				</Prose>
				<SpringTokensDemo />
			</DocSection>

			<DocSection title="Slow in, faster out">
				<Prose>
					Both modals open on <Code>spring.slow</Code>. The only difference is
					the close: the left exits on the same <Code>spring.slow</Code>, the
					right on <Code>spring.slow.exit</Code> — one tier faster. Toggle the
					left one first. That slight drag on the way out is exactly what you're
					trying to avoid.
				</Prose>
				<ModalExitDemo />
			</DocSection>

			<DocSection title="All tokens">
				<Prose>
					Click a track to see it. The ball enters right on the spring, then
					returns left on the exit tween. Everything lives in{" "}
					<Code>lib/springs</Code> — duration values belong there, not scattered
					through component code.
				</Prose>
				<SpringReferenceSection />

				<SubHeading>Reduced motion</SubHeading>
				<Prose>
					All springs respect the OS setting. Wrap the app tree in{" "}
					<Code>{`<MotionConfig reducedMotion="user">`}</Code> and when the user
					turns on reduced motion, the position changes drop out and only the
					opacity fades remain.
				</Prose>
			</DocSection>
		</DocPage>
	);
}
