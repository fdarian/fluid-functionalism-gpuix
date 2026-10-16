import { createMediaQuery } from "@gpuix/solid";
import { type Accessor, For, type JSX, Show } from "solid-js";
import { usePageNav } from "#/lib/page-nav";
import { BENTO_ROW, BentoCard, type BentoSize } from "./bento-card";
import { previewMap } from "./bento-previews";

interface Tile {
	slug: string;
	/** The name as the docs list it (`lib/docs/components.ts`), not the demo's spaced title. */
	name: string;
	size: BentoSize;
	isNew?: boolean;
	/** At three columns the band's wide card sits in columns 2-3 and the dense flow backfills column 1. */
	side?: "right";
	/** Stage padding overrides for a preview that needs a taller window (the default is 24 x 64). */
	padding?: { x: number; y: number };
}

/**
 * Band layout, as in `app/components/bento-grid.tsx:11-48`. At three columns each 2-wide card (medium, large)
 * pairs with smalls filling the remaining column: a large (2 rows) takes two, a medium one. The size mix is
 * balanced so the grid has no holes at two or three columns (2 x 5 larges + 6 mediums = 16 smalls): adding a
 * card or changing a size means rebalancing.
 */
const TILES: readonly Tile[] = [
	{ slug: "input-message", name: "InputMessage", size: "medium" },
	{ slug: "thinking-indicator", name: "ThinkingIndicator", size: "small" },
	{
		slug: "command-menu",
		name: "CommandMenu",
		size: "large",
		isNew: true,
		side: "right",
		padding: { x: 24, y: 32 },
	},
	{ slug: "combobox", name: "Combobox", size: "small", isNew: true },
	{ slug: "switch", name: "Switch", size: "small" },
	{
		slug: "sidebar",
		name: "Sidebar",
		size: "large",
		padding: { x: 16, y: 32 },
	},
	{ slug: "radio-group", name: "RadioGroup", size: "small" },
	{ slug: "chat-message", name: "ChatMessage", size: "small" },
	{
		slug: "card",
		name: "Card",
		size: "medium",
		side: "right",
		padding: { x: 24, y: 20 },
	},
	{ slug: "select", name: "Select", size: "small" },
	{ slug: "thinking-steps", name: "ThinkingSteps", size: "large" },
	{ slug: "tabs-subtle", name: "TabsSubtle", size: "small" },
	{ slug: "checkbox-group", name: "CheckboxGroup", size: "small" },
	{
		slug: "ask-user-questions",
		name: "AskUserQuestions",
		size: "large",
		side: "right",
	},
	{ slug: "slider", name: "Slider", size: "small" },
	{
		slug: "dropdown",
		name: "Dropdown",
		size: "small",
		// The inline panel is a fixed 288px and does not shrink; a two-column tile's stage is 303px.
		padding: { x: 8, y: 12 },
	},
	{ slug: "tabs", name: "Tabs", size: "medium" },
	{ slug: "input-copy", name: "InputCopy", size: "small" },
	{ slug: "accordion", name: "Accordion", size: "medium", side: "right" },
	{ slug: "input-group", name: "InputGroup", size: "small" },
	{
		slug: "carousel-dots",
		name: "CarouselDots",
		size: "medium",
		isNew: true,
	},
	{ slug: "button", name: "Button", size: "small" },
	{
		slug: "table",
		name: "Table",
		size: "medium",
		side: "right",
		padding: { x: 24, y: 24 },
	},
	{ slug: "dialog", name: "Dialog", size: "small" },
	{ slug: "color-picker", name: "ColorPicker", size: "large" },
	{ slug: "tooltip", name: "Tooltip", size: "small" },
	{ slug: "badge", name: "Badge", size: "small" },
];

const GAP = 12;
const DEFAULT_PADDING = { x: 24, y: 64 };

/** 3 columns from 1280px, 2 from 768px, else 1, off the window's width. */
function createGridCols(): Accessor<1 | 2 | 3> {
	const xl = createMediaQuery("(min-width: 1280px)");
	const md = createMediaQuery("(min-width: 768px)");
	return () => (xl() ? 3 : md() ? 2 : 1);
}

/** `sizeClasses` in `bento-card.tsx:10-14`, which only apply from `md`, plus `xl:col-start-2`. */
function placement(tile: Tile, cols: 1 | 2 | 3) {
	if (cols === 1) return {};
	const wide = tile.size !== "small";
	const column =
		cols === 3 && tile.side === "right"
			? "2 / span 2"
			: wide
				? "span 2"
				: undefined;
	return {
		gridColumn: column,
		gridRow: tile.size === "large" ? "span 2" : undefined,
	};
}

export function BentoGrid() {
	const nav = usePageNav();
	const cols = createGridCols();
	return (
		<div
			testId="bento-grid"
			style={{
				display: "grid",
				gridTemplateColumns: cols(),
				gap: GAP,
				...(cols() === 1
					? {}
					: { gridAutoFlow: "row dense", gridAutoRows: BENTO_ROW }),
			}}
		>
			<For each={TILES}>
				{(tile) => (
					<BentoCard
						slug={tile.slug}
						name={tile.name}
						isNew={tile.isNew}
						placement={placement(tile, cols())}
						previewPadding={tile.padding ?? DEFAULT_PADDING}
						onOpen={() => nav.navigate(tile.slug)}
					>
						<Show when={previewMap[tile.slug]} keyed>
							{(Preview: () => JSX.Element) => <Preview />}
						</Show>
					</BentoCard>
				)}
			</For>
		</div>
	);
}
