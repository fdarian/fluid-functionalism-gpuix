# card

Original: `registry/default/card.tsx`. Ported in `src/components/card.tsx`, demo in `src/demos/card.tsx`.

Card, CardGroup (stacked / inline, 1 or 2+ columns, borderless / outlined, separated), the magnetic fluid hover in one and two dimensions (`createFluidHover` with `axis: "xy"` for grids), gap click, selected fill with the weight-changing title, hairline dividers that drop beside the lit or selected card, dismissible cards, CardMedia (icon tile, logo, logo pair), CardImage, CardFeature and CardButton (primary, secondary, ghost, link) are ported. The deprecated `CardEyebrow` is not. The demo is the docs page minus the playground. `screenshots/card/` has the standard captures plus `grid-*`, `separated-and-outlined` and `promo-chip-hover`.

## A nested `buttonProps` element is clicked twice by Enter

- **Original:** Enter on a focused `<button>` inside a clickable card clicks that button once, and the click bubbles to the card.
- **gpuix lacks:** a target check in `buttonProps`' key handling: its `onKeyDown` clicks `event.elementId`, the focused element, and the keydown bubbles, so every enclosing `buttonProps` element clicks the same target again (`packages/solid/src/components/button.ts:34`, `:48`). Probed on the test renderer with an outer and an inner `buttonProps` div and focus on the inner: one Enter produced `inner, outer, inner, outer`. Space (on key-up, `:52-57`) has the same shape.
- **Workaround:** none. The clickable card root (`src/components/card.tsx:338`) wraps `CardButton` (`:985`) and the dismiss chip (`:508`), which are `buttonProps` elements too; the chip's click handler calls `stopPropagation`, which stops the bubbled click but not the second keydown, so Enter on a focused chip or button runs its action twice.
- **Fidelity:** approximated (exact for the pointer, doubled for the keyboard).
- **Components it hits:** any `buttonProps` element inside another (card, a button inside a clickable row).

## Font weight cannot be eased

- **Original:** `transition-[font-variation-settings]` eases the title between regular and semibold when the card is selected; the site's semibold is the variable `wght 550`.
- **gpuix lacks:** variable-font axes: fonts render only their default instance, so there is one static file per weight and nothing to interpolate (`~/code/fdarian/gpuix/README.md:756`, `:5302`; `src/lib/fonts.ts`).
- **Workaround:** the weight switches at once between 400 and the nearest static cut, SemiBold 600 (`src/components/card.tsx:595-625`); the invisible semibold copy in flow keeps the row from reflowing.
- **Fidelity:** approximated (no easing, 600 for 550).
- **Components it hits:** every `StableLabel` (`src/lib/stable-label.tsx`): tabs, tabs-subtle, sidebar, menu rows.

## CSS transforms (the external-link arrow)

- **Original:** the link button's arrow is an arrow-right with `-rotate-45`.
- **gpuix lacks:** `rotate` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the arrow-up-right glyph is drawn instead (`src/components/card.tsx:971`).
- **Fidelity:** exact for the resting pose, no rotation tween.
- **Components it hits:** any rotated glyph.
