# tabs

Original: `registry/base/tabs.tsx`, demo in `app/docs/tabs/page.tsx` of the source (fluidfunctionalism.com at 0a0377e,
kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tabs.tsx`, demo in `src/demos/tabs.tsx`.

Checked and equal: track (muted, 12 radius, 4 / 2 pad), item height 28 / 24 and `px` 12, icon 16 / 14 and its gap, type
13/20 and 12/18, selected pill on `moderate` with the 0.85 dim over 80 ms, preview pill at 0.4 on `fast` with its 60 ms
exit and the slide back on `moderate`, the travelling focus ring (outset 2, radius 10, keyboard focus only), arrows /
Home / End with wrap, `activateOnFocus`, disabled tabs that take focus and never select, roving tab stop, ARIA ids,
light and dark tokens (`muted`, `hover`, `surface4`, `foreground`).

## Selected pill: shadow recipe and edge

- **Cause:** `not ported yet`. gpuix paints several `boxShadow` layers, `inset` and spread from a CSS string (`~/code/fdarian/gpuix/FORK.md:646-649`, `packages/native/js/host.ts:558`); the "one outer shadow" comment is stale.
- **Original:** `surfaceClasses(indicatorLevel)` gives `bg-surface-4` + `shadow-surface-4` (`tabs.tsx:364`, `:198`): light is a 1px outer ring plus drops at 1, 3 and 6px (`app/globals.css:140`), dark adds an inset top highlight, an inset ring and a darker outer ring (`:163`).
- **Port:** `surface4` fill, a 1px inside `borderWidth` in `popupBorder`, and `shadow3()`, one `0 3 3 -1.5` drop (`tabs.tsx:250-253`, `theme.ts:332-340`). That is the shadow-3 recipe cut to its biggest drop, not shadow-4, and the ring sits inside the pill instead of 1px outside it.
- **Workaround:** none.
- **Fidelity:** approximated (lighter drop, no 6px layer, no dark inset highlight, ring inside).
- **Components it hits:** dropdown, mobile-drawer, queued-stack, command-menu (everything on `shadow3()`).

## Pill does not lift with the surrounding surface

- **Cause:** `not ported yet`. The port has no surface context.
- **Original:** the level is `min(useSurface() + 3, 8)`, so inside a dialog (substrate 5) the pill is surface 8, not 4 (`tabs.tsx:194-198`).
- **Port:** always `color.surface4` (`tabs.tsx:250`); in a dialog the pill is the page's step.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component that reads `useSurface` in the source.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the tabs in a `SizeProvider` (`registry/base/tabs.tsx:80-83`, `:173-174`).
- **Port:** An omitted `size` follows the Size row (`src/components/tabs.tsx:101`).
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` variant.

## Colour and stroke width switch at once

- **Cause:** `not ported yet`. gpuix eases colour (`colorFade`, `Icon`'s `fade`, `theme.ts:310-314`) and animates `strokeWidth` on `motion.path` (`host.ts:296-298`; BASE-UI-AUDIT row 529).
- **Original:** label colour and font weight ease over 80 ms (`transition-[color,font-variation-settings] duration-80`, `tabs.tsx:565`); icon colour and stroke width 1.5 to 2 ease over 80 ms (`:546`).
- **Port:** `Icon` is called without `fade` and bakes the stroke width into its SVG source (`tabs.tsx:404-409`, `src/lib/icon.tsx:9-23`); `StableLabel` has no transition (`stable-label.tsx:37-46`). Both change on the frame the hover or selection does.
- **Workaround:** none.
- **Fidelity:** approximated (the 80 ms ease is dropped).
- **Components it hits:** tabs-subtle, select, sidebar, menu rows (anything with a `StableLabel` or the 1.5 to 2 stroke).

## Semibold is SemiBold 600, not variable 550

- **Cause:** `gpuix gap` (README "Missing features": variable-font axes).
- **Original:** `fontVariationSettings` `wght 550, opsz 18` for the selected label, `wght 400, opsz 14` otherwise (`registry/default/lib/font-weight.ts:19-23`, `tabs.tsx:570-574`).
- **Port:** static cuts, 600 selected and 400 otherwise, switching at once (`theme.ts:276-278`, `stable-label.tsx:21-25`).
- **gpuix lacks:** variable axes; only a font's default instance renders.
- **Workaround:** the hidden 600 copy still reserves the width, so nothing shifts.
- **Fidelity:** approximated (one weight step, no `opsz`).
- **Components it hits:** tabs-subtle, card, table, sidebar, menu rows.

## No `text-box-trim` on the label

- **Cause:** `gpuix gap` (README "Missing features": `text-box-trim`).
- **Original:** both label spans carry `[text-box:trim-both_cap_alphabetic]` (`tabs.tsx:557`, `:565`).
- **Port:** the label is centred by its 20px line box (`stable-label.tsx:36-46`). For Inter that should land within a pixel of cap-centred; not measured.
- **gpuix lacks:** `text-box-trim` / `text-box-edge`.
- **Workaround:** flex centring in the fixed-height tab.
- **Fidelity:** approximated.
- **Components it hits:** badge, tabs-subtle, anything with a trimmed label.

## Preview pill after resting on the selected tab starts at the old rect

- **Cause:** `not ported yet`.
- **Original:** with the pointer over the selected tab the preview fades in place and unmounts, so the next hover mounts it again at the selected pill and slides it out (`tabs.tsx:391-437`).
- **Port:** the preview stays mounted; with the pointer inside it keeps the rect it last had, invisible (`tabs.tsx:196-198`). Hovering Favorites, then the selected Library, then Settings slides it from Favorites to Settings, not from Library.
- **Workaround:** none; it only shows when the pointer rests on the selected tab between two other tabs.
- **Fidelity:** approximated.
- **Components it hits:** tabs-subtle (same memo).

## No optimistic pill on click

- **Cause:** `port choice` (reason not stated; Solid signals commit synchronously, so a click already moves the pill).
- **Original:** a click sets `optimisticIdx` so the pill moves before a controlled parent round-trips, and it re-syncs only when the resolved selection changes (`tabs.tsx:266-277`, `:511-514`). A parent that vetoes the change leaves the pill on the clicked tab.
- **Port:** the pill follows `selected()` (`tabs.tsx:98`, `:176`), so a vetoed click leaves it on the selected tab.
- **Workaround:** none.
- **Fidelity:** exact except for the vetoed-change case.
- **Components it hits:** just this one.

## API surface: index props, `className`, ref and Base UI props

- **Cause:** `port choice` for `selectedIndex` / `onSelect` (BASE-UI-AUDIT: FF-only layer, out of scope per lead decision); reason not stated for the rest.
- **Original:** `Tabs` takes `selectedIndex` / `onSelect` and spreads Base UI Root props (`orientation`, ...); `TabsList`, `TabItem` and `TabPanel` take `className`, forward refs and spread Base UI props, `TabItem` composes `onClick` (`tabs.tsx:66-84`, `:182-184`, `:477-490`, `:588-602`).
- **Port:** `Tabs` takes `value`, `onValueChange`, `defaultValue`, `size`; `TabsList` and `TabItem` take `testId`; `TabItem` takes `disabled` explicitly; no `className`, ref or passthrough (`tabs.tsx:83-90`, `:147`, `:297-303`, `:424`). The list is always horizontal.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** tabs-subtle, and most of the port.

## Demo: variants, spacing and doc-page furniture

- **Cause:** `port choice` (README: a demo is a `DemoCard` of live variants) for the missing page furniture; `port choice` (reason not stated) for the spacing; the extra variants are port-only.
- **Original:** three variants: Basic, With Icons, Controlled with the `Active:` line. The tabs (list and panel) and the `Active:` line below them are `gap-4` (16px) apart. The page has a description, a code snippet per preview and API tables for Tabs, TabsList, TabItem, TabPanel (`app/docs/tabs/page.tsx:100`, `:102-202`, `:204-218`, `:174`, `:197`).
- **Port:** Basic, With icons and Controlled match in copy. It adds Compact and a Keyboard section with a disabled tab (`src/demos/tabs.tsx:119-145`). The `Active:` line sits 8px under the panel (`:14`, `:110`). No description, snippets or props tables.
- **Workaround:** none.
- **Fidelity:** dropped (docs furniture), approximated (spacing).
- **Components it hits:** every demo.
