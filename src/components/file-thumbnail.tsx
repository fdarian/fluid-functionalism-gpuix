import { motion } from '@gpuix/solid';
import { type JSX, Show } from 'solid-js';
import { useOnScreen } from '#/lib/cull';
import { Icon } from '#/lib/icon';
import { defineIcon } from '#/lib/icons';
import { color, shape, withAlpha } from '#/lib/theme';

const fileGlyph = defineIcon(
	'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
);

/** What the browser's `File` supplies to the original: a name, a mime type and, for an image, somewhere to read pixels from. */
export interface FileLike {
	name: string;
	type: string;
	/** Filesystem path or data URL. Without one an image has nothing to show. */
	src?: string;
}

const SPINNER_SIZE = 24;
const SPINNER_RADIUS = 11;
const SPINNER_CIRCUMFERENCE = 2 * Math.PI * SPINNER_RADIUS;
/** The arc of `border-t-muted-foreground`: a quarter of the ring. */
const ARC_LENGTH = SPINNER_CIRCUMFERENCE / 4;
/** A circle's stroke starts at 3 o'clock; the arc sits centred on 12 o'clock, 225 degrees clockwise from there. */
const ARC_START = (SPINNER_CIRCUMFERENCE * 225) / 360;

const ARC = {
	cx: 12,
	cy: 12,
	r: SPINNER_RADIUS,
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeDasharray: `${ARC_LENGTH} ${SPINNER_CIRCUMFERENCE - ARC_LENGTH}`,
};

/**
 * The thin ring with one accented quadrant, turning once a second like
 * `animate-spin`. gpuix cannot rotate, and a CSS keyframe cannot reach an SVG
 * attribute, so a native `motion.circle` slides the dash of a still circle one
 * lap (`strokeDashoffset` over one circumference). It runs only while the
 * spinner is on screen.
 */
export function Spinner() {
	const onScreen = useOnScreen();
	return (
		<div
			style={{
				width: SPINNER_SIZE,
				height: SPINNER_SIZE,
				position: 'relative',
				flexShrink: 0,
			}}
		>
			<Icon
				name={defineIcon('<circle cx="12" cy="12" r="11"/>')}
				size={SPINNER_SIZE}
				strokeWidth={2}
				color={color.border}
			/>
			<svg
				viewBox="0 0 24 24"
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: SPINNER_SIZE,
					height: SPINNER_SIZE,
					color: color.mutedForeground,
				}}
			>
				<Show
					when={onScreen()}
					fallback={<circle {...ARC} strokeDashoffset={-ARC_START} />}
				>
					<motion.circle
						{...ARC}
						animate={{
							strokeDashoffset: [
								-ARC_START,
								-(ARC_START + SPINNER_CIRCUMFERENCE),
							],
						}}
						transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
					/>
				</Show>
			</svg>
		</div>
	);
}

function centered(children: JSX.Element) {
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			{children}
		</div>
	);
}

/**
 * Read-only square preview of a file: the image covers the square, a file with
 * no preview gets the document glyph, and `pending` shows the spinner the
 * original uses while it renders a PDF page.
 */
export function FileThumbnail(props: {
	file: FileLike;
	size: number;
	radius?: number;
	pending?: boolean;
}) {
	const isImage = () =>
		props.file.type.startsWith('image/') && props.file.src !== undefined;
	const glyphSize = () => Math.max(16, props.size * 0.35);
	return (
		<div
			role="img"
			aria-label={props.file.name}
			style={{
				position: 'relative',
				flexShrink: 0,
				overflow: 'hidden',
				width: props.size,
				height: props.size,
				backgroundColor: color.accent,
				borderRadius: props.radius ?? shape.bg,
			}}
		>
			<Show when={!props.pending} fallback={centered(<Spinner />)}>
				<Show
					when={isImage()}
					fallback={centered(
						<Icon
							name={fileGlyph}
							size={glyphSize()}
							strokeWidth={1.5}
							color={color.mutedForeground}
						/>,
					)}
				>
					<img
						src={props.file.src}
						alt={props.file.name}
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: props.size,
							height: props.size,
							borderRadius: props.radius ?? shape.bg,
						}}
						objectFit="cover"
					/>
				</Show>
			</Show>
			{/* Painted over the preview: a pale image still needs a visible edge. */}
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: props.size,
					height: props.size,
					borderRadius: props.radius ?? shape.bg,
					outlineWidth: 1,
					outlineStyle: 'solid',
					outlineOffset: -1,
					outlineColor: withAlpha(color.overlay, 0.1),
				}}
			/>
		</div>
	);
}
