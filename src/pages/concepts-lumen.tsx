import { createSignal, For, type JSX, onCleanup, Show } from 'solid-js';
import { createStore } from 'solid-js/store';
import { Badge, type BadgeColor } from '#/components/badge';
import { Button } from '#/components/button';
import { ChatMessage } from '#/components/chat-message';
import { InputMessage } from '#/components/input-message';
import { ScrollArea } from '#/components/scroll-area';
import {
	TabsSubtle,
	TabsSubtleItem,
	TabsSubtlePanel,
} from '#/components/tabs-subtle';
import {
	ThinkingStep,
	ThinkingStepImage,
	ThinkingStepSource,
	ThinkingStepSources,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from '#/components/thinking-steps';
import type { ShotContext } from '#/lib/demo';
import { color, shadow, shape, siteType, weight } from '#/lib/theme';
import { ConceptFrame } from '#/pages/concepts/frame';

export const title = 'Lumen';
export const group = 'Pages';
export const order = 31;
export const layout = 'full';
export const listed = 'none';

/** How long a new question stays in "Writing the answer" before the canned answer lands. */
const THINKING_MS = 1600;
const BOLD = 700;

export async function scenarios(shot: ShotContext) {
	await shot.hover('concept-nav-concepts-beacon');
	shot.capture('nav-hover');
	await shot.moveTo(600, 400);
	await shot.focus('concept-nav-concepts-lumen');
	await shot.press('ArrowDown');
	shot.capture('nav-keyboard');
	await shot.moveTo(600, 400);
	await shot.click('lumen-seed-tab-1');
	shot.capture('sources');
	await shot.click('lumen-seed-tab-2');
	shot.capture('images');
	await shot.click('lumen-seed-tab-0');
	await shot.click('input-message-textarea');
	await shot.press('w h y');
	await shot.press('Enter');
	// The new turn lands below the fold; the page does not scroll to it.
	await shot.scroll(580, 300, 0, 2000);
	shot.expectText('why', true);
	shot.capture('thinking');
	await shot.settle(THINKING_MS + 600);
	await shot.scroll(580, 300, 0, 2000);
	shot.capture('followup');
}

// ── Fixtures ────────────────────────────────────────────────────────────

interface Source {
	n: number;
	title: string;
	site: string;
	color: BadgeColor;
}

const SOURCES: Source[] = [
	{
		n: 1,
		title: 'Epictetus — The Enchiridion',
		site: 'classics.mit.edu',
		color: 'amber',
	},
	{
		n: 2,
		title: 'Marcus Aurelius and the dichotomy of control',
		site: 'dailystoic.com',
		color: 'blue',
	},
	{
		n: 3,
		title: 'Stoicism: internal vs external goods',
		site: 'plato.stanford.edu',
		color: 'violet',
	},
	{
		n: 4,
		title: "What is 'up to us'? A reading of Stoic agency",
		site: 'aeon.co',
		color: 'teal',
	},
];

/** Inline SVG gradient swatches, the source's offline placeholders for the Images tab. */
function swatch(from: string, to: string) {
	return `data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="150"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="240" height="150" fill="url(#g)"/></svg>`,
	)}`;
}

const IMAGES = [
	{ src: swatch('#fbbf24', '#b45309'), caption: 'Bust of Marcus Aurelius' },
	{ src: swatch('#60a5fa', '#1e3a8a'), caption: 'The Painted Porch, Athens' },
	{ src: swatch('#a78bfa', '#5b21b6'), caption: 'Epictetus, engraving' },
	{ src: swatch('#2dd4bf', '#0f766e'), caption: "Seneca's letters, folio" },
];

// ── Swatches ────────────────────────────────────────────────────────────

/** A swatch drawn as a picture of its own 240:150 box, with the hairline the library's image has: `ThinkingStepImage` is fixed at 200px wide, and these fill their grid cell. */
function SwatchImage(props: { src: string }) {
	return (
		<div
			style={{
				position: 'relative',
				width: '100%',
				aspectRatio: 240 / 150,
				flexShrink: 0,
				borderRadius: shape.container,
				backgroundImage: `url("${props.src}")`,
				backgroundSize: '100% 100%',
				outlineWidth: 1,
				outlineOffset: -1,
				outlineColor: color.border,
			}}
		/>
	);
}

function Caption(props: { children: string }) {
	return (
		<text style={{ ...siteType.caption, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

// ── Citation chip ───────────────────────────────────────────────────────

/** The source's `Badge size="sm"` with `mx-0.5 -translate-y-px px-1.5 align-middle tabular-nums`; `top: -1` is the translate. */
function Cite(props: { n: number }) {
	return (
		<Badge
			size="compact"
			style={{
				position: 'relative',
				top: -1,
				verticalAlign: 'middle',
				marginLeft: 2,
				marginRight: 2,
				paddingLeft: 6,
				paddingRight: 6,
				fontVariantNumeric: 'tabular-nums',
			}}
		>
			{props.n}
		</Badge>
	);
}

function Paragraph(props: { children: JSX.Element }) {
	return (
		<text style={{ ...siteType.subtitle, color: color.foreground }}>
			{props.children}
		</text>
	);
}

// ── Answer body ─────────────────────────────────────────────────────────

function Answer() {
	return (
		<ChatMessage from="assistant" fullWidth>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<Paragraph>
					The Stoics drew a sharp line between what is{' '}
					<span style={{ fontWeight: weight.semibold }}>“up to us”</span> and
					what is not. Our judgments, desires, and chosen actions are within our
					power; everything else — health, reputation, wealth, the behaviour of
					others — is not
					<Cite n={1} />
					<Cite n={3} />.
				</Paragraph>
				<Paragraph>
					Epictetus opens the{' '}
					<span style={{ fontStyle: 'italic' }}>Enchiridion</span> with exactly
					this “dichotomy of control.” Tranquility, he argues, comes from
					investing effort only in the former and meeting the latter with
					equanimity
					<Cite n={1} />. Marcus Aurelius turns the same idea inward as a daily
					practice: you have power over your mind, not over outside events
					<Cite n={2} />.
				</Paragraph>
				<Paragraph>
					Later readings refine the picture — some goods are “preferred” without
					being truly good — but the core move is constant: locate the will, and
					let the rest go
					<Cite n={4} />.
				</Paragraph>
			</div>
		</ChatMessage>
	);
}

// ── Sources panel ───────────────────────────────────────────────────────

function SourcesPanel() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<For each={SOURCES}>
				{(source) => (
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: 12,
							paddingLeft: 14,
							paddingRight: 14,
							paddingTop: 12,
							paddingBottom: 12,
							borderRadius: 12,
							backgroundColor: color.surface2,
							boxShadow: shadow(2),
							hover: { boxShadow: shadow(4) },
						}}
					>
						<Badge color={source.color} size="compact">
							{String(source.n)}
						</Badge>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								minWidth: 0,
							}}
						>
							<text
								style={{
									...siteType.body,
									fontWeight: weight.normal,
									color: color.foreground,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{source.title}
							</text>
							<text
								style={{
									...siteType.caption,
									color: color.mutedForeground,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{source.site}
							</text>
						</div>
					</div>
				)}
			</For>
		</div>
	);
}

function ImagesPanel() {
	return (
		<div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
			<For each={IMAGES}>
				{(image) => (
					<div
						style={{
							flexGrow: 1,
							flexBasis: 0,
							minWidth: 0,
							display: 'flex',
							flexDirection: 'column',
							gap: 4,
						}}
					>
						<SwatchImage src={image.src} />
						<Caption>{image.caption}</Caption>
					</div>
				)}
			</For>
		</div>
	);
}

// ── A single turn ───────────────────────────────────────────────────────

interface Turn {
	id: string;
	question: string;
	thinking: boolean;
}

function TurnView(props: { turn: Turn }) {
	const [tab, setTab] = createSignal(0);
	const idPrefix = () => `lumen-${props.turn.id}`;
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
			<text
				style={{
					fontSize: 24,
					lineHeight: '30px',
					fontWeight: BOLD,
					color: color.foreground,
				}}
			>
				{props.turn.question}
			</text>

			<ThinkingSteps defaultOpen={props.turn.thinking} width="100%">
				<ThinkingStepsHeader>
					{props.turn.thinking ? 'Searching the web' : 'Searched 4 sources'}
				</ThinkingStepsHeader>
				<ThinkingStepsContent>
					<ThinkingStep
						icon="search"
						label="Searching the web"
						description="stoicism dichotomy of control — primary sources"
						status="complete"
					/>
					<ThinkingStep icon="globe" label="Reading sources" status="complete">
						<ThinkingStepSources>
							<For each={SOURCES}>
								{(source, index) => (
									<ThinkingStepSource
										color={source.color}
										delay={index() * 0.05}
									>
										{source.site}
									</ThinkingStepSource>
								)}
							</For>
						</ThinkingStepSources>
					</ThinkingStep>
					<ThinkingStep
						icon="brain"
						label={
							props.turn.thinking ? 'Writing the answer' : 'Composed the answer'
						}
						status={props.turn.thinking ? 'active' : 'complete'}
						isLast
					>
						<Show when={!props.turn.thinking}>
							<ThinkingStepImage
								src={IMAGES[0].src}
								alt={IMAGES[0].caption}
								caption="Found 4 related images"
								delay={0.1}
								aspectRatio={240 / 150}
							/>
						</Show>
					</ThinkingStep>
				</ThinkingStepsContent>
			</ThinkingSteps>

			<Show when={!props.turn.thinking}>
				<TabsSubtle
					testId={`${idPrefix()}-tabs`}
					idPrefix={idPrefix()}
					selectedIndex={tab()}
					onSelect={setTab}
				>
					<TabsSubtleItem
						testId={`${idPrefix()}-tab-0`}
						index={0}
						icon="brain"
						label="Answer"
					/>
					<TabsSubtleItem
						testId={`${idPrefix()}-tab-1`}
						index={1}
						icon="globe"
						label="Sources"
					/>
					<TabsSubtleItem
						testId={`${idPrefix()}-tab-2`}
						index={2}
						icon="image"
						label="Images"
					/>
				</TabsSubtle>
				<TabsSubtlePanel index={0} selectedIndex={tab()} idPrefix={idPrefix()}>
					<Answer />
				</TabsSubtlePanel>
				<TabsSubtlePanel index={1} selectedIndex={tab()} idPrefix={idPrefix()}>
					<SourcesPanel />
				</TabsSubtlePanel>
				<TabsSubtlePanel index={2} selectedIndex={tab()} idPrefix={idPrefix()}>
					<ImagesPanel />
				</TabsSubtlePanel>
			</Show>
		</div>
	);
}

// ── Page ────────────────────────────────────────────────────────────────

export function Page() {
	const [draft, setDraft] = createSignal('');
	const [turns, setTurns] = createStore<Turn[]>([
		{
			id: 'seed',
			question: "What did the Stoics believe we can and can't control?",
			thinking: false,
		},
	]);
	const timers = new Set<ReturnType<typeof setTimeout>>();
	onCleanup(() => {
		for (const timer of timers) clearTimeout(timer);
	});

	const send = (value: string) => {
		const question = value.trim();
		if (question === '') return;
		const id = `t${Date.now()}`;
		setTurns(turns.length, { id, question, thinking: true });
		setDraft('');
		// The turn becomes a full answer after a beat.
		const timer = setTimeout(() => {
			timers.delete(timer);
			setTurns((turn) => turn.id === id, 'thinking', false);
		}, THINKING_MS);
		timers.add(timer);
	};

	return (
		<ConceptFrame>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: '100%',
					height: '100%',
				}}
			>
				<div style={{ flexGrow: 1, minHeight: 0 }}>
					<ScrollArea height="100%">
						<div
							style={{
								width: '100%',
								maxWidth: 760,
								alignSelf: 'center',
								display: 'flex',
								flexDirection: 'column',
								gap: 40,
								paddingLeft: 24,
								paddingRight: 24,
								paddingTop: 48,
								paddingBottom: 48,
							}}
						>
							<For each={turns}>{(turn) => <TurnView turn={turn} />}</For>
						</div>
					</ScrollArea>
				</div>

				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						paddingLeft: 24,
						paddingRight: 24,
						paddingTop: 8,
						paddingBottom: 24,
					}}
				>
					<div style={{ width: '100%', maxWidth: 760 }}>
						<InputMessage
							value={draft()}
							onValueChange={setDraft}
							onSend={send}
							placeholder="Ask a follow-up…"
							minRows={1}
							maxRows={5}
							leftSlot={
								<Button variant="ghost" size="compact" leadingIcon="globe">
									Web
								</Button>
							}
						/>
					</div>
				</div>
			</div>
		</ConceptFrame>
	);
}
