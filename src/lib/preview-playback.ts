import { type Accessor, createContext, useContext } from 'solid-js';

/**
 * Whether a live preview may run its own animation (an autoplay, a scripted
 * cursor, a looping example). On by default, so the Showcase and the system
 * pages play as before; the changelog plays each preview while its stage is
 * in view, under one page-wide Pause. A preview that animates by itself calls
 * `usePreviewPlayback()` and holds still while it is false (and is listed in
 * `ANIMATED_PREVIEWS` in `pages/changelog/previews.tsx`, so the changelog
 * gives its stage the button).
 */
export const PreviewPlaybackContext = createContext<Accessor<boolean>>(
	() => true,
);

export function usePreviewPlayback(): Accessor<boolean> {
	return useContext(PreviewPlaybackContext);
}
