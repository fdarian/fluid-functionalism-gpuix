import { defineKeyframes } from '@gpuix/solid';
import { type JSX, Show } from 'solid-js';
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

/** Tailwind's `animate-spin` keyframes. */
defineKeyframes('spin', { to: { transform: 'rotate(360deg)' } });

/** `w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin`. */
export function Spinner() {
	return (
		<div
			style={{
				width: 24,
				height: 24,
				flexShrink: 0,
				borderRadius: 12,
				borderStyle: 'solid',
				borderWidth: 2,
				borderColor: color.border,
				borderTopColor: color.mutedForeground,
				animation: 'spin 1s linear infinite',
			}}
		/>
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
