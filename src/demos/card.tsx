import { buttonProps, useGpuixRequired } from '@gpuix/solid';
import { createSignal, For, type JSX, Show } from 'solid-js';
import {
	Card,
	CardButton,
	CardContent,
	CardDescription,
	CardFeature,
	CardFooter,
	CardGroup,
	CardHeader,
	CardImage,
	CardMedia,
	CardTitle,
} from '#/components/card';
import type { DemoModule, ShotContext } from '#/lib/demo';
import { DemoCard } from '#/lib/demo-kit';
import {
	PlayDivider,
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySection,
	PlaySelect,
	PlaySwitch,
	pick,
} from '#/lib/playground';
import { color, type as scale } from '#/lib/theme';

/** The docs' inline data-URI art, so the demo needs no asset files. */
const BANNER =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E";
const THUMB =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3CradialGradient id='a' cx='20%25' cy='18%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.95'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='86%25' cy='14%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.5'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='72%25' cy='94%25' r='85%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.85'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='40' height='40' fill='%23ffffff'/%3E%3Crect width='40' height='40' fill='%236B97FF' fill-opacity='0.35'/%3E%3Crect width='40' height='40' fill='url(%23a)'/%3E%3Crect width='40' height='40' fill='url(%23b)'/%3E%3Crect width='40' height='40' fill='url(%23c)'/%3E%3C/svg%3E";

const FEATURES = [
	{
		icon: 'circle',
		title: 'Fluid motion',
		description: 'Spring-tuned transitions calibrated across three tiers',
	},
	{
		icon: 'shield',
		title: 'Accessible by default',
		description: 'Focus-visible rings and ARIA roles in every part',
	},
	{
		icon: 'palette',
		title: 'Yours to theme',
		description: 'Swap radius, icons, and primitive at runtime',
	},
	{
		icon: 'moon',
		title: 'Dark mode ready',
		description: 'Tokens adapt to light and dark automatically',
	},
] as const;

/** Every example composes these same four cards a different way. */
function Basic() {
	return (
		<Capped width={520}>
			<CardGroup orientation="inline" testId="basic">
				<For each={FEATURES}>
					{(feature, index) => (
						<Card testId={`basic-${index()}`} onClick={() => {}}>
							<CardMedia icon={feature.icon} />
							<CardHeader>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
							<CardFooter>
								<CardButton testId={`basic-${index()}-connect`}>
									Connect
								</CardButton>
							</CardFooter>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

function Grid() {
	return (
		<Capped width={560}>
			<CardGroup columns={2} border="outlined" separated testId="grid">
				<For each={FEATURES}>
					{(feature, index) => (
						<Card testId={`grid-${index()}`} onClick={() => {}}>
							<CardImage src={BANNER} />
							<CardHeader>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
							<CardFooter>
								<CardButton variant="primary">Get started</CardButton>
								<CardButton variant="secondary">Learn more</CardButton>
							</CardFooter>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

function Outlined() {
	return (
		<Capped width={520}>
			<CardGroup orientation="inline" border="outlined" testId="outlined">
				<For each={FEATURES}>
					{(feature, index) => (
						<Card testId={`outlined-${index()}`} onClick={() => {}}>
							<CardMedia logo={THUMB} />
							<CardHeader>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
							<CardFooter>
								<CardButton variant="primary">Get started</CardButton>
							</CardFooter>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

function Separated() {
	return (
		<Capped width={560}>
			<CardGroup orientation="inline" separated testId="separated">
				<For each={FEATURES}>
					{(feature, index) => (
						<Card testId={`separated-${index()}`} onClick={() => {}}>
							<CardImage src={BANNER} />
							<CardHeader>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
							<CardFooter>
								<CardButton variant="primary">Get started</CardButton>
								<CardButton variant="secondary">Learn more</CardButton>
								<CardButton>Connect</CardButton>
							</CardFooter>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

/** The docs' `w-full max-w-[...]` column around an example, centred in its frame. */
function Capped(props: { width: number; children: JSX.Element }) {
	return (
		<Centered>
			<div style={{ width: '100%', maxWidth: props.width }}>
				{props.children}
			</div>
		</Centered>
	);
}

function Centered(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
			}}
		>
			{props.children}
		</div>
	);
}

function RestoreLink(props: { onClick: () => void }) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			{...buttonProps({ onClick: props.onClick, tabIndex: 0 }, renderer)}
			testId="promo-restore"
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{ cursor: 'pointer', keyboardFocusDim: false }}
		>
			<text
				style={{
					...scale.body,
					color: hovered() ? color.foreground : color.mutedForeground,
					textDecoration: 'underline',
					textUnderlineOffset: 4,
				}}
			>
				Restore card
			</text>
		</div>
	);
}

function Promo() {
	const [dismissed, setDismissed] = createSignal(false);
	return (
		<Show
			when={!dismissed()}
			fallback={
				<Centered>
					<RestoreLink onClick={() => setDismissed(false)} />
				</Centered>
			}
		>
			<Capped width={300}>
				<Card
					testId="promo"
					dismissible
					outlined
					onDismiss={() => setDismissed(true)}
				>
					<CardImage src={BANNER} />
					<CardHeader>
						<CardTitle>Meet the new Card component</CardTitle>
					</CardHeader>
					<CardContent>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
							<CardFeature
								icon="paintbrush"
								title="Always pixel-perfect"
								description="Renders your design exactly — token-driven and crisp in light and dark, at any radius"
							/>
							<CardFeature
								icon="square-library"
								title="Stacked, inline, or grid"
								description="One compositional API — borderless by default, with separated tiles or a shared frame"
							/>
						</div>
					</CardContent>
					<CardFooter>
						<CardButton variant="primary">Get started</CardButton>
						<CardButton variant="ghost">Learn more</CardButton>
					</CardFooter>
				</Card>
			</Capped>
		</Show>
	);
}

function Selected() {
	const [selected, setSelected] = createSignal(1);
	return (
		<Capped width={520}>
			<CardGroup orientation="inline" testId="selected">
				<For each={FEATURES}>
					{(feature, index) => (
						<Card
							testId={`selected-${index()}`}
							label={feature.title}
							selected={selected() === index()}
							onClick={() => setSelected(index())}
						>
							<CardMedia icon={feature.icon} />
							<CardHeader>
								<CardTitle>{feature.title}</CardTitle>
								<CardDescription>{feature.description}</CardDescription>
							</CardHeader>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

const PLAY_ITEMS = [
	...FEATURES,
	{
		icon: 'search',
		title: 'Fluid hover',
		description: 'A magnetic highlight previews where a click lands',
	},
	{
		icon: 'lightbulb',
		title: 'Drop-in registry',
		description: 'Install any component with one shadcn command',
	},
] as const;

const PLAYGROUND_HEIGHT = 600;

type Orientation = 'card' | 'inline';
type Border = 'none' | 'outlined';
type Media = 'icon' | 'logo' | 'image' | 'none';

const MEDIA_OPTIONS = [
	{ value: 'icon', label: 'Icon' },
	{ value: 'logo', label: 'Logo' },
	{ value: 'image', label: 'Image' },
	{ value: 'none', label: 'None' },
] as const;
const ORIENTATION_OPTIONS = [
	{ value: 'card', label: 'Card' },
	{ value: 'inline', label: 'Inline' },
] as const;
const COLUMN_OPTIONS = [
	{ value: '1', label: '1' },
	{ value: '2', label: '2' },
	{ value: '3', label: '3' },
] as const;
const BORDER_OPTIONS = [
	{ value: 'none', label: 'None' },
	{ value: 'outlined', label: 'Outlined' },
] as const;

function Playground() {
	const [orientation, setOrientation] = createSignal<Orientation>('card');
	const [columns, setColumns] = createSignal<'1' | '2' | '3'>('2');
	const [border, setBorder] = createSignal<Border>('none');
	const [separatedOn, setSeparatedOn] = createSignal(false);
	const [fluidHover, setFluidHover] = createSignal(true);
	const [media, setMedia] = createSignal<Media>('icon');
	const [primary, setPrimary] = createSignal(false);
	const [secondary, setSecondary] = createSignal(false);
	const [ghost, setGhost] = createSignal(false);
	const [description, setDescription] = createSignal(true);
	const [selectedOn, setSelectedOn] = createSignal(false);
	const [selectedIndex, setSelectedIndex] = createSignal(0);

	const inline = () => orientation() === 'inline';
	// An inline card is a full-width list: more columns would cram the media, title and footer together.
	const cols = () => (inline() ? 1 : Number(columns()));
	// Three columns fill two even rows; every other layout stays at four.
	const items = () => PLAY_ITEMS.slice(0, cols() === 3 ? 6 : 4);
	// A selection made while more items were shown would otherwise point past a shorter list.
	const activeSelected = () => Math.min(selectedIndex(), items().length - 1);
	const image = () => media() === 'image';
	const small = () => media() === 'icon' || media() === 'logo';
	// The prominent image reads right only on tiles that clip it, so it forces Separated on.
	const separated = () => image() || separatedOn();

	// Stacked order is primary, secondary, ghost; a plain inline row reverses it so the primary sits at the right, but an inline image card drops the actions below the text in the natural order.
	const hasButtons = () => primary() || secondary() || ghost();
	// Built per card: an element can only have one parent.
	const buttons = () => {
		const list: JSX.Element[] = [];
		if (primary())
			list.push(<CardButton variant="primary">Get started</CardButton>);
		if (secondary())
			list.push(<CardButton variant="secondary">Learn more</CardButton>);
		if (ghost()) list.push(<CardButton>Connect</CardButton>);
		return inline() && !image() ? list.reverse() : list;
	};

	const smallMedia = (icon: (typeof PLAY_ITEMS)[number]['icon']) =>
		media() === 'logo' ? (
			<CardMedia logo={THUMB} size={32} />
		) : (
			<CardMedia icon={icon} />
		);

	const shuffle = () => {
		setMedia(pick(['icon', 'logo', 'image', 'none'] as const));
		setDescription(Math.random() > 0.25);
		setPrimary(Math.random() > 0.4);
		setSecondary(Math.random() > 0.6);
		setGhost(Math.random() > 0.6);
		setSelectedOn(Math.random() > 0.6);
		setSelectedIndex(Math.floor(Math.random() * 4));
		setOrientation(pick(['card', 'inline'] as const));
		setColumns(pick(['1', '2', '3'] as const));
		setBorder(pick(['none', 'outlined'] as const));
		setSeparatedOn(Math.random() > 0.5);
		setFluidHover(Math.random() > 0.2);
	};

	return (
		<PlaygroundLayout
			minHeight={PLAYGROUND_HEIGHT}
			preview={
				// Vertically centred in the frame, as the docs' preview is.
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						width: '100%',
						minHeight: PLAYGROUND_HEIGHT,
					}}
				>
					<Capped width={560}>
						<CardGroup
							testId="play-group"
							orientation={orientation()}
							columns={cols()}
							border={border()}
							separated={separated()}
							fluidHover={fluidHover()}
						>
							<For each={items()}>
								{(item, index) => (
									<Card
										testId={`play-${index()}`}
										label={item.title}
										selected={selectedOn() && index() === activeSelected()}
										// Always a click target, so Fluid hover has something to light; selection listens only while it is on.
										onClick={() => {
											if (selectedOn()) setSelectedIndex(index());
										}}
									>
										<Show when={image()}>
											<CardImage src={BANNER} />
										</Show>
										<Show when={small() && inline()}>
											{smallMedia(item.icon)}
										</Show>
										<CardHeader>
											<Show when={small() && !inline()}>
												{smallMedia(item.icon)}
											</Show>
											<CardTitle>{item.title}</CardTitle>
											<Show when={description()}>
												<CardDescription>{item.description}</CardDescription>
											</Show>
										</CardHeader>
										<Show when={hasButtons()}>
											<CardFooter>{buttons()}</CardFooter>
										</Show>
									</Card>
								)}
							</For>
						</CardGroup>
					</Capped>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlaySection label="Card" />
					<PlayField label="Media">
						<PlaySelect
							testId="play-media"
							value={media()}
							onChange={setMedia}
							options={MEDIA_OPTIONS}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-description"
						label="Description"
						checked={description()}
						onToggle={() => setDescription(!description())}
					/>
					<PlaySwitch
						testId="play-primary"
						label="Primary button"
						checked={primary()}
						onToggle={() => setPrimary(!primary())}
					/>
					<PlaySwitch
						testId="play-secondary"
						label="Secondary button"
						checked={secondary()}
						onToggle={() => setSecondary(!secondary())}
					/>
					<PlaySwitch
						testId="play-ghost"
						label="Ghost button"
						checked={ghost()}
						onToggle={() => setGhost(!ghost())}
					/>
					<PlayDivider />
					<PlaySection label="Card group" />
					<PlayField label="Orientation">
						<PlaySelect
							testId="play-orientation"
							value={orientation()}
							onChange={setOrientation}
							options={ORIENTATION_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Columns" disabled={inline()}>
						<PlaySelect
							testId="play-columns"
							value={inline() ? '1' : columns()}
							onChange={setColumns}
							options={COLUMN_OPTIONS}
						/>
					</PlayField>
					<PlayField label="Border">
						<PlaySelect
							testId="play-border"
							value={border()}
							onChange={setBorder}
							options={BORDER_OPTIONS}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-separated"
						label="Separated"
						checked={separated()}
						onToggle={() => setSeparatedOn(!separatedOn())}
						disabled={image()}
					/>
					<PlaySwitch
						testId="play-fluid"
						label="Fluid hover"
						checked={fluidHover()}
						onToggle={() => setFluidHover(!fluidHover())}
					/>
					<PlaySwitch
						testId="play-selected"
						label="Selected"
						checked={selectedOn()}
						onToggle={() => setSelectedOn(!selectedOn())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

export const title = 'Card';
export const group = 'Components';
export const listed = 'sidebar';

export function Demo() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			<Playground />
			<DemoCard title="Basic">
				<Basic />
			</DemoCard>
			<DemoCard title="Grid: 2-D fluid hover">
				<Grid />
			</DemoCard>
			<DemoCard title="Outlined group">
				<Outlined />
			</DemoCard>
			<DemoCard title="Separated tiles">
				<Separated />
			</DemoCard>
			<DemoCard title="Fully yours — compose anything">
				<Promo />
			</DemoCard>
			<DemoCard title="Selected">
				<Selected />
			</DemoCard>
		</div>
	);
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	// The playground's controls sit in the right column.
	shot.capture('playground');
	await shot.hover('play-1');
	shot.capture('playground-hover');

	// Image forces Separated on; Inline forces one column.
	await pickOption(shot, 'play-media', 'ArrowDown ArrowDown');
	shot.capture('playground-image');
	await shot.click('play-primary-track');
	await shot.click('play-secondary-track');
	await pickOption(shot, 'play-columns', 'ArrowDown');
	await shot.click('play-selected-track');
	await shot.click('play-2');
	shot.capture('playground-image-three-columns-selected');
	await pickOption(shot, 'play-media', 'ArrowUp');
	await pickOption(shot, 'play-orientation', 'ArrowDown');
	shot.capture('playground-inline-logo');
	await pickOption(shot, 'play-border', 'ArrowDown');
	await shot.click('play-ghost-track');
	await shot.click('play-0');
	shot.capture('playground-inline-outlined-selected');
	await shot.click('playground-shuffle');
	shot.capture('playground-shuffled');

	await reveal(shot, 'basic-1');
	await shot.hover('basic-1');
	shot.capture('basic-hover');
	await shot.hover('basic-3');
	shot.capture('basic-hover-last');
	await shot.hover('basic-2-connect');
	shot.capture('basic-action-hover');

	await reveal(shot, 'grid-3');
	await shot.hover('grid-3');
	shot.capture('grid-2d-hover');
	// The gap between two tiles still resolves to the nearest one.
	const top = shot.centerOf('grid-0');
	const bottom = shot.centerOf('grid-2');
	await shot.moveTo(top.x, (top.y + bottom.y) / 2);
	shot.capture('grid-gap-hover');

	await reveal(shot, 'separated-0');
	shot.capture('separated-and-outlined');

	await reveal(shot, 'promo');
	// The promo is taller than the window's upper band: bring its top (and the chip) into view.
	await shot.scroll(700, 400, 0, -160);
	await shot.hover('promo');
	shot.capture('promo-hover');
	await shot.hover('promo-dismiss');
	shot.capture('promo-chip-hover');
	await shot.click('promo-dismiss');
	await shot.settle(300);
	await shot.hover('promo-restore');
	shot.capture('promo-restore-hover');
	await shot.click('promo-restore');

	await reveal(shot, 'selected-3');
	await shot.click('selected-3');
	await shot.hover('selected-0');
	shot.capture('selected-3-hover-0');
};

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

/** Opens a playground select from the keyboard and walks `steps` rows. */
async function pickOption(shot: ShotContext, testId: string, steps: string) {
	await shot.focus(`${testId}-trigger`);
	await shot.press(`ArrowDown ${steps} Enter`);
	await shot.settle(300);
}
