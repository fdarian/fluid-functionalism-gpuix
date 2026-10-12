import { type EventPayload, type HostElement, motion } from "@gpuix/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { createMeasuredHeight } from "../lib/measured-height";
import {
	color,
	height,
	radius,
	type as scale,
	motion as tween,
	weight,
} from "../lib/theme";

export const SIDEBAR_WIDTH = 256;

/** How long rows keep moving after a sub-menu toggles: the spring's perceived duration plus its tail. */
const SPRING_TRACK_MS = 400;

// ─── Menu scope ──────────────────────────────────────────────────────────────
//
// One scope per SidebarMenu: a single fluid-hover system plus the traveling
// overlays (hover background, one active background per nesting level) that
// glide between every row, sub-menu rows included.

interface RowEntry {
	level: 0 | 1;
	active: () => boolean;
	disabled: () => boolean;
}

interface MenuScope {
	hover: FluidHover;
	registerRow: (
		element: Parameters<FluidHover["registerItem"]>[1],
		entry: RowEntry,
	) => number;
	/** A sub-menu is changing height: rows reflow every frame and the overlays must follow without gliding. */
	trackReflow: (ms: number) => void;
}

const MenuScopeContext = createContext<MenuScope>();

function useMenuScope() {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) throw new Error("Must be used inside SidebarMenu");
	return scope;
}

export function SidebarMenu(props: { children: JSX.Element }) {
	const rows = new Map<number, RowEntry>();
	const [rowsVersion, setRowsVersion] = createSignal(0);
	const [reflow, setReflow] = createSignal(false);
	let nextIndex = 0;
	let reflowTimer: ReturnType<typeof setTimeout> | undefined;

	const hover = createFluidHover({
		isItemDisabled: (index) => {
			const row = rows.get(index);
			if (row === undefined) throw new Error(`No row registered at ${index}`);
			return row.disabled();
		},
	});

	const scope: MenuScope = {
		hover,
		registerRow(element, entry) {
			const index = nextIndex++;
			rows.set(index, entry);
			hover.registerItem(index, element);
			setRowsVersion(rowsVersion() + 1);
			return index;
		},
		trackReflow(ms) {
			clearTimeout(reflowTimer);
			setReflow(true);
			hover.remeasureFor(ms);
			reflowTimer = setTimeout(() => setReflow(false), ms + 48);
		},
	};

	const activeRect = (level: 0 | 1) => () => {
		rowsVersion();
		if (!hover.isMeasured()) return null;
		for (const [index, entry] of rows) {
			if (entry.level === level && entry.active() && !entry.disabled()) {
				return hover.rects()[index] ?? null;
			}
		}
		return null;
	};
	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<MenuScopeContext.Provider value={scope}>
			<div
				{...hover.containerProps}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					minWidth: 0,
				}}
			>
				{/* Overlays first: no zIndex in gpuix, so rows paint over them by document order. */}
				<FluidHighlight
					rect={activeRect(0)}
					session={() => 0}
					radius={radius.item}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
					travel={() => !reflow()}
				/>
				<FluidHighlight
					rect={activeRect(1)}
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
				{props.children}
			</div>
		</MenuScopeContext.Provider>
	);
}

// ─── Rows ────────────────────────────────────────────────────────────────────

/** Row label that keeps its width when the weight steps up: a hidden copy at the heavy weight reserves the space. */
function RowLabel(props: {
	testId?: string;
	text: string;
	lit: boolean;
	emphasized: boolean;
	grow: boolean;
}) {
	const textStyle = (heavy: boolean) => ({
		...scale.body,
		fontWeight: heavy ? weight.semibold : weight.normal,
		whiteSpace: "nowrap" as const,
	});
	return (
		<div
			style={{
				position: "relative",
				flexGrow: props.grow ? 1 : 0,
				minWidth: 0,
			}}
		>
			<text style={{ ...textStyle(true), opacity: 0 }}>{props.text}</text>
			<text
				testId={props.testId}
				style={{
					...textStyle(props.emphasized),
					position: "absolute",
					top: 0,
					left: 0,
					// An absolute box blocks the mouse by default, which would starve the menu's hover while the pointer is over the label.
					pointerEvents: "none",
					color: props.lit ? color.foreground : color.mutedForeground,
				}}
			>
				{props.text}
			</text>
		</div>
	);
}

export function SidebarMenuButton(props: {
	label: string;
	icon?: IconRef;
	/** A status dot after the label. */
	dot?: string;
	level?: 0 | 1;
	active?: boolean;
	badge?: string;
	/** A row clipped away by a collapsed sub-menu: stays registered, never a hover target. */
	disabled?: () => boolean;
	trailingIcon?: () => IconRef;
	onClick?: (event: EventPayload) => void;
	testId?: string;
}) {
	const scope = useMenuScope();
	const level = props.level ?? 0;
	let rowElement: HostElement | undefined;
	const [index, setIndex] = createSignal<number>();
	onMount(() => {
		if (rowElement === undefined) throw new Error("Row is not mounted");
		setIndex(
			scope.registerRow(rowElement, {
				level,
				active: () => props.active === true,
				disabled: props.disabled ?? (() => false),
			}),
		);
	});
	const isHovered = () => {
		const own = index();
		return own !== undefined && scope.hover.activeIndex() === own;
	};
	const lit = () => props.active === true || isHovered();
	const rowHeight = level === 0 ? height.menuRow : height.menuSubRow;
	// Trailing reservation: the badge's 24px slot, its 8px inset and a 4px gap.
	const paddingRight = props.badge === undefined ? 8 : 36;

	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			testId={props.testId}
			role="button"
			aria-current={props.active === true}
			onClick={props.onClick}
			style={{
				position: "relative",
				height: rowHeight,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 8,
				paddingRight,
				borderRadius: radius.item,
				cursor: "pointer",
				userSelect: "none",
			}}
		>
			<Show when={props.icon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={16}
						strokeWidth={lit() ? 2 : 1.5}
						color={lit() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<RowLabel
				testId={
					props.testId === undefined ? undefined : `${props.testId}-label`
				}
				text={props.label}
				lit={lit()}
				emphasized={props.active === true}
				grow={props.dot === undefined}
			/>
			<Show when={props.dot}>
				{(dot: Accessor<string>) => (
					<div
						style={{
							width: 6,
							height: 6,
							flexShrink: 0,
							borderRadius: 3,
							backgroundColor: dot(),
							pointerEvents: "none",
						}}
					/>
				)}
			</Show>
			<Show when={props.trailingIcon}>
				{(name: Accessor<() => IconRef>) => (
					<Icon
						name={name()()}
						size={16}
						strokeWidth={1.5}
						color={color.mutedForeground}
					/>
				)}
			</Show>
			<Show when={props.badge}>
				{(text: Accessor<string>) => (
					<div
						style={{
							position: "absolute",
							right: 8,
							top: 6,
							height: 20,
							minWidth: 20,
							paddingLeft: 4,
							paddingRight: 4,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							pointerEvents: "none",
						}}
					>
						<text
							style={{
								...scale.micro,
								fontWeight: props.active ? weight.semibold : weight.normal,
								color: props.active ? color.foreground : color.mutedForeground,
							}}
						>
							{text()}
						</text>
					</div>
				)}
			</Show>
		</div>
	);
}

/**
 * The sub-menu is not its own highlight scope: its rows register with the
 * surrounding SidebarMenu, so one hover background glides from a parent row
 * into its children. Height animates between 0 and the measured content.
 */
export function SidebarMenuSub(props: {
	open: boolean;
	children: JSX.Element;
}) {
	const scope = useMenuScope();
	const measured = createMeasuredHeight();
	const contentHeight = measured.height;

	createEffect(() => {
		props.open;
		if (contentHeight() !== undefined) scope.trackReflow(SPRING_TRACK_MS);
	});

	return (
		<motion.div
			initial={false}
			animate={{
				height: props.open ? (contentHeight() ?? 0) : 0,
				opacity: props.open ? 1 : 0,
			}}
			transition={props.open ? tween.moderate : tween.moderateExit}
			style={{
				overflow: "hidden",
				// Until the content is measured an open sub-menu keeps its natural height.
				...(contentHeight() === undefined ? { height: "auto" } : {}),
			}}
		>
			<div
				ref={measured.ref}
				style={{
					display: "flex",
					flexDirection: "column",
					// A margin, not a translate, so the rows' measured rects include it. 15 + 1px border + 8 + the row's own 8 puts a sub-row label on the parent label's x (32).
					marginLeft: 15,
					paddingLeft: 8,
					borderLeftWidth: 1,
					borderColor: color.border,
				}}
			>
				{props.children}
			</div>
		</motion.div>
	);
}

// ─── Structure ───────────────────────────────────────────────────────────────

export function Sidebar(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				width: SIDEBAR_WIDTH,
				height: "100%",
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				backgroundColor: color.background,
			}}
		>
			{props.children}
		</div>
	);
}

export function SidebarHeader(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: 8,
			}}
		>
			{props.children}
		</div>
	);
}

export function SidebarContent(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				flexGrow: 1,
				minHeight: 0,
				display: "flex",
				flexDirection: "column",
				padding: 8,
				paddingTop: 0,
				overflowY: "scroll",
			}}
		>
			{props.children}
		</div>
	);
}

export function SidebarGroupLabel(props: { children: string; count?: number }) {
	return (
		<div
			style={{
				height: height.groupLabel,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: 8,
				paddingRight: 8,
			}}
		>
			<text
				style={{ ...scale.caption, color: color.mutedForeground, flexGrow: 1 }}
			>
				{props.children}
			</text>
			<Show when={props.count}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.count}
				</text>
			</Show>
		</div>
	);
}

/** SidebarInput + the search-field block: icon on the rows' 16px axis, text from their 32px axis, shortcut chip on hover or focus. */
export function SidebarSearchField(props: {
	placeholder: string;
	shortcut: string;
}) {
	const [hovered, setHovered] = createSignal(false);
	const [focused, setFocused] = createSignal(false);
	const filled = () =>
		focused() ? color.card : hovered() ? color.mutedHalf : color.transparent;
	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: "relative",
				height: height.menuRow,
				flexShrink: 0,
				borderRadius: radius.item,
				backgroundColor: filled(),
				outlineWidth: 1,
				outlineColor: hovered() || focused() ? color.border : color.transparent,
				outlineOffset: 0,
			}}
		>
			<input
				placeholder={props.placeholder}
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
					width: "100%",
					height: height.menuRow,
					paddingLeft: 32,
					paddingRight: 48,
					fontSize: scale.body.fontSize,
					color: color.foreground,
					backgroundColor: color.transparent,
					keyboardFocusDim: false,
					borderRadius: radius.item,
				}}
			/>
			<div
				style={{
					position: "absolute",
					left: 8,
					top: 8,
					pointerEvents: "none",
				}}
			>
				<Icon
					name="search"
					size={16}
					strokeWidth={1.5}
					color={color.mutedForeground}
				/>
			</div>
			<div
				style={{
					position: "absolute",
					right: 8,
					top: 9,
					pointerEvents: "none",
					opacity: hovered() || focused() ? 1 : 0,
				}}
			>
				<text style={{ ...scale.micro, color: color.mutedForeground }}>
					{props.shortcut}
				</text>
			</div>
		</div>
	);
}
