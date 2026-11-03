import { type MotionTransition, motion } from '@ghia/solid';
import { For } from 'solid-js';
import { hasStrokeNodes, type IconRef, iconNodes, iconSource } from './icons';
import { colorFade } from './theme';

/** FF's `transition-[stroke-width] duration-80`: Tailwind's default curve. */
const STROKE_EASE: MotionTransition = {
	duration: 0.08,
	ease: [0.4, 0, 0.2, 1],
};

interface Shape {
	tag: string;
	attrs: Record<string, string>;
}

/** The glyph's inner markup (lucide's `<path/>`, `<rect/>`, `<circle/>`, `<line/>`, `<polyline/>`, `<polygon/>` nodes) as shapes. */
function parseShapes(nodes: string): Shape[] {
	return Array.from(nodes.matchAll(/<(\w+)\s+([^>]*?)\s*\/>/g)).map((match) => {
		const attrs: Record<string, string> = {};
		for (const attr of match[2].matchAll(/([\w-]+)="([^"]*)"/g))
			attrs[attr[1]] = attr[2];
		return { tag: match[1], attrs };
	});
}

function ShapeNode(props: { shape: Shape }) {
	const attrs = props.shape.attrs;
	switch (props.shape.tag) {
		case 'path':
			return <path d={attrs.d} />;
		case 'circle':
			return <circle cx={attrs.cx} cy={attrs.cy} r={attrs.r} />;
		case 'rect':
			return (
				<rect
					x={attrs.x}
					y={attrs.y}
					width={attrs.width}
					height={attrs.height}
					rx={attrs.rx}
					ry={attrs.ry}
				/>
			);
		case 'line':
			return <line x1={attrs.x1} y1={attrs.y1} x2={attrs.x2} y2={attrs.y2} />;
		case 'polyline':
			return <polyline points={attrs.points} />;
		case 'polygon':
			return <polygon points={attrs.points} />;
		default:
			throw new Error(
				`Icon does not draw <${props.shape.tag}> with easeStroke`,
			);
	}
}

export function Icon(props: {
	name: IconRef;
	size: number;
	strokeWidth: number;
	color: string;
	/** Ease a colour change over 80 ms. */
	fade?: boolean;
	/**
	 * Ease a stroke-width change over 80 ms. `Icon` otherwise bakes the width into its SVG source and can only switch; this draws the glyph as shapes inside one animated group that they inherit the width from. Phosphor's glyphs are filled paths whose weight is picked by the width, so there the weight switches at once.
	 */
	easeStroke?: boolean;
	/** A static turn, the source's `rotate-180` on the svg. */
	rotate?: string;
}) {
	const style = () => ({
		width: props.size,
		height: props.size,
		flexShrink: 0,
		color: props.color,
		...(props.rotate === undefined ? {} : { rotate: props.rotate }),
		...(props.fade === true ? colorFade : {}),
	});
	const shapes = () => parseShapes(iconNodes(props.name));
	return props.easeStroke === true && hasStrokeNodes(props.name) ? (
		<svg viewBox="0 0 24 24" style={style()}>
			<motion.g
				fill="none"
				stroke="currentColor"
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={false}
				animate={{ strokeWidth: props.strokeWidth }}
				transition={STROKE_EASE}
			>
				<For each={shapes()}>{(shape) => <ShapeNode shape={shape} />}</For>
			</motion.g>
		</svg>
	) : (
		<svg source={iconSource(props.name, props.strokeWidth)} style={style()} />
	);
}

/** The check of FF's select and combobox, running left to right. */
export const LIST_CHECK = 'M4 12L9 17L20 6';

/** The check draws in 80 ms ease-out and retracts in 40 ms ease-in. */
const DRAW_IN = { duration: 0.08, ease: 'easeOut' } as const;
const DRAW_OUT = { duration: 0.04, ease: 'easeIn' } as const;

/**
 * A check, or any short stroke mark, whose stroke draws in and retracts as
 * `checked` flips. The path is always mounted and starts at its current
 * state, so a row that is checked on mount shows the finished check, unless
 * `drawOnMount` starts it undrawn. Opacity only hides the zero-length dot
 * that a round cap leaves at `pathLength: 0`, switching at the end of the
 * retract and the start of the draw. A change of `strokeWidth` eases over 80 ms.
 */
export function CheckMark(props: {
	checked: boolean;
	size: number;
	strokeWidth: number;
	color: string;
	/** A path in the viewBox, drawn from its first point. */
	path: string;
	/** Defaults to a 24 x 24 box. */
	viewBox?: string;
	/** Draw in when mounted instead of showing the finished mark. */
	drawOnMount?: boolean;
	/** Ease a colour change over 80 ms. */
	fade?: boolean;
}) {
	return (
		<svg
			viewBox={props.viewBox ?? '0 0 24 24'}
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: props.color,
				...(props.fade === true ? colorFade : {}),
			}}
		>
			<motion.path
				d={props.path}
				fill="none"
				stroke="currentColor"
				strokeWidth={props.strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				initial={
					props.drawOnMount === true
						? { pathLength: 0, opacity: 0, strokeWidth: props.strokeWidth }
						: false
				}
				animate={{
					pathLength: props.checked ? 1 : 0,
					opacity: props.checked ? 1 : 0,
					strokeWidth: props.strokeWidth,
				}}
				transition={
					props.checked
						? {
								pathLength: DRAW_IN,
								opacity: { duration: 0 },
								strokeWidth: STROKE_EASE,
							}
						: {
								pathLength: DRAW_OUT,
								opacity: { duration: 0, delay: DRAW_OUT.duration },
								strokeWidth: STROKE_EASE,
							}
				}
			/>
		</svg>
	);
}
