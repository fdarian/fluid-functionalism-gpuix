import {
	type BoxShadow,
	buttonProps,
	type HostElement,
	type HostMouseMoveEvent,
	type KeyEvent,
	motion,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import { createPointerCapture } from "../lib/pointer-capture";
import { createPresence } from "../lib/presence";
import { FluidHighlight } from "../lib/fluid-highlight";
import { createFluidHover } from "../lib/fluid-hover";
import { Icon } from "../lib/icon";
import { fill } from "../lib/press";
import { createMeasuredHeight } from "../lib/measured-height";
import { color, colorFade, fade, pressFade, surfaceFade, sizeChoice, height, nestedRadius, radius, shape, type as scale, scheme, shadow, motion as tween, weight, withAlpha, focusRing } from "../lib/theme";
import { FileThumbnail } from "./file-thumbnail";
import type { InputSize } from "./input-group";
import { Tooltip } from "./tooltip";


/** A file the composer holds. gpuix hands over paths from a drop or the picker, never a `File`. */
export type ComposerFile = {
	/** The path: also the identity two attachments are compared by. */
	path: string;
	name: string;
	type: string;
};

/** A message held while the assistant is responding: its text and the files attached when it was queued. */
export type QueuedMessage = {
	id: string;
	text: string;
	files: ComposerFile[];
};

export type InputMessageSlotContext = {
	/** Opens the platform file picker; `accept` narrows the types for this call. */
	openFilePicker: (accept?: string) => void;
	files: ComposerFile[];
};

export type InputMessageSlot =
	| JSX.Element
	| ((context: InputMessageSlotContext) => JSX.Element);

const DEFAULT_ACCEPT = "image/png,image/jpeg,application/pdf";
const MIME_BY_EXTENSION: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	pdf: "application/pdf",
	txt: "text/plain",
	md: "text/markdown",
	json: "application/json",
};

/** The file a path names. An extension gpuix cannot map is `application/octet-stream`. */
export function fileFromPath(path: string): ComposerFile {
	const name = path.slice(path.lastIndexOf("/") + 1);
	const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	return {
		path,
		name,
		type: MIME_BY_EXTENSION[extension] ?? "application/octet-stream",
	};
}

const matchesAccept = (file: ComposerFile, accept: string) =>
	accept
		.split(",")
		.map((token) => token.trim())
		.filter((token) => token !== "")
		.some((token) => {
			if (token.endsWith("/*")) return file.type.startsWith(token.slice(0, -1));
			if (token.startsWith("."))
				return file.name.toLowerCase().endsWith(token.toLowerCase());
			return file.type === token;
		});

const steps = {
	default: {
		row: height.menuRow,
		rowPadX: 10,
		button: height.control - 8,
		rowText: scale.body,
		field: { fontSize: 14, lineHeight: 20 },
		fieldPad: 8,
		fieldPadX: 8,
		keycap: { height: 18, text: scale.micro },
		arrow: 19,
	},
	compact: {
		row: height.menuSubRow,
		rowPadX: 8,
		button: 24,
		rowText: scale.bodyCompact,
		field: { fontSize: 13, lineHeight: 18 },
		fieldPad: 6,
		fieldPadX: 6,
		keycap: { height: 16, text: scale.microCompact },
		arrow: 15,
	},
} as const;

/** The drop under a recoloured edge: `--shadow-color`, which stays 6% black in dark too. */
/** The source's `transition-opacity duration-80` on the remove badge, the queued close button and the suggestion's ↵. */
const OPACITY_FADE = fade(["opacity"], 80);

/** The composer's `transition-[box-shadow,color] duration-80` on the edge ring. */
const COMPOSER_FADE = fade(["box-shadow", "color"], 80);

const EDGE_DROP = "0 1px 1px -0.5px rgba(0,0,0,0.06)";

/** The focused composer's ring: foreground at 20%. */
const focusEdge = () => withAlpha(color.foreground, 0.2);

/** The collapse's exit tween (`tween.moderateExit`, 120 ms) plus a frame. */
const COLLAPSE_EXIT_MS = 130;

/**
 * A region that opens and closes by height. gpuix animates `height` to a
 * number only, so the content reports its own height and the region tweens to it.
 */
function Collapse(props: {
	open: boolean;
	children: JSX.Element;
}) {
	const presence = createPresence(COLLAPSE_EXIT_MS, props.open);
	presence.follow(() => props.open);
	const mounted = presence.mounted;
	const measured = createMeasuredHeight();

	return (
		<Show when={mounted()}>
			<motion.div
				initial={{ height: 0, opacity: 0 }}
				animate={{
					height: props.open ? (measured.height() ?? 0) : 0,
					opacity: props.open ? 1 : 0,
				}}
				transition={props.open ? tween.moderate : tween.moderateExit}
				style={{ overflow: "hidden", flexShrink: 0 }}
			>
				<div
					onLayout={measured.onLayout}
					style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}
				>
					{props.children}
				</div>
			</motion.div>
		</Show>
	);
}

function SendButton(props: {
	mode: "send" | "queue" | "stop";
	label: string;
	disabled: boolean;
	onClick: () => void;
	arrowSize: number;
	size: number;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	return (
		<div
			{...buttonProps({ disabled: props.disabled, onClick: props.onClick }, renderer)}
			aria-label={props.label}
			testId={props.testId}
			tabIndex={props.disabled ? -1 : 0}
			style={{
				position: "relative",
				margin: 1,
				width: props.size - 2,
				height: props.size - 2,
				flexShrink: 0,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: shape.button,
				cursor: "pointer",
				keyboardFocusDim: false,
				opacity: props.disabled ? 0.5 : 1,
				pointerEvents: props.disabled ? "none" : undefined,
				...surfaceFade,
				boxShadow: fill(color.foreground, 1),
				hover: { boxShadow: fill(color.primaryHover, 1) },
				active: { boxShadow: fill(color.primaryActive, 0), ...pressFade },
				focusVisible: focusRing(1),
			}}
		>
			<For each={[props.mode === "stop" ? "stop" : "arrow"]}>
				{(glyph: string) => (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={tween.fast}
						style={{ display: "flex", alignItems: "center" }}
					>
						<Show
							when={glyph === "stop"}
							fallback={
								<Icon
									name="arrow-up"
									size={props.arrowSize}
									strokeWidth={2}
									color={color.background}
								/>
							}
						>
							<div
								style={{
									width: 12,
									height: 12,
									borderRadius: 3,
									backgroundColor: color.background,
								}}
							/>
						</Show>
					</motion.div>
				)}
			</For>
		</div>
	);
}

/** The 20px close badge: always the light-mode palette, so it reads over any image. */
function RemoveBadge(props: {
	label: string;
	visible: boolean;
	onClick: () => void;
	onHoverChange: (hovered: boolean) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const [focusVisible, setFocusVisible] = createSignal(false);
	return (
		<Tooltip content="Remove" side="top">
			<div
				{...buttonProps({ onClick: props.onClick }, renderer)}
				aria-label={props.label}
				testId={props.testId}
				tabIndex={0}
				onMouseEnter={() => props.onHoverChange(true)}
				onMouseLeave={() => props.onHoverChange(false)}
				onFocus={(event) => setFocusVisible(event.focusVisible === true)}
				onBlur={() => setFocusVisible(false)}
				style={{
					width: 20,
					height: 20,
					borderRadius: 10,
					backgroundColor: "#171717",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					opacity: props.visible || focusVisible() ? 1 : 0,
					...OPACITY_FADE,
					keyboardFocusDim: false,
					focusVisible: focusRing(0),
				}}
			>
				<Icon name="x" size={12} strokeWidth={2.5} color="#ffffff" />
			</div>
		</Tooltip>
	);
}

function FilePreviewTile(props: {
	file: ComposerFile;
	size: number;
	onRemove: () => void;
	testId?: string;
}) {
	const [tileHovered, setTileHovered] = createSignal(false);
	const [badgeHovered, setBadgeHovered] = createSignal(false);
	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={tween.fast}
			testId={props.testId}
			onMouseEnter={() => setTileHovered(true)}
			onMouseLeave={() => setTileHovered(false)}
			style={{
				position: "relative",
				flexShrink: 0,
				width: props.size,
				height: props.size,
				cursor: "default",
			}}
		>
			<FileThumbnail
				file={{
					name: props.file.name,
					type: props.file.type,
					src: props.file.path,
				}}
				size={props.size}
				// The tile sits 8px inside the composer's edge.
				radius={nestedRadius(shape.container, 8)}
			/>
			<div style={{ position: "absolute", top: 4, right: 4 }}>
				<RemoveBadge
					label={`Remove ${props.file.name}`}
					visible={tileHovered() || badgeHovered()}
					onClick={props.onRemove}
					onHoverChange={setBadgeHovered}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-remove`
					}
				/>
			</div>
		</motion.div>
	);
}

function QueuedRow(props: {
	item: QueuedMessage;
	index: number;
	total: number;
	size: InputSize;
	onEdit: (item: QueuedMessage) => void;
	onRemove: (item: QueuedMessage) => void;
	onMove: (item: QueuedMessage, direction: -1 | 1) => void;
	onDragMove: (item: QueuedMessage, event: HostMouseMoveEvent) => void;
	testId?: string;
}) {
	const renderer = useGpuixRequired();
	const step = () => steps[props.size];
	const [hovered, setHovered] = createSignal(false);
	const [closeHovered, setCloseHovered] = createSignal(false);
	const [closeFocusVisible, setCloseFocusVisible] = createSignal(false);
	const [grabbing, setGrabbing] = createSignal(false);
	const grabRegion = createPointerCapture("QueuedRow");
	const files = () => props.item.files.length;
	const label = () =>
		props.item.text !== ""
			? props.item.text
			: `${files()} attachment${files() === 1 ? "" : "s"}`;

	const onKeyDown = (event: KeyEvent) => {
		if (event.key === "Enter" || event.key === "F2") {
			event.preventDefault();
			props.onEdit(props.item);
		} else if (event.key === "Delete" || event.key === "Backspace") {
			event.preventDefault();
			props.onRemove(props.item);
		} else if (
			event.altKey === true &&
			(event.key === "ArrowUp" || event.key === "ArrowDown")
		) {
			event.preventDefault();
			props.onMove(props.item, event.key === "ArrowUp" ? -1 : 1);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={tween.fast}
			role="listitem"
			aria-label={`Queued message ${props.index + 1} of ${props.total}: ${label()}`}
			testId={props.testId}
			tabIndex={0}
			onKeyDown={onKeyDown}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			style={{
				position: "relative",
				height: step().row,
				flexShrink: 0,
				marginTop: props.index > 0 ? 4 : 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: step().rowPadX,
				paddingRight: step().rowPadX,
				borderRadius: radius.item,
				keyboardFocusDim: false,
				focusVisible: focusRing(0),
			}}
		>
			{/* The recessed fill is its own layer; the siblings after it are `position: relative` so the fill paints under them. */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: radius.item,
					backgroundColor: color.muted,
				}}
			/>
			<Show when={files() > 0}>
				<div
					style={{
						position: "relative",
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 2,
						flexShrink: 0,
					}}
				>
					<Icon
						name="image"
						size={13}
						strokeWidth={1.5}
						color={color.mutedForeground}
					/>
					<Show when={props.item.text !== ""}>
						<text style={{ ...step().rowText, color: color.mutedForeground }}>
							{String(files())}
						</text>
					</Show>
				</div>
			</Show>
			{/* Drag and double-click live here, not on the row, so a press on the close button does not start a drag. */}
			<div
				ref={grabRegion.ref}
				onMouseDown={(event) => {
					if (event.button !== 0) return;
					if (event.clickCount === 2) {
						props.onEdit(props.item);
						return;
					}
					grabRegion.capture(event);
					setGrabbing(true);
				}}
				onMouseMove={(event) => {
					if (grabbing()) props.onDragMove(props.item, event);
				}}
				onMouseUp={() => setGrabbing(false)}
				onLostPointerCapture={() => setGrabbing(false)}
				style={{
					position: "relative",
					flexGrow: 1,
					minWidth: 0,
					height: step().row,
					display: "flex",
					alignItems: "center",
					cursor: grabbing() ? "grabbing" : "grab",
					userSelect: "none",
				}}
			>
				<text
					style={{
						...step().rowText,
						fontWeight: weight.normal,
						color: color.foreground,
						whiteSpace: "nowrap",
						textOverflow: "ellipsis",
						overflow: "hidden",
					}}
				>
					{label()}
				</text>
			</div>
			<Tooltip content="Remove" side="top">
				<div
					{...buttonProps({ onClick: () => props.onRemove(props.item) }, renderer)}
					aria-label={`Remove queued message: ${label()}`}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-remove`
					}
					tabIndex={0}
					onMouseEnter={() => setCloseHovered(true)}
					onMouseLeave={() => setCloseHovered(false)}
					onFocus={(event) => setCloseFocusVisible(event.focusVisible === true)}
					onBlur={() => setCloseFocusVisible(false)}
					style={{
						position: "relative",
						width: 20,
						height: 20,
						flexShrink: 0,
						borderRadius: 10,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						opacity: hovered() || closeHovered() || closeFocusVisible() ? 1 : 0,
						...OPACITY_FADE,
						keyboardFocusDim: false,
						hover: { backgroundColor: color.hover },
						focusVisible: focusRing(0),
					}}
				>
					<Icon
						name="x"
						size={13}
						strokeWidth={2.5}
						color={closeHovered() ? color.foreground : color.mutedForeground}
					/>
				</div>
			</Tooltip>
		</motion.div>
	);
}

function SuggestionRow(props: {
	text: string;
	index: number;
	active: boolean;
	/** The ↓ hint in the icon slot: the first row shows it while nothing is highlighted. */
	keyHint: boolean;
	size: InputSize;
	onRegister: (index: number, element: HostElement) => void;
	onSelect: () => void;
	testId?: string;
}) {
	const step = () => steps[props.size];
	let row: HostElement | undefined;
	createEffect(() => {
		if (row === undefined) throw new Error("Suggestion row is not mounted");
		props.onRegister(props.index, row);
	});
	return (
		<div
			ref={(element) => {
				row = element;
			}}
			role="option"
			aria-selected={props.active}
			testId={props.testId}
			onClick={props.onSelect}
			style={{
				position: "relative",
				height: step().row,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 8,
				paddingLeft: step().rowPadX,
				paddingRight: step().rowPadX,
				cursor: "pointer",
				color: props.active ? color.foreground : color.mutedForeground,
				...colorFade,
			}}
		>
			<text
				style={{
					...step().field,
					flexGrow: 1,
					minWidth: 0,
					fontWeight: weight.normal,
					color: "currentColor",
					whiteSpace: "nowrap",
					textOverflow: "ellipsis",
					overflow: "hidden",
				}}
			>
				{props.text}
			</text>
			<div style={{ width: 13, height: 13, flexShrink: 0 }}>
				<Show
					when={!props.active && props.keyHint}
					fallback={
						<div
							style={{ opacity: props.active ? 1 : 0, ...OPACITY_FADE }}
						>
							<Icon
								name="corner-down-left"
								size={13}
								strokeWidth={1.5}
								color="currentColor"
							/>
						</div>
					}
				>
					<Icon
						name="arrow-down"
						size={13}
						strokeWidth={1.5}
						color={color.mutedForeground}
					/>
				</Show>
			</div>
		</div>
	);
}

export type InputMessageProps = {
	/** Pins the composer to one step of the size ladder. */
	size?: InputSize;
	value: string;
	onValueChange: (value: string) => void;
	/** Enter or the send button, and a queued message dispatching: the trimmed text and the attachments. */
	onSend?: (
		value: string,
		files: ComposerFile[],
		meta?: { queuedId?: string },
	) => void;
	placeholder?: string;
	/** The bottom-left action area. */
	leftSlot?: InputMessageSlot;
	/** The bottom-right action area, before the send button. */
	rightSlot?: InputMessageSlot;
	disabled?: boolean;
	minRows?: number;
	maxRows?: number;
	/** When false, a press on the composer's empty areas does not focus the textarea. */
	clickToFocus?: boolean;
	sendLabel?: string;
	/** Controlled attachments. Without `onFilesChange` attachments are off. */
	files?: ComposerFile[];
	onFilesChange?: (files: ComposerFile[]) => void;
	/** MIME types, or `.ext`, comma-separated. */
	accept?: string;
	maxFiles?: number;
	filePreviewSize?: number;
	/** `"streaming"` turns the send button into Stop (empty draft) or Queue (a draft). */
	status?: "idle" | "streaming";
	onStop?: () => void;
	queue?: QueuedMessage[];
	onQueueChange?: (queue: QueuedMessage[]) => void;
	/** Draw the built-in queue rows; set false to render the queue yourself. */
	showQueue?: boolean;
	/** Sent messages, oldest first: ArrowUp recalls the previous one. */
	history?: string[];
	/** Shown as the placeholder with a Tab keycap while the draft is empty; Tab fills it in. */
	placeholderSuggestion?: string;
	/** Prompts listed under the action bar while the draft is empty. */
	suggestions?: string[];
	testId?: string;
};

export function InputMessage(props: InputMessageProps) {
	const renderer = useGpuixRequired();
	const size = () => props.size ?? sizeChoice();
	const step = () => steps[size()];
	const files = () => props.files ?? [];
	const queue = () => props.queue ?? [];
	const history = () => props.history ?? [];
	const suggestions = () => props.suggestions ?? [];
	const accept = () => props.accept ?? DEFAULT_ACCEPT;
	const supportsFiles = () => props.onFilesChange !== undefined;
	const supportsQueue = () =>
		props.status !== undefined && props.onQueueChange !== undefined;
	const streaming = () => props.status === "streaming";
	const testId = () => props.testId ?? "input-message";

	let textarea: HostElement | undefined;
	let queueList: HostElement | undefined;
	const [focused, setFocused] = createSignal(false);
	const [hovered, setHovered] = createSignal(false);
	const [historyIndex, setHistoryIndex] = createSignal<number | null>(null);
	let draftBeforeHistory = "";

	const trimmed = () => props.value.trim();
	const canSend = () =>
		props.disabled !== true && (trimmed().length > 0 || files().length > 0);
	const suggestionsOpen = () => suggestions().length > 0 && props.value === "";
	const showGhost = () =>
		props.placeholderSuggestion !== undefined && props.value === "";

	const hover = createFluidHover();
	const activeSuggestion = hover.activeIndex;
	createEffect(() => {
		if (!suggestionsOpen()) hover.setActiveIndex(null);
	});

	const focusTextarea = () => {
		if (textarea === undefined) throw new Error("InputMessage is not mounted");
		renderer.focusElement?.(textarea.id);
	};

	const acceptSuggestion = (text: string) => {
		hover.setActiveIndex(null);
		setHistoryIndex(null);
		props.onValueChange(text);
		focusTextarea();
	};

	const addFiles = (incoming: ComposerFile[]) => {
		const onFilesChange = props.onFilesChange;
		if (onFilesChange === undefined) return;
		const known = new Set(files().map((file) => file.path));
		const accepted: ComposerFile[] = [];
		for (const file of incoming) {
			if (!matchesAccept(file, accept()) || known.has(file.path)) continue;
			known.add(file.path);
			accepted.push(file);
		}
		if (accepted.length === 0) return;
		const next = [...files(), ...accepted];
		onFilesChange(
			props.maxFiles === undefined ? next : next.slice(0, props.maxFiles),
		);
	};
	const removeFile = (path: string) =>
		props.onFilesChange?.(files().filter((file) => file.path !== path));

	const openFilePicker = (narrow?: string) => {
		const picker = renderer.promptForPaths;
		if (picker === undefined)
			throw new Error("No file picker on this renderer");
		void picker
			.call(renderer, {
				files: true,
				multiple: props.maxFiles === undefined || props.maxFiles > 1,
			})
			.then((paths) => {
				if (paths === null) return;
				const picked = paths.map(fileFromPath);
				addFiles(
					narrow === undefined
						? picked
						: picked.filter((file) => matchesAccept(file, narrow)),
				);
			});
	};

	const handleSend = () => {
		if (!canSend()) return;
		setHistoryIndex(null);
		if (streaming() && supportsQueue()) {
			props.onQueueChange?.([
				...queue(),
				{ id: crypto.randomUUID(), text: trimmed(), files: files() },
			]);
			props.onValueChange("");
			if (supportsFiles()) props.onFilesChange?.([]);
			focusTextarea();
			return;
		}
		props.onSend?.(trimmed(), files());
	};

	// The streaming-to-idle edge releases the head of the queue.
	let previousStatus = props.status;
	createEffect(
		on(
			() => props.status,
			(status) => {
				const previous = previousStatus;
				previousStatus = status;
				if (!supportsQueue()) return;
				const pending = untrack(queue);
				if (
					previous === "streaming" &&
					status === "idle" &&
					pending.length > 0
				) {
					const next = pending[0];
					props.onQueueChange?.(pending.slice(1));
					props.onSend?.(next.text, next.files, { queuedId: next.id });
				}
			},
			{ defer: true },
		),
	);

	const editQueued = (item: QueuedMessage) => {
		setHistoryIndex(null);
		props.onValueChange(item.text);
		if (supportsFiles()) {
			props.onFilesChange?.(
				props.maxFiles === undefined
					? item.files
					: item.files.slice(0, props.maxFiles),
			);
		}
		props.onQueueChange?.(queue().filter((queued) => queued.id !== item.id));
		focusTextarea();
	};
	const removeQueued = (item: QueuedMessage) =>
		props.onQueueChange?.(queue().filter((queued) => queued.id !== item.id));
	const moveQueuedTo = (item: QueuedMessage, target: number) => {
		const current = queue();
		const from = current.findIndex((queued) => queued.id === item.id);
		if (from < 0 || target < 0 || target >= current.length || from === target) {
			return;
		}
		const next = [...current];
		next.splice(from, 1);
		next.splice(target, 0, item);
		props.onQueueChange?.(next);
	};
	const moveQueued = (item: QueuedMessage, direction: -1 | 1) => {
		const from = queue().findIndex((queued) => queued.id === item.id);
		moveQueuedTo(item, from + direction);
	};
	const dragQueued = (item: QueuedMessage, event: HostMouseMoveEvent) => {
		if (queueList === undefined || event.y === undefined) return;
		const bounds = queueList.getBoundingClientRect();
		const stride = step().row + 4;
		const target = Math.floor((event.y - bounds.y) / stride);
		moveQueuedTo(item, Math.max(0, Math.min(queue().length - 1, target)));
	};

	const mode = (): "send" | "queue" | "stop" => {
		if (!streaming()) return "send";
		if (canSend() && supportsQueue()) return "queue";
		return props.onStop === undefined ? "send" : "stop";
	};
	const buttonLabel = () => {
		switch (mode()) {
			case "stop":
				return "Stop";
			case "queue":
				return "Queue message";
			case "send":
				return props.sendLabel ?? "Send";
		}
	};

	const onKeyDown = (event: KeyEvent) => {
		// Enter sends, Shift+Enter is left to the textarea for a newline.
		if (event.key === "Enter" && event.shiftKey !== true) {
			event.preventDefault();
			onSubmit();
			return;
		}
		// gpuix's textarea binds the arrow keys as editor actions and never reports them
		// here, so Ctrl-P / Ctrl-N walk the lists too (see drift/input-message.md).
		const plain =
			event.shiftKey !== true &&
			event.altKey !== true &&
			event.metaKey !== true;
		const control = event.ctrlKey === true;
		const direction =
			plain && !control && event.key === "ArrowDown"
				? 1
				: plain && !control && event.key === "ArrowUp"
					? -1
					: plain && control && event.key === "n"
						? 1
						: plain && control && event.key === "p"
							? -1
							: 0;
		const modified = !(plain && (!control || direction !== 0));

		// Suggested prompts: down enters and walks the list, up walks back out, Escape drops the highlight.
		if (suggestionsOpen() && !modified) {
			if (direction === 1) {
				const current = activeSuggestion();
				hover.setActiveIndex(
					current === null
						? 0
						: Math.min(current + 1, suggestions().length - 1),
				);
				return;
			}
			if (activeSuggestion() !== null) {
				if (direction === -1) {
					hover.setActiveIndex(
						activeSuggestion() === 0
							? null
							: (activeSuggestion() as number) - 1,
					);
					return;
				}
				if (event.key === "Escape") {
					hover.setActiveIndex(null);
					return;
				}
			}
		}

		// Tab fills the suggested placeholder into an empty composer.
		const suggested = props.placeholderSuggestion;
		if (
			event.key === "Tab" &&
			event.shiftKey !== true &&
			suggested !== undefined &&
			props.value === ""
		) {
			event.preventDefault();
			acceptSuggestion(suggested);
			return;
		}

		// Readline-style history. gpuix does not report the caret, so only a one-line draft recalls.
		if (
			history().length > 0 &&
			direction !== 0 &&
			!modified &&
			!props.value.includes("\n")
		) {
			if (direction === -1) {
				const start = historyIndex() ?? history().length;
				if (start > 0) {
					if (historyIndex() === null) draftBeforeHistory = props.value;
					const next = start - 1;
					setHistoryIndex(next);
					props.onValueChange(history()[next]);
				}
				return;
			}
			const current = historyIndex();
			if (current !== null) {
				const next = current + 1;
				if (next >= history().length) {
					setHistoryIndex(null);
					props.onValueChange(draftBeforeHistory);
				} else {
					setHistoryIndex(next);
					props.onValueChange(history()[next]);
				}
			}
		}
	};

	const onSubmit = () => {
		const active = activeSuggestion();
		if (suggestionsOpen() && active !== null) {
			acceptSuggestion(suggestions()[active]);
			return;
		}
		handleSend();
	};

	const slotContext = (): InputMessageSlotContext => ({
		openFilePicker,
		files: files(),
	});
	const renderSlot = (slot: InputMessageSlot | undefined) =>
		typeof slot === "function" ? slot(slotContext()) : slot;

	const edgeShadow = () => {
		let edge: string;
		if (focused()) edge = focusEdge();
		else if (hovered() && props.clickToFocus !== false && props.disabled !== true) {
			edge = color.border;
		} else return shadow(2);
		return `0 0 0 1px ${edge}, ${EDGE_DROP}`;
	};

	const rectFor = (index: number | null) => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<div
			testId={testId()}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
			// A drop is delivered only to a target whose dragover was cancelled.
			onDragOver={(event) => {
				if (supportsFiles() && props.disabled !== true) event.preventDefault();
			}}
			onDrop={(event) => {
				if (!supportsFiles() || props.disabled === true) return;
				if (event.dataTransfer === undefined) throw new Error("Drop without dataTransfer");
				addFiles(event.dataTransfer.files.map((file) => fileFromPath(file.path)));
			}}
			style={{
				position: "relative",
				display: "flex",
				flexDirection: "column",
				padding: 8,
				width: "100%",
				borderRadius: shape.container,
				backgroundColor: color.surface2,
				cursor:
					props.clickToFocus !== false && props.disabled !== true
						? "text"
						: undefined,
				opacity: props.disabled === true ? 0.5 : 1,
				pointerEvents: props.disabled === true ? "none" : undefined,
				boxShadow: edgeShadow(),
				...COMPOSER_FADE,
			}}
		>
			<Collapse open={files().length > 0}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "wrap",
						gap: 8,
						paddingBottom: 8,
					}}
				>
					<For each={files()}>
						{(file: ComposerFile, index: Accessor<number>) => (
							<FilePreviewTile
								file={file}
								size={props.filePreviewSize ?? 80}
								onRemove={() => removeFile(file.path)}
								testId={`${testId()}-file-${index()}`}
							/>
						)}
					</For>
				</div>
			</Collapse>

			<Show when={supportsQueue() && props.showQueue !== false}>
				<Collapse open={queue().length > 0}>
					<div
						ref={(element) => {
							queueList = element;
						}}
						role="list"
						style={{
							display: "flex",
							flexDirection: "column",
							paddingBottom: 8,
						}}
					>
						<For each={queue()}>
							{(item: QueuedMessage, index: Accessor<number>) => (
								<QueuedRow
									item={item}
									index={index()}
									total={queue().length}
									size={size()}
									onEdit={editQueued}
									onRemove={removeQueued}
									onMove={moveQueued}
									onDragMove={dragQueued}
									testId={`${testId()}-queued-${index()}`}
								/>
							)}
						</For>
					</div>
				</Collapse>
			</Show>

			<div
				onClick={() => {
					if (props.clickToFocus !== false) focusTextarea();
				}}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<textarea
					ref={(element) => {
						textarea = element;
					}}
					testId={`${testId()}-textarea`}
					aria-label="Message"
					value={props.value}
					placeholder={
						showGhost() ? undefined : (props.placeholder ?? "Ask me anything…")
					}
					minRows={props.minRows ?? 1}
					maxRows={props.maxRows ?? 8}
					disabled={props.disabled === true}
					theme={{
						text: color.foreground,
						textMuted: color.mutedForeground,
						textFaint: color.mutedForeground,
						textDim: color.mutedForeground,
						caret: color.foreground,
					}}
					onChange={(event) => {
						if (event.value === undefined) {
							throw new Error("InputMessage change without a value");
						}
						setHistoryIndex(null);
						hover.setActiveIndex(null);
						props.onValueChange(event.value);
					}}
					onKeyDown={onKeyDown}
					onFocus={() => setFocused(true)}
					onBlur={() => {
						setFocused(false);
						hover.setActiveIndex(null);
					}}
					style={{
						...step().field,
						width: "100%",
						paddingTop: step().fieldPad,
						paddingBottom: step().fieldPad,
						paddingLeft: step().fieldPadX,
						paddingRight: step().fieldPadX,
						fontWeight: weight.normal,
						color: color.foreground,
						backgroundColor: color.transparent,
						keyboardFocusDim: false,
					}}
				/>
				<Show when={showGhost()}>
					<div
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							paddingTop: step().fieldPad,
							paddingBottom: step().fieldPad,
							paddingLeft: step().fieldPadX,
							paddingRight: step().fieldPadX,
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: 6,
							pointerEvents: "none",
						}}
					>
						<text
							style={{
								...step().field,
								minWidth: 0,
								fontWeight: weight.normal,
								color: color.mutedForeground,
								whiteSpace: "nowrap",
								textOverflow: "ellipsis",
								overflow: "hidden",
							}}
						>
							{props.placeholderSuggestion}
						</text>
						<div
							style={{
								height: step().keycap.height,
								flexShrink: 0,
								paddingLeft: 4,
								paddingRight: 4,
								display: "flex",
								alignItems: "center",
								borderRadius: 5,
								borderWidth: 1,
								borderColor: color.border,
								backgroundColor: color.background,
							}}
						>
							<text
								style={{
									...step().keycap.text,
									color: color.mutedForeground,
								}}
							>
								Tab
							</text>
						</div>
					</div>
				</Show>
			</div>

			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					gap: size() === "compact" ? 6 : 8,
					marginTop: 4,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 6,
						minWidth: 0,
					}}
				>
					{renderSlot(props.leftSlot)}
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 6,
						flexShrink: 0,
					}}
				>
					{renderSlot(props.rightSlot)}
					<SendButton
						testId={`${testId()}-send`}
						mode={mode()}
						label={buttonLabel()}
						disabled={mode() === "stop" ? props.disabled === true : !canSend()}
						onClick={mode() === "stop" ? () => props.onStop?.() : handleSend}
						size={step().button}
						arrowSize={step().arrow}
					/>
				</div>
			</div>

			<Show when={suggestions().length > 0}>
				<Collapse open={suggestionsOpen()}>
					<div
						role="listbox"
						aria-label="Suggested prompts"
						style={{
							// The list runs the composer's full width: -8px cancels its padding.
							marginLeft: -8,
							marginRight: -8,
							marginTop: 8,
						}}
					>
						<div
							{...hover.containerProps}
							style={{
								position: "relative",
								display: "flex",
								flexDirection: "column",
								borderTopWidth: 1,
								borderColor: color.borderFaint,
								paddingLeft: 6,
								paddingRight: 6,
								paddingTop: 6,
							}}
						>
							<FluidHighlight
								rect={() => rectFor(hover.activeIndex())}
								session={hover.session}
								radius={shape.bg}
								background={color.hover}
							/>
							<For each={suggestions()}>
								{(text: string, index: Accessor<number>) => (
									<SuggestionRow
										text={text}
										index={index()}
										active={activeSuggestion() === index()}
										keyHint={index() === 0 && activeSuggestion() === null}
										size={size()}
										onRegister={hover.registerItem}
										onSelect={() => acceptSuggestion(text)}
										testId={`${testId()}-suggestion-${index()}`}
									/>
								)}
							</For>
						</div>
					</div>
				</Collapse>
			</Show>
		</div>
	);
}
