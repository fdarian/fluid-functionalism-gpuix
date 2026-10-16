import { type HostElement, ResizeObserver } from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	For,
	on,
	onCleanup,
	Show,
} from "solid-js";
import {
	Banner,
	BannerAction,
	BannerActions,
	type BannerContrast,
	BannerDescription,
	type BannerStatus,
	BannerTitle,
	type BannerVariant,
} from "../components/banner";
import { Button } from "../components/button";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from "../lib/playground";
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
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				flexGrow: 1,
				flexBasis: 0,
			}}
		>
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

const ROW_WIDTHS = [
	92, 84, 88, 60, 95, 78, 86, 70, 50, 90, 82, 94, 66, 88, 74, 58,
];

function Pill(props: { width: number | string; height: number; fill: string }) {
	return (
		<div
			style={{
				width: props.width,
				height: props.height,
				flexShrink: 0,
				borderRadius: 999,
				backgroundColor: props.fill,
			}}
		/>
	);
}

/** Skeleton bars standing in for the page around a banner; `hover`, not `muted`, because the playground card is `surface2`, which `muted` equals in dark. */
function SkeletonLines(props: { widths: number[] }) {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<For each={props.widths}>
				{(width) => <Pill width={`${width}%`} height={16} fill={color.hover} />}
			</For>
		</div>
	);
}

/** The page the fixed bar sits above: a header, the banner (children) right under it, and content that scrolls on its own below both. */
function MockPage(props: { height: number; children: unknown }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: props.height,
				overflow: "hidden",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.borderFaint,
				backgroundColor: color.background,
			}}
		>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 16,
					height: 44,
					flexShrink: 0,
					paddingLeft: 16,
					paddingRight: 16,
					borderBottomWidth: 1,
					borderColor: color.borderFaint,
				}}
			>
				<div
					style={{
						width: 20,
						height: 20,
						borderRadius: 6,
						backgroundColor: color.muted,
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 12,
					}}
				>
					<Pill width={40} height={10} fill={color.muted} />
					<Pill width={48} height={10} fill={color.muted} />
					<Pill width={36} height={10} fill={color.muted} />
				</div>
				<div style={{ flexGrow: 1 }} />
				<div
					style={{
						width: 24,
						height: 24,
						borderRadius: 12,
						backgroundColor: color.muted,
					}}
				/>
			</div>
			{props.children as never}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 12,
					padding: 20,
					flexGrow: 1,
					flexBasis: 0,
					minHeight: 0,
					overflowY: "scroll",
				}}
			>
				<Pill width="33%" height={12} fill={color.muted} />
				<For each={ROW_WIDTHS}>
					{(width) => (
						<Pill width={`${width}%`} height={10} fill={color.muted} />
					)}
				</For>
			</div>
		</div>
	);
}

export const title = "Banner";
export const group = "Components";
export const listed = "sidebar";

const COPY: Record<
	BannerStatus,
	{
		title: string;
		description: string;
		primary: string;
		secondary: string;
		ghost: string;
	}
> = {
	default: {
		title: "Banner is new in Fluid Functionalism",
		description:
			"5 statuses, 2 contrasts and a dismiss that collapses its height.",
		primary: "Read the docs",
		secondary: "Changelog",
		ghost: "Not now",
	},
	info: {
		title: "The registry has new components",
		description: "Run the install command again to pull the latest versions.",
		primary: "Copy command",
		secondary: "What's new",
		ghost: "Later",
	},
	success: {
		title: "Fluid Functionalism is installed",
		description: "Button, Card and Dialog were added to components/ui.",
		primary: "Open the docs",
		secondary: "Add more",
		ghost: "Share",
	},
	warning: {
		title: "Inter is missing its opsz axis",
		description:
			'Labels shift when their weight changes. Add axes: ["opsz"] to your next/font call.',
		primary: "Show the fix",
		secondary: "Read the guide",
		ghost: "Ignore",
	},
	error: {
		title: "Couldn't reach the registry",
		description:
			"shadcn couldn't fetch button.json from fluidfunctionalism.com.",
		primary: "Retry",
		secondary: "Status page",
		ghost: "Report issue",
	},
};

const VARIANT_OPTIONS = [
	{ value: "inline", label: "Inline" },
	{ value: "fixed", label: "Fixed" },
] as const;

const STATUS_OPTIONS = [
	{ value: "default", label: "Default" },
	{ value: "info", label: "Info" },
	{ value: "success", label: "Success" },
	{ value: "warning", label: "Warning" },
	{ value: "error", label: "Error" },
] as const;

const CONTRAST_OPTIONS = [
	{ value: "low", label: "Low" },
	{ value: "high", label: "High" },
] as const;

function Playground() {
	const [variant, setVariant] = createSignal<BannerVariant>("inline");
	const [status, setStatus] = createSignal<BannerStatus>("success");
	const [contrast, setContrast] = createSignal<BannerContrast>("low");
	const [description, setDescription] = createSignal(true);
	const [primary, setPrimary] = createSignal(true);
	const [secondary, setSecondary] = createSignal(true);
	const [ghost, setGhost] = createSignal(false);
	const [dismissible, setDismissible] = createSignal(true);
	const [open, setOpen] = createSignal(true);
	const [heldHeight, setHeldHeight] = createSignal(0);
	const [page, setPage] = createSignal<HostElement>();

	const copy = () => COPY[status()];

	// A dismissed inline banner collapses the page; holding the tallest height it had while open stops the preview re-centring, and keeps a tall banner (wrapped actions) from being cut. A width change, or the first resize after a control changes, measures afresh.
	let openHeight = 0;
	let remeasure = false;
	createEffect(() => {
		const element = page();
		if (element === undefined) return;
		let width = 0;
		const observer = new ResizeObserver((entries) => {
			if (!open()) return;
			const size = entries[entries.length - 1].borderBoxSize[0];
			openHeight = size.blockSize;
			if (size.inlineSize !== width || remeasure) {
				width = size.inlineSize;
				remeasure = false;
				setHeldHeight(size.blockSize);
			} else {
				setHeldHeight(Math.max(heldHeight(), size.blockSize));
			}
		});
		observer.observe(element, { box: "border-box" });
		onCleanup(() => observer.disconnect());
	});
	createEffect(
		on(
			[
				variant,
				status,
				contrast,
				description,
				primary,
				secondary,
				ghost,
				dismissible,
			],
			() => {
				remeasure = true;
				setHeldHeight(openHeight);
			},
			{ defer: true },
		),
	);

	const shuffle = () => {
		setVariant(Math.random() > 0.75 ? "fixed" : "inline");
		setStatus(
			pick(["default", "info", "success", "warning", "error"] as const),
		);
		setContrast(pick(["low", "high"] as const));
		setDescription(Math.random() > 0.4);
		setPrimary(Math.random() > 0.3);
		setSecondary(Math.random() > 0.5);
		setGhost(Math.random() > 0.6);
		setDismissible(Math.random() > 0.3);
		setOpen(true);
	};

	const banner = () => (
		<Banner
			testId="play-banner"
			variant={variant()}
			status={status()}
			contrast={contrast()}
			dismissible={dismissible()}
			open={open()}
			onDismiss={() => setOpen(false)}
		>
			<BannerTitle>{copy().title}</BannerTitle>
			<Show when={description()}>
				<BannerDescription>{copy().description}</BannerDescription>
			</Show>
			<Show when={primary() || secondary() || ghost()}>
				<BannerActions>
					<Show when={primary()}>
						<BannerAction variant="primary">{copy().primary}</BannerAction>
					</Show>
					<Show when={secondary()}>
						<BannerAction>{copy().secondary}</BannerAction>
					</Show>
					<Show when={ghost()}>
						<BannerAction variant="ghost">{copy().ghost}</BannerAction>
					</Show>
				</BannerActions>
			</Show>
		</Banner>
	);

	return (
		<PlaygroundLayout
			overlay={
				<Show when={!open()}>
					<Button
						testId="play-show"
						variant="ghost"
						size="compact"
						onClick={() => setOpen(true)}
					>
						Show banner
					</Button>
				</Show>
			}
			preview={
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						flexGrow: 1,
						width: "100%",
						maxWidth: 560,
					}}
				>
					<Show
						when={variant() === "fixed"}
						fallback={
							<div style={{ minHeight: heldHeight() }}>
								<div
									ref={setPage}
									style={{ display: "flex", flexDirection: "column", gap: 12 }}
								>
									<SkeletonLines widths={[45]} />
									{banner()}
									<SkeletonLines widths={[85, 60]} />
								</div>
							</div>
						}
					>
						<MockPage height={280}>{banner()}</MockPage>
					</Show>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Banner" />
					<div>
						<PlayField label="Variant">
							<PlaySelect
								testId="play-variant"
								value={variant()}
								onChange={setVariant}
								options={VARIANT_OPTIONS}
							/>
						</PlayField>
						<PlayField label="Status">
							<PlaySelect
								testId="play-status"
								value={status()}
								onChange={setStatus}
								options={STATUS_OPTIONS}
							/>
						</PlayField>
						<PlayField label="Contrast">
							<PlaySelect
								testId="play-contrast"
								value={contrast()}
								onChange={setContrast}
								options={CONTRAST_OPTIONS}
							/>
						</PlayField>
					</div>
					<PlayDivider />
					<PlaySection label="Content" />
					<div>
						<PlaySwitch
							testId="play-description"
							label="Description"
							checked={description()}
							onToggle={() => setDescription(!description())}
						/>
						<PlaySwitch
							testId="play-primary"
							label="Primary action"
							checked={primary()}
							onToggle={() => setPrimary(!primary())}
						/>
						<PlaySwitch
							testId="play-secondary"
							label="Secondary action"
							checked={secondary()}
							onToggle={() => setSecondary(!secondary())}
						/>
						<PlaySwitch
							testId="play-ghost"
							label="Ghost action"
							checked={ghost()}
							onToggle={() => setGhost(!ghost())}
						/>
						<PlaySwitch
							testId="play-dismissible"
							label="Dismissible"
							checked={dismissible()}
							onToggle={() => {
								setDismissible(!dismissible());
								setOpen(true);
							}}
						/>
					</div>
				</PlaygroundPanel>
			}
		/>
	);
}

export function Demo() {
	const [fixedOpen, setFixedOpen] = createSignal(true);
	const [inlineOpen, setInlineOpen] = createSignal(true);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<Playground />
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
					<div style={{ maxWidth: 560 }}>
						<MockPage height={300}>
							<Banner
								testId="fixed-banner"
								variant="fixed"
								status="warning"
								dismissible
								open={fixedOpen()}
								onDismiss={() => setFixedOpen(false)}
							>
								<BannerTitle>
									Registry maintenance tonight at 22:00 UTC
								</BannerTitle>
								<BannerActions>
									<BannerAction>Details</BannerAction>
								</BannerActions>
							</Banner>
						</MockPage>
					</div>
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
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						gap: 12,
						maxWidth: 560,
					}}
				>
					<Statuses contrast="low" />
					<Statuses contrast="high" />
				</div>
			</DemoCard>
			<DemoCard title="Actions">
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						maxWidth: 520,
					}}
				>
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
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 12,
						maxWidth: 520,
					}}
				>
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

/** The page is taller than the window: scroll an element to the upper part of it. */
async function reveal(shot: ShotContext, testId: string) {
	let previous = Number.NaN;
	for (let attempt = 0; attempt < 8; attempt++) {
		const y = shot.centerOf(testId).y;
		if ((y > 120 && y < 320) || y === previous) return;
		previous = y;
		await shot.scroll(700, 400, 0, y - 200);
	}
	throw new Error(`could not scroll ${testId} into view`);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	// The playground's controls sit in the right column.
	shot.capture("playground");
	await shot.click("play-banner-dismiss");
	await shot.settle(500);
	shot.expectText(COPY.success.title, false);
	shot.capture("playground-dismissed");
	await shot.click("play-show");
	shot.expectText(COPY.success.title, true);
	await shot.click("play-ghost-track");
	await shot.click("play-description-track");
	shot.capture("playground-ghost-no-description");
	await shot.focus("play-status-trigger");
	await shot.press("ArrowDown ArrowDown Enter");
	await shot.settle(300);
	shot.expectText(COPY.warning.title, true);
	shot.capture("playground-warning");
	await shot.focus("play-variant-trigger");
	await shot.press("ArrowDown ArrowDown Enter");
	await shot.settle(300);
	shot.capture("playground-fixed");
	await shot.click("play-banner-dismiss");
	await shot.settle(500);
	shot.expectText(COPY.warning.title, false);
	shot.capture("playground-fixed-dismissed");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	await reveal(shot, "inline-banner-dismiss");
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
	// The statuses and actions cards are below the fold.
	await shot.scroll(600, 400, 0, 620);
	shot.capture("scrolled-statuses");
	await shot.scroll(600, 400, 0, 620);
	shot.capture("scrolled-actions");
};
