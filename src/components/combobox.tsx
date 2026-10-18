import type { HostElement } from '@gpuix/solid';
import { createComboboxRoot } from 'base-ui-solid-gpuix/combobox';
import { FormValue } from 'base-ui-solid-gpuix/utils';
import { type Accessor, createMemo, createSignal, For, Show } from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import {
	createFluidHover,
	createReflowGate,
	useHoverItem,
} from '#/lib/fluid-hover';
import { CheckMark, Icon, LIST_CHECK } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { PopupSurface } from '#/lib/popup';
import { POPUP_EXIT_FALLBACK_MS } from '#/lib/popup-timing';
import {
	clippedCapTrim,
	color,
	colorFade,
	fade,
	radius,
	type as scale,
	shape,
	shapeChoice,
	motion as tween,
	weight,
} from '#/lib/theme';

const FIELD_HEIGHT = 36;
const ROW_HEIGHT = 36;
const POPUP_MAX_HEIGHT = 300;
/** The list's padding inside its scroller. */
const LIST_PADDING = 4;

function ClearButton(props: {
	clearProps: ReturnType<typeof createComboboxRoot>['clearProps'];
	testId?: string;
}) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			{...props.clearProps}
			testId={props.testId}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				width: 24,
				height: 24,
				flexShrink: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: shapeChoice() === 'pill' ? 12 : 6,
				cursor: 'pointer',
				...fade(['color', 'background-color'], 80),
				hover: { backgroundColor: color.hover },
				active: { backgroundColor: color.active },
			}}
		>
			<Icon
				name="x"
				size={16}
				strokeWidth={1.5}
				fade
				color={hovered() ? color.foreground : color.mutedForeground}
			/>
		</div>
	);
}

/** An item is its own value and label, or carries them. */
export type ComboboxItem =
	| string
	| { value: string; label: string; icon?: IconRef; disabled?: boolean };

export interface ComboboxRow {
	value: string;
	label: string;
	icon?: IconRef;
	disabled?: boolean;
}

function toRow(item: ComboboxItem): ComboboxRow {
	return typeof item === 'string' ? { value: item, label: item } : item;
}

/**
 * Single-select Combobox from base/combobox.tsx: a text field that filters a
 * list as you type, a popup of fluid-hover rows, and a checked row whose
 * background glides between picks. Multiple selection (chips) is out of scope.
 */
export function Combobox(props: {
	items: readonly ComboboxItem[];
	/** Controlled value. Omitted, the combobox keeps its own, starting at `defaultValue`. */
	value?: string | null;
	defaultValue?: string | null;
	onValueChange?: (value: string | null) => void;
	icon?: IconRef;
	placeholder?: string;
	width?: number;
	emptyText?: string;
	testId?: string;
	disabled?: boolean;
	/** Makes an empty combobox block its form's submission. */
	required?: boolean;
	/** The key the picked value is submitted under in the enclosing `<form>`'s `FormData`. */
	name?: string;
	/** The `id` of the element that labels the field. */
	labelledBy?: string;
	/** A ✕ that clears the pick and the query. Its slot is only reserved when set. */
	clearable?: boolean;
	/** Whether a row matches the typed query. Default: Base UI's collator `contains` on the label. */
	filter?: (item: ComboboxRow, query: string) => boolean;
}) {
	const width = () => props.width ?? 280;
	const rows = createMemo(() => props.items.map(toRow));

	const [focused, setFocused] = createSignal(false);
	const [chevronHovered, setChevronHovered] = createSignal(false);
	/** Armed while typing re-filters the rows under the highlights: those frames snap, not glide. */
	const reflow = createReflowGate();
	// `combobox` is declared below: the hover only asks it once a row exists.
	const hover = createFluidHover({
		isItemDisabled: (index) => combobox.filtered()[index]?.disabled === true,
	});
	const combobox = createComboboxRoot({
		items: rows,
		value: () => props.value,
		defaultValue: props.defaultValue,
		onValueChange: (next) => props.onValueChange?.(next),
		disabled: () => props.disabled === true,
		required: () => props.required,
		labelledBy: () => props.labelledBy,
		filter: () => props.filter,
		exitMs: POPUP_EXIT_FALLBACK_MS,
		highlightedIndex: hover.activeIndex,
		onHighlightChange: (index) => hover.setActiveIndex(index),
		itemRects: hover.rects,
		scrollPadding: LIST_PADDING,
		onFilterReflow: reflow.raise,
	});
	const filtered = combobox.filtered;
	const value = combobox.value;

	const onListMouseLeave = () => {
		hover.handlers.onMouseLeave();
		combobox.onListMouseLeave();
	};

	const checkedRect = () => {
		const index = combobox.checkedIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	/** The ✕ shows while there is a pick to clear. */
	const clearVisible = () => value() !== null;

	return (
		<div
			testId={props.testId}
			{...combobox.dismissProps}
			style={{
				position: 'relative',
				width: width(),
				height: FIELD_HEIGHT,
				flexShrink: 0,
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? 'none' : 'auto',
			}}
		>
			<Show when={props.name !== undefined || props.required === true}>
				<FormValue
					name={props.name}
					value={value() ?? ''}
					required={props.required === true}
					disabled={props.disabled === true}
					focusTarget={combobox.inputElement}
				/>
			</Show>
			<div
				style={{
					width: '100%',
					height: FIELD_HEIGHT,
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 8,
					paddingLeft: 10,
					paddingRight: 10,
					borderRadius: shape.input,
					cursor: 'text',
					outlineWidth: 1,
					outlineStyle: 'solid',
					outlineColor: color.border,
					outlineOffset: 0,
					backgroundColor: focused() ? color.card : color.transparent,
					...colorFade,
					hover: {
						backgroundColor: focused() ? color.card : color.mutedHalf,
					},
				}}
			>
				<div
					{...combobox.inputGroupProps}
					style={{
						flexGrow: 1,
						minWidth: 0,
						height: '100%',
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Show when={props.icon}>
						{(name: Accessor<IconRef>) => (
							<Icon
								name={name()}
								size={16}
								strokeWidth={focused() ? 2 : 1.5}
								fade
								easeStroke
								color={focused() ? color.foreground : color.mutedForeground}
							/>
						)}
					</Show>
					<input
						{...combobox.inputProps}
						ref={combobox.inputRef}
						testId={
							props.testId === undefined ? undefined : `${props.testId}-input`
						}
						placeholder={props.placeholder ?? 'Search…'}
						theme={{
							text: color.foreground,
							textMuted: color.mutedForeground,
							textFaint: color.mutedForeground,
							textDim: color.mutedForeground,
							caret: color.foreground,
						}}
						onFocus={() => setFocused(true)}
						onBlur={() => setFocused(false)}
						style={{
							flexGrow: 1,
							minWidth: 0,
							height: 24,
							fontSize: scale.body.fontSize,
							fontVariationSettings: weight.normal,
							color: color.foreground,
							backgroundColor: color.transparent,
							keyboardFocusDim: false,
						}}
					/>
				</div>
				{/* The clear slot is reserved only when the field is clearable, and then always, so the field never changes width. */}
				<Show when={props.clearable === true}>
					<div style={{ width: 24, height: 24, flexShrink: 0 }}>
						<Show when={clearVisible()}>
							<ClearButton
								clearProps={combobox.clearProps}
								testId={
									props.testId === undefined
										? undefined
										: `${props.testId}-clear`
								}
							/>
						</Show>
					</div>
				</Show>
				<div
					{...combobox.triggerProps}
					onMouseEnter={() => setChevronHovered(true)}
					onMouseLeave={() => setChevronHovered(false)}
					style={{
						width: 24,
						height: 24,
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: 6,
						cursor: 'pointer',
					}}
				>
					<Icon
						name="chevron-down"
						size={16}
						strokeWidth={2}
						fade
						color={chevronHovered() ? color.foreground : color.mutedForeground}
					/>
				</div>
			</div>

			<PopupSurface
				presence={combobox.presence}
				testId={
					props.testId === undefined ? undefined : `${props.testId}-popup`
				}
				align="start"
				maxHeight={POPUP_MAX_HEIGHT}
				onDismiss={combobox.closePopup}
			>
				{(popupMaxHeight) => (
					<Show
						when={filtered().length > 0}
						fallback={
							<div
								style={{
									paddingTop: 24,
									paddingBottom: 24,
									paddingLeft: 12,
									paddingRight: 12,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
								}}
							>
								<text style={{ ...scale.body, color: color.mutedForeground }}>
									{props.emptyText ?? 'No results found.'}
								</text>
							</div>
						}
					>
						<div
							{...combobox.listProps}
							ref={combobox.listRef}
							onScroll={hover.handlers.onScroll}
							style={{
								display: 'flex',
								flexDirection: 'column',
								overflowY: 'scroll',
								maxHeight: popupMaxHeight(),
							}}
						>
							{/* The overlays live inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
							<div
								{...hover.containerProps}
								onMouseLeave={onListMouseLeave}
								style={{
									position: 'relative',
									display: 'flex',
									flexDirection: 'column',
									padding: 4,
								}}
							>
								<FluidHighlight
									rect={checkedRect}
									session={() => 0}
									radius={radius.item}
									background={color.active}
									glide={tween.moderate}
									fade={tween.moderateExit}
									travel={() => !reflow.reflowing()}
								/>
								<FluidHighlight
									rect={hoverRect}
									session={hover.session}
									radius={radius.item}
									background={color.hover}
									travel={() => !reflow.reflowing()}
								/>
								<For each={filtered()}>
									{(row, index) => {
										const lit = () =>
											hover.activeIndex() === index() || value() === row.value;
										let rowElement: HostElement | undefined;
										useHoverItem(hover, index, () => rowElement);
										return (
											<div
												{...combobox.itemProps(row, index)}
												ref={(element) => {
													rowElement = element;
												}}
												testId={
													props.testId === undefined
														? undefined
														: `${props.testId}-option-${row.value}`
												}
												style={{
													position: 'relative',
													zIndex: 10,
													height: ROW_HEIGHT,
													flexShrink: 0,
													display: 'flex',
													flexDirection: 'row',
													alignItems: 'center',
													gap: 8,
													paddingLeft: 8,
													paddingRight: 8,
													borderRadius: radius.item,
													cursor: 'pointer',
													opacity: row.disabled === true ? 0.5 : 1,
													pointerEvents:
														row.disabled === true ? 'none' : undefined,
												}}
											>
												<Show when={row.icon}>
													{(name: Accessor<IconRef>) => (
														<Icon
															name={name()}
															size={16}
															strokeWidth={lit() ? 2 : 1.5}
															fade
															easeStroke
															color={
																lit() ? color.foreground : color.mutedForeground
															}
														/>
													)}
												</Show>
												<text
													style={{
														flexGrow: 1,
														minWidth: 0,
														...scale.body,
														color: lit()
															? color.foreground
															: color.mutedForeground,
														...colorFade,
														whiteSpace: 'nowrap',
														textOverflow: 'ellipsis',
														overflow: 'hidden',
														...clippedCapTrim(),
													}}
												>
													{row.label}
												</text>
												<div style={{ width: 16, height: 16, flexShrink: 0 }}>
													<CheckMark
														checked={value() === row.value}
														path={LIST_CHECK}
														size={16}
														strokeWidth={2}
														color={color.foreground}
													/>
												</div>
											</div>
										);
									}}
								</For>
							</div>
						</div>
					</Show>
				)}
			</PopupSurface>
		</div>
	);
}
