import { createSignal, For } from "solid-js";
import {
	Banner,
	BannerAction,
	BannerActions,
	BannerDescription,
	type BannerStatus,
	BannerTitle,
} from "../components/banner";
import { Button } from "../components/button";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, type as scale } from "../lib/theme";

const STATUSES: { status: BannerStatus; label: string }[] = [
	{ status: "default", label: "Default" },
	{ status: "info", label: "Info" },
	{ status: "success", label: "Success" },
	{ status: "warning", label: "Warning" },
	{ status: "error", label: "Error" },
];

function Caption(props: { children: string }) {
	return (
		<div style={{ paddingLeft: 4, paddingBottom: 2 }}>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.children}
			</text>
		</div>
	);
}

function Statuses(props: { contrast: "low" | "high" }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8, flexGrow: 1, flexBasis: 0 }}>
			<Caption>
				{props.contrast === "low" ? "Low contrast" : "High contrast"}
			</Caption>
			<For each={STATUSES}>
				{(item) => (
					<Banner status={item.status} contrast={props.contrast}>
						<BannerTitle>{item.label}</BannerTitle>
					</Banner>
				)}
			</For>
		</div>
	);
}

/** The page the fixed bar sits above: the content scrolls under it, the bar stays. */
function MockPage(props: { children: unknown }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				height: 260,
				overflow: "hidden",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
			}}
		>
			{props.children as never}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 10,
					padding: 16,
					flexGrow: 1,
					overflowY: "scroll",
				}}
			>
				<For each={[0, 1, 2, 3, 4, 5, 6, 7]}>
					{(row) => (
						<div
							style={{
								height: 14,
								width: row % 3 === 0 ? "60%" : "90%",
								borderRadius: 4,
								backgroundColor: color.hover,
							}}
						/>
					)}
				</For>
			</div>
		</div>
	);
}

export const title = "Banner";
export const group = "Components";

export function Demo() {
	const [fixedOpen, setFixedOpen] = createSignal(true);
	const [inlineOpen, setInlineOpen] = createSignal(true);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Dismissible">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<div style={{ display: "flex", flexDirection: "column" }}>
						<Banner
							testId="inline-banner"
							status="success"
							contrast="high"
							dismissible
							open={inlineOpen()}
							onDismiss={() => setInlineOpen(false)}
						>
							<BannerTitle>Changes saved</BannerTitle>
						</Banner>
					</div>
					<div style={{ display: "flex", flexDirection: "row" }}>
						<Button
							testId="inline-replay"
							variant="secondary"
							size="compact"
							onClick={() => setInlineOpen(true)}
						>
							Replay
						</Button>
					</div>
				</div>
			</DemoCard>
			<DemoCard title="Fixed">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<MockPage>
						<Banner
							testId="fixed-banner"
							variant="fixed"
							status="warning"
							dismissible
							open={fixedOpen()}
							onDismiss={() => setFixedOpen(false)}
						>
							<BannerTitle>Registry maintenance tonight at 22:00 UTC</BannerTitle>
							<BannerActions>
								<BannerAction>Details</BannerAction>
							</BannerActions>
						</Banner>
					</MockPage>
					<div style={{ display: "flex", flexDirection: "row" }}>
						<Button
							testId="fixed-replay"
							variant="secondary"
							size="compact"
							onClick={() => setFixedOpen(true)}
						>
							Replay
						</Button>
					</div>
				</div>
			</DemoCard>
			<DemoCard title="Statuses">
				<div style={{ display: "flex", flexDirection: "row", gap: 12 }}>
					<Statuses contrast="low" />
					<Statuses contrast="high" />
				</div>
			</DemoCard>
			<DemoCard title="Actions">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Banner status="info">
						<BannerTitle>Enjoying Fluid Functionalism?</BannerTitle>
						<BannerActions>
							<BannerAction variant="primary">Star on GitHub</BannerAction>
							<BannerAction>Share</BannerAction>
							<BannerAction variant="ghost">Later</BannerAction>
						</BannerActions>
					</Banner>
					<Banner status="info">
						<BannerTitle>The registry has new components</BannerTitle>
						<BannerDescription>
							Run the install command again to pull the latest versions.
						</BannerDescription>
						<BannerActions>
							<BannerAction variant="primary">Copy command</BannerAction>
							<BannerAction>What's new</BannerAction>
							<BannerAction variant="ghost">Later</BannerAction>
						</BannerActions>
					</Banner>
				</div>
			</DemoCard>
			<DemoCard title="Custom icon and compact">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Banner icon="bell">
						<BannerTitle>3 new components since your last visit</BannerTitle>
					</Banner>
					<Banner status="error" size="compact" dismissible>
						<BannerTitle>Deploy failed</BannerTitle>
						<BannerDescription>
							The build exited with code 1. Check the logs and retry.
						</BannerDescription>
						<BannerActions>
							<BannerAction variant="primary">View logs</BannerAction>
							<BannerAction variant="ghost">Retry</BannerAction>
						</BannerActions>
					</Banner>
				</div>
			</DemoCard>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("inline-banner-dismiss");
	shot.capture("dismiss-hover");
	await shot.click("inline-banner-dismiss");
	shot.expectText("Changes saved", false);
	shot.capture("dismissed");
	await shot.click("inline-replay");
	shot.expectText("Changes saved", true);
	shot.capture("replayed");
	await shot.click("fixed-banner-dismiss");
	shot.expectText("Registry maintenance tonight at 22:00 UTC", false);
	shot.capture("fixed-dismissed");
	await shot.click("fixed-replay");
	shot.expectText("Registry maintenance tonight at 22:00 UTC", true);
	shot.capture("fixed-replayed");
};
