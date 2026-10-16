import { createSignal, For, onCleanup } from "solid-js";
import {
	Button,
	type ButtonSize,
	type ButtonVariant,
} from "../components/button";
import type { DemoModule, ShotContext } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";
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
import { color, type as scale, weight } from "../lib/theme";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "tertiary", "ghost"];

function VariantRow(props: {
	label: string;
	size: ButtonSize;
	extra?: Partial<Parameters<typeof Button>[0]>;
}) {
	return (
		<DemoRow label={props.label}>
			<For each={VARIANTS}>
				{(variant: ButtonVariant) => (
					<Button
						testId={`${props.label}-${variant}`}
						id={`${props.label}-${variant}`}
						variant={variant}
						size={props.size}
						{...props.extra}
					>
						{variant[0].toUpperCase() + variant.slice(1)}
					</Button>
				)}
			</For>
		</DemoRow>
	);
}

export const title = "Button";
export const group = "Components";

const PLAY_VARIANTS = [
	{ value: "primary", label: "Primary" },
	{ value: "secondary", label: "Secondary" },
	{ value: "tertiary", label: "Tertiary" },
	{ value: "ghost", label: "Ghost" },
] as const;

type PlaySize = "compact" | "default";

const PLAY_SIZES = [
	{ value: "compact", label: "Compact" },
	{ value: "default", label: "Default" },
] as const;

/** "Icon only" swaps the text sizes for their square counterparts. */
const ICON_ONLY_SIZE = {
	compact: "icon-compact",
	default: "icon",
} as const;

const LABELS = [
	"Get started",
	"Learn more",
	"Deploy",
	"Continue",
	"Ship it",
] as const;

/** A borderless text field in the select rows' style: 28 tall, 124 wide, right-aligned, tinted on hover and focus. */
function PlayText(props: {
	value: string;
	onChange: (value: string) => void;
	testId: string;
}) {
	const [focused, setFocused] = createSignal(false);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				width: 124,
				height: 28,
				paddingLeft: 8,
				paddingRight: 8,
				borderRadius: 6,
				backgroundColor: focused() ? color.hover : color.transparent,
				hover: { backgroundColor: color.hover },
				cursor: "text",
			}}
		>
			<input
				testId={props.testId}
				aria-label="Button label"
				value={props.value}
				theme={{
					text: color.foreground,
					textMuted: color.mutedForeground,
					textFaint: color.mutedForeground,
					textDim: color.mutedForeground,
					caret: color.foreground,
				}}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onChange={(event) => {
					if (event.value === undefined) {
						throw new Error("PlayText change without a value");
					}
					props.onChange(event.value);
				}}
				style={{
					flexGrow: 1,
					minWidth: 0,
					height: 24,
					fontSize: scale.body.fontSize,
					fontWeight: weight.normal,
					textAlign: "right",
					color: color.foreground,
					backgroundColor: color.transparent,
					keyboardFocusDim: false,
				}}
			/>
		</div>
	);
}

function Playground() {
	const [variant, setVariant] = createSignal<ButtonVariant>("primary");
	const [size, setSize] = createSignal<PlaySize>("default");
	const [iconOnly, setIconOnly] = createSignal(false);
	const [leading, setLeading] = createSignal(false);
	const [trailing, setTrailing] = createSignal(false);
	const [label, setLabel] = createSignal<string>(LABELS[0]);
	const [loading, setLoading] = createSignal(false);
	const [disabled, setDisabled] = createSignal(false);

	// An emptied field would collapse the button, and the icon-only one has no other accessible name.
	const labelText = () => (label().trim() === "" ? LABELS[0] : label());

	const shuffle = () => {
		setVariant(pick(["primary", "secondary", "tertiary", "ghost"] as const));
		setSize(pick(["compact", "default"] as const));
		setIconOnly(Math.random() > 0.85);
		setLeading(Math.random() > 0.5);
		setTrailing(Math.random() > 0.75);
		setLabel(pick(LABELS));
		setLoading(Math.random() > 0.85);
		setDisabled(Math.random() > 0.9);
	};

	return (
		<PlaygroundLayout
			minHeight={280}
			preview={
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexGrow: 1,
						alignItems: "center",
					}}
				>
					<Button
						testId="play-button"
						variant={variant()}
						size={iconOnly() ? ICON_ONLY_SIZE[size()] : size()}
						icon={iconOnly() ? "plus" : undefined}
						leadingIcon={!iconOnly() && leading() ? "plus" : undefined}
						trailingIcon={!iconOnly() && trailing() ? "arrow-right" : undefined}
						loading={loading()}
						disabled={disabled()}
						aria-label={iconOnly() ? labelText() : undefined}
					>
						{iconOnly() ? undefined : labelText()}
					</Button>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Button" />
					<PlayField label="Variant">
						<PlaySelect
							testId="play-variant"
							value={variant()}
							onChange={setVariant}
							options={PLAY_VARIANTS}
						/>
					</PlayField>
					<PlayField label="Size">
						<PlaySelect
							testId="play-size"
							value={size()}
							onChange={setSize}
							options={PLAY_SIZES}
						/>
					</PlayField>
					<PlayField label="Label" disabled={iconOnly()}>
						<PlayText testId="play-label" value={label()} onChange={setLabel} />
					</PlayField>
					<PlaySwitch
						testId="play-icon-only"
						label="Icon only"
						checked={iconOnly()}
						onToggle={() => setIconOnly(!iconOnly())}
					/>
					<PlaySwitch
						testId="play-leading"
						label="Leading icon"
						checked={leading()}
						onToggle={() => setLeading(!leading())}
						disabled={iconOnly()}
					/>
					<PlaySwitch
						testId="play-trailing"
						label="Trailing icon"
						checked={trailing()}
						onToggle={() => setTrailing(!trailing())}
						disabled={iconOnly()}
					/>
					<PlayDivider />
					<PlaySection label="State" />
					<PlaySwitch
						testId="play-loading"
						label="Loading"
						checked={loading()}
						onToggle={() => setLoading(!loading())}
					/>
					<PlaySwitch
						testId="play-disabled"
						label="Disabled"
						checked={disabled()}
						onToggle={() => setDisabled(!disabled())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

/** Loads for two seconds after each click, as the source's "Click me" does. */
function ClickToLoad() {
	const [loading, setLoading] = createSignal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(timer));
	return (
		<Button
			testId="click-to-load"
			id="click-to-load"
			loading={loading()}
			onClick={() => {
				setLoading(true);
				timer = setTimeout(() => setLoading(false), 2000);
			}}
		>
			{loading() ? "Loading" : "Click me"}
		</Button>
	);
}

export function Demo() {
	return (
		<>
			<Playground />
			<DemoCard title="Button">
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<VariantRow label="Default" size="default" />
					<VariantRow label="Compact" size="compact" />
					<VariantRow
						label="Leading icon"
						size="default"
						extra={{ leadingIcon: "plus" }}
					/>
					<DemoRow label="Trailing icon">
						<Button
							testId="trailing-secondary"
							variant="secondary"
							trailingIcon="arrow-right"
						>
							Next
						</Button>
						<Button
							testId="both-tertiary"
							variant="tertiary"
							leadingIcon="search"
							trailingIcon="arrow-right"
						>
							Search
						</Button>
					</DemoRow>
					<DemoRow label="Icon only">
						<For each={VARIANTS}>
							{(variant: ButtonVariant) => (
								<Button variant={variant} size="icon" icon="settings" />
							)}
						</For>
						<For each={VARIANTS}>
							{(variant: ButtonVariant) => (
								<Button variant={variant} size="icon-compact" icon="plus" />
							)}
						</For>
					</DemoRow>
					<VariantRow
						label="Disabled"
						size="default"
						extra={{ disabled: true }}
					/>
					<VariantRow
						label="Loading"
						size="default"
						extra={{ loading: true }}
					/>
					<DemoRow label="Click to load">
						<ClickToLoad />
						<Button
							testId="saving-secondary"
							variant="secondary"
							loading
							leadingIcon="loader"
						>
							Saving
						</Button>
					</DemoRow>
				</div>
			</DemoCard>
		</>
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
	shot.capture("playground");
	await shot.click("play-leading-track");
	await shot.click("play-trailing-track");
	shot.capture("playground-both-icons");
	await shot.click("play-icon-only-track");
	shot.capture("playground-icon-only");
	await shot.click("play-icon-only-track");
	await shot.click("play-loading-track");
	shot.capture("playground-loading");
	await shot.click("playground-shuffle");
	shot.capture("playground-shuffled");

	await shot.hover("Default-primary");
	shot.capture("hover");
	await shot.down("Default-primary");
	shot.capture("pressed");
	await shot.up("Default-primary");
	// A loading button is disabled: dimmed, and the pointer does nothing to it.
	await shot.hover("Loading-secondary");
	shot.capture("loading-hover");
	// A loading button is disabled for assistive technology too.
	shot.expectAria("Disabled-primary", { role: "Button", disabled: true });
	shot.expectAria("Loading-secondary", { disabled: true });
	shot.expectAria("Default-primary", { disabled: undefined });

	await reveal(shot, "click-to-load");
	shot.expectAria("click-to-load", { disabled: undefined });
	await shot.click("click-to-load");
	shot.expectAria("click-to-load", { disabled: true });
	shot.capture("click-to-load-loading");
	await shot.settle(2200);
	shot.expectAria("click-to-load", { disabled: undefined });
};
