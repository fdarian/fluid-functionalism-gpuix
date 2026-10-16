import { createSignal, For } from "solid-js";
import { Button } from "#/components/button";
import { InputField, InputGroup } from "#/components/input-group";
import { Select } from "#/components/select";
import { TabsSubtle, TabsSubtleItem } from "#/components/tabs-subtle";
import { ComponentPreview } from "#/lib/doc-page";
import { defineIcon } from "#/lib/icons";
import { color, type SizeChoice, siteType, weight } from "#/lib/theme";
import { ANNOTATION_BLUE } from "#/pages/surfaces/annotations";
import { LADDER } from "./ladder";
import { SORT_OPTIONS } from "./sort-options";

const TOOLBAR_CODE = `// The same toolbar line at each step. One SizeProvider pins the
// row; every control inside follows. activeLabel collapses inactive
// tabs to their icon, saving room for the search field.

const { gap } = useSize(); // icon-to-label and control-to-control gap: 8px / 4px

<SizeProvider size="compact">
  <div className={cn("flex items-center", gap)}>
    <TabsSubtle activeLabel selectedIndex={view} onSelect={setView}>
      <TabsSubtleItem index={0} icon={Table2} label="Table" />
      <TabsSubtleItem index={1} icon={SquareKanban} label="Board" />
    </TabsSubtle>
    <div className={cn("ml-auto flex items-center", gap)}>
      <InputGroup className="w-28">
        <InputField index={0} label="Search" labelHidden icon={Search}
          placeholder="Search…" value={query} onChange={setQuery} />
      </InputGroup>
      <Select value={sort} onValueChange={setSort}>…</Select>
      <Button variant="tertiary" size="icon-compact" aria-label="Filter">
        <ListFilter />
      </Button>
      <Button leadingIcon={Plus}>New</Button>
    </div>
  </div>
</SizeProvider>`;

/** lucide `table-2`, `square-kanban` and `list-filter`, which the shared glyph set does not carry. */
export const TABLE_ICON = defineIcon(
	'<path d="M3 9h18" /><path d="M9 3v18" /><rect x="3" y="3" width="18" height="18" rx="2" />',
);
export const KANBAN_ICON = defineIcon(
	'<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 7v7" /><path d="M12 7v4" /><path d="M16 7v9" />',
);
export const FILTER_ICON = defineIcon(
	'<path d="M2 5h20" /><path d="M6 12h12" /><path d="M9 19h6" />',
);

/** `w-24` in the source; the port's `InputGroup` is a fixed 288px, so the wrapper sets the width and the group shrinks into it. */
function SearchField(props: { step: SizeChoice }) {
	const [query, setQuery] = createSignal("");
	return (
		<div style={{ display: "flex", width: 96, flexShrink: 0 }}>
			<InputGroup size={props.step}>
				<InputField
					index={0}
					label="Search"
					labelHidden
					icon="search"
					placeholder="Search…"
					value={query()}
					onChange={setQuery}
					testId={`toolbar-search-${props.step}`}
				/>
			</InputGroup>
		</div>
	);
}

/** The double-headed arrow of the spec sheet's height guide, as the source's three strokes. */
function HeightArrow(props: { height: number }) {
	const stroke = {
		fill: "none",
		stroke: ANNOTATION_BLUE,
		strokeWidth: 1.25,
		strokeLinecap: "round",
		strokeLinejoin: "round",
	} as const;
	return (
		<svg
			viewBox={`0 0 8 ${props.height}`}
			style={{ width: 8, height: props.height }}
		>
			<path d={`M4,1.5 V${props.height - 1.5}`} {...stroke} />
			<path d="M1.5,5 L4,1.5 L6.5,5" {...stroke} />
			<path
				d={`M1.5,${props.height - 5} L4,${props.height - 1.5} L6.5,${props.height - 5}`}
				{...stroke}
			/>
		</svg>
	);
}

/** Blue lines along the row's top and bottom edges, and the height beside a double arrow on the right. */
function HeightGuides(props: { height: number }) {
	const line = {
		position: "absolute",
		left: 0,
		right: 0,
		height: 1,
		backgroundColor: ANNOTATION_BLUE,
		opacity: 0.5,
	} as const;
	return (
		<>
			<div style={{ ...line, top: 0 }} />
			<div style={{ ...line, bottom: 0 }} />
			<div
				style={{
					position: "absolute",
					right: 0,
					top: 0,
					bottom: 0,
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 4,
				}}
			>
				<HeightArrow height={props.height} />
				<text
					style={{
						...siteType.caption,
						fontWeight: weight.semibold,
						color: color.foreground,
						fontVariantNumeric: "tabular-nums",
					}}
				>
					{`${props.height}px`}
				</text>
			</div>
		</>
	);
}

function ToolbarRow(props: { step: SizeChoice }) {
	const [view, setView] = createSignal(0);
	const [sort, setSort] = createSignal("updated");
	const gap = () => LADDER[props.step].gap;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "flex-start",
				gap: 12,
				width: "100%",
			}}
		>
			<text style={{ ...siteType.caption, color: color.mutedForeground }}>
				{props.step === "default" ? "Default · 36px" : "Compact · 28px"}
			</text>
			<div style={{ position: "relative", width: "100%" }}>
				<div
					style={{
						display: "flex",
						flexDirection: "row",
						flexWrap: "nowrap",
						alignItems: "center",
						gap: gap(),
						paddingRight: 44,
					}}
				>
					<TabsSubtle
						size={props.step}
						activeLabel
						selectedIndex={view()}
						onSelect={setView}
					>
						<TabsSubtleItem index={0} icon={TABLE_ICON} label="Table" />
						<TabsSubtleItem index={1} icon={KANBAN_ICON} label="Board" />
					</TabsSubtle>
					<div
						style={{
							marginLeft: "auto",
							display: "flex",
							flexDirection: "row",
							alignItems: "center",
							gap: gap(),
						}}
					>
						<SearchField step={props.step} />
						<Select
							variant="bordered"
							size={props.step}
							items={SORT_OPTIONS}
							value={sort()}
							onValueChange={setSort}
							placeholder="Sort by"
						/>
						<Button
							variant="tertiary"
							size={props.step === "compact" ? "icon-compact" : "icon"}
							icon={FILTER_ICON}
							aria-label="Filter"
						/>
						<Button size={props.step} leadingIcon="plus">
							New
						</Button>
					</div>
				</div>
				<HeightGuides height={LADDER[props.step].control} />
			</div>
		</div>
	);
}

/** The toolbar at each step of the ladder, for a host with its own frame. */
export function ToolbarRows() {
	return (
		<div
			style={{
				minWidth: 0,
				display: "flex",
				flexDirection: "column",
				gap: 32,
			}}
		>
			<For each={["default", "compact"] as const}>
				{(step) => <ToolbarRow step={step} />}
			</For>
		</div>
	);
}

export function ToolbarDemo() {
	return (
		<ComponentPreview
			testId="toolbar"
			code={TOOLBAR_CODE}
			minHeight={220}
			padding="none"
		>
			{/* The frame's own `px-8` leaves 534px for a row that needs 536 here (the port's Select trigger is 160px, the source's 144), so the inset is 16px. */}
			<div
				style={{
					flexGrow: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					paddingLeft: 16,
					paddingRight: 16,
					paddingTop: 48,
					paddingBottom: 48,
				}}
			>
				<ToolbarRows />
			</div>
		</ComponentPreview>
	);
}
