# file-thumbnail

Original: `registry/default/file-thumbnail.tsx`. Ported in `src/components/file-thumbnail.tsx`, demo in `src/demos/file-thumbnail.tsx`.

Transforms and font loading are already known gaps and are not repeated here.

## `overflow: hidden` clips to the rectangle, not the rounded box

- **Original:** `overflow-hidden` on a `rounded-lg` square crops the `<img>` (and the spinner or glyph) to the rounded corners.
- **gpuix lacks:** a rounded clip. GPUI's `ContentMask` is bounds only (`zed/crates/gpui/src/window.rs:1930`), so a child is cut to the element's rectangle and its square corners show through. Missing feature in GPUI, not a gpuix bug.
- **Workaround:** the `<img>` carries its own `borderRadius`, which GPUI does honour for images. Any child that paints a fill (not the case here) would need the same.
- **Fidelity:** exact for the image; the pattern would not work for an arbitrary child.
- **Components it hits:** chat-message and queued-stack (both embed thumbnails).

## `<img>` has no load or error event, and takes no `File`

- **Original:** reads a `File` through `URL.createObjectURL`, shows the spinner while the URL (or a pdfjs render) is pending, and falls back to the document glyph on error.
- **gpuix lacks:** `ImgProps` (`packages/native/js/host.ts`, `ImgProps`) has `src` (path, data URL, http URL), `objectFit` and `alt`, and no `onLoad` / `onError`. A JS caller cannot tell loading from loaded from failed, and there is no `File` / blob URL.
- **Workaround:** the port takes `{ name, type, src }` instead of a `File`, and `pending` is a prop the caller sets. A missing `src` shows the glyph.
- **Fidelity:** approximated. The load and error transitions are dropped.
- **Components it hits:** just this one.

## No PDF page preview

- **Original:** renders the first page of a PDF through pdfjs onto a canvas and shows it as an image.
- **gpuix lacks:** `<canvas>` is listed as an element type, but there is no way to draw pdfjs output into it from the Solid side, and `<img>` cannot take raw pixels without `setImagePixels`, which the port does not drive.
- **Workaround:** none. A PDF shows the generic document glyph.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## `animate-spin` and per-side border colours

- **Original:** a `border-2 border-border border-t-muted-foreground` ring that `animate-spin` turns once a second.
- **gpuix lacks:** rotation, an infinite or keyframed animation (`motion` animates `top` / `left` / `width` / `height` / `opacity` / `borderRadius` only, no repeat, `README.md` "Keyframes ... not available yet"), and a different colour per border side (`borderColor` is one value).
- **Workaround:** two stacked `<svg source>` layers: a static ring tinted `border`, and an arc whose SVG source string is rewritten by a 33 ms `setInterval`, rotating the path by 12 degrees a step. The arc is a plain-stroke quadrant rather than the tapered border join.
- **Fidelity:** approximated. About 30 steps a second on a JS timer instead of a compositor animation; a step is a new SVG string, which GPUI rasterises once and then finds in its sprite atlas (keyed by a hash of the bytes, `zed/crates/gpui/src/elements/svg.rs:53`). Thirty distinct angles, so the cache stays bounded after the first turn.
- **Components it hits:** thinking-indicator (the glyph morph) and thinking-steps (the chevron) use the same SVG-rewrite technique; see their files.
