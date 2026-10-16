# concepts (index, frame, Lumen, Atlas, Beacon, Quill)

Original: `app/concepts/page.tsx`, `app/concepts/layout.tsx`, `app/concepts/_components/concept-frame.tsx` and `app/concepts/lumen/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/pages/concepts.tsx` (group "Pages", order 30, layout "full", listed "menu"), `src/pages/concepts/frame.tsx` (`ConceptFrame`) and `src/pages/concepts-lumen.tsx` (order 31, layout "full", listed "none"). The nav is `NavMenu` / `NavItem`: see [nav-menu.md](nav-menu.md). Atlas, Beacon and Quill are other pages (`concepts-atlas`, `concepts-beacon`, `concepts-quill`).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of repeating it.

Checked and equal: the index is four rows centred in the window at 224px (`w-56`), with no nav or card (`bare`); the frame is a 224px nav (Home, then Lumen, Atlas, Beacon, Quill), a centre column and the customise card; Lumen's copy (question, step labels, description, the four sources and their site names, the three answer paragraphs, the four image captions, "Ask a follow-up…"), its 760px column with 24px side padding and 48px top and bottom, 40px between turns, 16px inside a turn, the tab icons (brain, globe, image), the badge colours per source, the thinking to answer beat of 1600 ms, and the source rows' 14 / 12 padding, 12px radius and `surface-2` fill.

Atlas. Original: `app/concepts/atlas/page.tsx`. Ported in `src/pages/concepts-atlas.tsx` (group "Pages", order 32, layout "full", listed "none"), inside `ConceptFrame`.

Checked and equal: the three seeded messages and their text, the "Just now" time on user messages, the copy and regenerate actions on assistant messages, the 720px column (`max-w-[720px]`) with 24px side padding, 48px top and bottom and 20px between messages, the composer's `Message Atlas…` placeholder, 1 to 6 rows, the image button in the left slot, the footnote "Atlas can make mistakes. This is a concept screen." (11px / 14, muted, centred), the 1800 ms reply, the `ThinkingIndicator` while responding, the reply text echoing the first 40 characters, and a second message sent while answering joining the composer's queue.

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
- **Port:** `ChatMessage` gained two additive props: `children` accepts any element (a string is still set in the message style) and `fullWidth` lifts the 80% cap (`src/components/chat-message.tsx:80-84`, `:142-147`). Lumen builds three `<text>` paragraphs with 12px between them (`src/pages/concepts-lumen.tsx:168-200`).
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
- **Port:** a `div` with the `surface-2` fill and `shadow(2)`, and `hover: { boxShadow: shadow(4) }`, which switches at once (`src/pages/concepts-lumen.tsx:204-262`; `shadow` is the `--shadow-N` helper in `src/lib/theme.ts`). A click does nothing.
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

## Atlas: the attachment is a temp file, not an in-memory `File`

- **Cause:** `port choice` (gpuix reads images from paths; `ChatMessage` takes `FileLike`, not `File`: see [chat-message.md](chat-message.md)).
- **Original:** `makeDemoFile()` builds an SVG `Blob` in a `File` named `architecture.svg` and attaches it to the first message in an effect (`atlas/page.tsx:48-53`, `:71-76`).
- **Port:** the same SVG string is written to `os.tmpdir()/atlas-*/architecture.svg` when the page mounts, and the message carries `{ name, type, src }` (`src/pages/concepts-atlas.tsx:87-98`). A message sent from the composer maps its `ComposerFile`s the same way.
- **Workaround:** n/a.
- **Fidelity:** exact for the thumbnail.
- **Components it hits:** file-thumbnail, input-message.

## Atlas: message text keeps its line breaks through a local `Lines`

- **Cause:** `not ported yet` (`ChatMessage` has no `whiteSpace: pre-wrap`; see "Message body" in [chat-message.md](chat-message.md)).
- **Original:** the string is the child and the bubble is `whitespace-pre-wrap` (`atlas/page.tsx:147`).
- **Port:** each `\n`-separated line is its own `<text>` in a column, and an empty line is a 20px spacer (`src/pages/concepts-atlas.tsx:101-115`). The body style is repeated as `MESSAGE_TYPE` 14 / 20 (`:29`) because a node child does not get the component's own.
- **Workaround:** the above; closes if `ChatMessage` sets `whiteSpace: "pre-wrap"` on string children.
- **Fidelity:** approximated (the same lines; wrap points can differ by a word).
- **Components it hits:** chat-message.

## Atlas: the thinking indicator's padding is cancelled with a negative margin

- **Cause:** `port choice` (the port's `ThinkingIndicator` has no `className`; its 12px side padding is fixed).
- **Original:** `<ThinkingIndicator className="!px-0" />` inside `ChatMessage className="max-w-full"` (`atlas/page.tsx:151-153`).
- **Port:** `ChatMessage fullWidth` and a wrapper with `marginLeft: -12` (`src/pages/concepts-atlas.tsx:241-244`), so the glyph lines up with the message text. The right 12px stays; nothing sits there.
- **Workaround:** the margin; a padding prop on `ThinkingIndicator` would replace it.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Atlas: the transcript does not follow a new message

- **Cause:** `gpuix gap` (the port's `ScrollArea` exposes no viewport ref or scroll-to-end; the viewport is internal, `src/components/scroll-area.tsx:490-494`).
- **Original:** a `requestAnimationFrame` smooth `scrollTo` the bottom when a message is sent and again when the reply lands (`atlas/page.tsx:78-83`, `:89`, `:103`).
- **Port:** nothing; once the transcript is taller than the column, a new message and the thinking indicator land below the fold and the user scrolls. The screenshot script scrolls to them.
- **Workaround:** none. Needs a `ScrollArea` prop (`stickToEnd`, or an `onViewport` ref) to scroll to the end after the content grows.
- **Fidelity:** dropped (follow-the-latest behaviour).
- **Components it hits:** just this one.

## Atlas: Stop cancels the pending reply

- **Cause:** `port choice` (the source looks like a bug).
- **Original:** `onStop` sets `responding` and `status` back to idle but the `setTimeout` is not cleared, so the reply still lands afterwards (`atlas/page.tsx:90-104`, `:169-172`).
- **Port:** the timer is cleared on Stop and on unmount (`src/pages/concepts-atlas.tsx:154`, `:192-196`).
- **Workaround:** n/a.
- **Fidelity:** approximated (Stop works).
- **Components it hits:** just this one.

## Atlas: the buttons are `icon-compact`, not `icon-sm`, and copy / regenerate do nothing

- **Cause:** `port choice` (the port's `Button` has no `sm`; the source buttons have no handlers either).
- **Original:** `<Button variant="ghost" size="icon-sm">` with a `useIcon("copy" | "rotate-ccw" | "image")` child (`atlas/page.tsx:178-185`, `:207-212`).
- **Port:** `size="icon-compact"` (28px) with `icon="copy"`, `"rotate-ccw"`, `"image"`, so they follow the Icons row (`src/pages/concepts-atlas.tsx:117-135`, `:276-285`). The attach button opens the platform file picker.
- **Workaround:** none.
- **Fidelity:** approximated (button size).
- **Components it hits:** just this one.

## Atlas: the transcript is the port's `ScrollArea`

- **Cause:** `port choice` (as in Lumen).
- **Original:** `h-screen` column, `flex-1 overflow-y-auto` transcript, ids from `Date.now()` (`atlas/page.tsx:94`, `:116`, `:131-133`).
- **Port:** a `flexGrow: 1` box in the frame's column holding a `ScrollArea` (a drawn scrollbar); ids come from a counter (`src/pages/concepts-atlas.tsx:143`, `:207-211`).
- **Workaround:** none.
- **Fidelity:** approximated (scrollbar look).
- **Components it hits:** just this one.

## Beacon: body cells with a badge or an avatar are drawn by hand

- **Cause:** `port choice` (the port's `TableCell` sets only text, in the muted colour).
- **Original:** `TableCell` takes any children and a `className`: the Status and Priority badges, the Owner avatar, the mono muted ID and the always-foreground title (`beacon/page.tsx:135-153`).
- **Port:** the header uses `TableHead`; every body cell is a local `BodyCell` with `TableCell`'s padding (12 / 8, or 10 / 5 in Compact, read from `sizeChoice()`) and the cell text set in the page. The row is still a `TableRow` with an `index`, so the fluid hover highlight and the hidden borders work (`src/pages/concepts-beacon.tsx:302-405`). The lit row does not brighten the muted ID: `TableCell`'s lit-row colour is not reachable from a hand-drawn cell (the source's ID cell is `text-muted-foreground` throughout, so this matches it).
- **gpuix lacks:** nothing.
- **Workaround:** none. `TableCell` would need a non-text `children` and `color` / `mono` props.
- **Fidelity:** exact in the look; the padding duplicates `cellMetrics` in `src/components/table.tsx`.
- **Components it hits:** `Table`.

## Beacon: the Display popover sits above the table through a `zIndex` on the toolbar

- **Cause:** `gpuix gap` (paint order is per parent: a positioned `Table` root in the content paints above a static toolbar's absolute popover).
- **Original:** `absolute right-0 top-full z-50 mt-1.5` around `Dropdown` (`beacon/page.tsx:240`).
- **Port:** the same absolute box (`right: 0`, `top: 100%`, `marginTop: 6`) with `Dropdown` as the panel; the toolbar row is `position: relative; zIndex: 1` so the box paints over the table (`src/pages/concepts-beacon.tsx:516-560`, `:760-768`). A press outside the button wrapper closes it (`onMouseDownOutside`, standing for the source's `document` `mousedown` listener). Escape does not close it, as in the source.
- **gpuix lacks:** a global stacking order (FORK.md: `zIndex` orders siblings only).
- **Workaround:** the toolbar's `zIndex`.
- **Fidelity:** exact.
- **Components it hits:** `Dropdown`.

## Beacon: the Display button does not stay lit while the menu is open

- **Cause:** `port choice` (the port's `Button` has no `active` prop).
- **Original:** `<Button variant="tertiary" size="sm" active={open}>` (`beacon/page.tsx:228-236`).
- **Port:** `variant="tertiary" size="compact"`; the button keeps its resting look while the panel is open (`src/pages/concepts-beacon.tsx:527-537`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** `Button`.

## Beacon: `Button` and `Badge` `sm` are `compact`

- **Cause:** `port choice` (the port has `default`, `compact`, `icon`, `icon-compact` buttons and `default`, `compact` badges).
- **Original:** `size="sm"` on the toolbar buttons, the Dismiss button and every badge (`beacon/page.tsx:136`, `:174`, `:231`, `:297`).
- **Port:** `size="compact"` throughout.
- **Workaround:** none.
- **Fidelity:** approximated (a compact button is 28px, a compact badge 20px).
- **Components it hits:** `Button`, `Badge`.

## Beacon: the filters row

- **Cause:** `port choice`.
- **Original:** `InputGroup className="w-56"` and `SelectTrigger className="min-w-[150px]"` (`beacon/page.tsx:407-418`); the Select starts empty (`value=""`) and shows "Priority".
- **Port:** the `InputGroup` is a fixed 288px, so it sits in a 224px wrapper and shrinks to it; `Select` has no width prop, so a wrapper gives it `minWidth: 150`. `variant="bordered"` (the port's default is `inline`) and `value={null}` for the placeholder (`src/pages/concepts-beacon.tsx:822-846`). The search matches title or key, case-insensitively, as in the source. The screenshot scenario drives the select by keyboard (a pointer press on a select crashes the test renderer).
- **Workaround:** the wrappers.
- **Fidelity:** exact in the layout.
- **Components it hits:** `InputGroup`, `Select`.

## Beacon: the thinking indicator is indented inside the triage panel

- **Cause:** `port choice` (the port's `ThinkingIndicator` takes no `className`).
- **Original:** `<ThinkingIndicator className="!px-0" />` (`beacon/page.tsx:303`).
- **Port:** `<ThinkingIndicator />` with its own horizontal padding, so the glyph sits about 16px right of the panel's title (`src/pages/concepts-beacon.tsx:644`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** `ThinkingIndicator`.

## Beacon: Dismissing the triage during "analyzing" cancels the timer

- **Cause:** `port choice` (the source has a latent bug).
- **Original:** `startTriage` sets a 1500 ms `setTimeout` to "asking" that nothing clears, so a Dismiss during "analyzing" brings the panel back at the question (`beacon/page.tsx:375-378`).
- **Port:** Dismiss and unmount clear the timer (`src/pages/concepts-beacon.tsx:713`, `:730-737`).
- **Workaround:** none needed.
- **Fidelity:** differs on purpose.
- **Components it hits:** just this one.

## Beacon: layout and small values

- **Cause:** `port choice`.
- **Original:** `h-screen` column, `max-w-[960px]`, `flex-1 overflow-y-auto` content; the board is `grid-cols-1 md:grid-cols-3`; the triage panel is `rounded-2xl`; avatars and ID text are `bg-blue-500` ... `text-[10px]`, `font-mono`; surfaces are `surfaceClasses(2, 2)` (`beacon/page.tsx:107-118`, `:168`, `:184`, `:286`, `:382`).
- **Port:** the column is the frame's height with the issue list in the port's `ScrollArea` (a drawn scrollbar); the board is always three columns (no breakpoint); the panel radius is `shape.container + 4` (16 rounded, 28 pill; the source's `rounded-2xl` is an unchecked guess at its shape-map value); avatar colours are the badge palette's blue, violet, emerald and rose, which are Tailwind's 500s; mono text is Menlo; surfaces are `surface2` with `shadow(2)`, as in Lumen. The triage panel's "done" check is the palette's emerald.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Quill: page, copy and layout

Original: `app/concepts/quill/page.tsx`. Ported in `src/pages/concepts-quill.tsx` (group "Pages", order 34, layout "full", listed "none"), inside `ConceptFrame`.

- **Checked and equal:** the copy (title, byline, intro, callout, goals, the four initiatives and their owners, statuses and targets, the three comments and activity lines, the block names, the AI block's placeholder, steps and canned draft), the 760px column, the three tabs (Document / Comments / Activity) with their icons, the dot Badge colours per status, the 1700 ms draft beat, and the new block landing above the composer.
- **Cause:** `port choice`. The page scrolls in the port's `ScrollArea` and the side padding is 32 / 48 as `px-8 py-12` (`src/pages/concepts-quill.tsx:458-469`).
- **Fidelity:** approximated (scrollbar look); exact for the flow. The title is Inter Bold 700 at 34 / 42 and the section headings SemiBold 600 at 18 (the source's variable `wght`: `gpuix gap`, README "gpuix gaps"). The 💡 and 🗓️ are the system emoji font's glyphs.
- **Components it hits:** just this one.

## Quill: Add block is a popup `DropdownMenu`, not an absolutely placed `Dropdown`

- **Cause:** `gpuix gap` (paint order) and `port choice`.
- **Original:** the open menu is the inline `Dropdown` in an `absolute left-0 top-full z-50 mt-1.5` box under a `Button` with `active={open}`; a document `mousedown` closes it (`quill/page.tsx:73-113`).
- **Port:** `DropdownMenu` + `DropdownTrigger` + `DropdownContent` with the same five `MenuItem` rows and the "Basic blocks" label (`src/pages/concepts-quill.tsx:149-181`). It opens on press or by Enter / Space / arrows, flips above the button when there is no room below, closes on outside press, Esc, and picking a row, and returns focus to the button. Picking a row does nothing else (the source's `onSelect` only closes). The trigger is the port's `compact` Button (no `sm`) and has no `active` prop, so it shows no pressed background while the menu is open.
- **gpuix lacks:** a stacking order across parents: `zIndex` orders siblings only (`~/code/fdarian/gpuix/FORK.md:603`), so the inline `Dropdown` positioned absolute would paint under the heading and table that follow it.
- **Workaround:** the popup's anchored surface.
- **Fidelity:** approximated.
- **Components it hits:** dropdown (`Dropdown` has no trigger, positioning or dismissal), button.

## Quill: the Initiatives table cells take text only and the name is muted

- **Cause:** `port choice` (the port's `TableCell` / `TableHead` wrap their children in one `<text>`; the cell colour is fixed: muted unless the row is lit, foreground in the header).
- **Original:** the name cell is `text-foreground`, the owner and target `text-muted-foreground`, status a `Badge variant="dot" size="sm"` (`quill/page.tsx:228-246`).
- **Port:** the name cell is muted like the others (lit rows go foreground). The status Badge sits in a row `div` inside the cell so it hugs its width instead of stretching (`src/pages/concepts-quill.tsx:425-445`); `size="compact"` stands for `sm`.
- **Components it hits:** table (a cell colour prop would close it).
- **Fidelity:** approximated.

## Quill: the AI block's step icons

- **Cause:** `port choice` (the port's `ThinkingStep` icons are `dot`, `search`, `globe`, `brain`, `image`, `check`).
- **Original:** `square-library`, `brain`, `pencil` for the three steps (`quill/page.tsx:150-152`).
- **Port:** `search`, `brain`, `dot` (`src/pages/concepts-quill.tsx:283-293`). The steps are `ThinkingSteps` with `width="100%"`, as in the other concepts.
- **Fidelity:** approximated.
- **Components it hits:** thinking-steps (a wider icon set would close it).

## Quill: the draft timer and the sparkle

- **Cause:** `port choice`.
- **Original:** `setTimeout` 1700 ms that appends the draft; the "Sparkle" is `useIcon("brain")` (`quill/page.tsx:117-148`).
- **Port:** the same timer, cleared on unmount (`src/pages/concepts-quill.tsx:227-250`); the icon is the port's `brain` at 16px in the drafted block and 14px next to "Quill AI" in the composer's left slot. The page does not scroll to the new block, as in the source.
- **Fidelity:** exact for the flow.
- **Components it hits:** just this one.

## Quill: comments render through `ChatMessage` with `fullWidth`

- **Cause:** `port choice`.
- **Original:** `className="max-w-full"` on each `ChatMessage` (`quill/page.tsx:296`).
- **Port:** `fullWidth` (`src/components/chat-message.tsx`, added for Lumen). The assistant reply is plain text, left aligned, and the user bubble sits right, as in the source.
- **Fidelity:** exact for the layout.
- **Components it hits:** chat-message.
