import { createContext, useContext } from 'solid-js';

/** The highest `--surface-N` step. */
const MAX_SURFACE = 8;

/** The surface level the component sits on: 1 is the page. */
export const SurfaceContext = createContext(1);

/** The level `offset` steps above the surface this is called under, as `Elevated` computes it. */
export function useElevatedSurface(offset: number) {
	return Math.min(useContext(SurfaceContext) + offset, MAX_SURFACE);
}
