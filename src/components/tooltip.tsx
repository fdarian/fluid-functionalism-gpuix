import {
	DismissableLayer,
	type DomEvent,
	type HostElement,
	type HostMouseMoveEvent,
	motion,
} from '@gpuix/solid';
import {
	createPlacementState,
	createPresence,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	untrack,
	useContext,
} from 'solid-js';
import { POPUP_EXIT_FALLBACK_MS } from '#/lib/popup-timing';
import { color, type as scale, shape, motion as tween } from '#/lib/theme';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

const DEFAULT_DELAY = 200;
const SLIDE = 4;
/** A bare tooltip's own group lasts as long as Base UI's provider default. */
const BARE_SKIP_DELAY = 400;
/** How long the tooltip stays after the pointer leaves, so it can cross the gap to the chip: Base UI's safe polygon, approximated with a timer. */
const GRACE_MS = 80;

/** What tooltips under one provider share: the hover delay, and when the last one closed so a neighbour can skip it. */
interface TooltipGroup {
	readonly delay: number;
	readonly skipDelay: number;
	closedAt: number | undefined;
}

const TooltipGroupContext = createContext<TooltipGroup>();

/**
 * Moving from one trigger to the next within `skipDelayDuration` of a close
 * opens the next tooltip at once. Without a provider each tooltip is on its
 * own and always waits.
 */
export function TooltipProvider(props: {
	delayDuration?: number;
	skipDelayDuration?: number;
	children: JSX.Element;
}) {
	const group: TooltipGroup = {
		get delay() {
			return props.delayDuration ?? DEFAULT_DELAY;
		},
		get skipDelay() {
			return props.skipDelayDuration ?? 300;
		},
		closedAt: undefined,
	};
	return (
		<TooltipGroupContext.Provider value={group}>
			{props.children}
		</TooltipGroupContext.Provider>
	);
}

/** Where the chip starts, relative to where it rests: it slides in from the trigger's side. */
function slideFrom(side: TooltipSide) {
	switch (side) {
		case 'top':
			return { top: SLIDE, left: 0 };
		case 'bottom':
			return { top: -SLIDE, left: 0 };
		case 'left':
			return { top: 0, left: SLIDE };
		case 'right':
			return { top: 0, left: -SLIDE };
	}
}

export function Tooltip(props: {
	content: JSX.Element;
	/** The trigger: the wrapper hears its hover, press and focus through bubbling. */
	children: JSX.Element;
	side?: TooltipSide;
	sideOffset?: number;
	/** How long the pointer must rest on the trigger, in ms, before it opens. Defaults to the provider's, or 200. */
	delayDuration?: number;
	/** `true` / `false` pin the tooltip open / closed; leave it out for hover and keyboard focus. */
	forceOpen?: boolean;
	/** Track the pointer along one axis; the other stays anchored by `side`. */
	followCursor?: 'x' | 'y';
	/** The tooltip opened or closed by hover or focus (not by `forceOpen`). */
	onOpenChange?: (open: boolean) => void;
	testId?: string;
}) {
	const ambient = useContext(TooltipGroupContext);
	const group: TooltipGroup = ambient ?? {
		delay: DEFAULT_DELAY,
		skipDelay: BARE_SKIP_DELAY,
		closedAt: undefined,
	};
	const placement = createPlacementState(props.side ?? 'top');
	const side = () => props.side ?? 'top';

	// onMotionComplete is the primary release; the timer covers an exit that never animates.
	const presence = createPresence(POPUP_EXIT_FALLBACK_MS);
	const [opened, setHovered] = createSignal(false);
	const open = () => props.forceOpen ?? opened();
	const [followOffset, setFollowOffset] = createSignal({ x: 0, y: 0 });
	let wrapper: HostElement | undefined;
	let delayTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	/** A rest timer is running: moves of under ~1.4 px leave it alone, anything bigger restarts it. */
	let restPending = false;
	let lastPointer: { x: number; y: number } | undefined;
	/** Set by a close, cleared by the next enter: the pointer moving inside the trigger after a press must not reopen. */
	let blockMove = false;
	/** A press or Escape closed the tooltip: the trigger still holds focus, which must not reopen it until the pointer leaves or focus moves on. */
	let blockFocus = false;
	/** The pointer is on the chip. It enters the chip before the trigger reports it left, so the trigger's leave must not start the close. */
	let overChip = false;
	onCleanup(() => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
	});

	createEffect(() => {
		if (open()) presence.show();
		else if (untrack(presence.mounted)) presence.hide();
	});

	const setOpen = (next: boolean) => {
		if (opened() === next) return;
		setHovered(next);
		props.onOpenChange?.(next);
	};

	const delay = () => {
		const closedAt = group.closedAt;
		if (
			closedAt !== undefined &&
			performance.now() - closedAt < group.skipDelay
		)
			return 0;
		return props.delayDuration ?? group.delay;
	};
	const close = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		restPending = false;
		blockMove = true;
		overChip = false;
		if (!opened()) return;
		group.closedAt = performance.now();
		setOpen(false);
	};
	/** A press or Escape: closes, and keyboard focus on the trigger no longer reopens it. */
	const dismiss = () => {
		blockFocus = opened();
		close();
	};
	/** The pointer left the trigger or the chip: a pending open is dropped, an open tooltip closes unless the pointer reaches the chip (or comes back) first. */
	const scheduleClose = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		restPending = false;
		if (!opened() || overChip) return;
		closeTimer = setTimeout(close, GRACE_MS);
	};

	const onMouseEnter = () => {
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		restPending = false;
		blockMove = false;
		lastPointer = undefined;
		// Coming back while the chip is still fading out brings it straight back.
		const fadingOut = presence.mounted() && !presence.open();
		// With a delay, entering starts nothing: the timer runs from the pointer's moves (`restIntent`).
		if (fadingOut || delay() === 0) setOpen(true);
	};
	/** Base UI's `restMs`: the tooltip opens once the pointer has rested on the trigger for the delay. */
	const restIntent = (event: HostMouseMoveEvent) => {
		if (event.x === undefined || event.y === undefined) return;
		const last = lastPointer;
		lastPointer = { x: event.x, y: event.y };
		if (opened() || blockMove) return;
		const wait = delay();
		if (wait === 0) return;
		if (
			restPending &&
			last !== undefined &&
			(event.x - last.x) ** 2 + (event.y - last.y) ** 2 < 2
		)
			return;
		clearTimeout(delayTimer);
		restPending = true;
		delayTimer = setTimeout(() => {
			restPending = false;
			if (!blockMove) setOpen(true);
		}, wait);
	};
	const followPointer = (event: HostMouseMoveEvent) => {
		if (props.followCursor === undefined) return;
		if (wrapper === undefined) throw new Error('Tooltip is not mounted');
		const bounds = wrapper.getBoundingClientRect();
		if (event.x === undefined || event.y === undefined) return;
		setFollowOffset(
			props.followCursor === 'x'
				? { x: event.x - (bounds.x + bounds.width / 2), y: 0 }
				: { x: 0, y: event.y - (bounds.y + bounds.height / 2) },
		);
	};

	const onMouseMove = (event: HostMouseMoveEvent) => {
		followPointer(event);
		restIntent(event);
	};

	// The child takes focus, not the wrapper, and `focus` does not bubble: `focusin` does.
	const onFocusIn = (event: DomEvent) => {
		if (!event.focusVisible || blockFocus) return;
		clearTimeout(delayTimer);
		clearTimeout(closeTimer);
		setOpen(true);
	};
	const onFocusOut = () => {
		blockFocus = false;
		close();
	};

	return (
		<div
			ref={(element) => {
				wrapper = element;
			}}
			testId={props.testId}
			onMouseEnter={onMouseEnter}
			onMouseMove={onMouseMove}
			onMouseLeave={() => {
				blockFocus = false;
				scheduleClose();
			}}
			onMouseDown={dismiss}
			onFocusIn={onFocusIn}
			onFocusOut={onFocusOut}
			style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
		>
			{props.children}
			{/* Escape closes a hover-opened tooltip before it reaches a dialog behind it; a pinned one is not a layer. */}
			<Show when={opened() && props.forceOpen === undefined}>
				<DismissableLayer onEscapeKeyDown={dismiss} />
			</Show>
			<Show when={presence.mounted()}>
				<anchored
					side={side()}
					align="center"
					fit="flip"
					gap={props.sideOffset ?? 8}
					offset={props.forceOpen === true ? undefined : followOffset()}
					snapMargin={POPUP_MARGIN}
					onPlacement={placement.onPlacement}
					deferred
					priority={2}
					style={{ backgroundColor: color.transparent }}
				>
					<motion.div
						testId={
							props.testId === undefined ? undefined : `${props.testId}-chip`
						}
						// The chip is hoverable, like Base UI's popup: reaching it keeps the tooltip open.
						onMouseEnter={() => {
							overChip = true;
							clearTimeout(closeTimer);
						}}
						onMouseLeave={() => {
							overChip = false;
							scheduleClose();
						}}
						initial={{ opacity: 0, ...slideFrom(side()) }}
						animate={
							presence.open()
								? { opacity: 1, top: 0, left: 0 }
								: { opacity: 0, ...slideFrom(side()) }
						}
						transition={presence.open() ? tween.fast : tween.fastExit}
						onMotionComplete={() => {
							if (!presence.open()) presence.release();
						}}
						style={{
							position: 'relative',
							backgroundColor: color.foreground,
							borderRadius: shape.bg,
							paddingLeft: 8,
							paddingRight: 8,
							paddingTop: 4,
							paddingBottom: 4,
						}}
					>
						<Show
							when={typeof props.content === 'string'}
							fallback={props.content}
						>
							<text
								style={{
									...scale.caption,
									color: color.background,
									whiteSpace: 'nowrap',
								}}
							>
								{props.content as string}
							</text>
						</Show>
					</motion.div>
				</anchored>
			</Show>
		</div>
	);
}
