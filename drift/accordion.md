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
- **Port:** the icon swaps between `chevron-right` and `chevron-down` at once (`src/components/accordion.tsx:621-627`).
- **gpuix lacks:** `transform`. Only SVG and glyph sprites carry a `TransformationMatrix`; quads, images, masks and hitboxes do not (`~/code/fdarian/gpuix/FORK.md:876-887`). README row "CSS transforms".
- **Workaround:** the glyph swap.
- **Fidelity:** approximated (no turn, the glyph changes at once).
- **Components it hits:** every rotating chevron (card, color-picker, thinking-steps).

## Label weight cannot be eased

- **Cause:** `gpuix gap`.
- **Original:** the label eases between `wght 400` and `550, opsz 18` over 80 ms (`:744-766`, `transition-[color,font-variation-settings] duration-80`).
- **Port:** `StableLabel` switches at once between static 400 and SemiBold 600 (`src/components/accordion.tsx:615-620`, `src/lib/stable-label.tsx:23-27`); the hidden copy reserves the 600 width.
- **gpuix lacks:** variable-font axes. README row "Variable-font axes".
- **Workaround:** static cuts and the hidden semibold copy.
- **Fidelity:** approximated (no easing, 600 for 550).
- **Components it hits:** every `StableLabel` (tabs, tabs-subtle, sidebar, menu rows, card, table).

## Labels do not wrap

- **Cause:** `port choice` (shared `StableLabel`; reason not stated).
- **Original:** the label is an `inline-grid flex-1` span with no `nowrap`, so a long title wraps and the hidden copy reserves the wrapped box (`:744-751`).
- **Port:** `whiteSpace: "nowrap"` (`src/lib/stable-label.tsx:26`), so a long title does not wrap. The demo titles are all short, so no capture shows it.
- **Workaround:** none.
- **Fidelity:** dropped for long titles.
- **Components it hits:** every `StableLabel`.

## Standalone hover fill fades in 20 ms faster

- **Cause:** `not ported yet` (a plain mismatch; nothing stops it).
- **Original:** the hover fill enters over `duration: 0.08` and leaves on `spring.fast.exit` 0.06 (`registry/base/accordion.tsx:819-824`).
- **Port:** one transition, `tween.fastExit` (0.06), for both directions (`src/components/accordion.tsx:600-615`).
- **Workaround:** none.
- **Fidelity:** approximated (enter 60 ms for 80 ms).
- **Components it hits:** just this one.

## The pointer over an open panel is read from events, not geometry

- **Cause:** `port choice` (reason not stated).
- **Original:** every mouse move tests the pointer's y against each open item's panel band (trigger bottom to item bottom) and clears the hover when it is inside (`registry/base/accordion.tsx:358-378`).
- **Port:** `onMouseEnter` / `onMouseLeave` on the panel call `overContent`, which clears the hover and mutes the group's mouse move until the panel is left (`src/components/accordion.tsx:290-293`, `:309-313`, `:651-656`). A panel that is closing counts as no panel at once (`item.isOpen()` guard).
- **Workaround:** none.
- **Fidelity:** approximated (the same result except while a panel animates under a still pointer).
- **Components it hits:** just this one.

## Blur keeps the hover while the pointer is inside

- **Cause:** `port choice` (reason not stated).
- **Original:** focus leaving the group clears the hover and the ring even with the pointer inside (`registry/base/accordion.tsx:396-403`).
- **Port:** the hover is cleared only if the blur's `relatedTarget` is not a trigger and the pointer is outside (`blurRow`, `src/components/accordion.tsx`), so Tab out with the pointer in the group leaves the last row lit until the pointer moves.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Focus ring exit waits 60 ms

- **Cause:** `gpuix gap` (no `AnimatePresence`, so a `createPresence` timer stands in for the exit).
- **Original:** a 1 px `--focus-ring` box at left/top -2, size +4, travels on `spring.fast` with opacity on a 0.08 tween, appears in place (`initial={false}`) and exits on `spring.fast.exit` 0.06 (`registry/base/accordion.tsx:455-472`). A blur followed by the next row's focus keeps the same element, so it glides.
- **Port:** the same box, offsets and motion (`src/lib/focus-ring.tsx:9` `ENTER_FADE`, `:12`, `:87-95`). The one difference is that the exit fade starts 60 ms after the last blur, so a blur followed by the next row's focus glides instead of fading and reappearing (`:67-69`, `src/lib/presence.ts:6`).
- **gpuix lacks:** an exit-presence primitive for a conditionally rendered `motion.div`; `onMotionComplete` plus a timer is the stand-in.
- **Workaround:** the 60 ms presence delay.
- **Fidelity:** approximated (60 ms extra before a fade).
- **Components it hits:** checkbox, radio, select, tabs, tabs-subtle, sidebar.

## Up/Down/Home/End between triggers (group)

- **Cause:** `port choice` (Base UI 1.9 has no arrow navigation; the Radix variant the docs page imports does; `BASE-UI-AUDIT.md:66`).
- **Original:** `registry/base` has none; the docs page runs the Radix accordion, which moves focus with Up/Down/Home/End and wraps.
- **Port:** Up/Down/Home/End focus the previous, next, first or last enabled trigger, wrapping; any modifier key opts out (`src/components/accordion.tsx:274-286`, `:517-535`).
- **Workaround:** none.
- **Fidelity:** exact against the Radix site, an addition against `registry/base`.
- **Components it hits:** just this one.

## Arrow navigation is group only

- **Cause:** `not ported yet`.
- **Original:** Radix handles the arrow keys on the root, standalone or grouped.
- **Port:** `onKeyDown` returns when there is no group (`src/components/accordion.tsx:517-522`), so a standalone `Accordion` with several items has none.
- **Workaround:** none.
- **Fidelity:** dropped for standalone.
- **Components it hits:** just this one.

## Closed panel text is unmounted instead of hidden

- **Cause:** `not ported yet` (the comment says gpuix has no `display: none`; it has, `FORK.md:564`, and `BASE-UI-AUDIT.md:49` records it).
- **Original:** the panel stays mounted and gets `hidden` once the exit finishes (`registry/base/accordion.tsx:939`).
- **Port:** the text is removed from the tree after the exit (`retired`, `src/components/accordion.tsx:693-705`, `:648-650`, `:672`); the panel box stays as a zero-height `role="region"`. A reopen re-mounts and re-lays out the text; the last measured height is cached.
- **Workaround:** the unmount.
- **Fidelity:** approximated (same tab order and accessibility tree).
- **Components it hits:** none other (thinking-steps uses `inert`).

## Height always springs; the source snaps when the panel did not toggle

- **Cause:** `not ported yet`.
- **Original:** the height springs only while this panel toggles; a size change from nested content, and the hand-off from `height: auto` for an item open at mount, snap (`toggling`, `registry/base/accordion.tsx:872-876`, `:953-958`).
- **Port:** the transition depends only on `item.isOpen()` (`src/components/accordion.tsx:646-647`). Content that changes height while open (a nested accordion, a re-wrap) springs and chases. Whether an item open at mount plays a grow on its first measure was not run.
- **Workaround:** `height: "auto"` until the first measure (`:585-588`).
- **Fidelity:** approximated.
- **Components it hits:** any panel holding collapsibles (thinking-steps, sidebar).

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the group in a `SizeProvider`, so nested sized components follow it (`registry/base/accordion.tsx:484`, `:604`).
- **Port:** An omitted `size` follows the Size row (`src/components/accordion.tsx:169`); a given one sizes the accordion only.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

## Items index by mount order

- **Cause:** `not ported yet` (`BASE-UI-AUDIT.md:77`).
- **Original:** `AccordionItem` takes an explicit `index`, required in a group (`registry/base/accordion.tsx:58`, `:616`).
- **Port:** the trigger registers with a counter (`nextIndex++`, `src/components/accordion.tsx:196`, `:257-263`) and never reuses an index, so an item inserted mid-list or re-added gets a new index and the order of the rects no longer matches the document. The demo lists are static.
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
- **Port:** `testId` and `children` only (`src/components/accordion.tsx:181-186`, `:518`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component.

## Playground: "One at a time" is a controlled value

- **Cause:** `port choice` (the port's single mode is always collapsible, `BASE-UI-AUDIT.md:83`, so there is no `collapsible` prop to turn off).
- **Original:** the Expand select maps to `type` and `collapsible`; "One at a time" is a non-collapsible single group (`lib/docs/playgrounds/accordion.tsx:28-34`, `:78-92`).
- **Port:** the playground controls the group's value and drops the close of the open item while "One at a time" is chosen (`src/demos/accordion.tsx`, `Playground`). Switching Expand resets the open set to the first item, as the source's `key` remount does.
- **Workaround:** the controlled value.
- **Fidelity:** exact in what it does; the group itself still has no non-collapsible mode.
- **Components it hits:** just this one.

## Playground: frame and preview

- **Cause:** `port choice` (the preview sits in the shared demo card, so it lines up with the page's other cards).
- **Original:** `ComponentPreview` with no padding, `h-[420px]`, top-aligned, the group centred at the card's width with `px-6 py-10`, and Preview / Code tabs with the snippet kept in sync (`app/docs/accordion/page.tsx:129-150`, `lib/docs/playgrounds/accordion.tsx:36-65`, `:130-137`).
- **Port:** the `DemoCard` frame titled "Playground" in its footer, a 420 px minimum, the group 288 px wide (its fixed width) centred with 20 px above it; no Code tab and no generated snippet (`src/lib/playground.tsx`, `src/demos/accordion.tsx`). The four items and their texts match the source.
- **Workaround:** none.
- **Fidelity:** approximated (frame chrome), dropped (the code snippet).
- **Components it hits:** every playground.

## Demo: Row highlight has two items, not three

- **Cause:** `port choice` (reason not stated).
- **Original:** three items, the third "Compare with the sections above" / "Those hold a block across the row and its panel while open." (`app/docs/accordion/page.tsx:264-268`).
- **Port:** two items (`src/demos/accordion.tsx:197-221`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: copy, layout and extras

- **Cause:** `port choice` (reason not stated; a four-block grid in one card, plus fixtures for the harness).
- **Original:** separate doc sections, each with a heading, a paragraph (e.g. "A single collapsible item with its own hover state.", "Multiple items with fluid hover — only one can be expanded at a time."), a code snippet and the API tables (`app/docs/accordion/page.tsx:153-300`).
- **Port:** one "Accordion" card in a two-column grid with short captions ("Standalone: its own hover state", `highlight="trigger": the tint waits for hover`, "Single expand", "Multi expand") and no snippets or API tables (`src/demos/accordion.tsx:181-321`). A port-only "Keyboard" section holds a disabled item and drives the scenarios' ARIA and Tab assertions (`:300-319`, `:346-411`). All titles and panel texts that exist in both match. Neither shows `size="compact"`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every demo (the shared card layout).
