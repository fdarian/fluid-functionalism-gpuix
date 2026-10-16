import { createSignal, For } from 'solid-js';
import { RadioGroup, RadioItem } from '#/components/radio-group';
import type { DemoModule } from '#/lib/demo';
import { DemoCard, DemoRow } from '#/lib/demo-kit';
import { color, type as scale } from '#/lib/theme';

const OPTIONS = ['Option A', 'Option B', 'Option C'];

function ByIndex(props: { testId: string; size?: 'default' | 'compact' }) {
	const [selected, setSelected] = createSignal(0);
	return (
		<RadioGroup
			testId={props.testId}
			selectedIndex={selected()}
			size={props.size}
		>
			<For each={OPTIONS}>
				{(label: string, index) => (
					<RadioItem
						testId={`${props.testId}-${index()}`}
						index={index()}
						label={label}
						selected={selected() === index()}
						onSelect={() => setSelected(index())}
					/>
				)}
			</For>
		</RadioGroup>
	);
}

function ByValue(props: { testId: string }) {
	const [plan, setPlan] = createSignal<string | undefined>(undefined);
	return (
		<>
			<RadioGroup testId={props.testId} value={plan()} onValueChange={setPlan}>
				<For each={['free', 'pro', 'team']}>
					{(value: string, index) => (
						<RadioItem
							testId={`${props.testId}-${index()}`}
							index={index()}
							label={`${value[0].toUpperCase()}${value.slice(1)} plan`}
							value={value}
						/>
					)}
				</For>
			</RadioGroup>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{`Plan: ${plan() ?? 'none'}`}
			</text>
		</>
	);
}

/** The bento preview's rows and default (`app/components/demo-data.ts:107-115`). */
const SPRINGS = [
	{ value: 'fast', label: 'Fast spring' },
	{ value: 'moderate', label: 'Moderate spring' },
	{ value: 'slow', label: 'Slow spring' },
	{ value: 'comfortable', label: 'Comfortable' },
	{ value: 'none', label: 'No animation' },
];

function NarrowByValue(props: { testId: string }) {
	const [spring, setSpring] = createSignal('moderate');
	return (
		<div style={{ display: 'flex', flexDirection: 'column', width: 220 }}>
			<RadioGroup
				testId={props.testId}
				value={spring()}
				onValueChange={setSpring}
			>
				<For each={SPRINGS}>
					{(item: (typeof SPRINGS)[number], index) => (
						<RadioItem
							testId={`${props.testId}-${index()}`}
							index={index()}
							label={item.label}
							value={item.value}
						/>
					)}
				</For>
			</RadioGroup>
		</div>
	);
}

/** Only the per-item API: no `value` or `selectedIndex`, so FF paints no selected background. */
function PerItem(props: { testId: string }) {
	const [selected, setSelected] = createSignal(1);
	return (
		<RadioGroup testId={props.testId}>
			<For each={OPTIONS}>
				{(label: string, index) => (
					<RadioItem
						testId={`${props.testId}-${index()}`}
						index={index()}
						label={label}
						selected={selected() === index()}
						onSelect={() => setSelected(index())}
					/>
				)}
			</For>
		</RadioGroup>
	);
}

export const title = 'RadioGroup';
export const group = 'Components';
export const listed = 'sidebar';

export function Demo() {
	return (
		<DemoCard title="RadioGroup">
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<DemoRow label="Default">
					<ByIndex testId="radio" />
				</DemoRow>
				<DemoRow label="Compact">
					<ByIndex testId="small" size="compact" />
				</DemoRow>
				<DemoRow label="Per item">
					<PerItem testId="item" />
				</DemoRow>
				<DemoRow label="By value">
					<ByValue testId="plan" />
				</DemoRow>
				<DemoRow label="Narrow, default">
					<NarrowByValue testId="narrow" />
				</DemoRow>
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	await shot.hover('radio-1');
	shot.capture('hover');
	await shot.click('radio-2');
	await shot.moveTo(1180, 700);
	shot.capture('selected');
	await shot.click('radio-0');
	await shot.press('ArrowDown');
	shot.capture('keyboard-moved');
	await shot.press('ArrowDown ArrowDown');
	shot.capture('keyboard-wrapped');
	await shot.click('plan-1');
	await shot.moveTo(1180, 700);
	shot.capture('by-value');
	// Arrows select and wrap, Home / End jump; a re-press of the selected plan keeps it.
	await shot.press('ArrowDown');
	shot.expectText('Plan: team', true);
	await shot.press('ArrowDown');
	shot.expectText('Plan: free', true);
	await shot.press('End');
	shot.expectText('Plan: team', true);
	await shot.press('Home');
	shot.expectText('Plan: free', true);
	await shot.press('ArrowLeft');
	shot.expectText('Plan: team', true);
	shot.capture('by-value-keys');
	shot.expectAria('plan-0', { role: 'RadioButton', toggled: 'False' });
	shot.expectAria('plan-2', { toggled: 'True' });
	// The narrow group starts on "Moderate spring"; a click moves the fill, and the fill shows the 220px width.
	shot.expectAria('narrow-1', { toggled: 'True' });
	await shot.click('narrow-3');
	shot.expectAria('narrow-3', { toggled: 'True' });
	shot.capture('narrow-selected');
};
