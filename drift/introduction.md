# introduction

Original: `app/docs/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`).
Ported in `src/pages/introduction.tsx`, routed by the page registry (`src/lib/demo.ts` `loadPages`, `src/app.tsx` `PageBody`).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## The previous / next arrows are missing

- **Cause:** `not ported yet`.
- **Original:** two ghost icon buttons with tooltips ("Showcase ←", "<first component> →") at the right of the header (`app/docs/page.tsx:35-53`).
- **Port:** none; the header is `App`'s heading and the page's subtitle.
- **Fidelity:** dropped.
- **Components it hits:** every docs page in the source has them (`lib/docs/DocPage.tsx`).

## The copy describes right-panel controls the port does not have

- **Cause:** `not ported yet` (Radius, Size and Icons rows); the Primitive row is not ported at all (Base UI only), so the Radix / Base UI sentence stays wrong.
- **Original:** "Customize using the right panel" lists light and dark, the corner radius, icon libraries, the Radix / Base UI install flavor, and "Press T, R, or I to flip the first three from the keyboard" (`app/docs/page.tsx:125-135`).
- **Port:** the text is verbatim (`src/pages/introduction.tsx:42`). The right column has only the Theme select, and no T / R / I shortcuts exist.
- **Fidelity:** exact text, describes more than the port offers.

## The heading is bold in the source, semibold here, and sits 8px above the subtitle only by a negative margin

- **Cause:** `gpuix gap` for the weight (variable font: README "Drift from the source", variable-font rows) and `port choice` for the rest.
- **Original:** `h1` `text-site-display leading-none mb-2` at `fontWeights.bold` (`app/docs/page.tsx:23-30`): a 28px line, 8px above the subtitle.
- **Port:** `App`'s shared `Heading` (`src/app.tsx:80-92`) is semibold 600 with a 34px line and sits a 24px column gap above the page, which the subtitle cancels with `marginTop: -16` (`src/pages/introduction.tsx:204`), so the gap reads 8px past the taller line box.
- **Workaround:** the negative margin.
- **Fidelity:** approximated.
- **Components it hits:** every page and demo heading (semibold, 34px line).

## Section titles use a 16px line

- **Cause:** `port choice` (to match `leading-none`).
- **Original:** `h2` / `h3` `text-site-title leading-none`, semibold 550 (`app/docs/page.tsx:60,139-145`): a 16px line.
- **Port:** `scale.title` with `lineHeight: 16` and SemiBold 600 (`src/pages/introduction.tsx:56-68`).
- **Fidelity:** exact line height, weight approximated (README variable-font row).

## Commands are `alignSelf: flex-start`, not `w-fit`

- **Cause:** `gpuix gap`: intrinsic `width` (README "Drift from the source", intrinsic-width row).
- **Original:** `<InputCopy className="w-fit">` (`app/docs/page.tsx:151,158,164`), so the hover tint and focus ring hug the command.
- **Port:** a wrapper with `alignSelf: "flex-start"` and `maxWidth: 100%` (`src/pages/introduction.tsx:95-100`); `InputCopy`'s own row is `width: 100%` of it. Whether the focus ring and the click target hug the text, or fill the wrapper, was not checked beyond the hover screenshot, where the tint is on the text only as in the source.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## The code block overflows the 600px column and scrolls

- **Cause:** `port choice` (the page column width, `src/app.tsx:77`).
- **Original:** `<pre class="text-site-caption bg-muted/60 rounded-lg px-4 py-3 overflow-x-auto w-fit max-w-full">` (`app/docs/page.tsx:186`), in the source's own column. Its width was not measured.
- **Port:** the same box with `overflowX: "scroll"` (`src/pages/introduction.tsx:157-197`). The longest line is 80 characters of 12px Menlo, about 578px, plus 32px of padding, so it overflows the 600px column by about 10px: the last characters of the `IconProvider` line need a scroll, and gpuix draws the scrollbar. No syntax highlighting, as in the source.
- **Fidelity:** approximated.

## Smaller differences

- **Cause:** `port choice` (reason not stated).
- **Original:** `hr` `border-border/60` (`app/docs/page.tsx:138,160,171`), the numbered badges `bg-muted` (`:148,155`), `font-mono` for the code (`:187`).
- **Port:** the rules use `color.borderFaint` (`rgba(…,0.072)`, exactly 60% of `border`, `src/lib/theme.ts:107,155`) and the code block `withAlpha(muted, 0.6)`. The code face is Menlo like `InputCopy`'s (`src/pages/introduction.tsx:14`), where the browser resolves `font-mono` to `ui-monospace`.
- **Fidelity:** exact except the monospace face (same in Chrome on macOS, not in Safari).

## The page-level `px-6`

- **Cause:** `port choice`.
- **Original:** the page content has `px-6` (`app/docs/page.tsx:20`).
- **Port:** the 600px column replaces the padding.
- **Fidelity:** approximated.
