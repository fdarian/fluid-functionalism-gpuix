import {
	createReducedMotion,
	type DomEvent,
	type HostElement,
	type HostMouseMoveEvent,
	type KeyEvent,
	motion,
	ResizeObserver,
} from '@gpuix/solid';
import {
	type AccordionItem as AccordionItemPrimitive,
	type AccordionRoot,
	createAccordionItem,
	createAccordionPanel,
	createAccordionRoot,
	createAccordionTrigger,
} from 'base-ui-solid-gpuix/accordion';
import { createCompositeRoot } from 'base-ui-solid-gpuix/internals/composite';
import {
	createContext,
	createEffect,
	createSignal,
	For,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import {
	createFluidHover,
	type FluidHover,
	type ItemRect,
} from '#/lib/fluid-hover';
import {
	createFocusRing,
	FocusRing,
	type FocusRingState,
} from '#/lib/focus-ring';
import { Icon } from '#/lib/icon';
import { createMeasuredHeight } from '#/lib/measured-height';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	focusRing,
	type as scale,
	shape,
	sizeChoice,
	motion as tween,
} from '#/lib/theme';

export type AccordionSize = 'default' | 'compact';
export type AccordionHighlight = 'trigger' | 'item';

const sizes = {
	default: {
		padX: 12,
		padY: 8,
		gap: 8,
		text: scale.body,
		icon: 16,
		contentBottom: 12,
	},
	compact: {
		padX: 10,
		padY: 4,
		gap: 4,
		text: scale.bodyCompact,
		icon: 14,
		contentBottom: 10,
	},
} as const;

// ─── State ───────────────────────────────────────────────────────────────────

interface RootState {
	accordion: AccordionRoot;
	highlight: () => AccordionHighlight;
	size: () => AccordionSize;
}

interface GroupScope {
	hover: FluidHover;
	focusRing: FocusRingState;
	registerTrigger: (
		element: HostElement,
		entry: { value: string; disabled: () => boolean },
	) => number;
	/** The item's box, for the open tint the group paints under its hover fill. */
	registerItem: (element: HostElement, entry: TintEntry) => void;
	/** The pointer is on a row whose item is closed: open tints dim to let it read. */
	hoveringClosedRow: () => boolean;
	overContent: (index: number | null) => void;
	focusRow: (index: number, event: DomEvent) => void;
	blurRow: (index: number, event: DomEvent) => void;
	onKeyDown: (index: number, event: KeyEvent) => void;
}

interface TintEntry {
	id: number;
	isOpen: () => boolean;
	/** The trigger's index in the hover; undefined until it registers. */
	index: () => number | undefined;
}

const RootContext = createContext<RootState>();
const GroupContext = createContext<GroupScope>();

interface ItemState {
	accordion: AccordionItemPrimitive;
	value: string;
	disabled: () => boolean;
	isOpen: () => boolean;
	/** Set once the trigger registers with a group. */
	index: () => number | undefined;
	setIndex: (index: number) => void;
	highlight: () => AccordionHighlight;
}
const ItemContext = createContext<ItemState>();

function useRoot() {
	const root = useContext(RootContext);
	if (root === undefined) throw new Error('Must be used inside an Accordion');
	return root;
}
function useItem() {
	const item = useContext(ItemContext);
	if (item === undefined)
		throw new Error('Must be used inside an AccordionItem');
	return item;
}

type ValueProps =
	| {
			type?: 'single';
			value?: string;
			defaultValue?: string;
			onValueChange?: (value: string) => void;
	  }
	| {
			type: 'multiple';
			value?: string[];
			defaultValue?: string[];
			onValueChange?: (value: string[]) => void;
	  };

function createRootState(
	props: ValueProps & { size?: AccordionSize; highlight?: AccordionHighlight },
): RootState {
	const toList = (value: string | string[] | undefined): string[] => {
		if (value === undefined || value === '') return [];
		return typeof value === 'string' ? [value] : value;
	};

	return {
		accordion: createAccordionRoot({
			value() {
				if (props.value !== undefined) return toList(props.value);
				// An `onValueChange` without a `value` never updates the open items: the callback is all that runs.
				if (props.onValueChange !== undefined)
					return toList(props.defaultValue);
				return undefined;
			},
			defaultValue: toList(props.defaultValue),
			multiple: () => props.type === 'multiple',
			onValueChange(next) {
				if (props.onValueChange === undefined) return;
				if (props.type === 'multiple') props.onValueChange(next);
				else props.onValueChange(next.length === 0 ? '' : next[0]);
			},
		}),
		highlight: () => props.highlight ?? 'item',
		size: () => props.size ?? sizeChoice(),
	};
}

// ─── Roots ───────────────────────────────────────────────────────────────────

type RootProps = ValueProps & {
	size?: AccordionSize;
	highlight?: AccordionHighlight;
	testId?: string;
	children: JSX.Element;
};

export function AccordionGroup(props: RootProps) {
	const root = createRootState(props);
	const composite = createCompositeRoot({
		orientation: 'vertical',
		consumeSelfTarget: true,
	});
	const triggerValues = new Map<number, string>();
	let nextIndex = 0;
	let contentOver: number | null = null;

	const hover = createFluidHover();
	const focusRing = createFocusRing(hover);
	let mouseInside = false;

	let container: HostElement | undefined;
	const tintElements = new Map<number, HostElement>();
	const [tints, setTints] = createSignal<readonly TintEntry[]>([]);
	const [itemRects, setItemRects] = createSignal<ReadonlyMap<number, ItemRect>>(
		new Map(),
	);
	const measureItems = () => {
		if (container === undefined || !container.mounted) return;
		const box = container.getBoundingClientRect();
		const next = new Map<number, ItemRect>();
		for (const [id, element] of tintElements) {
			if (!element.mounted) continue;
			const bounds = element.getBoundingClientRect();
			next.set(id, {
				top: bounds.y - box.y,
				left: bounds.x - box.x,
				width: bounds.width,
				height: bounds.height,
			});
		}
		setItemRects(next);
	};
	const itemObserver = new ResizeObserver(measureItems);
	onCleanup(() => itemObserver.disconnect());

	const scope: GroupScope = {
		hover,
		focusRing,
		registerItem(element, entry) {
			tintElements.set(entry.id, element);
			setTints([...tints(), entry]);
			itemObserver.observe(element, { box: 'border-box' });
			measureItems();
			onCleanup(() => {
				tintElements.delete(entry.id);
				itemObserver.unobserve(element);
				setTints(tints().filter((candidate) => candidate !== entry));
			});
		},
		hoveringClosedRow() {
			const active = hover.activeIndex();
			if (active === null) return false;
			const value = triggerValues.get(active);
			return value !== undefined && !root.accordion.isOpen(value);
		},
		registerTrigger(element, entry) {
			const index = nextIndex++;
			const unregister = composite.register(index, element, {
				disabled: entry.disabled,
			});
			triggerValues.set(index, entry.value);
			hover.registerItem(index, element);
			onCleanup(() => {
				unregister();
				triggerValues.delete(index);
			});
			return index;
		},
		focusRow(index, event) {
			hover.setActiveIndex(index);
			focusRing.focus(index, event);
		},
		blurRow(index, event) {
			focusRing.blur(index);
			if (composite.isItem(event.relatedTarget)) return;
			if (!mouseInside) hover.setActiveIndex(null);
		},
		overContent(index) {
			contentOver = index;
			if (index !== null) hover.setActiveIndex(null);
		},
		onKeyDown: composite.onKeyDown,
	};

	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<RootContext.Provider value={root}>
			<GroupContext.Provider value={scope}>
				<div
					testId={props.testId}
					{...hover.containerProps}
					ref={(element: HostElement) => {
						container = element;
						hover.containerRef(element);
					}}
					onMouseEnter={() => {
						mouseInside = true;
						hover.handlers.onMouseEnter();
					}}
					onMouseMove={(event: HostMouseMoveEvent) => {
						// The pointer over an open panel belongs to no row.
						if (contentOver !== null) return;
						hover.handlers.onMouseMove(event);
					}}
					onMouseLeave={() => {
						mouseInside = false;
						contentOver = null;
						hover.handlers.onMouseLeave();
					}}
					style={{
						position: 'relative',
						display: 'flex',
						flexDirection: 'column',
						width: 288,
						maxWidth: '100%',
					}}
				>
					<For each={tints()}>
						{(entry) => (
							<GroupTint
								rect={() => {
									if (root.highlight() === 'item')
										return itemRects().get(entry.id);
									const own = entry.index();
									return own === undefined ? undefined : hover.rects()[own];
								}}
								opacity={() => {
									if (!entry.isOpen()) return 0;
									if (root.highlight() === 'item') {
										return scope.hoveringClosedRow() ? 0.7 : 1;
									}
									return hover.activeIndex() === entry.index() ? 1 : 0;
								}}
							/>
						)}
					</For>
					<FluidHighlight
						rect={hoverRect}
						session={hover.session}
						radius={shape.bg}
						background={color.hover}
					/>
					<FocusRing
						ring={focusRing}
						radius={shape.focusRing}
						testId={props.testId && `${props.testId}-focus-ring`}
					/>
					{props.children}
				</div>
			</GroupContext.Provider>
		</RootContext.Provider>
	);
}

export function Accordion(props: RootProps) {
	const root = createRootState(props);
	return (
		<RootContext.Provider value={root}>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					width: 288,
					maxWidth: '100%',
				}}
			>
				{props.children}
			</div>
		</RootContext.Provider>
	);
}

// ─── Item ────────────────────────────────────────────────────────────────────

let nextTintId = 0;

/** A grouped open tint: it hugs its rect without gliding (a panel resizing under it moves the box every frame) and only its opacity eases. */
function GroupTint(props: {
	rect: () => ItemRect | undefined;
	opacity: () => number;
}) {
	return (
		<Show when={props.rect()}>
			{(rect: () => ItemRect) => (
				<motion.div
					initial={false}
					animate={{
						top: rect().top,
						left: rect().left,
						width: rect().width,
						height: rect().height,
						opacity: props.opacity(),
					}}
					transition={{
						top: tween.snap,
						left: tween.snap,
						width: tween.snap,
						height: tween.snap,
						opacity: tween.moderateExit,
					}}
					style={{
						position: 'absolute',
						borderRadius: shape.bg,
						backgroundColor: color.accentWash,
						// Removing this lights the row under the pointer after a single-expand click moves the rows, though the pointer is over the open panel, which belongs to no row.
						pointerEvents: 'none',
					}}
				/>
			)}
		</Show>
	);
}

export function AccordionItem(props: {
	value: string;
	disabled?: boolean;
	/** Standalone only: a group decides for all its rows. */
	highlight?: AccordionHighlight;
	children: JSX.Element;
}) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const [index, setIndex] = createSignal<number>();
	const highlight = () =>
		group === undefined
			? (props.highlight ?? root.highlight())
			: root.highlight();
	const accordion = createAccordionItem(root.accordion, {
		value: () => props.value,
		disabled: () => props.disabled === true,
	});
	const item: ItemState = {
		accordion,
		highlight,
		value: props.value,
		disabled: accordion.disabled,
		isOpen: accordion.open,
		index,
		setIndex,
	};
	const tint: TintEntry = {
		id: nextTintId++,
		isOpen: item.isOpen,
		index,
	};

	return (
		<ItemContext.Provider value={item}>
			<div
				ref={(element: HostElement) => {
					// Grouped tints are drawn by AccordionGroup, under its hover fill.
					group?.registerItem(element, tint);
				}}
				style={{
					position: 'relative',
					zIndex: 10,
					display: 'flex',
					flexDirection: 'column',
					flexShrink: 0,
				}}
			>
				{/* A standalone item's tint sits under the trigger and panel, fading with the open state. */}
				<Show when={group === undefined}>
					<motion.div
						initial={false}
						animate={{
							opacity: item.highlight() === 'item' && item.isOpen() ? 1 : 0,
						}}
						transition={tween.moderateExit}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							borderRadius: shape.bg,
							backgroundColor: color.accentWash,
							pointerEvents: 'none',
						}}
					/>
				</Show>
				{props.children}
			</div>
		</ItemContext.Provider>
	);
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

export function AccordionTrigger(props: { children: string; testId?: string }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const [standaloneHovered, setStandaloneHovered] = createSignal(false);
	let triggerElement: HostElement | undefined;

	createEffect(() => {
		if (group === undefined) return;
		if (triggerElement === undefined) throw new Error('Trigger is not mounted');
		const element = triggerElement;
		item.setIndex(
			group.registerTrigger(element, {
				value: item.value,
				disabled: item.disabled,
			}),
		);
	});

	const hovered = () => {
		if (group === undefined) return standaloneHovered();
		const own = item.index();
		return own !== undefined && group.hover.activeIndex() === own;
	};
	const lit = () => item.isOpen() || hovered();

	const trigger = createAccordionTrigger(item.accordion, {
		onKeyDown(event) {
			const own = item.index();
			if (group === undefined || own === undefined) return;
			group.onKeyDown(own, event);
		},
	});

	return (
		<div
			onMouseEnter={() => setStandaloneHovered(true)}
			onMouseLeave={() => setStandaloneHovered(false)}
			style={{ position: 'relative', flexShrink: 0 }}
		>
			{/* Standalone rows carry their own highlights; a group's tints and shared highlight are drawn by AccordionGroup. */}
			<Show when={group === undefined}>
				<motion.div
					initial={false}
					animate={{
						opacity:
							item.highlight() === 'trigger' && item.isOpen() && hovered()
								? 1
								: 0,
					}}
					transition={tween.moderateExit}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						borderRadius: shape.bg,
						backgroundColor: color.accentWash,
					}}
				/>
			</Show>
			<motion.div
				initial={false}
				animate={{
					opacity: group === undefined && hovered() ? 1 : 0,
				}}
				transition={tween.fastExit}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: shape.bg,
					backgroundColor: color.hover,
				}}
			/>
			<div
				ref={(element) => {
					triggerElement = element;
				}}
				{...trigger.props}
				onFocus={(event: DomEvent) => {
					const own = item.index();
					if (own !== undefined) group?.focusRow(own, event);
				}}
				onBlur={(event: DomEvent) => {
					const own = item.index();
					if (own !== undefined) group?.blurRow(own, event);
				}}
				testId={props.testId}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: metrics().gap,
					paddingLeft: metrics().padX,
					paddingRight: metrics().padX,
					paddingTop: metrics().padY,
					paddingBottom: metrics().padY,
					width: '100%',
					borderRadius: shape.item,
					cursor: 'pointer',
					userSelect: 'none',
					keyboardFocusDim: false,
					// A group's one shared ring is drawn by AccordionGroup.
					...(group === undefined ? { focusVisible: focusRing(0) } : {}),
				}}
			>
				<StableLabel
					text={props.children}
					heavy={item.isOpen()}
					color={lit() ? color.foreground : color.mutedForeground}
					textStyle={metrics().text}
					grow
					fade
				/>
				<Icon
					name={item.isOpen() ? 'chevron-down' : 'chevron-right'}
					size={metrics().icon}
					strokeWidth={lit() ? 2 : 1.5}
					easeStroke
					fade
					color={lit() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</div>
	);
}

// ─── Content ─────────────────────────────────────────────────────────────────

/**
 * The panel's height springs between 0 and the measured content height: gpuix
 * cannot animate `height: auto`, so the inner box reports its size through
 * `onLayout` and the outer box tweens to it.
 */
export function AccordionContent(props: { children: JSX.Element }) {
	const root = useRoot();
	const group = useContext(GroupContext);
	const item = useItem();
	const metrics = () => sizes[root.size()];
	const measured = createMeasuredHeight();
	const contentHeight = measured.height;
	const reduced = createReducedMotion();
	const panel = createAccordionPanel(item.accordion);

	return (
		<motion.div
			{...panel.props}
			initial={false}
			animate={{ height: item.isOpen() ? (contentHeight() ?? 0) : 0 }}
			transition={
				reduced() ? tween.snap : item.isOpen() ? tween.fast : tween.fastExit
			}
			onMotionComplete={panel.onExitComplete}
			onMouseEnter={() => {
				const own = item.index();
				if (group !== undefined && own !== undefined && item.isOpen())
					group.overContent(own);
			}}
			onMouseLeave={() => group?.overContent(null)}
			style={{
				display: 'flex',
				flexDirection: 'column',
				overflow: 'hidden',
				// Until the content is measured an open panel keeps its natural height.
				...(contentHeight() === undefined && item.isOpen()
					? { height: 'auto' }
					: {}),
			}}
		>
			<motion.div
				initial={false}
				animate={{ opacity: item.isOpen() ? 1 : 0 }}
				transition={
					reduced()
						? tween.snap
						: item.isOpen()
							? { duration: 0.06 }
							: { duration: 0.04 }
				}
			>
				<Show when={!panel.retired()}>
					<div
						onLayout={(event: DomEvent) => {
							measured.onLayout(event);
							panel.onContentLayout();
						}}
						style={{
							display: 'flex',
							flexDirection: 'column',
							flexShrink: 0,
							paddingTop: 4,
							paddingLeft: metrics().padX,
							paddingRight: metrics().padX,
							paddingBottom: metrics().contentBottom,
						}}
					>
						<text style={{ ...metrics().text, color: color.mutedForeground }}>
							{props.children}
						</text>
					</div>
				</Show>
			</motion.div>
		</motion.div>
	);
}
