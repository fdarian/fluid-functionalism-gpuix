import { ThinkingIndicator } from "#/components/thinking-indicator";
import type { DemoModule } from "#/lib/demo";
import { DemoCard, DemoRow } from "#/lib/demo-kit";

export const title = "ThinkingIndicator";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	return (
		<DemoCard title="Thinking Indicator">
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<DemoRow label="Basic">
					<ThinkingIndicator />
				</DemoRow>
				<DemoRow label="Text only">
					<ThinkingIndicator showIcon={false} />
				</DemoRow>
			</div>
		</DemoCard>
	);
}

/**
 * The glyph and the shimmer are driven by wall-clock time, so each capture lands on a different phase of both
 * loops. The waits are not multiples of the 1.5s shimmer period, so the band is caught at different spots.
 */
export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.settle(700);
	shot.capture("t1");
	await shot.settle(1130);
	shot.capture("t2");
	await shot.settle(1290);
	shot.capture("t3");
	// The word swaps at 4s: this lands mid-roll.
	await shot.settle(800);
	shot.capture("word-roll");
	await shot.settle(900);
	shot.capture("word-settled");
};
