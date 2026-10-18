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

## Cap-trimmed label sits up to 1px above the pill centre

- **Cause:** `gpuix gap` (README "gpuix gaps across components", Bugs: a trimmed text box rounds up to whole device pixels).
- **Original:** `text-box: trim-both cap alphabetic` on the label (`tabs.tsx`, the label span). Chrome trims to the cap height as a fractional box (Inter 13px: 9.46px), the flex row centres that box, and the glyph baseline then snaps to a device pixel: the caps are centred on the pill to within a quarter pixel.
- **Port:** the same `textBox: capTrim` on both `StableLabel` copies (`src/lib/stable-label.tsx:52-56`, `src/components/tabs.tsx:351`). gpuix trims to the exact cap height (`zed/crates/gpui/src/elements/text.rs:1003-1021`), then rounds the measured box up to whole device pixels (`zed/crates/gpui/src/taffy.rs:433`, `:800-802`): 13px becomes a 10px box, 12px a 9px one (8.73px). The text starts at the top of that box, so the spare 0.54px (0.27px at 12px) all lands below the caps, and the baseline (322.46) rounds down to 322. Measured in the live window at 1x (the display here is 1920x1080, scale 1): item 304..332, label box 313..323 (centred), cap rows 312.5..322, so the caps sit 0.75px above the pill centre where Chrome's arithmetic (box 313.27..322.73, baseline rounded to 323; not measured here) puts them about 0.25px below. The 1x screenshots read as a 1px gap (caps 196-205, centre 201, against a pill centre of 202).
- **gpuix lacks:** a measured text box that keeps its fractional height. `snap_measured_size_to_device_pixels` ceils every measured leaf (`zed/crates/gpui/src/taffy.rs:800-802`), including a trimmed text whose whole point is an exact cap-height box. At 2x the box rounds to 0.5px (13px: 9.5px, 12px: 9px), so the offset should shrink to a few hundredths of a pixel; not checked in a 2x window.
- **Workaround:** none; the label is not nudged, since the error depends on font size and scale.
- **Fidelity:** approximated (up to 1px high at 1x).
- **Components it hits:** tabs-subtle, and any other `capTrim` text that its parent centres (`src/lib/theme.ts:302`).

## Demo: variants, spacing and doc-page furniture

- **Cause:** `port choice` (README: a demo is a `DemoCard` of live variants) for the missing page furniture; `port choice` (reason not stated) for the spacing; the extra variants are port-only.
- **Original:** three variants: Basic, With Icons, Controlled with the `Active:` line. The tabs (list and panel) and the `Active:` line below them are `gap-4` (16px) apart. The page has a description, a code snippet per preview and API tables for Tabs, TabsList, TabItem, TabPanel (`app/docs/tabs/page.tsx:100`, `:102-202`, `:204-218`, `:174`, `:197`).
- **Port:** Basic, With icons and Controlled match in copy. It adds Compact and a Keyboard section with a disabled tab (`src/demos/tabs.tsx:114-139`). The `Active:` line sits 8px under the panel (`:13`, `:109`). No description, snippets or props tables.
- **Workaround:** none.
- **Fidelity:** dropped (docs furniture), approximated (spacing).
- **Components it hits:** every demo.
