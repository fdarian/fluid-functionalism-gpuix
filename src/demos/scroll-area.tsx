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
		<>
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
		<DemoCard title="Nested scroll areas">
			<ScrollArea
				testId="outer"
				width={280}
				height={160}
				fadeColor={color.surface2}
				style={box()}
			>
				<div style={{ display: "flex", flexDirection: "column", padding: 12, gap: 8 }}>
					<text style={{ ...scale.body, color: color.mutedForeground }}>
						Outer area. Scroll the inner one to its end: the outer follows.
					</text>
					<ScrollArea testId="inner" width={256} height={96} style={box()}>
						<ReleaseRows />
					</ScrollArea>
					<For each={RELEASES.slice(0, 6)}>
						{(release: string) => (
							<text style={{ ...scale.body, color: color.foreground }}>
								{release}
							</text>
						)}
					</For>
				</div>
			</ScrollArea>
		</DemoCard>
		</>
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

	// Real wheel ticks over the area: both edges fade once it is mid-scroll.
	await shot.scroll(area.x, area.y, 0, -120);
	shot.capture("wheel-scrolled-both-fades");

	// Drag the thumb, with the pointer leaving the track mid-drag.
	await shot.down("area-y-thumb");
	await shot.moveHeld(trackX(area.x) - 90, area.y + 40);
	shot.capture("dragging");
	await shot.moveTo(trackX(area.x) - 90, area.y + 40);
	await shot.up("area-y-thumb");

	// Keyboard: a press inside puts focus in the viewport, then the keys scroll it like a browser would.
	const thumbY = () => shot.centerOf("area-y-thumb").y;
	const expectBelow = (label: string, lower: number, higher: number) => {
		if (!(higher > lower)) {
			throw new Error(`${label}: thumb stayed at ${lower} -> ${higher}`);
		}
	};
	await shot.clickAt(area.x - 60, area.y);
	await shot.press("home");
	const atHome = thumbY();
	shot.capture("key-home");
	await shot.press("pagedown");
	const afterPage = thumbY();
	expectBelow("pagedown", atHome, afterPage);
	await shot.press("down down down");
	expectBelow("arrows", afterPage, thumbY());
	await shot.press("end");
	const atEnd = thumbY();
	expectBelow("end", afterPage, atEnd);
	shot.capture("key-end");

	// A wheel tick over the track itself scrolls the viewport.
	await shot.press("home");
	const homeAgain = thumbY();
	await shot.scroll(trackX(area.x), area.y, 0, -60);
	expectBelow("wheel over the track", homeAgain, thumbY());
	shot.capture("wheel-over-track");

	// A press on the bare track jumps, and holding it carries on as a drag from there.
	await shot.press("home");
	await shot.down("area-y-track");
	const jumped = thumbY();
	expectBelow("track press", homeAgain, jumped);
	const track = shot.centerOf("area-y-track");
	await shot.moveHeld(track.x, track.y + 30);
	expectBelow("drag after the jump", jumped, thumbY());
	shot.capture("track-jump-then-drag");
	await shot.up("area-y-track");

	await shot.clickAt(trackX(area.x), area.y + 78);
	shot.capture("track-jump-to-end");
	await shot.scroll(area.x, area.y, 0, -400);
	shot.capture("wheel-past-end");

	const strip = shot.centerOf("horizontal");
	await shot.moveTo(strip.x, strip.y);
	await shot.scroll(strip.x, strip.y, -200, 0);
	shot.capture("horizontal-wheel");

	// Nested, as in a browser: a wheel over the inner area scrolls the inner area first; once it is at its limit, a wheel in a new gesture chains to the area around it.
	await shot.scroll(930, 400, 0, -400);
	shot.capture("page-scrolled");
	const inner = shot.centerOf("inner");
	await shot.moveTo(inner.x, inner.y);
	await shot.scroll(inner.x, inner.y, 0, -150);
	shot.capture("nested-inner-scrolled-outer-stays");
	// 794px is the inner area's scroll range: ticks that stop at it, since a tick that overshoots passes its remainder on to the outer area within the same event.
	for (let tick = 0; tick < 4; tick++) await shot.scroll(inner.x, inner.y, 0, -150);
	await shot.scroll(inner.x, inner.y, 0, -44);
	shot.capture("nested-inner-at-end-outer-stays");
	await shot.scroll(inner.x, inner.y, 0, -150);
	shot.capture("nested-inner-at-end-outer-follows");
	await shot.scroll(930, 400, 0, 2000);

	const grid = shot.centerOf("both");
	await shot.moveTo(grid.x, grid.y);
	await shot.scroll(grid.x, grid.y, -240, -90);
	shot.capture("both-wheel");
};
