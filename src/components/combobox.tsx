import {
	type EventPayload,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	on,
	Show,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, createReflowGate, useHoverItem } from "../lib/fluid-hover";
import { FormValue } from "../lib/form-value";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { isChord, moveIndex, revealRow } from "../lib/list-nav";
import { PopupSurface } from "../lib/popup";
import { createPresence, POPUP_EXIT_FALLBACK_MS } from "../lib/presence";
import {
	color,
	radius,
	type as scale,
	motion as tween,
	weight,
} from "../lib/theme";

const FIELD_HEIGHT = 36;
const ROW_HEIGHT = 36;
const POPUP_MAX_HEIGHT = 300;
/** The list's padding inside its scroller. */
const LIST_PADDING = 4;

function ClearButton(props: { onClick: () => void; testId?: string }) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			role="button"
			aria-label="Clear"
			testId={props.testId}
			onClick={props.onClick}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				width: 24,
				height: 24,
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: 6,
				cursor: "pointer",
				hover: { backgroundColor: color.hover },
				active: { backgroundColor: color.active },
			}}
		>
			<Icon
				name="x"
				size={16}
				strokeWidth={1.5}
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
	return typeof item === "string" ? { value: item, label: item } : item;
}

/** Base UI's default match: `Intl.Collator`, ignoring case, accents and punctuation. */
const collator = new Intl.Collator(undefined, {
	usage: "search",
	sensitivity: "base",
	ignorePunctuation: true,
});
function contains(text: string, query: string) {
	if (query === "") return true;
	for (let start = 0; start <= text.length - query.length; start++) {
		if (collator.compare(text.slice(start, start + query.length), query) === 0) {
			return true;
		}
	}
	return false;
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
	const renderer = useGpuixRequired();
	const width = () => props.width ?? 280;

	const presence = createPresence(POPUP_EXIT_FALLBACK_MS);
	const listId = createUniqueId();
	const rowId = (index: number) => `${listId}-row-${index}`;
	const open = presence.open;
	const mounted = presence.mounted;
	const rows = createMemo(() => props.items.map(toRow));
	const [ownValue, setOwnValue] = createSignal<string | null>(
		props.defaultValue ?? null,
	);
	const value = () => (props.value === undefined ? ownValue() : props.value);
	const labelOf = (current: string | null) => {
		if (current === null) return "";
		const row = rows().find((candidate) => candidate.value === current);
		if (row === undefined) throw new Error(`No item for ${current}`);
		return row.label;
	};
	const [inputText, setInputText] = createSignal(labelOf(value()));
	// What the list filters by. The text field shows the selected label while
	// closed, but opening it must still list every item.
	const [query, setQuery] = createSignal("");
	const [focused, setFocused] = createSignal(false);
	const [chevronHovered, setChevronHovered] = createSignal(false);
	/** Armed while typing re-filters the rows under the highlights: those frames snap, not glide. */
	const reflow = createReflowGate();

	let inputElement: HostElement | undefined;
	let scroller: HostElement | undefined;
	/** Set on open: the highlighted row is scrolled into view once its rect has been measured. */
	let revealOnMeasure = false;

	const filtered = createMemo(() => {
		const needle = query().trim();
		if (needle === "") return rows();
		const matches = props.filter ?? ((row, text) => contains(row.label, text));
		return rows().filter((row) => matches(row, needle));
	});
	const checkedIndex = createMemo(() => {
		const index = filtered().findIndex((row) => row.value === value());
		return index === -1 ? null : index;
	});

	const hover = createFluidHover({
		isItemDisabled: (index) => filtered()[index]?.disabled === true,
	});
	/** Focus stays in the field while the arrows walk the rows, so it names the lit one. */
	const litRowId = () => {
		const index = hover.activeIndex();
		return open() && index !== null ? rowId(index) : undefined;
	};
	const listShown = () => open() && filtered().length > 0;

	const commitValue = (next: string | null) => {
		if (props.value === undefined) setOwnValue(next);
		props.onValueChange?.(next);
	};
	/** Where the highlight starts on open: the picked row, else the first (`autoHighlight="always"`). */
	const openHighlight = () => {
		const picked = rows().findIndex((row) => row.value === value());
		if (picked !== -1) return picked;
		return rows().length === 0 ? null : 0;
	};
	const openPopup = () => {
		if (open() || props.disabled === true) return;
		setQuery("");
		revealOnMeasure = true;
		presence.show();
		hover.setActiveIndex(openHighlight());
	};
	const closePopup = () => {
		if (!open()) return;
		presence.hide();
		setInputText(labelOf(value()));
	};
	const focusInput = () => {
		if (inputElement === undefined)
			throw new Error("Combobox input is not mounted");
		renderer.focusElement?.(inputElement.id);
	};
	const select = (row: ComboboxRow) => {
		if (row.disabled === true) return;
		commitValue(row.value);
		setInputText(row.label);
		closePopup();
	};
	const clear = () => {
		commitValue(null);
		setInputText("");
		setQuery("");
		focusInput();
	};

	// The field follows a value that changed from outside.
	createEffect(
		on(
			value,
			(next) => {
				const label = labelOf(next);
				if (inputText() !== label) setInputText(label);
			},
			{ defer: true },
		),
	);

	// Typing re-filters rows underneath the overlays, so the first row is the
	// target again (the picked row once the text is emptied) and the new rects
	// replace the old ones without a glide.
	createEffect(
		on(
			filtered,
			() => {
				if (!mounted()) return;
				reflow.raise();
				if (scroller !== undefined && scroller.mounted) {
					scroller.scrollTo({ top: 0, left: 0 });
				}
				if (filtered().length === 0) {
					hover.setActiveIndex(null);
					return;
				}
				const picked = query().trim() === "" ? checkedIndex() : null;
				hover.setActiveIndex(picked ?? 0);
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			hover.rects,
			() => {
				if (!revealOnMeasure) return;
				revealOnMeasure = false;
				const index = hover.activeIndex();
				if (index !== null) revealIndex(index);
			},
			{ defer: true },
		),
	);

	const revealIndex = (index: number) => {
		const row = hover.rects()[index];
		if (scroller !== undefined && row !== undefined) {
			revealRow(scroller, row, "nearest", LIST_PADDING);
		}
	};
	/** Arrows loop (`loopFocus` is on) and visit disabled rows (`disabledIndices: []`). */
	const move = (delta: 1 | -1) => {
		const next = moveIndex(hover.activeIndex(), delta, filtered().length);
		if (next === null) return;
		hover.setActiveIndex(next);
		revealIndex(next);
	};

	const onKeyDown = (event: KeyEvent) => {
		if (isChord(event)) return;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowUp":
				event.preventDefault();
				event.stopPropagation();
				if (!open()) openPopup();
				else move(event.key === "ArrowDown" ? 1 : -1);
				return;
			case "Escape":
				if (open()) {
					// Closing pops the popup's dismiss layer before the window sees this Escape, which would then close the dialog behind.
					event.preventDefault();
					closePopup();
					return;
				}
				if (mounted()) return;
				// Closed: Escape empties the field and the pick. With a pick to clear it is consumed, so a dialog behind stays open.
				setInputText("");
				setQuery("");
				if (value() !== null) {
					commitValue(null);
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			case "Tab":
				closePopup();
				return;
			case "Enter":
				event.preventDefault();
				submit();
				return;
		}
	};
	const submit = () => {
		if (!open()) return;
		const index = hover.activeIndex();
		// Nothing highlighted (no results): Enter closes, so a form can submit.
		if (index === null) {
			closePopup();
			return;
		}
		const row = filtered()[index];
		if (row !== undefined) select(row);
	};
	const onChange = (event: EventPayload) => {
		const text = event.value;
		if (text === undefined) throw new Error("Combobox change without a value");
		setInputText(text);
		// Emptying the field drops the pick.
		if (text === "" && value() !== null) commitValue(null);
		if (open()) {
			setQuery(text);
			return;
		}
		if (text.trim() === "") return;
		openPopup();
		setQuery(text);
	};
	const onListMouseLeave = () => {
		hover.handlers.onMouseLeave();
		// `autoHighlight="always"` refills a dropped highlight with the first row, so Enter always has a target.
		if (filtered().length > 0) hover.setActiveIndex(0);
	};

	const checkedRect = () => {
		const index = checkedIndex();
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
			onMouseDownOutside={closePopup}
			style={{
				position: "relative",
				width: width(),
				height: FIELD_HEIGHT,
				flexShrink: 0,
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? "none" : "auto",
			}}
		>
			<Show when={props.name !== undefined || props.required === true}>
				<FormValue
					name={props.name}
					value={value() ?? ""}
					required={props.required === true}
					disabled={props.disabled === true}
					focusTarget={() => inputElement}
				/>
			</Show>
			<div
				style={{
					width: "100%",
					height: FIELD_HEIGHT,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					paddingLeft: 10,
					paddingRight: 10,
					borderRadius: radius.item,
					cursor: "text",
					outlineWidth: 1,
					outlineColor: color.border,
					outlineOffset: 0,
					backgroundColor: focused() ? color.card : color.transparent,
					hover: {
						backgroundColor: focused() ? color.card : color.mutedHalf,
					},
				}}
			>
				<div
					onMouseDown={() => {
						focusInput();
						openPopup();
					}}
					style={{
						flexGrow: 1,
						minWidth: 0,
						height: "100%",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 8,
					}}
				>
					<Show when={props.icon}>
						{(name: Accessor<IconRef>) => (
							<Icon
								name={name()}
								size={16}
								strokeWidth={focused() ? 2 : 1.5}
								color={focused() ? color.foreground : color.mutedForeground}
							/>
						)}
					</Show>
					<input
						ref={(element) => {
							inputElement = element;
						}}
						testId={
							props.testId === undefined ? undefined : `${props.testId}-input`
						}
						id={createUniqueId()}
						value={inputText()}
						placeholder={props.placeholder ?? "Search…"}
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open()}
						aria-controls={listShown() ? listId : undefined}
						aria-autocomplete="list"
						aria-activedescendant={litRowId()}
						aria-labelledby={props.labelledBy}
						aria-required={props.required}
						aria-disabled={props.disabled === true}
						readOnly={props.disabled === true}
						tabIndex={props.disabled === true ? -1 : undefined}
						theme={{
							text: color.foreground,
							textMuted: color.mutedForeground,
							textFaint: color.mutedForeground,
							textDim: color.mutedForeground,
							caret: color.foreground,
						}}
						onFocus={() => setFocused(true)}
						onMouseDown={openPopup}
						onBlur={() => setFocused(false)}
						onChange={onChange}
						onKeyDown={onKeyDown}
						style={{
							flexGrow: 1,
							minWidth: 0,
							height: 24,
							fontSize: scale.body.fontSize,
							fontWeight: weight.normal,
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
								onClick={clear}
								testId={
									props.testId === undefined ? undefined : `${props.testId}-clear`
								}
							/>
						</Show>
					</div>
				</Show>
				<div
					role="button"
					aria-label="Open"
					onMouseEnter={() => setChevronHovered(true)}
					onMouseLeave={() => setChevronHovered(false)}
					onMouseDown={() => {
						focusInput();
						if (open()) closePopup();
						else openPopup();
					}}
					style={{
						width: 24,
						height: 24,
						flexShrink: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: 6,
						cursor: "pointer",
					}}
				>
					<Icon
						name="chevron-down"
						size={16}
						strokeWidth={2}
						color={chevronHovered() ? color.foreground : color.mutedForeground}
					/>
				</div>
			</div>

			<PopupSurface
				presence={presence}
				align="start"
				width={width()}
				maxHeight={POPUP_MAX_HEIGHT}
				onDismiss={closePopup}
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
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<text style={{ ...scale.body, color: color.mutedForeground }}>
								{props.emptyText ?? "No results found."}
							</text>
						</div>
					}
				>
					<div
						ref={(element) => {
							scroller = element;
						}}
						id={listId}
						role="listbox"
						onScroll={hover.handlers.onScroll}
						style={{
							display: "flex",
							flexDirection: "column",
							overflowY: "scroll",
							maxHeight: popupMaxHeight() - 2,
						}}
					>
						{/* The overlays live inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
						<div
							{...hover.containerProps}
							onMouseLeave={onListMouseLeave}
							style={{
								position: "relative",
								display: "flex",
								flexDirection: "column",
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
											ref={(element) => {
												rowElement = element;
											}}
											id={rowId(index())}
											role="option"
											testId={
												props.testId === undefined
													? undefined
													: `${props.testId}-option-${row.value}`
											}
											aria-selected={value() === row.value}
											aria-disabled={row.disabled === true}
											onClick={() => select(row)}
											style={{
												height: ROW_HEIGHT,
												flexShrink: 0,
												display: "flex",
												flexDirection: "row",
												alignItems: "center",
												gap: 8,
												paddingLeft: 8,
												paddingRight: 8,
												borderRadius: radius.item,
												cursor: "pointer",
												opacity: row.disabled === true ? 0.5 : 1,
												pointerEvents: row.disabled === true ? "none" : undefined,
											}}
										>
											<Show when={row.icon}>
												{(name: Accessor<IconRef>) => (
													<Icon
														name={name()}
														size={16}
														strokeWidth={lit() ? 2 : 1.5}
														color={lit() ? color.foreground : color.mutedForeground}
													/>
												)}
											</Show>
											<text
												style={{
													flexGrow: 1,
													minWidth: 0,
													...scale.body,
													color: lit() ? color.foreground : color.mutedForeground,
													whiteSpace: "nowrap",
													textOverflow: "ellipsis",
													overflow: "hidden",
												}}
											>
												{row.label}
											</text>
											<div style={{ width: 16, height: 16, flexShrink: 0 }}>
												<Show when={value() === row.value}>
													<Icon
														name="check"
														size={16}
														strokeWidth={2}
														color={color.foreground}
													/>
												</Show>
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
