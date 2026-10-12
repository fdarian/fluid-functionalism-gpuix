import type { ElementBounds, HostElement } from "@gpuix/solid";

/** Frames to wait for a first paint: the first read only turns bounds tracking on, and boxes exist from the next painted frame. */
const ATTEMPTS = 12;
const RETRY_MS = 16;

export type Bounds = ElementBounds;

/**
 * The element's last painted box, or null before it has been painted (or
 * while it is not mounted). Throws on a renderer without `getElementBounds`.
 */
export function readBounds(element: HostElement): Bounds | null {
	const root = element.root;
	if (root === null || !element.mounted) return null;
	const getBounds = root.nativeRenderer.getElementBounds;
	if (getBounds === undefined) {
		throw new Error("This renderer does not expose getElementBounds");
	}
	return getBounds.call(root.nativeRenderer, element.id);
}

/** Waits for the element's first painted box, retrying for ~190 ms. Rejects if there is none by then. */
export function awaitBounds(element: HostElement): Promise<Bounds> {
	return new Promise((resolve, reject) => {
		let attempts = 0;
		const attempt = () => {
			const bounds = readBounds(element);
			if (bounds !== null) {
				resolve(bounds);
				return;
			}
			attempts += 1;
			if (attempts >= ATTEMPTS) {
				reject(
					new Error(`Painted bounds unavailable after ${ATTEMPTS} frames`),
				);
				return;
			}
			setTimeout(attempt, RETRY_MS);
		};
		attempt();
	});
}
