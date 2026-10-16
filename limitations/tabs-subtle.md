# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`. Ported in `src/components/tabs-subtle.tsx`, demo in `src/demos/tabs-subtle.tsx`.

## `width` cannot animate to `auto`, so the unfolding label's width is measured

- **Original:** `width` animates to `offsetWidth` read through a `ResizeObserver`.
- **gpuix lacks:** `width: "auto"` as a motion target (it throws; `FORK.md` area E: taffy reports a content height, not a max-content width). `height: "auto"` works.
- **Workaround:** the box holding the label and its gap reports its width through `onLayout` (`tabs-subtle.tsx:369-372`) and the label animates `width` to that number (`:353`). Until the first report an unfolded label keeps its natural width with a plain `width: "auto"` style (`:359-362`).
- **Fidelity:** exact for the label width.
- **Components it hits:** accordion, sidebar sub-menu, any component that animates width to a content size.
