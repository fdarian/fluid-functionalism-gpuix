import { createSignal } from "solid-js";
import { Combobox } from "../components/combobox";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";

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

export const title = "Combobox";
export const group = "Components";

export function Demo() {
	const [framework, setFramework] = createSignal<string | null>("Solid");
	return (
		<DemoCard title="Combobox">
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
		</DemoCard>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.click("framework-input");
	shot.expectText("Angular", true);
	shot.capture("open");

	await shot.press("backspace backspace backspace backspace backspace");
	await shot.press("s o l");
	shot.expectText("Angular", false);
	shot.capture("filtered");

	await shot.press("z z");
	shot.expectText("No framework found.", true);
	shot.capture("empty");

	await shot.clickAt(700, 760);
	shot.expectText("No framework found.", false);
};
