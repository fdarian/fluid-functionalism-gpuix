import { buttonProps, motion } from "@gpuix/solid";
import { createSignal, type JSX, Show } from "solid-js";
import { Icon } from "../lib/icon";
import { defineIcon } from "../lib/icons";
import { color, radius, type as scale, scheme, motion as tween, focusRing } from "../lib/theme";
import { type FileLike, FileThumbnail } from "./file-thumbnail";

const copyGlyph = defineIcon(
	'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
);
const pencilGlyph = defineIcon(
	'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
);
const regenerateGlyph = defineIcon(
	'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
);

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
	const [hovered, setHovered] = createSignal(false);
	const glyph = () =>
		props.action === "copy"
			? copyGlyph
			: props.action === "edit"
				? pencilGlyph
				: regenerateGlyph;
	return (
		<div
			{...buttonProps({ onClick: props.onClick })}
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
				borderRadius: radius.item,
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
	children?: string;
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
				maxWidth: "80%",
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
						// A filled child takes the pointer from the message around it, and with it the hover that reveals the meta row.
						pointerEvents: "none",
						paddingTop: 8,
						paddingBottom: 8,
						...(isUser()
							? {
									paddingLeft: 14,
									paddingRight: 14,
									borderRadius: radius.item,
									backgroundColor: color.chatBubble,
								}
							: {}),
					}}
				>
					<text style={{ ...subtitle, color: color.foreground }}>
						{props.children}
					</text>
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
