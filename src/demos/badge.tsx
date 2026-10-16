import { For } from "solid-js";
import {
	Badge,
	type BadgeColor,
	badgeColors,
	type BadgeVariant,
} from "../components/badge";
import { DemoCard, DemoRow } from "../lib/demo-kit";

const FEATURED: { color: BadgeColor; label: string }[] = [
	{ color: "violet", label: "Fiction" },
	{ color: "amber", label: "Science" },
	{ color: "green", label: "Philosophy" },
	{ color: "blue", label: "History" },
	{ color: "rose", label: "Poetry" },
];

const ALL_COLORS = Object.keys(badgeColors) as BadgeColor[];

const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1);

function Row(props: { variant: BadgeVariant }) {
	return (
		<div
			style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}
		>
			<For each={FEATURED}>
				{(item) => (
					<Badge variant={props.variant} color={item.color}>
						{item.label}
					</Badge>
				)}
			</For>
		</div>
	);
}

function Palette(props: { variant: BadgeVariant }) {
	return (
		<div
			style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 8 }}
		>
			<For each={ALL_COLORS}>
				{(name) => (
					<Badge variant={props.variant} color={name}>
						{capitalize(name)}
					</Badge>
				)}
			</For>
		</div>
	);
}

export const title = "Badge";
export const group = "Components";
export const listed = "sidebar";

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Solid">
				<Row variant="solid" />
			</DemoCard>
			<DemoCard title="Dot">
				<Row variant="dot" />
			</DemoCard>
			<DemoCard title="Colors">
				<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
					<Palette variant="solid" />
					<Palette variant="dot" />
				</div>
			</DemoCard>
			<DemoCard title="Sizes">
				<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
					<DemoRow label="Default">
						<Badge color="blue">Default</Badge>
						<Badge variant="dot" color="blue">
							Default
						</Badge>
					</DemoRow>
					<DemoRow label="Compact">
						<Badge size="compact" color="blue">
							Compact
						</Badge>
						<Badge size="compact" variant="dot" color="blue">
							Compact
						</Badge>
					</DemoRow>
				</div>
			</DemoCard>
		</div>
	);
}
