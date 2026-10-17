# scrollbars (page)

Original: `app/docs/scrollbars/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), inside
`DocPage` / `DocSection` (`lib/docs/DocPage.tsx`) and `ComponentPreview` (`lib/docs/ComponentPreview.tsx`).
Ported in `src/pages/scrollbars.tsx`, with the four demos in `src/pages/scrollbars/demos.tsx`, the snippets in `code.ts` and the
Copy prompt brief in `install-prompt.ts`, routed by the page registry (`src/lib/demo.ts` `loadPages`). The doc chrome, its code chips,
Copy prompt button, `ComponentPreview` frame and the missing prev / next arrows are the same as the Motion page's: see `drift/motion-page.md`.
The scrollbar, fade and `ScrollArea` behaviour is `drift/scroll-area.md`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, variable-font axes, `text-box-trim`, `text-wrap: balance`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## "The problem" has no scripted cursor

- **Cause:** `not ported yet` (the component cannot be driven; see `drift/scroll-area.md`, "Demo: 'The problem' is static and smaller").
- **Original:** one fake cursor per list rides a shared clock: it slides in, rests, scrolls down and back, and slides out. It dispatches `pointermove` / `pointerout` on the `ScrollArea` and sets `scrollTop` on both lists each frame, so the scrollbar shows and the edges fade with no user input. A real pointer inside the demo takes over and the script pauses (`app/docs/scrollbars/page.tsx:246-370`; `lib/docs/fake-cursor.tsx`).
- **Port:** two 256 x 224 lists (`w-64 h-56`) and the source's two captions, still until a real pointer hovers or wheels one. The right one is the real `ScrollArea` with `fade`, so hover, wheel, drag and the fade all work on it. No cursor is drawn: the port's `ScrollArea` has no `ref`, hover prop or controlled offset (`src/components/scroll-area.tsx:38-59`), so a cursor over it with the thumb left hidden would be fake, and a cursor that scrolled only the plain list would show the two panels doing different things. The page shows no play / pause control; neither does the source (its script pauses only while a real pointer is inside).
- **gpuix lacks:** nothing; this is the component's API.
- **Workaround:** none without a component change.
- **Fidelity:** approximated (static first paint, real input only).

## The plain list is gpuix's overflow, not macOS's hidden scrollbar

- **Cause:** `port choice` (no way to ask gpuix for the OS scrollbar's behaviour).
- **Original:** `overflow-y-auto` on a div, which on macOS shows no bar until a scroll starts, then the OS default bar (`app/docs/scrollbars/page.tsx:339-344`).
- **Port:** `overflowY: "scroll"` with gpuix's own overlay bar (`src/pages/scrollbars/demos.tsx`, `testId="scrollbars-plain"`). It also appears on scroll and fades after, so the left panel does what its caption says, but it is gpuix's bar, not the OS's.
- **Fidelity:** approximated.

## The `R` key and the Primitive toggle are described and not there

- **Cause:** `not ported yet` (the `R` shape shortcut and the Radix / Base UI toggle); Primitive is not ported at all (the port has Base UI behaviour only, README).
- **Original:** "Press R to see the radius follow the shape system" and "switch with the Primitive toggle" (`app/docs/scrollbars/page.tsx:506-518`); `R` cycles the site's radius (`lib/docs/shape-shortcut.tsx`) and the toggle swaps the Radix and Base UI scroll areas.
- **Port:** the prose is verbatim. `R` does nothing; the Radius row in the customise card changes the radius instead (the lists' frames follow it through `shape.container`), and there is no Primitive control. The `R` is a `flush` code chip (`px-1 py-0.5`, 12px mono, 4px radius, as the source's `<kbd>`) on the code chips' wash and foreground text, where the source's `<kbd>` is `bg-muted` with the paragraph's muted text (`src/pages/scrollbars.tsx`).
- **Fidelity:** exact text, describes more than the port does.

## Links underline at the default offset

- **Cause:** `gpuix gap` (an underline offset, see [`card.md`](card.md#the-link-variant-underlines-at-the-default-offset)).
- **Original:** `<a href target="_blank" className="underline underline-offset-2">` for Lina and shadcn's scroll-fade (`app/docs/scrollbars/page.tsx:516-541`).
- **Port:** the shared `Link` (`src/lib/doc-page.tsx:84-122`): an underlined `<span>` in the paragraph's colour with a pointer cursor, a Tab stop and a focus ring, that opens the URL in the system browser on a click or Enter (`openUrl`, as the changelog's refs do). The underline sits at the font's default offset, not 2px.
- **Workaround:** none.
- **Fidelity:** approximated (underline offset).

## The horizontal strip is given a 104px height

- **Cause:** `port choice` (the area's viewport is `height: 100%`, `drift/scroll-area.md` "Demo: the horizontal strip needs an explicit height").
- **Original:** `className="w-full"`, as tall as its tiles (`app/docs/scrollbars/page.tsx:388-403`).
- **Port:** `height={104}` (80px tile and 12px padding either side). Tiles, gap, padding and the faded edges match.
- **Fidelity:** exact at that height.

## Snippets show the web API

- **Cause:** `port choice`.
- **Original:** the Code tabs are the source's four snippets (`app/docs/scrollbars/page.tsx:59-181`).
- **Port:** the same text, verbatim (`src/pages/scrollbars/code.ts`), so they show `viewportClassName="scroll-fade"` and Tailwind classes where the port's `ScrollArea` takes `fade` and a `style`. Plain monospace, no highlighting (`drift/motion-page.md`).
- **Fidelity:** exact text, not runnable in the port.

## Preview padding

- **Cause:** none (additive).
- **Original:** `ComponentPreview padding="none"` for the horizontal and table demos, `"responsive"` (`px-8 py-12` from `sm` up) for the others, `minHeightClass="min-h-0"` for the horizontal one (`app/docs/scrollbars/page.tsx:374-424`).
- **Port:** `ComponentPreview` in `src/lib/doc-page.tsx` gained `padding?: "default" | "none"`; the horizontal demo also passes `minHeight={0}`. The responsive stacking of the two lists below `sm` is not ported (fixed 600px column).
- **Fidelity:** exact at desktop width.

## The API reference section is left out

- **Cause:** `port choice` (the port has no API tables).
- **Original:** an "API reference" section with a `PropsTable` of `orientation`, `viewportClassName`, `className` (`app/docs/scrollbars/page.tsx:187-206`, `:576-579`).
- **Port:** not shown. The port's own props are `orientation`, `fade`, `fadeSize`, `divider`, `width`, `height`, `style`, `testId` (`drift/scroll-area.md`, "Props").
- **Fidelity:** dropped.

## The ⌘K row

- **Cause:** none (the source's System rows have no icon).
- **Original:** `keywords: [s.slug, ...s.description.split(/\W+/)]`, no icon (`app/components/site-command-menu.tsx:206-218`).
- **Port:** `menuKeywords = ["scrollbars", ...description.split(/\W+/)]` of the `systemList` description (`src/pages/scrollbars.tsx`), no `menuIcon`.
- **Fidelity:** exact.
