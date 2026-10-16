import {
	type BoxShadow,
	buttonProps,
	type EventPayload,
	type StateStyleDesc,
	useGpuixRequired,
} from "@gpuix/solid";
import { type Accessor, createSignal, type JSX, Show } from "solid-js";
import { Icon } from "../lib/icon";
import { fill } from "../lib/press";
import type { IconRef } from "../lib/icons";
import { color, sizeChoice, height, shape, type as scale, weight, focusRing } from "../lib/theme";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "ghost";
export type ButtonSize = "default" | "compact" | "icon" | "icon-compact";

const sizes = {
	default: {
		height: height.control,
		padX: 16,
		padXIcon: 12,
		gap: 6,
		text: scale.body,
		icon: 16,
	},
	compact: {
		height: height.controlCompact,
		padX: 12,
		padXIcon: 8,
		gap: 4,
		text: scale.bodyCompact,
		icon: 14,
	},
	icon: {
		height: height.control,
		padX: 0,
		padXIcon: 0,
		gap: 0,
		text: scale.body,
		icon: 16,
	},
	"icon-compact": {
		height: height.controlCompact,
		padX: 0,
		padXIcon: 0,
		gap: 0,
		text: scale.bodyCompact,
		icon: 14,
	},
} as const;

interface Surface {
	rest: StateStyleDesc;
	hover: StateStyleDesc;
	active: StateStyleDesc;
}

/**
 * Tertiary's ring is an outline: at rest it hugs the outside of the surface
 * (the button's own edge), pressed it moves 1px inside, like the inset
 * shadow it replaces.
 */
const surfaces = (): Record<ButtonVariant, Surface> => ({
	primary: {
		rest: { boxShadow: fill(color.foreground, 1) },
		hover: { boxShadow: fill(color.primaryHover, 1) },
		active: { boxShadow: fill(color.primaryActive, 0) },
	},
	secondary: {
		rest: { boxShadow: fill(color.tint, 1) },
		hover: { boxShadow: fill(color.tintHover, 1) },
		active: { boxShadow: fill(color.tint, 0) },
	},
	tertiary: {
		rest: {
			outlineWidth: 1,
			outlineColor: color.border,
			outlineOffset: 0,
		},
		hover: { backgroundColor: color.hover },
		active: {
			backgroundColor: color.active,
			outlineWidth: 1,
			outlineColor: color.border,
			outlineOffset: -1,
		},
	},
	ghost: {
		rest: {},
		hover: { boxShadow: fill(color.hover, 1) },
		active: { boxShadow: fill(color.active, 0) },
	},
});

export function Button(props: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	leadingIcon?: IconRef;
	trailingIcon?: IconRef;
	loading?: boolean;
	disabled?: boolean;
	testId?: string;
	id?: string;
	"aria-label"?: string;
	"aria-activedescendant"?: string;
	"aria-expanded"?: boolean;
	"aria-haspopup"?: "menu" | "listbox" | "dialog";
	"aria-controls"?: string;
	onClick?: (event: EventPayload) => void;
	onMouseDown?: (event: EventPayload) => void;
	/** The label, or the icon for an icon-only size. */
	children?: JSX.Element;
	/** Anything after the label, e.g. a keycap. Takes the trailing icon's tighter padding. */
	trailingContent?: JSX.Element;
	icon?: IconRef;
}) {
	const renderer = useGpuixRequired();
	const variant = () => props.variant ?? "primary";
	const size = () => sizes[props.size ?? sizeChoice()];
	/** Base UI disables the button while it loads: FF passes `disabled || loading`, and its `disabled:` classes dim it and drop pointer events. */
	const inert = () => props.disabled === true || props.loading === true;
	const iconOnly = () => props.size === "icon" || props.size === "icon-compact";
	const [hovered, setHovered] = createSignal(false);

	const labelColor = () => {
		switch (variant()) {
			case "primary":
				return color.background;
			case "ghost":
				return hovered() ? color.foreground : color.mutedForeground;
			default:
				return color.foreground;
		}
	};
	const iconStroke = () => (hovered() ? 2 : 1.5);
	// The surface is inset 1px (margin), so every padding gives one back.
	const padLeft = () =>
		(props.leadingIcon !== undefined ? size().padXIcon : size().padX) - 1;
	const padRight = () =>
		(props.trailingIcon !== undefined || props.trailingContent !== undefined
			? size().padXIcon
			: size().padX) - 1;

	const content = () => (
		<>
			<Show when={props.leadingIcon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={size().icon}
						strokeWidth={iconStroke()}
						color={labelColor()}
					/>
				)}
			</Show>
			<Show
				when={iconOnly() && props.icon !== undefined}
				fallback={
					<text
						style={{
							...size().text,
							color: labelColor(),
							fontWeight: weight.normal,
							whiteSpace: "nowrap",
						}}
					>
						{props.children}
					</text>
				}
			>
				<Icon
					name={props.icon as IconRef}
					size={size().icon}
					strokeWidth={iconStroke()}
					color={labelColor()}
				/>
			</Show>
			{props.trailingContent}
			<Show when={props.trailingIcon}>
				{(name: Accessor<IconRef>) => (
					<Icon
						name={name()}
						size={size().icon}
						strokeWidth={iconStroke()}
						color={labelColor()}
					/>
				)}
			</Show>
		</>
	);

	return (
		<div
			{...buttonProps({
				disabled: inert(),
				onClick: props.onClick,
			}, renderer)}
			tabIndex={inert() ? -1 : 0}
			testId={props.testId}
			id={props.id}
			aria-label={props["aria-label"]}
			aria-activedescendant={props["aria-activedescendant"]}
			aria-expanded={props["aria-expanded"]}
			aria-haspopup={props["aria-haspopup"]}
			aria-controls={props["aria-controls"]}
			aria-disabled={inert()}
			onMouseDown={props.onMouseDown}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				flexShrink: 0,
				position: "relative",
				margin: 1,
				height: size().height - 2,
				...(iconOnly()
					? { width: size().height - 2 }
					: { paddingLeft: padLeft(), paddingRight: padRight() }),
				gap: size().gap,
				borderRadius: shape.button,
				cursor: "pointer",
				userSelect: "none",
				// gpuix dims every other focusable while one has keyboard focus; this design does not.
				keyboardFocusDim: false,
				opacity: inert() ? 0.5 : 1,
				pointerEvents: inert() ? "none" : "auto",
				...surfaces()[variant()].rest,
				hover: surfaces()[variant()].hover,
				active: surfaces()[variant()].active,
				focusVisible: focusRing(1),
			}}
		>
			<Show when={props.loading} fallback={content()}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: size().gap,
						opacity: 0,
					}}
				>
					{content()}
				</div>
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon
						name="loader"
						size={size().icon}
						strokeWidth={1.5}
						color={labelColor()}
					/>
				</div>
			</Show>
		</div>
	);
}
