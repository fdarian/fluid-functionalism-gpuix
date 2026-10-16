import { type JSX, Show } from "solid-js";
import { color, shape, type as scale, weight } from "../lib/theme";

export const badgeColors = {
	gray: "#a3a3a3",
	red: "#ef4444",
	orange: "#f97316",
	amber: "#f59e0b",
	yellow: "#eab308",
	lime: "#84cc16",
	green: "#22c55e",
	emerald: "#10b981",
	teal: "#14b8a6",
	cyan: "#06b6d4",
	blue: "#3b82f6",
	indigo: "#6366f1",
	violet: "#8b5cf6",
	purple: "#a855f7",
	fuchsia: "#d946ef",
	pink: "#ec4899",
	rose: "#f43f5e",
} as const;

export type BadgeColor = keyof typeof badgeColors;
export type BadgeVariant = "solid" | "dot";
export type BadgeSize = "default" | "compact";

const sizes = {
	default: { height: 24, padX: 10, gap: 6, text: scale.caption, dot: 7 },
	compact: { height: 20, padX: 8, gap: 4, text: scale.micro, dot: 6 },
} as const;

/** `color-mix(in srgb, hue 15%, background)`, mixed here because gpuix colours are literals. */
function mix(hue: string, base: string, amount: number): string {
	const channel = (hex: string, offset: number) =>
		Number.parseInt(hex.slice(1 + offset * 2, 3 + offset * 2), 16);
	const mixed = [0, 1, 2].map((offset) =>
		Math.round(
			channel(hue, offset) * amount + channel(base, offset) * (1 - amount),
		),
	);
	return `rgb(${mixed[0]},${mixed[1]},${mixed[2]})`;
}

export function Badge(props: {
	variant?: BadgeVariant;
	size?: BadgeSize;
	color?: BadgeColor;
	testId?: string;
	children: JSX.Element;
}) {
	const size = () => sizes[props.size ?? "default"];
	const hue = () => badgeColors[props.color ?? "gray"];
	const solid = () => (props.variant ?? "solid") === "solid";

	const fill = () => {
		if (!solid()) return color.transparent;
		if (props.color === undefined || props.color === "gray") return color.accent;
		return mix(hue(), color.background, 0.15);
	};
	const dotColor = () =>
		props.color === undefined || props.color === "gray"
			? color.mutedForeground
			: hue();

	const content = () => (
		<>
			<Show when={!solid()}>
				<div
					style={{
						width: size().dot,
						height: size().dot,
						flexShrink: 0,
						borderRadius: size().dot / 2,
						backgroundColor: dotColor(),
					}}
				/>
			</Show>
			<text
				style={{
					...size().text,
					color: color.foreground,
					fontWeight: weight.normal,
					whiteSpace: "nowrap",
				}}
			>
				{props.children}
			</text>
		</>
	);

	return (
		<div
			testId={props.testId}
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				flexShrink: 0,
				height: size().height,
				paddingLeft: size().padX,
				paddingRight: size().padX,
				gap: size().gap,
				borderRadius: shape.item,
				backgroundColor: fill(),
				...(solid() ? {} : { borderWidth: 1, borderColor: color.border }),
			}}
		>
			{/* One fragment: a Show among siblings leaves an empty text node that eats a `gap`. */}
			{content()}
		</div>
	);
}
