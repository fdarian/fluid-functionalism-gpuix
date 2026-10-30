# radio-group

Original: `registry/base/radio-group.tsx`, demo in `app/docs/radio-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/radio-group.tsx` (row, group and hover machinery shared with checkbox-group in `src/components/choice-group.tsx`), demo in `src/demos/radio-group.tsx`.

Same in both (checked against the code): row height, gap and padding per size, circle 16/14, dot 8/7, 1.5px border, group width 288, the one selected fill springing between rows on `moderate` (`radio-group.tsx:58-62` / `ChoiceGroup` in `choice-group.tsx:206-222`), the dot popping in from scale 0.3 and opacity 0 on `spring.fast` and out over 0.04 s (`RadioDot`), no selected fill for the per-item API, selection precedence (value, then item `selected`, then `selectedIndex`), roving tab stop with the first row as fallback, all four arrows move and select and wrap, Home/End select, Space/Enter on keydown, the shared focus ring, dark-mode tokens. The three selection APIs all exist.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the group in a `SizeProvider` (`registry/base/radio-group.tsx:255-257`).
- **Port:** An omitted `size` follows the Size row (`src/components/radio-group.tsx:66`); the items read the group's size, so there is no checkbox-style double `size` here.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and the other sized components.

## Props: `className`, `ref`, HTML attributes

- **Cause:** `not ported yet`. Same drift as [checkbox-group.md, "Props: `className`, `ref`, HTML attributes"](checkbox-group.md#props-classname-ref-html-attributes), where the entry lives. Here: source `radio-group.tsx:61-70,300-306`; the port's fixed `width: 288` is `choice-group.tsx:201`.

## A group with `value={undefined}` still reports changes

- **Cause:** `port choice` (reason not stated; the demo relies on it).
- **Original:** the value path is chosen by `value !== undefined` (`radio-group.tsx:259`). A group whose `value` starts `undefined` takes the other path, which passes no `onValueChange` to the items, so clicking a `value` item does nothing (`:283-293`, `:335-340`).
- **Port:** `onValueChange` reaches the items whether or not `value` is set (`radio-group.tsx:52-56`), so the "By value" demo works from an empty state (`src/demos/radio-group.tsx:32-36`).
- **Workaround:** n/a.
- **Fidelity:** exact for every case FF supports; more forgiving in the one it does not.
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `port choice` (the extras are port additions).
- **Original:** the docs page has one example, Basic: `selectedIndex` mode, Option A/B/C, A selected (`app/docs/radio-group/page.tsx:50-64`). The bento preview uses `value` mode with a default selected, at 220 px (`app/components/bento-previews.tsx:386-396`).
- **Port:** Default (by index), Compact, Per item (Option B selected, no fill), By value (nothing selected, "Plan: none" readout) and "Narrow, default" (the bento preview's five rows in `value` mode, "Moderate spring" selected, in a 220 px wrapper the group's `maxWidth: 100%` shrinks to) (`src/demos/radio-group.tsx`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
