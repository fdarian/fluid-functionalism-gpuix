import { buttonProps, motion, useGpuixRequired } from "@gpuix/solid";
import { createSignal, type JSX, Show } from "solid-js";
import { Icon } from "../lib/icon";
import type { IconName } from "../lib/icons";
import {
	color,
	focusRing,
	type as scale,
	scheme,
	shape,
	motion as tween,
} from "../lib/theme";
import { type FileLike, FileThumbnail } from "./file-thumbnail";

const subtitle = { fontSize: 14, lineHeight: 20 } as const;
const ENTRANCE_RISE = 8;
/** group-hover's `transition-opacity duration-150`. */
const META_FADE = { duration: 0.15, ease: "easeOut" } as const;

export type ChatAction = "copy" | "edit" | "regenerate";

/** The 24px icon-only button the docs page puts in the meta row. */
export function ChatMessageAction(props: {
	action: ChatAction;
	label: string;
	testId?: string;
	onClick?: () => void;
}) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	const glyph = (): IconName =>
		props.action === "copy"
			? "copy"
			: props.action === "edit"
				? "pencil"
				: "rotate-ccw";
	return (
		<div
			{...buttonProps({ onClick: props.onClick }, renderer)}
			aria-label={props.label}
			testId={props.testId}
			tabIndex={0}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				width: 24,
				height: 24,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: shape.button,
				cursor: "pointer",
				keyboardFocusDim: false,
				hover: { backgroundColor: color.hover },
				focusVisible: focusRing(0),
			}}
		>
			<Icon
				name={glyph()}
				size={13}
				strokeWidth={1.5}
				color={hovered() ? color.foreground : color.mutedForeground}
			/>
		</div>
	);
}

/**
 * A single transcript entry. The user's message is a right-aligned accent
 * bubble, the assistant's is left-aligned plain text; attachments sit above
 * the bubble and a meta row (timestamp, then actions) fades in on hover.
 */
export function ChatMessage(props: {
	from: "user" | "assistant";
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
}) {
	const [hovered, setHovered] = createSignal(false);
	const isUser = () => props.from === "user";
	const showTime = () => isUser() && props.time !== undefined;
	const hasMeta = () => showTime() || props.actions !== undefined;
	return (
		<motion.div
			testId={props.testId}
			initial={{ opacity: 0, top: ENTRANCE_RISE }}
			animate={{ opacity: 1, top: 0 }}
			transition={tween.moderate}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				gap: 6,
				maxWidth: props.fullWidth === true ? "100%" : "80%",
				alignItems: isUser() ? "flex-end" : "flex-start",
				alignSelf: isUser() ? "flex-end" : "flex-start",
			}}
		>
			<Show when={props.files !== undefined && props.files.length > 0}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 6,
						justifyContent: isUser() ? "flex-end" : "flex-start",
					}}
				>
					{props.files?.map((file) => (
						<FileThumbnail file={file} size={props.thumbnailSize ?? 64} />
					))}
				</div>
			</Show>
			<Show when={props.children !== undefined && props.children !== ""}>
				<div
					style={{
						paddingTop: 8,
						paddingBottom: 8,
						...(isUser()
							? {
									paddingLeft: 14,
									paddingRight: 14,
									borderRadius: shape.bg,
									backgroundColor: color.chatBubble,
								}
							: {}),
					}}
				>
					{typeof props.children === "string" ? (
						<text style={{ ...subtitle, color: color.foreground }}>
							{props.children}
						</text>
					) : (
						props.children
					)}
				</div>
			</Show>
			<Show when={hasMeta()}>
				{/* Always laid out, so revealing it never shifts the gap between bubbles. */}
				<motion.div
					initial={false}
					animate={{ opacity: hovered() ? 1 : 0 }}
					transition={META_FADE}
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 8,
						paddingLeft: 4,
						paddingRight: 4,
						userSelect: "none",
						pointerEvents: hovered() ? "auto" : "none",
					}}
				>
					<Show when={showTime()}>
						<text style={{ ...scale.caption, color: color.mutedForeground }}>
							{props.time}
						</text>
					</Show>
					<Show when={props.actions !== undefined}>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "center",
								gap: 2,
							}}
						>
							{props.actions}
						</div>
					</Show>
				</motion.div>
			</Show>
		</motion.div>
	);
}
