# card

Original: `registry/default/card.tsx`. Ported in `src/components/card.tsx`, demo in `src/demos/card.tsx`.

Card, CardGroup (stacked / inline, 1 or 2+ columns, borderless / outlined, separated), the magnetic fluid hover in one and two dimensions, gap click, selected fill with the weight-changing title, hairline dividers that drop beside the lit or selected card, dismissible cards, CardMedia (icon tile, logo, logo pair), CardImage, CardFeature and CardButton (primary, secondary, ghost, link) are ported. The deprecated `CardEyebrow` is not. The demo is the docs page minus the playground. `screenshots/card/` has the standard captures plus `grid-*`, `separated-and-outlined` and `promo-chip-hover` (the lower cards, captured with a scroll the scenario API does not have).

## `overflow: hidden` does not follow `border-radius`

- **Original:** a rounded tile with `overflow-hidden` clips its image to the rounded corners.
- **gpuix lacks:** rounded content masks. `overflow: "hidden"` clips children to the element's rectangle, so a child paints over the curved corner (verified with a 30px-radius box and a red child). Missing feature; it affects anything rounded that holds a flush child.
- **Workaround:** the card passes its tile radius down (`CardScope.tileCorner`), and `CardImage` rounds its own outer corners to it (top corners stacked, left corners inline) while the other corners keep the original's 2px.
- **Fidelity:** approximated. Only media is corrected: any other flush child (a coloured header, a fill) would still square off the corners.
- **Components it hits:** dialog, mobile drawer, table in a rounded frame, popups with flush rows, scroll-area, banner inside a rounded host.

## A `Show` or `For` among siblings leaves an empty text node that takes a `gap` or a grid cell

- **Original:** falsy children render nothing.
- **gpuix:** Solid's universal compiler puts a `createTextNode("")` marker after every dynamic child that is not last, and gpuix lays it out as a real flex or grid item. In this port it pushed every card's content right by three gaps, shifted the first grid tile into the second column, and added a trailing gap. See `limitations/badge.md` for the first sighting. Not a renderer bug, but a trap that the DOM version cannot have.
- **Workaround:** decorative and conditional children live in absolute layers (one before the content for the selected fill, dividers and hover highlight, one after for the dismiss chip), the content is the only in-flow dynamic child and is last, and `CardButton` / `CardFeature` use a fragment or margins.
- **Fidelity:** exact once worked around.
- **Components it hits:** every component with conditional children inside a `gap` / `grid` container.

## Click does not bubble; a filled child blocks its parent's click

- **Original:** a stretched `<button>` overlay (`absolute inset-0 z-20`) makes the whole card the click target while footer buttons (`z-30`) stay independently clickable.
- **gpuix:** a click goes to the topmost element that has a listener, and an element that paints a fill blocks the click from reaching an ancestor (verified: a filled child with no handler swallows the parent's `onClick`; `pointerEvents: "none"` or an unfilled child lets it through). There is no bubbling to opt into and no stacking-order control (no `zIndex`, already known).
- **Workaround:** the card root carries `onClick` (via `buttonProps`, so it is also the tab stop and Space / Enter work), and every non-interactive child that paints (media tile, image, selected fill, dividers) is `pointerEvents: "none"`. Footer buttons own their clicks, which is exactly the original's z-30 behaviour.
- The same rule applies to hover: a filled or absolute child also blocks its parent's `onMouseEnter` / `onMouseMove` (`style.rs:317` `should_occlude`), so the decorative layers are `pointerEvents: "none"` too. It also means the card is not "hovered" while the pointer is over its own dismiss chip (the chip's hitbox takes it), so the chip keeps itself shown with its own hover signal; the original's `group-hover` keeps the group lit.
- **Fidelity:** exact.
- **Components it hits:** any card-like row with nested actions (dropdown rows with trailing buttons, chat message actions).

## `createFluidHover` only picks along `y`

- **Original:** `useFluidHover(ref, { axis: "xy", gapClick: { maxDistance: 16 } })` for a grid.
- **Shared lib:** `src/lib/fluid-hover.ts` calls `pickNearest` with `axis: "y"` hard-coded (`pick()`), though `pickNearest` itself is the verbatim port and supports `x` and `xy`. Not a gpuix gap.
- **Workaround:** `CardGroup` uses `createFluidHover` for registration, measuring and the rect store, and runs its own pointer handling with `pickNearest` (`xy` when `columns > 1`) and its own session counter. The gap click is reimplemented the same way: a press on the group that no card claimed goes to the highlighted card if it lands within 16px of it. A one-line `axis` option on `createFluidHover` would remove the duplication; I did not touch the shared file.
- **Fidelity:** exact.
- **Components it hits:** any 2-D grid with fluid hover (carousel-dots, color-picker swatches).

## No `aspect-ratio`

- **Original:** `CardImage` stacked is `w-full aspect-[16/9]`.
- **gpuix lacks:** `aspectRatio` in `StyleDesc` (not among the `StyleDesc` fields, `packages/native/js/host.ts:163`-`249`). Missing feature.
- **Workaround:** `CardImage` takes a pixel `height` (the demo passes 155 for the grid tiles, 168 for the 300px promo, matching 16:9 at those widths). The inline image is a fixed 160px square as in the original.
- **Fidelity:** approximated (right at the demo widths, wrong if the card resizes).
- **Components it hits:** any media tile (file-thumbnail, chat-message attachments).

## `backdrop-blur-sm` on the dismiss chip

- **Original:** over media the ✕ sits on `bg-card/70 backdrop-blur-sm`.
- **gpuix lacks:** backdrop filters. Missing feature.
- **Workaround:** the 70% card colour alone.
- **Fidelity:** approximated (the blur is dropped).
- **Components it hits:** dialog backdrop blur, any frosted surface.

## `margin-left: auto`

- **Original:** the inline footer is `shrink-0 ml-auto`.
- **gpuix lacks:** `auto` margins: `margin*` is `number` only (`host.ts:196`). Missing feature.
- **Workaround:** the header takes `flexGrow: 1; flexBasis: 0`, which pushes the footer to the end.
- **Fidelity:** exact.
- **Components it hits:** any row that pushes an item to the far edge.

## Smaller notes

- Both `transition-[font-variation-settings]` (the title weight easing) and `transition-colors` are dropped: the weight and colours switch instantly. The ghost-span trick (invisible semibold copy in flow, visible copy absolutely positioned) keeps the row from reflowing.
- The external-link arrow is `-rotate-45` on an arrow-right; with no transforms (known) it is the arrow-up-right glyph instead.
- Pointer-enter / leave and motion-complete events reach JS only when native events are drained; the screenshot harness's `settle()` now does that (commit 585c165), so a hover that drives a signal (the dismiss reveal, the button label colour) shows in the capture like it does live.
- Native `hover` / `active` / `focusVisible` styles cover the standalone card, `CardButton` surfaces and the dismiss chip with no JS round trip.
- Positive: `display: grid` with `gridTemplateColumns: n` gives equal columns, absolute children do not occupy cells, `objectFit: "cover"`, `outlineOffset: -1` on images and `data:image/svg+xml` image sources all work.
