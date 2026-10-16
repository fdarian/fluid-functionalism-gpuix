import { createSignal, For, Show } from "solid-js";
import { Button } from "../components/button";
import {
	Card,
	CardButton,
	CardContent,
	CardDescription,
	CardFeature,
	CardFooter,
	CardGroup,
	CardHeader,
	CardImage,
	CardMedia,
	CardTitle,
} from "../components/card";
import type { DemoModule } from "../lib/demo";
import { DemoCard } from "../lib/demo-kit";

/** The docs' inline data-URI art, so the demo needs no asset files. */
const BANNER =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='180'%3E%3Cdefs%3E%3CradialGradient id='a' cx='12%25' cy='16%25' r='70%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.9'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='90%25' cy='12%25' r='65%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.45'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='82%25' cy='94%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.8'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='24%25' cy='90%25' r='68%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.55'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='320' height='180' fill='%23ffffff'/%3E%3Crect width='320' height='180' fill='%236B97FF' fill-opacity='0.2'/%3E%3Crect width='320' height='180' fill='url(%23a)'/%3E%3Crect width='320' height='180' fill='url(%23b)'/%3E%3Crect width='320' height='180' fill='url(%23c)'/%3E%3Crect width='320' height='180' fill='url(%23d)'/%3E%3C/svg%3E";
const THUMB =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Cdefs%3E%3CradialGradient id='a' cx='20%25' cy='18%25' r='80%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.95'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='86%25' cy='14%25' r='75%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.5'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='72%25' cy='94%25' r='85%25'%3E%3Cstop offset='0%25' stop-color='%236B97FF' stop-opacity='0.85'/%3E%3Cstop offset='100%25' stop-color='%236B97FF' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='40' height='40' fill='%23ffffff'/%3E%3Crect width='40' height='40' fill='%236B97FF' fill-opacity='0.35'/%3E%3Crect width='40' height='40' fill='url(%23a)'/%3E%3Crect width='40' height='40' fill='url(%23b)'/%3E%3Crect width='40' height='40' fill='url(%23c)'/%3E%3C/svg%3E";


const FEATURES = [
	{ icon: "circle", title: "Fluid motion", description: "Spring-tuned transitions calibrated across three tiers" },
	{ icon: "shield", title: "Accessible by default", description: "Focus-visible rings and ARIA roles in every part" },
	{ icon: "palette", title: "Yours to theme", description: "Swap radius, icons, and primitive at runtime" },
	{ icon: "moon", title: "Dark mode ready", description: "Tokens adapt to light and dark automatically" },
] as const;

/** Every example composes these same four cards a different way. */
function Basic() {
	return (
		<CardGroup orientation="inline" testId="basic">
			<For each={FEATURES}>
				{(feature, index) => (
					<Card testId={`basic-${index()}`} onClick={() => {}}>
						<CardMedia icon={feature.icon} />
						<CardHeader>
							<CardTitle>{feature.title}</CardTitle>
							<CardDescription>{feature.description}</CardDescription>
						</CardHeader>
						<CardFooter>
							<CardButton testId={`basic-${index()}-connect`}>Connect</CardButton>
						</CardFooter>
					</Card>
				)}
			</For>
		</CardGroup>
	);
}

function Grid() {
	return (
		<CardGroup columns={2} border="outlined" separated testId="grid">
			<For each={FEATURES}>
				{(feature, index) => (
					<Card testId={`grid-${index()}`} onClick={() => {}}>
						<CardImage src={BANNER} height={155} />
						<CardHeader>
							<CardTitle>{feature.title}</CardTitle>
							<CardDescription>{feature.description}</CardDescription>
						</CardHeader>
						<CardFooter>
							<CardButton variant="primary">Get started</CardButton>
							<CardButton variant="secondary">Learn more</CardButton>
						</CardFooter>
					</Card>
				)}
			</For>
		</CardGroup>
	);
}

function Outlined() {
	return (
		<CardGroup orientation="inline" border="outlined" testId="outlined">
			<For each={FEATURES}>
				{(feature, index) => (
					<Card testId={`outlined-${index()}`} onClick={() => {}}>
						<CardMedia logo={THUMB} />
						<CardHeader>
							<CardTitle>{feature.title}</CardTitle>
							<CardDescription>{feature.description}</CardDescription>
						</CardHeader>
						<CardFooter>
							<CardButton variant="primary">Get started</CardButton>
						</CardFooter>
					</Card>
				)}
			</For>
		</CardGroup>
	);
}

function Separated() {
	return (
		<CardGroup orientation="inline" separated testId="separated">
			<For each={FEATURES}>
				{(feature, index) => (
					<Card testId={`separated-${index()}`} onClick={() => {}}>
						<CardImage src={BANNER} />
						<CardHeader>
							<CardTitle>{feature.title}</CardTitle>
							<CardDescription>{feature.description}</CardDescription>
						</CardHeader>
						<CardFooter>
							<CardButton variant="primary">Get started</CardButton>
							<CardButton variant="secondary">Learn more</CardButton>
							<CardButton>Connect</CardButton>
						</CardFooter>
					</Card>
				)}
			</For>
		</CardGroup>
	);
}

function Promo() {
	const [dismissed, setDismissed] = createSignal(false);
	return (
		<Show when={!dismissed()} fallback={
			<Button testId="promo-restore" variant="ghost" size="compact" onClick={() => setDismissed(false)}>
				Restore card
			</Button>
		}>
			<div style={{ width: 300 }}>
				<Card testId="promo" dismissible outlined onDismiss={() => setDismissed(true)}>
					<CardImage src={BANNER} height={168} />
					<CardHeader>
						<CardTitle>Meet the new Card component</CardTitle>
					</CardHeader>
					<CardContent>
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							<CardFeature
								icon="paintbrush"
								title="Always pixel-perfect"
								description="Renders your design exactly: token-driven and crisp in light and dark, at any radius"
							/>
							<CardFeature
								icon="square-library"
								title="Stacked, inline, or grid"
								description="One compositional API: borderless by default, with separated tiles or a shared frame"
							/>
						</div>
					</CardContent>
					<CardFooter>
						<CardButton variant="primary">Get started</CardButton>
						<CardButton variant="ghost">Learn more</CardButton>
					</CardFooter>
				</Card>
			</div>
		</Show>
	);
}

function Selected() {
	const [selected, setSelected] = createSignal(1);
	return (
		<CardGroup orientation="inline" testId="selected">
			<For each={FEATURES}>
				{(feature, index) => (
					<Card
						testId={`selected-${index()}`}
						label={feature.title}
						selected={selected() === index()}
						onClick={() => setSelected(index())}
					>
						<CardMedia icon={feature.icon} />
						<CardHeader>
							<CardTitle>{feature.title}</CardTitle>
							<CardDescription>{feature.description}</CardDescription>
						</CardHeader>
					</Card>
				)}
			</For>
		</CardGroup>
	);
}

export const title = "Card";
export const group = "Components";

export function Demo() {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<DemoCard title="Basic">
				<Basic />
			</DemoCard>
			<DemoCard title="Selected">
				<Selected />
			</DemoCard>
			<DemoCard title="Grid: 2-D fluid hover">
				<Grid />
			</DemoCard>
			<DemoCard title="Outlined group">
				<Outlined />
			</DemoCard>
			<DemoCard title="Separated tiles">
				<Separated />
			</DemoCard>
			<DemoCard title="Fully yours: compose anything">
				<Promo />
			</DemoCard>
		</div>
	);
}

export const scenarios: DemoModule["scenarios"] = async (shot) => {
	await shot.hover("basic-1");
	shot.capture("basic-hover");
	await shot.hover("basic-3");
	shot.capture("basic-hover-last");
	await shot.hover("basic-2-connect");
	shot.capture("basic-action-hover");
	await shot.click("selected-3");
	await shot.hover("selected-0");
	shot.capture("selected-3-hover-0");

	// The lower cards are below the fold: scroll to each and act there.
	await shot.scroll(600, 400, 0, -560);
	await shot.scroll(600, 400, 0, -560);
	await shot.hover("grid-3");
	shot.capture("grid-2d-hover");
	// The gap between two tiles still resolves to the nearest one.
	await shot.moveTo(600, 341);
	shot.capture("grid-gap-hover");
	await shot.scroll(600, 400, 0, -560);
	await shot.scroll(600, 400, 0, -560);
	shot.capture("separated-and-outlined");
	for (let tick = 0; tick < 4; tick++) await shot.scroll(600, 400, 0, -560);
	await shot.hover("promo");
	shot.capture("promo-hover");
	await shot.moveTo(599, 262);
	shot.capture("promo-chip-hover");
};
