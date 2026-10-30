import { AnimatePresence, motion } from '@gpuix/solid';
import { createSignal, For, type JSX, onCleanup } from 'solid-js';
import {
	Card,
	CardDescription,
	CardGroup,
	CardHeader,
	CardImage,
	CardMedia,
	CardTitle,
} from '#/components/card';
import { defineIcon, type IconRef } from '#/lib/icons';
import { createMeasuredHeight } from '#/lib/measured-height';
import { shape, surface, motion as tween } from '#/lib/theme';

export type CalloutVariant = 'inline' | 'banner';

const PANEL_ICON = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>',
);
const PLAY_ICON = defineIcon(
	'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
);

interface CalloutCard {
	id: string;
	icon: IconRef;
	title: string;
	description: string;
}

const CARDS: readonly CalloutCard[] = [
	{
		id: 'sidebar',
		icon: PANEL_ICON,
		title: 'Sidebar is here',
		description: 'New in Fluid Functionalism',
	},
	{
		id: 'stars',
		icon: 'star',
		title: '500 stars',
		description: 'Find the hidden mosaic',
	},
	{
		id: 'motion',
		icon: PLAY_ICON,
		title: 'Motion guidelines',
		description: 'Three spring tiers, one page',
	},
];

const PEEK = 12;
const PEEK_SCALE = 0.05;
const GAP = 4;
const MAX_PEEK = 2;
const BANNER_HEIGHT = 112;
const INLINE_HEIGHT = 64;
const BANNER_FALLBACK_HEIGHT = 180;

/** Each card keeps its own step of the brand-blue mesh, so the pile reads as one family with depth. */
const MESH_STEPS = [1, 0.4, 0.66] as const;

/** The card playground's brand-blue mesh with every opacity stop scaled by `intensity`. */
function mesh(intensity: number) {
	const stop = (
		id: string,
		cx: number,
		cy: number,
		r: number,
		opacity: number,
	) =>
		`<radialGradient id='${id}' cx='${cx}%' cy='${cy}%' r='${r}%'><stop offset='0%' stop-color='#6B97FF' stop-opacity='${opacity * intensity}'/><stop offset='100%' stop-color='#6B97FF' stop-opacity='0'/></radialGradient>`;
	const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><defs>${stop('a', 12, 16, 70, 0.9)}${stop('b', 90, 12, 65, 0.45)}${stop('c', 82, 94, 75, 0.8)}${stop('d', 24, 90, 68, 0.55)}</defs><rect width='320' height='180' fill='#ffffff'/><rect width='320' height='180' fill='#6B97FF' fill-opacity='${0.2 * intensity}'/><rect width='320' height='180' fill='url(#a)'/><rect width='320' height='180' fill='url(#b)'/><rect width='320' height='180' fill='url(#c)'/><rect width='320' height='180' fill='url(#d)'/></svg>`;
	return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * A card resting one step above the rail: the sidebar sits on surface 1. `clipped` is the source's `overflow-hidden`; the fanned
 * inline pile goes without it, because a clip inside a transformed card makes gpuix drop the card's text once it is moved far
 * enough (`drift/sidebar.md`, "Callout"), and nothing of an inline card reaches past its rounded fill.
 */
function Resting(props: { clipped: boolean; children: JSX.Element }) {
	return (
		<div
			style={{
				borderRadius: shape.container,
				overflow: props.clipped ? 'hidden' : 'visible',
				backgroundColor: surface(2),
			}}
		>
			{props.children}
		</div>
	);
}

function CalloutCardBody(props: {
	card: CalloutCard;
	variant: CalloutVariant;
	step: number;
	/** Whether the card is clipped to its rounded corners; see `Resting`. */
	clipped?: boolean;
	onDismiss: () => void;
	testId: string;
}) {
	const body = () => (
		<Card
			size="compact"
			dismissible
			onDismiss={props.onDismiss}
			onClick={() => {}}
			label={`${props.card.title} — ${props.card.description}`}
			testId={props.testId}
		>
			{props.variant === 'banner' ? (
				<CardImage src={mesh(MESH_STEPS[props.step])} height={BANNER_HEIGHT} />
			) : (
				<CardMedia icon={props.card.icon} size={18} />
			)}
			<CardHeader>
				<CardTitle>{props.card.title}</CardTitle>
				<CardDescription>{props.card.description}</CardDescription>
			</CardHeader>
		</Card>
	);
	return (
		<Resting clipped={props.clipped ?? true}>
			{props.variant === 'inline' ? (
				<CardGroup orientation="inline" fluidHover={false}>
					{body()}
				</CardGroup>
			) : (
				body()
			)}
		</Resting>
	);
}

/** One announcement card above the footer rows. */
export function FooterCallout(props: {
	variant: CalloutVariant;
	onDismiss: () => void;
}) {
	return (
		<CalloutCardBody
			card={CARDS[0]}
			variant={props.variant}
			step={0}
			onDismiss={props.onDismiss}
			testId="callout"
		/>
	);
}

function StackedCard(props: {
	card: CalloutCard;
	/** Its place in the pile, front first: the earlier, the higher it paints. */
	index: () => number;
	variant: CalloutVariant;
	step: number;
	target: () => { y: number; scale: number; opacity: number };
	onHeight: (height: number) => void;
	onDismiss: () => void;
}) {
	const measured = createMeasuredHeight();
	return (
		<motion.div
			initial={{ opacity: 0, y: 14, scale: 0.96 }}
			animate={props.target()}
			exit={{ opacity: 0, scale: 0.9, transition: tween.moderateExit }}
			transition={tween.moderate}
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				bottom: 0,
				transformOrigin: 'bottom center',
				zIndex: 100 - props.index(),
			}}
		>
			<div
				onLayout={(event) => {
					measured.onLayout(event);
					const height = measured.height();
					if (height !== undefined) props.onHeight(height);
				}}
			>
				<CalloutCardBody
					card={props.card}
					variant={props.variant}
					step={props.step}
					clipped={props.variant === 'banner'}
					onDismiss={props.onDismiss}
					testId={`callout-${props.card.id}`}
				/>
			</div>
		</motion.div>
	);
}

/**
 * Sonner-style pile on the queued-message stack's geometry: cards peek out
 * 12px apiece behind the front one, a step smaller each, capped at two peeks.
 * Only the inline pile fans out on hover, a hover-expanded pile of banners
 * would swallow the whole rail.
 */
export function FooterCalloutStack(props: {
	variant: CalloutVariant;
	onEmpty: () => void;
}) {
	const [cards, setCards] = createSignal(CARDS);
	const [hovered, setHovered] = createSignal(false);
	const [heights, setHeights] = createSignal<Record<string, number>>({});
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(leaveTimer));

	const expanded = () => props.variant === 'inline' && hovered();
	const front = () => cards()[0];
	const frontHeight = () =>
		heights()[`${props.variant}:${front().id}`] ??
		(props.variant === 'banner' ? BANNER_FALLBACK_HEIGHT : INLINE_HEIGHT);
	const count = () => cards().length;
	const collapsedHeight = () =>
		frontHeight() + Math.min(Math.max(count() - 1, 0), MAX_PEEK) * PEEK;
	const expandedHeight = () =>
		count() * frontHeight() + Math.max(count() - 1, 0) * GAP;

	const dismiss = (id: string) => {
		const next = cards().filter((card) => card.id !== id);
		setCards(next);
		if (next.length === 0) props.onEmpty();
	};

	const targetOf = (id: string) => () => {
		const index = cards().findIndex((card) => card.id === id);
		if (expanded()) {
			return {
				y: -index * (frontHeight() + GAP),
				scale: 1,
				opacity: 1,
			};
		}
		const peek = Math.min(index, MAX_PEEK);
		return {
			y: -peek * PEEK,
			scale: 1 - peek * PEEK_SCALE,
			opacity: index <= MAX_PEEK ? 1 : 0,
		};
	};

	return (
		<motion.div
			testId="callout-stack"
			initial={false}
			animate={{ height: expanded() ? expandedHeight() : collapsedHeight() }}
			transition={tween.moderate}
			onMouseEnter={() => {
				clearTimeout(leaveTimer);
				setHovered(true);
			}}
			onMouseLeave={() => {
				clearTimeout(leaveTimer);
				leaveTimer = setTimeout(() => setHovered(false), 40);
			}}
			style={{ position: 'relative' }}
		>
			<AnimatePresence initial={false}>
				<For each={cards()}>
					{(card, index) => (
						<StackedCard
							card={card}
							index={index}
							variant={props.variant}
							step={CARDS.findIndex((other) => other.id === card.id)}
							target={targetOf(card.id)}
							onHeight={(height) =>
								setHeights({
									...heights(),
									[`${props.variant}:${card.id}`]: height,
								})
							}
							onDismiss={() => dismiss(card.id)}
						/>
					)}
				</For>
			</AnimatePresence>
		</motion.div>
	);
}
