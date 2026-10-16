# table

Original: `registry/default/table.tsx`. Ported in `src/components/table.tsx`, demo in `src/demos/table.tsx`.

## Table layout (`<table>`, `border-collapse`)

- **Original:** a real `<table>`: columns auto-size to their widest cell and line up across rows; `border-collapse` shares one rule between adjacent rows.
- **gpuix lacks:** `display: table` and `border-collapse` (taffy has no table boxes, `FORK.md` area C). Grid tracks (`auto`, `max-content`, `fr`) exist and could size columns across rows if every cell sat in one grid; the port has not moved to that.
- **Workaround:** each row is a flex row and every cell is `flexGrow: 1; flexBasis: 0`, so columns are equal width (`table.tsx:107-153`, `:164-166`). `TableHead` / `TableCell` take an optional fixed `width` for a column that should not share. Each row draws its own bottom border (`:145`), a 1px row-height difference from the collapsed original.
- **Fidelity:** approximated (equal columns instead of content-sized ones).
- **Components it hits:** just this one.

## `fontVariationSettings` weight on the header

- **Original:** the header is `wght 550` and the body `400` through a variable font axis.
- **gpuix lacks:** variable-font axes (`StyleDesc` has `fontWeight` and `fontFeatureSettings`, no `fontVariationSettings`).
- **Workaround:** Inter's static cuts only, so the header is SemiBold 600 (`table.tsx:178`, `weight.semibold` in `src/lib/theme.ts:272`).
- **Fidelity:** approximated.
- **Components it hits:** any component using `font-variation-settings`.
