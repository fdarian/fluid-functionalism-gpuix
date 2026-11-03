import { UniversalStyle } from '@ghia/solid';
import { createSignal, type JSX, Show } from 'solid-js';
import { setThemeChoice, type ThemeChoice } from './theme';

const [fading, setFading] = createSignal(false);
let flipTimer: ReturnType<typeof setTimeout> | undefined;
let endTimer: ReturnType<typeof setTimeout> | undefined;

/** The source's 180ms ease-in-out, on the properties its `html.transitioning *` rule lists (`app/globals.css:859-868`). */
const FADE_MS = 180;
/** The source removes `.transitioning` 200ms after the class swap. */
const HOLD_MS = 200;
/** One frame. An element that first gains a `transition` in the same change as a colour jumps, so the layer has to be in before the palette moves: the source's forced reflow. */
const LEAD_MS = 20;
const fadeStyle = {
	transitionProperty:
		'border-radius,background-color,color,border-color,fill,stroke',
	transitionDuration: `${FADE_MS}ms`,
	transitionTimingFunction: 'ease-in-out',
};

/**
 * What the user does to change the theme: mounts the cross-fade layer, flips
 * the palette a frame later and drops the layer 200ms after that. A second
 * change inside the window restarts both timers. Code that sets the theme
 * for a capture or a test calls `setThemeChoice` instead and cuts at once.
 */
export function changeTheme(next: ThemeChoice) {
	setFading(true);
	clearTimeout(flipTimer);
	clearTimeout(endTimer);
	flipTimer = setTimeout(() => {
		setThemeChoice(next);
		endTimer = setTimeout(() => setFading(false), HOLD_MS);
	}, LEAD_MS);
}

/** Renders nothing; mount once under the gpuix root. The layer exists only between a `changeTheme` and its end, so the first paint never fades. */
export function ThemeFade(): JSX.Element {
	return (
		<Show when={fading()}>
			<UniversalStyle style={fadeStyle} />
		</Show>
	);
}
