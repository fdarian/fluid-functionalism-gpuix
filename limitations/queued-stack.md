# queued-stack

Original: `registry/blocks/queued-stack.tsx` (used by the InputMessage docs, which have no page of their own for it). Ported in `src/components/queued-stack.tsx`, demo in `src/demos/queued-stack.tsx`. The demo stands in a plain box for the composer; the real one is the input-message port.

Transforms are already a known gap and are not repeated here.

## A card's `y` and `scale` as box properties

- **Original:** each card is a `motion.div` animating `y`, `scale` and `opacity` with `transform-origin: bottom center`; drag moves `y`, a lifted card is `scale: 1.03`, an entering card starts at `y: 14, scale: .96`.
- **gpuix lacks:** transforms, so no translate and no scale. `motion` does animate `top` / `right` / `bottom` / `left` / `width` / `height` / `opacity` (`packages/native/js/host.ts:27`).
- **Workaround:** a card is absolutely positioned and `y` is its `bottom` offset. Scaling about the bottom centre is the same card with its left and right insets widened by `(1 - scale) * cardWidth / 2` and its height multiplied, which needs the stack's painted width. The whole pile's recoil is `top: -7, bottom: 7` on its wrapper, sprung back with the source's `{ duration: .42, bounce: .5 }`.
- **Fidelity:** approximated. A receding card's box shrinks but its text and thumbnails do not, which only shows if a back card's content pokes into its 12px strip: the 28px thumbnails of a card with attachments do, by a few pixels, in the collapsed pile. Four properties animate per card instead of one transform, and each re-lays out.
- **Components it hits:** chat-message (entrance), any stacked or scaled surface.

## No z-index

- **Original:** `zIndex: 100 - i`, and 200 for the dragged card.
- **gpuix lacks:** `zIndex`; paint order is document order.
- **Workaround:** the cards are rendered back to front and the dragged one is moved to the end of the list while it is held, so reordering the queue reorders the DOM.
- **Fidelity:** exact for painting.
- **Components it hits:** every overlay inside a scroller (the combobox and sidebar already do this).

## Filled cards take the hover from the stack

- **Original:** the stack is expanded while the pointer is anywhere over it, cards included.
- **gpuix lacks:** the same for a filled or absolute child (`packages/native/src/style.rs:317`, `renderer.rs:5335`): over a card the stack's own `onMouseEnter` / `onMouseLeave` say the pointer left. See [chat-message.md](chat-message.md).
- **Workaround:** the stack and every card report enter and leave to one counter, and the stack collapses 40 ms after the counter reaches zero, which bridges the frame between one leaving and the next entering. (`pointerEvents: "none"` is not an option: the cards are the drag and click targets.)
- **Fidelity:** approximated: collapsing is 40 ms late.
- **Components it hits:** any card whose children are filled.

## A press and a move on one element arm pointer capture, and capture eats the release of its neighbours

- **Original:** the edit and remove buttons sit inside the draggable card and stop `pointerdown` from reaching it; clicking them works while the card drags.
- **gpuix lacks:** isolation between captured elements. An element that listens for `mouseDown` and `mouseMove` gets `capture_pointer()` (`packages/native/src/renderer.rs:5663`; GPUI `window.rs:2874`, `elements/div.rs:2724`), after which only that element's hitbox counts as hovered until the release. Three observed consequences in the headless renderer:
  1. A card listening for press, move and release (what drag needs) never gave its buttons their `click`: the release went to the card.
  2. Wrapping a button in the tooltip port's default form (a wrapper that listens for `mouseDown` and `mouseMove`) did the same: `mouseDown` reached the button, `mouseUp` and `click` did not. Giving the button only `onMouseEnter` / `onMouseLeave` fixed it; the tooltip's "dismiss on press" and follow-cursor handlers cannot be used on a clickable child.
  3. A standalone element with press, move, release and click handlers works, so the loss needs the neighbour or wrapper arrangement; the exact rule was not traced further.
- **Workaround:** drag handlers live on a region that excludes the buttons (the thumbnails and text) rather than on the card, and the buttons take only the tooltip's enter / leave handlers.
- **Fidelity:** exact for the two actions; the tooltip does not close on press.
- **Components it hits:** tooltip (its default trigger form); any draggable element that holds buttons.

## Drag needs painted bounds on every move

- **Original:** `getBoundingClientRect` in a window `pointermove` listener.
- **gpuix lacks:** pointer coordinates relative to the container, and a bounds read that is cheap in tests. The slot under the pointer comes from `getElementBounds` of the stack on each move (`renderer.rs:2333`), which on the headless renderer draws a frame per call (`test_renderer.rs:1118`).
- **Workaround:** none; one bounds read per move.
- **Fidelity:** exact in a window.
- **Components it hits:** any drag handler that needs the container's box.

## `layoutId` morph, touch mode, `tabular-nums`

- **Original:** a dispatching text-only card shares a `layoutId` with its sent bubble and morphs into it; `(hover: none)` switches the stack to tap-to-expand with a collapse button; the count uses `tabular-nums`.
- **gpuix lacks:** shared layout animations (`README.md:1101`), media queries, and font feature settings.
- **Workaround:** none for the morph and the touch mode (a desktop-only port); a plain number for the count.
- **Fidelity:** dropped.
- **Components it hits:** chat-message (the other end of the morph), any touch-aware component.

## Notes

- `onDoubleClick` does not exist, but `onClick` carries `clickCount`, so double-click-to-edit is `clickCount === 2`. The headless driver has no double click, so that path is written but not exercised in the screenshots.
- The enqueue recoil was checked frame by frame in a throwaway script (it overshoots and settles); the screenshot driver cannot sample mid-motion, so there is no committed capture of it.
