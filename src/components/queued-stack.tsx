import {
	AnimatePresence,
	type EventPayload,
	type HostElement,
	type HostMouseEvent,
	type MotionTransition,
	motion,
	useIsPresent,
} from "@gpuix/solid";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	onCleanup,
	Show,
} from "solid-js";
import { awaitBounds, readBounds } from "../lib/bounds";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { createPointerCapture } from "../lib/pointer-capture";
import {
	color,
	radius,
	type as scale,
	scheme,
	shadow3,
	motion as tween,
	weight,
} from "../lib/theme";
import { type FileLike, FileThumbnail } from "./file-thumbnail";
import { Tooltip } from "./tooltip";

const pencilGlyph = defineIcon(
	'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
);
const xGlyph = defineIcon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>');
const cornerDownRightGlyph = defineIcon(
	'<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
);

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
	type: "spring",
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
	glyph: typeof xGlyph;
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
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					borderRadius: radius.item,
					cursor: "pointer",
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
 *
 * gpuix has no transforms, so a card's `y` is its `bottom` offset and its
 * `scale` is the insets and height of its box; that is why a card's contents
 * stay full-size while it recedes.
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

	// ── Hover. The stack and each card report enter / leave, and a short hold
	// bridges the gap between one leaving and the next entering.
	const [overStack, setOverStack] = createSignal(false);
	let overCount = 0;
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => clearTimeout(leaveTimer));
	const hover = {
		enter() {
			overCount += 1;
			clearTimeout(leaveTimer);
			setOverStack(true);
		},
		leave() {
			overCount = Math.max(0, overCount - 1);
			if (overCount > 0) return;
			clearTimeout(leaveTimer);
			leaveTimer = setTimeout(() => {
				if (overCount === 0) setOverStack(false);
			}, 40);
		},
	};

	// ── Drag to reorder (expanded only).
	const [pointerDownId, setPointerDownId] = createSignal<string | null>(null);
	const [draggingId, setDraggingId] = createSignal<string | null>(null);
	const [dragBottom, setDragBottom] = createSignal(0);
	let dragStartY = 0;
	let stackElement: HostElement | undefined;

	const expanded = () =>
		overStack() || pointerDownId() !== null || draggingId() !== null;
	const slotBottom = (index: number) => index * (QUEUE_CARD_H + STACK_GAP);

	const stackBox = () => {
		if (stackElement === undefined) throw new Error("Stack is not mounted");
		const box = readBounds(stackElement);
		if (box === null) throw new Error("Stack has no painted bounds");
		return box;
	};

	const [stackWidth, setStackWidth] = createSignal<number>();
	createEffect(() => {
		void [count() > 0, expanded()];
		const timer = setTimeout(() => {
			if (stackElement === undefined) return;
			void awaitBounds(stackElement).then((box) => setStackWidth(box.width));
		}, 32);
		onCleanup(() => clearTimeout(timer));
	});
	const cardWidth = () => Math.max(0, (stackWidth() ?? 0) - GUTTER * 2);

	const onDragMove = (event: EventPayload) => {
		const downId = pointerDownId();
		if (downId === null) return;
		if (event.y === undefined) throw new Error("mouseMove without coordinates");
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
		const maxBottom = (queue.length - 1) * (QUEUE_CARD_H + STACK_GAP);
		setDragBottom(
			Math.max(0, Math.min(maxBottom, bottomEdge - event.y - QUEUE_CARD_H / 2)),
		);
	};
	const endDrag = () => {
		setPointerDownId(null);
		setDraggingId(null);
	};

	// ── Enqueue feedback: once the pile hits its peek cap a new message lands
	// out of sight, so the whole stack recoils on every growth.
	const [bump, setBump] = createSignal(0);
	const [bumpTransition, setBumpTransition] =
		createSignal<MotionTransition>(recoil);
	let previousCount = count();
	createEffect(() => {
		const now = count();
		const before = previousCount;
		previousCount = now;
		if (now > before && before > 0 && !expanded()) {
			setBumpTransition(tween.snap);
			setBump(RECOIL_DISTANCE);
			const timer = setTimeout(() => {
				setBumpTransition(recoil);
				setBump(0);
			}, 16);
			onCleanup(() => clearTimeout(timer));
		}
	});

	/** Cards painted back to front, the dragged one last: gpuix has no z-index, so paint order is document order. */
	const paintOrder = createMemo(() => {
		const dragged = draggingId();
		const ordered = [...props.queue].reverse();
		return dragged === null
			? ordered
			: [
					...ordered.filter((item) => item.id !== dragged),
					...ordered.filter((item) => item.id === dragged),
				];
	});

	/** `y` and `scale` of the source, as a box: translating up is `bottom`, scaling about the bottom centre is insets and height. */
	const box = (bottom: number, scaleBy: number) => {
		const inset = GUTTER + ((1 - scaleBy) * cardWidth()) / 2;
		return {
			bottom,
			left: inset,
			right: inset,
			height: QUEUE_CARD_H * scaleBy,
		};
	};

	const target = (item: QueuedMessage) => {
		const index = props.queue.indexOf(item);
		if (expanded()) {
			const dragging = draggingId() === item.id;
			return {
				opacity: 1,
				...box(
					dragging ? dragBottom() : slotBottom(index),
					dragging ? DRAG_SCALE : 1,
				),
			};
		}
		const peek = Math.min(index, STACK_MAX_PEEK);
		return {
			opacity: index <= STACK_MAX_PEEK ? 1 : 0,
			...box(peek * STACK_PEEK, 1 - peek * STACK_SCALE),
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
					onMouseEnter={hover.enter}
					onMouseLeave={hover.leave}
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: props.bottom,
					}}
				>
					{/* Recoils as a whole on enqueue: the pile is shifted up and springs back. */}
					<motion.div
						initial={false}
						animate={{ top: -bump(), bottom: bump() }}
						transition={bumpTransition()}
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							top: 0,
							bottom: 0,
						}}
					>
						<div
							style={{
								position: "absolute",
								left: 0,
								bottom: 0,
								width: GUTTER,
								height: QUEUE_CARD_H,
							}}
						>
							<Tooltip
								content={`${count()} queued message${count() === 1 ? "" : "s"}`}
								side="left"
							>
								<div
									style={{
										display: "flex",
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "flex-end",
										gap: 4,
										paddingRight: 4,
										width: GUTTER,
										height: QUEUE_CARD_H,
									}}
								>
									<AnimatePresence>
										<Show when={hiddenCount() > 0}>
											<motion.div
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={tween.fast}
											>
												<text
													style={{
														...scale.microCompact,
														lineHeight: 10,
														fontWeight: weight.semibold,
														color: color.mutedForeground,
													}}
												>
													{String(count())}
												</text>
											</motion.div>
										</Show>
									</AnimatePresence>
									<Icon
										name={cornerDownRightGlyph}
										size={16}
										strokeWidth={2}
										color={color.mutedForeground}
									/>
								</div>
							</Tooltip>
						</div>
						<AnimatePresence initial={false}>
							<For each={paintOrder()}>
								{(item) => (
									<QueueCard
										item={item}
										target={() => target(item)}
										entering={() => ({
											opacity: 0,
											...box(target(item).bottom - 14, 0.96),
										})}
										leaving={() => ({
											opacity: 0,
											...box(target(item).bottom, 0.9),
										})}
										dragging={() => draggingId() === item.id}
										expanded={expanded}
										onHoverEnter={hover.enter}
										onHoverLeave={hover.leave}
										onPress={(event) => {
											if (event.y === undefined) {
												throw new Error("mouseDown without coordinates");
											}
											dragStartY = event.y;
											setDragBottom(slotBottom(props.queue.indexOf(item)));
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
	target: () => {
		opacity: number;
		bottom: number;
		left: number;
		right: number;
		height: number;
	};
	entering: () => {
		opacity: number;
		bottom: number;
		left: number;
		right: number;
		height: number;
	};
	leaving: () => {
		opacity: number;
		bottom: number;
		left: number;
		right: number;
		height: number;
	};
	dragging: () => boolean;
	expanded: () => boolean;
	onHoverEnter: () => void;
	onHoverLeave: () => void;
	onPress: (event: HostMouseEvent) => void;
	onDragMove: (event: EventPayload) => void;
	onRelease: () => void;
	onEdit: () => void;
	onRemove: () => void;
}) {
	const [hovered, setHovered] = createSignal(false);
	const region = createPointerCapture("QueueCard");
	const present = useIsPresent();
	const files = () => props.item.files;
	const label = () =>
		props.item.text ||
		`${files().length} attachment${files().length === 1 ? "" : "s"}`;
	return (
		<motion.div
			testId={`queued-${props.item.id}`}
			initial={props.entering()}
			animate={props.target()}
			exit={props.leaving()}
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
				props.onHoverEnter();
			}}
			onMouseLeave={() => {
				setHovered(false);
				props.onHoverLeave();
			}}
			style={{
				position: "absolute",
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: files().length > 0 ? 8 : 14,
				paddingRight: 6,
				overflow: "hidden",
				borderRadius: radius.item,
				borderWidth: 1,
				borderColor: color.popupBorder,
				boxShadow: shadow3(),
				backgroundColor: color.queuedCard,
				userSelect: "none",
				cursor: props.expanded() ? "grab" : "default",
				active: { cursor: "grabbing" },
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
				onClick={(event: EventPayload) => {
					if (event.clickCount === 2) props.onEdit();
				}}
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					alignSelf: "stretch",
					flexGrow: 1,
					minWidth: 0,
				}}
			>
				<Show when={files().length > 0}>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							flexShrink: 0,
							gap: 4,
							marginRight: 8,
						}}
					>
						<For each={files().slice(0, 3)}>
							{(file) => <FileThumbnail file={file} size={28} radius={0} />}
						</For>
						<Show when={files().length > 3}>
							<div
								style={{
									width: 28,
									height: 28,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									backgroundColor: color.hover,
								}}
							>
								<text style={{ ...scale.micro, color: color.foreground }}>
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
							lineHeight: 20,
							color: color.mutedForeground,
							whiteSpace: "nowrap",
							textOverflow: "ellipsis",
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
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						flexShrink: 0,
						gap: 4,
					}}
				>
					<CardAction
						label="Edit"
						glyph={pencilGlyph}
						stroke={2}
						testId={`edit-${props.item.id}`}
						onClick={props.onEdit}
					/>
					<CardAction
						label="Remove"
						glyph={xGlyph}
						stroke={2.5}
						testId={`remove-${props.item.id}`}
						onClick={props.onRemove}
					/>
				</div>
			</Show>
		</motion.div>
	);
}
