# tabs

Original: `registry/base/tabs.tsx`, demo in `app/docs/tabs/page.tsx` of the source (fluidfunctionalism.com at 0a0377e,
kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tabs.tsx`, demo in `src/demos/tabs.tsx`.

Checked and equal: track (muted, 12 radius, 4 / 2 pad), item height 28 / 24 and `px` 12, icon 16 / 14 and its gap, type
13/20 and 12/18, selected pill on `moderate` with the 0.85 dim over 80 ms, preview pill at 0.4 on `fast` with its 60 ms
exit and the slide back on `moderate`, the travelling focus ring (outset 2, radius 10, keyboard focus only), arrows /
Home / End with wrap, `activateOnFocus`, disabled tabs that take focus and never select, roving tab stop, ARIA ids,
light and dark tokens (`muted`, `hover`, `surface4`, `foreground`).

## Pill does not lift with the surrounding surface

- **Cause:** `not ported yet`. The ladder exists (`src/lib/surface-context.ts`, read by dialog and popups); tabs does not read it.
- **Original:** the level is `min(useSurface() + 3, 8)`, so inside a dialog (substrate 5) the pill is surface 8, not 4 (`tabs.tsx:194-198`).
- **Port:** always `color.surface4` (`tabs.tsx:243`); in a dialog the pill is the page's step.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component that reads `useSurface` in the source.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the tabs in a `SizeProvider` (`registry/base/tabs.tsx:80-83`, `:173-174`).
- **Port:** An omitted `size` follows the Size row (`src/components/tabs.tsx:85`).
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` variant.

## API surface: index props, `className`, ref and Base UI props

- **Cause:** `port choice` for `selectedIndex` / `onSelect` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md`: FF-only layer, out of scope per lead decision); reason not stated for the rest.
- **Original:** `Tabs` takes `selectedIndex` / `onSelect` and spreads Base UI Root props (`orientation`, ...); `TabsList`, `TabItem` and `TabPanel` take `className`, forward refs and spread Base UI props, `TabItem` composes `onClick` (`tabs.tsx:66-84`, `:182-184`, `:477-490`, `:588-602`).
- **Port:** `Tabs` takes `value`, `onValueChange`, `defaultValue`, `size`; `TabsList` and `TabItem` take `testId`; `TabItem` takes `disabled` explicitly; no `className`, ref or passthrough (`tabs.tsx:85-92`, `:149`, `:302-308`, `:430`). The list is always horizontal.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** tabs-subtle, and most of the port.

## Cap-trimmed label baseline sits a pixel off Chrome's

- **Cause:** `gpuix gap` (README "gpuix gaps across components", Bugs: paint places the baseline from a box it has already snapped to a device pixel).
- **Original:** `text-box: trim-both cap alphabetic` on the label (`tabs.tsx`, the label span). Chrome trims to the cap height as a fractional box (Inter 13px: 9.46px), the flex row centres that box, and the glyph baseline then snaps to a device pixel: the caps are centred on the pill to within a quarter pixel.
- **Port:** the same `textBox: capTrim` on every `StableLabel` copy (`src/lib/stable-label.tsx:61-65`, `src/components/tabs.tsx:351`). Since gpuix #41 the trimmed box keeps its cap height (`zed/crates/gpui/src/elements/text.rs:1114-1135`): a column of 100 trimmed Inter labels is 945px tall at 13px and 874px at 12px, where it was 1000 and 900, and the flex row centres the fractional box (13px in the 28px pill: 9.27..18.73). Painting then snaps the box top to a whole pixel (`zed/crates/gpui/src/taffy.rs:1420-1425`) and lays the line out from that snapped origin (`text.rs:830-832`, `:1221-1250`), so the baseline is `round(snapped top + cap height)`, not Chrome's `round(top + cap height)`. Measured in the offscreen renderer at 1x (a capture of `TabItem` labels "HEHEHE" in Inter Variable; the sharp edge of the capitals is the baseline): 13px, pill 28: top 9.27 snaps to 9, baseline 9 + 9.45 = 18.45 rounds to row 18 where Chrome's 18.73 gives 19, so the caps are 0.9px above the pill centre (ink centre 13.1 against 14). 12px, pill 24: top 7.63 snaps to 8, baseline 8 + 8.73 = 16.73 rounds to row 17 where Chrome's 16.37 gives 16, so the caps are 0.5px below the centre (ink 8..17 against 12). Each is one whole pixel from Chrome's baseline, and the direction depends on where the fraction of the top falls.
- **gpuix lacks:** a baseline placed from the unsnapped box. `Window::layout_unsnapped_bounds` (`zed/crates/gpui/src/taffy.rs:1665`) reads it, but the text paints from the snapped `bounds`. No JS read returns the unsnapped box (`getElementBounds`, `getBoundingClientRect` and `onLayout` are all snapped: the label reads y 9, height 10 for a 9.45 box), and the test renderer has no scale option, so 2x (where the snap is 0.5px) was not measured.
- **Workaround:** none; the label is not nudged, since the error depends on font size and scale.
- **Fidelity:** approximated (the baseline is one pixel from Chrome's at 1x: high at 13px, low at 12px).
- **Components it hits:** tabs-subtle, and any other `capTrim` text that its parent centres (`src/lib/theme.ts:302`).

## Demo: variants, spacing and doc-page furniture

- **Cause:** `port choice` (README: a demo is a `DemoCard` of live variants) for the missing page furniture; `port choice` (reason not stated) for the spacing; the extra variants are port-only.
- **Original:** three variants: Basic, With Icons, Controlled with the `Active:` line. The tabs (list and panel) and the `Active:` line below them are `gap-4` (16px) apart. The page has a description, a code snippet per preview and API tables for Tabs, TabsList, TabItem, TabPanel (`app/docs/tabs/page.tsx:100`, `:102-202`, `:204-218`, `:174`, `:197`).
- **Port:** Basic, With icons and Controlled match in copy. It adds Compact and a Keyboard section with a disabled tab (`src/demos/tabs.tsx:114-139`). The `Active:` line sits 8px under the panel (`:13`, `:109`). No description, snippets or props tables.
- **Workaround:** none.
- **Fidelity:** dropped (docs furniture), approximated (spacing).
- **Components it hits:** every demo.
