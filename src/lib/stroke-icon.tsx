import { type MotionTransition, motion } from "@gpuix/solid";
import { For } from "solid-js";
import { type IconRef, iconNodes } from "./icons";

/** FF's `transition-[stroke-width] duration-80`: Tailwind's default curve. */
const STROKE_EASE: MotionTransition = { duration: 0.08, ease: [0.4, 0, 0.2, 1] };

interface Shape {
	tag: string;
	attrs: Record<string, string>;
}

/** The glyph's inner markup (lucide's `<path/>`, `<rect/>`, `<circle/>`, `<line/>` nodes) as shapes. */
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
		case "path":
			return <path d={attrs.d} />;
		case "circle":
			return <circle cx={attrs.cx} cy={attrs.cy} r={attrs.r} />;
		case "rect":
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
		case "line":
			return <line x1={attrs.x1} y1={attrs.y1} x2={attrs.x2} y2={attrs.y2} />;
		default:
			throw new Error(`StrokeIcon does not draw <${props.shape.tag}>`);
	}
}

/**
 * An `Icon` whose stroke width eases when `strokeWidth` changes. `Icon` bakes the width into its SVG source, so it can only switch; this draws the same glyph as shapes inside one animated group that the shapes inherit the width from.
 */
export function StrokeIcon(props: {
	name: IconRef;
	size: number;
	strokeWidth: number;
	color: string;
}) {
	const shapes = () => parseShapes(iconNodes(props.name));
	return (
		<svg
			viewBox="0 0 24 24"
			style={{
				width: props.size,
				height: props.size,
				flexShrink: 0,
				color: props.color,
			}}
		>
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
	);
}
