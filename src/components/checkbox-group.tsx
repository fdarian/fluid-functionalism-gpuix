import { createCheckboxRoot } from 'base-ui-solid-gpuix/checkbox';
import {
	type CheckboxGroup as CheckboxGroupState,
	createCheckboxGroup,
} from 'base-ui-solid-gpuix/checkbox-group';
import { createContext, type JSX, useContext } from 'solid-js';
import { CheckMark } from '#/lib/icon';
import { color } from '#/lib/theme';
import {
	ChoiceGroup,
	ChoiceRow,
	type ChoiceSize,
	createSelectionRuns,
	indicatorBorder,
	indicatorFade,
	ROW,
} from './choice-group';

const CHECK = 'M6 12L10 16L18 8';

const CheckboxContext = createContext<CheckboxGroupState>();

export function CheckboxGroup(props: {
	/** The whole checked set: the group merges contiguous checked rows into one background. */
	checkedIndices: ReadonlySet<number>;
	size?: ChoiceSize;
	testId?: string;
	children: JSX.Element;
}) {
	const runs = createSelectionRuns(() => [...props.checkedIndices]);
	const group = createCheckboxGroup();
	return (
		<CheckboxContext.Provider value={group}>
			<ChoiceGroup
				groupProps={group.groupProps}
				size={props.size}
				runs={runs}
				testId={props.testId}
			>
				{props.children}
			</ChoiceGroup>
		</CheckboxContext.Provider>
	);
}

/** The square and its check mark, sized from the group's step. */
function Checkbox(props: {
	checked: boolean;
	active: boolean;
	size: ChoiceSize;
	testId?: string;
}) {
	const box = () => ROW[props.size].box;
	const glyph = () => (props.size === 'compact' ? 16 : 18);
	const inset = () => (box() - glyph()) / 2;
	return (
		<div
			testId={props.testId}
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
					borderRadius: props.size === 'compact' ? 4 : 5,
					borderStyle: 'solid',
					borderWidth: 1.5,
					borderColor: indicatorBorder(props.checked, props.active),
					...indicatorFade,
				}}
			/>
			<div style={{ position: 'absolute', top: inset(), left: inset() }}>
				<CheckMark
					checked={props.checked}
					path={CHECK}
					size={glyph()}
					strokeWidth={2}
					color={color.foreground}
				/>
			</div>
		</div>
	);
}

export function CheckboxItem(props: {
	label: string;
	index: number;
	checked: boolean;
	onToggle: () => void;
	testId?: string;
}) {
	const group = useContext(CheckboxContext);
	if (group === undefined) {
		throw new Error('A CheckboxItem must be inside a CheckboxGroup');
	}
	const item = createCheckboxRoot(group, {
		index: props.index,
		label: () => props.label,
		checked: () => props.checked,
		onCheckedChange: () => props.onToggle(),
	});
	return (
		<ChoiceRow
			index={props.index}
			label={props.label}
			item={item}
			testId={props.testId}
			indicator={(active, size) => (
				<Checkbox
					checked={props.checked}
					active={active()}
					size={size()}
					testId={props.testId && `${props.testId}-box`}
				/>
			)}
		/>
	);
}
