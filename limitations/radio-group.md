# radio-group

Original: `registry/base/radio-group.tsx`. Ported in `src/components/radio-group.tsx` (row, group and hover machinery shared with checkbox-group in `src/components/choice-group.tsx`), demo in `src/demos/radio-group.tsx`.

Most of what the port hits is in [checkbox-group.md](checkbox-group.md): the shared focus ring (per-row native `focusVisible` instead of one ring that springs), `click` firing on any mouse-up, and `pointerEvents: "none"` on every positioned child of a row. Only what is specific to radio is below.

## The dot pops in from scale 0.3

- **Original:** the dot springs from `scale: 0.3, opacity: 0` on `spring.fast` and shrinks out over 40 ms.
- **gpuix lacks:** transforms (already known). Missing feature.
- **Workaround:** the dot is absolutely positioned and `motion` animates `left` / `top` / `width` / `height` together so it stays centred while it grows from 30% of its size. `AnimatePresence` plays the exit.
- **Fidelity:** approximated (same size and timing; the layout is recomputed per frame instead of a compositor transform).
- **Components it hits:** any scale-in (badge dot, thinking-indicator).

## Selection by `selectedIndex`, `value` or per-item `selected`

- **Original:** the group reads its children (`Children.toArray`) to find the index of the row whose `value` matches, so the selected background can sit on it.
- **gpuix lacks:** nothing in gpuix; Solid has no children introspection that survives reactivity. Listed because it shapes the API.
- **Workaround:** each `RadioItem` registers its `value` and `selected` accessor with the group, which derives the selected index from the registrations (used for the tab stop). As in FF, the selected background follows only `value` or `selectedIndex`; a group driven by per-item `selected` alone paints none.
- **Fidelity:** exact.
- **Components it hits:** none.

## One selected background that springs from row to row

- **Original:** one `motion.div` with `initial={false}` placed on the selected row, springing on `spring.moderate` when the selection moves.
- **gpuix lacks:** nothing: `motion` on `top` / `height` does it, and a run keeps its `FluidHighlight` instance across selection changes, so retargeting keeps the spring's velocity. The one difference is that the shared highlight fades in on first measure instead of being placed with `initial={false}`.
- **Workaround:** none needed.
- **Fidelity:** exact (a fade-in on the very first paint is the only difference).
- **Components it hits:** none.
