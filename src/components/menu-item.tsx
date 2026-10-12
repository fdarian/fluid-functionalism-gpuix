import { type HostElement, motion } from "@gpuix/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	type JSX,
	onCleanup,
	onMount,
	Show,
	useContext,
} from "solid-js";
import { StableLabel } from "../lib/stable-label";
import { useHoverItem } from "../lib/fluid-hover";
import type { FluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import {
	color,
	height,
	radius,
	type as scale,
	scheme,
	weight,
} from "../lib/theme";

/** What the keyboard needs to know about a row the pointer would otherwise be the only one to reach. */
export interface MenuRow {
	label: string;
	disabled: () => boolean;
	activate: () => void;
	/** ArrowRight on a submenu trigger. */
	openSubmenu?: () => void;
}

export interface DropdownContextValue {
	hover: FluidHover;
	checkedIndex: Accessor<number | undefined>;
	/** `checkedIndices` was given: rows are checkboxes and stay open on select. */
	multiple: Accessor<boolean>;
	rows: Map<number, MenuRow>;
	/** The highlight is where the pointer put it, not the keyboard or the open itself. */
	pointerLit: Accessor<boolean>;
	/** A row mounted or went: the measured rects are stale. */
	rowsChanged: () => void;
	/** Closes the whole menu. A no-op for the inline panel. */
	close: () => void;
}

export const DropdownContext = createContext<DropdownContextValue>();

export function useDropdown() {
	const context = useContext(DropdownContext);
	if (context === undefined) {
		throw new Error("useDropdown must be used within a Dropdown");
	}
	return context;
}

/** `bg-border/60`. */
export const separatorColor = () => color.borderFaint;

export function DropdownLabel(props: { children: string }) {
	return (
		<div
			style={{
				height: 28,
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				paddingLeft: 8,
				paddingRight: 8,
			}}
		>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.children}
			</text>
		</div>
	);
}

export function DropdownSeparator() {
	return (
		<div
			style={{
				height: 1,
				flexShrink: 0,
				marginTop: 4,
				marginBottom: 4,
				marginLeft: -4,
				marginRight: -4,
				backgroundColor: separatorColor(),
			}}
		/>
	);
}

export function MenuItem(props: {
	icon?: IconRef;
	label: string;
	index: number;
	/** Set it, even to `false`, for a radio row (or a checkbox row under `checkedIndices`). Leave it out for a plain action. */
	checked?: boolean;
	onSelect?: () => void;
	disabled?: boolean;
	/** Popup only: close on select. Defaults to `false` under `checkedIndices`. */
	closeOnClick?: boolean;
	/** A submenu trigger's trailing chevron. */
	chevron?: boolean;
	/** ArrowRight on a submenu trigger. */
	onOpenSubmenu?: () => void;
	testId?: string;
	/** A submenu popup anchors to its trigger row, so it is the row's child. */
	children?: JSX.Element;
}) {
	const context = useDropdown();
	let rowElement: HostElement | undefined;
	let settled = false;
	onMount(() => {
		settled = true;
	});

	const activate = () => {
		if (props.disabled === true) return;
		props.onSelect?.();
		if (props.closeOnClick ?? !context.multiple()) context.close();
	};

	useHoverItem(
		context.hover,
		() => props.index,
		() => rowElement,
	);
	createEffect(() => {
		const index = props.index;
		const row: MenuRow = {
			label: props.label,
			disabled: () => props.disabled === true,
			activate,
			openSubmenu: props.onOpenSubmenu,
		};
		context.rows.set(index, row);
		context.rowsChanged();
		onCleanup(() => {
			if (context.rows.get(index) === row) context.rows.delete(index);
			context.rowsChanged();
		});
	});

	const checked = () => props.checked === true;
	const lit = () => context.hover.activeIndex() === props.index || checked();
	const role = () => {
		if (props.checked === undefined) return "menuitem";
		return context.multiple() ? "menuitemcheckbox" : "menuitemradio";
	};

	return (
		<div
			ref={(element) => {
				rowElement = element;
			}}
			role={role()}
			testId={props.testId}
			aria-selected={props.checked}
			onClick={activate}
			style={{
				height: height.control,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: 8,
				paddingRight: 8,
				borderRadius: radius.item,
				cursor: "pointer",
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? "none" : undefined,
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
				text={props.label}
				heavy={checked()}
				color={lit() ? color.foreground : color.mutedForeground}
				grow
			/>
			<Show when={props.chevron}>
				<Icon
					name="chevron-right"
					size={16}
					strokeWidth={lit() ? 2 : 1.5}
					color={lit() ? color.foreground : color.mutedForeground}
				/>
			</Show>
			<Show when={props.checked !== undefined}>
				<div style={{ width: 16, height: 16, flexShrink: 0 }}>
					<Show when={checked()}>
						{(() => {
							const initial = settled ? { opacity: 0 } : (false as const);
							return (
								<motion.div
									initial={initial}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.08, ease: "easeOut" }}
								>
									<Icon
										name="check"
										size={16}
										strokeWidth={2}
										color={color.foreground}
									/>
								</motion.div>
							);
						})()}
					</Show>
				</div>
			</Show>
			{props.children}
		</div>
	);
}
