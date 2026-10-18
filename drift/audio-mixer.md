# audio-mixer

Original: `app/slider/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`).
Ported in `src/pages/audio-mixer.tsx`, routed by the page registry (`src/lib/demo.ts` `loadPages`, `src/app.tsx` `PageBody`), listed in the site menu only.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## The column is 600 wide, the source's is 720

- **Cause:** `port choice` (the port keeps the docs layout; the page is `layout: "docs"`).
- **Original:** `w-full max-w-[720px] mx-auto px-10 py-10`, a 640px content column, no sidebar or right column (`app/slider/page.tsx:66`).
- **Port:** the docs column, 600 wide, with the sidebar on the left and the customise card on the right (`src/app.tsx:337-344`, `PAGE_WIDTH`). Sliders are 40px narrower, and the page sits inside the app frame rather than alone in the window.
- **Fidelity:** approximated (same rows, narrower tracks).
- **Components it hits:** every `layout: "docs"` page.

## The heading is 28px semibold, the source's 22px bold, and sits 4px above the subtitle only by a negative margin

- **Cause:** `not ported yet` for the weight (`weight.bold` exists, `Heading` sets `weight.semibold`) and `port choice` for the size.
- **Original:** `h1` `text-[22px]` at `fontWeights.bold`, 4px above the subtitle (`app/slider/page.tsx:68-77`); section titles are `text-[15px] leading-5.5` at `fontWeights.semibold` (`:84-87`).
- **Port:** `App`'s shared `Heading` (`src/app.tsx:80-93`), 28px with a 34px line, a 24px column gap above the page, cancelled to 4px by `marginTop: -20` on the subtitle (`src/pages/audio-mixer.tsx:161`). Section titles are 15 / 22 at `weight.semibold` (`:78-90`).
- **Workaround:** the negative margin.
- **Fidelity:** approximated.
- **Components it hits:** every docs page.

## Mid Freq starts below its own minimum

- **Cause:** `port choice` (kept as in the source).
- **Original:** `midFreq` starts at 50 while the slider's `min` is 200 (`app/slider/page.tsx:31`, `:141-150`), so the thumb sits at the left end and the label reads "50 Hz".
- **Port:** the same (`src/pages/audio-mixer.tsx:128`). The thumb sits at the left end and the label reads "Mid Freq: 50 Hz".
- **Fidelity:** exact.

## Everything else

Values, ranges, steps, labels, `formatValue` functions and row gaps (4 for the compact sections, 8 for Settings and Master Controls, 16 under each title, 48 between sections) match the source. The Effects Sends rows show no visible label in either (the compact engine prints `label` only as a value-label prefix, and `valuePosition="tooltip"` has none). Slider-level differences (transform-free motion, per-dot fades, colour snaps, no `<input type="range">`, press / drag behaviour) are in [`slider.md`](slider.md).

The page is reached from the site menu (`listed: "menu"`) and has no sidebar row, as in the source, where `/slider` is not linked from the docs nav. The menu glyph is Lucide's `sliders-horizontal`, added to `src/lib/icons.ts`.
