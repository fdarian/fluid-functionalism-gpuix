import {
	type DomEvent,
	type HostElement,
	type KeyEvent,
	useGpuixRequired,
} from "@gpuix/solid";
import {
	type Accessor,
	createComputed,
	createContext,
	createEffect,
	createMemo,
	createSignal,
	createUniqueId,
	For,
	type JSX,
	onCleanup,
	untrack,
	useContext,
} from "solid-js";
import { FluidHighlight } from "#/lib/fluid-highlight";
import { createFluidHover, type FluidHover } from "#/lib/fluid-hover";
import {
	createFocusRing,
	FocusRing,
	type FocusRingState,
} from "#/lib/focus-ring";
import { StableLabel } from "#/lib/stable-label";
import {
	color,
	fade,
	shape,
	sizeChoice,
	type as scale,
	scheme,
	motion as tween,
	weight,
} from "#/lib/theme";

/**
 * What checkbox-group and radio-group share: a vertical list of focusable
 * rows under one fluid hover scope, with the backgrounds that span rows (the
 * selected runs and the hover highlight) painted by the group.
 */

export type ChoiceSize = "default" | "compact";

export const ROW = {
	default: { height: 36, gap: 8, padX: 12, box: 16, text: scale.body },
	compact: { height: 28, gap: 4, padX: 10, box: 14, text: scale.bodyCompact },
} as const;

/** `tween.moderateExit` plus a frame: when a vanished run's fade is over. */
const RUN_EXIT_MS = 160;

/** A contiguous run of selected rows. The id stays with the run while its rows change, so the background grows or shrinks in place instead of being replaced. */
export interface Run {
	start: number;
	end: number;
	id: number;
}

interface RunIds {
	runs: Run[];
	byRow: Map<number, number>;
	lastId: number;
}

/** Groups sorted row indices into runs; a run reuses the id of the first of its rows that had one, unless an earlier run took it. */
function assignRunIds(
	sorted: readonly number[],
	previous: ReadonlyMap<number, number>,
	lastIdBefore: number,
): RunIds {
	const spans: { start: number; end: number }[] = [];
	for (const index of sorted) {
		const last = spans[spans.length - 1];
		if (last !== undefined && index === last.end + 1) last.end = index;
		else spans.push({ start: index, end: index });
	}
	let lastId = lastIdBefore;
	const used = new Set<number>();
	const byRow = new Map<number, number>();
	const runs = spans.map((span) => {
		let stableId: number | undefined;
		for (let index = span.start; index <= span.end; index++) {
			const previousId = previous.get(index);
			if (previousId !== undefined && !used.has(previousId)) {
				stableId = previousId;
				break;
			}
		}
		lastId += 1;
		const id = stableId ?? lastId;
		used.add(id);
		for (let index = span.start; index <= span.end; index++) {
			byRow.set(index, id);
		}
		return { ...span, id };
	});
	return { runs, byRow, lastId };
}

export function createSelectionRuns(
	indices: Accessor<readonly number[]>,
): Accessor<Run[]> {
	let previous = new Map<number, number>();
	let lastId = 0;
	return createMemo(() => {
		const sorted = [...indices()].sort((a, b) => a - b);
		const next = assignRunIds(sorted, previous, lastId);
		previous = next.byRow;
		lastId = next.lastId;
		return next.runs;
	});
}

interface RowEntry {
	element: HostElement;
	activate: () => void;
}

interface ChoiceContextValue {
	hover: FluidHover;
	focusRing: FocusRingState;
	size: Accessor<ChoiceSize>;
	arrowsSelect: boolean;
	registerRow(index: number, entry: RowEntry): void;
	/** Moves focus `delta` rows on, wrapping; `"first"` / `"last"` jump. */
	focusFrom(index: number, step: number | "first" | "last"): void;
}

const ChoiceContext = createContext<ChoiceContextValue>();

function useChoice() {
	const context = useContext(ChoiceContext);
	if (context === undefined) {
		throw new Error("A choice row must be inside a choice group");
	}
	return context;
}

export function ChoiceGroup(props: {
	role: "group" | "radiogroup";
	size?: ChoiceSize;
	runs: Accessor<readonly Run[]>;
	/** Arrow keys select the row they land on, as native radios do. */
	arrowsSelect?: boolean;
	/** Whether a run that leaves `runs` fades out (checkbox) or is gone at once (radio, whose one fill is placed, not faded). Defaults to `true`. */
	fadeOutRuns?: boolean;
	testId?: string;
	children: JSX.Element;
}) {
	const renderer = useGpuixRequired();
	const focusElement = renderer.focusElement;
	if (focusElement === undefined) {
		throw new Error("This renderer does not expose focusElement");
	}
	const hover = createFluidHover();
	const focusRing = createFocusRing(hover);
	const rows = new Map<number, RowEntry>();

	const rectOf = (index: number | null) => () => {
		if (index === null || !hover.isMeasured()) return null;
		return hover.rects()[index] ?? null;
	};

	const runRect = (id: number) => () => {
		const run = props.runs().find((candidate) => candidate.id === id);
		if (run === undefined || !hover.isMeasured()) return null;
		const first = hover.rects()[run.start];
		const last = hover.rects()[run.end];
		if (first === undefined || last === undefined) return null;
		return {
			top: first.top,
			left: first.left,
			width: first.width,
			height: last.top + last.height - first.top,
		};
	};
	// A run that left `runs` keeps its highlight mounted for its exit fade (it sits on its last rect and fades), as the source's AnimatePresence does.
	const [shownRunIds, setShownRunIds] = createSignal<readonly number[]>([]);
	const retireTimers = new Set<ReturnType<typeof setTimeout>>();
	onCleanup(() => {
		for (const timer of retireTimers) clearTimeout(timer);
	});
	createComputed(() => {
		const live = props.runs().map((run) => run.id);
		const retiring =
			props.fadeOutRuns === false
				? []
				: untrack(shownRunIds).filter((id) => !live.includes(id));
		setShownRunIds([...live, ...retiring]);
		if (retiring.length === 0) return;
		const timer = setTimeout(() => {
			retireTimers.delete(timer);
			setShownRunIds(
				shownRunIds().filter(
					(id) =>
						!retiring.includes(id) || props.runs().some((run) => run.id === id),
				),
			);
		}, RUN_EXIT_MS);
		retireTimers.add(timer);
	});

	const context: ChoiceContextValue = {
		hover,
		focusRing,
		size: () => props.size ?? sizeChoice(),
		arrowsSelect: props.arrowsSelect ?? false,
		registerRow(index, entry) {
			rows.set(index, entry);
			onCleanup(() => {
				if (rows.get(index) === entry) rows.delete(index);
			});
		},
		focusFrom(index, step) {
			const order = [...rows.keys()].sort((a, b) => a - b);
			if (order.length === 0) return;
			const position = order.indexOf(index);
			const target =
				step === "first"
					? 0
					: step === "last"
						? order.length - 1
						: (position + step + order.length) % order.length;
			const entry = rows.get(order[target]);
			if (entry === undefined) throw new Error(`No row at ${order[target]}`);
			focusElement.call(renderer, entry.element.id);
			if (context.arrowsSelect) entry.activate();
		},
	};

	return (
		<ChoiceContext.Provider value={context}>
			<div
				testId={props.testId}
				role={props.role}
				{...hover.containerProps}
				style={{
					position: "relative",
					display: "flex",
					flexDirection: "column",
					width: 288,
					maxWidth: "100%",
					userSelect: "none",
				}}
			>
				<For each={shownRunIds()}>
					{(id: number) => (
						<FluidHighlight
							rect={runRect(id)}
							session={() => 0}
							fadeIn={false}
							radius={props.role === "radiogroup" ? shape.bg : shape.mergedBg}
							background={color.active}
							glide={tween.moderate}
							fade={tween.moderateExit}
						/>
					)}
				</For>
				<FluidHighlight
					rect={rectOf(hover.activeIndex())}
					session={hover.session}
					radius={shape.bg}
					background={color.hover}
				/>
				<FocusRing
					ring={focusRing}
					radius={shape.focusRing}
					testId={props.testId && `${props.testId}-focus-ring`}
				/>
				{props.children}
			</div>
		</ChoiceContext.Provider>
	);
}

export function ChoiceRow(props: {
	index: number;
	label: string;
	role: "checkbox" | "radio";
	checked: boolean;
	/** Whether Tab stops here. Checkboxes always do; a radio group only on its selected row. */
	tabbable: boolean;
	onActivate: () => void;
	testId?: string;
	/** The indicator beside the label; `active` is hover or focus, `size` the group's. */
	indicator: (
		active: Accessor<boolean>,
		size: Accessor<ChoiceSize>,
	) => JSX.Element;
}) {
	const context = useChoice();
	const size = () => ROW[context.size()];
	const active = () => context.hover.activeIndex() === props.index;
	let element: HostElement | undefined;

	createEffect(() => {
		if (element === undefined) throw new Error("Row is not mounted");
		context.hover.registerItem(props.index, element);
		context.registerRow(props.index, {
			element,
			activate: props.onActivate,
		});
	});

	// No `isHeld` guard: as in FF, a held arrow keeps walking and a held Space or Enter repeats.
	const onKeyDown = (event: KeyEvent) => {
		switch (event.key) {
			case " ":
			case "Enter":
				event.preventDefault();
				props.onActivate();
				return;
			case "ArrowDown":
				context.focusFrom(props.index, 1);
				return;
			case "ArrowUp":
				context.focusFrom(props.index, -1);
				return;
			case "ArrowRight":
				if (context.arrowsSelect) context.focusFrom(props.index, 1);
				return;
			case "ArrowLeft":
				if (context.arrowsSelect) context.focusFrom(props.index, -1);
				return;
			case "Home":
				context.focusFrom(props.index, "first");
				return;
			case "End":
				context.focusFrom(props.index, "last");
				return;
		}
	};

	return (
		<div
			testId={props.testId}
			id={createUniqueId()}
			role={props.role}
			aria-label={props.label}
			aria-checked={props.checked}
			ref={(row) => {
				element = row;
			}}
			tabIndex={props.tabbable ? 0 : -1}
			onClick={props.onActivate}
			onKeyDown={onKeyDown}
			onFocus={(event: DomEvent) => {
				context.hover.setActiveIndex(props.index);
				context.focusRing.focus(props.index, event);
			}}
			onBlur={() => {
				context.focusRing.blur(props.index);
				if (context.hover.activeIndex() === props.index) {
					context.hover.setActiveIndex(null);
				}
			}}
			style={{
				position: "relative",
				zIndex: 10,
				height: size().height,
				flexShrink: 0,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: size().gap,
				paddingLeft: size().padX,
				paddingRight: size().padX,
				borderRadius: shape.item,
				cursor: "pointer",
				keyboardFocusDim: false,
			}}
		>
			{props.indicator(active, context.size)}
			<StableLabel
				text={props.label}
				heavy={props.checked}
				fade
				color={
					props.checked || active() ? color.foreground : color.mutedForeground
				}
				textStyle={size().text}
			/>
		</div>
	);
}

/** The indicator's border: `--border` at rest, neutral-400 (neutral-500 dark) on hover or focus, transparent once selected. It eases over 80 ms: spread `indicatorFade` on the same element. */
export function indicatorBorder(selected: boolean, active: boolean) {
	if (selected) return color.transparent;
	if (!active) return color.border;
	return color.borderStrong;
}

/** The source's `transition-all duration-80` on the indicator: the border colour is the one property that changes. */
export const indicatorFade = fade(["border-color"], 80);
