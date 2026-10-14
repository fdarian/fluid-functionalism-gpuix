import type { JSX } from "solid-js";
import { color, fontFamily, type as scale, weight } from "./theme";

const BAR_HEIGHT = 40;
const MARGIN = 8;
const PANEL_RADIUS = 10;
const PANEL_BORDER = 1;

/**
 * gpuix clips overflow to a rectangle, not the rounded box, so a child whose
 * fill touches a panel corner must round that corner itself.
 */
export const PANEL_INNER_RADIUS = PANEL_RADIUS - PANEL_BORDER;

/**
 * A browser-style frame: a chrome-coloured window, a title bar under the
 * traffic lights, and the page in a rounded panel.
 */
export function AppFrame(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				height: "100%",
				backgroundColor: color.chrome,
				fontFamily,
			}}
		>
			<div
				style={{
					position: "relative",
					height: BAR_HEIGHT,
					flexShrink: 0,
				}}
			>
				{/* Full width, so the traffic-light inset does not shift the title. */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						pointerEvents: "none",
					}}
				>
					<text
						style={{
							...scale.body,
							fontWeight: weight.medium,
							color: color.mutedForeground,
						}}
					>
						{props.title}
					</text>
				</div>
			</div>
			<div
				style={{
					flexGrow: 1,
					minHeight: 0,
					marginLeft: MARGIN,
					marginRight: MARGIN,
					marginBottom: MARGIN,
					borderRadius: PANEL_RADIUS,
					borderWidth: PANEL_BORDER,
					borderColor: color.border,
					overflow: "hidden",
					backgroundColor: color.background,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}
