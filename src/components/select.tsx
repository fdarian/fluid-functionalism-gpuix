import {
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
import { createFluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { createPresence, POPUP_OFFSET, PopupSurface } from "../lib/popup";
import {
	color,
	radius,
	type as scale,
	scheme,
	motion as tween,
} from "../lib/theme";

/** How long a pick holds the popup open so the check and the checked background are seen arriving. */
const ACK_MS = 300;
const TYPEAHEAD_MS = 500;
const POPUP_MAX_HEIGHT = 300;
const POPUP_MARGIN = 8;
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

/** `border-destructive/50`, resolved: the palette has the solid colour only. */
const destructiveHalf = () =>
	scheme() === "light" ? "rgba(239,68,68,0.5)" : "rgba(252,165,165,0.5)";
/** `bg-border/60`. */
const separatorColor = () =>
	scheme() === "light" ? "rgba(23,23,23,0.072)" : "rgba(245,245,245,0.072)";

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
	value: Value | null;
	onValueChange: (value: Value) => void;
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

	const presence = createPresence();
	const hover = createFluidHover({
		isItemDisabled: (index) => rows()[index]?.disabled === true,
	});
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	const [popupHovered, setPopupHovered] = createSignal(false);
	const [side, setSide] = createSignal<"top" | "bottom">("bottom");
	const [popupWidth, setPopupWidth] = createSignal(0);
	/** Set by a pick, so only a check that arrives after the open fades in. */
	const [picked, setPicked] = createSignal(false);
	let triggerWrapper: HostElement | undefined;
	let scroller: HostElement | undefined;
	/** Set on open: the checked row is scrolled into view once its rect has been measured. */
	let revealOnMeasure = false;
	let ackTimer: ReturnType<typeof setTimeout> | undefined;
	let typeahead = "";
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => {
		clearTimeout(ackTimer);
		clearTimeout(typeaheadTimer);
	});

	const rows = createMemo(() => props.items.filter(isItem));
	const selectedIndex = () => {
		if (props.value === null) return -1;
		return rows().findIndex((row) => row.value === props.value);
	};
	const selected = () => {
		if (props.value === null) return undefined;
		const row = rows()[selectedIndex()];
		if (row === undefined) throw new Error(`No item for ${props.value}`);
		return row;
	};
	const listHeight = () =>
		props.items.reduce(
			(sum, entry) => sum + entryHeight(entry, spec()),
			2 * POPUP_PADDING + 2,
		);

	const open = () => {
		if (props.disabled === true || presence.open()) return;
		if (triggerWrapper === undefined) throw new Error("Select is not mounted");
		const field = renderer.getElementBounds?.(triggerWrapper.id);
		const window = renderer.getWindowSize?.();
		if (field == null || window === undefined) {
			throw new Error("Cannot place the popup without painted bounds");
		}
		const height = Math.min(POPUP_MAX_HEIGHT, listHeight());
		const roomBelow = window.height - (field.y + field.height);
		setSide(
			roomBelow >= height + POPUP_OFFSET + POPUP_MARGIN ? "bottom" : "top",
		);
		setPopupWidth(Math.max(field.width, props.popupWidth ?? 0));
		setPicked(false);
		revealOnMeasure = true;
		presence.show();
		hover.setActiveIndex(selectedIndex() === -1 ? null : selectedIndex());
	};
	const close = () => {
		clearTimeout(ackTimer);
		if (presence.open()) presence.hide();
	};
	const pick = (row: SelectItem<Value>) => {
		if (row.disabled === true) return;
		setPicked(true);
		props.onValueChange(row.value);
		clearTimeout(ackTimer);
		ackTimer = setTimeout(close, ACK_MS);
	};

	/**
	 * `scrollIntoView` only aligns a direct child of the scroller, and every
	 * row sits inside the overlay wrapper, so the offset is set by hand from the
	 * measured rects (which are in scrolled-content space).
	 */
	const revealRow = (index: number) => {
		const rect = hover.rects()[index];
		if (rect === undefined) return;
		if (scroller === undefined) throw new Error("Select list is not mounted");
		const view = renderer.getElementBounds?.(scroller.id);
		const offset = renderer.getScrollOffset?.(scroller.id);
		if (renderer.scrollTo === undefined) {
			throw new Error("This renderer does not expose scrollTo");
		}
		if (view == null || offset == null) {
			throw new Error("Cannot scroll the list without painted bounds");
		}
		const scrollTop = -offset[1];
		const bottom = rect.top + rect.height;
		if (rect.top >= scrollTop && bottom <= scrollTop + view.height) return;
		const target =
			rect.top < scrollTop
				? rect.top - POPUP_PADDING
				: bottom + POPUP_PADDING - view.height;
		renderer.scrollTo(scroller.id, 0, -Math.max(0, target));
	};

	const enabledAfter = (from: number, delta: 1 | -1) => {
		const all = rows();
		for (let step = 1; step <= all.length; step++) {
			const index = (from + delta * step + all.length * step) % all.length;
			if (all[index].disabled !== true) return index;
		}
		return null;
	};
	const move = (delta: 1 | -1) => {
		const current = hover.activeIndex() ?? (delta === 1 ? -1 : 0);
		const next = enabledAfter(current, delta);
		if (next === null) return;
		hover.setActiveIndex(next);
		revealRow(next);
	};
	const typeAhead = (char: string) => {
		clearTimeout(typeaheadTimer);
		typeahead += char.toLowerCase();
		typeaheadTimer = setTimeout(() => {
			typeahead = "";
		}, TYPEAHEAD_MS);
		const all = rows();
		const current = hover.activeIndex() ?? selectedIndex();
		const start = typeahead.length === 1 ? current + 1 : Math.max(current, 0);
		for (let step = 0; step < all.length; step++) {
			const index = (start + step) % all.length;
			const row = all[index];
			if (
				row.disabled !== true &&
				row.label.toLowerCase().startsWith(typeahead)
			) {
				if (!presence.open()) open();
				hover.setActiveIndex(index);
				revealRow(index);
				return;
			}
		}
	};
	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case "enter":
			case "space": {
				if (!presence.open()) {
					open();
					return;
				}
				const index = hover.activeIndex();
				if (index !== null) pick(rows()[index]);
				return;
			}
			case "down":
				if (presence.open()) move(1);
				else open();
				return;
			case "up":
				if (presence.open()) move(-1);
				else open();
				return;
			case "escape":
			case "tab":
				close();
				return;
		}
		if (event.key !== undefined && event.key.length === 1) {
			typeAhead(event.key);
		}
	};

	createEffect(
		on(hover.rects, () => {
			if (!revealOnMeasure) return;
			revealOnMeasure = false;
			if (selectedIndex() !== -1) revealRow(selectedIndex());
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
	const onOutside = () => {
		if (!triggerHovered() && !popupHovered()) close();
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
							hover.activeIndex() === slot.index || props.value === slot.row.value
						}
						checked={props.value === slot.row.value}
						fadeCheck={picked()}
						hover={hover}
						testId={
							props.testId === undefined
								? undefined
								: `${props.testId}-option-${slot.row.value}`
						}
						onPick={() => pick(slot.row)}
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
					// The first bounds read only switches tracking on: do it early so the popup can place itself on open.
					queueMicrotask(() => renderer.getElementBounds?.(element.id));
				}}
				testId={props.testId}
				onMouseDownOutside={onOutside}
				style={{ position: "relative" }}
			>
				<div
					role="button"
					aria-expanded={presence.open()}
					tabIndex={props.disabled === true ? -1 : 0}
					onClick={() => (presence.open() ? close() : open())}
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
						focusVisible: {
							outlineWidth: 1,
							outlineColor: color.focusRing,
							outlineOffset: 0,
						},
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
					maxHeight={POPUP_MAX_HEIGHT}
					onMouseDownOutside={onOutside}
					onHoverChange={setPopupHovered}
				>
					<div
						ref={(element) => {
							scroller = element;
						}}
						onScroll={hover.handlers.onScroll}
						style={{
							display: "flex",
							flexDirection: "column",
							overflowY: "scroll",
							maxHeight: POPUP_MAX_HEIGHT - 2,
						}}
					>
						{/* The overlays live inside the scrolled content: gpui paints an absolute child of a scroller where it was placed, not where the content has scrolled to. */}
						<div
							ref={(element) => {
								hover.containerRef(element);
								queueMicrotask(hover.remeasure);
							}}
							onMouseEnter={hover.handlers.onMouseEnter}
							onMouseMove={hover.handlers.onMouseMove}
							onMouseLeave={hover.handlers.onMouseLeave}
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
}): JSX.Element {
	let rowElement: HostElement | undefined;
	createEffect(() => {
		if (rowElement === undefined) throw new Error("Row is not mounted");
		props.hover.registerItem(props.index, rowElement);
	});
	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			role="option"
			testId={props.testId}
			aria-selected={props.checked}
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
