import { createSignal, type JSX, Show } from 'solid-js';
import { onFrame } from '#/lib/clock';
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
/** `animate-spin` is one turn a second; gpuix cannot rotate, so a frame clock rewrites the arc. */
const SPINNER_DEGREES_PER_MS = 0.36;

/** The arc of `border-t-muted-foreground`, a quarter of the ring, at `degrees` clockwise from the top. */
function spinnerArc(degrees: number) {
	const point = (angle: number) => {
		const radians = (angle * Math.PI) / 180;
		return `${(12 + 11 * Math.sin(radians)).toFixed(3)} ${(12 - 11 * Math.cos(radians)).toFixed(3)}`;
	};
	return defineIcon(
		`<path d="M ${point(degrees - 45)} A 11 11 0 0 1 ${point(degrees + 45)}" stroke-linecap="butt"/>`,
	);
}

/**
 * The thin ring with one accented quadrant. The arc is an SVG whose source is
 * rewritten on a timer, because gpuix cannot rotate an element or keyframe
 * anything.
 */
export function Spinner() {
	const [degrees, setDegrees] = createSignal(0);
	let angle = 0;
	onFrame((dt) => {
		angle = (angle + dt * SPINNER_DEGREES_PER_MS) % 360;
		// Whole degrees, so the SVG cache sees at most 360 distinct sources.
		setDegrees(Math.round(angle) % 360);
	});
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
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
				}}
			>
				<Icon
					name={spinnerArc(degrees())}
					size={SPINNER_SIZE}
					strokeWidth={2}
					color={color.mutedForeground}
				/>
			</div>
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
					outlineOffset: -1,
					outlineColor: withAlpha(color.overlay, 0.1),
				}}
			/>
		</div>
	);
}
