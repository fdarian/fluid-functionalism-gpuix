import { createSignal, For, type JSX } from "solid-js";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { Combobox } from "./combobox";
import {
	LetterTile,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuSub,
	SidebarSearchField,
} from "./sidebar";
import { color, fontFamily, type as scale, weight } from "./theme";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "tertiary", "ghost"];

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

const PROJECTS = ["Website", "Mobile app", "API"];

function Heading(props: { children: string }) {
	return (
		<text
			style={{
				fontSize: 16,
				lineHeight: 22,
				fontWeight: weight.semibold,
				color: color.foreground,
			}}
		>
			{props.children}
		</text>
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
			<div style={{ width: 132, flexShrink: 0 }}>
				<text style={{ ...scale.caption, color: color.mutedForeground }}>
					{props.label}
				</text>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 12,
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
	children?: (variant: ButtonVariant) => Partial<Parameters<typeof Button>[0]>;
}) {
	return (
		<Row label={props.label}>
			<For each={VARIANTS}>
				{(variant) => (
					<Button
						variant={variant}
						size={props.size}
						{...props.children?.(variant)}
					>
						{variant[0].toUpperCase() + variant.slice(1)}
					</Button>
				)}
			</For>
		</Row>
	);
}

function ButtonGallery() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<Heading>Button</Heading>
			<VariantRow label="Default" size="default" />
			<VariantRow label="Compact" size="compact" />
			<VariantRow
				label="Leading icon"
				size="default"
				children={() => ({ leadingIcon: "plus" })}
			/>
			<VariantRow
				label="Trailing icon"
				size="compact"
				children={() => ({ trailingIcon: "arrow-right" })}
			/>
			<Row label="Icon only">
				<For each={VARIANTS}>
					{(variant) => (
						<Button variant={variant} size="icon" icon="settings" />
					)}
				</For>
				<For each={VARIANTS}>
					{(variant) => (
						<Button variant={variant} size="icon-compact" icon="plus" />
					)}
				</For>
			</Row>
			<VariantRow
				label="Disabled"
				size="default"
				children={() => ({ disabled: true })}
			/>
			<VariantRow
				label="Loading"
				size="default"
				children={() => ({ loading: true })}
			/>
		</div>
	);
}

function ComboboxDemo() {
	const [framework, setFramework] = createSignal<string | null>("Solid");
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
			<Heading>Combobox</Heading>
			<Row label="Framework">
				<Combobox
					testId="framework"
					items={FRAMEWORKS}
					value={framework()}
					onValueChange={setFramework}
					icon="search"
					placeholder="Select framework…"
					emptyText="No framework found."
				/>
			</Row>
		</div>
	);
}

function AppSidebar() {
	const [active, setActive] = createSignal("Home");
	const [projectsOpen, setProjectsOpen] = createSignal(true);
	const nav = (
		label: string,
		icon: Parameters<typeof SidebarMenuButton>[0]["icon"],
		badge?: string,
	) => (
		<SidebarMenuButton
			testId={`nav-${label}`}
			label={label}
			icon={icon}
			badge={badge}
			active={active() === label}
			onClick={() => setActive(label)}
		/>
	);
	return (
		<Sidebar>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuButton
						label="Acme Inc"
						strong
						leading={<LetterTile letter="A" />}
						inset={{ left: 6, gap: 6 }}
						trailingIcon={() => "chevron-down"}
					/>
				</SidebarMenu>
				<SidebarSearchField placeholder="Search…" shortcut="⌘K" />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroupLabel>Platform</SidebarGroupLabel>
				<SidebarMenu>
					{nav("Home", "star")}
					{nav("Inbox", "mail", "12")}
					{nav("Calendar", "clock")}
					<SidebarMenuButton
						testId="nav-Projects"
						label="Projects"
						icon="folder"
						active={PROJECTS.includes(active())}
						trailingIcon={() =>
							projectsOpen() ? "chevron-down" : "chevron-right"
						}
						onClick={() => setProjectsOpen(!projectsOpen())}
					/>
					<SidebarMenuSub open={projectsOpen()}>
						<For each={PROJECTS}>
							{(project) => (
								<SidebarMenuButton
									testId={`nav-${project}`}
									level={1}
									label={project}
									active={active() === project}
									disabled={() => !projectsOpen()}
									onClick={() => setActive(project)}
								/>
							)}
						</For>
					</SidebarMenuSub>
				</SidebarMenu>
				<SidebarGroupLabel>Workspace</SidebarGroupLabel>
				<SidebarMenu>
					{nav("Notifications", "bell", "3")}
					{nav("Members", "users")}
					{nav("Settings", "settings")}
				</SidebarMenu>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuButton
						label="Jane Doe"
						strong
						leading={<LetterTile letter="J" round />}
						inset={{ left: 6, gap: 6 }}
						trailingIcon={() => "chevrons-up-down"}
					/>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
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
					gap: 28,
					padding: 32,
				}}
			>
				<ComboboxDemo />
				<ButtonGallery />
			</div>
		</div>
	);
}
