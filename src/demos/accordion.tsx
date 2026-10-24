import { createSignal, type JSX, Show } from 'solid-js';
import {
	Accordion,
	AccordionContent,
	AccordionGroup,
	AccordionItem,
	AccordionTrigger,
} from '#/components/accordion';
import type { DemoModule, ShotContext } from '#/lib/demo';
import { DemoCard, scrollNearTop } from '#/lib/demo-kit';
import {
	PlayField,
	PlaygroundLayout,
	PlaygroundPanel,
	PlaySelect,
	PlaySwitch,
	pick,
} from '#/lib/playground';
import { color, type as scale } from '#/lib/theme';

function Section(props: { caption: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				flexBasis: 0,
				flexGrow: 1,
				minWidth: 0,
				gap: 8,
			}}
		>
			<text style={{ ...scale.caption, color: color.mutedForeground }}>
				{props.caption}
			</text>
			{props.children}
		</div>
	);
}

function Row(props: { children: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'flex-start',
				gap: 16,
			}}
		>
			{props.children}
		</div>
	);
}

export const title = 'Accordion';
export const group = 'Components';
export const listed = 'sidebar';

const PLAY_ITEMS = [
	{
		value: 'item-1',
		title: 'What is Fluid Functionalism?',
		content:
			'A design philosophy where every animation serves a functional purpose — motion is information, not decoration.',
	},
	{
		value: 'item-2',
		title: 'How does fluid hover work?',
		content:
			'The closest item to your cursor is highlighted before you click, reducing targeting errors.',
	},
	{
		value: 'item-3',
		title: 'Why spring physics?',
		content:
			'Springs respond naturally to interruption — if a user reverses mid-transition, the animation adapts.',
	},
	{
		value: 'item-4',
		title: 'Is it compatible with shadcn/ui?',
		content:
			'Yes. Your existing theme, radius tokens, and setup apply automatically.',
	},
] as const;

/** `one` keeps exactly one open, `oneOrNone` is single and collapsible, `any` is multiple. */
type Expand = 'one' | 'oneOrNone' | 'any';

const EXPAND_OPTIONS = [
	{ value: 'one', label: 'One at a time' },
	{ value: 'oneOrNone', label: 'One or none' },
	{ value: 'any', label: 'Any number' },
] as const;

function Playground() {
	const [expand, setExpand] = createSignal<Expand>('oneOrNone');
	const [highlightExpanded, setHighlightExpanded] = createSignal(true);
	const first = PLAY_ITEMS[0].value;
	// A group's value is controlled so "One at a time" can refuse the close of the open item, which Base UI's single mode always allows.
	const [single, setSingle] = createSignal<string>(first);
	const [multiple, setMultiple] = createSignal<string[]>([first]);

	const changeExpand = (next: Expand) => {
		setSingle(first);
		setMultiple([first]);
		setExpand(next);
	};
	const shuffle = () => {
		changeExpand(pick(['one', 'oneOrNone', 'oneOrNone', 'any'] as const));
		setHighlightExpanded(Math.random() > 0.4);
	};

	const items = () =>
		PLAY_ITEMS.map((item) => (
			<AccordionItem value={item.value}>
				<AccordionTrigger testId={`play-${item.value}`}>
					{item.title}
				</AccordionTrigger>
				<AccordionContent>{item.content}</AccordionContent>
			</AccordionItem>
		));
	const highlight = () => (highlightExpanded() ? 'item' : 'trigger');

	return (
		<PlaygroundLayout
			preview={
				<div style={{ width: 288, paddingTop: 20 }}>
					<Show
						when={expand() === 'any'}
						fallback={
							<AccordionGroup
								type="single"
								highlight={highlight()}
								value={single()}
								onValueChange={(next) => {
									if (next === '' && expand() === 'one') return;
									setSingle(next);
								}}
							>
								{items()}
							</AccordionGroup>
						}
					>
						<AccordionGroup
							type="multiple"
							highlight={highlight()}
							value={multiple()}
							onValueChange={setMultiple}
						>
							{items()}
						</AccordionGroup>
					</Show>
				</div>
			}
			controls={
				<PlaygroundPanel onShuffle={shuffle}>
					<PlayField label="Expand">
						<PlaySelect
							testId="play-expand"
							value={expand()}
							onChange={changeExpand}
							options={EXPAND_OPTIONS}
						/>
					</PlayField>
					<PlaySwitch
						testId="play-highlight"
						label="Highlight expanded"
						checked={highlightExpanded()}
						onToggle={() => setHighlightExpanded(!highlightExpanded())}
					/>
				</PlaygroundPanel>
			}
		/>
	);
}

export function Demo() {
	return (
		<>
			<Playground />
			<DemoCard title="Accordion">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
					<Row>
						<Section caption="Standalone: its own hover state">
							<Accordion type="single" defaultValue="item-1">
								<AccordionItem value="item-1">
									<AccordionTrigger testId="standalone-trigger">
										What is this component?
									</AccordionTrigger>
									<AccordionContent>
										A collapsible accordion with animated expand/collapse and
										spring-animated chevron.
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						</Section>
						<Section caption='highlight="trigger": the tint waits for hover'>
							<AccordionGroup
								type="single"
								defaultValue="item-1"
								highlight="trigger"
							>
								<AccordionItem value="item-1">
									<AccordionTrigger testId="row-1">
										Expanded, but not tinted
									</AccordionTrigger>
									<AccordionContent>
										The panel reads as part of the page rather than a filled
										block.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-2">
									<AccordionTrigger testId="row-2">
										Hover any row
									</AccordionTrigger>
									<AccordionContent>
										The fill follows your cursor instead of marking a state.
									</AccordionContent>
								</AccordionItem>
							</AccordionGroup>
						</Section>
					</Row>
					<Row>
						<Section caption="Single expand">
							<AccordionGroup
								type="single"
								defaultValue="item-1"
								testId="single"
							>
								<AccordionItem value="item-1">
									<AccordionTrigger testId="single-1">
										Getting Started
									</AccordionTrigger>
									<AccordionContent>
										Install the component and import it into your project. The
										accordion supports both single and multiple expand modes.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-2">
									<AccordionTrigger testId="single-2">Styling</AccordionTrigger>
									<AccordionContent>
										The component integrates with the shape system for pill or
										rounded border-radius variants. All animations use spring
										physics.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-3">
									<AccordionTrigger testId="single-3">
										Accessibility
									</AccordionTrigger>
									<AccordionContent>
										Built on Radix UI or Base UI Accordion (your pick) with
										WAI-ARIA attributes, keyboard navigation, and focus
										management.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-4">
									<AccordionTrigger testId="single-4">
										Animation
									</AccordionTrigger>
									<AccordionContent>
										Smooth height transitions and spring-animated chevron
										rotation. The fluid hover background tracks your cursor.
									</AccordionContent>
								</AccordionItem>
							</AccordionGroup>
						</Section>
						<Section caption="Multi expand">
							<AccordionGroup
								type="multiple"
								defaultValue={['item-1', 'item-3']}
							>
								<AccordionItem value="item-1">
									<AccordionTrigger testId="multi-1">
										First Section
									</AccordionTrigger>
									<AccordionContent>
										Multiple items can be expanded at the same time.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-2">
									<AccordionTrigger testId="multi-2">
										Second Section
									</AccordionTrigger>
									<AccordionContent>
										Click any trigger to expand or collapse independently.
									</AccordionContent>
								</AccordionItem>
								<AccordionItem value="item-3">
									<AccordionTrigger testId="multi-3">
										Third Section
									</AccordionTrigger>
									<AccordionContent>
										Each item operates independently in multiple mode.
									</AccordionContent>
								</AccordionItem>
							</AccordionGroup>
						</Section>
					</Row>
					<Row>
						<Section caption="Keyboard: Tab reaches each trigger, a disabled item stays shut">
							<AccordionGroup type="multiple" testId="kb">
								<AccordionItem value="alpha">
									<AccordionTrigger testId="kb-1">Alpha</AccordionTrigger>
									<AccordionContent>Alpha body</AccordionContent>
								</AccordionItem>
								<AccordionItem value="beta">
									<AccordionTrigger testId="kb-2">Beta</AccordionTrigger>
									<AccordionContent>Beta body</AccordionContent>
								</AccordionItem>
								<AccordionItem value="gamma" disabled>
									<AccordionTrigger testId="kb-3">
										Gamma (disabled)
									</AccordionTrigger>
									<AccordionContent>Gamma body</AccordionContent>
								</AccordionItem>
							</AccordionGroup>
						</Section>
					</Row>
				</div>
			</DemoCard>
		</>
	);
}

/** Opens the Expand select from the keyboard and walks `steps` rows. */
async function pickExpand(shot: ShotContext, steps: string) {
	await shot.focus('play-expand-trigger');
	await shot.press(`ArrowDown ${steps} Enter`);
	await shot.settle(300);
}

export const scenarios: DemoModule['scenarios'] = async (shot) => {
	// The playground's controls sit in the right column.
	shot.capture('playground');
	await pickExpand(shot, 'ArrowDown');
	await shot.click('play-item-2');
	shot.expectAccessibleText(PLAY_ITEMS[1].content, true);
	shot.expectAccessibleText(PLAY_ITEMS[0].content, true);
	await shot.click('play-highlight-track');
	shot.capture('playground-any-trigger-highlight');
	await pickExpand(shot, 'ArrowUp ArrowUp');
	await shot.click('play-item-1');
	shot.expectAccessibleText(PLAY_ITEMS[0].content, true);
	await shot.click('play-item-1');
	shot.expectAccessibleText(PLAY_ITEMS[0].content, true);
	await shot.click('play-item-3');
	await shot.settle(300);
	shot.expectAccessibleText(PLAY_ITEMS[0].content, false);
	shot.capture('playground-one-at-a-time');
	await shot.click('playground-shuffle');
	shot.capture('playground-shuffled');

	await scrollNearTop(shot, 'single-2');
	await shot.hover('single-2');
	shot.capture('hover-closed-row');
	await shot.click('single-2');
	shot.capture('opened-second');
	await shot.hover('multi-2');
	shot.capture('multi-hover');
	await shot.click('multi-2');
	shot.capture('multi-opened');
	await shot.hover('row-1');
	shot.capture('trigger-highlight-hover-open');
	await shot.click('standalone-trigger');
	shot.capture('standalone-closed');
	await shot.click('single-1');
	await shot.moveTo(1180, 700);
	await shot.press('ArrowDown');
	shot.capture('keyboard-focus');

	// Closed panels go display: none once their exit is over: the text stays in layout but leaves the accessibility tree.
	await scrollNearTop(shot, 'kb-1');
	await shot.click('kb-1');
	shot.expectAccessibleText('Alpha body', true);
	await shot.click('kb-1');
	await shot.settle(300);
	shot.expectAccessibleText('Alpha body', false);
	// Focus is on kb-1: Tab walks to the next trigger and Enter opens it.
	await shot.press('Tab');
	await shot.press('Enter');
	shot.expectAccessibleText('Beta body', true);
	shot.capture('keyboard-tab');
	// Open: the trigger controls its region, which the trigger names. Closed: no controls.
	const controls = shot.aria('kb-2').controls;
	if (!Array.isArray(controls) || controls.length !== 1)
		throw new Error('an open trigger controls its panel');
	shot.expectAria(String(controls[0]), {
		role: 'Region',
		labelled_by: [shot.idOf('kb-2')],
	});
	shot.expectAria('kb-2', { expanded: true });
	shot.expectAria('kb-1', { expanded: false, controls: undefined });
	shot.expectAria('kb-3', { disabled: true });
	await shot.click('kb-3');
	shot.expectAccessibleText('Gamma body', false);
	await shot.press('Enter');
	shot.expectAccessibleText('Gamma body', false);
};
