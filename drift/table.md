# table

Original: `registry/default/table.tsx` (or `registry/base/` where it exists), demo in `app/docs/table/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/table.tsx`,
demo in `src/demos/table.tsx`.

The source's `app/table/page.tsx` is not the table demo: it is an unlisted stress page (excluded from the sitemap at `app/sitemap.ts:9`), see "Quotes page".

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the table in a `SizeProvider`, and its cells read the context (`registry/default/table.tsx:41-44`, `:49`, `:90-91`, `:180`, `:203`).
- **Port:** An omitted `size` follows the Size row (`src/components/table.tsx:64`); a table inside a compact surface stays at 36px unless `size` is passed.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component that reads `useSize`.

## Semantic markup and prop passthrough

- **Cause:** `not ported yet`.
- **Original:** real `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`; every part takes `className`, a `ref` and the element's HTML attributes (`table.tsx:38-46`, `:98-116`, `:124-168`, `:174-215`), which the site's pages use to align and size columns (`text-center`, `w-[180px]`, `whitespace-nowrap` in `app/table/page.tsx`).
- **Port:** plain `<div>`s with `display: table`, `table-header-group`, `table-row-group`, `table-row` and `table-cell` (`table.tsx:91`, `:104`, `:108`, `:150`, `:186`), no `role`, only `testId`, the `width` prop (the column's preferred width) and two booleans, `alignRight` (`text-right`) and `tabularNums` (`tabular-nums`) (`table.tsx:165-174`, `:189`, `:202`). There is no other cell styling, `className` or `ref`.
- **gpuix lacks:** nothing: `role` and `aria-*` work on any element (`src/components/sidebar.tsx:312` sets `aria-current`; `src/components/tabs.tsx` sets `role`).
- **Workaround:** none.
- **Fidelity:** approximated (looks the same; the table is anonymous to assistive tech, columns cannot be centred or kept on one line, and no cell takes `colSpan` although gpuix supports it).
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
- **gpuix lacks:** nothing known. The table now sizes columns to content, so the Author column on one line and the wrapping Quote column are expressible; 50 hover-registered rows per tab are untested.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** table, tabs-subtle, checkbox.
