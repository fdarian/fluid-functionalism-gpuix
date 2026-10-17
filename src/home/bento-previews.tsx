import type { DomEvent } from '@gpuix/solid';
import { createSignal, For, type JSX, useContext } from 'solid-js';
import {
	AccordionContent,
	AccordionGroup,
	AccordionItem,
	AccordionTrigger,
} from '#/components/accordion';
import { AskUserQuestions } from '#/components/ask-user-questions';
import { Badge, type BadgeColor } from '#/components/badge';
import { Button, type ButtonVariant } from '#/components/button';
import {
	Card,
	CardGroup,
	CardHeader,
	CardMedia,
	CardTitle,
} from '#/components/card';
import { CarouselDots } from '#/components/carousel-dots';
import { ChatMessage } from '#/components/chat-message';
import { CheckboxGroup, CheckboxItem } from '#/components/checkbox-group';
import { ColorPicker } from '#/components/color-picker';
import { Combobox } from '#/components/combobox';
import {
	CommandMenu,
	CommandMenuEmpty,
	CommandMenuInput,
	CommandMenuList,
	CommandMenuPanel,
} from '#/components/command-menu';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#/components/dialog';
import { Dropdown, MenuItem } from '#/components/dropdown';
import { InputCopy } from '#/components/input-copy';
import { InputField, InputGroup } from '#/components/input-group';
import { InputMessage } from '#/components/input-message';
import { RadioGroup, RadioItem } from '#/components/radio-group';
import { Select } from '#/components/select';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarSearchField,
} from '#/components/sidebar';
import { Slider, type SliderValue } from '#/components/slider';
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
import { ThinkingIndicator } from '#/components/thinking-indicator';
import {
	ThinkingStep,
	ThinkingStepDetails,
	ThinkingStepSource,
	ThinkingStepSources,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from '#/components/thinking-steps';
import { Tooltip } from '#/components/tooltip';
import { createSlides, SLIDES, Slide } from '#/demos/carousel-dots';
import { MICKA_PNG } from '#/lib/assets';
import type { IconRef } from '#/lib/icons';
import { usePreviewPlayback } from '#/lib/preview-playback';
import { color, siteType, weight } from '#/lib/theme';
import { ASK_USER_EXAMPLE_QUESTIONS } from './ask-user-example';
import { BentoTileContext } from './bento-card';
import {
	COMMAND_MENU_ITEMS,
	COMMAND_MENU_SUGGESTIONS,
} from './command-menu-items';

/** The docs' `w-full max-w-[N]` column around a preview, centred in the stage. */
function Capped(props: { maxWidth: number; children: JSX.Element }) {
	return (
		<div style={{ width: '100%', maxWidth: props.maxWidth }}>
			{props.children}
		</div>
	);
}

function InputMessagePreview() {
	const [value, setValue] = createSignal('');
	return (
		<Capped maxWidth={440}>
			<InputMessage
				testId="bento-input-message"
				value={value()}
				onValueChange={setValue}
				onSend={() => setValue('')}
				placeholderSuggestion="Why is every other input box so stiff?"
			/>
		</Capped>
	);
}

function ThinkingIndicatorPreview() {
	return <ThinkingIndicator />;
}

function CommandMenuPreview() {
	return (
		<CommandMenuPanel maxHeight={440}>
			<CommandMenu
				testId="bento-command-menu"
				items={COMMAND_MENU_ITEMS}
				suggestions={COMMAND_MENU_SUGGESTIONS}
			>
				<CommandMenuInput placeholder="Type a command or search…" />
				<CommandMenuList>
					<CommandMenuEmpty>No results.</CommandMenuEmpty>
				</CommandMenuList>
			</CommandMenu>
		</CommandMenuPanel>
	);
}

const COMBOBOX_COMPONENTS = [
	'Accordion',
	'Badge',
	'Button',
	'Card',
	'CheckboxGroup',
	'ColorPicker',
	'Combobox',
	'Dialog',
	'Dropdown',
	'InputGroup',
	'RadioGroup',
	'Select',
	'Sidebar',
	'Slider',
	'Switch',
	'Table',
	'Tabs',
];

const COMBOBOX_WIDTH = 280;

/** Single-select, where the source's tile is a multiple combobox with two chips: the port has no chips. */
function ComboboxPreview() {
	const [value, setValue] = createSignal<string | null>('Button');
	// The combobox takes a pixel width, so the `w-full max-w-[280px]` column reports the width it got.
	const [width, setWidth] = createSignal(COMBOBOX_WIDTH);
	return (
		<div
			style={{ width: '100%', maxWidth: COMBOBOX_WIDTH }}
			onLayout={(event: DomEvent) => {
				if (event.width === undefined) {
					throw new Error('onLayout reported no width');
				}
				setWidth(event.width);
			}}
		>
			<Combobox
				testId="bento-combobox"
				width={width()}
				items={COMBOBOX_COMPONENTS}
				value={value()}
				onValueChange={setValue}
				placeholder="Add components…"
				emptyText="No component found."
			/>
		</div>
	);
}

const SWITCH_ITEMS = [
	{ id: 'notifications', label: 'Notifications', initial: true },
	{ id: 'sound', label: 'Sound effects', initial: false },
];

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
						label={item.label}
						checked={on().has(item.id)}
						onToggle={() => toggle(item.id)}
					/>
				)}
			</For>
		</div>
	);
}

const SIDEBAR_THREADS = [
	{ label: 'Sidebar component height in demo', badge: '2' },
	{ label: 'Dark mode token audit', badge: '3' },
	{ label: 'Scrollbar fade regression', badge: '1' },
	{ label: 'Registry deploy pipeline', badge: '7' },
];

/** A row the menu's fluid hover does not own: the workspace and the user, which carry an avatar the port's menu button cannot. */
function IdentityRow(props: { avatar: JSX.Element; label: string }) {
	return (
		<div
			style={{
				height: 32,
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				gap: 8,
				paddingLeft: 8,
				paddingRight: 8,
			}}
		>
			{props.avatar}
			<text
				style={{
					...siteType.body,
					fontWeight: weight.semibold,
					color: color.foreground,
					whiteSpace: 'nowrap',
				}}
			>
				{props.label}
			</text>
		</div>
	);
}

/** A whole app shell in miniature: workspace row, search, a thread list and a user row beside a blank main region. */
function SidebarPreview() {
	const [active, setActive] = createSignal(SIDEBAR_THREADS[0].label);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				height: 380,
				width: '100%',
				maxWidth: 620,
				overflow: 'hidden',
				borderRadius: 12,
				borderStyle: 'solid',
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.background,
			}}
		>
			<Sidebar>
				<SidebarHeader>
					<IdentityRow
						label="Acme Inc"
						avatar={
							<div
								style={{
									width: 20,
									height: 20,
									flexShrink: 0,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									borderRadius: 6,
									backgroundColor: color.foreground,
								}}
							>
								<text
									style={{
										fontSize: 10,
										lineHeight: '12px',
										fontWeight: weight.semibold,
										color: color.background,
									}}
								>
									A
								</text>
							</div>
						}
					/>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<SidebarSearchField placeholder="Search" shortcut="⌘K" />
						<SidebarMenu>
							<SidebarMenuButton icon="plus" label="New thread" />
						</SidebarMenu>
					</div>
				</SidebarHeader>
				<SidebarContent>
					<SidebarGroupLabel>Threads</SidebarGroupLabel>
					<SidebarMenu>
						<For each={SIDEBAR_THREADS}>
							{(thread) => (
								<SidebarMenuButton
									label={thread.label}
									badge={thread.badge}
									active={active() === thread.label}
									onClick={() => setActive(thread.label)}
								/>
							)}
						</For>
					</SidebarMenu>
				</SidebarContent>
				<SidebarFooter>
					<IdentityRow
						label="Micka Touillaud"
						avatar={
							<img
								src={MICKA_PNG}
								style={{
									width: 20,
									height: 20,
									flexShrink: 0,
									borderRadius: 10,
								}}
							/>
						}
					/>
				</SidebarFooter>
			</Sidebar>
		</div>
	);
}

const RADIO_ITEMS = [
	{ value: 'fast', label: 'Fast spring' },
	{ value: 'moderate', label: 'Moderate spring' },
	{ value: 'slow', label: 'Slow spring' },
	{ value: 'comfortable', label: 'Comfortable' },
	{ value: 'none', label: 'No animation' },
];

function RadioGroupPreview() {
	const [value, setValue] = createSignal<string | undefined>('moderate');
	return (
		<Capped maxWidth={220}>
			<RadioGroup value={value()} onValueChange={setValue}>
				<For each={RADIO_ITEMS}>
					{(item, index) => (
						<RadioItem value={item.value} index={index()} label={item.label} />
					)}
				</For>
			</RadioGroup>
		</Capped>
	);
}

/** The source's tile pins these to `size="compact"`: the port's ChatMessage has no size prop. */
function ChatMessagePreview() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				width: '100%',
				maxWidth: 300,
			}}
		>
			<ChatMessage from="user">
				Why is every other input box so stiff?
			</ChatMessage>
			<ChatMessage from="assistant">
				Because nothing about them moves with you.
			</ChatMessage>
		</div>
	);
}

const CARD_ROWS: { icon: IconRef; title: string }[] = [
	{ icon: 'circle', title: 'Fluid motion' },
	{ icon: 'shield', title: 'Accessible' },
	{ icon: 'palette', title: 'Yours to theme' },
	{ icon: 'search', title: 'Fluid hover' },
];

/** A medium tile: four compact inline rows (icon and title) under one fluid hover. The descriptions stay on the docs page. */
function CardPreview() {
	return (
		<Capped maxWidth={520}>
			<CardGroup orientation="inline" fluidHover>
				<For each={CARD_ROWS}>
					{(row) => (
						<Card size="compact" label={row.title} onClick={() => {}}>
							<CardMedia icon={row.icon} />
							<CardHeader>
								<CardTitle>{row.title}</CardTitle>
							</CardHeader>
						</Card>
					)}
				</For>
			</CardGroup>
		</Capped>
	);
}

const SELECT_ROLES = ['Owner', 'Editor', 'Viewer', 'Guest'].map((role) => ({
	value: role,
	label: role,
}));

function SelectPreview() {
	const [value, setValue] = createSignal<string | null>('Viewer');
	return (
		<Capped maxWidth={280}>
			<Select
				variant="bordered"
				items={SELECT_ROLES}
				value={value()}
				onValueChange={setValue}
				placeholder="Select role..."
			/>
		</Capped>
	);
}

function ThinkingStepsPreview() {
	return (
		<Capped maxWidth={380}>
			<ThinkingSteps defaultOpen width="100%">
				<ThinkingStepsHeader>Research Agent</ThinkingStepsHeader>
				<ThinkingStepsContent>
					<ThinkingStep
						status="complete"
						icon="search"
						label="Searching profiles"
					>
						<ThinkingStepSources>
							<ThinkingStepSource>x.com</ThinkingStepSource>
							<ThinkingStepSource>github.com</ThinkingStepSource>
						</ThinkingStepSources>
					</ThinkingStep>
					<ThinkingStep
						status="complete"
						icon="globe"
						label="Reading portfolio"
					>
						<ThinkingStepDetails
							summary="Explored 4 pages"
							details={[
								'Read about.html',
								'Read projects.html',
								'Read resume.pdf',
								'Read contact.html',
							]}
						/>
					</ThinkingStep>
					<ThinkingStep
						status="complete"
						icon="search"
						label="Searching recent work"
					>
						<ThinkingStepSources>
							<ThinkingStepSource>figma.com</ThinkingStepSource>
							<ThinkingStepSource>behance.net</ThinkingStepSource>
						</ThinkingStepSources>
					</ThinkingStep>
					<ThinkingStep
						status="active"
						icon="brain"
						label="Analyzing results"
						description="Compiling findings into a summary."
						isLast
					/>
				</ThinkingStepsContent>
			</ThinkingSteps>
		</Capped>
	);
}

const TABS_SUBTLE_ITEMS: { icon: IconRef; label: string }[] = [
	{ icon: 'home', label: 'Home' },
	{ icon: 'message-circle', label: 'Chat' },
	{ icon: 'inbox', label: 'Inbox' },
];

function TabsSubtlePreview() {
	const [tab, setTab] = createSignal(0);
	return (
		<TabsSubtle
			idPrefix="bento-tabs"
			selectedIndex={tab()}
			onSelect={setTab}
			activeLabel
		>
			<For each={TABS_SUBTLE_ITEMS}>
				{(item, index) => (
					<TabsSubtleItem index={index()} icon={item.icon} label={item.label} />
				)}
			</For>
		</TabsSubtle>
	);
}

const CHECKBOX_ITEMS = [
	'Spring physics',
	'Fluid hover',
	'Font weight transitions',
	'Keyboard navigation',
	'Dark mode support',
];

function CheckboxGroupPreview() {
	const [checked, setChecked] = createSignal<ReadonlySet<number>>(new Set());
	const toggle = (index: number) => {
		const next = new Set(checked());
		if (next.has(index)) next.delete(index);
		else next.add(index);
		setChecked(next);
	};
	return (
		<Capped maxWidth={220}>
			<CheckboxGroup checkedIndices={checked()}>
				<For each={CHECKBOX_ITEMS}>
					{(label, index) => (
						<CheckboxItem
							index={index()}
							label={label}
							checked={checked().has(index())}
							onToggle={() => toggle(index())}
						/>
					)}
				</For>
			</CheckboxGroup>
		</Capped>
	);
}

/** Flush with the stage's bottom edge: the card's height changes per question, and anchoring the bottom keeps the footer button and chip column where they are. */
function AskUserQuestionsPreview() {
	return (
		<div
			style={{
				flexGrow: 1,
				width: '100%',
				maxWidth: 420,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-end',
			}}
		>
			<AskUserQuestions questions={ASK_USER_EXAMPLE_QUESTIONS} />
		</div>
	);
}

const SLIDER_OPACITY = { label: 'Opacity', initial: 35 };
const SLIDER_VOLUME = { label: 'Volume', initial: 60 };

function SliderPreview() {
	const [basic, setBasic] = createSignal<SliderValue>(SLIDER_OPACITY.initial);
	const [volume, setVolume] = createSignal<SliderValue>(SLIDER_VOLUME.initial);
	const muted = { ...siteType.body, color: color.mutedForeground };
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 32,
				width: '100%',
				maxWidth: 280,
			}}
		>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						justifyContent: 'space-between',
					}}
				>
					<text style={muted}>{SLIDER_OPACITY.label}</text>
					<text style={{ ...muted, fontVariantNumeric: 'tabular-nums' }}>
						{String(basic())}
					</text>
				</div>
				<Slider value={basic()} onChange={setBasic} showValue={false} />
			</div>
			<Slider
				variant="scrubber"
				label={SLIDER_VOLUME.label}
				value={volume()}
				onChange={setVolume}
				min={0}
				max={100}
				formatValue={(value) => `${value}%`}
			/>
		</div>
	);
}

const DROPDOWN_ITEMS: { icon: IconRef; label: string }[] = [
	{ icon: 'circle', label: 'Spring animations' },
	{ icon: 'star', label: 'Fluid hover' },
	{ icon: 'plus', label: 'Font weight shifts' },
	{ icon: 'heart', label: 'Accessible by default' },
	{ icon: 'check', label: 'Radix or Base UI' },
	{ icon: 'brain', label: 'Functional clarity' },
];

function DropdownPreview() {
	const [selected, setSelected] = createSignal<number | null>(0);
	return (
		<Dropdown checkedIndex={selected() ?? undefined}>
			<For each={DROPDOWN_ITEMS}>
				{(item, index) => (
					<MenuItem
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
	);
}

const TABS_ITEMS = [
	{ value: 'overview', label: 'Overview' },
	{ value: 'analytics', label: 'Analytics' },
	{ value: 'settings', label: 'Settings' },
	{ value: 'logs', label: 'Logs' },
];

function TabsPreview() {
	const [tab, setTab] = createSignal('overview');
	return (
		<Capped maxWidth={360}>
			<Tabs value={tab()} onValueChange={setTab}>
				<TabsList>
					<For each={TABS_ITEMS}>
						{(item) => <TabItem value={item.value} label={item.label} />}
					</For>
				</TabsList>
			</Tabs>
		</Capped>
	);
}

function InputCopyPreview() {
	return (
		<Capped maxWidth={420}>
			<InputCopy value="npx shadcn@latest registry add @fluid" />
		</Capped>
	);
}

const ACCORDION_ITEMS = [
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
	{
		value: 'item-5',
		title: 'How do I install a component?',
		content:
			'One CLI command — dependencies and shared utilities resolve themselves.',
	},
];

function AccordionPreview() {
	return (
		<Capped maxWidth={420}>
			<AccordionGroup type="single" defaultValue="item-1">
				<For each={ACCORDION_ITEMS}>
					{(item) => (
						<AccordionItem value={item.value}>
							<AccordionTrigger>{item.title}</AccordionTrigger>
							<AccordionContent>{item.content}</AccordionContent>
						</AccordionItem>
					)}
				</For>
			</AccordionGroup>
		</Capped>
	);
}

const INPUT_FIELDS: {
	key: string;
	label: string;
	placeholder: string;
	icon: IconRef;
}[] = [
	{ key: 'name', label: 'Name', placeholder: 'Your name', icon: 'user' },
	{
		key: 'email',
		label: 'Email',
		placeholder: 'you@example.com',
		icon: 'mail',
	},
	{
		key: 'website',
		label: 'Website',
		placeholder: 'fluidfunctionalism.com',
		icon: 'globe',
	},
];

function InputGroupPreview() {
	const [values, setValues] = createSignal<Record<string, string>>({});
	return (
		<Capped maxWidth={320}>
			<InputGroup>
				<For each={INPUT_FIELDS}>
					{(field, index) => (
						<InputField
							index={index()}
							label={field.label}
							placeholder={field.placeholder}
							icon={field.icon}
							value={values()[field.key] ?? ''}
							onChange={(next) => setValues({ ...values(), [field.key]: next })}
						/>
					)}
				</For>
			</InputGroup>
		</Capped>
	);
}

/** A small carousel on the dots' autoplay; hovering the slide pauses it. */
function CarouselDotsPreview() {
	const slides = createSlides();
	const playing = usePreviewPlayback();
	const [hovering, setHovering] = createSignal(false);
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div
				onMouseEnter={() => setHovering(true)}
				onMouseLeave={() => setHovering(false)}
			>
				<Slide
					index={slides.state().slide}
					direction={slides.state().direction}
					width={192}
					height={64}
				/>
			</div>
			<div {...slides.markByHand}>
				<CarouselDots
					count={SLIDES.length}
					value={slides.state().slide}
					onValueChange={slides.onValueChange}
					autoplay={{ duration: 2400, paused: hovering() || !playing() }}
					getLabel={(index: number) => `Show ${SLIDES[index]}`}
				/>
			</div>
		</div>
	);
}

const BUTTON_ITEMS: { label: string; variant: ButtonVariant }[] = [
	{ label: 'Primary', variant: 'primary' },
	{ label: 'Secondary', variant: 'secondary' },
	{ label: 'Tertiary', variant: 'tertiary' },
	{ label: 'Ghost', variant: 'ghost' },
];

function ButtonPreview() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: 8,
			}}
		>
			<For each={BUTTON_ITEMS}>
				{(item) => (
					<Button variant={item.variant} size="compact">
						{item.label}
					</Button>
				)}
			</For>
		</div>
	);
}

const TABLE_COLUMNS = ['Name', 'Role', 'Status'];
const TABLE_ROWS = [
	['Alice', 'Engineer', 'Active'],
	['Bob', 'Designer', 'Away'],
	['Carol', 'PM', 'Active'],
	['Dan', 'Engineer', 'Offline'],
	['Erin', 'Researcher', 'Active'],
	['Farid', 'Support', 'Away'],
	['Gwen', 'Designer', 'Active'],
];

function TablePreview() {
	const inTile = useContext(BentoTileContext);
	// Four rows fit a medium tile's stage; outside a tile all seven show.
	const rows = () => (inTile ? TABLE_ROWS.slice(0, 4) : TABLE_ROWS);
	return (
		<Capped maxWidth={420}>
			<Table>
				<TableHeader>
					<TableRow>
						<For each={TABLE_COLUMNS}>
							{(column) => <TableHead>{column}</TableHead>}
						</For>
					</TableRow>
				</TableHeader>
				<TableBody>
					<For each={rows()}>
						{(row, index) => (
							<TableRow index={index()}>
								<For each={row}>{(cell) => <TableCell>{cell}</TableCell>}</For>
							</TableRow>
						)}
					</For>
				</TableBody>
			</Table>
		</Capped>
	);
}

function DialogPreview() {
	return (
		<Dialog>
			<DialogTrigger>
				<Button testId="bento-dialog-open" variant="secondary" size="compact">
					Open Dialog
				</Button>
			</DialogTrigger>
			<DialogContent size="sm">
				<DialogHeader>
					<DialogTitle>Create teamspace</DialogTitle>
					<DialogDescription>
						Add a new teamspace to organize your projects.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<DialogClose>
						<Button variant="ghost">Cancel</Button>
					</DialogClose>
					<Button>Create</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function ColorPickerPreview() {
	return <ColorPicker defaultValue="#6B97FF" />;
}

function TooltipPreview() {
	return (
		<Tooltip content="Copy to clipboard">
			<Button testId="bento-tooltip" variant="secondary" size="compact">
				Hover me
			</Button>
		</Tooltip>
	);
}

const BADGE_ITEMS: { label: string; color: BadgeColor }[] = [
	{ label: 'Published', color: 'blue' },
	{ label: 'Active', color: 'green' },
	{ label: 'Declined', color: 'red' },
];

function BadgePreview() {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: 6,
			}}
		>
			<For each={BADGE_ITEMS}>
				{(item) => (
					<Badge variant="dot" color={item.color}>
						{item.label}
					</Badge>
				)}
			</For>
		</div>
	);
}

/** Slug -> the live preview a home tile shows; a slug with no entry renders an empty stage. */
export const previewMap: Record<string, () => JSX.Element> = {
	'input-message': InputMessagePreview,
	'thinking-indicator': ThinkingIndicatorPreview,
	'command-menu': CommandMenuPreview,
	combobox: ComboboxPreview,
	switch: SwitchPreview,
	sidebar: SidebarPreview,
	'radio-group': RadioGroupPreview,
	'chat-message': ChatMessagePreview,
	card: CardPreview,
	select: SelectPreview,
	'thinking-steps': ThinkingStepsPreview,
	'tabs-subtle': TabsSubtlePreview,
	'checkbox-group': CheckboxGroupPreview,
	'ask-user-questions': AskUserQuestionsPreview,
	slider: SliderPreview,
	dropdown: DropdownPreview,
	tabs: TabsPreview,
	'input-copy': InputCopyPreview,
	accordion: AccordionPreview,
	'input-group': InputGroupPreview,
	'carousel-dots': CarouselDotsPreview,
	button: ButtonPreview,
	table: TablePreview,
	dialog: DialogPreview,
	'color-picker': ColorPickerPreview,
	tooltip: TooltipPreview,
	badge: BadgePreview,
};
