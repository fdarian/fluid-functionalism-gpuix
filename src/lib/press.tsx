import { shape } from '#/lib/theme';

const group = 'press';

/**
 * The style of the element that holds a `PressFill`. It is its own group, so a
 * button inside another group keeps its own hover and press, and positioned,
 * so the fill is placed against it.
 */
export const pressSurface = {
	group,
	position: 'relative',
} as const;

const fillTransition = {
	transitionProperty: 'top,right,bottom,left,border-radius,background-color',
	transitionDuration: '180ms,180ms,180ms,180ms,180ms,80ms',
	transitionTimingFunction:
		'cubic-bezier(0.23,1,0.32,1),cubic-bezier(0.23,1,0.32,1),cubic-bezier(0.23,1,0.32,1),cubic-bezier(0.23,1,0.32,1),cubic-bezier(0.23,1,0.32,1),ease',
};

const pressTransition = {
	...fillTransition,
	transitionDuration: '80ms,80ms,80ms,80ms,80ms,80ms',
};

const inset = (px: number) => ({
	top: px,
	right: px,
	bottom: px,
	left: px,
});

/**
 * The press effect of button.tsx: the fill sits 1px outside the pressable
 * (which is itself inset 1px from the button's bounds), and pressing pulls its
 * edges to the pressable's own. One quad paints the fill, so a rounded edge has
 * no seam and a translucent fill does not double up. The pressable spreads
 * `pressSurface` into its style, and its label is `position: relative` and
 * after the fill in the tree, as in the source, so it paints over the fill.
 */
export function PressFill(props: {
	rest: string;
	hover: string;
	active: string;
}) {
	return (
		<div
			style={{
				position: 'absolute',
				...inset(-1),
				borderRadius: shape.button + 1,
				backgroundColor: props.rest,
				pointerEvents: 'none',
				...fillTransition,
				groupHover: {
					group,
					backgroundColor: props.hover,
				},
				groupActive: {
					group,
					...inset(0),
					borderRadius: shape.button,
					backgroundColor: props.active,
					...pressTransition,
				},
			}}
		/>
	);
}
