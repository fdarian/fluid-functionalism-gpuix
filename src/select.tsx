import type { HostElement, KeyEvent } from "@gpuix/solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { FluidHighlight } from "./fluid-highlight";
import { createFluidHover } from "./fluid-hover";
import { Icon } from "./icon";
import type { IconName } from "./icons";
import { createPresence, PopupSurface } from "./popup";
import { color, radius, type as scale, motion as tween } from "./theme";

const ROW_HEIGHT = 36;
const POPUP_WIDTH = 160;

export interface SelectItem<Value extends string> {
	value: Value;
	label: string;
	icon: IconName;
}

/**
 * The borderless select from the "Make them yours" card: icon, label and
 * chevron in the trigger, and a small popup whose rows share the fluid hover.
 */
export function Select<Value extends string>(props: {
	items: readonly SelectItem<Value>[];
	value: Value;
	onValueChange: (value: Value) => void;
	testId?: string;
}) {
	const presence = createPresence();
	const hover = createFluidHover();
	const [triggerHovered, setTriggerHovered] = createSignal(false);
	const [popupHovered, setPopupHovered] = createSignal(false);

	const selectedIndex = () =>
		props.items.findIndex((item) => item.value === props.value);
	const selected = () => {
		const item = props.items[selectedIndex()];
		if (item === undefined) throw new Error(`No item for ${props.value}`);
		return item;
	};

	const open = () => {
		if (presence.open()) return;
		presence.show();
		hover.setActiveIndex(selectedIndex());
	};
	const close = () => {
		if (presence.open()) presence.hide();
	};
	const pick = (item: SelectItem<Value>) => {
		props.onValueChange(item.value);
		close();
	};

	const move = (delta: number) => {
		const current = hover.activeIndex() ?? selectedIndex();
		const next = Math.min(props.items.length - 1, Math.max(0, current + delta));
		hover.setActiveIndex(next);
	};
	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case "enter":
			case "space":
				if (!presence.open()) {
					open();
					return;
				}
				{
					const index = hover.activeIndex();
					if (index !== null) pick(props.items[index]);
				}
				return;
			case "down":
				if (presence.open()) move(1);
				else open();
				return;
			case "up":
				if (presence.open()) move(-1);
				return;
			case "escape":
			case "tab":
				close();
				return;
		}
	};

	const rectOf = (index: number | null) => () => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const hoverRect = () => rectOf(hover.activeIndex())();

	return (
		<div
			testId={props.testId}
			onMouseDownOutside={() => {
				if (!triggerHovered() && !popupHovered()) close();
			}}
			style={{ position: "relative" }}
		>
			<div
				role="button"
				tabIndex={0}
				onClick={() => (presence.open() ? close() : open())}
				onKeyDown={onKeyDown}
				onMouseEnter={() => setTriggerHovered(true)}
				onMouseLeave={() => setTriggerHovered(false)}
				style={{
					height: 28,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
					paddingLeft: 8,
					paddingRight: 6,
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
				<Icon
					name={selected().icon}
					size={14}
					strokeWidth={1.5}
					color={color.foreground}
				/>
				<text style={{ ...scale.body, color: color.foreground }}>
					{selected().label}
				</text>
				<Icon
					name="chevron-down"
					size={14}
					strokeWidth={2}
					color={triggerHovered() ? color.foreground : color.mutedForeground}
				/>
			</div>
			<PopupSurface
				presence={presence}
				align="end"
				width={POPUP_WIDTH}
				onMouseDownOutside={() => {
					if (!triggerHovered() && !popupHovered()) close();
				}}
				onHoverChange={setPopupHovered}
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
					<For each={props.items}>
						{(item, index) => {
							const lit = () =>
								hover.activeIndex() === index() || props.value === item.value;
							let rowElement: HostElement | undefined;
							createEffect(() => {
								if (rowElement === undefined)
									throw new Error("Row is not mounted");
								hover.registerItem(index(), rowElement);
							});
							return (
								<div
									ref={(element) => {
										rowElement = element;
									}}
									role="option"
									onClick={() => pick(item)}
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
									<Icon
										name={item.icon}
										size={16}
										strokeWidth={lit() ? 2 : 1.5}
										color={lit() ? color.foreground : color.mutedForeground}
									/>
									<text
										style={{
											...scale.body,
											flexGrow: 1,
											color: lit() ? color.foreground : color.mutedForeground,
										}}
									>
										{item.label}
									</text>
									<div style={{ width: 16, height: 16, flexShrink: 0 }}>
										<Show when={props.value === item.value}>
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
			</PopupSurface>
		</div>
	);
}
