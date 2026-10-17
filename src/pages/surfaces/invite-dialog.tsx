import type { HostElement, StyleDesc } from '@gpuix/solid';
import { createSignal, type JSX, Show } from 'solid-js';
import { Icon } from '#/lib/icon';
import {
	color,
	colorFade,
	shadow,
	siteType,
	surface,
	weight,
} from '#/lib/theme';
import { SurfaceProvider } from './elevated';
import {
	CHEVRON_UP_ICON,
	ROLES,
	StaticRoleItem,
	SurfaceMenu,
} from './role-menu';

function FieldLabel(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.body,
				fontWeight: weight.normal,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

function Header() {
	const [closeHovered, setCloseHovered] = createSignal(false);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-start',
				justifyContent: 'space-between',
				gap: 12,
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 12,
				}}
			>
				<div
					style={{
						width: 28,
						height: 28,
						flexShrink: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						borderRadius: 14,
						backgroundColor: color.foreground,
					}}
				>
					<text
						style={{
							...siteType.caption,
							fontWeight: weight.semibold,
							color: color.background,
						}}
					>
						M
					</text>
				</div>
				<text
					style={{
						...siteType.title,
						fontWeight: weight.semibold,
						color: color.foreground,
					}}
				>
					Invite to your workspace
				</text>
			</div>
			<div
				role="button"
				aria-label="Close"
				onMouseEnter={() => setCloseHovered(true)}
				onMouseLeave={() => setCloseHovered(false)}
				style={{
					padding: 4,
					marginRight: -4,
					marginTop: -4,
					cursor: 'pointer',
				}}
			>
				<Icon
					name="x"
					size={16}
					strokeWidth={1.5}
					color={closeHovered() ? color.foreground : color.mutedForeground}
				/>
			</div>
		</div>
	);
}

function EmailField() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			<FieldLabel>Email</FieldLabel>
			<div
				style={{
					minHeight: 58,
					paddingLeft: 12,
					paddingRight: 12,
					paddingTop: 8,
					paddingBottom: 8,
					borderStyle: 'solid',
					borderWidth: 1,
					borderColor: color.border,
					borderRadius: 12,
					backgroundColor: color.transparent,
					cursor: 'pointer',
					...colorFade,
					hover: { backgroundColor: color.hover },
				}}
			>
				<text style={{ ...siteType.body, color: color.mutedForeground }}>
					email@gmail.com, email2@gmail.com...
				</text>
			</div>
		</div>
	);
}

function RoleTrigger() {
	return (
		<div
			role="button"
			aria-expanded
			style={{
				height: 40,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 8,
				paddingLeft: 12,
				paddingRight: 12,
				borderRadius: 12,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.active,
				cursor: 'pointer',
			}}
		>
			<text style={{ ...siteType.body, color: color.foreground }}>Member</text>
			<Icon
				name={CHEVRON_UP_ICON}
				size={14}
				strokeWidth={1.5}
				color={color.mutedForeground}
			/>
		</div>
	);
}

function Footer() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'flex-end',
				alignItems: 'center',
				gap: 8,
				paddingTop: 8,
			}}
		>
			<div
				role="button"
				style={{
					height: 36,
					display: 'flex',
					alignItems: 'center',
					paddingLeft: 16,
					paddingRight: 16,
					borderRadius: 18,
					cursor: 'pointer',
					hover: { backgroundColor: color.hover },
					...colorFade,
				}}
			>
				<text
					style={{
						...siteType.body,
						fontWeight: weight.normal,
						color: color.foreground,
					}}
				>
					Cancel
				</text>
			</div>
			<div
				role="button"
				aria-disabled
				style={{
					height: 36,
					display: 'flex',
					alignItems: 'center',
					paddingLeft: 16,
					paddingRight: 16,
					borderRadius: 18,
					backgroundColor: color.foreground,
					opacity: 0.5,
				}}
			>
				<text
					style={{
						...siteType.body,
						fontWeight: weight.semibold,
						color: color.background,
					}}
				>
					Send invites
				</text>
			</div>
		</div>
	);
}

/**
 * The invite dialog both demos draw: a surface-5 panel whose role picker is
 * either hard-coded to the dialog's own level (the problem) or lifted by the
 * substrate (the solution).
 */
export function InviteDialog(props: {
	variant: 'problem' | 'solution';
	style: StyleDesc;
	ref?: (element: HostElement) => void;
	menuRef?: (element: HostElement) => void;
}): JSX.Element {
	return (
		<SurfaceProvider value={5}>
			<div
				ref={props.ref}
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 20,
					padding: 24,
					borderRadius: 16,
					backgroundColor: surface(5),
					boxShadow: shadow(5),
					...props.style,
				}}
			>
				<Header />
				<EmailField />
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<FieldLabel>Select role</FieldLabel>
					<RoleTrigger />
					<div style={{ marginTop: -1 }}>
						<Show
							when={props.variant === 'solution'}
							fallback={
								// Same elevation shadow as a real dropdown, but the background
								// is hard-coded to the dialog's own level: surface-5 on
								// surface-5 gives a faint edge, yet the body melts into it.
								<div
									style={{
										display: 'flex',
										flexDirection: 'column',
										padding: 4,
										borderRadius: 16,
										backgroundColor: surface(5),
										boxShadow: shadow(3),
									}}
								>
									<StaticRoleItem role={ROLES[0]} checked={false} />
									<StaticRoleItem role={ROLES[1]} checked />
									<StaticRoleItem role={ROLES[2]} checked={false} />
								</div>
							}
						>
							<SurfaceMenu
								ref={props.menuRef}
								options={ROLES}
								checkedIndex={1}
								variant="role"
							/>
						</Show>
					</div>
				</div>
				<Footer />
			</div>
		</SurfaceProvider>
	);
}
