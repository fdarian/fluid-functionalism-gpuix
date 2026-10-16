# accordion

Original: `registry/base/accordion.tsx`. Ported in `src/components/accordion.tsx`, demo in `src/demos/accordion.tsx`.

## CSS transforms (the chevron's rotation)

- **Original:** the chevron rotates 90 degrees as the item opens (`rotate-90`).
- **gpuix lacks:** `transform` entirely. Only SVG and glyph sprites carry a `TransformationMatrix`; quads, images, masks and hitboxes do not (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the icon is swapped between `chevron-right` and `chevron-down` (`src/components/accordion.tsx:509`).
- **Fidelity:** approximated (no turn, the glyph changes at once).
- **Components it hits:** every rotating chevron (card, color-picker, sidebar sub-menu).
