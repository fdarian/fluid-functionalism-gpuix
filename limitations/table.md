# table

Original: `registry/default/table.tsx`. Ported in `src/components/table.tsx`, demo in `src/demos/table.tsx`.

Table, header/body rows, the fluid hover highlight, the fading row rules, the muted-to-foreground cell lift and the compact size are all ported.

## Table layout (`<table>`, `border-collapse`, content-sized columns)

- **Original:** a real `<table>`: columns auto-size to their widest cell and line up across rows; `border-collapse` shares one rule between adjacent rows.
- **gpuix lacks:** a table layout mode. `StyleDesc` has `display`, flex and a numeric `gridTemplateColumns` count (`packages/native/js/host.ts:178`), but no `auto` / `fr` track sizing and no per-column content measurement across rows. Missing feature.
- **Workaround:** each row is a flex row and every cell is `flexGrow: 1; flexBasis: 0`, so columns are equal width. `TableHead` / `TableCell` take an optional fixed `width` for a column that should not share. Each row draws its own bottom border (a 1px row-height difference from the collapsed original).
- **Fidelity:** approximated (equal columns instead of content-sized ones).
- **Components it hits:** just this one.

## `transition-[border-color]` and `transition-colors` on the rule and cell text

- **Original:** the row rules fade out over 80 ms as the highlight arrives, and cell text eases from muted to foreground.
- **gpuix lacks:** colour transitions. Only `motion` animates, and only `width`/`height`/`opacity`/`top`/`left`/`right`/`bottom`/`borderRadius` (`MotionStyle`, `host.ts:27`). Missing feature, already listed in the README translation table for `transition-colors`.
- **Workaround:** rule colour and text colour switch instantly with the highlighted row.
- **Fidelity:** dropped (the fade only).
- **Components it hits:** every component with `transition-colors`.

## `group-[.is-active]/row:` (a cell reacting to its row's state)

- **Original:** a descendant selector on a class the row sets, resolved by CSS.
- **gpuix lacks:** descendant / group selectors; `hover` and `active` only apply to the element itself.
- **Workaround:** a Solid context on the row exposes `lit()`, and each cell reads it. The lit state comes from the fluid-hover signal, not from pointer hover on the row, so it follows `pickNearest` exactly like the highlight.
- **Fidelity:** exact.
- **Components it hits:** any with `group-hover` (known, see the README) — here it needed a context rather than a per-element signal.

## `fontVariationSettings` weight on the row

- Known: no variable-font axis. The header is `fontWeight: 550` and body `400`, Inter has static cuts only, so 550 resolves to SemiBold 600.
