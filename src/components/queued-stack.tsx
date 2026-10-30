import {
	AnimatePresence,
	type AnimationPlaybackControls,
	createMotionValue,
	type HostElement,
	type HostMouseEvent,
	type HostPointerEvent,
	type MotionTransition,
	motion,
	useIsPresent,
} from '@gpuix/solid';
import { createPointerCapture } from 'base-ui-solid-gpuix/utils';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import {
	color,
	nestedRadius,
	type as scale,
	shadow,
	shape,
	motion as tween,
	weight,
} from '#/lib/theme';
import { type FileLike, FileThumbnail } from './file-thumbnail';
import { Tooltip } from './tooltip';

/** A message held back while the assistant is replying: its text and a snapshot of what was attached. */
export interface QueuedMessage {
	id: string;
	text: string;
	files: FileLike[];
}

export const QUEUE_CARD_H = 44;
const STACK_PEEK = 12;
const STACK_SCALE = 0.05;
const STACK_GAP = 8;
const STACK_MAX_PEEK = 2;
/** Left and right gutters: the left one holds the queue arrow, the right one balances it. */
const GUTTER = 40;
const DRAG_THRESHOLD = 4;
const DRAG_SCALE = 1.03;
/** `spring.moderate` with `bounce: 0`, as the source overrides it. */
const settle = tween.moderate;
/** The recoil on enqueue: `{ type: "spring", duration: 0.42, bounce: 0.5 }`. */
const recoil = {
	type: 'spring',
	duration: 0.42,
	bounce: 0.5,
} satisfies MotionTransition;
const RECOIL_DISTANCE = 7;

/** Height of the collapsed pile: consumers reserve transcript padding with it. */
export function collapsedStackHeight(count: number) {
	return (
		QUEUE_CARD_H + Math.min(Math.max(count - 1, 0), STACK_MAX_PEEK) * STACK_PEEK
	);
}

function expandedStackHeight(count: number) {
	return count * QUEUE_CARD_H + Math.max(count - 1, 0) * STACK_GAP;
}

function CardAction(props: {
	label: string;
	glyph: IconRef;
	stroke: number;
	testId?: string;
	onClick: () => void;
}) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<Tooltip content={props.label} side="top">
			<div
				role="button"
				aria-label={props.label}
				testId={props.testId}
				onClick={props.onClick}
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					width: 32,
					height: 32,
					flexShrink: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					borderRadius: shape.button,
					cursor: 'pointer',
					hover: { backgroundColor: color.hover },
				}}
			>
				<Icon
					name={props.glyph}
					size={14}
					strokeWidth={props.stroke}
					color={hovered() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</Tooltip>
	);
}

/**
 * Sonner-style stack of queued messages. Collapsed, the cards fan back behind
 * the front one; hovering fans them out, and while expanded a card can be
 * dragged to reorder. The pencil (or a double click) takes a card back to the
 * composer, and the cross removes it.
 */
export function QueuedStack(props: {
	queue: QueuedMessage[];
	onQueueChange: (queue: QueuedMessage[]) => void;
	onEdit: (item: QueuedMessage) => void;
	onRemove: (item: QueuedMessage) => void;
	/** Distance from the container's bottom edge, usually the composer's height plus 8. */
	bottom: number;
	testId?: string;
}) {
	const count = () => props.queue.length;
	const hiddenCount = () => Math.max(0, count() - (STACK_MAX_PEEK + 1));

	const [overStack, setOverStack] = createSignal(false);

	// ── Drag to reorder (expanded only).
	const [pointerDownId, setPointerDownId] = createSignal<string | null>(null);
	const [draggingId, setDraggingId] = createSignal<string | null>(null);
	const [dragY, setDragY] = createSignal(0);
	let dragStartY = 0;
	let stackElement: HostElement | undefined;

	const expanded = () =>
		overStack() || pointerDownId() !== null || draggingId() !== null;
	const slotY = (index: number) => -index * (QUEUE_CARD_H + STACK_GAP);

	const stackBox = () => {
		if (stackElement === undefined || !stackElement.mounted) {
			throw new Error('Stack is not mounted');
		}
		return stackElement.getBoundingClientRect();
	};

	const onDragMove = (event: HostMouseEvent) => {
		const downId = pointerDownId();
		if (downId === null) return;
		if (event.y === undefined) throw new Error('mouseMove without coordinates');
		if (draggingId() === null) {
			if (Math.abs(event.y - dragStartY) < DRAG_THRESHOLD) return;
			setDraggingId(downId);
		}
		const box = stackBox();
		const bottomEdge = box.y + box.height;
		const queue = props.queue;
		const slot = Math.max(
			0,
			Math.min(
				queue.length - 1,
				Math.floor((bottomEdge - event.y) / (QUEUE_CARD_H + STACK_GAP)),
			),
		);
		const current = queue.findIndex((item) => item.id === downId);
		if (current !== -1 && current !== slot) {
			const next = [...queue];
			const [moved] = next.splice(current, 1);
			next.splice(slot, 0, moved);
			props.onQueueChange(next);
		}
		const minY = -(queue.length - 1) * (QUEUE_CARD_H + STACK_GAP);
		setDragY(
			Math.max(minY, Math.min(0, event.y - bottomEdge + QUEUE_CARD_H / 2)),
		);
	};
	const endDrag = () => {
		setPointerDownId(null);
		setDraggingId(null);
	};

	// ── Enqueue feedback: once the pile hits its peek cap a new message lands
	// out of sight, so the whole stack recoils on every growth.
	const bumpY = createMotionValue(0);
	let recoilControls: AnimationPlaybackControls | undefined;
	onCleanup(() => recoilControls?.stop());
	let previousCount = count();
	createEffect(() => {
		const now = count();
		const before = previousCount;
		previousCount = now;
		if (now > before && before > 0 && !expanded()) {
			recoilControls?.stop();
			bumpY.jump(-RECOIL_DISTANCE);
			recoilControls = bumpY.animate(0, recoil);
		}
	});

	const target = (item: QueuedMessage) => {
		const index = props.queue.indexOf(item);
		if (expanded()) {
			const dragging = draggingId() === item.id;
			return {
				opacity: 1,
				y: dragging ? dragY() : slotY(index),
				scale: dragging ? DRAG_SCALE : 1,
			};
		}
		const peek = Math.min(index, STACK_MAX_PEEK);
		return {
			opacity: index <= STACK_MAX_PEEK ? 1 : 0,
			y: -peek * STACK_PEEK,
			scale: 1 - peek * STACK_SCALE,
		};
	};

	return (
		<AnimatePresence>
			<Show when={count() > 0}>
				<motion.div
					testId={props.testId}
					ref={(element: HostElement) => {
						stackElement = element;
					}}
					initial={{ opacity: 0 }}
					animate={{
						opacity: 1,
						height: expanded()
							? expandedStackHeight(count())
							: collapsedStackHeight(count()),
					}}
					exit={{ opacity: 0 }}
					transition={settle}
					onMouseEnter={() => setOverStack(true)}
					onMouseLeave={() => setOverStack(false)}
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						bottom: props.bottom,
					}}
				>
					{/* Recoils as a whole on enqueue: the pile is shifted up and springs back. */}
					<motion.div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 0,
							bottom: 0,
							y: bumpY,
						}}
					>
						<div
							style={{
								position: 'absolute',
								left: 0,
								bottom: 0,
								width: GUTTER,
								height: QUEUE_CARD_H,
							}}
						>
							<Tooltip
								content={`${count()} queued message${count() === 1 ? '' : 's'}`}
								side="left"
							>
								<div
									style={{
										display: 'flex',
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'flex-end',
										gap: 4,
										paddingRight: 4,
										width: GUTTER,
										height: QUEUE_CARD_H,
									}}
								>
									<AnimatePresence>
										<Show when={hiddenCount() > 0}>
											<motion.div
												initial={{ opacity: 0, scale: 0.6 }}
												animate={{ opacity: 1, scale: 1 }}
												exit={{ opacity: 0, scale: 0.6 }}
												transition={tween.fast}
											>
												<text
													style={{
														...scale.microCompact,
														lineHeight: '10px',
														fontVariationSettings: weight.semibold,
														color: color.mutedForeground,
														fontVariantNumeric: 'tabular-nums',
													}}
												>
													{String(count())}
												</text>
											</motion.div>
										</Show>
									</AnimatePresence>
									<Icon
										name="corner-down-right"
										size={16}
										strokeWidth={2}
										color={color.mutedForeground}
									/>
								</div>
							</Tooltip>
						</div>
						<AnimatePresence initial={false}>
							<For each={props.queue}>
								{(item, index) => (
									<QueueCard
										item={item}
										index={index}
										target={() => target(item)}
										dragging={() => draggingId() === item.id}
										expanded={expanded}
										onPress={(event) => {
											if (event.y === undefined) {
												throw new Error('mouseDown without coordinates');
											}
											dragStartY = event.y;
											setDragY(slotY(props.queue.indexOf(item)));
											setPointerDownId(item.id);
										}}
										onDragMove={onDragMove}
										onRelease={endDrag}
										onEdit={() => props.onEdit(item)}
										onRemove={() => props.onRemove(item)}
									/>
								)}
							</For>
						</AnimatePresence>
					</motion.div>
				</motion.div>
			</Show>
		</AnimatePresence>
	);
}

function QueueCard(props: {
	item: QueuedMessage;
	index: () => number;
	target: () => { opacity: number; y: number; scale: number };
	dragging: () => boolean;
	expanded: () => boolean;
	onPress: (event: HostMouseEvent) => void;
	onDragMove: (event: HostMouseEvent) => void;
	onRelease: () => void;
	onEdit: () => void;
	onRemove: () => void;
}) {
	const [hovered, setHovered] = createSignal(false);
	const region = createPointerCapture('QueueCard');
	const present = useIsPresent();
	const files = () => props.item.files;
	const label = () =>
		props.item.text ||
		`${files().length} attachment${files().length === 1 ? '' : 's'}`;
	return (
		<motion.div
			testId={`queued-${props.item.id}`}
			initial={{ opacity: 0, y: 14, scale: 0.96 }}
			animate={props.target()}
			exit={{ opacity: 0, scale: 0.9 }}
			transition={
				props.dragging()
					? tween.snap
					: present()
						? settle
						: // The source's exit is a plain 0.12s tween.
							tween.moderateExit
			}
			onMouseEnter={() => {
				setHovered(true);
			}}
			onMouseLeave={() => {
				setHovered(false);
			}}
			style={{
				position: 'absolute',
				bottom: 0,
				left: GUTTER,
				right: GUTTER,
				height: QUEUE_CARD_H,
				transformOrigin: 'bottom center',
				zIndex: props.dragging() ? 200 : 100 - props.index(),
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				paddingLeft: files().length > 0 ? 8 : 14,
				paddingRight: 6,
				// No `overflow: hidden`, as in the source: a clip inside a transformed box makes gpuix drop the text of a card moved far up the pile.
				borderRadius: shape.bg,
				boxShadow: shadow(3),
				backgroundColor: color.queuedCard,
				userSelect: 'none',
				cursor: props.expanded() ? 'grab' : 'default',
				active: { cursor: 'grabbing' },
			}}
		>
			{/*
				The press, drag and double click live on this region, not on the card,
				so a press on the buttons beside it does not start a drag.
			*/}
			<div
				ref={region.ref}
				onMouseDown={(event) => {
					if (!props.expanded() || event.button !== 0) return;
					region.capture(event);
					props.onPress(event);
				}}
				onMouseMove={props.onDragMove}
				onMouseUp={props.onRelease}
				onLostPointerCapture={props.onRelease}
				onClick={(event: HostPointerEvent) => {
					if (event.clickCount === 2) props.onEdit();
				}}
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					alignSelf: 'stretch',
					flexGrow: 1,
					minWidth: 0,
				}}
			>
				<Show when={files().length > 0}>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							flexShrink: 0,
							gap: 4,
							marginRight: 8,
						}}
					>
						<For each={files().slice(0, 3)}>
							{(file) => (
								<FileThumbnail
									file={file}
									size={28}
									radius={nestedRadius(shape.bg, 8)}
								/>
							)}
						</For>
						<Show when={files().length > 3}>
							<div
								style={{
									width: 28,
									height: 28,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									backgroundColor: color.hover,
								}}
							>
								<text
									style={{
										...scale.micro,
										color: color.foreground,
										fontVariantNumeric: 'tabular-nums',
									}}
								>
									{`+${files().length - 3}`}
								</text>
							</div>
						</Show>
					</div>
				</Show>
				<div style={{ flexGrow: 1, minWidth: 0 }}>
					<text
						style={{
							fontSize: 14,
							lineHeight: '20px',
							color: color.mutedForeground,
							whiteSpace: 'nowrap',
							textOverflow: 'ellipsis',
						}}
					>
						{label()}
					</text>
				</div>
			</div>
			{/* Out of layout until the card is hovered, so the text has the full width meanwhile. */}
			<Show when={hovered()}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						flexShrink: 0,
						gap: 4,
					}}
				>
					<CardAction
						label="Edit"
						glyph="pencil"
						stroke={2}
						testId={`edit-${props.item.id}`}
						onClick={props.onEdit}
					/>
					<CardAction
						label="Remove"
						glyph="x"
						stroke={2.5}
						testId={`remove-${props.item.id}`}
						onClick={props.onRemove}
					/>
				</div>
			</Show>
		</motion.div>
	);
}
