import { createContext, type JSX, useContext } from 'solid-js';

/** How many `ArrowKeys` regions hold focus; the page's key handler reads it. */
export const ArrowCaptureContext = createContext<{
	enter: () => void;
	leave: () => void;
}>();

/**
 * Focus inside this region keeps the arrow keys for the widget: the source's handler ignores a target in an
 * input, a slider, a tablist, a radio group, a listbox or a menu.
 */
export function ArrowKeys(props: { children: JSX.Element }) {
	const capture = useContext(ArrowCaptureContext);
	if (capture === undefined) {
		throw new Error('ArrowKeys must be inside the compare page');
	}
	return (
		<div
			onFocusIn={capture.enter}
			onFocusOut={capture.leave}
			style={{ display: 'contents' }}
		>
			{props.children}
		</div>
	);
}
