import type { BoxShadow, MotionTransition } from "@gpuix/solid";
import { createSignal } from "solid-js";

export type Scheme = "light" | "dark";

interface Palette {
	/** surface-1: the page. */
	background: string;
	/** surface-2: cards that sit on the page. */
	surface2: string;
	/** surface-3: popups. */
	card: string;
	foreground: string;
	mutedForeground: string;
	muted: string;
	border: string;
	hover: string;
	active: string;
	tint: string;
	tintHover: string;
	focusRing: string;
	/** color-mix(in oklab, foreground 90% / 80%, background). */
	primaryHover: string;
	primaryActive: string;
	/** bg-muted/50 */
	mutedHalf: string;
	/** The popup edge that stands in for the --shadow-3 ring. */
	popupBorder: string;
	/** --shadow-color in light, --dm-drop in dark. */
	shadowColor: string;
	transparent: string;
}

/** Both columns of `light-dark()` in app/globals.css, resolved. `color-mix()` is mixed offline. */
const palettes: Record<Scheme, Palette> = {
	light: {
		background: "#FAFAFA",
		surface2: "#FCFCFC",
		card: "#FFFFFF",
		foreground: "#171717",
		mutedForeground: "#737373",
		muted: "#F4F4F5",
		border: "rgba(23,23,23,0.12)",
		hover: "rgba(0,0,0,0.04)",
		active: "rgba(0,0,0,0.07)",
		tint: "rgba(0,0,0,0.08)",
		tintHover: "rgba(0,0,0,0.065)",
		focusRing: "#6B97FF",
		primaryHover: "#292929",
		primaryActive: "#3d3d3d",
		mutedHalf: "rgba(244,244,245,0.5)",
		popupBorder: "rgba(0,0,0,0.06)",
		shadowColor: "rgba(0,0,0,0.06)",
		transparent: "rgba(0,0,0,0)",
	},
	dark: {
		background: "#171717",
		surface2: "#1E1E1E",
		card: "#252525",
		foreground: "#F5F5F5",
		mutedForeground: "#A3A3A3",
		muted: "#1E1E1E",
		border: "rgba(245,245,245,0.12)",
		hover: "rgba(255,255,255,0.06)",
		active: "rgba(255,255,255,0.1)",
		tint: "rgba(255,255,255,0.25)",
		tintHover: "rgba(255,255,255,0.2)",
		focusRing: "#6B97FF",
		primaryHover: "#dcdcdc",
		primaryActive: "#c3c3c3",
		mutedHalf: "rgba(30,30,30,0.5)",
		popupBorder: "rgba(255,255,255,0.05)",
		shadowColor: "rgba(0,0,0,0.18)",
		transparent: "rgba(0,0,0,0)",
	},
};

/**
 * gpuix has no `prefers-color-scheme` to read, so the theme is a choice
 * between light and dark only; there is no "System".
 */
export const [scheme, setScheme] = createSignal<Scheme>("dark");

/**
 * Every token reads the scheme signal, so any JSX expression or `createEffect`
 * that touches `color.x` re-runs when the theme changes. Read tokens inside
 * JSX props or functions, never at module scope.
 */
export const color = Object.defineProperties(
	{} as Palette,
	Object.fromEntries(
		(Object.keys(palettes.light) as (keyof Palette)[]).map((key) => [
			key,
			{ enumerable: true, get: () => palettes[scheme()][key] },
		]),
	),
);

/** Type scale, default step: `typeStyles` in lib/type-scale.ts. */
export const type = {
	display: { fontSize: 28, lineHeight: 34 },
	title: { fontSize: 16, lineHeight: 22 },
	body: { fontSize: 13, lineHeight: 20 },
	bodyCompact: { fontSize: 12, lineHeight: 18 },
	caption: { fontSize: 12, lineHeight: 16 },
	micro: { fontSize: 11, lineHeight: 14 },
	microCompact: { fontSize: 10, lineHeight: 12 },
} as const;

/**
 * Inter is not loadable (gpuix has no font API), so this resolves to the macOS
 * system face. Variable-font weights 400 / 550 become the nearest cut.
 */
export const fontFamily = "Helvetica Neue";
export const weight = { normal: 400, semibold: 550 } as const;

export const radius = {
	item: 8,
	focusRing: 10,
	container: 12,
} as const;

export const height = {
	control: 36,
	controlCompact: 28,
	menuRow: 32,
	menuSubRow: 28,
	groupLabel: 32,
} as const;

/**
 * lib/springs.ts. Enters are native springs; exits are the plain tweens the
 * source uses one tier quicker. `snap` is a zero-length tween: a reflow moved
 * the row, not the pointer.
 */
export const motion = {
	fast: { type: "spring", duration: 0.08, bounce: 0 },
	moderate: { type: "spring", duration: 0.16, bounce: 0 },
	fastExit: { duration: 0.06 },
	moderateExit: { duration: 0.12 },
	snap: { duration: 0 },
} satisfies Record<string, MotionTransition>;

/**
 * gpuix paints one outer shadow, so --shadow-3 (a 1px ring plus two stacked
 * drops) is its largest drop alone; the ring becomes a real border.
 */
export function shadow3(): BoxShadow {
	return {
		offsetX: 0,
		offsetY: 3,
		blurRadius: 3,
		spreadRadius: -1.5,
		color: color.shadowColor,
	};
}
