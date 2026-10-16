# chat-message

Original: `registry/default/chat-message.tsx` and `app/docs/chat-message/page.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/chat-message.tsx`, demo in `src/demos/chat-message.tsx`.

## Entrance scale and transform-origin

- **Cause:** `gpuix gap`. Shared: CSS transforms ([README, Missing features, first row](../README.md)).
- **Original:** `initial {opacity 0, y 8, scale .96}` to `{1, 0, 1}` on `spring.moderate`, `transform-origin` bottom right for the user and bottom left for the assistant (`chat-message.tsx:57-60`).
- **Port:** `initial {opacity 0, top 8}` to `{1, 0}` on `tween.moderate` (`chat-message.tsx:94-96`); `top` needs `position: relative` (`:100`).
- **gpuix lacks:** `scale` and `transform-origin` (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** opacity and the 8px rise on `top`, no scale.
- **Fidelity:** approximated.
- **Components it hits:** banner, ask-user-questions, input-copy, input-message, queued-stack, radio-group.

## Meta row stays hidden while an action has keyboard focus (bug)

- **Cause:** `not ported yet`.
- **Original:** the row is revealed by `group-hover` and `group-focus-within`, so tabbing to an action shows the row and its focus ring (`chat-message.tsx:120-124`).
- **Port:** the row fades on the `hovered` signal alone (`chat-message.tsx:87`, `:148`). `ChatMessageAction` is focusable (`tabIndex={0}`, `:46`) and has a focus ring (`:59`), but the row is at opacity 0 until the pointer is over the message, so a keyboard user focuses an invisible button.
- **Workaround:** none.
- **Fidelity:** dropped (keyboard reveal).
- **Components it hits:** just this one.

## Meta row on touch

- **Cause:** `gpuix gap` (no input-device signal; see queued-stack's `(hover: none)` entry in `drift/queued-stack.md`).
- **Original:** `useTouchPrimary()` keeps the row always visible on touch (`chat-message.tsx:49`, `:120`).
- **Port:** the row is hover-only everywhere (`chat-message.tsx:148`).
- **gpuix lacks:** `(hover: none)` / `(pointer: coarse)` never match.
- **Workaround:** none; the port is desktop-only.
- **Fidelity:** dropped.
- **Components it hits:** queued-stack, any touch-aware component.

## Meta row fade easing

- **Cause:** `port choice` (reason not stated).
- **Original:** `transition-opacity duration-150`, Tailwind's default `cubic-bezier(0.4, 0, 0.2, 1)` (`chat-message.tsx:121`).
- **Port:** `{ duration: 0.15, ease: "easeOut" }` (`chat-message.tsx:21`). `colorFade` in `src/lib/theme.ts:311-313` already carries the exact bezier.
- **Workaround:** a 150 ms tween with a different curve.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Action buttons: hover is instant

- **Cause:** `not ported yet`.
- **Original:** the docs page's buttons use `transition-colors duration-100` for the hover background and the icon colour (`app/docs/chat-message/page.tsx:20`).
- **Port:** the hover background is a state style and the icon colour follows a `hovered` signal, both with no transition (`chat-message.tsx:48`, `:58`, `:66`).
- **Workaround:** none.
- **Fidelity:** approximated (switches at once).
- **Components it hits:** just this one.

## Action buttons are part of the component

- **Cause:** `port choice` (the docs page's `MessageActions` is demo code in the source; the port needs a button built on `buttonProps`, so it exports one).
- **Original:** `MessageActions` lives in the docs page, a `<button>` with `useIcon("copy" | "pencil" | "rotate-ccw")` at size 13, stroke 1.5, `shape.button` radius (`app/docs/chat-message/page.tsx:15-37`).
- **Port:** `ChatMessageAction` with a fixed lucide glyph per `action`, `radius.item` (8, the rounded shape) (`chat-message.tsx:27-70`). Its glyphs are `defineIcon` strings (`chat-message.tsx:8-14`), so they stay lucide when the Icons row picks another library.
- **Workaround:** n/a.
- **Fidelity:** exact for the default icon set and rounded shape.
- **Components it hits:** just this one.

## Size ladder and pill shape

- **Cause:** `not ported yet` (README: "Not ported there: pill shape, the Radius / Size / Icons / Primitive rows").
- **Original:** `size` prop and `SizeProvider` pick compact type (13/18 bubble, 11/14 caption), `py-1.5`, `px-3`; `useShape().bg` gives `rounded-[20px]` in the pill shape (`chat-message.tsx:30-33`, `:46`, `:88-95`).
- **Port:** one step only: 14/20 bubble, `py` 8, `px` 14, `radius.item` 8 (`chat-message.tsx:18`, `:127-134`); no `size` prop.
- **Workaround:** none.
- **Fidelity:** dropped (compact and pill).
- **Components it hits:** every component with a `size` or shape variant.

## Message body: whitespace, wrapping, node children

- **Cause:** `not ported yet` for `pre-wrap` and `break-words` (gpuix has `whiteSpace` `pre-wrap`, `FORK.md:658-659`); `gpuix gap` for `text-pretty` (no `text-wrap` in `FORK.md`).
- **Original:** the body is `whitespace-pre-wrap break-words`, the user bubble adds `text-pretty`, and `children` is any `ReactNode` (`chat-message.tsx:87`, `:96-102`, `:28`).
- **Port:** the body is one `<text>` with no `whiteSpace` or overflow-wrap, so newlines collapse and a long unbroken token is not broken; `children` is `string` only (`chat-message.tsx:85`, `:139`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Timestamp: tabular numerals and type

- **Cause:** `not ported yet` (gpuix has `fontVariantNumeric`, `FORK.md:657`).
- **Original:** the time span is `tabular-nums`; `time` is a `ReactNode` (`chat-message.tsx:127`, `:24`).
- **Port:** proportional digits, `time` is `string` (`chat-message.tsx:162`, `:82`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Layout motion for sibling messages

- **Cause:** `not ported yet` (gpuix has `layout`, `FORK.md:827`).
- **Original:** `layout="position"` so earlier messages slide when a message is added (`chat-message.tsx:56`).
- **Port:** no `layout` on the message; siblings jump (`chat-message.tsx:92-98`). Invisible in the demo, where "Add message" appends at the bottom.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Attachments take plain objects

- **Cause:** `port choice` (the thumbnail needs a type and a path, not a `File`; PDF preview is a gpuix gap, see `drift/file-thumbnail.md`).
- **Original:** `files?: File[]`, keyed by name, size, mtime and index (`chat-message.tsx:18`, `:77`).
- **Port:** `FileLike[]` with `{ name, type, src }`, no key (`chat-message.tsx:79`, `:119-121`).
- **Workaround:** n/a.
- **Fidelity:** exact for images.
- **Components it hits:** file-thumbnail, input-message.

## No `className` / rest props, no `ref`

- **Cause:** `port choice` (reason not stated; the port takes `testId` instead).
- **Original:** `forwardRef`, `className` and `...props` land on the outer wrapper (`chat-message.tsx:40-42`, `:66`).
- **Port:** props are `from`, `files`, `thumbnailSize`, `time`, `actions`, `testId`, `children` (`chat-message.tsx:77-86`).
- **Workaround:** n/a.
- **Fidelity:** dropped (API only).
- **Components it hits:** most ports.

## Demo page

- **Cause:** `not ported yet` (API table and code tabs, `max-w-xl`, curly quotes) + `port choice` (the "Add message" button, to exercise the entrance in a capture). Itemised under Port.
- **Original:** `app/docs/chat-message/page.tsx`: Conversation (5 messages, `MessageActions` on each), Roles, Attachments (a `File` fetched from `/micka.png`), API Reference table; previews are `max-w-xl` with code tabs (`:120-189`).
- **Port:** `src/demos/chat-message.tsx` has the same three sections with the same messages (`:14-34`, `:99-153`). Differences:
  - `not ported yet`: the API Reference table and code tabs (docs chrome).
  - `port choice`: an "Add message" button and a follow-up message (`:36-40`, `:107-115`), there to exercise the entrance in a capture; the source has none.
  - `not ported yet`: the transcript is `width: 100%`, not `max-w-xl` (576px) (`:72`).
  - `not ported yet`: the first message uses straight quotes, `"good design"`; the source has curly ones, `&ldquo;good design&rdquo;` (`page.tsx:128-129`; port `demos/chat-message.tsx:18`).
  - Attachments use `assets/chat-ai/micka.png` by path (`:42-46`), the source's `/micka.png` fetch.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
