import { scheme, sizeChoice } from "../../lib/theme";

/** `typeStyles` of lib/type-scale.ts: every role at both steps, in px. */
export const typeStyles = {
	display: {
		default: { fontSize: 28, lineHeight: 34 },
		compact: { fontSize: 24, lineHeight: 30 },
	},
	title: {
		default: { fontSize: 16, lineHeight: 22 },
		compact: { fontSize: 15, lineHeight: 20 },
	},
	subtitle: {
		default: { fontSize: 14, lineHeight: 20 },
		compact: { fontSize: 13, lineHeight: 18 },
	},
	body: {
		default: { fontSize: 13, lineHeight: 20 },
		compact: { fontSize: 12, lineHeight: 18 },
	},
	caption: {
		default: { fontSize: 12, lineHeight: 16 },
		compact: { fontSize: 11, lineHeight: 14 },
	},
} as const;

export type TypeRole = keyof typeof typeStyles;

export function roleStyle(role: TypeRole) {
	return typeStyles[role][sizeChoice()];
}

/** `TYPESET_SPACE` of lib/typeset/generate.ts: room between blocks in px, listed by what it sits around. */
export const TYPESET_SPACE = {
	block: { default: 12, compact: 8 },
	heading: { default: 8, compact: 4 },
	section: { default: 24, compact: 16 },
	subsection: { default: 20, compact: 12 },
	rule: { default: 24, compact: 16 },
	item: { default: 4, compact: 4 },
} as const;

export function space(name: keyof typeof TYPESET_SPACE) {
	return TYPESET_SPACE[name][sizeChoice()];
}

/** `TYPESET_CHECK` and `TYPESET_SUB_INDENT`: the to-do box, its radius, its gap to the text, and a sub-list's step in. */
export const TYPESET_CHECK = {
	box: { default: 16, compact: 14 },
	radius: { default: 5, compact: 4 },
	gap: { default: 8, compact: 4 },
} as const;
export const TYPESET_SUB_INDENT = { default: 20, compact: 16 } as const;

/** `border-border/40`: `color.border` is an rgba, which `withAlpha` cannot mix, so it is the 12% colour's 40% written out. */
export function borderFainter() {
	return scheme() === "light"
		? "rgba(23,23,23,0.048)"
		: "rgba(245,245,245,0.048)";
}
