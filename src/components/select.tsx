import type { DomEvent, HostElement } from '@gpuix/solid';
import { createSelectRoot } from 'base-ui-solid-gpuix/select';
import { FormValue } from 'base-ui-solid-gpuix/utils';
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSX,
	Show,
} from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover, useHoverItem } from '#/lib/fluid-hover';
import { createFocusRing, FocusRing } from '#/lib/focus-ring';
import { CheckMark, Icon, LIST_CHECK } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { PopupSurface } from '#/lib/popup';
import { POPUP_EXIT_FALLBACK_MS } from '#/lib/popup-timing';
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

/** How long a pick holds the popup open so the check and the checked background are seen arriving. */
const ACK_MS = 300;
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

	const rows = createMemo(() => props.items.filter(isItem));
	const hover = createFluidHover({
		isItemDisabled: (index) => rows()[index]?.disabled === true,
	});
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	const rowRing = createFocusRing(hover);
	const select = createSelectRoot({
		items: rows,
		value: () => props.value,
		defaultValue: props.defaultValue,
		onValueChange: (next) => props.onValueChange?.(next),
		disabled: () => props.disabled === true,
		required: () => props.required,
		invalid: () => props.error !== undefined,
		labelledBy: () => props.labelledBy,
		label: () => props.label,
		exitMs: POPUP_EXIT_FALLBACK_MS,
		pickHoldMs: ACK_MS,
		highlightedIndex: hover.activeIndex,
		onHighlightChange: (index, reason) => {
			// A keyboard move owns the highlight: the pointer is forgotten so the scroll it causes does not re-pick under it.
			if (reason === 'keyboard' || reason === 'typeahead') {
				hover.releasePointer();
			}
			hover.setActiveIndex(index);
		},
		itemRects: hover.rects,
		scrollPadding: POPUP_PADDING,
	});
	const presence = select.presence;
	const value = select.value;
	const selectedIndex = select.selectedIndex;
	const selected = () => {
		const current = value();
		if (current === null) return undefined;
		const row = rows()[selectedIndex()];
		if (row === undefined) throw new Error(`No item for ${current}`);
		return row;
	};

	createEffect(() => {
		if (presence.mounted()) return;
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
			case 'item': {
				const itemProps = select.itemProps(slot.row, slot.index);
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
						itemProps={itemProps}
						onElement={(element) => select.itemRef(slot.index, element)}
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-option-${slot.row.value}`
						}
						onFocus={(event) => {
							itemProps.onFocus();
							if (select.keyboardNav()) rowRing.focus(slot.index, event);
						}}
						onBlur={() => rowRing.blur(slot.index)}
					/>
				);
			}
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
				{...select.dismissProps}
				style={{ position: 'relative' }}
			>
				<div
					{...select.triggerProps}
					ref={select.triggerRef}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-trigger`
					}
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
						focusTarget={select.triggerElement}
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
					onDismiss={select.close}
				>
					{(popupMaxHeight) => (
						<div
							{...select.popupProps}
							ref={select.popupRef}
							testId={
								props.testId === undefined ? undefined : `${props.testId}-list`
							}
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
								onMouseMove={(event) => {
									hover.handlers.onMouseMove(event);
									select.onListMouseMove(event);
								}}
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
	itemProps: ReturnType<ReturnType<typeof createSelectRoot>['itemProps']>;
	onElement: (element: HostElement) => void;
	testId?: string;
	onFocus: (event: DomEvent) => void;
	onBlur: () => void;
}): JSX.Element {
	let rowElement: HostElement | undefined;
	useHoverItem(
		props.hover,
		() => props.index,
		() => rowElement,
	);
	return (
		<div
			// Explicit, not `{...props.itemProps}`: a spread applies its props in a later effect, so the row is focusable (tabIndex) only after the open's `focus()`. The visible effect is the scrollbar's fade timing (screenshots/select/timezone-reopened).
			id={props.itemProps.id}
			role={props.itemProps.role}
			tabIndex={props.itemProps.tabIndex}
			aria-selected={props.itemProps['aria-selected']}
			aria-disabled={props.itemProps['aria-disabled']}
			onMouseDown={props.itemProps.onMouseDown}
			onMouseUp={props.itemProps.onMouseUp}
			onClick={props.itemProps.onClick}
			ref={(element) => {
				rowElement = element;
				props.onElement(element);
			}}
			onFocus={props.onFocus}
			onBlur={props.onBlur}
			testId={props.testId}
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
