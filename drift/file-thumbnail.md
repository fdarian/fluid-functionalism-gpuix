# file-thumbnail

Original: `registry/default/file-thumbnail.tsx`. It has no docs page of its own in the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`): it appears inside the input-message docs
page (`app/docs/input-message/page.tsx:449`, size 28, radius 12) and in the chat-message and queued-stack pieces.
Ported in `src/components/file-thumbnail.tsx`, demo in `src/demos/file-thumbnail.tsx`.

Ported and matching: the square with `bg-accent`, `overflow-hidden` and `shrink-0` (`file-thumbnail.tsx:114-126`), the image with `object-fit: cover` (`:139-151`), the 1px inset hairline painted over the preview at 10% black on light and 10% white on dark (`:154-167`; `color.overlay` flips per scheme), the generic document glyph (same two paths, stroke 1.5, `max(16, size * 0.35)`, muted, `:130-137`), and the ring spinner's size, radii and colours (24px, 2px stroke on a 11px radius, `border` ring with a `muted-foreground` arc, `:19-78`).

## No PDF page preview

- **Cause:** `gpuix gap`.
- **Original:** renders page 1 of a PDF through pdfjs onto a canvas and shows it as an image, and exports `loadPdfjs` and `renderPdfFirstPage` (`file-thumbnail.tsx:7-38`, `:108-135`, `:203`). A failed render (corrupt file, blocked worker) falls back to the glyph.
- **Port:** a PDF shows the generic document glyph (`file-thumbnail.tsx:130-137`); the two helpers are not exported.
- **gpuix lacks:** a drawing surface. `<canvas>` is listed as "Custom drawing (planned)" (`~/code/fdarian/gpuix/README.md:4975`), so pdfjs has nothing to render into; the only pixel path is `setImagePixels` on an `<img>` (`README.md:5066-5076`), which needs a rasteriser outside gpuix. `README.md:249` is the port's row.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one (queued-stack, chat-message and input-message show the glyph for a PDF).

## `animate-spin`: no rotate transform, driven from a JS clock

- **Cause:** `gpuix gap` for the rotation; the JS-driven arc is `not ported yet`.
- **Original:** `w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin`, one turn a second, linear (`file-thumbnail.tsx:167-173`).
- **Port:** two stacked SVGs: a static ring tinted `border`, and an arc (90 degrees, butt caps) whose source string is rewritten from the shared `onFrame` clock, 0.36 degrees a millisecond, rounded to whole degrees so the SVG cache sees at most 360 sources (`file-thumbnail.tsx:19-78`; `src/lib/clock.ts:58`, a 16 ms `setInterval`).
- **gpuix lacks:** rotation. There is no `transform`, and `motion` cannot animate an SVG `transform` attribute (`FORK.md:1198-1209`; `README.md:239`, `:333`). It does have keyframes with `repeat: Infinity` and `motion.circle` animating `strokeDasharray` / `strokeDashoffset` / `pathOffset` (`FORK.md:1144-1145`, `:1151-1152`; gpuix `README.md:1709-1735`); a circle with a 90-degree dash whose offset loops would turn the arc on the native clock with no JS and no per-frame source rewrite. The port has not tried it.
- **Workaround:** the frame clock above.
- **Fidelity:** approximated. It stalls with the JS thread, steps in whole degrees on a 16 ms timer, and re-parses an SVG each tick. The source's arc is the top border of a circle; its ends are cut along the 45-degree diagonals, which are radial for a circle, so the butt-capped arc should match within antialiasing (not compared pixel by pixel). The earlier note called the source arc a tapered join; I could not support that from the CSS.
- **Components it hits:** thinking-steps (the chevron, `drift/thinking-steps.md`), every JS-driven loop.

## The spinner is a prop, not a loading state

- **Cause:** `port choice` (the port has no async preview to wait on; reason otherwise not stated).
- **Original:** the spinner shows by itself while a preview is pending: an image before its object URL exists, a PDF while pdfjs renders (`file-thumbnail.tsx:132-135`, `:161-173`). It stays off for a failed PDF and an unsupported type.
- **Port:** the caller passes `pending` (`file-thumbnail.tsx:104-109`, `:127`); an image with a `src` shows no spinner while it decodes. A `pending` thumbnail ignores the image.
- **gpuix lacks:** n/a: `<img>` has `load` / `error` events for blob sources (`packages/native/js/blob-images.ts:20-24`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Input is a path, not a `File`

- **Cause:** `port choice` (reason not stated).
- **Original:** `file: File`; an image is shown through `URL.createObjectURL`, one blob URL per file shared by every thumbnail and revoked with the last one (`file-thumbnail.tsx:40-74`, `:94-100`).
- **Port:** `FileLike { name, type, src? }`, `src` a filesystem path or data URL; an image without `src` shows the glyph (`file-thumbnail.tsx:11-17`, `:110-112`). Consumers map their own file to it (`src/components/input-message.tsx:312-317`).
- **gpuix lacks:** nothing: `<img src="blob:...">` is read in-process (`packages/native/js/host.ts:1430-1431`; `blob-images.ts`).
- **Workaround:** pass a path.
- **Fidelity:** approximated.
- **Components it hits:** input-message, chat-message, queued-stack.

## No `className`

- **Cause:** `not ported yet`.
- **Original:** `radius` overrides the shape's radius, and `className` can override it too (`file-thumbnail.tsx:86-89`, `:93`, `:139-152`).
- **Port:** `radius` unless it is omitted, then `shape.bg`; no `className` (`file-thumbnail.tsx:104-109`, `:124`).
- **gpuix lacks:** nothing.
- **Workaround:** pass `radius`.
- **Fidelity:** approximated.
- **Components it hits:** every shape-aware component.

## Accessible names

- **Cause:** `port choice` (reason not stated).
- **Original:** the image has `alt` = file name, the spinner is `role="status"` with `aria-label="Loading preview"`, the glyph is `role="img"` with the file name (`file-thumbnail.tsx:157-181`).
- **Port:** the root is always `role="img"` with the file name; the spinner has no role or label (`file-thumbnail.tsx:114-117`, `:39-77`).
- **gpuix lacks:** nothing.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `port choice` (reason not stated).
- **Original:** no standalone demo. The component appears inside other pages: thumbnails at size 28 and radius 12 on the queued cards (`app/docs/input-message/page.tsx:446-450`).
- **Port:** its own page: Image, No preview, Pending and Radius rows at 28, 48, 64 and 96px (`src/demos/file-thumbnail.tsx:18-42`). The source has no counterpart; the queued-stack port uses `radius={0}` for its 28px tiles (`src/components/queued-stack.tsx:535`) where the source passes 12; that belongs to the queued-stack file.
- **Workaround:** n/a.
- **Fidelity:** n/a (an addition).
- **Components it hits:** queued-stack, chat-message, input-message.
