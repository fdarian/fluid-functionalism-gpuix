import { createSignal, For, type JSX } from "solid-js";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Combobox } from "./combobox";
import { Select } from "./select";
import {
	Sidebar,
	SidebarContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarSearchField,
} from "./sidebar";
import {
	color,
	fontFamily,
	type Scheme,
	type as scale,
	scheme,
	setScheme,
	weight,
} from "./theme";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "tertiary", "ghost"];

const BLUE = "#3B82F6";
const YELLOW = "#FBBF24";

const SYSTEM_ROWS: { label: string; dot?: string }[] = [
	{ label: "Fluid Hover", dot: BLUE },
	{ label: "Motion" },
	{ label: "Scrollbars" },
	{ label: "Sizes" },
	{ label: "Skill", dot: YELLOW },
	{ label: "Surfaces" },
	{ label: "Typography", dot: YELLOW },
];

const COMPONENT_ROWS: { label: string; dot?: string }[] = [
	{ label: "Accordion" },
	{ label: "AskUserQuestions" },
	{ label: "Badge" },
	{ label: "Banner", dot: BLUE },
	{ label: "Card" },
	{ label: "CarouselDots", dot: BLUE },
	{ label: "ChatMessage" },
	{ label: "CheckboxGroup" },
	{ label: "ColorPicker" },
	{ label: "Combobox", dot: BLUE },
	{ label: "CommandMenu", dot: BLUE },
	{ label: "Dialog" },
];

const BUTTON_PAGES = ["Variants", "Sizes", "Icons"];

const FRAMEWORKS = [
	"Astro",
	"Angular",
	"Next.js",
	"Nuxt",
	"Qwik",
	"Remix",
	"Solid",
	"SolidStart",
	"Svelte",
	"SvelteKit",
	"TanStack Start",
	"Vue",
];

const THEMES = [
	{ value: "light", label: "Light", icon: "sun" },
	{ value: "dark", label: "Dark", icon: "moon" },
] as const;

function AppSidebar() {
	const [active, setActive] = createSignal("Showcase");
	const [buttonOpen, setButtonOpen] = createSignal(true);
	const row = (label: string, dot?: string) => (
		<SidebarMenuButton
			testId={`nav-${label}`}
			label={label}
			dot={dot}
			active={active() === label}
			onClick={() => setActive(label)}
		/>
	);
	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarSearchField placeholder="Search" shortcut="⌘K" />
			</SidebarHeader>
			<SidebarContent>
				<SidebarMenu>
					{row("Showcase")}
					{row("Introduction")}
				</SidebarMenu>
				<SidebarGroupLabel count={SYSTEM_ROWS.length}>System</SidebarGroupLabel>
				<SidebarMenu>
					<For each={SYSTEM_ROWS}>{(item) => row(item.label, item.dot)}</For>
				</SidebarMenu>
				<SidebarGroupLabel count={COMPONENT_ROWS.length + 1}>
					Components
				</SidebarGroupLabel>
				<SidebarMenu>
					<For each={COMPONENT_ROWS.slice(0, 4)}>
						{(item) => row(item.label, item.dot)}
					</For>
					<SidebarMenuButton
						testId="nav-Button"
						label="Button"
						active={BUTTON_PAGES.includes(active())}
						trailingIcon={() =>
							buttonOpen() ? "chevron-down" : "chevron-right"
						}
						onClick={() => setButtonOpen(!buttonOpen())}
					/>
					<SidebarMenuSub open={buttonOpen()}>
						<For each={BUTTON_PAGES}>
							{(page) => (
								<SidebarMenuButton
									testId={`nav-${page}`}
									level={1}
									label={page}
									active={active() === page}
									disabled={() => !buttonOpen()}
									onClick={() => setActive(page)}
								/>
							)}
						</For>
					</SidebarMenuSub>
					<For each={COMPONENT_ROWS.slice(4)}>
						{(item) => row(item.label, item.dot)}
					</For>
				</SidebarMenu>
			</SidebarContent>
		</Sidebar>
	);
}

function Card(props: { title: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				borderRadius: 12,
				borderWidth: 1,
				borderColor: color.border,
				backgroundColor: color.surface2,
			}}
		>
			<div style={{ padding: 20 }}>{props.children}</div>
			<div
				style={{
					height: 44,
					display: "flex",
					alignItems: "center",
					paddingLeft: 16,
					borderTopWidth: 1,
					borderColor: color.border,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					{props.title}
				</text>
			</div>
		</div>
	);
}

function Row(props: { label: string; children: JSX.Element }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				gap: 16,
				minHeight: 36,
			}}
		>
			<div style={{ width: 96, flexShrink: 0 }}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.label}
				</text>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 10,
				}}
			>
				{props.children}
			</div>
		</div>
	);
}

function VariantRow(props: {
	label: string;
	size: ButtonSize;
	extra?: Partial<Parameters<typeof Button>[0]>;
}) {
	return (
		<Row label={props.label}>
			<For each={VARIANTS}>
				{(variant: ButtonVariant) => (
					<Button
						testId={`${props.label}-${variant}`}
						variant={variant}
						size={props.size}
						{...props.extra}
					>
						{variant[0].toUpperCase() + variant.slice(1)}
					</Button>
				)}
			</For>
		</Row>
	);
}

function ButtonCard() {
	return (
		<Card title="Button">
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<VariantRow label="Default" size="default" />
				<VariantRow label="Compact" size="compact" />
				<VariantRow
					label="Leading icon"
					size="default"
					extra={{ leadingIcon: "plus" }}
				/>
				<Row label="Icon only">
					<For each={VARIANTS}>
						{(variant: ButtonVariant) => (
							<Button variant={variant} size="icon" icon="settings" />
						)}
					</For>
					<For each={VARIANTS}>
						{(variant: ButtonVariant) => (
							<Button variant={variant} size="icon-compact" icon="plus" />
						)}
					</For>
				</Row>
				<VariantRow
					label="Disabled"
					size="default"
					extra={{ disabled: true }}
				/>
				<VariantRow label="Loading" size="default" extra={{ loading: true }} />
			</div>
		</Card>
	);
}

function ComboboxCard() {
	const [framework, setFramework] = createSignal<string | null>("Solid");
	return (
		<Card title="Combobox">
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					paddingTop: 12,
					paddingBottom: 12,
				}}
			>
				<Combobox
					testId="framework"
					items={FRAMEWORKS}
					value={framework()}
					onValueChange={setFramework}
					icon="search"
					placeholder="Select framework…"
					emptyText="No framework found."
				/>
			</div>
		</Card>
	);
}

function Hero() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
			<text
				style={{
					...scale.display,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				Fluid Functionalism
			</text>
			<text style={{ ...scale.body, color: color.mutedForeground }}>
				Refined UI components with satisfying hover.
			</text>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					paddingTop: 12,
				}}
			>
				<Button size="compact" leadingIcon="copy">
					Copy install prompt
				</Button>
				<Button size="compact" variant="secondary">
					Learn more
				</Button>
				<Button size="compact" variant="ghost">
					See demo
				</Button>
			</div>
		</div>
	);
}

function CustomizeCard() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 12,
				padding: 16,
				borderRadius: 12,
				backgroundColor: color.surface2,
			}}
		>
			<text
				style={{
					...scale.title,
					fontWeight: weight.semibold,
					color: color.foreground,
				}}
			>
				Make them yours
			</text>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					height: 28,
				}}
			>
				<text style={{ ...scale.body, color: color.mutedForeground }}>
					Theme
				</text>
				<Select
					testId="theme"
					items={THEMES}
					value={scheme()}
					onValueChange={(value: Scheme) => setScheme(value)}
				/>
			</div>
		</div>
	);
}

export function App() {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "row",
				width: "100%",
				height: "100%",
				backgroundColor: color.background,
				fontFamily,
			}}
		>
			<AppSidebar />
			<div
				style={{
					flexGrow: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					paddingTop: 40,
				}}
			>
				<div
					style={{
						width: 600,
						display: "flex",
						flexDirection: "column",
						gap: 32,
					}}
				>
					<Hero />
					<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
						<ButtonCard />
						<ComboboxCard />
					</div>
				</div>
			</div>
			<div style={{ width: 296, flexShrink: 0, padding: 16 }}>
				<CustomizeCard />
			</div>
		</div>
	);
}
