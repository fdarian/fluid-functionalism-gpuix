# input-copy

Original: `registry/default/input-copy.tsx`. Ported in `src/components/input-copy.tsx`, demo in `src/demos/input-copy.tsx`.

## The check and cross pop in with a scale

- **Original:** the swap scales the glyph 0.6 to 1 (wait mode: the copy icon shrinks out to 0.8 first).
- **gpuix lacks:** scale, so no pop. Transforms are the known gap.
- **Workaround:** `Swap` (`input-copy.tsx:44-64`) remounts its children when the `${status}-${copyCount}` key changes and fades them in with `motion` opacity (`tween.fast`), so the fade replays when you copy again. A hidden "Copied" in flow reserves the widest label with the visible label absolutely placed over it (`input-copy.tsx:213-236`), so the row never resizes.
- **Fidelity:** approximated (fade instead of pop).
- **Components it hits:** any scale-in glyph (checkbox, switch tick, radio dot).
