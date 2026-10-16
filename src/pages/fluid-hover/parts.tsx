import { buttonProps, type HostElement, useGpuixRequired } from "@gpuix/solid";
import type { JSX } from "solid-js";
import { FluidHighlight } from "../../lib/fluid-highlight";
import { type FluidHover, useHoverItem } from "../../lib/fluid-hover";
import {
	color,
	focusRing,
	radius,
	siteType,
	weight,
} from "../../lib/theme";

/** The demos' bordered list frame: `border-border/60` and the container radius. */
export function ListFrame(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				width: "100%",
				borderRadius: radius.container,
				borderWidth: 1,
				borderColor: color.borderFaint,
			}}
		>
			{props.children}
		</div>
	);
}

export const ROW_HEIGHT = 36;
export const ROW_GAP = 4;
export const LIST_PADDING = 8;

function rowStyle() {
	return {
		position: "relative",
		zIndex: 10,
		height: ROW_HEIGHT,
		flexShrink: 0,
		display: "flex",
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: 12,
		paddingRight: 12,
		borderRadius: radius.item,
		cursor: "pointer",
		userSelect: "none",
		keyboardFocusDim: false,
		focusVisible: focusRing(0),
	} as const;
}

function RowLabel(props: { children: string }) {
	return (
		<text
			style={{
				...siteType.body,
				fontWeight: weight.normal,
				color: color.foreground,
				whiteSpace: "nowrap",
			}}
		>
			{props.children}
		</text>
	);
}

/** A bare row that joins a fluid hover list. The highlight sits under it (the row is `z-10`, as in the source), so the row paints nothing itself. */
export function FluidRow(props: {
	hover: FluidHover;
	index: number;
	label: string;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	let element: HostElement | undefined;
	useHoverItem(
		props.hover,
		() => props.index,
		() => element,
	);
	return (
		<div
			ref={(row) => {
				element = row;
			}}
			{...buttonProps({ onClick: () => {} }, renderer)}
			tabIndex={0}
			testId={props.testId}
			style={rowStyle()}
		>
			<RowLabel>{props.label}</RowLabel>
		</div>
	);
}

/** A bare row lit by plain `:hover`, or by `lit` when a script stands in for the pointer. */
export function PlainRow(props: {
	label: string;
	lit: boolean;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	return (
		<div
			{...buttonProps({ onClick: () => {} }, renderer)}
			tabIndex={0}
			testId={props.testId}
			style={{
				...rowStyle(),
				backgroundColor: props.lit ? color.hover : color.transparent,
				hover: { backgroundColor: color.hover },
				focusVisible: focusRing(0),
			}}
		>
			<RowLabel>{props.label}</RowLabel>
		</div>
	);
}

/** The lit row's box, or `null` while nothing is lit or measured: what `FluidHighlight` follows. */
export function litRect(hover: FluidHover) {
	return () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
}

/** The list's own highlight: `bg-hover` on the item radius, first child of the container. */
export function ListHighlight(props: { hover: FluidHover }) {
	return (
		<FluidHighlight
			rect={litRect(props.hover)}
			session={props.hover.session}
			radius={radius.item}
			background={color.hover}
		/>
	);
}

/** A scripted pointer: its tip sits at (x, y) in the positioned parent. */
export function FakeCursor(props: { x: number; y: () => number }) {
	return (
		<div
			style={{
				position: "absolute",
				left: props.x - 3,
				top: props.y() - 3,
				pointerEvents: "none",
			}}
		>
			<svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
				<path
					d="m4 4 7.07 17 2.51-7.39L21 11.07z"
					fill={color.foreground}
					stroke={color.background}
					strokeWidth={1.5}
					strokeLinejoin="round"
				/>
			</svg>
		</div>
	);
}
