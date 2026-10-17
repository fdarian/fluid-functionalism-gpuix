import {
	buttonProps,
	type MotionTransition,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import { type Accessor, createSignal, For, onCleanup, Show } from 'solid-js';
import { MONO } from '#/lib/doc-page';
import { usePageNav } from '#/lib/page-nav';
import {
	color,
	focusRing,
	siteType,
	motion as tween,
	weight,
} from '#/lib/theme';

interface Chip {
	label: string;
	/** The page it links to; none where the source has no page. */
	slug: string | null;
}

const REFERENCE_TIERS = [
	{
		key: 'fast',
		trackWidth: '33.3333%',
		enterToken: 'spring.fast',
		exitToken: 'spring.fast.exit',
		enterMeta: '0.08s',
		exitMeta: '0.06s',
		enterTransition: tween.fast,
		exitTransition: tween.fastExit,
		components: [
			{ label: 'Fluid hover', slug: 'fluid-hover' },
			{ label: 'Focus rings', slug: null },
			{ label: 'Checkbox', slug: 'checkbox-group' },
			{ label: 'Radio', slug: 'radio-group' },
			{ label: 'Tooltip', slug: 'tooltip' },
			{ label: 'Table rows', slug: 'table' },
			{ label: 'Card grid', slug: 'card' },
			{ label: 'Input copy', slug: 'input-copy' },
			{ label: 'Slider', slug: 'slider' },
			{ label: 'Select', slug: 'select' },
			{ label: 'Combobox', slug: 'combobox' },
			{ label: 'Command menu', slug: 'command-menu' },
			{ label: 'Color picker', slug: 'color-picker' },
			{ label: 'Accordion', slug: 'accordion' },
		],
	},
	{
		key: 'moderate',
		trackWidth: '66.6667%',
		enterToken: 'spring.moderate',
		exitToken: 'spring.moderate.exit',
		enterMeta: '0.16s bounce 0',
		exitMeta: '0.12s',
		enterTransition: tween.moderate,
		exitTransition: tween.moderateExit,
		components: [
			{ label: 'Dropdown', slug: 'dropdown' },
			{ label: 'Tabs indicator', slug: 'tabs' },
			{ label: 'Carousel dots', slug: 'carousel-dots' },
			{ label: 'Banner dismiss', slug: 'banner' },
			{ label: 'Switch thumb', slug: 'switch' },
			{ label: 'Chat bubbles', slug: 'chat-message' },
			{ label: 'Mobile drawer', slug: null },
			{ label: 'Sidebar', slug: 'sidebar' },
			{ label: 'Selection merge / split', slug: 'checkbox-group' },
		],
	},
	{
		key: 'slow',
		trackWidth: '100%',
		enterToken: 'spring.slow',
		exitToken: 'spring.slow.exit',
		enterMeta: '0.24s bounce 0.12',
		exitMeta: '0.16s',
		enterTransition: tween.slow,
		exitTransition: tween.slowExit,
		components: [
			{ label: 'Dialog', slug: 'dialog' },
			{ label: 'Ask-user questions', slug: 'ask-user-questions' },
			{ label: 'Thinking steps', slug: 'thinking-steps' },
		],
	},
] as const satisfies readonly {
	key: string;
	trackWidth: string;
	enterToken: string;
	exitToken: string;
	enterMeta: string;
	exitMeta: string;
	enterTransition: MotionTransition;
	exitTransition: MotionTransition;
	components: readonly Chip[];
}[];

type TierKey = (typeof REFERENCE_TIERS)[number]['key'];

/** ms to wait before reversing (covers spring settle + tiny pause). */
const ENTER_SETTLE: Record<TierKey, number> = {
	fast: 220,
	moderate: 400,
	slow: 560,
};
/** ms the exit takes (blocks re-clicks until done). */
const EXIT_SETTLE: Record<TierKey, number> = {
	fast: 150,
	moderate: 200,
	slow: 250,
};

const TRACK = 28;
const BALL = 24;

function ComponentChip(props: Chip) {
	const nav = usePageNav();
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	const label = () => (
		<text
			style={{
				...siteType.body,
				color: hovered() ? color.foreground : color.mutedForeground,
				transitionProperty: 'color',
				transitionDuration: '150ms',
				transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
			}}
		>
			{props.label}
		</text>
	);
	return (
		<Show
			when={props.slug}
			fallback={
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					{props.label}
				</text>
			}
		>
			{(slug: Accessor<string>) => (
				<div
					{...buttonProps({ onClick: () => nav.navigate(slug()) }, renderer)}
					role="link"
					testId={`chip-${slug()}`}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					style={{
						cursor: 'pointer',
						keyboardFocusDim: false,
						focusVisible: focusRing(0),
					}}
				>
					{label()}
				</div>
			)}
		</Show>
	);
}

export function SpringReferenceSection() {
	const renderer = useGpuixRequired();
	const [atEnds, setAtEnds] = createSignal([false, false, false]);
	const [transitions, setTransitions] = createSignal<MotionTransition[]>([
		tween.fast,
		tween.moderate,
		tween.slow,
	]);
	const [busy, setBusy] = createSignal([false, false, false]);
	const timers = new Set<ReturnType<typeof setTimeout>>();
	onCleanup(() => {
		for (const timer of timers) clearTimeout(timer);
	});
	const later = (run: () => void, ms: number) => {
		const timer = setTimeout(() => {
			timers.delete(timer);
			run();
		}, ms);
		timers.add(timer);
	};
	const setAt = <T,>(
		list: () => T[],
		set: (next: T[]) => void,
		i: number,
		value: T,
	) => set(list().map((current, j) => (j === i ? value : current)));

	const fire = (i: number) => {
		if (busy()[i]) return;
		const tier = REFERENCE_TIERS[i];
		const settle = tier.key;

		// Enter: L → R
		setAt(busy, setBusy, i, true);
		setAt(transitions, setTransitions, i, tier.enterTransition);
		setAt(atEnds, setAtEnds, i, true);

		// Exit: R → L (after spring settles)
		later(() => {
			setAt(transitions, setTransitions, i, tier.exitTransition);
			setAt(atEnds, setAtEnds, i, false);
			later(() => setAt(busy, setBusy, i, false), EXIT_SETTLE[settle]);
		}, ENTER_SETTLE[settle]);
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column' }}>
			<For each={REFERENCE_TIERS}>
				{(tier, index) => (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 16,
							paddingTop: 24,
							paddingBottom: 24,
							borderTopStyle: 'solid',
							borderTopWidth: index() > 0 ? 1 : 0,
							borderColor: color.border,
						}}
					>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
								style={{ ...siteType.caption, color: color.mutedForeground }}
							>
								→ <span style={{ fontFamily: MONO }}>{tier.enterToken}</span>{' '}
								{tier.enterMeta}
							</text>
							<text
								style={{ ...siteType.caption, color: color.mutedForeground }}
							>
								← <span style={{ fontFamily: MONO }}>{tier.exitToken}</span>{' '}
								{tier.exitMeta}
							</text>
						</div>

						{/* Track constrained to tier width */}
						<div
							{...buttonProps({ onClick: () => fire(index()) }, renderer)}
							testId={`reference-${tier.key}`}
							aria-label={`Play ${tier.key} enter then exit`}
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								justifyContent: atEnds()[index()] ? 'flex-end' : 'flex-start',
								width: tier.trackWidth,
								height: TRACK,
								paddingLeft: 2,
								paddingRight: 2,
								borderRadius: TRACK / 2,
								backgroundColor: color.muted,
								cursor: 'pointer',
								keyboardFocusDim: false,
								focusVisible: focusRing(0),
							}}
						>
							<motion.div
								layout
								transition={transitions()[index()]}
								style={{
									width: BALL,
									height: BALL,
									flexShrink: 0,
									borderRadius: BALL / 2,
									backgroundColor: color.foreground,
								}}
							/>
						</div>

						{/* Component chips — links where a page exists */}
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								flexWrap: 'wrap',
								columnGap: 12,
								rowGap: 4,
							}}
						>
							<For each={tier.components}>
								{(component) => (
									<ComponentChip
										label={component.label}
										slug={component.slug}
									/>
								)}
							</For>
						</div>
					</div>
				)}
			</For>
		</div>
	);
}
