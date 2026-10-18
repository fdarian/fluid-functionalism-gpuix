# radio-group

Original: `registry/base/radio-group.tsx`, demo in `app/docs/radio-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/radio-group.tsx` (row, group and hover machinery shared with checkbox-group in `src/components/choice-group.tsx`), demo in `src/demos/radio-group.tsx`.

Same in both (checked against the code): row height, gap and padding per size, circle 16/14, dot 8/7, 1.5px border, group width 288, the one selected fill springing between rows on `moderate` (`radio-group.tsx:58-62` / `ChoiceGroup` in `choice-group.tsx:206-222`), no selected fill for the per-item API, selection precedence (value, then item `selected`, then `selectedIndex`), roving tab stop with the first row as fallback, all four arrows move and select and wrap, Home/End select, Space/Enter on keydown, the shared focus ring, dark-mode tokens. The three selection APIs all exist.

## The dot pops in from scale 0.3

- **Cause:** `gpuix gap`. CSS transforms (README "Missing features" row, `README.md:239`, which lists radio-group).
- **Original:** the dot springs from `scale: 0.3, opacity: 0` to full on `spring.fast`, and shrinks out over 0.04 s (`radio-group.tsx:424-430`).
- **Port:** `motion` animates `left` / `top` / `width` / `height` together so the dot stays centred while it grows from 30% of its size (`dotAt`, `radio-group.tsx:92-97`, `:122-126`; `DOT_FROM` `:25`; `exit` over `DOT_OUT` 40 ms `:125-126`). `AnimatePresence initial={false}` keeps a row selected at mount at full size, as FF (`:120`, source `:420`).
- **Gpuix lacks:** transforms (`~/code/fdarian/gpuix/FORK.md:1198-1209`).
- **Workaround:** layout properties instead of a compositor scale.
- **Fidelity:** approximated (same size and timing; the layout is recomputed per frame).
- **Components it hits:** the README row's scale-in entrances: banner, ask-user-questions, chat-message, input-copy, input-message, queued-stack.

## Label weight (variable fonts)

- **Cause:** `gpuix gap`. README "Missing features" row for variable-font axes (`README.md:254`).
- **Original:** `'wght' 400` to `'wght' 550` with `opsz` compensation, eased over 80 ms (`radio-group.tsx:466-470`).
- **Port:** static Inter, SemiBold 600 for 550, switches at once; the hidden semibold copy still reserves the width (`stable-label.tsx:70-71`).
- **Gpuix lacks:** `fontVariationSettings`.
- **Workaround:** static cuts.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and every `StableLabel`.

## Label vertical centring (`text-box-trim`)

- **Cause:** `gpuix gap`. README "Missing features" row for `text-box-trim` (`README.md:253`, filed under badge).
- **Original:** `[text-box:trim-both_cap_alphabetic]` on both label spans (`radio-group.tsx:450,461`).
- **Port:** the label is centred by its full 20 px line box (`stable-label.tsx:70-81`), about a pixel off (the README's figure; not measured here).
- **Gpuix lacks:** `text-box-trim` / `text-box-edge`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and every `StableLabel`.

## Hover highlight travels on `left` / `top`

- **Cause:** `gpuix gap`. CSS transforms (README "Missing features" row, `README.md:239`; `FORK.md:1198-1209`).
- **Original:** the highlight is moved with an `x` / `y` transform (`registry/default/fluid-hover-highlight.tsx:74-76,126-131`).
- **Port:** `FluidHighlight` animates `top` / `left` / `width` / `height` (`fluid-highlight.tsx:92-99`). The look is the same.
- **Workaround:** layout properties.
- **Fidelity:** exact in look.
- **Components it hits:** every `FluidHighlight` list.

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
