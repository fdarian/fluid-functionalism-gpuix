import { AnimatePresence, motion } from "@gpuix/solid";
import {
	createContext,
	createMemo,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	useContext,
} from "solid-js";
import { color, sizeChoice, motion as tween } from "#/lib/theme";
import {
	ChoiceGroup,
	ChoiceRow,
	type ChoiceSize,
	indicatorBorder,
	indicatorFade,
	ROW,
} from "./choice-group";

/** The dot pops in from 30% of its size and shrinks back out over 40 ms. */
const DOT_FROM = 0.3;
const DOT_OUT = { duration: 0.04 } as const;

interface ItemEntry {
	value: string | undefined;
	selected: () => boolean | undefined;
}

interface RadioContextValue {
	/** Row index of the selected item, from whichever of the three selection APIs the group is using. */
	selectedIndex: () => number | undefined;
	value: () => string | undefined;
	onValueChange: ((value: string) => void) | undefined;
	size: () => ChoiceSize;
	register(index: number, entry: ItemEntry): void;
}

const RadioContext = createContext<RadioContextValue>();

function useRadio() {
	const context = useContext(RadioContext);
	if (context === undefined) {
		throw new Error("A RadioItem must be inside a RadioGroup");
	}
	return context;
}

/** Selection takes one of three APIs: `value` + `onValueChange` here, `selectedIndex` here, or `selected` + `onSelect` on each item. */
export function RadioGroup(props: {
	selectedIndex?: number;
	value?: string;
	onValueChange?: (value: string) => void;
	size?: ChoiceSize;
	testId?: string;
	children: JSX.Element;
}) {
	const [entries, setEntries] = createSignal<ReadonlyMap<number, ItemEntry>>(
		new Map(),
	);
	const selectedIndex = createMemo(() => {
		if (props.value !== undefined) {
			for (const [index, entry] of entries()) {
				if (entry.value === props.value) return index;
			}
			return undefined;
		}
		if (props.selectedIndex !== undefined) return props.selectedIndex;
		for (const [index, entry] of entries()) {
			if (entry.selected() === true) return index;
		}
		return undefined;
	});
	// FF paints the selected background only for the `value` and `selectedIndex` APIs; a group driven by per-item `selected` has none.
	const runs = createMemo(() => {
		const index =
			props.value !== undefined
				? selectedIndex()
				: props.selectedIndex;
		return index === undefined ? [] : [{ start: index, end: index, id: 0 }];
	});

	const context: RadioContextValue = {
		selectedIndex,
		value: () => props.value,
		get onValueChange() {
			return props.onValueChange;
		},
		size: () => props.size ?? sizeChoice(),
		register(index, entry) {
			setEntries(new Map(entries()).set(index, entry));
			onCleanup(() => {
				if (entries().get(index) !== entry) return;
				const next = new Map(entries());
				next.delete(index);
				setEntries(next);
			});
		},
	};

	return (
		<RadioContext.Provider value={context}>
			<ChoiceGroup
				role="radiogroup"
				size={props.size}
				runs={runs}
				arrowsSelect
				fadeOutRuns={false}
				testId={props.testId}
			>
				{props.children}
			</ChoiceGroup>
		</RadioContext.Provider>
	);
}

/** The circle and its dot. */
function Radio(props: { selected: boolean; active: boolean; size: ChoiceSize }) {
	const box = () => ROW[props.size].box;
	const dot = () => (props.size === "compact" ? 7 : 8);
	const dotAt = (size: number) => ({
		left: (box() - size) / 2,
		top: (box() - size) / 2,
		width: size,
		height: size,
	});
	return (
		<div
			style={{
				position: "relative",
				flexShrink: 0,
				width: box(),
				height: box(),
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: box() / 2,
					borderWidth: 1.5,
					borderColor: indicatorBorder(props.selected, props.active),
					...indicatorFade,
				}}
			/>
			<AnimatePresence initial={false}>
				<Show when={props.selected}>
					<motion.div
						initial={{ opacity: 0, ...dotAt(dot() * DOT_FROM) }}
						animate={{ opacity: 1, ...dotAt(dot()) }}
						exit={{ opacity: 0, ...dotAt(dot() * DOT_FROM) }}
						transition={props.selected ? tween.fast : DOT_OUT}
						style={{
							position: "absolute",
							borderRadius: 9999,
							backgroundColor: color.foreground,
						}}
					/>
				</Show>
			</AnimatePresence>
		</div>
	);
}

export function RadioItem(props: {
	label: string;
	index: number;
	selected?: boolean;
	onSelect?: () => void;
	value?: string;
	testId?: string;
}) {
	const radio = useRadio();
	radio.register(props.index, {
		value: props.value,
		selected: () => props.selected,
	});

	// Value equality decides when both the item and the group have a value; otherwise the item's own `selected` wins over the group's index.
	const isSelected = () => {
		const groupValue = radio.value();
		if (props.value !== undefined && groupValue !== undefined) {
			return groupValue === props.value;
		}
		return props.selected ?? radio.selectedIndex() === props.index;
	};
	// Roving tabindex: the selected row is the tab stop; with no selection the first takes it so the group stays reachable by keyboard.
	const tabbable = () => {
		const selected = radio.selectedIndex();
		return selected === undefined ? props.index === 0 : isSelected();
	};
	const select = () => {
		if (props.value !== undefined) radio.onValueChange?.(props.value);
		props.onSelect?.();
	};

	return (
		<ChoiceRow
			index={props.index}
			label={props.label}
			role="radio"
			checked={isSelected()}
			tabbable={tabbable()}
			onActivate={select}
			testId={props.testId}
			indicator={(active) => (
				<Radio
					selected={isSelected()}
					active={active()}
					size={radio.size()}
				/>
			)}
		/>
	);
}
