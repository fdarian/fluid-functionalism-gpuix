import { createSignal, For, type JSX } from 'solid-js';
import { weight } from '#/lib/theme';
import { ScAccordion } from '#/pages/compare/shadcn/accordion';
import { ScCheckbox } from '#/pages/compare/shadcn/checkbox';
import { ScDropdownMenu } from '#/pages/compare/shadcn/dropdown-menu';
import { ScInputField } from '#/pages/compare/shadcn/input';
import { ScRadioGroup } from '#/pages/compare/shadcn/radio-group';
import { ScSlider } from '#/pages/compare/shadcn/slider';
import { ScSwitch } from '#/pages/compare/shadcn/switch';
import { ScTable } from '#/pages/compare/shadcn/table';
import { ScTabs } from '#/pages/compare/shadcn/tabs';
import { sc } from '#/pages/compare/shadcn/theme';
import {
	ACCORDION_ITEMS,
	CHECKBOX_ITEMS,
	DROPDOWN_DEFAULT,
	DROPDOWN_ITEMS,
	INPUT_FIELDS,
	RADIO_DEFAULT,
	RADIO_ITEMS,
	SLIDER_OPACITY,
	SLIDER_VOLUME,
	SWITCH_ITEMS,
	TABLE_COLUMNS,
	TABLE_ROWS,
	TABS_DEFAULT,
	TABS_ITEMS,
} from './data';

function toggled(set: ReadonlySet<string>, id: string, on: boolean) {
	const next = new Set(set);
	if (on) next.add(id);
	else next.delete(id);
	return next;
}

/** `w-full max-w-[N] mx-auto`, a column. */
function Column(props: {
	maxWidth: number;
	gap?: number;
	alignItems?: 'center';
	children: JSX.Element;
}) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: props.alignItems,
				width: '100%',
				maxWidth: props.maxWidth,
				gap: props.gap,
			}}
		>
			{props.children}
		</div>
	);
}

function AccordionPreview() {
	return (
		<Column maxWidth={420}>
			<ScAccordion
				testId="sc-accordion"
				items={ACCORDION_ITEMS}
				defaultValue="item-1"
			/>
		</Column>
	);
}

function CheckboxPreview() {
	const [checked, setChecked] = createSignal<ReadonlySet<string>>(new Set());
	return (
		<Column maxWidth={220} gap={10}>
			<For each={CHECKBOX_ITEMS}>
				{(item) => (
					<ScCheckbox
						testId={`sc-checkbox-${item.id}`}
						label={item.label}
						checked={checked().has(item.id)}
						onCheckedChange={(on) =>
							setChecked(toggled(checked(), item.id, on))
						}
					/>
				)}
			</For>
		</Column>
	);
}

function DropdownPreview() {
	const [value, setValue] = createSignal(DROPDOWN_DEFAULT);
	return (
		<Column maxWidth={420}>
			<ScDropdownMenu
				testId="sc-dropdown"
				items={DROPDOWN_ITEMS}
				value={value()}
				onValueChange={setValue}
			/>
		</Column>
	);
}

function InputGroupPreview() {
	const [values, setValues] = createSignal<Record<string, string>>({});
	return (
		<Column maxWidth={320} gap={12}>
			<For each={INPUT_FIELDS}>
				{(field) => (
					<ScInputField
						testId={`sc-${field.key}`}
						label={field.label}
						placeholder={field.placeholder}
						value={values()[field.key] ?? ''}
						onChange={(next) => setValues({ ...values(), [field.key]: next })}
					/>
				)}
			</For>
		</Column>
	);
}

function RadioGroupPreview() {
	const [value, setValue] = createSignal<string>(RADIO_DEFAULT);
	return (
		<Column maxWidth={220}>
			<ScRadioGroup
				testId="sc-radio"
				items={RADIO_ITEMS}
				value={value()}
				onValueChange={setValue}
			/>
		</Column>
	);
}

function SliderRow(props: {
	label: string;
	value: number;
	readout: string;
	onValueChange: (value: number) => void;
	testId: string;
}) {
	const text = () => ({
		fontSize: 13,
		lineHeight: '19.5px',
		fontWeight: weight.normal,
		color: sc.mutedForeground,
	});
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				width: '100%',
			}}
		>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<text style={text()}>{props.label}</text>
				<text style={{ ...text(), fontVariantNumeric: 'tabular-nums' }}>
					{props.readout}
				</text>
			</div>
			<ScSlider
				testId={props.testId}
				value={props.value}
				onValueChange={props.onValueChange}
			/>
		</div>
	);
}

function SliderPreview() {
	const [basic, setBasic] = createSignal<number>(SLIDER_OPACITY.initial);
	const [volume, setVolume] = createSignal<number>(SLIDER_VOLUME.initial);
	return (
		<Column maxWidth={280} gap={32}>
			<SliderRow
				testId="sc-slider-opacity"
				label={SLIDER_OPACITY.label}
				value={basic()}
				readout={String(basic())}
				onValueChange={setBasic}
			/>
			<SliderRow
				testId="sc-slider-volume"
				label={SLIDER_VOLUME.label}
				value={volume()}
				readout={`${volume()}%`}
				onValueChange={setVolume}
			/>
		</Column>
	);
}

function SwitchPreview() {
	const [on, setOn] = createSignal<ReadonlySet<string>>(
		new Set(SWITCH_ITEMS.filter((item) => item.initial).map((item) => item.id)),
	);
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<For each={SWITCH_ITEMS}>
				{(item) => (
					<ScSwitch
						testId={`sc-switch-${item.id}`}
						label={item.label}
						checked={on().has(item.id)}
						onCheckedChange={(next) => setOn(toggled(on(), item.id, next))}
					/>
				)}
			</For>
		</div>
	);
}

function TablePreview() {
	return (
		<Column maxWidth={420}>
			<ScTable testId="sc-table" columns={TABLE_COLUMNS} rows={TABLE_ROWS} />
		</Column>
	);
}

function TabsPreview() {
	const [tab, setTab] = createSignal<string>(TABS_DEFAULT);
	return (
		<Column maxWidth={360} alignItems="center">
			<ScTabs
				testId="sc-tabs"
				items={TABS_ITEMS}
				value={tab()}
				onValueChange={setTab}
			/>
		</Column>
	);
}

const SUBTLE_TABS = [
	{ value: 'library', label: 'Library' },
	{ value: 'recents', label: 'Recents' },
	{ value: 'favorites', label: 'Favorites' },
];

function TabsSubtlePreview() {
	const [tab, setTab] = createSignal('library');
	return (
		<Column maxWidth={360} alignItems="center">
			<ScTabs
				testId="sc-tabs-subtle"
				items={SUBTLE_TABS}
				value={tab()}
				onValueChange={setTab}
			/>
		</Column>
	);
}

/** `shadcnPreviewMap`, for the slides the page shows. */
export const shadcnPreviews: Record<string, () => JSX.Element> = {
	dropdown: DropdownPreview,
	'checkbox-group': CheckboxPreview,
	accordion: AccordionPreview,
	tabs: TabsPreview,
	'radio-group': RadioGroupPreview,
	slider: SliderPreview,
	'input-group': InputGroupPreview,
	switch: SwitchPreview,
	table: TablePreview,
	'tabs-subtle': TabsSubtlePreview,
};
