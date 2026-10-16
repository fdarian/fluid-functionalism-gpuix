# color-picker

Original: `registry/default/color-picker.tsx`. Ported in `src/components/color-picker.tsx` (colour maths in `src/components/color-picker-math.ts`, copied from the original), demo in `src/demos/color-picker.tsx`. The panel, the format menu, the channel fields with scrubbing, swatches and the popover are ported; size pinning and the eyedropper are not (a port gap, not a gpuix one: see `BASE-UI-AUDIT.md`), and named colours are below.

## No JS-side CSS colour resolver (named colours)

- **Original:** a typed or swatch colour such as `tomato` resolves through a canvas 2D context (`fillStyle`), which accepts every CSS colour syntax.
- **gpuix lacks:** a canvas pixel path and any JS-visible colour resolver. Named colours, `color-mix()` and the rest resolve natively for style values only (`~/code/fdarian/gpuix/FORK.md:661-667`), and nothing hands the resolved colour back to JS.
- **Workaround:** `parseColor` reads hex, `rgb(a)`, `hsl(a)` and `oklch` only (`src/components/color-picker-math.ts:303-306`); a typed name is rejected like any unreadable input, and a `swatches` entry it cannot read throws (`src/components/color-picker.tsx:1404`).
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## CSS transforms (popup scale, chevron turn)

- **Original:** the popover and the format menu enter with `scaleY: 0.96`, and the trigger's chevron rotates 180 degrees.
- **gpuix lacks:** `scale` and `rotate` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the popup slides 4px from the side it opened on and fades (`src/components/color-picker.tsx:697-719`); the chevron is swapped for a `chevron-up` icon while open (`:79`, `:913`).
- **Fidelity:** approximated.
- **Components it hits:** every popup (select, combobox, dropdown share the same slide in `src/lib/popup.tsx:64-84`) and every rotating chevron.
