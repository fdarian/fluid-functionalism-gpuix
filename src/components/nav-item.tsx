import {
	buttonProps,
	type DomEvent,
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import { createEffect, onCleanup, Show } from "solid-js";
import { Icon } from "../lib/icon";
import type { IconRef } from "../lib/icons";
import { moveIndex } from "../lib/list-nav";
import { StableLabel } from "../lib/stable-label";
import { color, type as scale, shape, sizeChoice } from "../lib/theme";
import { useNavMenu } from "./nav-menu";

const sizes = {
	default: { height: 32, text: scale.body, icon: 16 },
	compact: { height: 28, text: scale.bodyCompact, icon: 14 },
} as const;

/** Tailwind blue-500, the source's default status dot. */
const BLUE_DOT = "#3b82f6";

/**
 * One link of a NavMenu. `slug` stands in for the source's `href`: the menu
 * marks the item whose slug equals its `activeSlug`, and `onClick` does the
 * navigating.
 */
export function NavItem(props: {
	label: string;
	slug: string;
	/** Position in the menu, from 0, contiguous. */
	index: number;
	icon?: IconRef;
	isNew?: boolean;
	isUpdated?: boolean;
	/** Colour of the status dot. Blue when omitted. */
	dotColor?: string;
	onClick?: () => void;
	testId?: string;
}) {
	const scope = useNavMenu();
	const renderer = useGpuixRequired();
	let element: HostElement | undefined;

	createEffect(() => {
		if (element === undefined) throw new Error("Nav item is not mounted");
		scope.hover.registerItem(props.index, element);
		scope.elements.set(props.index, element);
		onCleanup(() => {
			if (scope.elements.get(props.index) === element) {
				scope.elements.delete(props.index);
			}
		});
	});
	createEffect(() => scope.registerSlug(props.index, props.slug));

	const metrics = () => sizes[sizeChoice()];
	const isActiveRoute = () => scope.activeSlug() === props.slug;
	const lit = () =>
		scope.hover.activeIndex() === props.index || isActiveRoute();
	// Roving tab stop: the active route holds it; with no active route in this
	// menu (an unrelated page), the first item does, so the menu stays reachable.
	const tabIndex = () => {
		if (isActiveRoute()) return 0;
		if (scope.activeRouteIndex() !== null) return -1;
		return props.index === 0 ? 0 : -1;
	};
	const dot = () => {
		if (props.isUpdated === true) return BLUE_DOT;
		if (props.isNew === true) return props.dotColor ?? BLUE_DOT;
		return undefined;
	};

	const onKeyDown = (event: KeyEvent) => {
		if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
			return;
		}
		const count = scope.elements.size;
		const step = (
			{ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<
				string,
				1 | -1 | undefined
			>
		)[event.key ?? ""];
		const target =
			step !== undefined
				? (moveIndex(props.index, step, count) ?? undefined)
				: event.key === "Home"
					? 0
					: event.key === "End"
						? count - 1
						: undefined;
		if (target === undefined) return;
		event.preventDefault();
		const next = scope.elements.get(target);
		if (next !== undefined) renderer.focusElement?.(next.id);
	};

	return (
		<div
			ref={(node) => {
				element = node;
			}}
			{...buttonProps(
				{
					onClick: () => props.onClick?.(),
					onKeyDown,
					get tabIndex() {
						return tabIndex();
					},
				},
				renderer,
			)}
			role="link"
			aria-current={isActiveRoute() ? "page" : undefined}
			testId={props.testId}
			onFocus={(event: DomEvent) => {
				scope.focusRing.focus(props.index, event);
				scope.hover.setActiveIndex(props.index);
			}}
			onBlur={(event: DomEvent) => {
				scope.focusRing.blur(props.index);
				// Focus moving to a sibling item stays inside the menu: only a real exit drops the highlight.
				for (const item of scope.elements.values()) {
					if (item === event.relatedTarget) return;
				}
				if (!scope.mouseInside()) scope.hover.setActiveIndex(null);
			}}
			style={{
				position: "relative",
				zIndex: 10,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				flexShrink: 0,
				height: metrics().height,
				paddingLeft: 12,
				paddingRight: 12,
				borderRadius: shape.item,
				cursor: "pointer",
				keyboardFocusDim: false,
			}}
		>
			<Show when={props.icon}>
				{(icon: () => IconRef) => (
					<Icon
						name={icon()}
						size={metrics().icon}
						strokeWidth={lit() ? 2 : 1.5}
						easeStroke
						fade
						color={lit() ? color.foreground : color.mutedForeground}
					/>
				)}
			</Show>
			<StableLabel
				text={props.label}
				heavy={isActiveRoute()}
				color={lit() ? color.foreground : color.mutedForeground}
				textStyle={metrics().text}
				fade
				grow={dot() === undefined}
				truncate
			/>
			<Show when={dot()}>
				{(fill: () => string) => (
					<div
						style={{
							width: 6,
							height: 6,
							flexShrink: 0,
							borderRadius: 3,
							backgroundColor: fill(),
						}}
					/>
				)}
			</Show>
		</div>
	);
}
