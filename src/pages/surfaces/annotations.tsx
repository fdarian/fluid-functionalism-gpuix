import { For } from 'solid-js';
import { MONO } from '#/lib/doc-page';
import { color, type as scale, siteType, weight } from '#/lib/theme';

export const ANNOTATION_BLUE = '#6B97FF';
/** Red marks the collapse: the dialog and the dropdown share one surface. The page background stays blue, as orienting context. */
export const ANNOTATION_RED = '#FF6B6B';

export interface Point {
	x: number;
	y: number;
}

export interface ArrowDial {
	x: number;
	y: number;
	rotation: number;
	curve: number;
	labelX: number;
	labelY: number;
}

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * A quadratic Bézier from base anchors and a dial: rotation pivots the chord
 * around its midpoint, x/y translate the whole arrow, curve sets the
 * perpendicular bow of the control point. The path's end is the arrow's tip.
 */
export function buildArrow(start: Point, end: Point, dial: ArrowDial) {
	const mx = (start.x + end.x) / 2;
	const my = (start.y + end.y) / 2;
	const angle = (dial.rotation * Math.PI) / 180;
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const place = (px: number, py: number): Point => ({
		x: mx + (px - mx) * cos - (py - my) * sin + dial.x,
		y: my + (px - mx) * sin + (py - my) * cos + dial.y,
	});
	const s = place(start.x, start.y);
	const e = place(end.x, end.y);
	const dx = e.x - s.x;
	const dy = e.y - s.y;
	const len = Math.hypot(dx, dy) || 1;
	const control = {
		x: (s.x + e.x) / 2 + (-dy / len) * dial.curve,
		y: (s.y + e.y) / 2 + (dx / len) * dial.curve,
	};
	return `M${round(s.x)},${round(s.y)} Q${round(control.x)},${round(control.y)} ${round(e.x)},${round(e.y)}`;
}

/** The open chevron that ends every annotation arrow (two strokes, in the stroke colour of the path it ends), for a `<defs>`. */
export function ArrowMarker(props: { id: string }) {
	return (
		<marker
			id={props.id}
			viewBox="0 0 12 12"
			markerWidth="12"
			markerHeight="12"
			refX="8.5"
			refY="6"
			orient="auto"
			markerUnits="userSpaceOnUse"
		>
			<path
				d="M3,2.5 L8.5,6 L3,9.5"
				fill="none"
				stroke="context-stroke"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</marker>
	);
}

export interface Arrow {
	/** The path's `d`, from `buildArrow`. */
	line: string;
	color: string;
}

/** The shared overlay the arrows are drawn in: 1 unit is 1px. */
export function ArrowOverlay(props: {
	width: number;
	height: number;
	arrows: readonly Arrow[];
}) {
	return (
		<svg
			viewBox={`0 0 ${props.width} ${props.height}`}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: props.width,
				height: props.height,
				pointerEvents: 'none',
			}}
		>
			<defs>
				<ArrowMarker id="ff-annotation-arrow" />
			</defs>
			<For each={props.arrows}>
				{(arrow) => (
					<path
						d={arrow.line}
						fill="none"
						stroke={arrow.color}
						strokeWidth={1.5}
						strokeLinecap="round"
						markerEnd="url(#ff-annotation-arrow)"
					/>
				)}
			</For>
		</svg>
	);
}

/** A callout's swatch: 10px, 3px radius, a `border-white/15` edge. */
export function Swatch(props: { hex: string }) {
	return (
		<div
			style={{
				width: 10,
				height: 10,
				flexShrink: 0,
				borderRadius: 3,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: 'rgba(255,255,255,0.15)',
				backgroundColor: props.hex,
			}}
		/>
	);
}

/** A label chip: the surface's name over its swatch and hex. */
export function Callout(props: {
	title: string;
	hex: string;
	left: number;
	top: number;
	width: number;
}) {
	return (
		<div
			style={{
				position: 'absolute',
				left: props.left,
				top: props.top,
				width: props.width,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: 2,
			}}
		>
			<text
				style={{
					...siteType.caption,
					fontVariationSettings: weight.semibold,
					color: color.foreground,
				}}
			>
				{props.title}
			</text>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					gap: 6,
				}}
			>
				<Swatch hex={props.hex} />
				<text
					style={{
						fontFamily: MONO,
						...scale.micro,
						color: color.mutedForeground,
					}}
				>
					{props.hex}
				</text>
			</div>
		</div>
	);
}
