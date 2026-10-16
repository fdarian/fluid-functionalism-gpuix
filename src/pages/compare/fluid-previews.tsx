import { createSignal, For, type JSX } from 'solid-js';
import {
	AccordionContent,
	AccordionGroup,
	AccordionItem,
	AccordionTrigger,
} from '#/components/accordion';
import { CheckboxGroup, CheckboxItem } from '#/components/checkbox-group';
import { Dropdown, MenuItem } from '#/components/dropdown';
import { InputField, InputGroup } from '#/components/input-group';
import { RadioGroup, RadioItem } from '#/components/radio-group';
import { Slider } from '#/components/slider';
import { Switch } from '#/components/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#/components/table';
import { TabItem, Tabs, TabsList } from '#/components/tabs';
import { TabsSubtle, TabsSubtleItem } from '#/components/tabs-subtle';
import { color, siteType, weight } from '#/lib/theme';
import {
	ACCORDION_ITEMS,
	CHECKBOX_ITEMS,
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

/** `w-full max-w-[N]`, a column. */
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
		<Column maxWidth={420} alignItems="center">
			<AccordionGroup type="single" defaultValue="item-1" testId="fl-accordion">
				<For each={ACCORDION_ITEMS}>
					{(item) => (
						<AccordionItem value={item.value}>
							<AccordionTrigger testId={`fl-accordion-${item.value}`}>
								{item.title}
							</AccordionTrigger>
							<AccordionContent>{item.content}</AccordionContent>
						</AccordionItem>
					)}
				</For>
			</AccordionGroup>
		</Column>
	);
}

function CheckboxPreview() {
	const [checked, setChecked] = createSignal<ReadonlySet<number>>(new Set());
	const toggle = (index: number) => {
		const next = new Set(checked());
		if (next.has(index)) next.delete(index);
		else next.add(index);
		setChecked(next);
	};
	return (
		<Column maxWidth={220}>
			<CheckboxGroup checkedIndices={checked()} testId="fl-checkbox">
				<For each={CHECKBOX_ITEMS}>
					{(item, index) => (
						<CheckboxItem
							testId={`fl-checkbox-${item.id}`}
							index={index()}
							label={item.label}
							checked={checked().has(index())}
							onToggle={() => toggle(index())}
						/>
					)}
				</For>
			</CheckboxGroup>
		</Column>
	);
}

function DropdownPreview() {
	const [selected, setSelected] = createSignal<number | null>(0);
	return (
		<Column maxWidth={280}>
			<Dropdown testId="fl-dropdown" checkedIndex={selected() ?? undefined}>
				<For each={DROPDOWN_ITEMS}>
					{(item, index) => (
						<MenuItem
							testId={`fl-dropdown-${item.value}`}
							index={index()}
							icon={item.icon}
							label={item.label}
							checked={selected() === index()}
							onSelect={() =>
								setSelected(selected() === index() ? null : index())
							}
						/>
					)}
				</For>
			</Dropdown>
		</Column>
	);
}

function InputGroupPreview() {
	const [values, setValues] = createSignal<Record<string, string>>({});
	return (
		<Column maxWidth={320} alignItems="center">
			<InputGroup>
				<For each={INPUT_FIELDS}>
					{(field, index) => (
						<InputField
							testId={`fl-${field.key}`}
							index={index()}
							label={field.label}
							placeholder={field.placeholder}
							value={values()[field.key] ?? ''}
							onChange={(next) => setValues({ ...values(), [field.key]: next })}
						/>
					)}
				</For>
			</InputGroup>
		</Column>
	);
}

function RadioGroupPreview() {
	const [value, setValue] = createSignal<string>(RADIO_DEFAULT);
	return (
		<Column maxWidth={220}>
			<RadioGroup testId="fl-radio" value={value()} onValueChange={setValue}>
				<For each={RADIO_ITEMS}>
					{(item, index) => (
						<RadioItem
							testId={`fl-radio-${item.value}`}
							value={item.value}
							index={index()}
							label={item.label}
						/>
					)}
				</For>
			</RadioGroup>
		</Column>
	);
}

function SliderPreview() {
	const [basic, setBasic] = createSignal<number>(SLIDER_OPACITY.initial);
	const [volume, setVolume] = createSignal<number>(SLIDER_VOLUME.initial);
	const readout = () => ({
		...siteType.body,
		fontWeight: weight.normal,
		color: color.mutedForeground,
	});
	return (
		<Column maxWidth={280} gap={32}>
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
					<text style={readout()}>{SLIDER_OPACITY.label}</text>
					<text style={{ ...readout(), fontVariantNumeric: 'tabular-nums' }}>
						{String(basic())}
					</text>
				</div>
				<Slider
					testId="fl-slider-opacity"
					value={basic()}
					onChange={(next) => {
						if (typeof next !== 'number') {
							throw new Error('A single-thumb slider reported a range');
						}
						setBasic(next);
					}}
					showValue={false}
				/>
			</div>
			<Slider
				testId="fl-slider-volume"
				variant="scrubber"
				label={SLIDER_VOLUME.label}
				value={volume()}
				onChange={(next) => {
					if (typeof next !== 'number') {
						throw new Error('A single-thumb slider reported a range');
					}
					setVolume(next);
				}}
				min={0}
				max={100}
				formatValue={(v) => `${v}%`}
			/>
		</Column>
	);
}

function SwitchPreview() {
	const [on, setOn] = createSignal<ReadonlySet<string>>(
		new Set(SWITCH_ITEMS.filter((item) => item.initial).map((item) => item.id)),
	);
	const toggle = (id: string) => {
		const next = new Set(on());
		if (next.has(id)) next.delete(id);
		else next.add(id);
		setOn(next);
	};
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<For each={SWITCH_ITEMS}>
				{(item) => (
					<Switch
						testId={`fl-switch-${item.id}`}
						label={item.label}
						checked={on().has(item.id)}
						onToggle={() => toggle(item.id)}
					/>
				)}
			</For>
		</div>
	);
}

function TablePreview() {
	return (
		<Column maxWidth={420}>
			<Table testId="fl-table">
				<TableHeader>
					<TableRow>
						<For each={TABLE_COLUMNS}>
							{(column) => <TableHead>{column}</TableHead>}
						</For>
					</TableRow>
				</TableHeader>
				<TableBody>
					<For each={TABLE_ROWS}>
						{(row, index) => (
							<TableRow index={index()} testId={`fl-table-row-${index()}`}>
								<For each={row}>{(cell) => <TableCell>{cell}</TableCell>}</For>
							</TableRow>
						)}
					</For>
				</TableBody>
			</Table>
		</Column>
	);
}

function TabsPreview() {
	const [tab, setTab] = createSignal<string>(TABS_DEFAULT);
	return (
		<Column maxWidth={360}>
			<Tabs value={tab()} onValueChange={setTab}>
				<TabsList testId="fl-tabs">
					<For each={TABS_ITEMS}>
						{(item) => (
							<TabItem
								testId={`fl-tabs-${item.value}`}
								value={item.value}
								label={item.label}
							/>
						)}
					</For>
				</TabsList>
			</Tabs>
		</Column>
	);
}

const SUBTLE_TABS = [
	{ icon: 'home', label: 'Home' },
	{ icon: 'message-circle', label: 'Chat' },
	{ icon: 'inbox', label: 'Inbox' },
] as const;

function TabsSubtlePreview() {
	const [tab, setTab] = createSignal(0);
	// `w-fit mx-auto`: the tab list pins itself to the start of its parent.
	return (
		<div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
			<TabsSubtle
				testId="fl-tabs-subtle"
				idPrefix="compare-tabs"
				selectedIndex={tab()}
				onSelect={setTab}
				activeLabel
			>
				<For each={SUBTLE_TABS}>
					{(item, index) => (
						<TabsSubtleItem
							testId={`fl-tabs-subtle-${index()}`}
							index={index()}
							icon={item.icon}
							label={item.label}
						/>
					)}
				</For>
			</TabsSubtle>
		</div>
	);
}

/** The Fluid side of each slide: `bento-previews.tsx`' entry, or `compare-fluid-previews.tsx`' override. */
export const fluidPreviews: Record<string, () => JSX.Element> = {
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
