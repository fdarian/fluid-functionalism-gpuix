import {
	buttonProps,
	type EventPayload,
	type HostElement,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	createUniqueId,
	type JSX,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "../lib/fluid-hover";
import {
	createFocusRing,
	FocusRing,
	type FocusRingState,
} from "../lib/focus-ring";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { edgeIndex, moveIndex } from "../lib/list-nav";
import { createMeasuredHeight } from "../lib/measured-height";
import { StableLabel } from "../lib/stable-label";
import {
	color,
	height,
	shape,
	type as scale,
	trackMs,
	motion as tween,
	weight,
} from "../lib/theme";

export const SIDEBAR_WIDTH = 256;

// ─── Menu scope ──────────────────────────────────────────────────────────────
//
// One scope per SidebarMenu: a single fluid-hover system plus the traveling
// overlays (hover background, one active background per nesting level) that
// glide between every row, sub-menu rows included.

interface RowEntry {
	level: 0 | 1;
	active: () => boolean;
	disabled: () => boolean;
	element: HostElement;
}

type KeyStep = "next" | "previous" | "first" | "last";

interface MenuScope {
	hover: FluidHover;
	focusRing: FocusRingState;
	registerRow: (entry: RowEntry) => number;
	/** A sub-menu is changing height: rows reflow every frame and the overlays must follow without gliding. */
	trackReflow: (ms: number) => void;
	/** Roving tabindex: the active rows are the tab stops, or the first row while none is active. */
	isTabStop: (index: number | undefined) => boolean;
	focusRow: (index: number, event: EventPayload) => void;
	blurRow: (index: number) => void;
	focusSibling: (index: number, step: KeyStep) => void;
}

const MenuScopeContext = createContext<MenuScope>();

function useMenuScope() {
	const scope = useContext(MenuScopeContext);
	if (scope === undefined) throw new Error("Must be used inside SidebarMenu");
	return scope;
}

export function SidebarMenu(props: { children: JSX.Element; testId?: string }) {
	const renderer = useGpuixRequired();
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

	const focusRing = createFocusRing(hover);
	let mouseInside = false;
	const isDisabled = (index: number) => {
		const row = rows.get(index);
		if (row === undefined) throw new Error(`No row registered at ${index}`);
		return row.disabled();
	};
	const registeredIndices = () => [...rows.keys()].sort((a, b) => a - b);
	const edgeRegistered = (edge: "first" | "last") => {
		const indices = registeredIndices();
		const position = edgeIndex(edge, indices.length, (at) =>
			isDisabled(indices[at]),
		);
		return position === null ? null : indices[position];
	};
	const moveRegistered = (index: number, delta: 1 | -1) => {
		const indices = registeredIndices();
		const from = indices.indexOf(index);
		if (from === -1) throw new Error(`No row registered at ${index}`);
		const position = moveIndex(from, delta, indices.length, (at) =>
			isDisabled(indices[at]),
		);
		return position === null ? null : indices[position];
	};

	const scope: MenuScope = {
		hover,
		focusRing,
		isTabStop(index) {
			rowsVersion();
			if (index === undefined || isDisabled(index)) return false;
			if (rows.get(index)?.active()) return true;
			for (const entry of rows.values()) {
				if (entry.active() && !entry.disabled()) return false;
			}
			return edgeRegistered("first") === index;
		},
		focusRow(index, event) {
			hover.setActiveIndex(index);
			focusRing.focus(index, event);
		},
		blurRow(index) {
			focusRing.blur(index);
			// Focus moving to a sibling row arrives as its focus right after this blur.
			queueMicrotask(() => {
				const focused = renderer.getFocusedElementId?.();
				for (const row of rows.values()) {
					if (row.element.id === focused) return;
				}
				if (!mouseInside) hover.setActiveIndex(null);
			});
		},
		focusSibling(index, step) {
			const target =
				step === "first" || step === "last"
					? edgeRegistered(step)
					: moveRegistered(index, step === "next" ? 1 : -1);
			if (target === null) return;
			const row = rows.get(target);
			if (row === undefined) throw new Error(`No row registered at ${target}`);
			// The element's own focus() scrolls the row into view like a browser; the renderer's focusElement does not.
			row.element.focus();
		},
		registerRow(entry) {
			const index = nextIndex++;
			rows.set(index, entry);
			hover.registerItem(index, entry.element);
			setRowsVersion(rowsVersion() + 1);
			// A removed row must leave the map: the active overlay returns at the first entry that claims to be active.
			onCleanup(() => {
				rows.delete(index);
				setRowsVersion(rowsVersion() + 1);
			});
			return index;
		},
		trackReflow(ms) {
			clearTimeout(reflowTimer);
			setReflow(true);
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
				testId={props.testId}
				{...hover.containerProps}
				onMouseEnter={() => {
					mouseInside = true;
					hover.handlers.onMouseEnter();
				}}
				onMouseLeave={() => {
					mouseInside = false;
					hover.handlers.onMouseLeave();
				}}
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
					radius={shape.bg}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
					travel={() => !reflow()}
				/>
				<FluidHighlight
					rect={activeRect(1)}
					session={() => 0}
					radius={shape.bg}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
					travel={() => !reflow()}
				/>
				<FluidHighlight
					rect={hoverRect}
					session={hover.session}
					radius={shape.bg}
					background={color.hover}
					travel={() => !reflow()}
				/>
				<FocusRing
					ring={focusRing}
					radius={shape.focusRing}
					testId={props.testId && `${props.testId}-focus-ring`}
					travel={() => !reflow()}
				/>
				{props.children}
			</div>
		</MenuScopeContext.Provider>
	);
}

// ─── Rows ────────────────────────────────────────────────────────────────────

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
	const renderer = useGpuixRequired();
	const level = props.level ?? 0;
	let rowElement: HostElement | undefined;
	const [index, setIndex] = createSignal<number>();
	onMount(() => {
		if (rowElement === undefined) throw new Error("Row is not mounted");
		setIndex(
			scope.registerRow({
				level,
				active: () => props.active === true,
				disabled: isDisabled,
				element: rowElement,
			}),
		);
	});
	const isDisabled = () => props.disabled?.() === true;
	// Arrows, Home and End move over every visible row in order; the keys the source does not bind are left alone.
	const onKeyDown = (event: KeyEvent) => {
		const own = index();
		if (own === undefined) return;
		const step = (
			{
				ArrowDown: "next",
				ArrowRight: "next",
				ArrowUp: "previous",
				ArrowLeft: "previous",
				Home: "first",
				End: "last",
			} as const
		)[event.key as "ArrowDown"];
		if (step === undefined) return;
		event.preventDefault();
		event.stopPropagation();
		scope.focusSibling(own, step);
	};
	const isHovered = () => {
		const own = index();
		return own !== undefined && scope.hover.activeIndex() === own;
	};
	const lit = () => props.active === true || isHovered();
	const rowHeight = level === 0 ? height.menuRow : height.menuSubRow;
	// Trailing reservation: the badge's 24px slot, its 8px inset and a 4px gap.
	const paddingRight = () => (props.badge === undefined ? 8 : 36);

	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			{...buttonProps(
				{
					get disabled() {
						return isDisabled();
					},
					onClick: props.onClick,
					onKeyDown,
					get tabIndex() {
						return scope.isTabStop(index()) ? 0 : -1;
					},
				},
				renderer,
			)}
			id={createUniqueId()}
			testId={props.testId}
			aria-current={props.active === true ? "page" : undefined}
			onFocus={(event: EventPayload) => {
				const own = index();
				if (own !== undefined) scope.focusRow(own, event);
			}}
			onBlur={() => {
				const own = index();
				if (own !== undefined) scope.blurRow(own);
			}}
			style={{
				position: "relative",
				height: rowHeight,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 8,
				paddingRight: paddingRight(),
				borderRadius: shape.item,
				cursor: "pointer",
				userSelect: "none",
				// The menu's one shared ring is drawn by SidebarMenu.
				keyboardFocusDim: false,
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
			<StableLabel
				testId={
					props.testId === undefined ? undefined : `${props.testId}-label`
				}
				text={props.label}
				heavy={props.active === true}
				truncate
				color={lit() ? color.foreground : color.mutedForeground}
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
		if (contentHeight() !== undefined) scope.trackReflow(trackMs.spring);
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
				onLayout={measured.onLayout}
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

export function Sidebar(props: {
	children: JSX.Element;
	/** Rounds the left corners, for a sidebar whose fill meets a rounded container's corners. */
	leftCornerRadius?: number;
}) {
	return (
		<div
			style={{
				width: SIDEBAR_WIDTH,
				height: "100%",
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				backgroundColor: color.background,
				borderTopLeftRadius: props.leftCornerRadius,
				borderBottomLeftRadius: props.leftCornerRadius,
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

export function SidebarFooter(props: { children: JSX.Element; flushBottom?: boolean }) {
	return (
		<div
			style={{
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				gap: 8,
				padding: 8,
				// A callout alone in the footer sits on the rail's bottom edge.
				paddingBottom: props.flushBottom === true ? 0 : 8,
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
				borderRadius: shape.input,
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
					borderRadius: shape.input,
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
