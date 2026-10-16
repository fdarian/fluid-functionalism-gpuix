import type { HostElement, StyleDesc } from "@gpuix/solid";
import type { JSX } from "solid-js";
import { MONO } from "#/lib/doc-page";
import { color, shape, siteType } from "#/lib/theme";

/** The blue line the tweak demos draw at the measured edge, and the red wash over what runs past it. */
export const MARK_BLUE = "#6B97FF";
export const MARK_RED = "rgba(242,85,90,0.45)";

/** A `ComponentPreview hideHeader` frame: the live demo alone, centred in `px-8 py-12`, 120px tall at least. */
export function TweakFrame(props: {
	testId: string;
	onEnter?: () => void;
	onLeave?: () => void;
	ref?: (element: HostElement) => void;
	children: JSX.Element;
}) {
	return (
		<div
			testId={props.testId}
			ref={props.ref}
			style={{
				display: "flex",
				borderWidth: 1,
				borderColor: color.borderFaint,
				borderRadius: shape.container,
				overflow: "hidden",
			}}
		>
			<div
				onMouseEnter={props.onEnter}
				onMouseLeave={props.onLeave}
				style={{
					flexGrow: 1,
					minWidth: 0,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					minHeight: 120,
					paddingLeft: 32,
					paddingRight: 32,
					paddingTop: 48,
					paddingBottom: 48,
					backgroundColor: color.background,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						columnGap: 20,
						width: "100%",
						minWidth: 0,
						maxWidth: 576,
					}}
				>
					{props.children}
				</div>
			</div>
		</div>
	);
}

/** `code` in a caption: the browser's monospace, no chip. */
export function Mono(props: { children: string }) {
	return <span style={{ fontFamily: MONO }}>{props.children}</span>;
}

/** One side of a before / after: a framed specimen with its verdict under it. */
export function Specimen(props: {
	good: boolean;
	/** Replaces the verdict glyph. */
	mark?: string;
	caption: JSX.Element;
	testId?: string;
	/** Extra box styles for the frame, e.g. its height and padding. */
	frame?: StyleDesc;
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				flexGrow: 1,
				flexBasis: 0,
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				rowGap: 12,
			}}
		>
			<div
				testId={props.testId}
				style={{
					width: "100%",
					borderWidth: 1,
					borderColor: color.borderFaint,
					borderRadius: shape.container,
					...props.frame,
				}}
			>
				{props.children}
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
					columnGap: 8,
					maxWidth: "100%",
				}}
			>
				<text style={{ ...siteType.caption, flexShrink: 0 }}>
					{props.mark ?? (props.good ? "✅" : "❌")}
				</text>
				<text
					style={{
						...siteType.caption,
						color: color.mutedForeground,
						textAlign: "center",
						minWidth: 0,
					}}
				>
					{props.caption}
				</text>
			</div>
		</div>
	);
}
