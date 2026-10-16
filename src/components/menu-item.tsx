import { motion } from '@gpuix/solid';
import { createMenuItem, type MenuItemHost } from 'base-ui-solid-gpuix/menu';
import {
	type Accessor,
	createContext,
	type JSX,
	onMount,
	Show,
	useContext,
} from 'solid-js';
import type { FluidHover } from '#/lib/fluid-hover';
import { useHoverItem } from '#/lib/fluid-hover';
import { Icon } from '#/lib/icon';
import type { IconRef } from '#/lib/icons';
import { StableLabel } from '#/lib/stable-label';
import { color, height, radius, type as scale } from '#/lib/theme';

export interface DropdownContextValue extends MenuItemHost {
	hover: FluidHover;
	checkedIndex: Accessor<number | undefined>;
}

export const DropdownContext = createContext<DropdownContextValue>();

export function useDropdown() {
	const context = useContext(DropdownContext);
	if (context === undefined) {
		throw new Error('useDropdown must be used within a Dropdown');
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
				display: 'flex',
				alignItems: 'center',
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
	/** A submenu trigger: whether its popup is open and what it is called. */
	submenu?: { open: boolean; popupId: string };
	/** A submenu popup anchors to its trigger row, so it is the row's child. */
	children?: JSX.Element;
}) {
	const context = useDropdown();
	const item = createMenuItem(context, props);
	let settled = false;
	onMount(() => {
		settled = true;
	});

	useHoverItem(context.hover, () => props.index, item.element);

	const checked = () => props.checked === true;
	const lit = () => context.hover.activeIndex() === props.index || checked();
	return (
		<div
			ref={item.setElement}
			{...item.props}
			testId={props.testId}
			style={{
				position: 'relative',
				zIndex: 10,
				height: height.control,
				flexShrink: 0,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				paddingLeft: 8,
				paddingRight: 8,
				borderRadius: radius.item,
				cursor: 'pointer',
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? 'none' : undefined,
				keyboardFocusDim: false,
			}}
		>
			<Show when={props.icon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={16}
						strokeWidth={lit() ? 2 : 1.5}
						fade
						easeStroke
						color={lit() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<StableLabel
				text={props.label}
				heavy={checked()}
				color={lit() ? color.foreground : color.mutedForeground}
				fade
				grow
			/>
			<Show when={props.chevron}>
				<Icon
					name="chevron-right"
					size={16}
					strokeWidth={lit() ? 2 : 1.5}
					fade
					easeStroke
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
									transition={{ duration: 0.08, ease: 'easeOut' }}
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
