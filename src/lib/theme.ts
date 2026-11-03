import type { MotionTransition, StateStyleDesc } from '@ghia/solid';
import {
	type Accessor,
	createComponent,
	createContext,
	createSignal,
	type JSX,
	onCleanup,
	useContext,
} from 'solid-js';

export type Scheme = 'light' | 'dark';

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
		background: '#FAFAFA',
		chrome: '#EFEFEF',
		surface2: '#FCFCFC',
		card: '#FFFFFF',
		surface5: '#FFFFFF',
		foreground: '#171717',
		mutedForeground: '#737373',
		muted: '#F4F4F5',
		border: 'rgba(23,23,23,0.12)',
		hover: 'rgba(0,0,0,0.04)',
		active: 'rgba(0,0,0,0.07)',
		tint: 'rgba(0,0,0,0.08)',
		tintHover: 'rgba(0,0,0,0.065)',
		focusRing: '#6B97FF',
		primaryHover: '#292929',
		primaryActive: '#3d3d3d',
		mutedHalf: 'rgba(244,244,245,0.5)',
		shadowColor: 'rgba(0,0,0,0.06)',
		transparent: 'rgba(0,0,0,0)',
		accent: '#E5E5E5',
		accentFaint: 'rgba(229,229,229,0.4)',
		borderFaint: 'rgba(23,23,23,0.072)',
		destructive: '#EF4444',
		info: '#3B82F6',
		success: '#22C55E',
		warning: '#F59E0B',
		selected: '#D4D4D4',
		destructiveLight: '#FEF2F2',
		overlay: '#000000',
		borderStrong: '#A3A3A3',
		surface4: '#FFFFFF',
		surface6: '#FFFFFF',
		surface7: '#FFFFFF',
		surface8: '#FFFFFF',
		checkerA: '#bbbbbb',
		checkerB: '#ffffff',
		scrim: 'rgba(0,0,0,0.4)',
		chatBubble: '#eeeeee',
		queuedCard: '#f3f3f3',
		accentWash: 'rgba(229,229,229,0.2)',
		selectedWash: 'rgba(212,212,212,0.5)',
		switchOn: '#6B97FF',
		switchOnHover: '#5C89F2',
		switchOffHover: '#CECECE',
		shimmerBase: '#a3a3a3',
		shimmerBright: '#525252',
	},
	dark: {
		background: '#171717',
		chrome: '#0E0E0E',
		surface2: '#1E1E1E',
		card: '#252525',
		surface5: '#333333',
		foreground: '#F5F5F5',
		mutedForeground: '#A3A3A3',
		muted: '#1E1E1E',
		border: 'rgba(245,245,245,0.12)',
		hover: 'rgba(255,255,255,0.06)',
		active: 'rgba(255,255,255,0.1)',
		tint: 'rgba(255,255,255,0.25)',
		tintHover: 'rgba(255,255,255,0.2)',
		focusRing: '#6B97FF',
		primaryHover: '#dcdcdc',
		primaryActive: '#c3c3c3',
		mutedHalf: 'rgba(30,30,30,0.5)',
		shadowColor: 'rgba(0,0,0,0.18)',
		transparent: 'rgba(0,0,0,0)',
		accent: '#525252',
		accentFaint: 'rgba(82,82,82,0.4)',
		borderFaint: 'rgba(245,245,245,0.072)',
		destructive: '#FCA5A5',
		info: '#93C5FD',
		success: '#86EFAC',
		warning: '#FCD34D',
		selected: '#525252',
		destructiveLight: '#450A0A',
		overlay: '#FFFFFF',
		borderStrong: '#737373',
		surface4: '#2C2C2C',
		surface6: '#3A3A3A',
		surface7: '#414141',
		surface8: '#484848',
		checkerA: '#1f1f1f',
		checkerB: '#2a2a2a',
		scrim: 'rgba(0,0,0,0.8)',
		chatBubble: '#363636',
		queuedCard: '#292929',
		accentWash: 'rgba(82,82,82,0.12)',
		selectedWash: 'rgba(82,82,82,0.4)',
		switchOn: '#6B97FF',
		switchOnHover: '#5C89F2',
		switchOffHover: '#636363',
		shimmerBase: '#525252',
		shimmerBright: '#a3a3a3',
	},
};

export type ThemeChoice = 'system' | 'light' | 'dark';

export const THEMES = [
	{ value: 'system', label: 'System', icon: 'monitor' },
	{ value: 'light', label: 'Light', icon: 'sun' },
	{ value: 'dark', label: 'Dark', icon: 'moon' },
] as const satisfies readonly {
	value: ThemeChoice;
	label: string;
	icon: string;
}[];

export const [themeChoice, setThemeChoice] =
	createSignal<ThemeChoice>('system');

let systemScheme: Accessor<Scheme> | undefined;

/**
 * `createAppearance()` throws outside a gpuix root, so the App root binds it
 * once here and "system" reads it through `scheme()`.
 */
export function bindSystemScheme(accessor: Accessor<Scheme>) {
	systemScheme = accessor;
}

const SchemeOverride = createContext<Scheme>();
/** Scopes alive right now; while there are none, `scheme()` skips the owner-chain lookup. */
let liveScopes = 0;

/**
 * FF's `.dark` / `.light` class on a subtree: every token read below it
 * resolves in `forced`, whatever the page's theme. Tokens are read through the
 * reactive owner, so a read in an event handler or a timer sees the page's
 * scheme instead.
 */
export function SchemeScope(props: {
	scheme: Scheme;
	children: JSX.Element;
}): JSX.Element {
	liveScopes++;
	onCleanup(() => {
		liveScopes--;
	});
	return createComponent(SchemeOverride.Provider, {
		get value() {
			return props.scheme;
		},
		get children() {
			return props.children;
		},
	});
}

export function scheme(): Scheme {
	if (liveScopes > 0) {
		const forced = useContext(SchemeOverride);
		if (forced !== undefined) return forced;
	}
	const choice = themeChoice();
	if (choice !== 'system') return choice;
	if (systemScheme === undefined) {
		throw new Error(
			'The system scheme is unbound: call bindSystemScheme first',
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

/** The source's `[text-box:trim-both_cap_alphabetic]`: a label's box ends at its capitals and baseline. */
export const capTrim = 'trim-both cap alphabetic';

/**
 * The trim for a label that clips (`overflow: hidden`). The clip box is the
 * trimmed one, so it would shave the ascenders and descenders; padding extends
 * it and the negative margins take that back out of the layout, as the source's
 * `py-1 -my-1` (or `0.25em`) does.
 */
export function clippedCapTrim(pad: number | string = 4) {
	const negative = typeof pad === 'number' ? -pad : `-${pad}`;
	return {
		textBox: capTrim,
		paddingTop: pad,
		paddingBottom: pad,
		marginTop: negative,
		marginBottom: negative,
	};
}

/** Type scale, default step: `typeStyles` in lib/type-scale.ts. */
export const type = {
	display: { fontSize: 28, lineHeight: '34px' },
	title: { fontSize: 16, lineHeight: '22px' },
	body: { fontSize: 13, lineHeight: '20px' },
	bodyCompact: { fontSize: 12, lineHeight: '18px' },
	caption: { fontSize: 12, lineHeight: '16px' },
	captionCompact: { fontSize: 11, lineHeight: '14px' },
	micro: { fontSize: 11, lineHeight: '14px' },
	microCompact: { fontSize: 10, lineHeight: '12px' },
} as const;

export type SizeChoice = 'default' | 'compact';

export const SIZES = [
	{ value: 'default', label: 'Default' },
	{ value: 'compact', label: 'Compact' },
] as const satisfies readonly { value: SizeChoice; label: string }[];

/** The Size row of the customise card, and the ambient size components start from when a use gives none (`props.size ?? sizeChoice()`). */
export const [sizeChoice, setSizeChoice] = createSignal<SizeChoice>('default');

const siteTypeSteps = {
	display: {
		default: { fontSize: 28, lineHeight: '34px' },
		compact: { fontSize: 24, lineHeight: '30px' },
	},
	title: {
		default: { fontSize: 16, lineHeight: '22px' },
		compact: { fontSize: 15, lineHeight: '20px' },
	},
	subtitle: {
		default: { fontSize: 14, lineHeight: '20px' },
		compact: { fontSize: 13, lineHeight: '18px' },
	},
	body: {
		default: { fontSize: 13, lineHeight: '20px' },
		compact: { fontSize: 12, lineHeight: '18px' },
	},
	caption: {
		default: { fontSize: 12, lineHeight: '16px' },
		compact: { fontSize: 11, lineHeight: '14px' },
	},
	micro: {
		default: { fontSize: 11, lineHeight: '14px' },
		compact: { fontSize: 10, lineHeight: '12px' },
	},
} as const;

type SiteTypeRole = keyof typeof siteTypeSteps;

/**
 * The shell and page text roles (`text-site-*`), at the window's wide (>=640px) values, stepping down in compact.
 * Components keep `type`: they follow their own size prop. Read it inside JSX props or effects, like `color`.
 */
export const siteType = Object.defineProperties(
	{} as {
		readonly [Role in SiteTypeRole]: { fontSize: number; lineHeight: string };
	},
	Object.fromEntries(
		(Object.keys(siteTypeSteps) as SiteTypeRole[]).map((role) => [
			role,
			{ enumerable: true, get: () => siteTypeSteps[role][sizeChoice()] },
		]),
	),
);

/** A type token's line height in px. The tokens carry `'20px'` because a bare number is a multiple of the font size in gpuix, as in CSS. */
export function linePx(lineHeight: string) {
	if (!lineHeight.endsWith('px')) {
		throw new Error(`Line height ${lineHeight} is not in px`);
	}
	return Number.parseFloat(lineHeight);
}

/** The variable files are loaded in `lib/fonts.ts` and register as `Inter Variable`. */
export const fontFamily = 'Inter Variable';
/** The source's `fontWeights` (lib/font-weight.ts): each `wght` is paired with an `opsz` so the advance width stays nearly constant when the weight changes. */
export const weight = {
	normal: "'wght' 400, 'opsz' 14",
	semibold: "'wght' 550, 'opsz' 18",
	bold: "'wght' 700, 'opsz' 25",
} as const;

/** The rounded values, for surfaces the source pins to rounded (popups, menu rows). Everything else reads `shape`. */
export const radius = {
	item: 8,
	focusRing: 10,
	container: 12,
} as const;

export type ShapeChoice = 'rounded' | 'pill';

export const SHAPES = [
	{ value: 'rounded', label: 'Rounded', icon: 'rectangle-horizontal' },
	{ value: 'pill', label: 'Pill', icon: 'circle' },
] as const satisfies readonly {
	value: ShapeChoice;
	label: string;
	icon: string;
}[];

export const [shapeChoice, setShapeChoice] =
	createSignal<ShapeChoice>('rounded');

/** Radius for a surface inset inside another rounded one, clamped at 0. */
export function nestedRadius(
	outerRadius: number,
	inset: number,
	borderWidth = 0,
) {
	return Math.max(0, outerRadius - inset - borderWidth);
}

function byShape(rounded: number, pill: number) {
	return shapeChoice() === 'pill' ? pill : rounded;
}

/**
 * shape-context.tsx's shapeMap as numbers. Like `color`, read it inside JSX
 * props or effects, never at module scope, so a Radius change reaches it.
 */
export const shape = {
	get item() {
		return byShape(8, 20);
	},
	get bg() {
		return byShape(8, 20);
	},
	get button() {
		return byShape(8, 20);
	},
	get input() {
		return byShape(8, 20);
	},
	get container() {
		return byShape(12, 24);
	},
	get mergedBg() {
		return byShape(8, 16);
	},
	get focusRing() {
		return byShape(10, 22);
	},
};

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
	fast: { type: 'spring', duration: 0.08, bounce: 0 },
	moderate: { type: 'spring', duration: 0.16, bounce: 0 },
	fastExit: { duration: 0.06 },
	moderateExit: { duration: 0.12 },
	slow: { type: 'spring', duration: 0.24, bounce: 0.12 },
	slowExit: { duration: 0.16 },
	snap: { duration: 0 },
} satisfies Record<string, MotionTransition>;

/**
 * A Tailwind `transition-[a,b]`: the listed properties ease to a new value, whether it came from a signal or a
 * state style (`hover`, `active`, `focusVisible`), on Tailwind's default curve unless the source names its own. Names are kebab-case CSS.
 */
export function fade(
	properties: readonly string[],
	ms: number,
	ease = 'cubic-bezier(0.4, 0, 0.2, 1)',
) {
	return {
		transitionProperty: properties.join(','),
		transitionDuration: `${ms}ms`,
		transitionTimingFunction: ease,
	};
}

/** Tailwind v4's `transition-transform`: the four transform properties ease on the default curve. */
export function transformFade(ms: number) {
	return fade(['transform', 'translate', 'scale', 'rotate'], ms);
}

/** Tailwind v4's `transition-colors` list. `text-decoration-color` is left out: gpuix's CSS transitions do not animate it. */
const COLORS = [
	'color',
	'background-color',
	'border-color',
	'outline-color',
	'fill',
	'stroke',
];

/** `transition-colors duration-80`, the source's usual: Tailwind's default curve over 80 ms. */
export const colorFade = fade(COLORS, 80);

/** `transition-[font-variation-settings] duration-80`: the weight eases between two tokens that name the same axes. */
export const weightFade = fade(['font-variation-settings'], 80);

/** `transition-[color,font-variation-settings] duration-80`, the source's ghost-grid label; `color` is `transition-colors`' four colours here. */
export const colorWeightFade = fade([...COLORS, 'font-variation-settings'], 80);

/** `transition-colors` with no duration class: Tailwind's default 150 ms. */
export const colorFadeDefault = fade(COLORS, 150);

/**
 * `transition-colors` minus `outline-color`, for elements whose focus ring is not an outline (a box-shadow ring, or none)
 * and so must not fade in with the colours. Default curve unless `ease` is given.
 */
export function colorFadeNoRing(ms: number, ease?: string) {
	return fade(
		['color', 'background-color', 'border-color', 'fill', 'stroke'],
		ms,
		ease,
	);
}

/**
 * A CSS stand-in for the source's `spring.fast` (80 ms, bounce 0) where it animates a colour or an outline: a
 * critically damped spring has no bezier of its own, so this is the closest fit to its position curve (within
 * 0.015 of it across the 80 ms).
 */
export function springFade(properties: readonly string[]) {
	return fade(properties, 80, 'cubic-bezier(0.2, 0.05, 0.2, 1)');
}

/**
 * Button's surface layer: `box-shadow` eases over 180ms on a snappy curve and `background-color` over 80ms, both 80ms
 * while pressed. The pressed list goes in the `active` style, which gpuix uses while entering it; the base one is used
 * on the way out. The focus ring and the disabled dim stay out of the list: the source does not ease them either.
 */
export const surfaceFade = {
	transitionProperty: 'box-shadow,background-color',
	transitionDuration: '180ms,80ms',
	transitionTimingFunction: 'cubic-bezier(0.23,1,0.32,1),ease',
};
export const pressFade = { ...surfaceFade, transitionDuration: '80ms,80ms' };

/** The `focus-visible` ring: a 1px outline `offset` px from the box (negative draws inside). */
export function focusRing(offset: number): StateStyleDesc {
	return {
		outlineWidth: 1,
		outlineStyle: 'solid',
		outlineColor: color.focusRing,
		outlineOffset: offset,
	};
}

/** The drops of the ladder, level 2 up: offset, blur and spread each double from 1px. */
const DROPS = [
	'0 1px 1px -0.5px',
	'0 3px 3px -1.5px',
	'0 6px 6px -3px',
	'0 12px 12px -6px',
	'0 24px 24px -12px',
	'0 48px 48px -24px',
	'0 96px 96px -48px',
] as const;

/** The dark ladder per level: the inset highlight and ring alphas, and the outer hairline's. */
const DARK_STEPS = [
	{ highlight: null, ring: 0.02, hairline: null },
	{ highlight: 0.01, ring: 0.02, hairline: null },
	{ highlight: 0.02, ring: 0.02, hairline: 0.12 },
	{ highlight: 0.02, ring: 0.04, hairline: 0.14 },
	{ highlight: 0.04, ring: 0.04, hairline: 0.16 },
	{ highlight: 0.04, ring: 0.06, hairline: 0.18 },
	{ highlight: 0.06, ring: 0.06, hairline: 0.2 },
	{ highlight: 0.06, ring: 0.06, hairline: 0.22 },
] as const;

/** `--shadow-N` of app/globals.css for the scheme in scope, written out as a multi-layer `boxShadow`. */
export function shadow(level: number): string {
	if (!Number.isInteger(level) || level < 1 || level > 8) {
		throw new Error(`There is no shadow level ${level}`);
	}
	const drops = DROPS.slice(0, level - 1);
	if (scheme() === 'light') {
		return [
			`0 0 0 1px ${color.shadowColor}`,
			...drops.map((drop) => `${drop} ${color.shadowColor}`),
		].join(', ');
	}
	const step = DARK_STEPS[level - 1];
	const layers: string[] = [];
	if (step.highlight !== null) {
		layers.push(`inset 0 1px 0 0 rgba(255,255,255,${step.highlight})`);
	}
	layers.push(`inset 0 0 0 1px rgba(255,255,255,${step.ring})`);
	if (step.hairline !== null) {
		layers.push(`0 0 0 1px rgba(0,0,0,${step.hairline})`);
	}
	for (const drop of drops) layers.push(`${drop} ${color.shadowColor}`);
	return layers.join(', ');
}

/** Tailwind v4's `shadow-sm`, `shadow-md`, `shadow-lg` and `shadow-xl`, both drops of each (`shadow-sm` is also the bare `shadow`). */
export const twShadow = {
	sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
	md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
	lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
	xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;
