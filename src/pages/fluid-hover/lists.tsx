import type { HostElement } from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createSignal,
	For,
	type JSX,
	on,
	Show,
} from "solid-js";
import {
	SidebarContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
} from "../../components/sidebar";
import { onFrame } from "../../lib/clock";
import { defineIcon, type IconRef } from "../../lib/icons";
import { color, radius, type as scale, weight } from "../../lib/theme";
import { PreviewFrame } from "./parts";

const MESSAGE_CIRCLE = defineIcon(
	'<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
);
const BRAIN = defineIcon(
	'<path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/>',
);
const PLAY = defineIcon(
	'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
);
const ARROW_LEFT = defineIcon('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>');

// Three callouts around the sidebar, one per case. The arrows are measured
// against the real rows, so they land where the rows are rather than where a
// hand-tuned number says they should be.
const CANVAS_WIDTH = 598;
const CANVAS_HEIGHT = 400;
const SIDEBAR_LEFT = 179;
const SIDEBAR_TOP = 16;
const SIDEBAR_WIDTH = 260;
const SIDEBAR_HEIGHT = 368;
const LABEL_WIDTH = 140;
/** Arrows stop this far outside the sidebar frame, never inside it. */
const ARROW_GAP = 6;
/** How long the arrows keep re-measuring after a sub-menu toggles: its height spring and the rows below it settle by then. */
const TRACK_MS = 600;

interface Callout {
	key: string;
	title: string;
	/** Broken by hand where `text-balance` breaks the source's copy: gpuix has no balanced wrap, and a wrapped text box is as wide as its container, so the arrow could not find the glyphs' edge. */
	lines: readonly string[];
	/** Which side of the sidebar the label sits on. Its vertical position follows the target, so the arrow is short and level. */
	side: "left" | "right";
	/** Rows the arrow points at: it ends level with the mean of their centers. */
	targets: string[];
}

const CALLOUTS: Callout[] = [
	{
		key: "one",
		title: "1 list",
		lines: ["Children ride with", "their parent."],
		side: "left",
		targets: ["Today", "Yesterday"],
	},
	{
		key: "skip",
		title: "Skipped",
		lines: ["Disabled rows", "are passed over."],
		side: "right",
		targets: ["Knowledge"],
	},
	{
		key: "two",
		title: "New list",
		lines: ["A divider means a", "different kind."],
		side: "left",
		targets: ["Profile", "Log out"],
	},
];

const LABEL_LEFT = {
	left: 14,
	right: SIDEBAR_LEFT + SIDEBAR_WIDTH + 40,
} as const;

interface Point {
	x: number;
	y: number;
}

/** A quadratic curve from `start` to `end`, bowed by `curve` px off the chord, and the chevron at its end (the source's marker: a 7px-tall open arrowhead whose tip is the path's end). */
function arrow(start: Point, end: Point, curve: number) {
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	const control = {
		x: (start.x + end.x) / 2 + (-dy / length) * curve,
		y: (start.y + end.y) / 2 + (dx / length) * curve,
	};
	const tangentX = end.x - control.x;
	const tangentY = end.y - control.y;
	const tangentLength = Math.hypot(tangentX, tangentY) || 1;
	const along = { x: tangentX / tangentLength, y: tangentY / tangentLength };
	const across = { x: -along.y, y: along.x };
	const wing = (side: 1 | -1) => ({
		x: end.x - along.x * 5.5 + across.x * 3.5 * side,
		y: end.y - along.y * 5.5 + across.y * 3.5 * side,
	});
	const round = (n: number) => Math.round(n * 10) / 10;
	const at = (p: Point) => `${round(p.x)},${round(p.y)}`;
	return {
		line: `M${at(start)} Q${at(control)} ${at(end)}`,
		head: `M${at(wing(1))} L${at(end)} L${at(wing(-1))}`,
	};
}

/** A row the arrows measure: a wrapper with the row's own box. */
function Measured(props: {
	label: string;
	register: (label: string, element: HostElement) => void;
	onLayout: () => void;
	dimmed?: boolean;
	children: JSX.Element;
}) {
	return (
		<div
			ref={(element) => props.register(props.label, element)}
			onLayout={props.onLayout}
			style={{
				display: "flex",
				flexDirection: "column",
				flexShrink: 0,
				opacity: props.dimmed === true ? 0.5 : 1,
			}}
		>
			{props.children}
		</div>
	);
}

function ListsSidebar(props: {
	register: (label: string, element: HostElement) => void;
	onLayout: () => void;
	open: () => boolean;
	setOpen: (open: boolean) => void;
}) {
	const [current, setCurrent] = createSignal("Today");
	const measured = (label: string, dimmed: boolean, children: JSX.Element) => (
		<Measured
			label={label}
			register={props.register}
			onLayout={props.onLayout}
			dimmed={dimmed}
		>
			{children}
		</Measured>
	);
	const row = (
		label: string,
		icon: IconRef,
	) => (
		<SidebarMenuButton
			testId={`lists-${label}`}
			icon={icon}
			label={label}
			active={current() === label}
			onClick={() => setCurrent(label)}
		/>
	);
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div style={{ height: 4, flexShrink: 0 }} />
			<SidebarContent>
				<SidebarGroupLabel>Workspace</SidebarGroupLabel>
				<SidebarMenu>
					{/* The parent only expands and collapses. */}
					<SidebarMenuButton
						testId="lists-Chat"
						icon={MESSAGE_CIRCLE}
						label="Chat"
						trailingIcon={() =>
							props.open() ? "chevron-down" : "chevron-right"
						}
						onClick={() => props.setOpen(!props.open())}
					/>
					<SidebarMenuSub open={props.open()}>
						<For each={["Today", "Yesterday"]}>
							{(label) =>
								measured(
									label,
									false,
									<SidebarMenuButton
										testId={`lists-${label}`}
										level={1}
										label={label}
										active={current() === label}
										disabled={() => !props.open()}
										onClick={() => setCurrent(label)}
									/>,
								)
							}
						</For>
					</SidebarMenuSub>
					{row("Agents", BRAIN)}
					{measured(
						"Knowledge",
						true,
						<SidebarMenuButton
							testId="lists-Knowledge"
							icon="square-library"
							label="Knowledge"
							disabled={() => true}
						/>,
					)}
					{row("Runs", PLAY)}
				</SidebarMenu>
				{/* A different kind of thing follows. */}
				<div
					style={{
						height: 1,
						flexShrink: 0,
						marginLeft: 8,
						marginRight: 8,
						backgroundColor: color.border,
					}}
				/>
				<SidebarGroupLabel>Account</SidebarGroupLabel>
				<SidebarMenu>
					{measured(
						"Profile",
						false,
						<SidebarMenuButton
							testId="lists-Profile"
							icon="user"
							label="Profile"
							active={current() === "Profile"}
							onClick={() => setCurrent("Profile")}
						/>,
					)}
					{measured(
						"Log out",
						false,
						<SidebarMenuButton
							testId="lists-Log out"
							icon={ARROW_LEFT}
							label="Log out"
							active={current() === "Log out"}
							onClick={() => setCurrent("Log out")}
						/>,
					)}
				</SidebarMenu>
			</SidebarContent>
		</div>
	);
}

/** Per callout: the y the arrow points at, and where the label's text ends or begins on the canvas. */
type Ends = Record<string, { y: number; edge: number }>;

export function ListsDemo() {
	const [open, setOpen] = createSignal(true);
	const [ends, setEnds] = createSignal<Ends>({});
	const rows = new Map<string, HostElement>();
	const texts = new Map<string, HostElement[]>();
	const register = (key: string, element: HostElement) => {
		texts.set(key, [...(texts.get(key) ?? []), element]);
	};
	const labelTop = (key: string) => {
		const end = ends()[key];
		return end === undefined ? undefined : end.y - 9;
	};
	let canvas: HostElement | undefined;

	const measure = () => {
		if (canvas === undefined || !canvas.mounted) return;
		const box = canvas.getBoundingClientRect();
		// A culled demo (display: none) reports an empty box: keep the last measure.
		if (box.width === 0) return;
		const next: Ends = {};
		for (const callout of CALLOUTS) {
			const targets = callout.targets.map((label) => rows.get(label));
			if (targets.some((row) => row === undefined || !row.mounted)) continue;
			const centers = targets.map((row) => {
				const rect = (row as HostElement).getBoundingClientRect();
				return rect.y + rect.height / 2;
			});
			const y = centers.reduce((sum, c) => sum + c, 0) / centers.length - box.y;
			const label = texts.get(callout.key);
			if (label === undefined || label.some((line) => !line.mounted)) continue;
			const rects = label.map((line) => line.getBoundingClientRect());
			const edge =
				callout.side === "left"
					? Math.max(...rects.map((rect) => rect.x + rect.width)) - box.x
					: Math.min(...rects.map((rect) => rect.x)) - box.x;
			next[callout.key] = { y, edge };
		}
		setEnds(next);
	};

	// The rows move while the sub-menu's height springs; measure each frame until it settles, and once on mount.
	createEffect(
		on(open, () => {
			const until = performance.now() + TRACK_MS;
			const stop = onFrame(() => {
				measure();
				if (performance.now() > until) stop();
			});
		}),
	);

	return (
		<PreviewFrame padding="none">
			<div
				ref={(element) => {
					canvas = element;
				}}
				onLayout={measure}
				style={{
					position: "relative",
					flexShrink: 0,
					width: CANVAS_WIDTH,
					height: CANVAS_HEIGHT,
				}}
			>
				<div
					style={{
						position: "absolute",
						left: SIDEBAR_LEFT,
						top: SIDEBAR_TOP,
						width: SIDEBAR_WIDTH,
						height: SIDEBAR_HEIGHT,
						overflow: "hidden",
						borderRadius: radius.container,
						borderWidth: 1,
						borderColor: color.borderFaint,
						backgroundColor: color.background,
					}}
				>
					<ListsSidebar
						register={(label, element) => rows.set(label, element)}
						onLayout={measure}
						open={open}
						setOpen={setOpen}
					/>
				</div>
				<svg
					viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
					style={{
						position: "absolute",
						left: 0,
						top: 0,
						width: CANVAS_WIDTH,
						height: CANVAS_HEIGHT,
						pointerEvents: "none",
					}}
				>
					<For each={CALLOUTS}>
						{(callout) => {
							const geometry = () => {
								const end = ends()[callout.key];
								if (end === undefined) return undefined;
								// Level with the target: from just past the label's text to just outside the frame, with a small bow so it reads as drawn.
								return callout.side === "left"
									? arrow(
											{ x: end.edge + 6, y: end.y },
											{ x: SIDEBAR_LEFT - ARROW_GAP, y: end.y },
											-6,
										)
									: arrow(
											{ x: end.edge - 6, y: end.y },
											{
												x: SIDEBAR_LEFT + SIDEBAR_WIDTH + ARROW_GAP,
												y: end.y,
											},
											6,
										);
							};
							return (
								<Show when={geometry()}>
									{(path: Accessor<ReturnType<typeof arrow>>) => (
										<>
											<path
												d={path().line}
												stroke={color.focusRing}
												strokeWidth={1.5}
												strokeLinecap="round"
												fill="none"
											/>
											<path
												d={path().head}
												stroke={color.focusRing}
												strokeWidth={1.5}
												strokeLinecap="round"
												strokeLinejoin="round"
												fill="none"
											/>
										</>
									)}
								</Show>
							);
						}}
					</For>
				</svg>
				<For each={CALLOUTS}>
					{(callout) => (
						<div
							style={{
								position: "absolute",
								left: LABEL_LEFT[callout.side],
								top: labelTop(callout.key),
								display: "flex",
								flexDirection: "column",
								alignItems: "flex-start",
								gap: 2,
								pointerEvents: "none",
								opacity: ends()[callout.key] === undefined ? 0 : 1,
							}}
						>
							<text
								ref={(element) => register(callout.key, element)}
								style={{
									...scale.caption,
									fontWeight: weight.semibold,
									color: color.foreground,
									whiteSpace: "nowrap",
								}}
							>
								{callout.title}
							</text>
							<For each={callout.lines}>
								{(line) => (
									<text
										ref={(element) => register(callout.key, element)}
										style={{
											...scale.micro,
											color: color.mutedForeground,
											whiteSpace: "nowrap",
										}}
									>
										{line}
									</text>
								)}
							</For>
						</div>
					)}
				</For>
			</div>
		</PreviewFrame>
	);
}
