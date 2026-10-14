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
	on,
	For,
	type JSX,
	onCleanup,
	Show,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, useHoverItem } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { moveIndex, revealRow } from "../lib/list-nav";
import { isInside, placePopup, PopupSurface } from "../lib/popup";
import { createPresence, POPUP_EXIT_FALLBACK_MS } from "../lib/presence";
import { createTypeahead } from "../lib/typeahead";
import { color, radius, type as scale, scheme, motion as tween, withAlpha, focusRing } from "../lib/theme";

/** How long a pick holds the popup open so the check and the checked background are seen arriving. */
const ACK_MS = 300;
/** Base UI `SELECTED_DELAY`: a release over a row commits only after the popup has been open this long, or after a drag. */
const PRESS_DRAG_MS = 400;
/** Base UI: a drag of 8px over the rows enables the release commit early. */
const PRESS_DRAG_PX = 8;
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
	| { type: "label"; label: string }
	| { type: "separator" };

/**
 * `inline` is the borderless, always-compact select of the "Make them yours"
 * card: it shows the picked item's icon and its popup opens against the
 * trigger's right edge. `bordered` and `borderless` are the docs' variants.
 */
export type SelectVariant = "bordered" | "borderless" | "inline";
export type SelectSize = "default" | "compact";

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
const SEPARATOR_HEIGHT = 9;

/** `border-destructive/50`. */
const destructiveHalf = () => withAlpha(color.destructive, 0.5);
/** `bg-border/60`. */
const separatorColor = () => color.borderFaint;

function isItem<Value extends string>(
	entry: SelectEntry<Value>,
): entry is SelectItem<Value> {
	return "value" in entry;
}

type Slot<Value extends string> =
	| { kind: "item"; row: SelectItem<Value>; index: number }
	| { kind: "label"; label: string }
	| { kind: "separator" };

function entryHeight<Value extends string>(
	entry: SelectEntry<Value>,
	spec: Spec,
) {
	if (isItem(entry)) return spec.height;
	return "label" in entry ? LABEL_HEIGHT : SEPARATOR_HEIGHT;
}

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
	/** The popup is as wide as the trigger, or this, whichever is larger. */
	popupWidth?: number;
}) {
	const renderer = useGpuixRequired();
	const variant = () => props.variant ?? "inline";
	const inline = () => variant() === "inline";
	const spec = () => specs[props.size ?? "default"];
	const triggerSpec = (): Spec =>
		inline()
			? {
					...specs.compact,
					text: scale.body,
					padX: 8,
					gap: 6,
					minWidth: 0,
				}
			: spec();

	const presence = createPresence(POPUP_EXIT_FALLBACK_MS);
	const hover = createFluidHover({
		isItemDisabled: (index) => rows()[index]?.disabled === true,
	});
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	const [side, setSide] = createSignal<"top" | "bottom">("bottom");
	const [maxHeight, setMaxHeight] = createSignal(POPUP_MAX_HEIGHT);
	const [popupWidth, setPopupWidth] = createSignal(0);
	/** Set by a pick, so only a check that arrives after the open fades in. */
	const [picked, setPicked] = createSignal(false);
	const [ownValue, setOwnValue] = createSignal<Value | null>(
		props.defaultValue ?? null,
	);
	const value = () => (props.value === undefined ? ownValue() : props.value);
	let triggerWrapper: HostElement | undefined;
	let triggerElement: HostElement | undefined;
	let popupElement: HostElement | undefined;
	let scroller: HostElement | undefined;
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
	const listHeight = () =>
		props.items.reduce(
			(sum, entry) => sum + entryHeight(entry, spec()),
			2 * POPUP_PADDING + 2,
		);

	const commitValue = (row: SelectItem<Value>) => {
		if (props.value === undefined) setOwnValue(() => row.value);
		props.onValueChange?.(row.value);
	};
	const firstEnabled = () => rows().findIndex((row) => row.disabled !== true);
	const lastEnabled = () => {
		const all = rows();
		for (let index = all.length - 1; index >= 0; index--) {
			if (all[index].disabled !== true) return index;
		}
		return -1;
	};

	const typeahead = createTypeahead({
		labels: () => rows().map((row) => row.label),
		current: () => (selectedIndex() === -1 ? hover.activeIndex() : selectedIndex()),
		isDisabled: (index) => rows()[index].disabled === true,
		onMatch: (index) => {
			// Closed, Base UI commits the match as the value and does not open.
			if (!presence.open()) {
				commitValue(rows()[index]);
				return;
			}
			hover.setActiveIndex(index);
			revealIndex(index);
		},
	});
	onCleanup(typeahead.reset);

	/** Where the highlight starts: the picked row; else, for a keyboard open, the first (or last) enabled one. */
	const openHighlight = (from: "pointer" | "down" | "up") => {
		if (selectedIndex() !== -1) return selectedIndex();
		if (from === "pointer") return null;
		const index = from === "down" ? firstEnabled() : lastEnabled();
		return index === -1 ? null : index;
	};
	const open = (from: "pointer" | "down" | "up" = "pointer") => {
		if (props.disabled === true || presence.open()) return;
		if (triggerWrapper === undefined) throw new Error("Select is not mounted");
		const placement = placePopup(
			triggerWrapper,
			Math.min(POPUP_MAX_HEIGHT, listHeight()),
			POPUP_MAX_HEIGHT,
		);
		setSide(placement.side);
		setMaxHeight(placement.maxHeight);
		setPopupWidth(Math.max(placement.triggerWidth, props.popupWidth ?? 0));
		setPicked(false);
		revealOnMeasure = true;
		openedAt = performance.now();
		pressedIndex = null;
		dragY = 0;
		dragFromY = undefined;
		dragCommits = false;
		typeahead.reset();
		presence.show();
		hover.setActiveIndex(openHighlight(from));
	};
	/**
	 * Base UI hands focus back to the trigger unless it moved somewhere else
	 * (an outside press on another control keeps that control's focus).
	 */
	const returnFocus = () => {
		setTimeout(() => {
			if (triggerElement === undefined || !triggerElement.mounted) return;
			const focused = renderer.getFocusedElementId?.() ?? null;
			if (focused === null) renderer.focusElement?.(triggerElement.id);
		}, 0);
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
		setPicked(true);
		commitValue(row);
		clearTimeout(ackTimer);
		ackTimer = setTimeout(close, ACK_MS);
	};

	const revealIndex = (index: number) => {
		const row = hover.rects()[index];
		if (scroller === undefined) throw new Error("Select list is not mounted");
		if (row !== undefined) revealRow(scroller, row, "nearest", POPUP_PADDING);
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
		hover.setActiveIndex(next);
		revealIndex(next);
	};
	const jump = (index: number) => {
		hover.setActiveIndex(index);
		revealIndex(index);
	};
	const onKeyDown = (event: KeyEvent) => {
		const modifiers = event.modifiers;
		if (modifiers !== undefined && (modifiers.ctrl || modifiers.alt || modifiers.cmd)) {
			return;
		}
		// Typeahead first: Space inside a session continues it instead of opening or picking.
		if (typeahead.handleKey(event)) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		switch (event.key) {
			case "enter":
			case "space": {
				if (!presence.open()) {
					open("down");
					return;
				}
				const index = hover.activeIndex();
				if (index !== null) pick(rows()[index]);
				return;
			}
			case "down":
				event.preventDefault();
				event.stopPropagation();
				if (presence.open()) move(1);
				else open("down");
				return;
			case "up":
				event.preventDefault();
				event.stopPropagation();
				if (presence.open()) move(-1);
				else open("up");
				return;
			case "home":
			case "end":
				if (!presence.open() || rows().length === 0) return;
				event.preventDefault();
				event.stopPropagation();
				jump(event.key === "home" ? 0 : rows().length - 1);
				return;
			case "escape":
				// Closing pops the popup's dismiss layer before the window sees this Escape, which would then close the dialog behind.
				if (presence.open()) event.preventDefault();
				close();
				return;
			case "tab":
				close();
				return;
		}
	};
	const onTriggerMouseDown = (event: EventPayload) => {
		if (event.button !== undefined && event.button !== 0) return;
		if (presence.open()) close();
		else open("pointer");
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
	const onListMouseMove = (event: EventPayload) => {
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
	/** A pick moved the checked row; the highlight follows the pointer again. */
	createEffect(() => {
		if (!presence.mounted()) hover.setActiveIndex(null);
	});

	const rectOf = (index: number | null) => () => {
		if (index === null || index === -1 || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const hoverRect = () => rectOf(hover.activeIndex())();
	const onOutside = (event: EventPayload) => {
		if (!isInside(event, [triggerWrapper, popupElement])) close();
	};

	const triggerIcon = (): IconRef | undefined => {
		if (inline()) return selected()?.icon;
		return props.icon;
	};
	const borderColor = () => {
		if (variant() === "bordered") {
			return props.error === undefined ? color.border : destructiveHalf();
		}
		return color.transparent;
	};

	/** Index of each item among the items only, which is what the highlight and the keyboard use. */
	const indexed = createMemo((): Slot<Value>[] => {
		let itemIndex = 0;
		return props.items.map((entry) => {
			if (isItem(entry)) return { kind: "item", row: entry, index: itemIndex++ };
			if ("label" in entry) return { kind: "label", label: entry.label };
			return { kind: "separator" };
		});
	});

	const renderSlot = (slot: Slot<Value>): JSX.Element => {
		switch (slot.kind) {
			case "item":
				return (
					<Row
						row={slot.row}
						index={slot.index}
						spec={spec()}
						lit={
							hover.activeIndex() === slot.index || value() === slot.row.value
						}
						checked={value() === slot.row.value}
						fadeCheck={picked()}
						hover={hover}
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-option-${slot.row.value}`
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
			case "label":
				return (
					<div
						style={{
							height: LABEL_HEIGHT,
							flexShrink: 0,
							display: "flex",
							alignItems: "center",
							paddingLeft: 8,
							paddingRight: 8,
						}}
					>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							{slot.label}
						</text>
					</div>
				);
			case "separator":
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
				display: "flex",
				flexDirection: "column",
				flexShrink: 0,
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? "none" : "auto",
			}}
		>
			<div
				ref={(element) => {
					triggerWrapper = element;
				}}
				testId={props.testId}
				onMouseDownOutside={onOutside}
				style={{ position: "relative" }}
			>
				<div
					ref={(element) => {
						triggerElement = element;
					}}
					role="combobox"
					aria-expanded={presence.open()}
					tabIndex={props.disabled === true ? -1 : 0}
					onMouseDown={onTriggerMouseDown}
					onKeyDown={onKeyDown}
					onMouseEnter={() => setTriggerHovered(true)}
					onMouseLeave={() => setTriggerHovered(false)}
					style={{
						height: triggerSpec().height,
						minWidth: triggerSpec().minWidth,
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						justifyContent: "space-between",
						gap: triggerSpec().gap,
						paddingLeft: triggerSpec().padX,
						paddingRight: inline() ? 6 : triggerSpec().padX,
						borderWidth: inline() ? 0 : 1,
						borderColor: borderColor(),
						borderRadius: radius.item,
						cursor: "pointer",
						keyboardFocusDim: false,
						hover: { backgroundColor: color.hover },
						active: { backgroundColor: color.active },
						focusVisible: focusRing(0),
					}}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: triggerSpec().gap,
							minWidth: 0,
							flexGrow: inline() ? 0 : 1,
						}}
					>
						<Show when={triggerIcon()}>
							{(name: Accessor<IconRef>) => (
								<Icon
									name={name()}
									size={triggerSpec().icon}
									strokeWidth={inline() || triggerHovered() ? 2 : 1.5}
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
								whiteSpace: "nowrap",
								textOverflow: "ellipsis",
								overflow: "hidden",
								color:
									selected() === undefined
										? color.mutedForeground
										: color.foreground,
							}}
						>
							{selected()?.label ?? props.placeholder ?? "Select…"}
						</text>
					</div>
					<Icon
						name="chevron-down"
						size={triggerSpec().icon}
						strokeWidth={2}
						color={triggerHovered() ? color.foreground : color.mutedForeground}
					/>
				</div>
				<PopupSurface
					presence={presence}
					side={side()}
					align={inline() ? "end" : "start"}
					width={inline() ? (props.popupWidth ?? 160) : popupWidth()}
					maxHeight={maxHeight()}
					onDismiss={close}
					onMouseDownOutside={onOutside}
					popupRef={(element) => {
						popupElement = element;
					}}
				>
					<div
						ref={(element) => {
							scroller = element;
						}}
						role="listbox"
						onScroll={hover.handlers.onScroll}
						style={{
							display: "flex",
							flexDirection: "column",
							overflowY: "scroll",
							maxHeight: maxHeight() - 2,
						}}
					>
						{/* The overlays live inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
						<div
							{...hover.containerProps}
							onMouseMove={onListMouseMove}
							style={{
								position: "relative",
								display: "flex",
								flexDirection: "column",
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
							<For each={indexed()}>{(slot) => renderSlot(slot)}</For>
						</div>
					</div>
				</PopupSurface>
			</div>
			<Show when={props.error}>
				{(message: Accessor<string>) => (
					<div style={{ paddingLeft: 12, paddingTop: 4 }}>
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
	fadeCheck: boolean;
	hover: ReturnType<typeof createFluidHover>;
	testId?: string;
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
			}}
			role="option"
			testId={props.testId}
			aria-selected={props.checked}
			onMouseDown={props.onPress}
			onMouseUp={props.onRelease}
			onClick={props.onPick}
			style={{
				height: props.spec.height,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: props.spec.itemGap,
				paddingLeft: props.spec.itemPadX,
				paddingRight: props.spec.itemPadX,
				borderRadius: radius.item,
				cursor: "pointer",
				opacity: props.row.disabled === true ? 0.5 : 1,
				pointerEvents: props.row.disabled === true ? "none" : undefined,
			}}
		>
			<Show when={props.row.icon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={props.spec.icon}
						strokeWidth={props.lit ? 2 : 1.5}
						color={props.lit ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<text
				style={{
					...props.spec.text,
					flexGrow: 1,
					minWidth: 0,
					whiteSpace: "nowrap",
					textOverflow: "ellipsis",
					overflow: "hidden",
					color: props.lit ? color.foreground : color.mutedForeground,
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
				<Show when={props.checked}>
					<motion.div
						initial={props.fadeCheck ? { opacity: 0 } : false}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.08, ease: "easeOut" }}
					>
						<Icon
							name="check"
							size={props.spec.icon}
							strokeWidth={2}
							color={color.foreground}
						/>
					</motion.div>
				</Show>
			</div>
		</div>
	);
}
