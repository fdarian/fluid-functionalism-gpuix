import { buttonProps, useGpuixRequired } from "@gpuix/solid";
import { createSignal } from "solid-js";
import { copyToClipboard, InputCopy } from "../../components/input-copy";
import { MONO } from "../../lib/doc-page";
import { Icon } from "../../lib/icon";
import {
	color,
	focusRing,
	type as scale,
	shape,
	weight,
} from "../../lib/theme";
import {
	Compare,
	clickStep,
	createLoop,
	createPlayback,
	createScriptCursor,
	type Side,
	turns,
} from "./playback";

const COMMAND = "npx skills add mickadesign/fluid-functionalism";
const FIELD_WIDTH = 240;

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
						...scale.caption,
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
						...scale.caption,
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
					clickStep(cursor, "copy-skill", () => {}, 2300),
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
						// The script's click must not write the visitor's clipboard. A visitor's own click always lands while the script is paused.
						copy={(text) =>
							playback.playing() ? Promise.resolve() : copyToClipboard(text)
						}
					/>
				</div>
			}
		/>
	);
}
