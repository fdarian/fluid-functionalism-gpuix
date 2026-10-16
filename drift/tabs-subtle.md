# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`, demo in `app/docs/tabs-subtle/page.tsx` of the source (fluidfunctionalism.com at
0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tabs-subtle.tsx`, demo in
`src/demos/tabs-subtle.tsx`.

Checked and equal: item height 36 / 28, `px` 12 / 10, icon 16 / 14 and its gap, type 13/20 and 12/18, selected pill
(`active`, dim 0.8, `moderate`), preview pill (`active` at 0.4, `fast`, 60 ms exit, slide back on `moderate`), the
travelling focus ring, manual activation (arrows move focus, Enter / Space select), wrap, Home / End, roving tab stop,
`aria-label` on a collapsed tab, the 60 ms label fade, light and dark tokens.

## `width` cannot animate to `auto`, so the unfolding label's width is measured

- **Cause:** `gpuix gap`.
- **Original:** `width` animates to `offsetWidth` read through a `ResizeObserver`, with a separate `marginLeft` (`tabs-subtle.tsx:286-296`, `:396-410`).
- **Port:** the box holding the label reports its width through `onLayout` (`tabs-subtle.tsx:429-434`) and the outer box animates `width` to that number, with `marginLeft` 0 to 8 (6 compact) and `opacity` on the same box (`labelTarget`, `:302-307`, `:410`). The tab selected at mount is born unfolded: until the first report it keeps a plain `width: "auto"` style (`:417-421`), and the first measured width is placed with a snap (`labelTransition`, `:309-312`). `onMotionComplete` calls `hover.remeasure()` (`:412`) so the pill and neighbours refresh once the label settles. Width and margin ride `spring.fast` both ways with opacity on a 0.06 tween, as the source does (`:309-312`).
- **gpuix lacks:** `width: "auto"` as a motion target (it throws; `~/code/fdarian/gpuix/FORK.md:867-871`: taffy reports a content size inside a width already decided, not a max-content width). `height: "auto"` works.
- **Workaround:** as above.
- **Fidelity:** exact for the label width.
- **Components it hits:** accordion, sidebar sub-menu, any component that animates width to a content size.

## Hover region: the list hugs its tabs

- **Cause:** `port choice` (reason not stated).
- **Original:** the list is a block `flex` with `-mx-1 px-1 -my-1 py-1` and `max-w-[calc(100%+8px)]`, so in a column parent it is as wide as the parent and 4px taller on each side (`tabs-subtle.tsx:166-175`). With `axis: "x"` the pointer anywhere along that row, including empty space to the right of the last tab or 4px above the tabs, lights the nearest tab.
- **Port:** `alignSelf: "flex-start"` and no padding, so the list is only the tabs (`tabs-subtle.tsx:167-174`); the pointer outside the tabs lights nothing.
- **Workaround:** none.
- **Fidelity:** approximated (looks the same at rest).
- **Components it hits:** just this one (tabs hugs its content in the source too).

## Horizontal overflow

- **Cause:** `not ported yet` (BASE-UI-AUDIT row 141: no demo overflows; no gpuix cause).
- **Original:** `overflow-x-auto scrollbar-hide`, with the `-mx-1 px-1` padding giving the focus ring room, and Base UI scrolls a focused tab into view (`tabs-subtle.tsx:166-175`).
- **Port:** no scroller, no scroll-into-view; a list wider than its parent overflows (`tabs-subtle.tsx:167-174`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Panel: always mounted but hidden, `tabIndex` -1, `aria-controls` on every tab

- **Cause:** `port choice` (c3ba037 follows Base UI, whose panels mount only while selected; the source's own panel is a plain `div` that does not).
- **Original:** every panel exists, `hidden` unless selected, `tabIndex={-1}`, `outline-none`, and with an `idPrefix` every tab has `aria-controls` (`tabs-subtle.tsx:357`, `:435-453`).
- **Port:** only the selected panel mounts, with no `tabIndex`; `aria-controls` is set on the selected tab only (`tabs-subtle.tsx:347`, `:431-448`).
- **Workaround:** none.
- **Fidelity:** approximated (the accessibility tree differs for unselected tabs).
- **Components it hits:** just this one.

## Colour and stroke width switch at once, semibold is 600, no `text-box-trim`

- **Cause:** `not ported yet` for the 80 ms colour and stroke-width ease (`Icon` `fade`, `theme.ts:310-314`; `motion.path` `strokeWidth`, `host.ts:296-298`); `gpuix gap` for the variable weight and for `text-box-trim` (README "Missing features").
- **Original:** `transition-[color,stroke-width] duration-80` on the icon, `transition-[color,font-variation-settings] duration-80` on the label with `wght 550 / opsz 18`, both spans trimmed (`tabs-subtle.tsx:327-335`, `:376-377`, `:320`).
- **Port:** `Icon` has no `fade` and `StableLabel` no transition (`tabs-subtle.tsx:380-389`, `:324-331`); SemiBold 600 (`theme.ts:276-278`); line-box centring. Details in `drift/tabs.md`.
- **gpuix lacks:** variable-font axes and `text-box-trim` only.
- **Workaround:** the hidden 600 copy reserves the width.
- **Fidelity:** approximated.
- **Components it hits:** tabs, select, sidebar, menu rows.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the tabs in a `SizeProvider` (`registry/base/tabs-subtle.tsx:47-50`, `:61`, `:264-265`).
- **Port:** An omitted `size` follows the Size row (`src/components/tabs-subtle.tsx:122`).
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` variant.

## API surface: `className`, ref and HTML props

- **Cause:** `port choice` (reason not stated).
- **Original:** `TabsSubtle`, `TabsSubtleItem` and `TabsSubtlePanel` take `className`, forward refs and spread HTML attributes (`tabs-subtle.tsx:40`, `:271-278`, `:425-436`).
- **Port:** props are only the ones in the source's table plus `testId`; no `className`, ref or passthrough (`tabs-subtle.tsx:91-101`, `:249-254`, `:431-436`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** tabs, and most of the port.

## Demo: variants, spacing and doc-page furniture

- **Cause:** `port choice` (README: a demo is a `DemoCard` of live variants) for the missing page furniture; `port choice` (reason not stated) for the spacing; the extra variants are port-only.
- **Original:** three variants: Basic, With Icons, Active Label. Panels are `px-3` under a `gap-4` (16px) column. The page has a description ("Tab navigation with smooth pill animations."), code snippets and API tables for TabsSubtle, TabsSubtleItem, TabsSubtlePanel (`app/docs/tabs-subtle/page.tsx:147`, `:149-242`, `:244-254`, `:151`, `:168`).
- **Port:** Basic, With icons and Active label match in copy (`TABS`, "{label} content goes here."). It adds Compact and a Keyboard section (`src/demos/tabs-subtle.tsx:142-188`). A panel is 8px (section gap) + 4px (`paddingTop`) under the list, 12px not 16, with `paddingLeft` 12 (`:26`, `:37`). The card title is `TabsSubtle`, the nav title `Tabs Subtle` (`:45`, `:55`). No description, snippets or props tables.
- **Workaround:** none.
- **Fidelity:** dropped (docs furniture), approximated (spacing).
- **Components it hits:** every demo.
