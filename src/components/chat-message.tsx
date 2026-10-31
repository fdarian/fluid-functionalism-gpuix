import { buttonProps, motion, useGpuixRequired } from '@gpuix/solid';
import { createSignal, type JSX, Show } from 'solid-js';
import { Icon } from '#/lib/icon';
import type { IconName } from '#/lib/icons';
import {
	color,
	fade,
	focusRing,
	type as scale,
	shape,
	motion as tween,
} from '#/lib/theme';
import { type FileLike, FileThumbnail } from './file-thumbnail';

const subtitle = { fontSize: 14, lineHeight: '20px' } as const;
const ENTRANCE_RISE = 8;
const ENTRANCE_SCALE = 0.96;
/** The meta row's `transition-opacity duration-150`. */
const META_FADE = fade(['opacity'], 150);
/** The action buttons' `transition-colors duration-100` without `outline-color`: the source's focus ring is a box-shadow ring, which does not ease. */
const ACTION_FADE = fade(['color', 'background-color'], 100);

export type ChatAction = 'copy' | 'edit' | 'regenerate';

/** The 24px icon-only button the docs page puts in the meta row. */
export function ChatMessageAction(props: {
	action: ChatAction;
	label: string;
	testId?: string;
	onClick?: () => void;
}) {
	const renderer = useGpuixRequired();
	const glyph = (): IconName =>
		props.action === 'copy'
			? 'copy'
			: props.action === 'edit'
				? 'pencil'
				: 'rotate-ccw';
	return (
		<div
			{...buttonProps({ onClick: props.onClick }, renderer)}
			aria-label={props.label}
			testId={props.testId}
			tabIndex={0}
			style={{
				width: 24,
				height: 24,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				borderRadius: shape.button,
				cursor: 'pointer',
				keyboardFocusDim: false,
				color: color.mutedForeground,
				...ACTION_FADE,
				hover: { backgroundColor: color.hover, color: color.foreground },
				focusVisible: focusRing(0),
			}}
		>
			<Icon name={glyph()} size={13} strokeWidth={1.5} color="currentColor" />
		</div>
	);
}

/**
 * A single transcript entry. The user's message is a right-aligned accent
 * bubble, the assistant's is left-aligned plain text; attachments sit above
 * the bubble and a meta row (timestamp, then actions) fades in on hover.
 */
export function ChatMessage(props: {
	from: 'user' | 'assistant';
	files?: FileLike[];
	thumbnailSize?: number;
	/** User messages only; pre-formatted by the caller. */
	time?: string;
	actions?: JSX.Element;
	testId?: string;
	/** Text, or your own blocks (rich text, several paragraphs); text is set in the message style. */
	children?: JSX.Element;
	/** Lets the message use the whole row instead of 80% of it. */
	fullWidth?: boolean;
	/** The `layoutId` of the queued card this message was sent from: the bubble starts as that card and glides into place. Set it for the morph only, since every later reflow would replay the layout animation on a settled bubble. */
	morphId?: string;
}) {
	const [hovered, setHovered] = createSignal(false);
	const [focusWithin, setFocusWithin] = createSignal(false);
	const revealed = () => hovered() || focusWithin();
	const isUser = () => props.from === 'user';
	const showTime = () => isUser() && props.time !== undefined;
	const hasMeta = () => showTime() || props.actions !== undefined;
	return (
		<motion.div
			testId={props.testId}
			layout={props.morphId === undefined ? 'position' : true}
			layoutId={props.morphId}
			initial={
				props.morphId === undefined
					? { opacity: 0, y: ENTRANCE_RISE, scale: ENTRANCE_SCALE }
					: false
			}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={tween.moderate}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			onFocusIn={() => setFocusWithin(true)}
			onFocusOut={() => setFocusWithin(false)}
			style={{
				transformOrigin: isUser() ? 'bottom right' : 'bottom left',
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				maxWidth: props.fullWidth === true ? '100%' : '80%',
				alignItems: isUser() ? 'flex-end' : 'flex-start',
				alignSelf: isUser() ? 'flex-end' : 'flex-start',
			}}
		>
			<Show when={props.files !== undefined && props.files.length > 0}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						flexWrap: 'wrap',
						gap: 6,
						justifyContent: isUser() ? 'flex-end' : 'flex-start',
					}}
				>
					{props.files?.map((file) => (
						<FileThumbnail file={file} size={props.thumbnailSize ?? 64} />
					))}
				</div>
			</Show>
			<Show when={props.children !== undefined && props.children !== ''}>
				<div
					style={{
						whiteSpace: 'pre-wrap',
						overflowWrap: 'break-word',
						paddingTop: 8,
						paddingBottom: 8,
						...(isUser()
							? {
									paddingLeft: 14,
									paddingRight: 14,
									// Not on the assistant reply: it streams, and `pretty` would re-break earlier lines as words arrive.
									textWrap: 'pretty',
									borderRadius: shape.bg,
									backgroundColor: color.chatBubble,
								}
							: {}),
					}}
				>
					{typeof props.children !== 'string' ? (
						props.children
					) : props.morphId === undefined ? (
						<text style={{ ...subtitle, color: color.foreground }}>
							{props.children}
						</text>
					) : (
						// A `layout` box is not stretched by the bubble's scale, so the words keep their size while the bubble grows around them.
						<motion.div
							testId={
								props.testId === undefined ? undefined : `${props.testId}-text`
							}
							layout="position"
							layoutId={`${props.morphId}-text`}
							transition={tween.moderate}
						>
							<text style={{ ...subtitle, color: color.foreground }}>
								{props.children}
							</text>
						</motion.div>
					)}
				</div>
			</Show>
			<Show when={hasMeta()}>
				{/* Always laid out, so revealing it never shifts the gap between bubbles. */}
				<div
					style={{
						opacity: revealed() ? 1 : 0,
						...META_FADE,
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 8,
						paddingLeft: 4,
						paddingRight: 4,
						userSelect: 'none',
						pointerEvents: revealed() ? 'auto' : 'none',
					}}
				>
					<Show when={showTime()}>
						<text
							style={{
								...scale.caption,
								color: color.mutedForeground,
								fontVariantNumeric: 'tabular-nums',
							}}
						>
							{props.time}
						</text>
					</Show>
					<Show when={props.actions !== undefined}>
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								alignItems: 'center',
								gap: 2,
							}}
						>
							{props.actions}
						</div>
					</Show>
				</div>
			</Show>
		</motion.div>
	);
}
