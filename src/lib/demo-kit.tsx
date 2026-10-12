import type { JSX } from "solid-js";
import { color, type as scale } from "./theme";

/** The bordered surface a demo page is made of: content on top, the component's name in a footer, like the site's showcase cards. */
export function DemoCard(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.surface2,
			}}
		>
			<div style={{ padding: 20 }}>{props.children}</div>
			<div
				style={{
					height: 44,
					display: "flex",
					alignItems: "center",
					paddingLeft: 16,
					borderTopWidth: 1,
					borderColor: color.border,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					{props.title}
				</text>
			</div>
		</div>
	);
}

/** A caption on the left, controls on the right. */
export function DemoRow(props: { label: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 16,
				minHeight: 36,
			}}
		>
			<div style={{ width: 96, flexShrink: 0 }}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.label}
				</text>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}
