# typography

Original: `app/docs/typography/page.tsx` and `demos.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), with `lib/docs/typeset-sample.tsx`, `lib/typeset/generate.ts` and `lib/docs/DocPage.tsx`.
Ported in `src/pages/typography.tsx` (the page) and `src/pages/typography/` (`step`, `text`, `scale`, `markdown`, `specimen`, `weight`, `numbers`, `trim`, `wrap`, `install-prompt`), routed by the page registry.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## The Markdown section is a static document, not a Tiptap editor

- **Cause:** `gpuix gap` (no rich-text editing primitive; `<input>` and `<textarea>` hold plain text) and `port choice`.
- **Original:** `TypesetEditor` is a Tiptap editor (StarterKit, task lists, tables, placeholder) on the `.typeset` sheet, with a hint line ("Type `#` for a heading, ...") and an **Inspect** switch that outlines the hovered block's lines, margins and padding and names the sheet rule that set them (`lib/docs/typeset-sample.tsx:130-527`).
- **Port:** `TypesetSample` (`src/pages/typography/markdown.tsx`) lays out `MARKDOWN_SAMPLE` block by block in the sheet's styles: h1 display bold, h2 title, h3 subtitle, body in the muted colour, bold and strikethrough runs, inline code, a link, bullets, numbers (1. a. i.), nested lists at the sheet's indents, a table, a code block, a rule, and the to-dos drawn like the library's checkbox. The margin above each block follows the sheet's cascade (`marginAbove`: block 12, h1 / h2 24, h3 20, under a heading 8, around a rule 24, list items 4; all from `TYPESET_SPACE`). Nothing can be typed. The to-dos still check and uncheck, and a hovered box darkens its outline as the sheet's does. The hint line, the Inspect switch, the focus-end click, the placeholder and the editor chrome (`px-5 py-6` / `sm:px-8 sm:py-8` is a fixed 32px) are not ported.
- **gpuix lacks:** an editable rich-text node. No ContentEditable, no selection-aware inline formatting.
- **Workaround:** static content with checkable to-dos.
- **Fidelity:** approximated (look); dropped (editing, Inspect).
- **Components it hits:** just this page.

## Italic is upright, and list markers are placed by estimate

- **Cause:** `gpuix gap` (italic).
- **Original:** `<em>` slants; bullets and numbers are `::marker`s.
- **Port:** inline code is a span at the typeset caption size with `padding: 0.1em 0.3em`, a 4px radius and the 7% wash, and the link is underlined at 35% (`src/pages/typography/markdown.tsx:42-77`), as in the source. The link does not navigate, as in the source: its editor sets `openOnClick: false` and a link in a `contenteditable` does not follow a click. `fontStyle: "italic"` is set on "glides" but no italic cut is loaded (`src/lib/fonts.ts` has the four upright cuts), and the capture shows it upright. Bullets are 5px circles and numbers are `tabular-nums` text, both drawn absolutely 10px and 8px before the text: where Chrome puts a `::marker` is estimated, not measured.
- **Fidelity:** approximated; italic dropped.
- **Components it hits:** just this page.

## The page follows the Size row, and the source's S shortcut is missing

- **Cause:** `not ported yet` (the global settings shortcuts, [site.md](site.md#theme-shortcut-tooltips-toasts)).
- **Original:** `SizeShortcut` toggles the site-wide size on a bare S; every `text-site-*` role, the specimen's numbers, the markdown and the buttons step with it (`lib/docs/size-shortcut.tsx`). The page's sentence "Press S for compact." is kept verbatim.
- **Port:** the page reads `sizeChoice()` from `src/lib/theme.ts`, the Size row's signal (`step.ts`: `roleStyle`, `space` and the `TYPESET_*` tables index by it). The port has no S shortcut (nor T, R or I): the settings shortcuts are not ported, so the sentence points at a key that does nothing here and compact is reached through the Size select. The specimen's sizes, the markdown's roles, spacing and to-do box, and the page's `siteType` text follow it. The page's `typeStyles`, `TYPESET_SPACE`, `TYPESET_CHECK` and `TYPESET_SUB_INDENT` are copies of the source's values (`lib/type-scale.ts`, `lib/typeset/generate.ts`); `typeStyles` could be `siteType` (it adds `micro`).
- **Fidelity:** approximated (shortcut dropped).
- **Components it hits:** just this page.

## The scale specimen has no scroll fade

- **Cause:** `port choice`.
- **Original:** a horizontal `ScrollArea` with `scroll-fade-x`, `min-w-[560px]` (`demos.tsx:76-138`); the Weight column reads the axes from `fontWeights`: 700 / opsz 25, 550 / opsz 18, 400 / opsz 14.
- **Port:** a plain `overflowX: "auto"` box with the same 560px minimum (the port's `ScrollArea` clipped the last row under its scrollbar here, and the 600px column never scrolls it). The Weight column and the glyphs use the same `fontWeights` tokens as the source.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## The rules' discs are drawn, not `list-disc`

- **Cause:** `gpuix gap` (no `list-style`, `::marker`; searched gpuix `README.md`).
- **Original:** `list-disc pl-5 marker:text-muted-foreground` with `pl-1` items, so the text sits 24px in (`app/docs/typography/page.tsx:113-132`).
- **Port:** `Rule` (`src/pages/typography/text.tsx:13-30`) indents the text 24px and draws a 5px disc 15px left of it; the disc's position is an estimate.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## Page header: no prev / next arrows

- **Cause:** `not ported yet` (arrows), `port choice` (Installation block, see [site.md](site.md#no-installation-block-on-component-pages)).
- **Original:** `DocPage` with `title`, `description`, `intro`, `installNote` and the prev / next arrows (`app/docs/typography/page.tsx:96-103`).
- **Port:** `DocPage` from `src/lib/doc-page.tsx`, which gained an optional `intro` paragraph (16px under the description, additive; motion's call is unchanged). The Copy prompt button copies `TYPOGRAPHY_INSTALL_PROMPT`, `buildInstallPrompt({ slug: "typography" })` written out. No arrows, as on [introduction.md](introduction.md#the-previous--next-arrows-are-missing).
- **Fidelity:** dropped (arrows).
- **Components it hits:** every docs page.

## Weight without reflow: the scripted pointer and the item's highlight

- **Cause:** `port choice` (reason not stated).
- **Original:** the left item eases `'wght' 400` to `'wght' 550` with optical size on auto and widens 2.4px; the right pairs the weight with `opsz` (`fontWeights.normal` / `.semibold`) and widens 0.1px. A scripted cursor clicks both items on and off while the demo is half on screen; a real pointer inside takes over; reduced motion leaves the item on (`demos.tsx:140-380`).
- **Port:** both items ease the weight over 80 ms with the colour, left on `'wght'` alone and right on the paired tokens (`PLAIN` and `PAIRED`, `src/pages/typography/weight.tsx:16-17`), and print the width each gains, measured by hidden copies of the label at both weights, drawn with the blue line and red wash as in the source. The scripted cursor is a `motion.div` gliding `top` over 600ms (a timer loop: glide, rest, click on 1.4s, click off, leave); a pointer inside stops it, and it restarts from the top when the pointer leaves, where the source resumes in place. It plays while at least half the frame is in the page scroller (`createVisibility`). Reduced motion leaves the item on, as in the source (`src/pages/typography/weight.tsx:265-267`). Hover and the active background are `opacity` fades on two layers, where the source glides a `FluidHoverHighlight`.
- **Workaround:** none.
- **Fidelity:** approximated (the script's resume point and the highlight's glide).
- **Components it hits:** just this page.

## Steady numbers is native

- **Cause:** none that matters: gpuix has `fontVariantNumeric: "tabular-nums"` (`README.md:6386`) and Inter 4.0 carries `tnum`.
- **Original:** two rows count 10 to 48 in `normal-nums` and `tabular-nums` while the demo is half on screen, hold while a pointer is inside, and show the last count under reduced motion (`demos.tsx:382-540`).
- **Port:** the same, with the widths of all 39 labels per row measured through hidden copies and `onLayout` (78 invisible texts); the proportional row drifts 6.0px where the browser measured 6.2px. The count ticks every 120ms on a timer while at least half the frame is on screen, and reduced motion shows the last count (`src/pages/typography/numbers.tsx:155-168`).
- **Fidelity:** exact in behaviour.
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
