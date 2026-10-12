import { For, type JSX } from "solid-js";
import { ScrollArea } from "../components/scroll-area";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";
import { color, radius, type as scale } from "../lib/theme";

const RELEASES = Array.from(
	{ length: 24 },
	(_, i) => `v1.${23 - i}.0 — maintenance release`,
);

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const CITIES = [
	"Amsterdam",
	"Berlin",
	"Copenhagen",
	"Dublin",
	"Helsinki",
	"Lisbon",
	"London",
	"Madrid",
	"Oslo",
	"Paris",
	"Prague",
	"Stockholm",
	"Vienna",
	"Warsaw",
	"Zurich",
];

/** A fixed fake metric, so the table paints the same on every run. */
const metric = (row: number, col: number) => ((row + 3) * (col + 7) * 37) % 900 + 100;

const CITY_W = 104;
const CELL_W = 80;

const box = () => ({
	borderWidth: 1,
	borderColor: color.border,
	borderRadius: radius.container,
});

function ReleaseRows() {
	return (
		<div style={{ display: "flex", flexDirection: "column", padding: 12 }}>
			<For each={RELEASES}>
				{(release: string) => (
					<div style={{ padding: 8, paddingLeft: 12, paddingRight: 12 }}>
						<text
							style={{
								...scale.body,
								color: color.foreground,
								whiteSpace: "nowrap",
							}}
						>
							{release}
						</text>
					</div>
				)}
			</For>
		</div>
	);
}

function Panel(props: { caption: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 8,
				width: 256,
				flexShrink: 0,
			}}
		>
			{props.children}
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.caption}
			</text>
		</div>
	);
}

function Cell(props: { width: number; right?: boolean; strong?: boolean; children: string }) {
	return (
		<div
			style={{
				width: props.width,
				flexShrink: 0,
				paddingLeft: 12,
				paddingRight: 12,
				display: "flex",
				flexDirection: "row",
				justifyContent: props.right ? "flex-end" : "flex-start",
			}}
		>
			<text
				style={{
					...scale.body,
					whiteSpace: "nowrap",
					color: props.strong ? color.foreground : color.mutedForeground,
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

export const title = "Scroll Area";
export const group = "Components";

export function Demo() {
	return (
		<DemoCard title="Scroll Area">
			<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
				<div style={{ display: "flex", flexDirection: "row", gap: 24 }}>
					<Panel caption="Plain overflow: nothing says there is more below">
						<div
							testId="plain"
							style={{
								...box(),
								width: 256,
								height: 168,
								overflowY: "scroll",
							}}
						>
							<ReleaseRows />
						</div>
					</Panel>
					<Panel caption="ScrollArea: scrollbar on hover, faded edges">
						<ScrollArea
							testId="area"
							fade
							fadeColor={color.surface2}
							width={256}
							height={168}
							style={box()}
						>
							<ReleaseRows />
						</ScrollArea>
					</Panel>
				</div>
				<ScrollArea
					testId="horizontal"
					orientation="horizontal"
					fade
					fadeColor={color.surface2}
					height={104}
				>
					<div
						style={{
							display: "flex",
							flexDirection: "row",
							gap: 8,
							padding: 12,
							flexShrink: 0,
						}}
					>
						<For each={MONTHS}>
							{(month: string) => (
								<div
									style={{
										...box(),
										borderRadius: radius.item,
										width: 112,
										height: 80,
										flexShrink: 0,
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
									}}
								>
									<text style={{ ...scale.body, color: color.foreground }}>
										{month}
									</text>
								</div>
							)}
						</For>
					</div>
				</ScrollArea>
				<ScrollArea testId="both" orientation="both" height={132} style={box()}>
					<div
						style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}
					>
						<div
							style={{
								display: "flex",
								flexDirection: "row",
								height: 36,
								alignItems: "center",
								flexShrink: 0,
								borderBottomWidth: 1,
								borderColor: color.border,
							}}
						>
							<Cell width={CITY_W} strong>
								City
							</Cell>
							<For each={MONTHS}>
								{(month: string) => (
									<Cell width={CELL_W} right strong>
										{month.slice(0, 3)}
									</Cell>
								)}
							</For>
						</div>
						<For each={CITIES}>
							{(city: string, row: () => number) => (
								<div
									style={{
										display: "flex",
										flexDirection: "row",
										height: 36,
										alignItems: "center",
										flexShrink: 0,
									}}
								>
									<Cell width={CITY_W} strong>
										{city}
									</Cell>
									<For each={MONTHS}>
										{(_month: string, col: () => number) => (
											<Cell width={CELL_W} right>
												{String(metric(row(), col()))}
											</Cell>
										)}
									</For>
								</div>
							)}
						</For>
					</div>
				</ScrollArea>
			</div>
		</DemoCard>
	);
}

/** The vertical track runs down the right edge of the area, 10px wide. */
const trackX = (areaCenterX: number) => areaCenterX + 128 - 5;

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	const area = shot.centerOf("area");
	await shot.moveTo(area.x, area.y);
	shot.capture("hover-scrollbar");
	await shot.hover("area-y-thumb");
	shot.capture("hover-thumb");
	await shot.clickAt(trackX(area.x), area.y);
	shot.capture("scrolled-both-fades");
	await shot.down("area-y-thumb");
	shot.capture("dragging");
	await shot.up("area-y-thumb");
	await shot.clickAt(trackX(area.x), area.y + 78);
	shot.capture("scrolled-to-end");

	const strip = shot.centerOf("horizontal");
	await shot.moveTo(strip.x, strip.y);
	await shot.clickAt(strip.x + 100, strip.y + 52 - 5);
	shot.capture("horizontal-scrolled");

	const grid = shot.centerOf("both");
	await shot.moveTo(grid.x, grid.y);
	await shot.clickAt(grid.x + 100, grid.y + 66 - 5);
	await shot.clickAt(grid.x + 279 - 5, grid.y + 20);
	shot.capture("both-scrolled");
};
