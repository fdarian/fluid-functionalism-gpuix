import { type HostElement, IntersectionObserver } from "@gpuix/solid";
import {
	type Accessor,
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	useContext,
} from "solid-js";
import { color, type as scale } from "./theme";

/** The scroller a page's cards live in: they measure their distance from it. */
export const PageScrollerContext = createContext<Accessor<HostElement | undefined>>();

/** Runs a listener on each scroll of the page scroller, until the returned function removes it. The scroller's own `onScroll` is the only way to hear it: scroll events do not bubble. */
export const PageScrollContext = createContext<(listener: () => void) => () => void>();

/**
 * gpuix lays out and paints every element, including those a scroller clips
 * away, so a page of many menus costs a frame several times a short page's.
 * A card more than a viewport from the scroller hides its content with
 * `display: none` (no box built for it or anything inside) and keeps the height
 * it had, so nothing shifts. It stays mounted, so typed text and selections
 * survive a scroll away and back.
 */
const OVERSCAN = "25% 0px";

/** The bordered surface a demo page is made of: content on top, the component's name in a footer, like the site's showcase cards. */
export function DemoCard(props: { title: string; children: JSX.Element }) {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error("DemoCard must be inside the page's PageScrollerContext");
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
			{ root, rootMargin: OVERSCAN },
		);
		observer.observe(observed);
		onCleanup(() => observer.disconnect());
	});

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.surface2,
			}}
		>
			<div
			ref={(element) => {
				content = element;
			}}
			style={{ padding: 20, height: far() ? farHeight() : undefined }}
		>
			<div style={{ display: far() ? "none" : "contents" }}>{props.children}</div>
		</div>
			<div
				style={{
					height: 44,
					display: "flex",
					alignItems: "center",
					paddingLeft: 16,
					borderTopWidth: 1,
					borderColor: color.border,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					{props.title}
				</text>
			</div>
		</div>
	);
}

/** A caption on the left, controls on the right. */
export function DemoRow(props: { label: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 16,
				minHeight: 36,
			}}
		>
			<div style={{ width: 96, flexShrink: 0 }}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.label}
				</text>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}
