import {
	buttonProps,
	type HostElement,
	IntersectionObserver,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { PageScrollerContext } from "../../lib/demo-kit";
import { FluidHighlight } from "../../lib/fluid-highlight";
import { type FluidHover, useHoverItem } from "../../lib/fluid-hover";
import {
	color,
	focusRing,
	radius,
	type as scale,
	scheme,
	weight,
} from "../../lib/theme";

export const MONO = "Menlo";


export function SectionTitle(props: { children: string }) {
	return (
		<text
			style={{
				...scale.title,
				lineHeight: 16,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
	);
}

export function Prose(props: { children: JSX.Element }) {
	return (
		<text style={{ ...scale.body, color: color.mutedForeground }}>
			{props.children}
		</text>
	);
}

/** The prose's inline code chip: `light-dark(#EBEBED, #2C2C2C)` ground, foreground ink. A span has no padding or radius, and padding made of no-break spaces lets gpuix break a line between the padding and the text, stranding an empty chip. */
export function Code(props: { children: string }) {
	return (
		<span
			style={{
				fontFamily: MONO,
				color: color.foreground,
				backgroundColor: scheme() === "light" ? "#EBEBED" : "#2C2C2C",
			}}
		>
			{props.children}
		</span>
	);
}

/** A titled block of the page: 24px of extra air above, the title 8px over its prose and the content 16px under it. */
export function DocSection(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 16,
				paddingTop: 24,
			}}
		>
			<div style={{ marginBottom: -8 }}>
				<SectionTitle>{props.title}</SectionTitle>
			</div>
			{props.children}
		</div>
	);
}

/**
 * The bordered stage a demo sits on. gpuix lays out and paints everything a
 * scroller clips away, so a stage more than a viewport from the page scroller
 * hides its content with `display: none` and keeps its height (the same rule
 * as `DemoCard`).
 */
export function PreviewFrame(props: {
	children: JSX.Element;
	/** "none" lets the demo bleed to the frame. */
	padding?: "default" | "none";
	/** A control pinned to the frame's top right corner. */
	corner?: JSX.Element;
}) {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"PreviewFrame must be inside the page's PageScrollerContext",
		);
	}
	const [far, setFar] = createSignal(false);
	const [farHeight, setFarHeight] = createSignal<number>();
	let content: HostElement | undefined;

	createEffect(() => {
		const root = scroller();
		if (root === undefined || content === undefined) return;
		const observed = content;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				if (latest.isIntersecting) {
					setFar(false);
					return;
				}
				setFarHeight(observed.getBoundingClientRect().height);
				setFar(true);
			},
			{ root, rootMargin: "25% 0px" },
		);
		observer.observe(observed);
		onCleanup(() => observer.disconnect());
	});

	return (
		<div
			style={{
				position: "relative",
				overflow: "hidden",
				borderRadius: radius.container,
				borderWidth: 1,
				borderColor: color.borderFaint,
				backgroundColor: color.background,
			}}
		>
			<div
				ref={(element) => {
					content = element;
				}}
				style={{
					minHeight: 120,
					height: far() ? farHeight() : undefined,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					paddingTop: props.padding === "none" ? 0 : 48,
					paddingBottom: props.padding === "none" ? 0 : 48,
					paddingLeft: props.padding === "none" ? 0 : 32,
					paddingRight: props.padding === "none" ? 0 : 32,
				}}
			>
				<div
					style={{
						display: far() ? "none" : "flex",
						flexDirection: "column",
						alignItems: "center",
						width: "100%",
					}}
				>
					{props.children}
				</div>
			</div>
			<Show when={props.corner}>
				<div style={{ position: "absolute", top: 8, right: 8 }}>
					{props.corner}
				</div>
			</Show>
		</div>
	);
}

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
				...scale.body,
				fontWeight: weight.normal,
				color: color.foreground,
				whiteSpace: "nowrap",
			}}
		>
			{props.children}
		</text>
	);
}

/** A bare row that joins a fluid hover list. The highlight sits under it by document order, so the row paints nothing itself. */
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
