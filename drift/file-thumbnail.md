# file-thumbnail

Original: `registry/default/file-thumbnail.tsx`. Ported in `src/components/file-thumbnail.tsx`, demo in `src/demos/file-thumbnail.tsx`.

## No PDF page preview

- **Original:** renders the first page of a PDF through pdfjs onto a canvas and shows it as an image.
- **gpuix lacks:** a drawing surface. `<canvas>` is listed as "Custom drawing (planned)" in the README, so pdfjs has nothing to render into; the only pixel path is `setImagePixels` on an `<img>`, which needs a rasteriser outside gpuix.
- **Workaround:** none. A PDF shows the generic document glyph (`file-thumbnail.tsx:130-137`).
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## `animate-spin`: no rotate transform

- **Original:** a `border-2 border-border border-t-muted-foreground` ring that `animate-spin` turns once a second.
- **gpuix lacks:** rotation. Transforms are the known gap, and `motion` cannot animate an SVG `transform` attribute either (the `motion.path` / `motion.g` keys in the README's "Animate SVG shapes" table do not include it).
- **Workaround:** two stacked `<svg source>` layers: a static ring tinted `border`, and an arc whose source string is rewritten from the shared `onFrame` clock (`src/lib/clock.ts:25`, a 16 ms `setInterval`), rotating the path at 0.36 degrees a millisecond and rounding to whole degrees so the SVG cache sees at most 360 distinct strings (`file-thumbnail.tsx:19-78`).
- **Fidelity:** approximated. Driven from the JS thread, so it stalls with it; the arc is a plain-stroke quadrant rather than the tapered border join.
- **Components it hits:** thinking-steps (chevron, `drift/thinking-steps.md`).
