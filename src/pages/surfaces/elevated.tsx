import type { HostElement, HostMouseMoveEvent, StyleDesc } from "@gpuix/solid";
import { type Accessor, createContext, type JSX, useContext } from "solid-js";
import { color, scheme, surface } from "../../lib/theme";

/** `lib/surface-context`: the level of the surface a component opens inside. The page is 1. */
const SurfaceContext = createContext<Accessor<number>>(() => 1);

export function SurfaceProvider(props: {
	value: number;
	children: JSX.Element;
}) {
	return (
		<SurfaceContext.Provider value={() => props.value}>
			{props.children}
		</SurfaceContext.Provider>
	);
}

export function useSurface(): Accessor<number> {
	return useContext(SurfaceContext);
}

/** The drops of the ladder, level 2 up: offset, blur and spread each double from 1px. */
const DROPS = [
	"0 1px 1px -0.5px",
	"0 3px 3px -1.5px",
	"0 6px 6px -3px",
	"0 12px 12px -6px",
	"0 24px 24px -12px",
	"0 48px 48px -24px",
	"0 96px 96px -48px",
] as const;

/** The dark ladder per level: the inset highlight and ring alphas, and the outer hairline's. */
const DARK_STEPS = [
	{ highlight: null, ring: 0.02, hairline: null },
	{ highlight: 0.01, ring: 0.02, hairline: null },
	{ highlight: 0.02, ring: 0.02, hairline: 0.12 },
	{ highlight: 0.02, ring: 0.04, hairline: 0.14 },
	{ highlight: 0.04, ring: 0.04, hairline: 0.16 },
	{ highlight: 0.04, ring: 0.06, hairline: 0.18 },
	{ highlight: 0.06, ring: 0.06, hairline: 0.2 },
	{ highlight: 0.06, ring: 0.06, hairline: 0.22 },
] as const;

/** `--shadow-N` of app/globals.css for the scheme in scope, written out as a multi-layer `boxShadow`. */
export function shadowSurface(level: number): string {
	if (!Number.isInteger(level) || level < 1 || level > 8) {
		throw new Error(`There is no shadow level ${level}`);
	}
	const drops = DROPS.slice(0, level - 1);
	if (scheme() === "light") {
		return [
			`0 0 0 1px ${color.shadowColor}`,
			...drops.map((drop) => `${drop} ${color.shadowColor}`),
		].join(", ");
	}
	const step = DARK_STEPS[level - 1];
	const layers: string[] = [];
	if (step.highlight !== null) {
		layers.push(`inset 0 1px 0 0 rgba(255,255,255,${step.highlight})`);
	}
	layers.push(`inset 0 0 0 1px rgba(255,255,255,${step.ring})`);
	if (step.hairline !== null) {
		layers.push(`0 0 0 1px rgba(0,0,0,${step.hairline})`);
	}
	for (const drop of drops) layers.push(`${drop} ${color.shadowColor}`);
	return layers.join(", ");
}

/** `lib/elevated`: a panel that settles `offset` levels above its substrate and passes that level on. */
export function Elevated(props: {
	offset: number;
	/** Pins the shadow while the background tracks the substrate. */
	shadowLevel?: number;
	style?: StyleDesc;
	testId?: string;
	ref?: (element: HostElement) => void;
	onMouseMove?: (event: HostMouseMoveEvent) => void;
	children?: JSX.Element;
}) {
	const substrate = useSurface();
	const level = () => Math.min(substrate() + props.offset, 8);
	return (
		<SurfaceProvider value={level()}>
			<div
				ref={props.ref}
				testId={props.testId}
				onMouseMove={props.onMouseMove}
				style={{
					backgroundColor: surface(level()),
					boxShadow: shadowSurface(props.shadowLevel ?? level()),
					...props.style,
				}}
			>
				{props.children}
			</div>
		</SurfaceProvider>
	);
}
