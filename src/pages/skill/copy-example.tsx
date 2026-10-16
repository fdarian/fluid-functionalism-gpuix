import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import { createSignal } from "solid-js";
import { InputCopy } from "../../components/input-copy";
import { MONO } from "../../lib/doc-page";
import { Icon } from "../../lib/icon";
import { color, focusRing, shape, siteType, weight } from "../../lib/theme";
import {
	Compare,
	clickStep,
	createLoop,
	createPlayback,
	createScriptCursor,
	glideStep,
	type Side,
	turns,
} from "./playback";

const COMMAND = "npx skills add mickadesign/fluid-functionalism";
const FIELD_WIDTH = 240;

/**
 * Runs the scripted click so InputCopy plays its own feedback without writing the visitor's clipboard. A stand-in
 * `writeText` swallows the one write of `value` that click makes and passes any other write through; it steps aside
 * after that write, or after 1s.
 */
function clickWithoutClipboard(click: () => void, value: string) {
	const clipboard = navigator.clipboard;
	const writeText = clipboard.writeText;
	let restored = false;
	const restore = () => {
		if (restored) return;
		restored = true;
		clipboard.writeText = writeText;
	};
	clipboard.writeText = (text: string) => {
		if (text !== value) return writeText.call(clipboard, text);
		restore();
		return Promise.resolve();
	};
	setTimeout(restore, 1000);
	click();
}

/** Generic: the icon snaps to a check and "Copy" turns into "Copied!", which is wider, so the action grows and eats into the command text. */
function GenericCopy(props: { copied: boolean; onCopy: () => void }) {
	const renderer = useGpuixRequired();
	const [hovered, setHovered] = createSignal(false);
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 4,
				width: "100%",
				maxWidth: FIELD_WIDTH,
				height: 36,
				paddingLeft: 12,
				paddingRight: 4,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
				borderRadius: shape.bg,
			}}
		>
			<div style={{ flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
				<text
					style={{
						...siteType.caption,
						fontFamily: MONO,
						color: color.mutedForeground,
						whiteSpace: "nowrap",
						textOverflow: "ellipsis",
						overflow: "hidden",
					}}
				>
					{COMMAND}
				</text>
			</div>
			<div
				{...buttonProps({ onClick: props.onCopy }, renderer)}
				testId="copy-generic-action"
				onMouseEnter={() => setHovered(true)}
				onMouseLeave={() => setHovered(false)}
				style={{
					height: 28,
					flexShrink: 0,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
					paddingLeft: 6,
					paddingRight: 6,
					borderRadius: shape.bg,
					cursor: "pointer",
					keyboardFocusDim: false,
					focusVisible: focusRing(0),
				}}
			>
				<Icon
					name={props.copied ? "check" : "copy"}
					size={14}
					strokeWidth={1.5}
					color={hovered() ? color.foreground : color.mutedForeground}
				/>
				<text
					style={{
						...siteType.caption,
						fontWeight: weight.normal,
						color: hovered() ? color.foreground : color.mutedForeground,
						whiteSpace: "nowrap",
					}}
				>
					{props.copied ? "Copied!" : "Copy"}
				</text>
			</div>
		</div>
	);
}

export function CopyExample() {
	const playback = createPlayback();
	const cursor = createScriptCursor(playback);
	const [generic, setGeneric] = createSignal(false);
	const [active, setActive] = createSignal<Side | null>(null);
	createLoop(
		playback.playing,
		turns(setActive, (side) =>
			side === "generic"
				? [
						// Aim for the small action button, the only part that copies.
						...clickStep(
							cursor,
							"copy-generic-action",
							() => setGeneric(true),
							1400,
						),
						{ ms: 600, run: () => setGeneric(false) },
					]
				: // Click the command itself: the whole field copies.
					[
						glideStep(cursor, "copy-skill"),
						{
							ms: 2300,
							run: () => clickWithoutClipboard(() => cursor.click(), COMMAND),
						},
					],
		),
		// InputCopy reverts on its own timer; the generic "Copied!" waits on the script.
		() => setGeneric(false),
	);

	return (
		<Compare
			playback={playback}
			cursor={cursor}
			active={playback.playing() ? active() : null}
			generic={
				<GenericCopy copied={generic()} onCopy={() => setGeneric(!generic())} />
			}
			skill={
				<div style={{ width: "100%", maxWidth: FIELD_WIDTH }}>
					<InputCopy
						value={COMMAND}
						align="left"
						testId="copy-skill"
					/>
				</div>
			}
		/>
	);
}
