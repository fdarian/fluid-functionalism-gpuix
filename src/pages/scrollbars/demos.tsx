import { For, type JSX } from "solid-js";
import { ScrollArea } from "../../components/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "../../components/table";
import { ComponentPreview } from "../../lib/doc-page";
import { color, shape, siteType } from "../../lib/theme";
import { FADE_CODE, HORIZONTAL_CODE, PROBLEM_CODE, TABLE_CODE } from "./code";

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

/** Deterministic fake metric so the table renders identically on every pass. */
const metric = (row: number, col: number) =>
	(((row + 3) * (col + 7) * 37) % 900) + 100;

/** A table column is as wide as its widest cell, usually the header: about 8.4px a semibold 14px character plus the cell's 12px either side, with room for a three-digit number in the short ones. */
const columnWidth = (heading: string) =>
	Math.max(Math.round(heading.length * 8.4) + 24, 60);
/** "Copenhagen" in body weight, the widest city, plus the cell's padding. */
const CITY_COLUMN = 112;

/** `h-56 w-64`. */
const LIST_W = 256;
const LIST_H = 224;

function ReleaseRows() {
	return (
		<div style={{ display: "flex", flexDirection: "column", padding: 12 }}>
			<For each={RELEASES}>
				{(release: string) => (
					<div
						style={{
							paddingLeft: 12,
							paddingRight: 12,
							paddingTop: 8,
							paddingBottom: 8,
						}}
					>
						<text
							style={{
								...siteType.body,
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

function PanelLabel(props: { children: JSX.Element }) {
	return (
		<text
			style={{
				...siteType.caption,
				color: color.mutedForeground,
				textAlign: "center",
			}}
		>
			{props.children}
		</text>
	);
}

const frame = () => ({
	borderWidth: 1,
	borderColor: color.border,
	borderRadius: shape.container,
});

/**
 * The source scripts a fake cursor over both lists and feeds the real
 * component pointer events and `scrollTop` (`page.tsx:262-370`). `ScrollArea`
 * takes its hover and offset from real pointer and wheel input alone, so
 * the lists here wait for a real pointer.
 */
export function ProblemDemo() {
	return (
		<ComponentPreview testId="scrollbars-problem" code={PROBLEM_CODE}>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "flex-start",
					gap: 24,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 8,
						width: LIST_W,
						flexShrink: 0,
					}}
				>
					<div
						testId="scrollbars-plain"
						style={{
							...frame(),
							width: LIST_W,
							height: LIST_H,
							overflowY: "scroll",
						}}
					>
						<ReleaseRows />
					</div>
					<PanelLabel>
						❌ The native scrollbar hides until you scroll, so the list looks
						cut off
					</PanelLabel>
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 8,
						width: LIST_W,
						flexShrink: 0,
					}}
				>
					<ScrollArea
						testId="scrollbars-area"
						fade
						width={LIST_W}
						height={LIST_H}
						style={frame()}
					>
						<ReleaseRows />
					</ScrollArea>
					<PanelLabel>
						✅ ScrollArea shows its scrollbar on hover and fades the edges
					</PanelLabel>
				</div>
			</div>
		</ComponentPreview>
	);
}

export function FadeDemo() {
	return (
		<ComponentPreview testId="scrollbars-fade" code={FADE_CODE}>
			<ScrollArea
				testId="scrollbars-fade-area"
				fade
				width={288}
				height={256}
				style={frame()}
			>
				<ReleaseRows />
			</ScrollArea>
		</ComponentPreview>
	);
}

export function HorizontalDemo() {
	return (
		<ComponentPreview
			testId="scrollbars-horizontal"
			code={HORIZONTAL_CODE}
			padding="none"
			minHeight={0}
		>
			<ScrollArea
				testId="scrollbars-horizontal-area"
				orientation="horizontal"
				fade
				width="100%"
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
									...frame(),
									borderRadius: shape.bg,
									width: 112,
									height: 80,
									flexShrink: 0,
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<text style={{ ...siteType.body, color: color.foreground }}>
									{month}
								</text>
							</div>
						)}
					</For>
				</div>
			</ScrollArea>
		</ComponentPreview>
	);
}

export function TableDemo() {
	return (
		<ComponentPreview
			testId="scrollbars-table"
			code={TABLE_CODE}
			padding="none"
		>
			<ScrollArea
				testId="scrollbars-table-area"
				orientation="both"
				width="100%"
				height={320}
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead width={CITY_COLUMN}>City</TableHead>
							<For each={MONTHS}>
								{(month: string) => (
									<TableHead width={columnWidth(month)}>{month}</TableHead>
								)}
							</For>
						</TableRow>
					</TableHeader>
					<TableBody>
						<For each={CITIES}>
							{(city: string, row: () => number) => (
								<TableRow index={row()}>
									<TableCell width={CITY_COLUMN}>
										{city}
									</TableCell>
									<For each={MONTHS}>
										{(month: string, col: () => number) => (
											<TableCell width={columnWidth(month)}>
												{String(metric(row(), col()))}
											</TableCell>
										)}
									</For>
								</TableRow>
							)}
						</For>
					</TableBody>
				</Table>
			</ScrollArea>
		</ComponentPreview>
	);
}
