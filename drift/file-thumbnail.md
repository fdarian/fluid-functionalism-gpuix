# file-thumbnail

Original: `registry/default/file-thumbnail.tsx`. It has no docs page of its own in the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`): it appears inside the input-message docs
page (`app/docs/input-message/page.tsx:449`, size 28, radius 12) and in the chat-message and queued-stack pieces.
Ported in `src/components/file-thumbnail.tsx`, demo in `src/demos/file-thumbnail.tsx`.

Ported and matching: the square with `bg-accent`, `overflow-hidden` and `shrink-0` (`file-thumbnail.tsx:75-87`), the image with `object-fit: cover` (`:100-112`), the 1px inset hairline painted over the preview at 10% black on light and 10% white on dark (`:115-129`; `color.overlay` flips per scheme), the generic document glyph (same two paths, stroke 1.5, `max(16, size * 0.35)`, muted, `:91-98`), and the spinner, the source's own box (24px, `border-2` ring, `muted-foreground` top border, `rounded-full`) turned one turn a second, linear, by a `spin` keyframe (`:19-39`).

## No PDF page preview

- **Cause:** `gpuix gap`.
- **Original:** renders page 1 of a PDF through pdfjs onto a canvas and shows it as an image, and exports `loadPdfjs` and `renderPdfFirstPage` (`file-thumbnail.tsx:7-38`, `:108-135`, `:203`). A failed render (corrupt file, blocked worker) falls back to the glyph.
- **Port:** a PDF shows the generic document glyph (`file-thumbnail.tsx:91-98`); the two helpers are not exported.
- **gpuix lacks:** a drawing surface. `<canvas>` is listed as "Custom drawing (planned)" (`~/code/fdarian/gpuix/README.md:4975`), so pdfjs has nothing to render into; the only pixel path is `setImagePixels` on an `<img>` (`README.md:5066-5076`), which needs a rasteriser outside gpuix. README's file-thumbnail row ("Missing features") is the port's row.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one (queued-stack, chat-message and input-message show the glyph for a PDF).

## The spinner is a prop, not a loading state

- **Cause:** `port choice` (the port has no async preview to wait on; reason otherwise not stated).
- **Original:** the spinner shows by itself while a preview is pending: an image before its object URL exists, a PDF while pdfjs renders (`file-thumbnail.tsx:132-135`, `:161-173`). It stays off for a failed PDF and an unsupported type.
- **Port:** the caller passes `pending` (`file-thumbnail.tsx:65-70`, `:88`); an image with a `src` shows no spinner while it decodes. A `pending` thumbnail ignores the image.
- **gpuix lacks:** n/a: `<img>` has `load` / `error` events for blob sources (`packages/native/js/blob-images.ts:20-24`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Input is a path, not a `File`

- **Cause:** `port choice` (reason not stated).
- **Original:** `file: File`; an image is shown through `URL.createObjectURL`, one blob URL per file shared by every thumbnail and revoked with the last one (`file-thumbnail.tsx:40-74`, `:94-100`).
- **Port:** `FileLike { name, type, src? }`, `src` a filesystem path or data URL; an image without `src` shows the glyph (`file-thumbnail.tsx:11-17`, `:71-73`). Consumers map their own file to it (`src/components/input-message.tsx:327-331`).
- **gpuix lacks:** nothing: `<img src="blob:...">` is read in-process (`packages/native/js/host.ts:1430-1431`; `blob-images.ts`).
- **Workaround:** pass a path.
- **Fidelity:** approximated.
- **Components it hits:** input-message, chat-message, queued-stack.

## No `className`

- **Cause:** `not ported yet`.
- **Original:** `radius` overrides the shape's radius, and `className` can override it too (`file-thumbnail.tsx:86-89`, `:93`, `:139-152`).
- **Port:** `radius` unless it is omitted, then `shape.bg`; no `className` (`file-thumbnail.tsx:65-70`, `:85`).
- **gpuix lacks:** nothing.
- **Workaround:** pass `radius`.
- **Fidelity:** approximated.
- **Components it hits:** every shape-aware component.

## Accessible names

- **Cause:** `port choice` (reason not stated).
- **Original:** the image has `alt` = file name, the spinner is `role="status"` with `aria-label="Loading preview"`, the glyph is `role="img"` with the file name (`file-thumbnail.tsx:157-182`).
- **Port:** the root is always `role="img"` with the file name; the spinner has no role or label (`file-thumbnail.tsx:75-78`, `:23-39`).
- **gpuix lacks:** nothing.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `port choice` (reason not stated).
- **Original:** no standalone demo. The component appears inside other pages: thumbnails at size 28 and radius 12 on the queued cards (`app/docs/input-message/page.tsx:446-450`).
- **Port:** its own page: Image, No preview, Pending and Radius rows at 28, 48, 64 and 96px (`src/demos/file-thumbnail.tsx:19-43`). The source has no counterpart; the queued-stack port passes `nestedRadius(shape.bg, 8)` to its 28px tiles (`src/components/queued-stack.tsx:444`), as the source's `attachmentRadius` is also a `nestedRadius` (`registry/blocks/queued-stack.tsx:73-76`, `:351`), so the radius 12 above is the input-message page's own tiles; that belongs to the queued-stack file.
- **Workaround:** n/a.
- **Fidelity:** n/a (an addition).
- **Components it hits:** queued-stack, chat-message, input-message.

## Sample photo: a different picture, named avatar.jpg

- **Cause:** `port choice` (the repository owner chose not to ship the source's photo).
- **Original:** the source's `public/micka.png` (918x928 PNG). The component has no docs page; its photo is the input-message page's attachment, a `File` named `micka.png` with type `image/png` (`app/docs/input-message/page.tsx:70-72`, `:604-606`).
- **Port:** `assets/chat-ai/avatar.jpg` (345x345 JPEG, `AVATAR_JPG` in `src/lib/assets.ts`), named `avatar.jpg` and typed `image/jpeg` in the demo's image row (`src/demos/file-thumbnail.tsx:7-11`). The name only surfaces in `alt` and `aria-label` (`src/components/file-thumbnail.tsx:77`, `:102`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
