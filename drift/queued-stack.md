# queued-stack

Original: `registry/blocks/queued-stack.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). It has no docs page of its own: the InputMessage docs use it through `app/docs/input-message/queued-chat-demo.tsx`. Ported in `src/components/queued-stack.tsx`, demo in `src/demos/queued-stack.tsx`. The demo stands in a plain box for the composer; the real one is the input-message port.

Checked and the same: the peek, scale, gap and cap constants (`:28-31`; port `:35-39`), the fan-out targets and which cards fade (`:270-280`; port `:221-238`), the enter and exit states (`y 14, scale .96` in; `scale .9`, 0.12 s out; `:315-321`; port `:345-352`, `:420-430`), the stack height spring (`:203-208`; port `:252-259`), drag slot and offset maths (`:153-180`; port `:154-183`), the recoil spring `{ duration .42, bounce .5 }` (`:144`; port `:46-51`), the edit and remove actions' sizes (32px, `:388`; port `:83-84`), card text 14/20 muted with an ellipsis (`:342`; port `:525-537`), the "n attachment(s)" fallback label, tooltip copy and sides, and light and dark card fill (`queuedCard` is the oklab mix, checked: `#f3f3f3` / `#292929`).

## A card's `y` and `scale` as box properties

- **Cause:** `gpuix gap`. Shared: CSS transforms ([README, Missing features, first row](../README.md)).
- **Original:** each card is a `motion.div` animating `y`, `scale` and `opacity` with `transform-origin: bottom center`; drag moves `y`, a lifted card is `scale: 1.03`, an entering card starts at `y: 14, scale: .96` (`:270-280`, `:315-325`). The pile's recoil is `stackBump.set({ y: -7 })` then a spring to 0 (`:140-146`).
- **Port:** a card is absolutely positioned and `y` is its `bottom` offset. Scaling about the bottom centre is the same card with its left and right insets widened by `(1 - scale) * cardWidth / 2` and its height multiplied, which needs the stack's painted width (`box` at `queued-stack.tsx:211`, `target` at `:221`, the width from a `ResizeObserver` at `:148`). The recoil is `top: -bump, bottom: bump` on a wrapper (`:270-281`): it jumps with `tween.snap`, and 16 ms later springs back on the source's transition (`:195-208`).
- **gpuix lacks:** translate and scale (`~/code/fdarian/gpuix/FORK.md:1198-1209`).
- **Workaround:** the box maths above.
- **Fidelity:** approximated. A receding card's box shrinks but its text and thumbnails do not, which only shows where a back card's content pokes into its strip: the card is 44px, a back card shows the top 9.8px, and a 28px thumbnail (26.6px scaled in the source) sits about 7px from its top, so it pokes by a couple of pixels in the collapsed pile. Five properties animate per card instead of one transform, and each re-lays out.
- **Components it hits:** chat-message (entrance), ask-user-questions, any stacked or scaled surface.

## Count badge scales in

- **Cause:** `gpuix gap` (the same transforms row).
- **Original:** the gutter count enters and exits at `scale: .6` with `spring.fast` (`:251-254`).
- **Port:** opacity only (`queued-stack.tsx:307-313`).
- **Workaround:** fade.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## No `(hover: none)` signal

- **Cause:** `gpuix gap`. Listed in [README, Missing features](../README.md): `matchMedia` fixes `hover` to `hover` and `pointer` to `fine` (`FORK.md:1256-1258`).
- **Original:** `(hover: none)` switches the stack to tap-to-expand: a tap on a collapsed card pins it open, a Collapse button (chevron, `Tooltip` "Collapse") replaces the gutter arrow, an empty queue resets the pin, and Edit and Remove are always shown instead of on hover (`:106-127`, `:215-233`, `:303-308`, `:375-377`).
- **Port:** none of it; the stack expands on hover only, and the actions show on card hover.
- **gpuix lacks:** an input-device signal (GPUI exposes none).
- **Workaround:** none; the port is desktop-only.
- **Fidelity:** dropped.
- **Components it hits:** chat-message (meta row), ask-user-questions, any touch-aware component.

## No size ladder

- **Cause:** `not ported yet` (README: "Not ported there: ... the Size ... rows").
- **Original:** at the compact step the card is 38px, the text 13/18, the thumbnails 24px, padding `pl-1.5` / `pl-3` and `pr-1`; the hooks `useQueueCardHeight` and `QUEUE_CARD_H_COMPACT` are exported, and `collapsedStackHeight(count, cardH)` takes the height (`:25-41`, `:68-76`, `:338-342`, `:350`, `:356`).
- **Port:** one step at 44px; `collapsedStackHeight(count)` has no height argument and the other two exports do not exist (`queued-stack.tsx:35`, `:54-63`). The attachment radius is `nestedRadius(shape.bg, 8)` at every step; the source nests 7 at the compact step (`:497`).
- **Workaround:** none.
- **Fidelity:** dropped (compact).
- **Components it hits:** every component with a `size` prop.

## Shared-layout morph into the sent bubble

- **Cause:** `not ported yet` (gpuix has `layoutId`, `FORK.md:1149-1150`).
- **Original:** `morphLayoutId` gives a text-only card a `layoutId` (dropped while a press is down) so the dispatched card morphs into its sent bubble (`:53-56`, `:295-301`).
- **Port:** no such prop; a dispatched card only fades out (`queued-stack.tsx:349-352`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** input-message, chat-message.

## Drag and double-click start from the text region only

- **Cause:** `port choice` (stated at `queued-stack.tsx:455-458`: a press on the buttons must not start a drag, and gpuix captures the pointer only when asked, `base-ui:src/utils/pointer-capture.ts:3-9`).
- **Original:** `onPointerDown` and `onDoubleClick` are on the whole card, with window `pointermove` / `pointerup` listeners; the buttons stop their own pointer-down (`:302-314`, `:185-187`, `:382`).
- **Port:** the press, move, release and double click are on an inner region with pointer capture (`queued-stack.tsx:459-471`), so a press or double click on the card's 14px (or 8px) left padding, its 6px right padding or its border does nothing. The drag position is the same maths.
- **Workaround:** pointer capture.
- **Fidelity:** approximated (the card edge is not part of the grip).
- **Components it hits:** none other.

## Overflow chip, count and edit/remove details

- **Cause:** `not ported yet`.
- **Original:** the "+n" chip is `bg-background/40`, radius `attachmentRadius` (`:355-360`); Edit and Remove are focusable buttons with a `focus-visible:ring-1` ring and labels `Edit queued message: <text>` / `Remove queued message: <text>` (`:387-388`, `:401-402`).
- **Port:** the chip is `color.hover` (a 4% black wash, not 40% of the background), tabular digits as in the source (`queued-stack.tsx:509`, `:516`, `:315-325`); Edit and Remove are `role="button"` divs with no `tabIndex`, no focus ring, and the labels `Edit` / `Remove` (`:76-78`, `:65-103`).
- **Workaround:** none.
- **Fidelity:** approximated (chip tint); dropped (keyboard focus ring, longer labels).
- **Components it hits:** none other.

## Static font weight for the count

- **Cause:** `gpuix gap`. Shared: variable-font axes ([README, Missing features, variable-font row](../README.md)).
- **Original:** the count is `fontVariationSettings` 550 (`:256`).
- **Port:** SemiBold 600 (`queued-stack.tsx:319`).
- **Fidelity:** approximated.
- **Components it hits:** card, table, tabs, tabs-subtle, sidebar, ask-user-questions.

## `QueuedMessage` lives here, `testId` added

- **Cause:** `port choice` (reason not stated; the port has no `File` and its `InputMessage` is a separate module).
- **Original:** `QueuedMessage` is imported from `input-message`, and its `files` are `File[]` (`:8`).
- **Port:** `QueuedMessage` is defined and exported here with `files: FileLike[]`, and the stack takes a `testId` (`queued-stack.tsx:28-33`, `:122`).
- **Fidelity:** exact for images.
- **Components it hits:** input-message, file-thumbnail.

## Demo page

- **Cause:** `port choice` (reason not stated; the real composer is the input-message port); `not ported yet` for the morph.
- **Original:** `queued-chat-demo.tsx`: a real `InputMessage` over a transcript with a paused, thinking reply (`ChatMessage`, `ThinkingIndicator`), a play and pause button that steps the stream word by word, a Reset, three seeded cards (two attachments, "Tighten the spacing", and a long text that truncates), queued messages that dispatch into the transcript with the layout morph, and a "rich" variant with an attach dropdown and a model picker (`:55-120`, `:243-300`). Edit pulls text and files back into the composer.
- **Port:** two cards in `src/demos/queued-stack.tsx`. "Queued Stack": a "Queue message" / "Queue with attachment" / "Clear" row above a plain box that shows the composer text; four seeded cards, one with three files (`:52-61`). "Queued chat": `QueuedChat` from `src/lib/queued-chat.tsx`, the source's demo with a real `InputMessage`, a transcript, a Resume / Pause / Reset button, the same three seeded cards and dispatch into the transcript (the input-message page also shows its `rich` variant). Edit puts the text and files back but does not focus the composer (see `drift/input-message.md`, "Queued chat").
- **Fidelity:** approximated (no morph).
- **Components it hits:** input-message, chat-message, thinking-indicator.
