import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import { createContext, type JSX, Show } from "solid-js";
import { Badge } from "../components/badge";
import {
	color,
	colorFade,
	fade,
	focusRing,
	scheme,
	siteType,
	weight,
} from "../lib/theme";

export type BentoSize = "large" | "medium" | "small";

/** True inside a home tile. Previews that also serve a full demo stage read it to trim themselves for the tile alone. */
export const BentoTileContext = createContext(false);

/** The tile's row height at two or more columns (`.bento-grid`: `grid-auto-rows: 300px`). */
export const BENTO_ROW = 300;

/**
 * `.bento-card-border` in `app/globals.css:1244-1269`: three states of the border and the 1px drop under it.
 * `light-dark()` becomes the scheme read here, so call it inside a style.
 */
export function bentoFrame(state: "rest" | "hover" | "focus") {
	const light = scheme() === "light";
	const border = {
		rest: light ? "rgba(23,23,23,0.12)" : "rgba(245,245,245,0.072)",
		hover: light ? "rgba(23,23,23,0.2)" : "rgba(245,245,245,0.12)",
		focus: light ? "rgba(23,23,23,0.65)" : "rgba(245,245,245,0.7)",
	}[state];
	const shadow = {
		rest: { blur: 2, alpha: light ? 0.04 : 0.4 },
		hover: { blur: 2, alpha: light ? 0.08 : 0.6 },
		focus: { blur: 3, alpha: light ? 0.12 : 0.7 },
	}[state];
	return {
		borderColor: border,
		boxShadow: {
			offsetX: 0,
			offsetY: 1,
			blurRadius: shadow.blur,
			spreadRadius: 0,
			color: `rgba(0,0,0,${shadow.alpha})`,
		},
	};
}

/** A preview on top, the component's name below it as a link to its demo. */
export function BentoCard(props: {
	slug: string;
	name: string;
	isNew?: boolean;
	/** Grid placement; the grid decides it from the size and the column count. */
	placement: { gridColumn?: string; gridRow?: string };
	/** Rows are pinned at 300px, so a tall preview can only be shown more fully by spending less of that on padding. */
	previewPadding: { x: number; y: number };
	onOpen: () => void;
	children?: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	return (
		<div
			testId={`card-${props.slug}`}
			style={{
				...props.placement,
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				borderRadius: 12,
				borderWidth: 1,
				overflow: "hidden",
				// A box shadow is not clipped out of the border box here, so over a transparent fill it darkens the whole card.
				backgroundColor: color.background,
				...bentoFrame("rest"),
				// `transition-[shadow,border-color]`: `shadow` is not a CSS property, so only the border eases.
				...fade(["border-color"], 80),
				hover: bentoFrame("hover"),
				focusWithin: bentoFrame("focus"),
			}}
		>
			<div
				style={{
					flexGrow: 1,
					flexBasis: 0,
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					paddingLeft: props.previewPadding.x,
					paddingRight: props.previewPadding.x,
					paddingTop: props.previewPadding.y,
					paddingBottom: props.previewPadding.y,
				}}
			>
				<BentoTileContext.Provider value={true}>
					{props.children}
				</BentoTileContext.Provider>
			</div>
			<div
				{...buttonProps({ onClick: props.onOpen }, renderer)}
				testId={`card-${props.slug}-open`}
				aria-label={`View ${props.name} documentation`}
				tabIndex={0}
				style={{
					group: true,
					flexShrink: 0,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					paddingLeft: 16,
					paddingRight: 16,
					paddingTop: 12,
					paddingBottom: 12,
					borderTopWidth: 1,
					borderTopColor:
						scheme() === "light"
							? "rgba(23,23,23,0.048)"
							: "rgba(245,245,245,0.048)",
					borderBottomLeftRadius: 11,
					borderBottomRightRadius: 11,
					cursor: "pointer",
					keyboardFocusDim: false,
					...colorFade,
					hover: { backgroundColor: color.hover },
					focusVisible: focusRing(-1),
				}}
			>
				<text
					style={{
						...siteType.body,
						fontWeight: weight.normal,
						color: color.mutedForeground,
						...colorFade,
						groupHover: { color: color.foreground },
					}}
				>
					{props.name}
				</text>
				<Show when={props.isNew}>
					<Badge variant="dot" color="blue" size="compact">
						New
					</Badge>
				</Show>
			</div>
		</div>
	);
}
