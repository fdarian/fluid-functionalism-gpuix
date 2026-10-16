import { type HostElement, IntersectionObserver } from "@gpuix/solid";
import {
	type Accessor,
	createEffect,
	createSignal,
	onCleanup,
	useContext,
} from "solid-js";
import { PageScrollerContext } from "../../lib/demo-kit";

/**
 * Whether at least `threshold` of the element is inside the page's scroller.
 * gpuix clamps an open popup into the window when its anchor is off-screen, so
 * a demo that opens one on mount would show it over whatever is on screen.
 */
export function createVisibility(threshold: number): {
	ref: (element: HostElement) => void;
	visible: Accessor<boolean>;
} {
	const scroller = useContext(PageScrollerContext);
	if (scroller === undefined) {
		throw new Error(
			"createVisibility must be inside the page's PageScrollerContext",
		);
	}
	const [target, setTarget] = createSignal<HostElement>();
	const [visible, setVisible] = createSignal(false);
	createEffect(() => {
		const root = scroller();
		const element = target();
		if (root === undefined || element === undefined) return;
		const observer = new IntersectionObserver(
			(entries) => {
				const latest = entries[entries.length - 1];
				setVisible(latest.isIntersecting);
			},
			{ root, threshold },
		);
		observer.observe(element);
		onCleanup(() => observer.disconnect());
	});
	return { ref: setTarget, visible };
}
