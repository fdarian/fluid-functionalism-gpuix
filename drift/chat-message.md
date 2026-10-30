# chat-message

Original: `registry/default/chat-message.tsx` and `app/docs/chat-message/page.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/chat-message.tsx`, demo in `src/demos/chat-message.tsx`.

## Meta row on touch

- **Cause:** `gpuix gap` (no input-device signal; see queued-stack's `(hover: none)` entry in `drift/queued-stack.md`).
- **Original:** `useTouchPrimary()` keeps the row always visible on touch (`chat-message.tsx:49`, `:120`).
- **Port:** the row is hover-only everywhere (`chat-message.tsx:155-168`).
- **gpuix lacks:** `(hover: none)` / `(pointer: coarse)` never match.
- **Workaround:** none; the port is desktop-only.
- **Fidelity:** dropped.
- **Components it hits:** queued-stack, any touch-aware component.

## Action buttons are part of the component

- **Cause:** `port choice` (the docs page's `MessageActions` is demo code in the source; the port needs a button built on `buttonProps`, so it exports one).
- **Original:** `MessageActions` lives in the docs page, a `<button>` with `useIcon("copy" | "pencil" | "rotate-ccw")` at size 13, stroke 1.5, `shape.button` radius (`app/docs/chat-message/page.tsx:15-37`).
- **Port:** `ChatMessageAction` with a fixed named glyph per `action`, `shape.button` (`chat-message.tsx:26-63`). The glyphs are named icons (`copy`, `pencil`, `rotate-ccw`, `chat-message.tsx:33-38`), so they follow the Icons row.
- **Workaround:** n/a.
- **Fidelity:** exact for the default icon set.
- **Components it hits:** just this one.

## Size ladder

- **Cause:** `not ported yet` (README: "Not ported there: ... the Size / Icons / Primitive rows").
- **Original:** `size` prop and `SizeProvider` pick compact type (13/18 bubble, 11/14 caption), `py-1.5`, `px-3` (`chat-message.tsx:30-33`, `:46`, `:88-95`).
- **Port:** one step only: 14/20 bubble, `py` 8, `px` 14 (`chat-message.tsx:15`, `:130-142`); no `size` prop.
- **Workaround:** none.
- **Fidelity:** dropped (compact).
- **Components it hits:** every component with a `size` variant.

## Timestamp is a string

- **Cause:** `port choice` (the timestamp is one `<text>`, which takes a string; the caller pre-formats).
- **Original:** `time` is a `ReactNode` in a `tabular-nums` span (`chat-message.tsx:127`, `:24`).
- **Port:** `time` is `string`, set in tabular digits like the source (`chat-message.tsx:170-178`, `:75`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Attachments take plain objects

- **Cause:** `port choice` (the thumbnail needs a type and a path, not a `File`; PDF preview is a gpuix gap, see `drift/file-thumbnail.md`).
- **Original:** `files?: File[]`, keyed by name, size, mtime and index (`chat-message.tsx:18`, `:77`).
- **Port:** `FileLike[]` with `{ name, type, src }`, no key (`chat-message.tsx:72`, `:120-122`).
- **Workaround:** n/a.
- **Fidelity:** exact for images.
- **Components it hits:** file-thumbnail, input-message.

## No `className` / rest props, no `ref`

- **Cause:** `port choice` (reason not stated; the port takes `testId` instead).
- **Original:** `forwardRef`, `className` and `...props` land on the outer wrapper (`chat-message.tsx:40-42`, `:66`).
- **Port:** props are `from`, `files`, `thumbnailSize`, `time`, `actions`, `testId`, `children` (`chat-message.tsx:70-83`).
- **Workaround:** n/a.
- **Fidelity:** dropped (API only).
- **Components it hits:** most ports.

## Demo page

- **Cause:** `not ported yet` (API table and code tabs, `max-w-xl`, curly quotes) + `port choice` (the "Add message" button, to exercise the entrance in a capture). Itemised under Port.
- **Original:** `app/docs/chat-message/page.tsx`: Conversation (5 messages, `MessageActions` on each), Roles, Attachments (a `File` fetched from `/micka.png`), API Reference table; previews are `max-w-xl` with code tabs (`:120-189`).
- **Port:** `src/demos/chat-message.tsx` has the same three sections with the same messages (`:15-35`, `:100-154`). Differences:
  - `not ported yet`: the API Reference table and code tabs (docs chrome).
  - `port choice`: an "Add message" button and a follow-up message (`:37-41`, `:108-116`), there to exercise the entrance in a capture; the source has none.
  - `not ported yet`: the transcript is `width: 100%`, not `max-w-xl` (576px) (`:73`).
  - `not ported yet`: the first message uses straight quotes, `"good design"`; the source has curly ones, `&ldquo;good design&rdquo;` (`page.tsx:128-129`; port `demos/chat-message.tsx:19`).
  - Attachments use `assets/chat-ai/avatar.jpg` by path (`:43-47`), where the source fetches `/micka.png` (see "Sample photo" below).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Sample photo: a different picture, named avatar.jpg

- **Cause:** `port choice` (the repository owner chose not to ship the source's photo).
- **Original:** the source's `public/micka.png` (918x928 PNG), fetched and attached as a `File` named `micka.png` with type `blob.type || "image/png"` (`app/docs/chat-message/page.tsx:100-108`).
- **Port:** `assets/chat-ai/avatar.jpg` (345x345 JPEG, `AVATAR_JPG` in `src/lib/assets.ts`), named `avatar.jpg` and typed `image/jpeg` (`src/demos/chat-message.tsx:43-47`). The name only surfaces in the thumbnail's `alt` and `aria-label` (`src/components/file-thumbnail.tsx:129`, `:154`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
