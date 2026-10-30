# queued-stack

Original: `registry/blocks/queued-stack.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). It has no docs page of its own: the InputMessage docs use it through `app/docs/input-message/queued-chat-demo.tsx`. Ported in `src/components/queued-stack.tsx`, demo in `src/demos/queued-stack.tsx`. The demo stands in a plain box for the composer; the real one is the input-message port.

Checked and the same: the peek, scale, gap and cap constants (`:28-31`; port `:35-43`), the cards' `y`, `scale`, `opacity` and `transformOrigin: bottom center`, and which cards fade (`:270-280`; port `:195-211`, `:360-376`, `:379-393`), the enter and exit states (`y 14, scale .96` in; `scale .9`, 0.12 s out; `:315-321`; port `:360-362`), the count badge's `scale .6` (`:251-254`; port `:278-280`), the stack height spring (`:203-208`; port `:224-226`), drag slot and offset maths (`:153-180`; port `:143-172`), the pile's recoil, `y` set to -7 and a `{ duration .42, bounce .5 }` spring back to 0 (`:140-146`; port `:46-52`, `:178-193`), the edit and remove actions' sizes (32px, `:388`; port `:83`), card text 14/20 muted with an ellipsis (`:342`; port `:473-481`), the "n attachment(s)" fallback label, tooltip copy and sides, and light and dark card fill (`queuedCard` is the oklab mix, checked: `#f3f3f3` / `#292929`).

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

- **Cause:** `gpuix gap` (a size morph: `~/code/fdarian/gpuix/docs/fork/deviations.md` "Size morphs are not built", `README.md` "Layout animations").
- **Original:** `morphLayoutId` gives a text-only card a `layoutId` (dropped while a press is down) so the dispatched card morphs into its sent bubble: the bubble carries the same `layoutId` and `layout`, and its text a `motion.span layout` that Motion counter-scales so it does not stretch (`:53-56`, `:295-301`; `app/docs/input-message/queued-chat-demo.tsx:365-392`).
- **Port:** no such prop; a dispatched card only fades out (`queued-stack.tsx:360-362`). gpuix has `layoutId`, but its glide moves a box's position and snaps its size: the card is the composer's full width and one row tall, the bubble is content-sized, right-aligned and as tall as its wrapped text, so the bubble would appear at the card's top-left corner at its own size and slide, where the source scales one box into the other. `layout="size"` does nothing on its own and `"preserve-aspect"` is not supported, so there is nothing to ask for; a position-only glide would be a different animation, and was not built.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** input-message, chat-message.

## Drag and double-click start from the text region only

- **Cause:** `port choice` (stated at `queued-stack.tsx:400-403`: a press on the buttons must not start a drag, and gpuix captures the pointer only when asked, `base-ui:src/utils/pointer-capture.ts:3-9`).
- **Original:** `onPointerDown` and `onDoubleClick` are on the whole card, with window `pointermove` / `pointerup` listeners; the buttons stop their own pointer-down (`:302-314`, `:185-187`, `:382`).
- **Port:** the press, move, release and double click are on an inner region with pointer capture (`queued-stack.tsx:404-418`), so a press or double click on the card's 14px (or 8px) left padding, its 6px right padding or its border does nothing. The drag position is the same maths.
- **Workaround:** pointer capture.
- **Fidelity:** approximated (the card edge is not part of the grip).
- **Components it hits:** none other.

## Overflow chip, count and edit/remove details

- **Cause:** `not ported yet`.
- **Original:** the "+n" chip is `bg-background/40`, radius `attachmentRadius` (`:355-360`); Edit and Remove are focusable buttons with a `focus-visible:ring-1` ring and labels `Edit queued message: <text>` / `Remove queued message: <text>` (`:387-388`, `:401-402`).
- **Port:** the chip is `color.hover` (a 4% black wash, not 40% of the background), tabular digits as in the source (`queued-stack.tsx:454`, `:460`, `:315-325`); Edit and Remove are `role="button"` divs with no `tabIndex`, no focus ring, and the labels `Edit` / `Remove` (`:76-78`, `:65-103`).
- **Workaround:** none.
- **Fidelity:** approximated (chip tint); dropped (keyboard focus ring, longer labels).
- **Components it hits:** none other.

## `QueuedMessage` lives here, `testId` added

- **Cause:** `port choice` (reason not stated; the port has no `File` and its `InputMessage` is a separate module).
- **Original:** `QueuedMessage` is imported from `input-message`, and its `files` are `File[]` (`:8`).
- **Port:** `QueuedMessage` is defined and exported here with `files: FileLike[]`, and the stack takes a `testId` (`queued-stack.tsx:28-33`, `:118`).
- **Fidelity:** exact for images.
- **Components it hits:** input-message, file-thumbnail.

## Demo page

- **Cause:** `port choice` (reason not stated; the real composer is the input-message port); `not ported yet` for the morph.
- **Original:** `queued-chat-demo.tsx`: a real `InputMessage` over a transcript with a paused, thinking reply (`ChatMessage`, `ThinkingIndicator`), a play and pause button that steps the stream word by word, a Reset, three seeded cards (two attachments, "Tighten the spacing", and a long text that truncates), queued messages that dispatch into the transcript with the layout morph, and a "rich" variant with an attach dropdown and a model picker (`:55-120`, `:243-300`). Edit pulls text and files back into the composer.
- **Port:** two cards in `src/demos/queued-stack.tsx`. "Queued Stack": a "Queue message" / "Queue with attachment" / "Clear" row above a plain box that shows the composer text; four seeded cards, one with three files (`:52-61`). "Queued chat": `QueuedChat` from `src/lib/queued-chat.tsx`, the source's demo with a real `InputMessage`, a transcript, a Resume / Pause / Reset button, the same three seeded cards and dispatch into the transcript (the input-message page also shows its `rich` variant). Edit puts the text and files back but does not focus the composer (see `drift/input-message.md`, "Queued chat").
- **Fidelity:** approximated (no morph).
- **Components it hits:** input-message, chat-message, thinking-indicator.

## Sample photo: a different picture, named avatar.jpg

- **Cause:** `port choice` (the repository owner chose not to ship the source's photo).
- **Original:** the source's `public/micka.png` (918x928 PNG). The component has no docs page; the queued chat demo fetches the photo and attaches it as a `File` named `photo.png` (not `micka.png`) with type `blob.type || "image/png"` (`app/docs/input-message/queued-chat-demo.tsx:229-231`).
- **Port:** `assets/chat-ai/avatar.jpg` (345x345 JPEG, `AVATAR_JPG` in `src/lib/assets.ts`), named `avatar.jpg` and typed `image/jpeg` (`src/demos/queued-stack.tsx:11-15`, used at `:58` and `:85`); the queued chat's seeded card carries it as `PHOTO` named `avatar.jpg` (`src/lib/queued-chat.tsx:35`). The name only surfaces in the thumbnail's `alt` and `aria-label` (`src/components/file-thumbnail.tsx:129`, `:154`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
