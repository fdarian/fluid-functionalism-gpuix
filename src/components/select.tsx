import {
	type DomEvent,
	document,
	type HostElement,
	type HostMouseEvent,
	type HostMouseMoveEvent,
	type KeyEvent,
} from '@gpuix/solid';
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
} from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover, useHoverItem } from '#/lib/fluid-hover';
import { createFocusRing, FocusRing } from '#/lib/focus-ring';
import { FormValue } from '#/lib/form-value';
import { CheckMark, Icon, LIST_CHECK } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { edgeIndex, isChord, moveIndex, revealRow } from '#/lib/list-nav';
import { PopupSurface } from '#/lib/popup';
import { refocusAfterPress } from '#/lib/popup-trigger';
import { createPresence, POPUP_EXIT_FALLBACK_MS } from '#/lib/presence';
import {
	color,
	colorFade,
	focusRing,
	radius,
	type as scale,
	shape,
	sizeChoice,
	motion as tween,
	withAlpha,
} from '#/lib/theme';
import { createTypeahead } from '#/lib/typeahead';

/** How long a pick holds the popup open so the check and the checked background are seen arriving. */
const ACK_MS = 300;
/** Base UI `SELECTED_DELAY`: a release over a row commits only after the popup has been open this long, or after a drag. */
const PRESS_DRAG_MS = 400;
/** Base UI: a drag of 8px over the rows enables the release commit early. */
const PRESS_DRAG_PX = 8;
/** Base UI's gate for the row focus ring (`POPUP_NAV_KEYS`): these keys inside the popup earn it, typeahead letters do not. */
const NAV_KEYS = [
	'ArrowDown',
	'ArrowUp',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
];
const POPUP_MAX_HEIGHT = 300;
const POPUP_PADDING = 4;

export interface SelectItem<Value extends string> {
	value: Value;
	label: string;
	icon?: IconRef;
	disabled?: boolean;
}

export type SelectEntry<Value extends string> =
	| SelectItem<Value>
	| { type: 'label'; label: string }
	| { type: 'separator' };

/**
 * `inline` is the borderless, always-compact select of the "Make them yours"
 * card: it shows the picked item's icon and its popup opens against the
 * trigger's right edge. `bordered` and `borderless` are the docs' variants.
 */
export type SelectVariant = 'bordered' | 'borderless' | 'inline';
export type SelectSize = 'default' | 'compact';

interface Spec {
	/** Trigger and popup rows share this height. */
	height: number;
	text: typeof scale.body | typeof scale.bodyCompact;
	icon: number;
	padX: number;
	gap: number;
	minWidth: number;
	itemPadX: number;
	itemGap: number;
}

const specs: Record<SelectSize, Spec> = {
	default: {
		height: 36,
		text: scale.body,
		icon: 16,
		padX: 12,
		gap: 8,
		minWidth: 160,
		itemPadX: 8,
		itemGap: 8,
	},
	compact: {
		height: 28,
		text: scale.bodyCompact,
		icon: 14,
		padX: 10,
		gap: 4,
		minWidth: 128,
		itemPadX: 6,
		itemGap: 4,
	},
};

const LABEL_HEIGHT = 28;

/** `border-destructive/50`. */
const destructiveHalf = () => withAlpha(color.destructive, 0.5);
/** `bg-border/60`. */
const separatorColor = () => color.borderFaint;

function isItem<Value extends string>(
	entry: SelectEntry<Value>,
): entry is SelectItem<Value> {
	return 'value' in entry;
}

type Slot<Value extends string> =
	| { kind: 'item'; row: SelectItem<Value>; index: number }
	| { kind: 'label'; label: string }
	| { kind: 'separator' };

export function Select<Value extends string>(props: {
	items: readonly SelectEntry<Value>[];
	/** Controlled value. Omitted, the select keeps its own, starting at `defaultValue`. */
	value?: Value | null;
	defaultValue?: Value | null;
	onValueChange?: (value: Value) => void;
	testId?: string;
	variant?: SelectVariant;
	size?: SelectSize;
	placeholder?: string;
	/** Leading trigger icon. The inline variant shows the picked item's icon instead. */
	icon?: IconRef;
	error?: string;
	disabled?: boolean;
	/** Makes an empty select block its form's submission. */
	required?: boolean;
	/** The key the value is submitted under in the enclosing `<form>`'s `FormData`. */
	name?: string;
	/** The `id` of the element that labels the trigger. */
	labelledBy?: string;
	/** The trigger's accessible name, for a select with no visible label. */
	label?: string;
	/** The trigger is as wide as its content instead of the field's minimum width (a row of filters). */
	hug?: boolean;
	/** The popup is as wide as the trigger, or this, whichever is larger. */
	popupWidth?: number;
}) {
	const variant = () => props.variant ?? 'inline';
	const inline = () => variant() === 'inline';
	const spec = () => specs[props.size ?? sizeChoice()];
	const triggerSpec = (): Spec =>
		inline()
			? {
					...specs.compact,
					text: scale.body,
					padX: 8,
					gap: 6,
					minWidth: 0,
				}
			: { ...spec(), minWidth: props.hug === true ? 0 : spec().minWidth };

	const presence = createPresence(POPUP_EXIT_FALLBACK_MS);
	const triggerId = createUniqueId();
	const popupId = createUniqueId();
	const rowId = (index: number) => `${popupId}-row-${index}`;
	const hover = createFluidHover({
		isItemDisabled: (index) => rows()[index]?.disabled === true,
	});
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	const rowRing = createFocusRing(hover);
	/** The row focus ring is earned: by a keyboard open and by navigation keys inside the popup (Base UI's `useKeyboardNavGate`). A focus that is also `:focus-visible` then draws it. */
	let keyboardNav = false;
	const [ownValue, setOwnValue] = createSignal<Value | null>(
		props.defaultValue ?? null,
	);
	const value = () => (props.value === undefined ? ownValue() : props.value);
	let triggerElement: HostElement | undefined;
	/** The popup panel: the scrolling listbox, which holds focus while no row does. */
	let scroller: HostElement | undefined;
	const rowElements = new Map<number, HostElement>();
	/** Set on open: the highlighted row is scrolled into view once its rect has been measured. */
	let revealOnMeasure = false;
	let ackTimer: ReturnType<typeof setTimeout> | undefined;
	let openedAt = 0;
	/** The row a press began on, so its click commits but a release that began elsewhere is judged by the drag rules. */
	let pressedIndex: number | null = null;
	let dragY = 0;
	let dragFromY: number | undefined;
	let dragCommits = false;
	onCleanup(() => clearTimeout(ackTimer));

	const rows = createMemo(() => props.items.filter(isItem));
	const selectedIndex = () => {
		const current = value();
		if (current === null) return -1;
		return rows().findIndex((row) => row.value === current);
	};
	const selected = () => {
		const current = value();
		if (current === null) return undefined;
		const row = rows()[selectedIndex()];
		if (row === undefined) throw new Error(`No item for ${current}`);
		return row;
	};

	const commitValue = (row: SelectItem<Value>) => {
		if (props.value === undefined) setOwnValue(() => row.value);
		props.onValueChange?.(row.value);
	};
	const isRowDisabled = (index: number) => rows()[index].disabled === true;

	const typeahead = createTypeahead({
		labels: () => rows().map((row) => row.label),
		current: () =>
			selectedIndex() === -1 ? hover.activeIndex() : selectedIndex(),
		isDisabled: isRowDisabled,
		onMatch: (index) => {
			// Closed, Base UI commits the match as the value and does not open.
			if (!presence.open()) {
				commitValue(rows()[index]);
				return;
			}
			hover.releasePointer();
			hover.setActiveIndex(index);
			revealIndex(index);
		},
	});
	onCleanup(typeahead.reset);

	/** Where the highlight starts: the picked row; else, for a keyboard open, the first (or last) enabled one. */
	const openHighlight = (from: 'pointer' | 'down' | 'up') => {
		if (selectedIndex() !== -1) return selectedIndex();
		if (from === 'pointer') return null;
		return edgeIndex(
			from === 'down' ? 'first' : 'last',
			rows().length,
			isRowDisabled,
		);
	};
	const focusPanel = () => {
		if (scroller !== undefined && scroller.mounted) {
			scroller.focus({ preventScroll: true });
		}
	};
	const open = (from: 'pointer' | 'down' | 'up' = 'pointer') => {
		if (props.disabled === true || presence.open()) return;
		revealOnMeasure = true;
		openedAt = performance.now();
		pressedIndex = null;
		dragY = 0;
		dragFromY = undefined;
		dragCommits = false;
		keyboardNav = from !== 'pointer';
		typeahead.reset();
		presence.show();
		hover.setActiveIndex(openHighlight(from));
		// A pointer open with no value has no row to focus, so the panel takes it.
		const index = hover.activeIndex();
		if (index === null) focusPanel();
		else rowElements.get(index)?.focus({ preventScroll: true });
	};
	/** Hands focus back to the trigger when it sat in the popup (which unmounts and drops it) or nowhere; a control that took it since keeps it (Base UI's `returnFocus`). */
	const returnFocus = () => {
		if (triggerElement === undefined || !triggerElement.mounted) return;
		const inPopup =
			scroller !== undefined &&
			scroller.mounted &&
			scroller.matches(':focus-within');
		if (inPopup || document.activeElement === null) triggerElement.focus();
	};
	const close = () => {
		clearTimeout(ackTimer);
		if (!presence.open()) return;
		presence.hide();
		typeahead.reset();
		returnFocus();
	};
	const pick = (row: SelectItem<Value>) => {
		if (row.disabled === true) return;
		commitValue(row);
		clearTimeout(ackTimer);
		ackTimer = setTimeout(close, ACK_MS);
	};

	const revealIndex = (index: number) => {
		const row = hover.rects()[index];
		if (scroller === undefined) throw new Error('Select list is not mounted');
		if (row !== undefined) revealRow(scroller, row, 'nearest', POPUP_PADDING);
	};

	/** Arrow keys stop at the ends and visit disabled rows, like Base UI's `loopFocus: false` with `disabledIndices: []`. */
	const move = (delta: 1 | -1) => {
		const next = moveIndex(
			hover.activeIndex(),
			delta,
			rows().length,
			undefined,
			false,
		);
		if (next === null) return;
		jump(next);
	};
	const jump = (index: number) => {
		hover.releasePointer();
		hover.setActiveIndex(index);
		revealIndex(index);
	};
	/** The closed trigger's keys: open, or commit a typeahead match. */
	const onTriggerKeyDown = (event: KeyEvent) => {
		if (isChord(event) || presence.open()) return;
		// Typeahead first: Space inside a session continues it instead of opening.
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		switch (event.key) {
			case 'Enter':
			case ' ':
				open('down');
				return;
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				event.stopPropagation();
				open(event.key === 'ArrowDown' ? 'down' : 'up');
				return;
		}
	};
	/** The open popup's keys: a row holds focus, so its keys bubble here. */
	const onPanelKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		event.stopPropagation();
		if (event.key !== undefined && NAV_KEYS.includes(event.key))
			keyboardNav = true;
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			return;
		}
		switch (event.key) {
			case 'Enter':
			case ' ': {
				event.preventDefault();
				const index = hover.activeIndex();
				if (index !== null) pick(rows()[index]);
				return;
			}
			case 'ArrowDown':
				event.preventDefault();
				move(1);
				return;
			case 'ArrowUp':
				event.preventDefault();
				move(-1);
				return;
			case 'Home':
			case 'End':
				event.preventDefault();
				if (rows().length > 0)
					jump(event.key === 'Home' ? 0 : rows().length - 1);
				return;
			case 'Escape':
				// Closing pops the popup's dismiss layer before the window sees this Escape, which would then close the dialog behind.
				event.preventDefault();
				close();
				return;
			case 'Tab':
				// Forward: the trigger takes focus first, so the default Tab moves on from it. Backward leaves it on the trigger.
				if (event.shiftKey === true) event.preventDefault();
				close();
				return;
		}
	};
	const onTriggerMouseDown = (event: HostMouseEvent) => {
		if (event.button !== undefined && event.button !== 0) return;
		// A press moves focus to the trigger after its handlers have run, which would pull it back from the popup `open` just focused. Windows and Linux run the handler after that move, where this changes nothing.
		event.preventDefault();
		if (presence.open()) close();
		else open('pointer');
	};
	/** Press on the trigger, drag onto a row and release picks it: at once after a drag of 8px, else after 400 ms. */
	const onRowMouseUp = (row: SelectItem<Value>, index: number) => {
		dragY = 0;
		dragFromY = undefined;
		if (row.disabled === true || pressedIndex === index) return;
		const settled = performance.now() - openedAt >= PRESS_DRAG_MS;
		const allowed = value() === row.value ? settled : settled || dragCommits;
		if (allowed) pick(row);
	};
	const onListMouseMove = (event: HostMouseMoveEvent) => {
		hover.handlers.onMouseMove(event);
		if (event.pressedButton !== 0 || event.y === undefined) {
			dragFromY = undefined;
			return;
		}
		if (dragFromY !== undefined) dragY += event.y - dragFromY;
		dragFromY = event.y;
		if (dragY ** 2 >= PRESS_DRAG_PX ** 2) dragCommits = true;
	};

	createEffect(
		on(hover.rects, () => {
			if (!revealOnMeasure) return;
			revealOnMeasure = false;
			const index = hover.activeIndex();
			if (index !== null) revealIndex(index);
		}),
	);
	// Highlight follows focus and focus follows the highlight: a hover or a key lights a row and the row takes focus. Leaving every row hands focus to the panel.
	createEffect(
		on(
			hover.activeIndex,
			(index) => {
				if (!presence.open()) return;
				if (index === null) focusPanel();
				else rowElements.get(index)?.focus({ preventScroll: true });
			},
			{ defer: true },
		),
	);
	createEffect(() => {
		if (presence.mounted()) return;
		hover.setActiveIndex(null);
		const ringed = rowRing.index();
		if (ringed !== null) rowRing.blur(ringed);
	});

	const rectOf = (index: number | null) => () => {
		if (index === null || index === -1 || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const hoverRect = () => rectOf(hover.activeIndex())();

	const triggerIcon = (): IconRef | undefined => {
		if (inline()) return selected()?.icon;
		return props.icon;
	};
	const borderColor = () => {
		if (props.error !== undefined) return destructiveHalf();
		return variant() === 'bordered' ? color.border : color.transparent;
	};

	/** Index of each item among the items only, which is what the highlight and the keyboard use. */
	const indexed = createMemo((): Slot<Value>[] => {
		let itemIndex = 0;
		return props.items.map((entry) => {
			if (isItem(entry))
				return { kind: 'item', row: entry, index: itemIndex++ };
			if ('label' in entry) return { kind: 'label', label: entry.label };
			return { kind: 'separator' };
		});
	});

	const renderSlot = (slot: Slot<Value>): JSX.Element => {
		switch (slot.kind) {
			case 'item':
				return (
					<Row
						row={slot.row}
						index={slot.index}
						spec={spec()}
						lit={
							hover.activeIndex() === slot.index || value() === slot.row.value
						}
						checked={value() === slot.row.value}
						hover={hover}
						id={rowId(slot.index)}
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-option-${slot.row.value}`
						}
						onElement={(element) => rowElements.set(slot.index, element)}
						onFocus={(event) => {
							hover.setActiveIndex(slot.index);
							if (keyboardNav) rowRing.focus(slot.index, event);
						}}
						onBlur={() => rowRing.blur(slot.index)}
						tabIndex={
							presence.open() && hover.activeIndex() === slot.index ? 0 : -1
						}
						onPress={() => {
							pressedIndex = slot.index;
							dragY = 0;
						}}
						onPick={() => {
							if (pressedIndex !== slot.index) return;
							pressedIndex = null;
							pick(slot.row);
						}}
						onRelease={() => onRowMouseUp(slot.row, slot.index)}
					/>
				);
			case 'label':
				return (
					<div
						style={{
							height: LABEL_HEIGHT,
							flexShrink: 0,
							display: 'flex',
							alignItems: 'center',
							paddingLeft: 8,
							paddingRight: 8,
						}}
					>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							{slot.label}
						</text>
					</div>
				);
			case 'separator':
				return (
					<div
						style={{
							height: 1,
							flexShrink: 0,
							marginTop: 4,
							marginBottom: 4,
							marginLeft: -POPUP_PADDING,
							marginRight: -POPUP_PADDING,
							backgroundColor: separatorColor(),
						}}
					/>
				);
		}
	};

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flexShrink: 0,
			}}
		>
			<div
				testId={props.testId}
				onMouseDownOutside={() => {
					if (!presence.open()) return;
					close();
					refocusAfterPress(triggerElement);
				}}
				style={{ position: 'relative' }}
			>
				<div
					ref={(element) => {
						triggerElement = element;
					}}
					id={triggerId}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-trigger`
					}
					role="combobox"
					aria-haspopup="listbox"
					aria-expanded={presence.open()}
					aria-controls={presence.open() ? popupId : undefined}
					aria-labelledby={props.labelledBy}
					aria-label={props.label}
					aria-required={props.required}
					aria-invalid={props.error !== undefined}
					aria-disabled={props.disabled === true}
					tabIndex={props.disabled === true ? -1 : 0}
					onMouseDown={onTriggerMouseDown}
					onKeyDown={onTriggerKeyDown}
					onMouseEnter={() => setTriggerHovered(true)}
					onMouseLeave={() => setTriggerHovered(false)}
					style={{
						height: triggerSpec().height,
						minWidth: triggerSpec().minWidth,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: triggerSpec().gap,
						paddingLeft: triggerSpec().padX,
						paddingRight: inline() ? 6 : triggerSpec().padX,
						borderWidth: inline() ? 0 : 1,
						borderColor: borderColor(),
						borderRadius: shape.input,
						cursor: 'pointer',
						keyboardFocusDim: false,
						opacity: props.disabled === true ? 0.5 : 1,
						pointerEvents: props.disabled === true ? 'none' : 'auto',
						...colorFade,
						hover: { backgroundColor: color.hover },
						active: { backgroundColor: color.active },
						focusVisible: focusRing(0),
					}}
				>
					<div
						style={{
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'center',
							gap: triggerSpec().gap,
							minWidth: 0,
							flexGrow: inline() || props.hug === true ? 0 : 1,
						}}
					>
						<Show when={triggerIcon()}>
							{(name: Accessor<IconRef>) => (
								<Icon
									name={name()}
									size={triggerSpec().icon}
									strokeWidth={inline() || triggerHovered() ? 2 : 1.5}
									fade
									easeStroke
									color={
										inline() || triggerHovered()
											? color.foreground
											: color.mutedForeground
									}
								/>
							)}
						</Show>
						<text
							style={{
								...triggerSpec().text,
								minWidth: 0,
								flexGrow: 1,
								whiteSpace: 'nowrap',
								textOverflow: 'ellipsis',
								overflow: 'hidden',
								color:
									selected() === undefined
										? color.mutedForeground
										: color.foreground,
							}}
						>
							{selected()?.label ?? props.placeholder ?? 'Select…'}
						</text>
					</div>
					<Icon
						name="chevron-down"
						size={triggerSpec().icon}
						strokeWidth={2}
						fade
						color={triggerHovered() ? color.foreground : color.mutedForeground}
					/>
				</div>
				<Show when={props.name !== undefined || props.required === true}>
					<FormValue
						name={props.name}
						value={value() ?? ''}
						required={props.required === true}
						disabled={props.disabled === true}
						focusTarget={() => triggerElement}
					/>
				</Show>
				<PopupSurface
					presence={presence}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-popup`
					}
					align={inline() ? 'end' : 'start'}
					width={props.popupWidth ?? (inline() ? 160 : 'anchor-size(width)')}
					maxHeight={POPUP_MAX_HEIGHT}
					onDismiss={close}
				>
					{(popupMaxHeight) => (
						<div
							ref={(element) => {
								scroller = element;
							}}
							id={popupId}
							testId={
								props.testId === undefined ? undefined : `${props.testId}-list`
							}
							role="listbox"
							// A pointer open, and a pointer leaving every row, land focus here so the keys still reach it.
							tabIndex={-1}
							onKeyDown={onPanelKeyDown}
							onScroll={hover.handlers.onScroll}
							style={{
								keyboardFocusDim: false,
								display: 'flex',
								flexDirection: 'column',
								overflowY: 'scroll',
								maxHeight: popupMaxHeight(),
							}}
						>
							{/* The overlays live inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
							<div
								{...hover.containerProps}
								onMouseMove={onListMouseMove}
								style={{
									position: 'relative',
									display: 'flex',
									flexDirection: 'column',
									padding: POPUP_PADDING,
								}}
							>
								<FluidHighlight
									rect={rectOf(selectedIndex())}
									session={() => 0}
									radius={radius.item}
									background={color.active}
									glide={tween.moderate}
									fade={tween.moderateExit}
								/>
								<FluidHighlight
									rect={hoverRect}
									session={hover.session}
									radius={radius.item}
									background={color.hover}
								/>
								<FocusRing
									ring={rowRing}
									radius={radius.focusRing}
									testId={
										props.testId === undefined
											? undefined
											: `${props.testId}-focus-ring`
									}
								/>
								<For each={indexed()}>{(slot) => renderSlot(slot)}</For>
							</div>
						</div>
					)}
				</PopupSurface>
			</div>
			<Show when={props.error}>
				{(message: Accessor<string>) => (
					<div
						testId={
							props.testId === undefined ? undefined : `${props.testId}-error`
						}
						style={{ paddingLeft: 12, paddingTop: 4 }}
					>
						<text style={{ ...scale.caption, color: color.destructive }}>
							{message()}
						</text>
					</div>
				)}
			</Show>
		</div>
	);
}

function Row<Value extends string>(props: {
	row: SelectItem<Value>;
	index: number;
	spec: Spec;
	lit: boolean;
	checked: boolean;
	hover: ReturnType<typeof createFluidHover>;
	id: string;
	testId?: string;
	tabIndex: number;
	onElement: (element: HostElement) => void;
	onFocus: (event: DomEvent) => void;
	onBlur: () => void;
	onPick: () => void;
	onPress: () => void;
	onRelease: () => void;
}): JSX.Element {
	let rowElement: HostElement | undefined;
	useHoverItem(
		props.hover,
		() => props.index,
		() => rowElement,
	);
	return (
		<div
			ref={(element) => {
				rowElement = element;
				props.onElement(element);
			}}
			id={props.id}
			role="option"
			tabIndex={props.tabIndex}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
			testId={props.testId}
			aria-selected={props.checked}
			aria-disabled={props.row.disabled === true}
			onMouseDown={props.onPress}
			onMouseUp={props.onRelease}
			onClick={props.onPick}
			style={{
				height: props.spec.height,
				flexShrink: 0,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: props.spec.itemGap,
				paddingLeft: props.spec.itemPadX,
				paddingRight: props.spec.itemPadX,
				borderRadius: radius.item,
				cursor: 'pointer',
				opacity: props.row.disabled === true ? 0.5 : 1,
				pointerEvents: props.row.disabled === true ? 'none' : undefined,
				keyboardFocusDim: false,
			}}
		>
			<Show when={props.row.icon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={props.spec.icon}
						strokeWidth={props.lit ? 2 : 1.5}
						fade
						easeStroke
						color={props.lit ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<text
				style={{
					...props.spec.text,
					flexGrow: 1,
					minWidth: 0,
					whiteSpace: 'nowrap',
					textOverflow: 'ellipsis',
					overflow: 'hidden',
					color: props.lit ? color.foreground : color.mutedForeground,
					...colorFade,
				}}
			>
				{props.row.label}
			</text>
			<div
				style={{
					width: props.spec.icon,
					height: props.spec.icon,
					flexShrink: 0,
				}}
			>
				<CheckMark
					checked={props.checked}
					path={LIST_CHECK}
					size={props.spec.icon}
					strokeWidth={2}
					color={color.foreground}
				/>
			</div>
		</div>
	);
}
