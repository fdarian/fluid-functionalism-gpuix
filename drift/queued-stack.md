# queued-stack

Original: `registry/blocks/queued-stack.tsx` (used by the InputMessage docs, which have no page of their own for it). Ported in `src/components/queued-stack.tsx`, demo in `src/demos/queued-stack.tsx`. The demo stands in a plain box for the composer; the real one is the input-message port.

## A card's `y` and `scale` as box properties

- **Original:** each card is a `motion.div` animating `y`, `scale` and `opacity` with `transform-origin: bottom center`; drag moves `y`, a lifted card is `scale: 1.03`, an entering card starts at `y: 14, scale: .96`.
- **gpuix lacks:** translate and scale. Transforms are the known gap.
- **Workaround:** a card is absolutely positioned and `y` is its `bottom` offset. Scaling about the bottom centre is the same card with its left and right insets widened by `(1 - scale) * cardWidth / 2` and its height multiplied, which needs the stack's painted width (`box` at `queued-stack.tsx:258`, `target` at `:268`, the width from a `ResizeObserver` at `:183`). The whole pile's recoil is `top: -bump, bottom: bump` on its wrapper (`:318`), sprung back with the source's `{ duration: .42, bounce: .5 }`.
- **Fidelity:** approximated. A receding card's box shrinks but its text and thumbnails do not, which only shows if a back card's content pokes into its 12px strip: the 28px thumbnails of a card with attachments do, by a few pixels, in the collapsed pile. Four properties animate per card instead of one transform, and each re-lays out.
- **Components it hits:** chat-message (entrance), any stacked or scaled surface.

## No `(hover: none)` signal

- **Original:** `(hover: none)` switches the stack to tap-to-expand with a collapse button.
- **gpuix lacks:** an input-device signal. `matchMedia` exists, but `hover` is fixed to `hover` and `pointer` to `fine` (GPUI exposes no input-device query), so a touch media query never matches.
- **Workaround:** none; the port is desktop-only and the stack always expands on hover.
- **Fidelity:** dropped.
- **Components it hits:** any touch-aware component.
