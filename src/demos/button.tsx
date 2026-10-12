import { For } from "solid-js";
import {
	Button,
	type ButtonSize,
	type ButtonVariant,
} from "../components/button";
import type { DemoModule } from "../lib/demo";
import { DemoCard, DemoRow } from "../lib/demo-kit";

const VARIANTS: ButtonVariant[] = ["primary", "secondary", "tertiary", "ghost"];

function VariantRow(props: {
	label: string;
	size: ButtonSize;
	extra?: Partial<Parameters<typeof Button>[0]>;
}) {
	return (
		<DemoRow label={props.label}>
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
		</DemoRow>
	);
}

export const title = "Button";
export const group = "Components";

export function Demo() {
	return (
		<DemoCard title="Button">
			<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
				<VariantRow label="Default" size="default" />
				<VariantRow label="Compact" size="compact" />
				<VariantRow
					label="Leading icon"
					size="default"
					extra={{ leadingIcon: "plus" }}
				/>
				<DemoRow label="Icon only">
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
				</DemoRow>
				<VariantRow
					label="Disabled"
					size="default"
					extra={{ disabled: true }}
				/>
				<VariantRow label="Loading" size="default" extra={{ loading: true }} />
			</div>
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("Default-primary");
	shot.capture("hover");
	await shot.down("Default-primary");
	shot.capture("pressed");
	await shot.up("Default-primary");
};
