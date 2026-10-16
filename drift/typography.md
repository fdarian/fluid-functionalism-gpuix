# typography

Original: `app/docs/typography/page.tsx` and `demos.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), with `lib/docs/typeset-sample.tsx`, `lib/typeset/generate.ts` and `lib/docs/DocPage.tsx`.
Ported in `src/pages/typography.tsx` (the page) and `src/pages/typography/` (`step`, `text`, `scale`, `markdown`, `specimen`, `weight`, `numbers`, `trim`, `wrap`, `install-prompt`), routed by the page registry.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## The Markdown section is a static document, not a Tiptap editor

- **Cause:** `gpuix gap` (no rich-text editing primitive; `<input>` and `<textarea>` hold plain text) and `port choice`.
- **Original:** `TypesetEditor` is a Tiptap editor (StarterKit, task lists, tables, placeholder) on the `.typeset` sheet, with a hint line ("Type `#` for a heading, ...") and an **Inspect** switch that outlines the hovered block's lines, margins and padding and names the sheet rule that set them (`lib/docs/typeset-sample.tsx:130-527`).
- **Port:** `TypesetSample` (`src/pages/typography/markdown.tsx`) lays out `MARKDOWN_SAMPLE` block by block in the sheet's styles: h1 display bold, h2 title, h3 subtitle, body in the muted colour, bold and strikethrough runs, inline code, a link, bullets, numbers (1. a. i.), nested lists at the sheet's indents, a table, a code block, a rule, and the to-dos drawn like the library's checkbox. The margin above each block follows the sheet's cascade (`marginAbove`: block 12, h1 / h2 24, h3 20, under a heading 8, around a rule 24, list items 4; all from `TYPESET_SPACE`). Nothing can be typed. The to-dos still check and uncheck, and a hovered box darkens its outline as the sheet's does. The hint line, the Inspect switch, the focus-end click, the placeholder and the editor chrome (`px-5 py-6` / `sm:px-8 sm:py-8` is a fixed 32px) are not ported.
- **gpuix lacks:** an editable rich-text node. No ContentEditable, no selection-aware inline formatting.
- **Workaround:** static content with checkable to-dos.
- **Fidelity:** approximated (look); dropped (editing, Inspect).
- **Components it hits:** just this page.

## Inline runs inside the markdown can't size, pad or navigate

- **Cause:** `gpuix gap` (a `<span>` takes no `fontSize`, padding, border, radius or events: gpuix `README.md:2670-2679`) and `gpuix gap` (italic).
- **Original:** `` ` `` code is caption-sized with `padding: 0.1em 0.3em` and a 4px radius; `<a>` navigates to `/docs/motion`; `<em>` slants.
- **Port:** inline code is a monospace run at the paragraph's 13px (12px in the source) with a no-break space each side as its padding, square-cornered; the link is underlined at 35% and does nothing; `fontStyle: "italic"` is set on "glides" but no italic cut is loaded (`src/lib/fonts.ts` has the four upright cuts), and the capture shows it upright. Bullets are 5px circles and numbers are `tabular-nums` text, both drawn absolutely 10px and 8px before the text: where Chrome puts a `::marker` is estimated, not measured.
- **Fidelity:** approximated; italic dropped.
- **Components it hits:** just this page; the same inline-run limits as [surfaces.md](surfaces.md).

## The table is a grid, its column widths estimated

- **Cause:** `gpuix gap` (no `display: table`, README "gpuix gaps across components", table row) and `port choice`.
- **Original:** an auto-layout `<table width: 100%>` whose columns share the extra width in proportion to their widest cell (`generate.ts`, `el("table")`); a Tiptap `.tableWrapper` scrolls it sideways.
- **Port:** a `display: grid` with `minmax(max-content, Nfr)` tracks, N the longest cell's character count; cells carry the `0.5em 0.75em` padding and a `border` rule each. No sideways scroll. The code block scrolls sideways (`overflowX: "auto"`) as the sheet's `pre` does, with no syntax colours (the source has none either).
- **Fidelity:** approximated.
- **Components it hits:** just this page; the Spacing table below uses `3fr 1fr 1fr` the same way.

## The page follows the Size row, and the source's S shortcut is missing

- **Cause:** `not ported yet` (the global settings shortcuts, [site.md](site.md#theme-shortcut-tooltips-toasts)).
- **Original:** `SizeShortcut` toggles the site-wide size on a bare S; every `text-site-*` role, the specimen's numbers, the markdown and the buttons step with it (`lib/docs/size-shortcut.tsx`). The page's sentence "Press S for compact." is kept verbatim.
- **Port:** the page reads `sizeChoice()` from `src/lib/theme.ts`, the Size row's signal (`step.ts`: `roleStyle`, `space` and the `TYPESET_*` tables index by it). The port has no S shortcut (nor T, R or I): the settings shortcuts are not ported, so the sentence points at a key that does nothing here and compact is reached through the Size select. The specimen's sizes, the markdown's roles, spacing and to-do box, and the page's `siteType` text follow it. The page's `typeStyles`, `TYPESET_SPACE`, `TYPESET_CHECK` and `TYPESET_SUB_INDENT` are copies of the source's values (`lib/type-scale.ts`, `lib/typeset/generate.ts`); `typeStyles` could be `siteType` (it adds `micro`).
- **Fidelity:** approximated (shortcut dropped).
- **Components it hits:** just this page.

## The scale specimen has no scroll fade, and shows the variable-font numbers over static cuts

- **Cause:** `port choice` (scroll), `gpuix gap` (variable axes, README "gpuix gaps across components", variable-font row).
- **Original:** a horizontal `ScrollArea` with `scroll-fade-x`, `min-w-[560px]` (`demos.tsx:76-138`); the Weight column reads the axes from `fontWeights`: 700 / opsz 25, 550 / opsz 18, 400 / opsz 14.
- **Port:** a plain `overflowX: "auto"` box with the same 560px minimum (the port's `ScrollArea` clipped the last row under its scrollbar here, and the 600px column never scrolls it). The numbers shown are the source's (550, opsz 18); the glyphs are the static Bold, SemiBold 600 and Regular cuts.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## Paragraphs with code chips or links are a wrapping row of words, and the links shell out

- **Cause:** `gpuix gap` (as the description's links in [surfaces.md](surfaces.md#the-descriptions-light-and-dark-links-are-laid-out-word-by-word-and-underlined-solid)), `port choice` (opening).
- **Original:** `<p>` with `<Code>` chips (`mx-1 px-1 py-0.5`, 12px) and `ExternalLink` anchors (`target="_blank"`, `underline-offset-4`).
- **Port:** `Sentence` (`src/pages/typography/text.tsx`) lays each such sentence out as a row of one item per word with a 3.6px space after it, the chips as padded `<text>` blocks (so the 12px size and the 4px padding are exact) and the links as clickable `<text>` blocks that run `open` (`xdg-open` off macOS) on the URL. Line breaks can differ from the browser's by a word, and kerning across a space is lost. The underline is solid and not offset 4px (`FORK.md:768-772`). The "5 rules" and "5 no-gos" lists draw their discs themselves (`Rule`): `list-disc pl-5` with `pl-1` items puts the text 24px in; the disc's position is an estimate.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## Page header: no prev / next arrows

- **Cause:** `not ported yet` (arrows), `port choice` (Installation block, see [site.md](site.md#no-installation-block-on-component-pages)).
- **Original:** `DocPage` with `title`, `description`, `intro`, `installNote` and the prev / next arrows (`app/docs/typography/page.tsx:96-103`).
- **Port:** `DocPage` from `src/lib/doc-page.tsx`, which gained an optional `intro` paragraph (16px under the description, additive; motion's call is unchanged). The Copy prompt button copies `TYPOGRAPHY_INSTALL_PROMPT`, `buildInstallPrompt({ slug: "typography" })` written out. No arrows, as on [introduction.md](introduction.md#the-previous--next-arrows-are-missing).
- **Fidelity:** dropped (arrows).
- **Components it hits:** every docs page.

## Weight without reflow: both specimens are the same static cut

- **Cause:** `gpuix gap`: variable-font axes (`fontVariationSettings`; README "gpuix gaps across components", variable-font row). gpuix renders only a font's default instance, and `lib/fonts.ts` loads four static cuts.
- **Original:** the left item eases `'wght' 400` to `'wght' 550` with optical size on auto and widens 2.4px; the right pairs the weight with `opsz` (`fontWeights.normal` / `.semibold`) and widens 0.1px. A scripted cursor clicks both items on and off while the demo is half on screen; a real pointer inside takes over; reduced motion leaves the item on (`demos.tsx:140-380`).
- **Port:** both items are Regular 400 to SemiBold 600, which switches at once, so they are the same and widen 3.0px (measured by hidden copies of the label at both weights, drawn with the blue line and red wash as in the source). The right side keeps the source's text for its caption but reads "needs variable axes", with a ⚠️ where the source has ✅, so the demo does not claim a result it cannot show. The scripted cursor is a `motion.div` gliding `top` over 600ms (a timer loop: glide, rest, click on 1.4s, click off, leave); a pointer inside stops it, and it restarts from the top when the pointer leaves, where the source resumes in place. It plays while at least half the frame is in the page scroller (`createVisibility`). Reduced motion is not read. Hover and the active background are `opacity` fades on two layers, where the source glides a `FluidHoverHighlight`.
- **Workaround:** none for the paired axes; the port's real answer to a label that gains weight in place is `StableLabel` (README variable-font row), which this demo does not use.
- **Fidelity:** approximated (left), dropped (right).
- **Components it hits:** card, table and every `StableLabel`, as the README row says.

## Steady numbers is native

- **Cause:** none that matters: gpuix has `fontVariantNumeric: "tabular-nums"` (`README.md:5300`) and Inter's static cuts carry `tnum`.
- **Original:** two rows count 10 to 48 in `normal-nums` and `tabular-nums` while the demo is half on screen, hold while a pointer is inside, and show the last count under reduced motion (`demos.tsx:382-540`).
- **Port:** the same, with the widths of all 39 labels per row measured through hidden copies and `onLayout` (78 invisible texts); the proportional row drifts 6.0px where the browser measured 6.2px. The count ticks every 120ms on a timer while at least half the frame is on screen, and reduced motion shows the last count (`src/pages/typography/numbers.tsx:155-168`).
- **Fidelity:** exact in behaviour.
- **Components it hits:** just this page.

## Trimmed labels emulate `text-box` with Inter's metrics

- **Cause:** `gpuix gap`: no `text-box-trim` / `text-box-edge` (README "gpuix gaps across components", badge row).
- **Original:** the right chip's label has `text-box: trim-both cap alphabetic`; the markers are measured from the live DOM (a baseline probe, the font size times `1490/2048`); a browser without `text-box` shows "not in this browser yet" (`demos.tsx:542-650`).
- **Port:** the trimmed label is pulled up and down by the font's own leading (`marginTop` and `marginBottom` of 5.26px and 5.28px, from Inter's hhea ascender 1984, descender 494 and capital height 1490 per 2048 em at 13px on a 20px line), so 8px of padding reads as 8px; the blue lines and red washes are placed from the same numbers, not measured. Captured, the baseline line sits about half a pixel above the glyphs' feet. The captions read "13px above the capitals" and "8px", as the source's. The unsupported-browser branch is dropped.
- **Workaround:** negative margins from font constants; they hold only for 13px Inter on a 20px line.
- **Fidelity:** approximated.
- **Components it hits:** badge (README row).

## Balanced headings and pretty paragraphs: the good side has its break written in

- **Cause:** `gpuix gap`: no `text-wrap` (`balance`, `pretty`); the style list has none (`README.md:5298`).
- **Original:** the same 214px headline and paragraph, the left `text-wrap: wrap`, the right `balance` or `pretty` (`demos.tsx:652-709`).
- **Port:** the left side wraps natively, and at 214px gpuix breaks them where the source measured Chrome ("Give every component the / same motion"; "... sits under your / cursor."). The right side is the same text with the browser's choice written in as a newline under `whiteSpace: "pre-line"` ("Give every component / the same motion"; "... sits under / your cursor."). It is a fixed result: it will not re-balance if the width, the font or the copy changes.
- **Workaround:** the explicit break.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## Smaller differences

- **Cause:** `port choice`, `not ported yet` where noted.
- **Original and Port:**
  - Spec and gap tables: `border-border/40` is the dark literal `rgba(245,245,245,0.048)` (light `rgba(23,23,23,0.048)`) because `color.border` is an rgba `withAlpha` cannot mix (`borderFainter` in `step.ts`), as in [surfaces.md](surfaces.md#smaller-differences).
  - `text-site-subtitle`, `text-site-body` and `text-site-caption` are `siteType.subtitle`, `.body` and `.caption`; the demos' `typeClass` text (numbers, weight, trim, wrap) is `type.*`.
  - The tweak frames are a page-local `TweakFrame` (`ComponentPreview hideHeader`: `px-8 py-12`, `min-h-[120px]`, no header) and `Specimen`; the 560px column makes them 534px wide inside, so the two-column grid's `max-w-xl` is not reached.
  - The ✅ and ❌ are emoji glyphs, as in [motion-page.md](motion-page.md).
  - ⌘K: the System row has no icon, its keywords are the slug and the description's words (`app/components/site-command-menu.tsx:206-225`) written out in `menuKeywords`; the menu's "New" badge is not ported. The sidebar row has no dot, which is the source's too now: Typography is listed ahead of its release, and the nav dots follow released entries only. The sidebar order is alphabetical like the source's `systemNavList`, so `order = 7` (after Surfaces).
  - The scenario sets the theme to light in code for `markdown-light`, then back to dark; the script's own final light step through the theme select still fails (known, README / lead notes). After a keypress the capture shows two vertical lines at the page column's edges (the scroller's focus ring).
- **Fidelity:** approximated.
