# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`. Ported in `src/components/tabs-subtle.tsx`, demo in `src/demos/tabs-subtle.tsx`.

## `width` cannot animate to `auto`, so the unfolding label's width is measured

- **Original:** `width` animates to `offsetWidth` read through a `ResizeObserver`.
- **gpuix lacks:** `width: "auto"` as a motion target (it throws; `FORK.md` area E: taffy reports a content height, not a max-content width). `height: "auto"` works.
- **Workaround:** the box holding the label and its gap reports its width through `onLayout` (`tabs-subtle.tsx:388-392`) and the label animates `width` to that number (`labelWidthTarget`, `:270`). The tab selected at mount is born unfolded: until the first report it keeps its natural width with a plain `width: "auto"` style (`:378-382`), and the first measured width is placed with a zero-duration transition, so the first layout already has the real width and the observer's first batch does not snapshot an icon-only pill. A tab selected later tweens, and `onMotionComplete` on that box calls `hover.remeasure()` (`:374`) so the pill and neighbours refresh once the label settles.
- **Fidelity:** exact for the label width.
- **Components it hits:** accordion, sidebar sub-menu, any component that animates width to a content size.
