/** How long a popup keeps painting its exit fade before unmounting. */
export const POPUP_EXIT_MS = 60;

/**
 * The unmount timer for popups whose exit `onMotionComplete` releases them:
 * the exit tween plus a buffer, like FF's `exitFallbackMs`.
 */
export const POPUP_EXIT_FALLBACK_MS = POPUP_EXIT_MS + 100;
