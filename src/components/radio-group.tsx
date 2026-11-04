import { AnimatePresence, motion } from '@ghia/solid';
import { createRadioRoot } from 'ghia-base-ui/radio';
import {
	createRadioGroup,
	type RadioGroup as RadioGroupState,
} from 'ghia-base-ui/radio-group';
import {
	createContext,
	createMemo,
	type JSX,
	Show,
	useContext,
} from 'solid-js';
import { color, sizeChoice, motion as tween } from '#/lib/theme';
import {
	ChoiceGroup,
	ChoiceRow,
	type ChoiceSize,
	indicatorBorder,
	indicatorFade,
	ROW,
} from './choice-group';

/** The dot pops in from 30% of its size and shrinks back out over 40 ms. */
const DOT_FROM = 0.3;
const DOT_OUT = { duration: 0.04 } as const;

interface RadioContextValue {
	group: RadioGroupState;
	size: () => ChoiceSize;
}

const RadioContext = createContext<RadioContextValue>();

function useRadio() {
	const context = useContext(RadioContext);
	if (context === undefined) {
		throw new Error('A RadioItem must be inside a RadioGroup');
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
	const group = createRadioGroup({
		value: () => props.value,
		selectedIndex: () => props.selectedIndex,
		onValueChange: (value) => props.onValueChange?.(value),
	});
	// FF paints the selected background only for the `value` and `selectedIndex` APIs; a group driven by per-item `selected` has none.
	const runs = createMemo(() => {
		const index =
			props.value !== undefined ? group.selectedIndex() : props.selectedIndex;
		return index === undefined ? [] : [{ start: index, end: index, id: 0 }];
	});

	const context: RadioContextValue = {
		group,
		size: () => props.size ?? sizeChoice(),
	};

	return (
		<RadioContext.Provider value={context}>
			<ChoiceGroup
				groupProps={group.groupProps}
				size={props.size}
				runs={runs}
				fadeOutRuns={false}
				testId={props.testId}
			>
				{props.children}
			</ChoiceGroup>
		</RadioContext.Provider>
	);
}

function RadioDot(props: { size: number; testId?: string }) {
	return (
		<motion.div
			testId={props.testId}
			initial={{ opacity: 0, scale: DOT_FROM }}
			animate={{ opacity: 1, scale: 1 }}
			exit={{ opacity: 0, scale: DOT_FROM, transition: DOT_OUT }}
			transition={tween.fast}
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<div
				style={{
					width: props.size,
					height: props.size,
					borderRadius: 9999,
					backgroundColor: color.foreground,
				}}
			/>
		</motion.div>
	);
}

/** The circle and its dot. */
function Radio(props: {
	selected: boolean;
	active: boolean;
	size: ChoiceSize;
	testId?: string;
}) {
	const box = () => ROW[props.size].box;
	const dot = () => (props.size === 'compact' ? 7 : 8);
	return (
		<div
			style={{
				position: 'relative',
				flexShrink: 0,
				width: box(),
				height: box(),
			}}
		>
			<div
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					borderRadius: box() / 2,
					borderStyle: 'solid',
					borderWidth: 1.5,
					borderColor: indicatorBorder(props.selected, props.active),
					...indicatorFade,
				}}
			/>
			<AnimatePresence initial={false}>
				<Show when={props.selected}>
					<RadioDot size={dot()} testId={props.testId} />
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
	const item = createRadioRoot(radio.group, {
		index: props.index,
		label: () => props.label,
		value: () => props.value,
		selected: () => props.selected,
		onSelect: () => props.onSelect?.(),
	});

	return (
		<ChoiceRow
			index={props.index}
			label={props.label}
			item={item}
			testId={props.testId}
			indicator={(active) => (
				<Radio
					selected={item.checked()}
					active={active()}
					size={radio.size()}
					testId={
						props.testId === undefined ? undefined : `${props.testId}-dot`
					}
				/>
			)}
		/>
	);
}
