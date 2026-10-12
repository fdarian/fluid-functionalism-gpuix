import { type HostElement, useGpuixRequired } from "@gpuix/solid";
import {
	createContext,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	onMount,
	children as resolveChildren,
	useContext,
} from "solid-js";

const PROBE_MS = 33;
/** How long a box keeps being re-read after the last thing that could have changed it: a spring's tail. */
const HOT_MS = 600;

interface Probe {
	read: () => boolean;
	hotUntil: number;
}

/**
 * The DOM version puts a ResizeObserver on every panel and step. gpuix has no
 * layout event, only the last painted bounds, so a box that animates to its
 * content's height re-reads them on a timer. A box is read only while it is
 * "hot": it was just mounted, something it depends on changed (a `kick`), or
 * its last read differed. The timer stops when nothing is hot.
 */
const probes = new Set<Probe>();
let probeTimer: ReturnType<typeof setInterval> | undefined;

function warm(probe: Probe) {
	probe.hotUntil = performance.now() + HOT_MS;
	if (probeTimer !== undefined) return;
	probeTimer = setInterval(() => {
		const now = performance.now();
		let anyHot = false;
		for (const candidate of probes) {
			if (now >= candidate.hotUntil) continue;
			anyHot = true;
			if (candidate.read()) candidate.hotUntil = now + HOT_MS;
		}
		if (!anyHot) {
			clearInterval(probeTimer);
			probeTimer = undefined;
		}
	}, PROBE_MS);
}

/** Renders `children`, and kicks whenever they are replaced: a source list or an image appearing is a size change. Resolved inside the provider, so a nested `Collapse` finds the kick. */
export function Kicking(props: {
	kick: () => void;
	children?: JSX.Element;
}): JSX.Element {
	const resolved = resolveChildren(() => props.children);
	createEffect(() => {
		void resolved();
		props.kick();
	});
	return resolved;
}

/** Re-reads the nearest measured ancestor too: its content just changed size. */
export const KickContext = createContext<() => void>();

export function createMeasuredHeight() {
	const renderer = useGpuixRequired();
	const getBounds = renderer.getElementBounds;
	if (getBounds === undefined) {
		throw new Error("This renderer does not expose getElementBounds");
	}
	const kickParent = useContext(KickContext);
	let element: HostElement | undefined;
	const [height, setHeight] = createSignal<number>();
	// The first read only turns bounds tracking on: null until a frame is painted.
	const probe: Probe = {
		hotUntil: 0,
		read() {
			if (element === undefined) return false;
			const box = getBounds.call(renderer, element.id);
			if (box == null) return false;
			const known = height();
			if (known !== undefined && Math.abs(box.height - known) <= 0.25) {
				return false;
			}
			setHeight(box.height);
			kickParent?.();
			return true;
		},
	};
	const kick = () => warm(probe);
	onMount(() => {
		probes.add(probe);
		kick();
	});
	onCleanup(() => probes.delete(probe));
	return {
		ref(next: HostElement) {
			element = next;
		},
		height,
		kick,
		kickParent,
	};
}
