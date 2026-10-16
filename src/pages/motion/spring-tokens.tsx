import { buttonProps, motion, useGpuixRequired } from "@gpuix/solid";
import { createSignal, For } from "solid-js";
import { ComponentPreview, MONO } from "#/lib/doc-page";
import {
	color,
	focusRing,
	type as scale,
	siteType,
	motion as tween,
	weight,
} from "#/lib/theme";

export const SPRING_TOKENS_CODE = `import { motion } from "motion/react";
import { spring } from "@/lib/springs";

// fast     — 0.08s, bounce 0.    Hover, fades, tooltips, focus rings.
// moderate — 0.16s, bounce 0.    Critically damped: dropdowns, tabs, short
//                                travel, and panels that must land exactly
//                                (drawers, merged selection).
// slow     — 0.24s, bounce 0.12. Dialogs, drawers, large surfaces.

// spring.<tier> is the enter; spring.<tier>.exit is the matching exit tween.
<motion.div
  transition={spring.fast}                       // enter
  exit={{ opacity: 0, transition: spring.fast.exit }}  // leave
/>`;

const SPRING_TIERS = [
	{
		key: "fast",
		token: tween.fast,
		meta: "0.08s · bounce 0",
		usage: "hover, fades",
	},
	{
		key: "moderate",
		token: tween.moderate,
		meta: "0.16s · bounce 0",
		usage: "dropdowns, tabs",
	},
	{
		key: "slow",
		token: tween.slow,
		meta: "0.24s · bounce 0.12",
		usage: "dialogs, drawers",
	},
] as const;

/** `h-10 w-full` track holding an `h-8 w-8` ball: `px-1` either side of it. */
const TRACK = 40;
const BALL = 32;

export function SpringTokensDemo() {
	const renderer = useGpuixRequired();
	const [atEnd, setAtEnd] = createSignal(false);
	const toggle = () => setAtEnd(!atEnd());

	return (
		<ComponentPreview
			testId="spring-tokens"
			code={SPRING_TOKENS_CODE}
			onReplay={toggle}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 20,
					width: "100%",
					maxWidth: 448,
				}}
			>
				<For each={SPRING_TIERS}>
					{(tier) => (
						<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
							<div
								style={{
									display: "flex",
									flexDirection: "row",
									// gpuix's baseline alignment sits a <text> box on its bottom edge, so
									// the three runs are centered instead: within a pixel of a shared baseline.
									alignItems: "center",
									gap: 8,
								}}
							>
								<text
									style={{
										...siteType.body,
										fontWeight: weight.semibold,
										color: color.foreground,
									}}
								>
									{tier.key}
								</text>
								<text
									style={{
										fontFamily: MONO,
										...scale.micro,
										color: color.mutedForeground,
									}}
								>
									{tier.meta}
								</text>
								<div style={{ marginLeft: "auto" }}>
									<text
										style={{
											...siteType.caption,
											color: color.mutedForeground,
										}}
									>
										{tier.usage}
									</text>
								</div>
							</div>
							<div
								{...buttonProps({ onClick: toggle }, renderer)}
								testId={`spring-token-${tier.key}`}
								aria-label={`Run the ${tier.key} spring`}
								style={{
									display: "flex",
									flexDirection: "row",
									alignItems: "center",
									justifyContent: atEnd() ? "flex-end" : "flex-start",
									width: "100%",
									height: TRACK,
									paddingLeft: 4,
									paddingRight: 4,
									borderRadius: TRACK / 2,
									backgroundColor: color.muted,
									cursor: "pointer",
									keyboardFocusDim: false,
									focusVisible: focusRing(0),
								}}
							>
								<motion.div
									layout
									transition={tier.token}
									style={{
										width: BALL,
										height: BALL,
										flexShrink: 0,
										borderRadius: BALL / 2,
										backgroundColor: color.foreground,
									}}
								/>
							</div>
						</div>
					)}
				</For>
				<div style={{ alignSelf: "center" }}>
					<text style={{ ...siteType.caption, color: color.mutedForeground }}>
						Click a track (or replay) to fire all three springs.
					</text>
				</div>
			</div>
		</ComponentPreview>
	);
}
