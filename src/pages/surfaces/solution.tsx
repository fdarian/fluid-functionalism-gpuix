import type { HostMouseMoveEvent } from '@gpuix/solid';
import { createSignal, For, type JSX, Show } from 'solid-js';
import { ScrollArea } from '#/components/scroll-area';
import { Slider, type SliderValue } from '#/components/slider';
import { ComponentPreview, MONO } from '#/lib/doc-page';
import {
	color,
	fade,
	radius,
	SchemeScope,
	type as scale,
	shadow,
	siteType,
	surface,
	weight,
} from '#/lib/theme';
import { Elevated, SurfaceProvider } from './elevated';
import { LOCK_ICON, type MenuOption, SurfaceMenu } from './role-menu';
import {
	ELEVATED_SOURCE,
	ELEVATION_STACK_CODE,
	SUBSTRATE_CODE,
	TOKENS_CSS,
} from './snippets';

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/** The dark ladder, for the labels of the demos that name raw colours. */
const SURFACE_HEX_DARK: Record<number, string> = {
	1: '#171717',
	2: '#1E1E1E',
	3: '#252525',
	4: '#2C2C2C',
	5: '#333333',
	6: '#3A3A3A',
	7: '#414141',
	8: '#484848',
};

/** `border-border/40` in dark: `border` is the foreground at 12%. */
const BORDER_40_DARK = 'rgba(245,245,245,0.048)';

function MicroText(props: {
	children: string;
	color: string;
	mono?: boolean;
	semibold?: boolean;
}) {
	return (
		<text
			style={{
				...scale.micro,
				fontFamily: props.mono === true ? MONO : undefined,
				fontWeight: props.semibold === true ? weight.semibold : undefined,
				color: props.color,
			}}
		>
			{props.children}
		</text>
	);
}

function SurfaceChip(props: { level: number }) {
	return (
		<div
			style={{
				flexShrink: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 8,
			}}
		>
			<div
				style={{
					width: 56,
					height: 56,
					borderRadius: radius.container,
					backgroundColor: surface(props.level),
					boxShadow: shadow(props.level),
				}}
			/>
			<MicroText mono color={color.mutedForeground}>
				{String(props.level)}
			</MicroText>
		</div>
	);
}

function LadderRow(props: { scheme: 'dark' | 'light' }) {
	return (
		<SchemeScope scheme={props.scheme}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				<MicroText semibold color={color.mutedForeground}>
					{props.scheme === 'dark' ? 'Dark' : 'Light'}
				</MicroText>
				<ScrollArea
					orientation="horizontal"
					fade
					height={110}
					style={{ borderRadius: 16, backgroundColor: color.background }}
				>
					<div
						style={{
							flexShrink: 0,
							display: 'flex',
							flexDirection: 'row',
							gap: 12,
							padding: 16,
						}}
					>
						<For each={LEVELS}>{(level) => <SurfaceChip level={level} />}</For>
					</div>
				</ScrollArea>
			</div>
		</SchemeScope>
	);
}

export function TokensDemo() {
	return (
		<ComponentPreview
			scheme="dark"
			testId="tokens"
			code={TOKENS_CSS}
			padding="compact"
		>
			<div
				style={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					gap: 16,
				}}
			>
				<LadderRow scheme="dark" />
				<LadderRow scheme="light" />
			</div>
		</ComponentPreview>
	);
}

const SUBSTRATE_ITEMS: readonly MenuOption[] = [
	{ icon: 'star', label: 'Favorites' },
	{ icon: 'clock', label: 'Recents' },
	{ icon: LOCK_ICON, label: 'Private' },
];

const SUBSTRATE_SCENARIOS = [
	{ substrate: 1, label: 'On the page' },
	{ substrate: 3, label: 'Inside a popover' },
	{ substrate: 5, label: 'Inside a dialog' },
] as const;

function SwatchRow(props: { label: string; hex: string }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
			}}
		>
			<div
				style={{
					width: 12,
					height: 12,
					flexShrink: 0,
					borderRadius: 2,
					borderWidth: 1,
					borderColor: BORDER_40_DARK,
					backgroundColor: props.hex,
				}}
			/>
			<MicroText mono color={color.mutedForeground}>
				{props.label}
			</MicroText>
			<div style={{ flexGrow: 1 }} />
			<MicroText mono color={color.foreground}>
				{props.hex}
			</MicroText>
		</div>
	);
}

function ValueRow(props: {
	label: string;
	value: string;
	paddingTop?: number;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				paddingTop: props.paddingTop,
			}}
		>
			<MicroText mono color={color.mutedForeground}>
				{props.label}
			</MicroText>
			<div style={{ flexGrow: 1 }} />
			<MicroText mono color={color.foreground}>
				{props.value}
			</MicroText>
		</div>
	);
}

export function SubstrateDemo() {
	return (
		<ComponentPreview
			scheme="dark"
			testId="substrate"
			code={SUBSTRATE_CODE}
			padding="compact"
		>
			<div
				style={{
					width: '100%',
					display: 'flex',
					flexDirection: 'row',
					gap: 12,
				}}
			>
				<For each={SUBSTRATE_SCENARIOS}>
					{(scenario) => (
						<div
							style={{
								flexGrow: 1,
								flexBasis: 0,
								minWidth: 0,
								display: 'flex',
								flexDirection: 'column',
								gap: 12,
							}}
						>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: 12,
									padding: 16,
									borderRadius: 16,
									borderWidth: 1,
									borderColor: BORDER_40_DARK,
									backgroundColor: surface(scenario.substrate),
								}}
							>
								<text
									style={{
										...siteType.caption,
										fontWeight: weight.semibold,
										color: color.foreground,
									}}
								>
									{scenario.label}
								</text>
								<SurfaceProvider value={scenario.substrate}>
									<SurfaceMenu
										options={SUBSTRATE_ITEMS}
										checkedIndex={0}
										variant="menu"
									/>
								</SurfaceProvider>
							</div>
							<div
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: 4,
									paddingLeft: 4,
									paddingRight: 4,
									paddingBottom: 16,
								}}
							>
								<SwatchRow
									label="BG"
									hex={SURFACE_HEX_DARK[scenario.substrate]}
								/>
								<SwatchRow
									label="Menu"
									hex={SURFACE_HEX_DARK[Math.min(scenario.substrate + 2, 8)]}
								/>
								<ValueRow label="Hover" value="+6%" paddingTop={4} />
								<ValueRow label="Selected" value="+10%" />
							</div>
						</div>
					)}
				</For>
			</div>
		</ComponentPreview>
	);
}

function PanelLabel(props: { children: string }) {
	return (
		<text style={{ ...siteType.caption, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

export function ElevatedDemo() {
	const panel = {
		display: 'flex',
		flexDirection: 'column',
		gap: 12,
		padding: 20,
		borderRadius: 16,
	} as const;
	return (
		<ComponentPreview
			scheme="dark"
			testId="elevated"
			code={ELEVATED_SOURCE}
			padding="compact"
		>
			<div
				style={{
					width: '100%',
					maxWidth: 480,
					...panel,
					backgroundColor: surface(1),
					boxShadow: shadow(1),
				}}
			>
				<PanelLabel>Page</PanelLabel>
				<Elevated offset={2} style={panel}>
					<PanelLabel>Card</PanelLabel>
					<Elevated offset={2} style={panel}>
						<PanelLabel>Popover</PanelLabel>
						<Elevated offset={2} style={{ ...panel, gap: 0 }}>
							<PanelLabel>Menu</PanelLabel>
						</Elevated>
					</Elevated>
				</Elevated>
			</div>
		</ComponentPreview>
	);
}

/** The level under the pointer: only that surface shows its name. */
const [hoveredLevel, setHoveredLevel] = createSignal<number | null>(null);

function LayerBox(props: {
	level: number;
	high: number;
	base: boolean;
	ghost: boolean;
	children?: JSX.Element;
}) {
	const innermost = () => props.level === props.high;
	const style = () =>
		({
			position: 'relative',
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 24,
			borderRadius: 16,
			width: innermost() ? 96 : undefined,
			height: innermost() ? 96 : undefined,
		}) as const;
	const handlers = () =>
		props.ghost
			? {}
			: {
					onMouseMove(event: HostMouseMoveEvent) {
						event.stopPropagation();
						setHoveredLevel(props.level);
					},
				};
	const label = (
		<div style={{ position: 'absolute', top: 8, left: 10 }}>
			<text
				style={{
					...siteType.caption,
					color: color.mutedForeground,
					opacity: !props.ghost && hoveredLevel() === props.level ? 1 : 0,
					...fade(['opacity'], 150),
				}}
			>
				{`surface-${props.level}`}
			</text>
		</div>
	);
	return (
		<Show
			when={props.base}
			fallback={
				<Elevated offset={1} style={style()} {...handlers()}>
					{label}
					{props.children}
				</Elevated>
			}
		>
			<SurfaceProvider value={props.level}>
				<div
					{...handlers()}
					style={{
						...style(),
						backgroundColor: surface(props.level),
						boxShadow: shadow(props.level),
					}}
				>
					{label}
					{props.children}
				</div>
			</SurfaceProvider>
		</Show>
	);
}

/** One `Elevated` per level from `level` up to `high`, each a single step above the one it sits in. */
function Layers(props: {
	level: number;
	high: number;
	base: boolean;
	ghost: boolean;
}) {
	return (
		<LayerBox
			level={props.level}
			high={props.high}
			base={props.base}
			ghost={props.ghost}
		>
			<Show when={props.level < props.high}>
				<Layers
					level={props.level + 1}
					high={props.high}
					base={false}
					ghost={props.ghost}
				/>
			</Show>
		</LayerBox>
	);
}

export function ElevationStackDemo() {
	const [range, setRange] = createSignal<SliderValue>([1, 4]);
	const bounds = () => {
		const value = range();
		if (!Array.isArray(value)) {
			throw new Error('The elevation slider holds a range');
		}
		return value;
	};
	return (
		<ComponentPreview
			scheme="dark"
			testId="stack"
			code={ELEVATION_STACK_CODE}
			padding="compact"
		>
			<div
				style={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					gap: 24,
				}}
			>
				{/* The stage reserves the full 1 to 8 height with an invisible ghost stack, so the preview keeps its size as you drag. */}
				<div
					onMouseLeave={() => setHoveredLevel(null)}
					style={{
						position: 'relative',
						width: '100%',
						maxWidth: 520,
						alignSelf: 'center',
					}}
				>
					<div style={{ opacity: 0, pointerEvents: 'none' }}>
						<Layers level={1} high={8} base ghost />
					</div>
					<div
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Layers level={bounds()[0]} high={bounds()[1]} base ghost={false} />
					</div>
				</div>
				<div
					style={{
						width: '100%',
						maxWidth: 520,
						alignSelf: 'center',
						paddingLeft: 4,
						paddingRight: 4,
						paddingBottom: 8,
					}}
				>
					<Slider
						testId="stack-slider"
						value={range()}
						min={1}
						max={8}
						step={1}
						showSteps
						onChange={setRange}
					/>
				</div>
			</div>
		</ComponentPreview>
	);
}
