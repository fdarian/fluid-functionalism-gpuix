import type { HostElement } from "@gpuix/solid";
import {
	createContext,
	createSignal,
	type JSX,
	onCleanup,
	useContext,
} from "solid-js";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "../lib/fluid-hover";
import {
	createFocusRing,
	FocusRing,
	type FocusRingState,
} from "../lib/focus-ring";
import { color, shape, motion as tween } from "../lib/theme";

interface NavMenuScope {
	hover: FluidHover;
	focusRing: FocusRingState;
	/** Item index to its row, for arrow-key moves. */
	elements: Map<number, HostElement>;
	activeSlug: () => string | null;
	/** Index of the item whose slug is `activeSlug`, or `null` when none matches. */
	activeRouteIndex: () => number | null;
	registerSlug: (index: number, slug: string) => void;
	mouseInside: () => boolean;
}

const NavMenuContext = createContext<NavMenuScope>();

export function useNavMenu() {
	const scope = useContext(NavMenuContext);
	if (scope === undefined) throw new Error("Must be used inside NavMenu");
	return scope;
}

/**
 * A vertical list of route links: one hover highlight that glides between
 * items (born at the active route's row), a background on the active route,
 * and the travelling keyboard focus ring.
 */
export function NavMenu(props: {
	/** The slug of the route on screen; the item with this `slug` is the active one. */
	activeSlug: string | null;
	"aria-label"?: string;
	testId?: string;
	children: JSX.Element;
}) {
	const hover = createFluidHover();
	const focusRing = createFocusRing(hover);
	const [mouseInside, setMouseInside] = createSignal(false);
	// Filled as items register, as state, so the active route follows registration.
	const [slugToIndex, setSlugToIndex] = createSignal<
		ReadonlyMap<string, number>
	>(new Map());

	const activeRouteIndex = () => {
		if (props.activeSlug === null) return null;
		return slugToIndex().get(props.activeSlug) ?? null;
	};
	const rectOf = (index: number | null) => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};
	const activeRouteRect = () => rectOf(activeRouteIndex());
	const hoverRect = () => rectOf(hover.activeIndex());

	const scope: NavMenuScope = {
		hover,
		focusRing,
		elements: new Map(),
		activeSlug: () => props.activeSlug,
		activeRouteIndex,
		registerSlug(index, slug) {
			setSlugToIndex((previous) => new Map(previous).set(slug, index));
			onCleanup(() =>
				setSlugToIndex((previous) => {
					const next = new Map(previous);
					if (next.get(slug) === index) next.delete(slug);
					return next;
				}),
			);
		},
		mouseInside,
	};

	return (
		<NavMenuContext.Provider value={scope}>
			<div
				testId={props.testId}
				role="navigation"
				aria-label={props["aria-label"]}
				{...hover.containerProps}
				onMouseEnter={() => {
					setMouseInside(true);
					hover.handlers.onMouseEnter();
				}}
				onMouseLeave={() => {
					setMouseInside(false);
					hover.handlers.onMouseLeave();
				}}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
					userSelect: "none",
				}}
			>
				{/* Layers first: gpuix has no zIndex, so the transparent items paint over them by document order. */}
				<FluidHighlight
					rect={activeRouteRect}
					session={() => 0}
					radius={shape.bg}
					background={color.active}
					glide={tween.moderate}
					fade={tween.moderateExit}
				/>
				<FluidHighlight
					rect={hoverRect}
					session={hover.session}
					from={activeRouteRect}
					radius={shape.bg}
					background={color.hover}
				/>
				<FocusRing
					ring={focusRing}
					radius={shape.focusRing}
					testId={props.testId && `${props.testId}-focus-ring`}
				/>
				{props.children}
			</div>
		</NavMenuContext.Provider>
	);
}
