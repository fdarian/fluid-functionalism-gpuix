import {
	createMotionValue,
	DismissableLayer,
	type HostElement,
	type HostMouseEvent,
	motion,
} from '@ghia/solid';
import {
	createPlacementState,
	POPUP_MARGIN,
} from 'base-ui-solid-gpuix/internals';
import {
	createTooltipPopup,
	createTooltipProvider,
	createTooltipRoot,
	createTooltipTrigger,
	TooltipProviderContext,
	useTooltipProvider,
} from 'base-ui-solid-gpuix/tooltip';
import { createEffect, type JSX, Show } from 'solid-js';
import { POPUP_EXIT_FALLBACK_MS } from '#/lib/popup-timing';
import {
	capTrim,
	color,
	type as scale,
	shape,
	motion as tween,
} from '#/lib/theme';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

const DEFAULT_DELAY = 200;
const SLIDE = 4;
/** A bare tooltip's own group lasts as long as Base UI's provider default. */
const BARE_SKIP_DELAY = 400;

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
	const group = createTooltipProvider({
		delay: () => props.delayDuration ?? DEFAULT_DELAY,
		skipDelay: () => props.skipDelayDuration ?? 300,
	});
	return (
		<TooltipProviderContext.Provider value={group}>
			{props.children}
		</TooltipProviderContext.Provider>
	);
}

/** Where the chip starts, relative to where it rests: it slides in from the trigger's side. */
function slideFrom(side: TooltipSide) {
	switch (side) {
		case 'top':
			return { x: 0, y: SLIDE };
		case 'bottom':
			return { x: 0, y: -SLIDE };
		case 'left':
			return { x: SLIDE, y: 0 };
		case 'right':
			return { x: -SLIDE, y: 0 };
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
	const ambient = useTooltipProvider();
	const group =
		ambient ??
		createTooltipProvider({
			delay: () => DEFAULT_DELAY,
			skipDelay: () => BARE_SKIP_DELAY,
		});
	const placement = createPlacementState(props.side ?? 'top');
	const side = () => props.side ?? 'top';

	const root = createTooltipRoot(
		{
			get delayDuration() {
				return props.delayDuration;
			},
			get open() {
				return props.forceOpen;
			},
			get onOpenChange() {
				return props.onOpenChange;
			},
		},
		{ group, exitMs: POPUP_EXIT_FALLBACK_MS },
	);
	const presence = root.presence;
	const trigger = createTooltipTrigger(root, { side: placement.side });
	const popup = createTooltipPopup(trigger);
	// The cursor's offset from the trigger's centre, on the box around the chip so it does not fight the chip's own slide.
	const followOffset = createMotionValue(0);
	// A force-opened tooltip has no cursor to follow: it rests centred until a real pointer takes over.
	createEffect(() => {
		if (props.forceOpen === true && props.followCursor !== undefined) {
			followOffset.set(0);
		}
	});
	let wrapper: HostElement | undefined;

	const followPointer = (event: HostMouseEvent) => {
		if (props.followCursor === undefined) return;
		if (wrapper === undefined) throw new Error('Tooltip is not mounted');
		const bounds = wrapper.getBoundingClientRect();
		if (event.x === undefined || event.y === undefined) return;
		followOffset.set(
			props.followCursor === 'x'
				? event.x - (bounds.x + bounds.width / 2)
				: event.y - (bounds.y + bounds.height / 2),
		);
	};

	const onMouseMove = (event: HostMouseEvent) => {
		followPointer(event);
		trigger.onMouseMove(event);
	};

	return (
		<div
			ref={(element) => {
				wrapper = element;
				trigger.setTriggerElement(element);
			}}
			testId={props.testId}
			onMouseEnter={trigger.onMouseEnter}
			onMouseMove={onMouseMove}
			onMouseLeave={trigger.onMouseLeave}
			onMouseDown={trigger.onMouseDown}
			onFocusIn={trigger.onFocusIn}
			onFocusOut={trigger.onFocusOut}
			style={{ position: 'relative', display: 'flex', flexShrink: 0 }}
		>
			{props.children}
			{/* Escape closes a hover-opened tooltip before it reaches a dialog behind it; a pinned one is not a layer. */}
			<Show when={root.opened() && props.forceOpen === undefined}>
				<DismissableLayer onEscapeKeyDown={trigger.dismiss} />
			</Show>
			<Show when={presence.mounted()}>
				<anchored
					side={side()}
					align="center"
					fit="flip"
					gap={props.sideOffset ?? 8}
					snapMargin={POPUP_MARGIN}
					onPlacement={placement.onPlacement}
					deferred
					priority={2}
					style={{ backgroundColor: color.transparent }}
				>
					<motion.div
						style={
							props.followCursor === 'x'
								? { x: followOffset }
								: props.followCursor === 'y'
									? { y: followOffset }
									: {}
						}
					>
						<motion.div
							testId={
								props.testId === undefined ? undefined : `${props.testId}-chip`
							}
							// The chip is hoverable, like Base UI's popup: reaching it keeps the tooltip open.
							ref={popup.ref}
							{...popup.props}
							initial={{ opacity: 0, ...slideFrom(side()) }}
							animate={
								presence.open()
									? { opacity: 1, x: 0, y: 0 }
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
								paddingTop: 8,
								paddingBottom: 8,
								textBox: capTrim,
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
					</motion.div>
				</anchored>
			</Show>
		</div>
	);
}
