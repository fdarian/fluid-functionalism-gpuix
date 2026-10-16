# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` utility in `app/globals.css`. Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

## A horizontal or both-axis scroller does not extend its scroll width from its content

- **Original:** `overflow: auto` with a `w-max` child scrolls in both axes.
- **gpuix lacks:** a content-sized width. `width: "max-content"` is rejected (only grid tracks take `max-content`; `FORK.md` area E: it needs a layout run with max-content available space), and a block child of a scroller is clamped to the viewport width, so a wide descendant does not extend the scroll width. Overflow only happens when the child is a flex item with `flexShrink: 0`.
- **Workaround:** a horizontal or both-axis viewport is a flex row (`display: flex; flexDirection: row; alignItems: flex-start`, `scroll-area.tsx:516-523`) and its content box is `flexShrink: 0` (`:526-535`); a vertical area keeps `width: "100%"`.
- **Fidelity:** exact.
- **Components it hits:** table (wide tables), any two-axis scroller.
