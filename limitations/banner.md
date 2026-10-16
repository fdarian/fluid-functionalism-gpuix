# banner

Original: `registry/default/banner.tsx`. Ported in `src/components/banner.tsx`, demo in `src/demos/banner.tsx`. Screenshots: `screenshots/banner/` (`scrolled-*.png` are the lower cards, captured with a taller scroll).

## CSS transforms (the banner scales in and out)

- **Original:** the banner inside its row scales from 40% on appear and to 60% on dismiss.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** none; the banner fades (and, for the fixed bar, rides its row with `top`) without scaling (`src/components/banner.tsx:341-379`).
- **Fidelity:** approximated (height and fade, no scale).
- **Components it hits:** any enter or exit that scales.

## Container queries and `:has()`

- **Original:** `@max-sm/banner` (a container query at 24rem) drops the actions under the text, and `has-data-[slot=banner-description]` switches the layout when a description exists.
- **gpuix lacks:** container queries (they need a layout feedback pass that taffy and gpuix do not have) and `:has()` (no selector engine; gpuix has no stylesheet): `~/code/fdarian/gpuix/FORK.md:618-621`.
- **Workaround:** `BannerDescription` registers itself in a context and the content flips between a row and a column from that flag (`src/components/banner.tsx:150-161`, `:457-462`). The narrow-container layout is not ported.
- **Fidelity:** exact for the wide layout and the `:has()` switch, dropped for `@max-sm`.
- **Components it hits:** card (grid header), dialog footer, any part-composed layout that reacts to its own width or to a child.
