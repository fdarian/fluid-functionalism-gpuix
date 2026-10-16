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

## Highlight and ring snap for 448 ms after a toggle

- **Cause:** `port choice` (the code comment: rows reflow every frame while a panel changes height and the highlight must follow without gliding, `src/components/accordion.tsx:67`).
- **Original:** the hover fill and the ring keep their `spring.fast` glide while the panel height animates; the group re-measures every frame via `onUpdate` and the fill chases the moving row (`registry/base/accordion.tsx:959-966`, `FluidHoverHighlight` default transition).
- **Port:** `travel={() => !reflow()}` makes both snap (`tween.snap`) for `trackMs.spring + 48` = 448 ms after any toggle (`src/components/accordion.tsx:220-224`, `:284`, `:289`). The panel's own spring is 80 ms, so a pointer that moves to another row within that window snaps there instead of gliding.
- **Workaround:** the timer.
- **Fidelity:** approximated.
- **Components it hits:** any list whose rows resize under the highlight (thinking-steps, sidebar).

## Paint order of the shared layers

- **Cause:** `not ported yet` (the comments say gpuix has no `zIndex`; it does: `FORK.md:561`, orders siblings only).
- **Original:** expanded tints, then the hover fill, all under the rows; the focus ring sits above everything at `z-20` (`registry/base/accordion.tsx:411-472`). The hover fill paints over the open tint; the ring is never covered.
- **Port:** the group is `FluidHighlight`, `FocusRing`, then the items (`src/components/accordion.tsx:279-291`). Each item's tint (`:354-376`, and `highlight="trigger"`'s tint inside the trigger, `:441-459`) paints over the hover fill and over the ring, whose bottom edge on an open row and top edge under an open neighbour sit inside a tint (alpha 0.2 light, 0.12 dark). `focus-ring.tsx:51` itself says to place the ring after the fills.
- **Workaround:** document order.
- **Fidelity:** approximated (a few percent of tint over the fill and the ring edge).
- **Components it hits:** none other; stale "no zIndex" comments are also at `src/lib/fluid-highlight.tsx:19` and `src/components/accordion.tsx:278`.

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

## Focus ring motion

- **Cause:** `port choice` (the shared ring; gpuix has no `AnimatePresence`, so a `createPresence` timer stands in for the exit).
- **Original:** a 1 px `--focus-ring` box at left/top -2, size +4, travels on `spring.fast` with opacity on a 0.08 tween, appears in place (`initial={false}`) and exits on `spring.fast.exit` 0.06 (`registry/base/accordion.tsx:455-472`).
- **Port:** the same box and offsets (`src/lib/focus-ring.tsx:8`, `:73-97`); opacity rides the same spring as the position (`tween.fast`, not a 0.08 tween), and the exit is `tween.fastExit` 0.06 started 60 ms after the last blur, so a blur followed by the next row's focus glides instead of fading (`:63-71`, `src/lib/presence.ts:6`).
- **Workaround:** the 60 ms presence delay.
- **Fidelity:** approximated (opacity curve, 60 ms extra before a fade).
- **Components it hits:** checkbox, radio, select, tabs, tabs-subtle.

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

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the group in a `SizeProvider`, so nested sized components follow it (`registry/base/accordion.tsx:484`, `:604`).
- **Port:** An omitted `size` follows the Size row (`src/components/accordion.tsx:140`); a given one sizes the accordion only.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

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
