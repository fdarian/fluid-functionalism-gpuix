import type { StateStyleDesc } from '@ghia/solid';
import { type Scheme, scheme } from '#/lib/theme';

/** `app/compare/shadcn-theme.css`: the canonical shadcn "default" style, "neutral" base colour, in both schemes. */
interface Tokens {
	background: string;
	foreground: string;
	popover: string;
	popoverForeground: string;
	primary: string;
	primaryForeground: string;
	muted: string;
	mutedForeground: string;
	accent: string;
	accentForeground: string;
	border: string;
	input: string;
	ring: string;
	destructive: string;
}

const tokens: Record<Scheme, Tokens> = {
	light: {
		background: '#FFFFFF',
		foreground: '#0A0A0A',
		popover: '#FFFFFF',
		popoverForeground: '#0A0A0A',
		primary: '#171717',
		primaryForeground: '#FAFAFA',
		muted: '#F5F5F5',
		mutedForeground: '#737373',
		accent: '#F5F5F5',
		accentForeground: '#171717',
		border: '#E5E5E5',
		input: '#E5E5E5',
		ring: '#0A0A0A',
		destructive: '#EF4444',
	},
	dark: {
		background: '#0A0A0A',
		foreground: '#FAFAFA',
		popover: '#0A0A0A',
		popoverForeground: '#FAFAFA',
		primary: '#FAFAFA',
		primaryForeground: '#171717',
		muted: '#262626',
		mutedForeground: '#A3A3A3',
		accent: '#262626',
		accentForeground: '#FAFAFA',
		border: '#262626',
		input: '#262626',
		ring: '#D4D4D4',
		destructive: '#7F1D1D',
	},
};

/** The shadcn tokens, resolved in the page's scheme. Read them inside JSX props or effects, like `color`. */
export const sc = Object.defineProperties(
	{} as Tokens,
	Object.fromEntries(
		(Object.keys(tokens.light) as (keyof Tokens)[]).map((key) => [
			key,
			{ enumerable: true, get: () => tokens[scheme()][key] },
		]),
	),
);

/** Tailwind's `rounded-sm` / `rounded-md`. */
export const scRadius = { sm: 4, md: 6 } as const;

/** `focus-visible:ring-2 ring-ring ring-offset-2`. */
export function scRing(): StateStyleDesc {
	return {
		outlineWidth: 2,
		outlineStyle: 'solid',
		outlineColor: sc.ring,
		outlineOffset: 2,
	};
}
