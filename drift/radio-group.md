# radio-group

Original: `registry/base/radio-group.tsx`. Ported in `src/components/radio-group.tsx` (row, group and hover machinery shared with checkbox-group in `src/components/choice-group.tsx`), demo in `src/demos/radio-group.tsx`.

## The dot pops in from scale 0.3

- **Original:** the dot springs from `scale: 0.3, opacity: 0` on `spring.fast` and shrinks out over 40 ms.
- **gpuix lacks:** scale. Transforms are the known gap.
- **Workaround:** the dot is absolutely positioned and `motion` animates `left` / `top` / `width` / `height` together (`dotAt`, `radio-group.tsx:119-124`) so it stays centred while it grows from 30% of its size (`DOT_FROM`, `:21`). `AnimatePresence` plays the exit (`:146-160`).
- **Fidelity:** approximated (same size and timing; the layout is recomputed per frame instead of a compositor transform).
- **Components it hits:** any scale-in (badge dot, input-copy glyph).
