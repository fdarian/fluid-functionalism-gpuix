import type { HostElement } from "@gpuix/solid";
import {
	createContext,
	createEffect,
	type JSX,
	useContext,
} from "solid-js";
import { FluidHighlight } from "#/lib/fluid-highlight";
import { createFluidHover, type FluidHover, useHoverItem } from "#/lib/fluid-hover";
import {
	color,
	colorFade,
	fade,
	sizeChoice,
	type as scale,
	weight,
} from "#/lib/theme";

export type TableSize = "default" | "compact";

const cellMetrics = {
	default: { padX: 12, padY: 8, text: scale.body },
	compact: { padX: 10, padY: 5, text: scale.bodyCompact },
} as const;

interface TableScope {
	hover: FluidHover;
	size: () => TableSize;
}

const TableScopeContext = createContext<TableScope>();

function useTableScope() {
	const scope = useContext(TableScopeContext);
	if (scope === undefined) throw new Error("Must be used inside Table");
	return scope;
}

/** What a cell needs to know about the row it sits in. */
interface RowState {
	lit: () => boolean;
	header: boolean;
}

const RowContext = createContext<RowState>();

function useRowState() {
	const row = useContext(RowContext);
	if (row === undefined) throw new Error("Must be used inside TableRow");
	return row;
}

/**
 * A table with one fluid hover highlight drawn behind all of it. Body rows
 * pass `index`; header rows leave it out, so they never light up.
 */
export function Table(props: {
	size?: TableSize;
	testId?: string;
	children: JSX.Element;
}) {
	const hover = createFluidHover();
	const scope: TableScope = {
		hover,
		size: () => props.size ?? sizeChoice(),
	};
	const hoverRect = () => {
		const index = hover.activeIndex();
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	return (
		<TableScopeContext.Provider value={scope}>
			<div
				testId={props.testId}
				{...hover.containerProps}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: "100%",
				}}
			>
				<FluidHighlight
					rect={hoverRect}
					session={hover.session}
					radius={0}
					background={color.hover}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-highlight`
					}
				/>
				{props.children}
			</div>
		</TableScopeContext.Provider>
	);
}

export function TableHeader(props: { children: JSX.Element }) {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{props.children}
		</div>
	);
}

export function TableBody(props: { children: JSX.Element }) {
	return (
		<div style={{ display: "flex", flexDirection: "column" }}>
			{props.children}
		</div>
	);
}

export function TableRow(props: {
	/** The fluid hover index. Omit for header rows. */
	index?: number;
	testId?: string;
	children: JSX.Element;
}) {
	const scope = useTableScope();
	const header = props.index === undefined;
	const active = () => scope.hover.activeIndex();
	const lit = () => !header && active() === props.index;

	// Each row draws only its bottom border, so the lit row's top edge is the
	// border of the row above it. Hiding both leaves the highlight with no
	// rule along or through it. Row 0's top edge is the header's border.
	const hideBorder = () => {
		const current = active();
		if (current === null) return false;
		if (props.index === undefined) return current === 0;
		return props.index === current || props.index === current - 1;
	};

	let rowElement: HostElement | undefined;
	useHoverItem(
		scope.hover,
		() => props.index,
		() => rowElement,
	);

	return (
		<RowContext.Provider value={{ lit, header }}>
			<div
				testId={props.testId}
				ref={(element) => {
					rowElement = element;
				}}
				style={{
					position: "relative",
					zIndex: 10,
					display: "flex",
					flexDirection: "row",
					borderBottomWidth: 1,
					borderColor: hideBorder() ? color.transparent : color.accentFaint,
					...fade(["border-color"], 80),
				}}
			>
				{props.children}
			</div>
		</RowContext.Provider>
	);
}

interface CellOptions {
	width?: number;
	/** The source's `text-right`. */
	alignRight?: boolean;
	/** The source's `tabular-nums`. */
	tabularNums?: boolean;
	children: JSX.Element;
}

function Cell(props: CellOptions & { header: boolean }) {
	const scope = useTableScope();
	const row = useRowState();
	const metrics = () => cellMetrics[scope.size()];
	const textColor = () =>
		props.header || row.lit() ? color.foreground : color.mutedForeground;
	return (
		<div
			style={{
				flexGrow: props.width === undefined ? 1 : 0,
				flexShrink: props.width === undefined ? 1 : 0,
				flexBasis: props.width === undefined ? 0 : props.width,
				minWidth: 0,
				paddingLeft: metrics().padX,
				paddingRight: metrics().padX,
				paddingTop: metrics().padY,
				paddingBottom: metrics().padY,
			}}
		>
			<text
				style={{
					...metrics().text,
					color: textColor(),
					...(props.header ? {} : colorFade),
					fontWeight: props.header ? weight.semibold : weight.normal,
					textAlign: props.alignRight ? "right" : "left",
					fontVariantNumeric: props.tabularNums ? "tabular-nums" : "normal",
				}}
			>
				{props.children}
			</text>
		</div>
	);
}

export function TableHead(props: CellOptions) {
	return (
		<Cell
			header
			width={props.width}
			alignRight={props.alignRight}
			tabularNums={props.tabularNums}
		>
			{props.children}
		</Cell>
	);
}

export function TableCell(props: CellOptions) {
	return (
		<Cell
			header={false}
			width={props.width}
			alignRight={props.alignRight}
			tabularNums={props.tabularNums}
		>
			{props.children}
		</Cell>
	);
}
