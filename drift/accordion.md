# accordion

Original: `registry/base/accordion.tsx` (the docs page imports the Radix variant), demo in `app/docs/accordion/page.tsx` and its playground `lib/docs/playgrounds/accordion.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/accordion.tsx`, demo in `src/demos/accordion.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it. Includes the shared keyboard focus ring (`src/lib/focus-ring.tsx`) as an accordion group uses it.

No drift found in: sizes (trigger padding, gap, icon 16/14, content padding, 288px width), type scale, light and dark
tokens (`accentWash`, `hover`, `focusRing`, `mutedForeground`), single and multiple value semantics, the 0.7 dim of the
open tints while a closed row is hovered, the height and opacity timings of the panel, ARIA, disabled looks.

## CSS transforms (the chevron's rotation)

- **Cause:** `gpuix gap`.
- **Original:** the chevron turns 90 degrees on `spring.fast` as the item opens (`registry/base/accordion.tsx:769-772`).
- **Port:** the icon swaps between `chevron-right` and `chevron-down` at once (`src/components/accordion.tsx:525-531`).
- **gpuix lacks:** `transform`. Only SVG and glyph sprites carry a `TransformationMatrix`; quads, images, masks and hitboxes do not (`~/code/fdarian/gpuix/FORK.md:876-887`). README row "CSS transforms".
- **Workaround:** the glyph swap.
- **Fidelity:** approximated (no turn, the glyph changes at once).
- **Components it hits:** every rotating chevron (card, color-picker, thinking-steps).

## Label weight cannot be eased

- **Cause:** `gpuix gap`.
- **Original:** the label eases between `wght 400` and `550, opsz 18` over 80 ms (`:744-766`, `transition-[color,font-variation-settings] duration-80`).
- **Port:** `StableLabel` switches at once between static 400 and SemiBold 600 (`src/components/accordion.tsx:518-524`, `src/lib/stable-label.tsx:21-25`); the hidden copy reserves the 600 width.
- **gpuix lacks:** variable-font axes. README row "Variable-font axes".
- **Workaround:** static cuts and the hidden semibold copy.
- **Fidelity:** approximated (no easing, 600 for 550).
- **Components it hits:** every `StableLabel` (tabs, tabs-subtle, sidebar, menu rows, card, table).

## Label and chevron colour switch at once

- **Cause:** `not ported yet`.
- **Original:** label colour and the chevron's colour ease over 80 ms (`:754`, `:778`).
- **Port:** the colour changes in one frame: `StableLabel` takes no `colorFade` and `Icon` is not given `fade` (`src/components/accordion.tsx:518-530`; `fade` exists at `src/lib/icon.tsx:11`, `colorFade` at `src/lib/theme.ts:310`). gpuix animates `color` (`FORK.md:815-820`).
- **Workaround:** none.
- **Fidelity:** dropped (the ease), exact end colours.
- **Components it hits:** any `StableLabel` row (tabs, sidebar, menus).

## Chevron stroke width switches at once

- **Cause:** `not ported yet`.
- **Original:** the chevron's stroke eases 1.5 to 2 with the colour (`:778`, `transition-[color,stroke-width]`).
- **Port:** `strokeWidth={lit() ? 2 : 1.5}` swaps the SVG source (`src/components/accordion.tsx:528`). gpuix animates `strokeWidth` on `motion.path` (`BASE-UI-AUDIT.md:529`), but `Icon` bakes the width into a source string.
- **Workaround:** none.
- **Fidelity:** dropped (the ease).
- **Components it hits:** every `<Icon>` that changes stroke on hover (select, combobox, menus, tabs, sidebar).

## Labels do not wrap

- **Cause:** `port choice` (shared `StableLabel`; reason not stated).
- **Original:** the label is an `inline-grid flex-1` span with no `nowrap`, so a long title wraps and the hidden copy reserves the wrapped box (`:744-751`).
- **Port:** `whiteSpace: "nowrap"` (`src/lib/stable-label.tsx:24`), so a long title does not wrap. The demo titles are all short, so no capture shows it.
- **Workaround:** none.
- **Fidelity:** dropped for long titles.
- **Components it hits:** every `StableLabel`.

## Pill shape

- **Cause:** `not ported yet` (README lists "pill shape" as not ported).
- **Original:** highlight, tints and trigger radius follow `shape.bg` / `shape.item` (20 px pill, 8 px rounded), the ring `shape.focusRing` (22 px pill, 10 px rounded) (`registry/default/lib/shape-context.tsx:53-85`). The site default is rounded.
- **Port:** fixed `radius.item` 8 and `radius.focusRing` 10 (`src/lib/theme.ts:280-284`, `src/components/accordion.tsx` (`GroupTint`), `src/lib/focus-ring.tsx:96`).
- **Workaround:** none; the rounded default is exact.
- **Fidelity:** exact for rounded, dropped for pill.
- **Components it hits:** every component.

## Standalone hover fill fades in 20 ms faster

- **Cause:** `not ported yet` (a plain mismatch; nothing stops it).
- **Original:** the hover fill enters over `duration: 0.08` and leaves on `spring.fast.exit` 0.06 (`registry/base/accordion.tsx:819-824`).
- **Port:** one transition, `tween.fastExit` (0.06), for both directions (`src/components/accordion.tsx:460-475`).
- **Workaround:** none.
- **Fidelity:** approximated (enter 60 ms for 80 ms).
- **Components it hits:** just this one.

## The pointer over an open panel is read from events, not geometry

- **Cause:** `port choice` (reason not stated).
- **Original:** every mouse move tests the pointer's y against each open item's panel band (trigger bottom to item bottom) and clears the hover when it is inside (`registry/base/accordion.tsx:358-378`).
- **Port:** `onMouseEnter` / `onMouseLeave` on the panel call `overContent`, which clears the hover and mutes the group's mouse move until the panel is left (`src/components/accordion.tsx:225-228`, `:260-264`, `:575-580`). A panel that is closing counts as no panel at once (`item.isOpen()` guard).
- **Workaround:** none.
- **Fidelity:** approximated (the same result except while a panel animates under a still pointer).
- **Components it hits:** just this one.

## Blur keeps the hover while the pointer is inside

- **Cause:** `port choice` (reason not stated; the microtask guards a sibling's focus arriving right after the blur, `src/components/accordion.tsx:211`).
- **Original:** focus leaving the group clears the hover and the ring even with the pointer inside (`registry/base/accordion.tsx:396-403`).
- **Port:** the hover is cleared only if no trigger took focus and the pointer is outside (`src/components/accordion.tsx:209-219`), so Tab out with the pointer in the group leaves the last row lit until the pointer moves.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Focus ring exit waits 60 ms

- **Cause:** `gpuix gap` (no `AnimatePresence`, so a `createPresence` timer stands in for the exit).
- **Original:** a 1 px `--focus-ring` box at left/top -2, size +4, travels on `spring.fast` with opacity on a 0.08 tween, appears in place (`initial={false}`) and exits on `spring.fast.exit` 0.06 (`registry/base/accordion.tsx:455-472`). A blur followed by the next row's focus keeps the same element, so it glides.
- **Port:** the same box, offsets and motion (`src/lib/focus-ring.tsx:8` `ENTER_FADE`, `:11`, `:84-92`). The one difference is that the exit fade starts 60 ms after the last blur, so a blur followed by the next row's focus glides instead of fading and reappearing (`:64-67`, `src/lib/presence.ts:6`).
- **gpuix lacks:** an exit-presence primitive for a conditionally rendered `motion.div`; `onMotionComplete` plus a timer is the stand-in.
- **Workaround:** the 60 ms presence delay.
- **Fidelity:** approximated (60 ms extra before a fade).
- **Components it hits:** checkbox, radio, select, tabs, tabs-subtle, sidebar.

## Up/Down/Home/End between triggers (group)

- **Cause:** `port choice` (Base UI 1.9 has no arrow navigation; the Radix variant the docs page imports does; `BASE-UI-AUDIT.md:66`).
- **Original:** `registry/base` has none; the docs page runs the Radix accordion, which moves focus with Up/Down/Home/End and wraps.
- **Port:** Up/Down/Home/End focus the previous, next, first or last enabled trigger, wrapping; any modifier key opts out (`src/components/accordion.tsx:229-241`, `:419-432`).
- **Workaround:** none.
- **Fidelity:** exact against the Radix site, an addition against `registry/base`.
- **Components it hits:** just this one.

## Arrow navigation is group only

- **Cause:** `not ported yet`.
- **Original:** Radix handles the arrow keys on the root, standalone or grouped.
- **Port:** `onKeyDown` returns when there is no group (`src/components/accordion.tsx:419-424`), so a standalone `Accordion` with several items has none.
- **Workaround:** none.
- **Fidelity:** dropped for standalone.
- **Components it hits:** just this one.

## Closed panel text is unmounted instead of hidden

- **Cause:** `not ported yet` (the comment says gpuix has no `display: none`; it has, `FORK.md:564`, and `BASE-UI-AUDIT.md:49` records it).
- **Original:** the panel stays mounted and gets `hidden` once the exit finishes (`registry/base/accordion.tsx:939`).
- **Port:** the text is removed from the tree after the exit (`retired`, `src/components/accordion.tsx:550-562`, `:572-574`, `:596`); the panel box stays as a zero-height `role="region"`. A reopen re-mounts and re-lays out the text; the last measured height is cached.
- **Workaround:** the unmount.
- **Fidelity:** approximated (same tab order and accessibility tree).
- **Components it hits:** none other (thinking-steps uses `inert`).

## Height always springs; the source snaps when the panel did not toggle

- **Cause:** `not ported yet`.
- **Original:** the height springs only while this panel toggles; a size change from nested content, and the hand-off from `height: auto` for an item open at mount, snap (`toggling`, `registry/base/accordion.tsx:872-876`, `:953-958`).
- **Port:** the transition depends only on `item.isOpen()` (`src/components/accordion.tsx:570-571`). Content that changes height while open (a nested accordion, a re-wrap) springs and chases. Whether an item open at mount plays a grow on its first measure was not run.
- **Workaround:** `height: "auto"` until the first measure (`:585-588`).
- **Fidelity:** approximated.
- **Components it hits:** any panel holding collapsibles (thinking-steps, sidebar).

## Reduced motion

- **Cause:** `not ported yet` (gpuix reads the OS setting on macOS and has `MotionConfig reducedMotion="user"`, `FORK.md:831`, `:906`).
- **Original:** `MotionConfig reducedMotion="user"` at the root, and the panel height takes `duration: 0` under it (`registry/base/accordion.tsx:849`, `:953`).
- **Port:** nothing in `src/` reads it, so the springs always play.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component.

## A surrounding `SizeProvider` is not read

- **Cause:** `not ported yet`.
- **Original:** `size` is optional and falls back to the surrounding `SizeProvider` (`registry/base/accordion.tsx:28`, `:99-100`, `:484`, `:604`).
- **Port:** `size` is the only way to choose compact; there is no provider (`src/components/accordion.tsx:389`, `:547`, `:123-140`).
- **Workaround:** pass `size`.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size`.

## Items index by mount order

- **Cause:** `not ported yet` (`BASE-UI-AUDIT.md:77`).
- **Original:** `AccordionItem` takes an explicit `index`, required in a group (`registry/base/accordion.tsx:58`, `:616`).
- **Port:** the trigger registers with a counter (`nextIndex++`, `src/components/accordion.tsx:179`, `:198-204`) and never reuses an index, so an item inserted mid-list or re-added gets a new index and the order of the rects no longer matches the document. The demo lists are static.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** tabs.

## No gap click

- **Cause:** `not ported yet` (README lists `gapClick`).
- **Original:** `useFluidHover` routes a click between rows to the lit row (`registry/default/hooks/use-fluid-hover.ts:38-46`, `:527-540`).
- **Port:** none. The accordion has no gaps between its rows, so nothing visible changes.
- **Workaround:** none.
- **Fidelity:** dropped, no visible effect here.
- **Components it hits:** card, dropdown, sidebar and others that have gaps.

## No DOM props

- **Cause:** `port choice` (gpuix has no classes, refs or HTML attributes; reason for `collapsible` is the audit note that Base UI single mode is always collapsible, `BASE-UI-AUDIT.md:83`).
- **Original:** `className`, a forwarded `ref`, every HTML attribute, and `collapsible` on the roots (`registry/base/accordion.tsx:73-100`, `:490-503`).
- **Port:** `testId` and `children` only (`src/components/accordion.tsx:160-165`, `:385`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component.

## Demo: playground missing

- **Cause:** `not ported yet`.
- **Original:** a playground with an Expand select (one at a time / one or none / any number) and a "Highlight expanded" switch over four items (`lib/docs/playgrounds/accordion.tsx:28-148`, `app/docs/accordion/page.tsx:129-150`).
- **Port:** no playground; `highlight="trigger"` and the single and multiple modes are shown as fixed variants (`src/demos/accordion.tsx:51-178`).
- **Workaround:** the fixed variants.
- **Fidelity:** dropped.
- **Components it hits:** every component with a playground (card, button, dropdown, and others).

## Demo: Row highlight has two items, not three

- **Cause:** `port choice` (reason not stated).
- **Original:** three items, the third "Compare with the sections above" / "Those hold a block across the row and its panel while open." (`app/docs/accordion/page.tsx:264-268`).
- **Port:** two items (`src/demos/accordion.tsx:69-91`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: copy, layout and extras

- **Cause:** `port choice` (reason not stated; a four-block grid in one card, plus fixtures for the harness).
- **Original:** separate doc sections, each with a heading, a paragraph (e.g. "A single collapsible item with its own hover state.", "Multiple items with fluid hover — only one can be expanded at a time."), a code snippet and the API tables (`app/docs/accordion/page.tsx:153-300`).
- **Port:** one "Accordion" card in a two-column grid with short captions ("Standalone: its own hover state", `highlight="trigger": the tint waits for hover`, "Single expand", "Multi expand") and no snippets or API tables (`src/demos/accordion.tsx:53-180`). A port-only "Keyboard" section holds a disabled item and drives the scenarios' ARIA and Tab assertions (`:161-178`, `:184-227`). All titles and panel texts that exist in both match. Neither shows `size="compact"`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every demo (the shared card layout).
