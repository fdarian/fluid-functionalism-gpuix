# table

Original: `registry/default/table.tsx` (or `registry/base/` where it exists), demo in `app/docs/table/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/table.tsx`,
demo in `src/demos/table.tsx`.

The source's `app/table/page.tsx` is not the table demo: it is an unlisted stress page (excluded from the sitemap at `app/sitemap.ts:9`), see "Quotes page".

## Table layout (`<table>`, `border-collapse`)

- **Cause:** `gpuix gap`.
- **Original:** a real `<table>` with `w-full border-collapse` (`table.tsx:81`): columns auto-size to their widest cell and line up across rows; one rule is shared between adjacent rows.
- **Port:** a column of flex rows, each cell `flexGrow: 1; flexBasis: 0` (`table.tsx:107-153`, `:162-173`), so columns are equal width. `TableHead` / `TableCell` take an optional fixed `width` (`:164-166`). Each row draws its own bottom border (`:145`); the port's rows are 36px + a 1px rule, the collapsed original's row height was not measured.
- **gpuix lacks:** `display: table` and `border-collapse` (taffy has no table boxes, `~/code/fdarian/gpuix/FORK.md` area C; README row `README.md:244`). Grid tracks (`auto`, `max-content`, `fr`) exist and could size columns across rows if every cell sat in one grid; the port has not moved to that.
- **Workaround:** equal columns plus the optional fixed `width`.
- **Fidelity:** approximated (equal columns instead of content-sized ones).
- **Components it hits:** just this one.

## Header weight: `wght 550` / `opsz 18`

- **Cause:** `gpuix gap`.
- **Original:** header rows set `fontVariationSettings` to `fontWeights.semibold` (`wght 550, opsz 18`) and body rows to `fontWeights.normal` (`wght 400, opsz 14`) on the `<tr>` (`table.tsx:158-165`).
- **Port:** `fontWeight: weight.semibold` (600) for header cells, 400 for body, on the cell `<text>` (`table.tsx:178`, `src/lib/theme.ts:375`).
- **gpuix lacks:** variable-font axes (`StyleDesc` has `fontWeight` and `fontFeatureSettings`, no `fontVariationSettings`); `README.md:254`, `:334`.
- **Workaround:** Inter's static cuts only; no `opsz`.
- **Fidelity:** approximated (600 for 550, no optical size).
- **Components it hits:** every component using `font-variation-settings`.

## Highlight travel runs on `top` / `left`

- **Cause:** `gpuix gap` (no transforms; `README.md:237`).
- **Original:** the highlight is pinned to the corner and moved with `x` / `y` transforms on `spring.fast`, width and height as layout (`registry/default/fluid-hover-highlight.tsx:74-77`, `:130-133`).
- **Port:** `top` / `left` / `width` / `height` on the same spring (`src/lib/fluid-highlight.tsx:6-13`, `:81-88`).
- **gpuix lacks:** CSS transforms.
- **Workaround:** the layout properties `motion` can animate.
- **Fidelity:** approximated (same motion, but it re-lays out each frame).
- **Components it hits:** every fluid-hover list.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the table in a `SizeProvider`, and its cells read the context (`registry/default/table.tsx:41-44`, `:49`, `:90-91`, `:180`, `:203`).
- **Port:** An omitted `size` follows the Size row (`src/components/table.tsx:50`, `:57`); a table inside a compact surface stays at 36px unless `size` is passed.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component that reads `useSize`.

## Semantic markup and prop passthrough

- **Cause:** `not ported yet`.
- **Original:** real `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`; every part takes `className`, a `ref` and the element's HTML attributes (`table.tsx:39-47`, `:99-117`, `:125-170`, `:176-217`), which the site's pages use to align and size columns (`text-center`, `w-[180px]`, `whitespace-nowrap` in `app/table/page.tsx`).
- **Port:** plain `<div>` rows and cells with no `role`, only `testId`, the `width` prop and two booleans, `alignRight` (`text-right`) and `tabularNums` (`tabular-nums`) (`table.tsx:50-54`, `:107-111`, `:155`, `:187-199`). There is no other cell styling, `className` or `ref`.
- **gpuix lacks:** nothing: `role` and `aria-*` work on any element (`src/components/sidebar.tsx:312` sets `aria-current`; `src/components/tabs.tsx` sets `role`).
- **Workaround:** none.
- **Fidelity:** approximated (looks the same; the table is anonymous to assistive tech, columns cannot be centred or kept on one line).
- **Components it hits:** any ported component that dropped `className` passthrough.

## Demo variants

- **Cause:** `port choice` (reason not stated).
- **Original:** the docs page has one preview, "Basic" (Name / Role / Status, Alice, Bob, Carol), a description "Data table with row hover effects and semantic markup.", a code tab and API tables for `Table` and `TableRow` (`app/docs/table/page.tsx:56-103`).
- **Port:** the same three rows in a "Basic" card, plus a "Compact" card the source page lacks (`src/demos/table.tsx:46-55`); no description, code or API tables.
- **Workaround:** n/a.
- **Fidelity:** exact for Basic; Compact is an addition.
- **Components it hits:** every demo (docs chrome).

## Quotes page (`app/table`) is not ported

- **Cause:** `not ported yet`.
- **Original:** an unlisted showcase, not the docs demo: a "Quotes" title (22px bold), `TabsSubtle` over five categories (Wisdom, Ambition, Love & Life, Creativity, Philosophy), and per tab a table of 50 rows with a centred 50px "Saved" column holding an animated checkbox, a 180px Author column on one line, and a wrapping Quote column (`app/table/page.tsx:285-447`).
- **Port:** no counterpart.
- **gpuix lacks:** nothing known. Wrapping long text in an equal-width flex cell and 50 hover-registered rows per tab are untested.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** table, tabs-subtle, checkbox.
