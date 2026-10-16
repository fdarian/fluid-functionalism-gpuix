# thinking-indicator

Original: `registry/default/thinking-indicator.tsx` plus `.shimmer-text` in `app/globals.css`. Ported in `src/components/thinking-indicator.tsx`, demo in `src/demos/thinking-indicator.tsx`.

## `y: "80%"` words roll on `top`

- **Original:** words enter `y: "80%" -> 0` over 0.24s and leave `y: 0 -> "-80%"` over 0.16s inside an `overflow-hidden` grid cell.
- **gpuix lacks:** translate. Transforms are the known gap, and `motion` has no `%` for insets (`top`).
- **Workaround:** the words are absolutely positioned in a relatively positioned, `overflow: hidden` cell and move on `top` in pixels, 80% of the 20px line (`ROLL`, `thinking-indicator.tsx:187`; `RollingWord`, `:199-211`). The `transition` prop is switched on `useIsPresent()` so the exiting word uses the 0.16s tween. A hidden copy of the longest word reserves the width (`:257-261`). Each word is a fresh element (`<Show keyed>`) because Solid's `AnimatePresence` tracks elements, not keys.
- **Fidelity:** exact for the visible result. `top` re-lays out per frame where a translate would not.
- **Components it hits:** queued-stack (a card's `y` is likewise a `bottom` offset), mobile-drawer.
