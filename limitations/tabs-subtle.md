# tabs-subtle

Original: `registry/base/tabs-subtle.tsx`. Ported in `src/components/tabs-subtle.tsx`, demo in `src/demos/tabs-subtle.tsx`.

Ported: `TabsSubtle` / `TabsSubtleItem` / `TabsSubtlePanel` with the same index-based API, the selected pill, the hover preview born at the selected pill, manual activation (arrows move focus, Enter / Space select), icons, `activeLabel` (only the selected tab shows its label, which unfolds), the compact size. The gaps shared with [tabs.md](tabs.md) apply unchanged: no focus-visible in JS (per-tab outline, no traveling ring), an empty `<Show>` takes a flex gap, opacity on its own nested element, instant colour changes, one drop shadow.

Not ported: the list's `overflow-x-auto max-w-[calc(100%+8px)] scrollbar-hide -mx-1 px-1 -my-1 py-1` (a horizontally scrolling list that leaves room for the 2px focus ring). It needs negative margins plus an x-only scroller that scrolls the absolutely positioned pills with it; see [scroll-area.md](scroll-area.md) for why absolute layers inside a scroller are awkward. Tabs wider than their container overflow instead of scrolling.

## `margin` cannot be animated, so the unfolding label carries its gap as padding

- **Original:** the label's wrapper animates `width`, `opacity` and `marginLeft` (0 to 8px, compact 6px) together.
- **gpuix lacks:** margin and padding in `MotionStyle` (`packages/native/src/motion.rs:14`: only `width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`). Missing feature.
- **Workaround:** the gap is `paddingLeft` on an inner element and the animated width is the measured label width plus the gap, so the visible result is the same; the icon-to-label `gap` is 0 in this mode. The compact step uses 4px instead of 6px (the original's own special case is not reproduced).
- **Fidelity:** exact for the default size; 2px tighter in compact.
- **Components it hits:** accordion panels (padding is also fixed there), any collapsing row.

## The label's width has to be measured, and tab rects chase it

- **Original:** `width` animates to `offsetWidth` read through a `ResizeObserver`, and the pills follow because the list's observer re-measures each tab as it resizes.
- **gpuix lacks:** `ResizeObserver`, and a way to animate to `auto` (see the accordion). Missing feature.
- **Workaround:** the label's painted width is read once on mount (the first `getElementBounds` call turns tracking on, so it retries per frame), and while a label unfolds `remeasureFor(300)` re-reads every tab rect each frame so the pills keep following. Until the measurement lands an unfolded label keeps its natural width.
- **Fidelity:** approximated: a label whose text changes later is not re-measured.
- **Components it hits:** accordion, sidebar sub-menu, any component that animates to a content size.

## ARIA wiring is thinner

- **Original:** `id`, `aria-controls`, `aria-labelledby` link each tab to its panel through `idPrefix`.
- **gpuix lacks:** `aria-controls` and `aria-labelledby`: the element props stop at `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level` (`packages/native/js/host.ts`, `HostProps`). Missing feature.
- **Workaround:** `idPrefix` becomes `aria-id` (`<prefix>-tab-N`, `<prefix>-panel-N`); the tab / panel relationship itself is not exposed. An icon-only tab in `activeLabel` mode keeps its `aria-label`.
- **Fidelity:** approximated.
- **Components it hits:** tabs, accordion, any trigger / panel pair.
