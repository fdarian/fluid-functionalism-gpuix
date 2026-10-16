# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` utility in `app/globals.css`. Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

## A horizontal or both-axis scroller does not extend its scroll width from its content

- **Original:** `overflow: auto` with a `w-max` child scrolls in both axes.
- **gpuix lacks:** a content-sized width. `width: "max-content"` is rejected (only grid tracks take `max-content`; `FORK.md` area E: it needs a layout run with max-content available space), and a block child of a scroller is clamped to the viewport width, so a wide descendant does not extend the scroll width. Overflow only happens when the child is a flex item with `flexShrink: 0`.
- **Workaround:** a horizontal or both-axis viewport is a flex row (`display: flex; flexDirection: row; alignItems: flex-start`, `scroll-area.tsx:503-510`) and its content box is `flexShrink: 0` (`:513-522`); a vertical area keeps `width: "100%"`.
- **Fidelity:** exact.
- **Components it hits:** table (wide tables), any two-axis scroller.

## The edge fade is a mask, and masks are drawn on macOS only

- **Original:** `.scroll-fade` is a CSS `mask-image` on the viewport, driven by a scroll timeline; browsers without scroll timelines (Firefox) get no fade.
- **gpuix lacks:** a mask on Windows and Linux. `maskImage` is an effect group (`FORK.md` area D), built on macOS in zed's `gpui_apple`; the WGSL and HLSL paths are unproven. There a masked viewport would paint without the fade.
- **Workaround:** none needed on macOS: `maskImage` on the viewport, a linear gradient rebuilt from the `onScroll` offset (`scroll-area.tsx:351-361`). The earlier overlay gradient in the surface colour is gone, so the content itself dissolves, as on the web.
- **Fidelity:** exact on macOS; no fade elsewhere. The gradient string is re-parsed on every scroll event. A `both` area fades vertically only, as the single `scroll-fade` class does on the web.
- **Components it hits:** any `ScrollArea` with `fade`.
