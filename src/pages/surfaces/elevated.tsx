import type { HostElement, HostMouseMoveEvent, StyleDesc } from "@gpuix/solid";
import { type Accessor, createContext, type JSX, useContext } from "solid-js";
import { shadow, surface } from "#/lib/theme";

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
					boxShadow: shadow(props.shadowLevel ?? level()),
					...props.style,
				}}
			>
				{props.children}
			</div>
		</SurfaceProvider>
	);
}
