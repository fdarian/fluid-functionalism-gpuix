# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`, demo in `app/docs/tabs-subtle/page.tsx` of the source (fluidfunctionalism.com at
0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tabs-subtle.tsx`, demo in
`src/demos/tabs-subtle.tsx`.

Checked and equal: item height 36 / 28, `px` 12 / 10, icon 16 / 14 and its gap, type 13/20 and 12/18, selected pill
(`active`, dim 0.8, `moderate`), preview pill (`active` at 0.4, `fast`, 60 ms exit, slide back on `moderate`), the
travelling focus ring, manual activation (arrows move focus, Enter / Space select), wrap, Home / End, roving tab stop,
`aria-label` on a collapsed tab, the 60 ms label fade, light and dark tokens.

## The unfolding label starts a frame late

- **Cause:** `gpuix gap`.
- **Original:** `width` animates to `offsetWidth`, kept current by a `ResizeObserver`, with a separate `marginLeft`; framer's own `auto` misreads under a scaled ancestor, hence the measuring (`tabs-subtle.tsx:276-296`, `:396-410`). The measured number is known before the label unfolds, so the spring starts on the frame of the selection.
- **Port:** the box holding the label animates `width` to `"auto"` with `marginLeft` 0 to 8 (6 compact) and `opacity` on the same box (`labelTarget`, `src/components/tabs-subtle.tsx:302-306`, `:372-375`); the label sits in a `flexShrink: 0` box inside it so it is not squeezed while the width is small. The tab selected at mount is born unfolded: its width is placed with a snap (`labelTransition`, `:307-310`). `onMotionComplete` calls `hover.remeasure()` (`:375`) so the pill and neighbours refresh once the label settles. Width and margin ride `spring.fast` both ways with opacity on a 0.06 tween, as the source does.
- **gpuix lacks:** an `auto` width target at once: its content width needs an extra layout, so an unfold starts one frame (16 ms) after the selection. `scripts/check-tabs-subtle.tsx` reads 40, 42, 55, 72, 84 at 16 ms steps where the measured number read 40, 53, 70, 83, 89; folding is the same either way (`~/code/fdarian/gpuix/README.md:1522-1531`).
- **Workaround:** none; the earlier port measured the label through `onLayout` and animated to that number, which had no lag but needed a signal, a second box and a first-frame `width: "auto"` style.
- **Fidelity:** exact in the curve, the end widths and the fold; the unfold begins a frame late.
- **Components it hits:** any component that animates a width to a content size.

## Horizontal overflow: no scroll-into-view

- **Cause:** `not ported yet` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 142: no demo overflows; no gpuix cause).
- **Original:** `overflow-x-auto scrollbar-hide`, with the `-mx-1 px-1` padding giving the focus ring room, and Base UI scrolls a focused tab into view (`tabs-subtle.tsx:166-175`).
- **Port:** the list is the same box (`overflowX: "auto"`, hidden scrollbar, `margin: -4`, `padding: 4`, `maxWidth: calc(100% + 8px)`; `src/components/tabs-subtle.tsx:159-182`), so it scrolls by wheel and the pointer in its padding or past the last tab lights the nearest tab. The tabs and pills sit in an inner box that scrolls with them, because the fluid hover measures rows against its container (`:183-193`). Arrowing to a tab outside the view does not scroll it in: measured, the focused third tab stays at x=199 in a list that ends at 104.
- **Workaround:** none.
- **Fidelity:** approximated (the scroll-into-view is dropped).
- **Components it hits:** just this one.

## Panel: always mounted but hidden, `tabIndex` -1, `aria-controls` on every tab

- **Cause:** `port choice` (c3ba037 follows Base UI, whose panels mount only while selected; the source's own panel is a plain `div` that does not).
- **Original:** every panel exists, `hidden` unless selected, `tabIndex={-1}`, `outline-none`, and with an `idPrefix` every tab has `aria-controls` (`tabs-subtle.tsx:357`, `:435-453`).
- **Port:** only the selected panel mounts, with no `tabIndex`; `aria-controls` is set on the selected tab only (`src/components/tabs-subtle.tsx:281`, `:400-408`, `base-ui:src/tabs/tab/use-tabs-tab.ts:94-96`).
- **Workaround:** none.
- **Fidelity:** approximated (the accessibility tree differs for unselected tabs).
- **Components it hits:** just this one.

## Semibold is 600, no `text-box-trim`

- **Cause:** `gpuix gap` for the variable weight and for `text-box-trim` (README "Missing features").
- **Original:** the label is `wght 550 / opsz 18` when selected and eases that weight with its colour over 80 ms, both spans trimmed (`tabs-subtle.tsx:327-335`, `:320`).
- **Port:** SemiBold 600 switching at once (`theme.ts:370`), line-box centring. The colour and stroke-width eases are ported (`fade` on `StableLabel` and `Icon`, `easeStroke`). Details in `drift/tabs.md`.
- **gpuix lacks:** variable-font axes and `text-box-trim` only.
- **Workaround:** the hidden 600 copy reserves the width.
- **Fidelity:** approximated.
- **Components it hits:** tabs, select, sidebar, menu rows.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the tabs in a `SizeProvider` (`registry/base/tabs-subtle.tsx:47-50`, `:61`, `:264-265`).
- **Port:** An omitted `size` follows the Size row (`src/components/tabs-subtle.tsx:129`).
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` variant.

## API surface: `className`, ref and HTML props

- **Cause:** `port choice` (reason not stated).
- **Original:** `TabsSubtle`, `TabsSubtleItem` and `TabsSubtlePanel` take `className`, forward refs and spread HTML attributes (`tabs-subtle.tsx:40`, `:271-278`, `:425-436`).
- **Port:** props are only the ones in the source's table plus `testId`; no `className`, ref or passthrough (`src/components/tabs-subtle.tsx:96-105`, `:270-275`, `:393-398`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** tabs, and most of the port.

## Demo: variants, spacing and doc-page furniture

- **Cause:** `port choice` (README: a demo is a `DemoCard` of live variants) for the missing page furniture; `port choice` (reason not stated) for the spacing; the extra variants are port-only.
- **Original:** three variants: Basic, With Icons, Active Label. Panels are `px-3` under a `gap-4` (16px) column. The page has a description ("Tab navigation with smooth pill animations."), code snippets and API tables for TabsSubtle, TabsSubtleItem, TabsSubtlePanel (`app/docs/tabs-subtle/page.tsx:147`, `:149-242`, `:244-254`, `:151`, `:168`).
- **Port:** Basic, With icons and Active label match in copy (`TABS`, "{label} content goes here."). It adds Compact and a Keyboard section (`src/demos/tabs-subtle.tsx:142-188`). A panel is 8px (section gap) + 4px (`paddingTop`) under the list, 12px not 16, with `paddingLeft` 12 (`:33`). The card title is `TabsSubtle`, the nav title `Tabs Subtle` (`:41`, `:52`). No description, snippets or props tables.
- **Workaround:** none.
- **Fidelity:** dropped (docs furniture), approximated (spacing).
- **Components it hits:** every demo.
