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
	For,
	on,
	Show,
} from "solid-js";
import { FluidHighlight } from "./fluid-highlight";
import { createFluidHover } from "./fluid-hover";
import { Icon } from "./icon";
import type { IconName } from "./icons";
import {
	color,
	motion as tween,
	radius,
	shadow3,
	type as scale,
	weight,
} from "./theme";

const FIELD_HEIGHT = 36;
const ROW_HEIGHT = 36;
const POPUP_MAX_HEIGHT = 300;
const POPUP_OFFSET = 6;
/** Time the popup keeps painting its exit fade before unmounting. */
const EXIT_MS = 60;

function ClearButton(props: { onClick: () => void }) {
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			role="button"
			aria-label="Clear"
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

/**
 * Single-select Combobox from base/combobox.tsx: a text field that filters a
 * list as you type, a popup of fluid-hover rows, and a checked row whose
 * background glides between picks.
 */
export function Combobox(props: {
	items: readonly string[];
	value: string | null;
	onValueChange: (value: string | null) => void;
	icon?: IconName;
	placeholder?: string;
	width?: number;
	emptyText?: string;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const width = () => props.width ?? 280;

	const [open, setOpen] = createSignal(false);
	/** Whether the popup is still painted: it outlives `open` by the exit fade. */
	const [mounted, setMounted] = createSignal(false);
	const [inputText, setInputText] = createSignal(props.value ?? "");
	// What the list filters by. The text field shows the selected label while
	// closed, but opening it must still list every item.
	const [query, setQuery] = createSignal("");
	const [focused, setFocused] = createSignal(false);
	const [fieldHovered, setFieldHovered] = createSignal(false);
	const [popupHovered, setPopupHovered] = createSignal(false);
	const [chevronHovered, setChevronHovered] = createSignal(false);
	/** Armed while typing re-filters the rows under the highlights: those frames snap, not glide. */
	const [reflow, setReflow] = createSignal(false);

	let inputElement: HostElement | undefined;
	let exitTimer: ReturnType<typeof setTimeout> | undefined;
	const rowElements = new Map<number, HostElement>();

	const filtered = createMemo(() => {
		const needle = query().trim().toLowerCase();
		if (needle === "") return props.items;
		return props.items.filter((item) => item.toLowerCase().includes(needle));
	});
	const checkedIndex = createMemo(() => {
		const index = filtered().findIndex((item) => item === props.value);
		return index === -1 ? null : index;
	});

	const hover = createFluidHover({ scrolls: true });

	const openPopup = () => {
		if (open()) return;
		clearTimeout(exitTimer);
		setQuery("");
		setOpen(true);
		setMounted(true);
		hover.setActiveIndex(0);
	};
	const closePopup = () => {
		if (!open()) return;
		setOpen(false);
		setInputText(props.value ?? "");
		clearTimeout(exitTimer);
		exitTimer = setTimeout(() => setMounted(false), EXIT_MS);
	};
	const focusInput = () => {
		if (inputElement === undefined)
			throw new Error("Combobox input is not mounted");
		renderer.focusElement?.(inputElement.id);
	};
	const select = (item: string) => {
		props.onValueChange(item);
		setInputText(item);
		closePopup();
	};

	// Typing re-filters rows underneath the overlays, so the first row is the
	// target again and the new rects replace the old ones without a glide.
	createEffect(
		on(
			filtered,
			() => {
				if (!mounted()) return;
				setReflow(true);
				hover.setActiveIndex(filtered().length === 0 ? null : 0);
				hover.remeasure();
			},
			{ defer: true },
		),
	);
	createEffect(
		on(
			hover.rects,
			() => {
				if (reflow()) setTimeout(() => setReflow(false), 48);
			},
			{ defer: true },
		),
	);

	const move = (delta: number) => {
		const count = filtered().length;
		if (count === 0) return;
		const current = hover.activeIndex();
		const next =
			current === null
				? delta > 0
					? 0
					: count - 1
				: Math.min(count - 1, Math.max(0, current + delta));
		hover.setActiveIndex(next);
		rowElements.get(next)?.scrollIntoView();
	};

	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case "down":
				if (!open()) openPopup();
				else move(1);
				return;
			case "up":
				if (open()) move(-1);
				return;
			case "escape":
				closePopup();
				return;
			case "tab":
				closePopup();
				return;
		}
	};
	const onSubmit = () => {
		const index = hover.activeIndex();
		if (!open() || index === null) return;
		const item = filtered()[index];
		if (item !== undefined) select(item);
	};
	const onChange = (event: EventPayload) => {
		const text = event.value;
		if (text === undefined) throw new Error("Combobox change without a value");
		setInputText(text);
		if (!open()) {
			openPopup();
			// The popup just opened for this keystroke: filter immediately.
		}
		setQuery(text);
	};
	const onMouseDownOutside = () => {
		if (!fieldHovered() && !popupHovered()) closePopup();
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
	const clearable = () => inputText() !== "" || props.value !== null;

	return (
		<div
			testId={props.testId}
			onMouseDownOutside={onMouseDownOutside}
			style={{
				position: "relative",
				width: width(),
				height: FIELD_HEIGHT,
				flexShrink: 0,
			}}
		>
			<div
				onMouseEnter={() => setFieldHovered(true)}
				onMouseLeave={() => setFieldHovered(false)}
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
					onClick={() => {
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
						{(name: Accessor<IconName>) => (
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
						value={inputText()}
						placeholder={props.placeholder ?? "Search…"}
						theme={{
							text: color.foreground,
							textMuted: color.mutedForeground,
							textFaint: color.mutedForeground,
							textDim: color.mutedForeground,
							caret: color.foreground,
						}}
						onFocus={() => {
							setFocused(true);
							openPopup();
						}}
						onBlur={() => setFocused(false)}
						onChange={onChange}
						onKeyDown={onKeyDown}
						onSubmit={onSubmit}
						style={{
							flexGrow: 1,
							minWidth: 0,
							height: 24,
							fontSize: scale.body.fontSize,
							fontWeight: weight.normal,
							color: color.foreground,
							backgroundColor: color.transparent,
						}}
					/>
				</div>
				{/* The clear slot is always reserved so the field never changes width. */}
				<div style={{ width: 24, height: 24, flexShrink: 0 }}>
					<Show when={clearable()}>
						<ClearButton
							onClick={() => {
								props.onValueChange(null);
								setInputText("");
								setQuery("");
								focusInput();
							}}
						/>
					</Show>
				</div>
				<div
					role="button"
					aria-label="Open"
					onMouseEnter={() => setChevronHovered(true)}
					onMouseLeave={() => setChevronHovered(false)}
					onClick={() => {
						if (open()) closePopup();
						else {
							focusInput();
							openPopup();
						}
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

			<Show when={mounted()}>
				<anchored
					side="bottom"
					align="start"
					gap={POPUP_OFFSET}
					deferred
					priority={1}
					occlude
					onMouseDownOutside={onMouseDownOutside}
					style={{ backgroundColor: color.transparent }}
				>
					<motion.div
						initial={{ opacity: 0, top: -4 }}
						animate={open() ? { opacity: 1, top: 0 } : { opacity: 0, top: -4 }}
						transition={open() ? tween.fast : tween.fastExit}
						onMouseEnter={() => setPopupHovered(true)}
						onMouseLeave={() => setPopupHovered(false)}
						style={{
							position: "relative",
							width: width(),
							display: "flex",
							flexDirection: "column",
							backgroundColor: color.card,
							borderRadius: radius.container,
							borderWidth: 1,
							borderColor: "rgba(0,0,0,0.06)",
							boxShadow: shadow3,
							overflow: "hidden",
							maxHeight: POPUP_MAX_HEIGHT,
						}}
					>
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
									padding: 4,
									overflowY: "scroll",
									maxHeight: POPUP_MAX_HEIGHT - 2,
								}}
							>
								<FluidHighlight
									rect={checkedRect}
									session={() => 0}
									radius={radius.item}
									background={color.active}
									glide={tween.moderate}
									fade={tween.moderateExit}
									travel={() => !reflow()}
								/>
								<FluidHighlight
									rect={hoverRect}
									session={hover.session}
									radius={radius.item}
									background={color.hover}
									travel={() => !reflow()}
								/>
								<For each={filtered()}>
									{(item, index) => {
										const lit = () =>
											hover.activeIndex() === index() || props.value === item;
										return (
											<div
												ref={(element) => {
													createEffect(() => {
														const i = index();
														hover.registerItem(i, element);
														rowElements.set(i, element);
													});
												}}
												role="option"
												aria-selected={props.value === item}
												onClick={() => select(item)}
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
												}}
											>
												<text
													style={{
														flexGrow: 1,
														minWidth: 0,
														...scale.body,
														color: lit()
															? color.foreground
															: color.mutedForeground,
														whiteSpace: "nowrap",
														textOverflow: "ellipsis",
														overflow: "hidden",
													}}
												>
													{item}
												</text>
												<div style={{ width: 16, height: 16, flexShrink: 0 }}>
													<Show when={props.value === item}>
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
						</Show>
					</motion.div>
				</anchored>
			</Show>
		</div>
	);
}
