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

/** The marker's open chevron, two strokes: its tip on the path's end, its arms 5.5px back and 3.5px to each side. */
const CHEVRON_BACK = 5.5;
const CHEVRON_SIDE = 3.5;

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * A quadratic Bézier from base anchors and a dial: rotation pivots the chord
 * around its midpoint, x/y translate the whole arrow, curve sets the
 * perpendicular bow of the control point. `head` is the chevron that the
 * source draws with an SVG `marker`, which gpuix's `<svg>` does not support
 * (FORK.md:762), laid along the curve's end tangent.
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
	const tangent = Math.atan2(e.y - control.y, e.x - control.x);
	const arm = (side: number): Point => ({
		x: e.x - Math.cos(tangent) * CHEVRON_BACK - Math.sin(tangent) * side,
		y: e.y - Math.sin(tangent) * CHEVRON_BACK + Math.cos(tangent) * side,
	});
	const left = arm(-CHEVRON_SIDE);
	const right = arm(CHEVRON_SIDE);
	return {
		line: `M${round(s.x)},${round(s.y)} Q${round(control.x)},${round(control.y)} ${round(e.x)},${round(e.y)}`,
		head: `M${round(left.x)},${round(left.y)} L${round(e.x)},${round(e.y)} L${round(right.x)},${round(right.y)}`,
	};
}

export interface Arrow {
	line: string;
	head: string;
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
			<For each={props.arrows}>
				{(arrow) => (
					<>
						<path
							d={arrow.line}
							fill="none"
							stroke={arrow.color}
							strokeWidth={1.5}
							strokeLinecap="round"
						/>
						<path
							d={arrow.head}
							fill="none"
							stroke={arrow.color}
							strokeWidth={1.5}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</>
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
					fontWeight: weight.semibold,
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
