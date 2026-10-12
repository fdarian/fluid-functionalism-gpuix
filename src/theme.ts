import type { BoxShadow, MotionTransition } from "@gpuix/solid";

/** Light theme only: every `light-dark()` token in app/globals.css, resolved. */
export const color = {
	background: "#FAFAFA",
	foreground: "#171717",
	mutedForeground: "#737373",
	muted: "#F4F4F5",
	card: "#FFFFFF",
	// color-mix(in oklab, foreground 12%, transparent)
	border: "rgba(23,23,23,0.12)",
	hover: "rgba(0,0,0,0.04)",
	active: "rgba(0,0,0,0.07)",
	tint: "rgba(0,0,0,0.08)",
	tintHover: "rgba(0,0,0,0.065)",
	focusRing: "#6B97FF",
	// color-mix(in oklab, foreground 90% / 80%, background), mixed offline
	primaryHover: "#292929",
	primaryActive: "#3d3d3d",
	// bg-muted/50 over the page background
	mutedHalf: "rgba(244,244,245,0.5)",
	transparent: "rgba(0,0,0,0)",
} as const;

/** Type scale, default step: `typeStyles` in lib/type-scale.ts. */
export const type = {
	body: { fontSize: 13, lineHeight: 20 },
	bodyCompact: { fontSize: 12, lineHeight: 18 },
	caption: { fontSize: 12, lineHeight: 16 },
	micro: { fontSize: 11, lineHeight: 14 },
	microCompact: { fontSize: 10, lineHeight: 12 },
} as const;

/**
 * Inter is not loadable (gpuix has no font API), so this resolves to the macOS
 * system face. Variable-font weights 400 / 550 become 400 / 500.
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
 * Springs have no gpuix equivalent, so each tier becomes a native tween on the
 * same ease-out curve the Button's own box-shadow transition uses. Seconds.
 */
const easeOut: [number, number, number, number] = [0.23, 1, 0.32, 1];
export const motion = {
	fast: { duration: 0.12, ease: easeOut },
	fastExit: { duration: 0.06, ease: easeOut },
	moderate: { duration: 0.2, ease: easeOut },
	moderateExit: { duration: 0.12, ease: easeOut },
	fade: { duration: 0.08, ease: easeOut },
	snap: { duration: 0 },
} satisfies Record<string, MotionTransition>;

/**
 * gpuix paints one outer shadow, so --shadow-3 (a 1px ring plus two stacked
 * drops) is its largest drop alone; the ring becomes a real border.
 */
export const shadow3: BoxShadow = {
	offsetX: 0,
	offsetY: 3,
	blurRadius: 3,
	spreadRadius: -1.5,
	color: "rgba(0,0,0,0.06)",
};
