# concepts (index, frame, Lumen)

Original: `app/concepts/page.tsx`, `app/concepts/layout.tsx`, `app/concepts/_components/concept-frame.tsx` and `app/concepts/lumen/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/pages/concepts.tsx` (group "Pages", order 30, layout "full", listed "menu"), `src/pages/concepts/frame.tsx` (`ConceptFrame`) and `src/pages/concepts-lumen.tsx` (order 31, layout "full", listed "none"). The nav is `NavMenu` / `NavItem`: see [nav-menu.md](nav-menu.md). Atlas, Beacon and Quill are other pages (`concepts-atlas`, `concepts-beacon`, `concepts-quill`).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of repeating it.

Checked and equal: the index is four rows centred in the window at 224px (`w-56`), with no nav or card (`bare`); the frame is a 224px nav (Home, then Lumen, Atlas, Beacon, Quill), a centre column and the customise card; Lumen's copy (question, step labels, description, the four sources and their site names, the three answer paragraphs, the four image captions, "Ask a follow-up…"), its 760px column with 24px side padding and 48px top and bottom, 40px between turns, 16px inside a turn, the tab icons (brain, globe, image), the badge colours per source, the thinking to answer beat of 1600 ms, and the source rows' 14 / 12 padding, 12px radius and `surface-2` fill.

## Route paths, `robots` and `layout.tsx`

- **Cause:** `port choice` (the app has no URLs).
- **Original:** the nav links go to `/concepts/<slug>` and `/` (`concept-frame.tsx:56-62`); `layout.tsx` sets `robots: noindex` and the section is left out of the sidebar (`layout.tsx:3-9`).
- **Port:** a concept is a page slug, `concepts-<name>`, and a nav click calls `navigate(slug)` (`src/pages/concepts/frame.tsx:75-96`); Home goes to `showcase`. Listing is `listed: "menu"` for the index (⌘K, no sidebar row) and `"none"` for Lumen. No `noindex` (a desktop app).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every concept page.

## A concept whose page is not there yet is an empty page

- **Cause:** `not ported yet` (Atlas, Beacon and Quill are other tasks).
- **Original:** `/concepts/atlas` etc. exist.
- **Port:** the frame lists `concepts-atlas`, `concepts-beacon` and `concepts-quill` (`src/pages/concepts/frame.tsx:10-15`). `App` renders nothing for a slug no demo or page owns, so clicking one shows the docs chrome (sidebar, customise card) around an empty column; it does not throw (`src/app.tsx`, the `Switch` in `App`).
- **Workaround:** none; it goes away when the pages land.
- **Fidelity:** dropped until then.
- **Components it hits:** just this one.

## The frame fills the window and scrolls its centre column

- **Cause:** `port choice` (the window is a fixed panel, not a scrolling document).
- **Original:** the nav is `sticky top-0 h-screen`, the right panel is its own component, and the page scrolls as a whole (`concept-frame.tsx:53`, `:41-46`). The nav is `hidden lg:flex`.
- **Port:** the frame is the panel's height, so the nav and the card stay put and the screen scrolls inside the centre column (`src/pages/concepts/frame.tsx:30-62`). A full-layout page's wrapper now has the panel's height (`src/app.tsx`, the `App` page column). The nav is always shown, at 224px; there is no `lg` breakpoint.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every concept page.

## The right panel is the app's customise card

- **Cause:** `port choice`.
- **Original:** `RightPanel` (`app/components/right-panel.tsx`): the GitHub star button, Theme, Radius, Size, Icons and Primitive selects with "Press T / R / S / I to cycle" tooltips, and the playground rail slot.
- **Port:** `ConceptFrame` renders the app's `CustomizeCard` (exported from `src/app.tsx`) in a 296px scrolling column (`src/pages/concepts/frame.tsx:52-60`), so it has the rows and the drift of the docs layout's card: Theme, Radius, Size, Icons, none of the extras. See `drift/site.md`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every concept page.

## Home leaves for the showcase, which the source's `/` is not

- **Cause:** `port choice`.
- **Original:** Home links to `/` (`concept-frame.tsx:56`), the marketing home with the bento grid.
- **Port:** Home navigates to `showcase`, the app's landing page (`src/pages/concepts/frame.tsx:75-80`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Lumen: the answer is a `ChatMessage` with rich children

- **Cause:** `port choice` (the port's `ChatMessage` took a string).
- **Original:** `Answer` passes `className="max-w-full"` and a block of three paragraphs to `ChatMessage` (`lumen/page.tsx:76-111`).
- **Port:** `ChatMessage` gained two additive props: `children` accepts any element (a string is still set in the message style) and `fullWidth` lifts the 80% cap (`src/components/chat-message.tsx:80-84`, `:138-143`). Lumen builds three `<text>` paragraphs with 12px between them (`src/pages/concepts-lumen.tsx:168-200`).
- **Workaround:** none needed.
- **Fidelity:** exact for the layout.
- **Components it hits:** chat-message (the extra props are the only change to it).

## Citation chips are inline runs, not Badges

- **Cause:** `gpuix gap`.
- **Original:** `Cite` is a `Badge` (`size="sm"`, `px-1.5`, `mx-0.5`, `-translate-y-px`) set inline in the paragraph (`lumen/page.tsx:62-73`).
- **Port:** a `<span>` with the accent fill around a no-break-spaced number, between two more no-break spaces (`src/pages/concepts-lumen.tsx:139-156`): the chip is square-cornered, takes the paragraph's 14px size and sits on the text line.
- **gpuix lacks:** padding, margin, radius and `fontSize` on an inline `<span>`, and a block (the `Badge`) flowing inside a paragraph (`~/code/fdarian/gpuix/FORK.md:765`, `:772`).
- **Workaround:** the no-break spaces, as the doc pages' inline code does (`src/lib/doc-page.tsx`, `Code`).
- **Fidelity:** approximated (no rounding, 14px not 11px digits).
- **Components it hits:** any inline chip in running text (doc-page `Code`).

## Image swatches are gradient boxes, not SVG data URIs through `ThinkingStepImage`

- **Cause:** `port choice` (`<img>` takes `file://` and `blob:` URLs, not `data:`; and `ThinkingStepImage` has no way to size to its parent).
- **Original:** `swatch()` builds a `data:image/svg+xml` gradient and the Images tab and the step both use `ThinkingStepImage` (`lumen/page.tsx:44-52`, `:201-207`, `:227-237`).
- **Port:** `SwatchImage` is a box with `backgroundImage: linear-gradient(135deg, a, b)`, 240:150, the container radius and the same inset hairline (`src/pages/concepts-lumen.tsx:110-128`). In the thinking step it is 200px wide with the caption under it; in the Images tab four of them share the row (`:266-289`). The step image has no entrance fade and no 0.1s delay.
- **Workaround:** none.
- **Fidelity:** approximated (the SVG's gradient runs corner to corner in the unit box, which on 240:150 is not exactly 135deg).
- **Components it hits:** just this one.

## Source rows are not links and gain no 100 ms shadow transition

- **Cause:** `not ported yet` for the shadow transition; `port choice` for the link.
- **Original:** each row is `<a href="#answer">` (jumps to the question heading) with `transition-shadow duration-100 hover:shadow-surface-4` (`lumen/page.tsx:114-140`).
- **Port:** a `div` with the `surface-2` fill and `shadowSurface(2)`, and `hover: { boxShadow: shadowSurface(4) }`, which switches at once (`src/pages/concepts-lumen.tsx:204-262`; `shadowSurface` is the surfaces page's helper, `src/pages/surfaces/elevated.tsx`). A click does nothing.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## The question is Inter Bold 700, not `wght 700 / opsz 25`

- **Cause:** `gpuix gap` (variable-font axes: README "gpuix gaps").
- **Original:** `text-[24px] leading-tight`, `fontWeights.bold` (`lumen/page.tsx:160-168`).
- **Port:** the static Bold cut at 24 / 30 (`src/pages/concepts-lumen.tsx:305-310`). The `semibold` run in the first paragraph is SemiBold 600.
- **gpuix lacks:** variable-font axes.
- **Workaround:** static cuts.
- **Fidelity:** approximated. The question stays 24px when the Size row is Compact, as in the source (a fixed `text-[24px]`).
- **Components it hits:** every page title and weight shift.

## Scrolling and the follow-up

- **Cause:** `port choice` (reason not stated) for the scroller; the source has the same missing scroll-to-new-turn.
- **Original:** `flex-1 overflow-y-auto` under an `h-screen` column, the ask bar pinned below (`lumen/page.tsx:274-300`); a new turn is appended and the page does not scroll to it.
- **Port:** the turns sit in the port's `ScrollArea` (a drawn scrollbar), the ask bar is pinned below it (`src/pages/concepts-lumen.tsx:442-460`); a new turn lands below the fold, as in the source, and the screenshot scenario scrolls to it. The turns live in a store keyed by `id`, so the answered turn keeps its open "Searched 4 sources" steps and its tab, as in React (`:408-436`). The timer is cleared on unmount.
- **Workaround:** none.
- **Fidelity:** approximated (scrollbar look); exact for the flow.
- **Components it hits:** just this one.

## Ask bar: `Button` is `compact`, there is no `sm`

- **Cause:** `port choice` (the port's `Button` has `default`, `compact`, `icon` and `icon-compact`).
- **Original:** `<Button variant="ghost" size="sm" leadingIcon={Globe}>Web</Button>` in the left slot (`lumen/page.tsx:295-297`).
- **Port:** `size="compact"` with `leadingIcon="globe"` (`src/pages/concepts-lumen.tsx:485`).
- **Workaround:** none.
- **Fidelity:** approximated (compact is 28px).
- **Components it hits:** just this one.

## The thinking step's header and tabs follow the port's `ThinkingSteps` and `TabsSubtle`

- **Cause:** `port choice`. See [thinking-steps.md](thinking-steps.md) and [tabs-subtle.md](tabs-subtle.md): only the selected panel mounts (the source's panels mount hidden), the source entrances' blur and scale are opacity only, and `ThinkingSteps width="100%"` stands for `className="w-full max-w-full"`.
- **Fidelity:** approximated.
- **Components it hits:** those two.
