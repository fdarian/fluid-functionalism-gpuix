# radio-group

Original: `registry/base/radio-group.tsx`, demo in `app/docs/radio-group/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/radio-group.tsx` (row, group and hover machinery shared with checkbox-group in `src/components/choice-group.tsx`), demo in `src/demos/radio-group.tsx`.

Same in both (checked against the code): row height, gap and padding per size, circle 16/14, dot 8/7, 1.5px border, group width 288, the one selected fill springing between rows on `moderate` (`radio-group.tsx:197-213` / `choice-group.tsx:205-216`), no selected fill for the per-item API, selection precedence (value, then item `selected`, then `selectedIndex`), roving tab stop with the first row as fallback, all four arrows move and select and wrap, Home/End select, Space/Enter on keydown, the shared focus ring, dark-mode tokens. The three selection APIs all exist.

## The dot pops in from scale 0.3

- **Cause:** `gpuix gap`. CSS transforms (README "Missing features" row, `README.md:125`, which lists radio-group).
- **Original:** the dot springs from `scale: 0.3, opacity: 0` to full on `spring.fast`, and shrinks out over 0.04 s (`radio-group.tsx:424-430`).
- **Port:** `motion` animates `left` / `top` / `width` / `height` together so the dot stays centred while it grows from 30% of its size (`dotAt`, `radio-group.tsx:119-124`; `DOT_FROM` `:21`; `exit` over `DOT_OUT` 40 ms `:151-152`). `AnimatePresence initial={false}` keeps a row selected at mount at full size, as FF (`:146`, source `:420`).
- **Gpuix lacks:** transforms (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** layout properties instead of a compositor scale.
- **Fidelity:** approximated (same size and timing; the layout is recomputed per frame).
- **Components it hits:** the README row's scale-in entrances: banner, ask-user-questions, chat-message, input-copy, input-message, queued-stack.

## The selected background fades in at mount

- **Cause:** `not ported yet`. `FluidHighlight` always starts at `opacity: 0` and has no way to start in place; `motion` supports `initial={false}`.
- **Original:** the fill mounts with `initial={false}` (`radio-group.tsx:199`), so a group with a default selection shows it at once; opacity uses its own `{ duration: 0.08 }` (`:208-211`).
- **Port:** `FluidHighlight` mounts at `initial={{ opacity: 0, ...rect }}` (`fluid-highlight.tsx:74`), after the first measure, and one transition drives every property, so the opacity rides the 0.16 s `moderate` spring (`choice-group.tsx:212`). The default-selected row's fill fades in on load (code reading, not observed). Moving the selection is the same spring as FF.
- **Workaround:** none.
- **Fidelity:** approximated (late by a fade, only at mount).
- **Components it hits:** checkbox-group (a newly checked row fades in too), and every `FluidHighlight` user for the 0.08 s opacity.

## Circle border changes colour at once

- **Cause:** `not ported yet`. gpuix animates `borderColor` (`~/code/fdarian/gpuix/FORK.md:813-814`); `colorFade` in `theme.ts:310` only names `color`.
- **Original:** `transition-all duration-80` between `border`, neutral-400 (neutral-500 dark) and transparent (`radio-group.tsx:404-413`).
- **Port:** `indicatorBorder` (`choice-group.tsx:338-343`) sets the colour with no transition (`radio-group.tsx:134-145`).
- **Workaround:** none.
- **Fidelity:** approximated (right colours, no 80 ms ease).
- **Components it hits:** checkbox-group.

## Label colour changes at once

- **Cause:** `not ported yet`. `select.tsx:723` and `combobox.tsx:648` already spread `colorFade` for the same kind of label.
- **Original:** `transition-[color,font-variation-settings] duration-80` (`radio-group.tsx:459-471`).
- **Port:** `StableLabel` sets `color` with no transition (`stable-label.tsx:37-48`, used at `choice-group.tsx:326-333`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and the other `StableLabel` rows unless they set a fade.

## Label weight (variable fonts)

- **Cause:** `gpuix gap`. README "Missing features" row for variable-font axes (`README.md:141`).
- **Original:** `'wght' 400` to `'wght' 550` with `opsz` compensation, eased over 80 ms (`radio-group.tsx:466-470`).
- **Port:** static Inter, SemiBold 600 for 550, switches at once; the hidden semibold copy still reserves the width (`stable-label.tsx:36`).
- **Gpuix lacks:** `fontVariationSettings`.
- **Workaround:** static cuts.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and every `StableLabel`.

## Label vertical centring (`text-box-trim`)

- **Cause:** `gpuix gap`. README "Missing features" row for `text-box-trim` (`README.md:140`, filed under badge).
- **Original:** `[text-box:trim-both_cap_alphabetic]` on both label spans (`radio-group.tsx:450,461`).
- **Port:** the label is centred by its full 20 px line box (`stable-label.tsx:36-47`), about a pixel off (the README's figure; not measured here).
- **Gpuix lacks:** `text-box-trim` / `text-box-edge`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group and every `StableLabel`.

## Hover highlight travels on `left` / `top`

- **Cause:** `gpuix gap`. CSS transforms (README "Missing features" row, `README.md:125`; `FORK.md:876-887`).
- **Original:** the highlight is moved with an `x` / `y` transform (`registry/default/fluid-hover-highlight.tsx:74-76,126-131`).
- **Port:** `FluidHighlight` animates `top` / `left` / `width` / `height` (`fluid-highlight.tsx:74-80`). The look is the same.
- **Workaround:** layout properties.
- **Fidelity:** exact in look.
- **Components it hits:** every `FluidHighlight` list.

## Pill shape

- **Cause:** `not ported yet`. The port has one corner scheme (`radius.item` 8, ring 10, `theme.ts:radius`).
- **Original:** `useShape()` picks rounded or pill: row and fill radius 20, ring 22 (`radio-group.tsx:105,199,228`; `shape-context.tsx:51-81`). Rounded, the default, matches the port.
- **Port:** `choice-group.tsx:210,220,320` use `radius.item` only.
- **Workaround:** none.
- **Fidelity:** dropped (pill).
- **Components it hits:** every component that reads `useShape`.

## A surrounding size is ignored

- **Cause:** `not ported yet`.
- **Original:** omitted, `size` follows the surrounding `SizeProvider` (`radio-group.tsx:66-69,255-257`).
- **Port:** `size` defaults to `"default"` (`radio-group.tsx:88`); no size context exists. The items read the group's size, so there is no checkbox-style double `size` here.
- **Workaround:** pass `size` on the group.
- **Fidelity:** dropped (inheritance).
- **Components it hits:** checkbox-group and the other sized components.

## Props: `className`, `ref`, HTML attributes

- **Cause:** `not ported yet`.
- **Original:** both components forward `ref`, `className` and the rest of the `div` props (`radio-group.tsx:61-70,300-306`); the bento preview narrows the group to 220 px.
- **Port:** a fixed `width: 288, maxWidth: "100%"` (`choice-group.tsx:200-201`); `testId` is the only pass-through.
- **Workaround:** none.
- **Fidelity:** dropped (cannot restyle).
- **Components it hits:** checkbox-group.

## Long labels

- **Cause:** `not ported yet`. Code reading, not observed.
- **Original:** the label is an `inline-grid` flex item with no `nowrap`, so a long label wraps inside the row (`radio-group.tsx:446`).
- **Port:** `whiteSpace: "nowrap"` and `flexShrink: 0` (`stable-label.tsx:24,32`): a label wider than the row runs past its right edge.
- **Workaround:** none.
- **Fidelity:** approximated (differs only for labels wider than about 240 px).
- **Components it hits:** checkbox-group and every `StableLabel`.

## A group with `value={undefined}` still reports changes

- **Cause:** `port choice` (reason not stated; the demo relies on it).
- **Original:** the value path is chosen by `value !== undefined` (`radio-group.tsx:259`). A group whose `value` starts `undefined` takes the other path, which passes no `onValueChange` to the items, so clicking a `value` item does nothing (`:283-293`, `:335-340`).
- **Port:** `onValueChange` reaches the items whether or not `value` is set (`radio-group.tsx:82-87`), so the "By value" demo works from an empty state (`src/demos/radio-group.tsx:32-36`).
- **Workaround:** n/a.
- **Fidelity:** exact for every case FF supports; more forgiving in the one it does not.
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `not ported yet` for the missing one; the extras are port additions.
- **Original:** the docs page has one example, Basic: `selectedIndex` mode, Option A/B/C, A selected (`app/docs/radio-group/page.tsx:50-64`). The bento preview uses `value` mode with a default selected, at 220 px (`app/components/bento-previews.tsx:386-396`).
- **Port:** Default (by index), Compact, Per item (Option B selected, no fill) and By value (nothing selected, "Plan: none" readout) (`src/demos/radio-group.tsx:78-97`). Missing: by value with a default selected, narrow width.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
