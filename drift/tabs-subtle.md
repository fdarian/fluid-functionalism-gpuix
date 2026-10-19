# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`, demo in `app/docs/tabs-subtle/page.tsx` of the source (fluidfunctionalism.com at
0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tabs-subtle.tsx`, demo in
`src/demos/tabs-subtle.tsx`.

Checked and equal: item height 36 / 28, `px` 12 / 10, icon 16 / 14 and its gap, type 13/20 and 12/18, selected pill
(`active`, dim 0.8, `moderate`), preview pill (`active` at 0.4, `fast`, 60 ms exit, slide back on `moderate`), the
travelling focus ring, manual activation (arrows move focus, Enter / Space select), wrap, Home / End, roving tab stop,
`aria-label` on a collapsed tab, the 60 ms label fade, light and dark tokens, and the label's unfold and fold: `width: "auto"` and `marginLeft` on `spring.fast` with opacity on a 0.06 tween (`src/components/tabs-subtle.tsx:295-300`, `:362-366`), where the source animates a measured `offsetWidth` (`tabs-subtle.tsx:276-296`, `:396-410`) because framer's `auto` misreads under a scaled ancestor. gpuix starts the `auto` clock at the change, so the unfold leaves its start on the commit frame and covers the same share of its travel as the fold at every 8 ms step, and a tab selected at mount is born at its label width (`scripts/check-tabs-subtle.tsx`). Not measured under a retina 2x scale.

## Cap-trimmed label baseline sits a pixel off Chrome's

- **Cause:** `gpuix gap`: paint places the baseline from a box it has already snapped to a device pixel. Full entry in [tabs](tabs.md#cap-trimmed-label-baseline-sits-a-pixel-off-chromes), README "gpuix gaps across components".
- **Original:** `text-box: trim-both cap alphabetic` on the label, centred as a fractional box (`tabs-subtle.tsx`, the label span).
- **Port:** the same trim through `StableLabel` (`src/components/tabs-subtle.tsx:310`). Measured in the offscreen renderer at 1x: 13px in the 36px item, the baseline is row 22 where Chrome's arithmetic gives 23 (caps 0.9px above the centre); 12px in the 28px compact item, row 19 where Chrome gives 18 (0.5px below).
- **gpuix lacks:** a baseline placed from the unsnapped box (`zed/crates/gpui/src/taffy.rs:1665`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** tabs.

## Horizontal overflow: no scroll-into-view

- **Cause:** `not ported yet` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 142: no demo overflows; no gpuix cause).
- **Original:** `overflow-x-auto scrollbar-hide`, with the `-mx-1 px-1` padding giving the focus ring room, and Base UI scrolls a focused tab into view (`tabs-subtle.tsx:166-175`).
- **Port:** the list is the same box (`overflowX: "auto"`, hidden scrollbar, `margin: -4`, `padding: 4`, `maxWidth: calc(100% + 8px)`; `src/components/tabs-subtle.tsx:157-180`), so it scrolls by wheel and the pointer in its padding or past the last tab lights the nearest tab. The tabs and pills sit in an inner box that scrolls with them, because the fluid hover measures rows against its container (`:181-191`). Arrowing to a tab outside the view does not scroll it in: measured, the focused third tab stays at x=199 in a list that ends at 104.
- **Workaround:** none.
- **Fidelity:** approximated (the scroll-into-view is dropped).
- **Components it hits:** just this one.

## Panel: always mounted but hidden, `tabIndex` -1, `aria-controls` on every tab

- **Cause:** `port choice` (c3ba037 follows Base UI, whose panels mount only while selected; the source's own panel is a plain `div` that does not).
- **Original:** every panel exists, `hidden` unless selected, `tabIndex={-1}`, `outline-none`, and with an `idPrefix` every tab has `aria-controls` (`tabs-subtle.tsx:357`, `:435-453`).
- **Port:** only the selected panel mounts, with no `tabIndex`; `aria-controls` is set on the selected tab only (`src/components/tabs-subtle.tsx:279`, `:390-398`, `base-ui:src/tabs/tab/use-tabs-tab.ts:94-96`).
- **Workaround:** none.
- **Fidelity:** approximated (the accessibility tree differs for unselected tabs).
- **Components it hits:** just this one.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the tabs in a `SizeProvider` (`registry/base/tabs-subtle.tsx:47-50`, `:61`, `:264-265`).
- **Port:** An omitted `size` follows the Size row (`src/components/tabs-subtle.tsx:127`).
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` variant.

## API surface: `className`, ref and HTML props

- **Cause:** `port choice` (reason not stated).
- **Original:** `TabsSubtle`, `TabsSubtleItem` and `TabsSubtlePanel` take `className`, forward refs and spread HTML attributes (`tabs-subtle.tsx:40`, `:271-278`, `:425-436`).
- **Port:** props are only the ones in the source's table plus `testId`; no `className`, ref or passthrough (`src/components/tabs-subtle.tsx:94-103`, `:268-273`, `:383-388`).
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
