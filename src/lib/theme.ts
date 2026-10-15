import type {
	BoxShadow,
	MotionTransition,
	StateStyleDesc,
} from "@gpuix/solid";
import { type Accessor, createSignal } from "solid-js";

export type Scheme = "light" | "dark";

interface Palette {
	/** surface-1: the page. */
	background: string;
	/** The window frame around the page panel; this port's own, not in globals.css. */
	chrome: string;
	/** surface-2: cards that sit on the page. */
	surface2: string;
	/** surface-3: popups. */
	card: string;
	/** surface-5: dialogs. */
	surface5: string;
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
	accent: string;
	/** bg-accent/40: the table's row rules. */
	accentFaint: string;
	/** border-border/60: card dividers and frames. */
	borderFaint: string;
	destructive: string;
	info: string;
	success: string;
	warning: string;
	/** `--selected`, `--destructive-light`. */
	selected: string;
	destructiveLight: string;
	/** The tint direction of `rgb(var(--overlay))`: black on light, white on dark. */
	overlay: string;
	/** neutral-400 (neutral-500 in dark): a control border on hover or focus. */
	borderStrong: string;
	/** `--surface-4`, `-6`, `-7`, `-8`: the raised steps (`surface5` and `card` are above). */
	surface4: string;
	surface6: string;
	surface7: string;
	surface8: string;
	/** `--checker-a` / `--checker-b`. */
	checkerA: string;
	checkerB: string;
	/** Behind dialogs and drawers: `bg-black/40`, `dark:bg-black/80`. */
	scrim: string;
	/** `color-mix(in oklab, accent, background 45% / 68%)`. */
	chatBubble: string;
	queuedCard: string;
	/** `bg-accent/20` (`dark:bg-accent/12`) and `bg-selected/50` (`dark:bg-accent/40`), resolved. */
	accentWash: string;
	selectedWash: string;
	/** Switch track on, on hover, and off on hover (`--accent` mixed with 10% overlay). */
	switchOn: string;
	switchOnHover: string;
	switchOffHover: string;
	/** The ends of the thinking shimmer's sweep. */
	shimmerBase: string;
	shimmerBright: string;
}

/** Both columns of `light-dark()` in app/globals.css, resolved. `color-mix()` is mixed offline. */
const palettes: Record<Scheme, Palette> = {
	light: {
		background: "#FAFAFA",
		chrome: "#EFEFEF",
		surface2: "#FCFCFC",
		card: "#FFFFFF",
		surface5: "#FFFFFF",
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
		accent: "#E5E5E5",
		accentFaint: "rgba(229,229,229,0.4)",
		borderFaint: "rgba(23,23,23,0.072)",
		destructive: "#EF4444",
		info: "#3B82F6",
		success: "#22C55E",
		warning: "#F59E0B",
		selected: "#D4D4D4",
		destructiveLight: "#FEF2F2",
		overlay: "#000000",
		borderStrong: "#A3A3A3",
		surface4: "#FFFFFF",
		surface6: "#FFFFFF",
		surface7: "#FFFFFF",
		surface8: "#FFFFFF",
		checkerA: "#bbbbbb",
		checkerB: "#ffffff",
		scrim: "rgba(0,0,0,0.4)",
		chatBubble: "#eeeeee",
		queuedCard: "#f3f3f3",
		accentWash: "rgba(229,229,229,0.2)",
		selectedWash: "rgba(212,212,212,0.5)",
		switchOn: "#6B97FF",
		switchOnHover: "#5C89F2",
		switchOffHover: "#CECECE",
		shimmerBase: "#a3a3a3",
		shimmerBright: "#525252",
	},
	dark: {
		background: "#171717",
		chrome: "#0E0E0E",
		surface2: "#1E1E1E",
		card: "#252525",
		surface5: "#333333",
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
		accent: "#525252",
		accentFaint: "rgba(82,82,82,0.4)",
		borderFaint: "rgba(245,245,245,0.072)",
		destructive: "#FCA5A5",
		info: "#93C5FD",
		success: "#86EFAC",
		warning: "#FCD34D",
		selected: "#525252",
		destructiveLight: "#450A0A",
		overlay: "#FFFFFF",
		borderStrong: "#737373",
		surface4: "#2C2C2C",
		surface6: "#3A3A3A",
		surface7: "#414141",
		surface8: "#484848",
		checkerA: "#1f1f1f",
		checkerB: "#2a2a2a",
		scrim: "rgba(0,0,0,0.8)",
		chatBubble: "#363636",
		queuedCard: "#292929",
		accentWash: "rgba(82,82,82,0.12)",
		selectedWash: "rgba(82,82,82,0.4)",
		switchOn: "#6B97FF",
		switchOnHover: "#5C89F2",
		switchOffHover: "#636363",
		shimmerBase: "#525252",
		shimmerBright: "#a3a3a3",
	},
};

export type ThemeChoice = "system" | "light" | "dark";

export const [themeChoice, setThemeChoice] =
	createSignal<ThemeChoice>("system");

let systemScheme: Accessor<Scheme> | undefined;

/**
 * `createAppearance()` throws outside a gpuix root, so the App root binds it
 * once here and "system" reads it through `scheme()`.
 */
export function bindSystemScheme(accessor: Accessor<Scheme>) {
	systemScheme = accessor;
}

export function scheme(): Scheme {
	const choice = themeChoice();
	if (choice !== "system") return choice;
	if (systemScheme === undefined) {
		throw new Error(
			"The system scheme is unbound: call bindSystemScheme first",
		);
	}
	return systemScheme();
}

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

/** A hex token as `color-mix(in oklab, token N%, transparent)`. */
export function withAlpha(hex: string, alpha: number) {
	if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
		throw new Error(`withAlpha needs a #RRGGBB token, got ${hex}`);
	}
	const red = Number.parseInt(hex.slice(1, 3), 16);
	const green = Number.parseInt(hex.slice(3, 5), 16);
	const blue = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${red},${green},${blue},${alpha})`;
}

/** `--surface-N`: 1 is the page, 2 the cards on it, 3 the popups, and up the raised steps. */
export function surface(level: number) {
	switch (level) {
		case 1:
			return color.background;
		case 2:
			return color.surface2;
		case 3:
			return color.card;
		case 4:
			return color.surface4;
		case 5:
			return color.surface5;
		case 6:
			return color.surface6;
		case 7:
			return color.surface7;
		case 8:
			return color.surface8;
		default:
			throw new Error(`There is no surface level ${level}`);
	}
}

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

/** The static cuts are loaded in `lib/fonts.ts`. The site's semibold is variable `wght 550`; with static cuts only, SemiBold 600 is the nearest. */
export const fontFamily = "Inter";
export const weight = { normal: 400, medium: 500, semibold: 600 } as const;

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
	slow: { type: "spring", duration: 0.24, bounce: 0.12 },
	slowExit: { duration: 0.16 },
	snap: { duration: 0 },
} satisfies Record<string, MotionTransition>;

/** The `focus-visible` ring: a 1px outline `offset` px from the box (negative draws inside). */
export function focusRing(offset: number): StateStyleDesc {
	return {
		outlineWidth: 1,
		outlineColor: color.focusRing,
		outlineOffset: offset,
	};
}

/** How long rows keep moving after something resized them: a spring's perceived duration plus its tail. */
export const trackMs = { spring: 400 } as const;

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
