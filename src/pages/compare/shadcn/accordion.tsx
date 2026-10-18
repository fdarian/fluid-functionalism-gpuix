import {
	type DomEvent,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from '@gpuix/solid';
import { createEffect, createSignal, For, on, Show } from 'solid-js';
import { LUCIDE, LucideIcon, pressProps } from './parts';
import { sc, scRing } from './theme';

/** `accordion-down` / `accordion-up`: 0.2s ease-out. */
const SLIDE = { duration: 0.2, ease: 'easeOut' } as const;

function Panel(props: { open: boolean; children: string }) {
	const [height, setHeight] = createSignal<number>();
	// gpuix has no `display: none`: a closed panel leaves the accessibility tree by unmounting once its exit is over.
	const [retired, setRetired] = createSignal(!props.open);
	createEffect(
		on(
			() => props.open,
			(open) => {
				if (open) setRetired(false);
			},
			{ defer: true },
		),
	);
	return (
		<motion.div
			role="region"
			initial={false}
			animate={{ height: props.open ? (height() ?? 0) : 0 }}
			transition={SLIDE}
			onMotionComplete={() => {
				if (!props.open) setRetired(true);
			}}
			style={{
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				...(height() === undefined && props.open ? { height: 'auto' } : {}),
			}}
		>
			<Show when={!retired()}>
				<div
					onLayout={(event: DomEvent) => {
						if (event.height === undefined) {
							throw new Error('onLayout reported no height');
						}
						setHeight(event.height);
					}}
					style={{
						display: 'flex',
						flexDirection: 'column',
						flexShrink: 0,
						paddingTop: 4,
						paddingBottom: 12,
					}}
				>
					<text
						style={{
							fontSize: 13,
							lineHeight: '18.57px',
							fontWeight: 400,
							color: sc.foreground,
						}}
					>
						{props.children}
					</text>
				</div>
			</Show>
		</motion.div>
	);
}

/**
 * `components/shadcn/accordion.tsx` as `type="single" collapsible`: one item open at a time, a click on the open
 * one closes it, a hover underlines the title, and the chevron flips when open. Up / Down / Home / End move
 * between triggers.
 */
export function ScAccordion(props: {
	items: readonly { value: string; title: string; content: string }[];
	defaultValue: string;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const [open, setOpen] = createSignal<string | undefined>(props.defaultValue);
	const triggers: HostElement[] = [];

	const focusTrigger = (index: number) => {
		const target = triggers[index];
		if (target === undefined) throw new Error(`There is no trigger ${index}`);
		if (renderer.focusElement === undefined) {
			throw new Error('This renderer cannot move focus');
		}
		renderer.focusElement(target.id);
	};
	const onKeyDown = (index: number) => (event: KeyEvent) => {
		const last = props.items.length - 1;
		const target =
			event.key === 'ArrowDown'
				? index === last
					? 0
					: index + 1
				: event.key === 'ArrowUp'
					? index === 0
						? last
						: index - 1
					: event.key === 'Home'
						? 0
						: event.key === 'End'
							? last
							: undefined;
		if (target === undefined) return;
		event.preventDefault();
		focusTrigger(target);
	};

	return (
		<div
			testId={props.testId}
			style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
		>
			<For each={props.items}>
				{(item, index) => {
					const isOpen = () => open() === item.value;
					return (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								borderBottomStyle: 'solid',
								borderBottomWidth: 1,
								borderColor: sc.border,
							}}
						>
							<div
								ref={(element) => {
									triggers[index()] = element;
								}}
								{...pressProps({
									onClick: () => setOpen(isOpen() ? undefined : item.value),
									onKeyDown: onKeyDown(index()),
								})}
								aria-expanded={isOpen()}
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-${item.value}`
								}
								style={{
									group: true,
									display: 'flex',
									flexDirection: 'row',
									alignItems: 'center',
									justifyContent: 'space-between',
									paddingTop: 8,
									paddingBottom: 8,
									keyboardFocusDim: false,
									focusVisible: scRing(),
								}}
							>
								<text
									style={{
										fontSize: 13,
										lineHeight: '19.5px',
										fontWeight: 500,
										color: sc.foreground,
										groupHover: { textDecoration: 'underline' },
									}}
								>
									{item.title}
								</text>
								<LucideIcon
									name={isOpen() ? LUCIDE.chevronUp : LUCIDE.chevronDown}
									size={16}
									strokeWidth={2}
									color={sc.foreground}
								/>
							</div>
							<Panel open={isOpen()}>{item.content}</Panel>
						</div>
					);
				}}
			</For>
		</div>
	);
}
