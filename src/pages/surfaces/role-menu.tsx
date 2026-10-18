import type { HostElement } from '@gpuix/solid';
import { createSignal, For, Show } from 'solid-js';
import { FluidHighlight } from '#/lib/fluid-highlight';
import { createFluidHover, useHoverItem } from '#/lib/fluid-hover';
import { Icon } from '#/lib/icon';
import { defineIcon, type IconRef } from '#/lib/icons';
import { StableLabel } from '#/lib/stable-label';
import {
	color,
	colorFade,
	radius,
	siteType,
	motion as tween,
} from '#/lib/theme';
import { Elevated } from './elevated';

export const LOCK_ICON = defineIcon(
	'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
);
export const CHEVRON_UP_ICON = defineIcon('<path d="m18 15-6-6-6 6"/>');

export interface RoleOption {
	icon: IconRef;
	label: string;
	description: string;
}

export const ROLES: readonly RoleOption[] = [
	{
		icon: 'users',
		label: 'Workspace owner',
		description: 'Can change workspace settings and invite new members',
	},
	{
		icon: 'user',
		label: 'Member',
		description: "Can't change workspace settings or invite new members",
	},
	{
		icon: LOCK_ICON,
		label: 'Restricted member',
		description: 'Can only see and edit content they created',
	},
];

/** The role row's check: a 16px glyph 2px under the row's top, as `mt-0.5`. */
function RoleCheck() {
	return (
		<div style={{ marginTop: 2, flexShrink: 0 }}>
			<Icon name="check" size={16} strokeWidth={2} color={color.foreground} />
		</div>
	);
}

function RoleText(props: { role: RoleOption; checked: boolean; lit: boolean }) {
	return (
		<div
			style={{
				flexGrow: 1,
				flexShrink: 1,
				minWidth: 0,
				display: 'flex',
				flexDirection: 'column',
				gap: 2,
			}}
		>
			<StableLabel
				text={props.role.label}
				heavy={props.checked}
				snapWeight
				color={props.lit ? color.foreground : color.mutedForeground}
			/>
			<text style={{ ...siteType.caption, color: color.mutedForeground }}>
				{props.role.description}
			</text>
		</div>
	);
}

/**
 * The source's `StaticRoleItem`: a presentational row with no dropdown behind
 * it, so the broken menu can be hard-coded to the dialog's own surface.
 */
export function StaticRoleItem(props: { role: RoleOption; checked: boolean }) {
	const [hovered, setHovered] = createSignal(false);
	const lit = () => props.checked || hovered();
	return (
		<div
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-start',
				gap: 12,
				paddingLeft: 12,
				paddingRight: 12,
				paddingTop: 10,
				paddingBottom: 10,
				borderRadius: radius.item,
				cursor: 'pointer',
				backgroundColor: props.checked
					? color.active
					: hovered()
						? color.hover
						: color.transparent,
				...colorFade,
			}}
		>
			<div style={{ marginTop: 2, flexShrink: 0 }}>
				<Icon
					name={props.role.icon}
					size={18}
					strokeWidth={lit() ? 2 : 1.5}
					color={lit() ? color.foreground : color.mutedForeground}
					fade
				/>
			</div>
			<RoleText role={props.role} checked={props.checked} lit={lit()} />
			<Show when={props.checked}>
				<RoleCheck />
			</Show>
		</div>
	);
}

export interface MenuOption {
	icon: IconRef;
	label: string;
	description?: string;
}

/** "menu" is the stock row (36px, icon 16); "role" the invite dialog's two-line row. */
type MenuVariant = 'menu' | 'role';

function MenuRow(props: {
	hover: ReturnType<typeof createFluidHover>;
	index: number;
	option: MenuOption;
	checked: boolean;
	variant: MenuVariant;
}) {
	let element: HostElement | undefined;
	useHoverItem(
		props.hover,
		() => props.index,
		() => element,
	);
	const lit = () => props.hover.activeIndex() === props.index || props.checked;
	const role = () => props.variant === 'role';
	return (
		<div
			ref={(row) => {
				element = row;
			}}
			style={{
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				alignItems: role() ? 'flex-start' : 'center',
				gap: role() ? 12 : 8,
				height: role() ? undefined : 36,
				flexShrink: 0,
				paddingLeft: role() ? 12 : 8,
				paddingRight: role() ? 12 : 8,
				paddingTop: role() ? 10 : 0,
				paddingBottom: role() ? 10 : 0,
				borderRadius: radius.item,
				cursor: 'pointer',
			}}
		>
			<div style={{ marginTop: role() ? 2 : 0, flexShrink: 0 }}>
				<Icon
					name={props.option.icon}
					size={role() ? 18 : 16}
					strokeWidth={lit() ? 2 : 1.5}
					color={lit() ? color.foreground : color.mutedForeground}
				/>
			</div>
			<Show
				when={role()}
				fallback={
					<StableLabel
						text={props.option.label}
						heavy={props.checked}
						color={lit() ? color.foreground : color.mutedForeground}
						grow
					/>
				}
			>
				<RoleText
					role={props.option as RoleOption}
					checked={props.checked}
					lit={lit()}
				/>
			</Show>
			<Show when={props.checked}>
				{role() ? (
					<RoleCheck />
				) : (
					<Icon
						name="check"
						size={16}
						strokeWidth={2}
						color={color.foreground}
					/>
				)}
			</Show>
		</div>
	);
}

/**
 * The dropdown of the surface demos: `Elevated offset={2} shadowLevel={3}`
 * around fluid-hover rows. The port's `Dropdown` is fixed at surface 3 and 288px
 * wide and has no description rows, so it cannot show a lifted background.
 */
export function SurfaceMenu(props: {
	options: readonly MenuOption[];
	checkedIndex: number;
	variant: MenuVariant;
	testId?: string;
	ref?: (element: HostElement) => void;
}) {
	const hover = createFluidHover();
	const rectOf = (index: number | null) => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	return (
		<Elevated
			offset={2}
			shadowLevel={3}
			testId={props.testId}
			ref={props.ref}
			style={{ borderRadius: radius.container }}
		>
			<div
				ref={hover.containerProps.ref}
				onMouseEnter={hover.containerProps.onMouseEnter}
				onMouseMove={hover.containerProps.onMouseMove}
				onMouseLeave={hover.containerProps.onMouseLeave}
				style={{
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					padding: 4,
				}}
			>
				<FluidHighlight
					rect={() => rectOf(props.checkedIndex)}
					session={() => 0}
					radius={radius.item}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
				/>
				<FluidHighlight
					rect={() => rectOf(hover.activeIndex())}
					session={hover.session}
					from={() => rectOf(props.checkedIndex)}
					radius={radius.item}
					background={color.hover}
				/>
				<For each={props.options}>
					{(option, index) => (
						<MenuRow
							hover={hover}
							index={index()}
							option={option}
							checked={index() === props.checkedIndex}
							variant={props.variant}
						/>
					)}
				</For>
			</div>
		</Elevated>
	);
}
