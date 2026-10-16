# fluid-hover

Original: `app/docs/fluid-hover/page.tsx` and `demos.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), with the page chrome of `lib/docs/DocPage.tsx` and `lib/docs/ComponentPreview.tsx`.
Ported in `src/pages/fluid-hover.tsx` (the page, prose and scenarios) with the demos under `src/pages/fluid-hover/` (`plain-vs-fluid.tsx`, `show-the-math.tsx`, `axes.tsx`, `lists.tsx`, `cost.tsx`, the Code tab snippets in `snippets.ts`, the copy prompt in `install-prompt.ts`, the shared rows and cursor in `parts.tsx`), routed by the page registry (`src/lib/demo.ts` `loadPages`). The doc chrome (`DocPage`, `DocSection`, `Prose`, `Code`, `ComponentPreview`) is the shared `src/lib/doc-page.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it. The heading and the missing prev / next arrows are the same drift as every page; see `drift/introduction.md`
and `drift/site.md`. The preview frame is the shared `ComponentPreview`, whose drift (no Inspect switch, no highlighting) is in
`drift/surfaces.md`.

## The "Reference" section is not ported

- **Cause:** `port choice` (the port has no API tables anywhere).
- **Original:** a "Reference" section with `PropsTable`s for the hook's options, its return value and `FluidHoverHighlight`'s props, plus the closing sentence about the transform (`page.tsx:25-48,155-187`).
- **Port:** none; the page ends at "Reduced motion". The `hookOptions`, `hookReturn` and `highlightProps` data are not carried over.
- **Fidelity:** dropped.
- **Components it hits:** every page whose source has a `PropsTable`.

## The Copy prompt button copies a fixed brief

- **Cause:** `port choice`.
- **Original:** `DocPage` renders the "Installation" block with `CopyPromptButton`, which copies `buildInstallPrompt({ slug: "fluid-hover", installSlug: "use-fluid-hover", base })`: the install command, the usage and props of `PROMPT_ENTRIES["fluid-hover"]`, the skill pointer and the docs URL (`lib/docs/DocPage.tsx:118-152`, `lib/docs/install-prompt.ts:38-95`, `lib/docs/prompt-entries.ts:27-66`).
- **Port:** the shared `DocPage` draws the block and the button, with the title and note verbatim (`src/pages/fluid-hover.tsx:Page`). The brief is that call written out for the Radix flavour in `src/pages/fluid-hover/install-prompt.ts`, not built from the page registry; the button, its icon swap and the failed-copy handling are the ones in [motion-page.md](motion-page.md#the-copy-prompt-button-swaps-its-icon-at-once-and-copies-a-fixed-brief).
- **Fidelity:** approximated.
- **Components it hits:** the Installation block of every docs page.

## The site menu has no "New" tag

- **Cause:** `not ported yet` (the menu reads no release marks; the sidebar's dot does, `drift/sidebar.md`).
- **Original:** the latest changelog release lists Fluid Hover as New (`content/changelog/2026-09.md`): a blue dot in the sidebar and a "New" description in the site menu (`app/components/sidebar.tsx:82`, `app/components/site-command-menu.tsx:194-217`).
- **Port:** the sidebar row has the dot (`src/app.tsx:225-243`); the menu row is plain. It has no icon, as in the source (`icon` is only set for the Pages group, `:200-201`), and `menuKeywords` is the slug plus the description's words, as the source builds them (`src/pages/fluid-hover.tsx:18-25`). It sorts first in System (`order = 1`), where the source sorts the System list alphabetically.
- **Fidelity:** approximated.
- **Components it hits:** every System page the latest release marks New or Updated (Skill, and Typography once its release lands).

## Inline code chips have no radius or smaller type, and one can strand at a line end

- **Cause:** `gpuix gap` (a `<span>` has no padding, margin, border or radius, and no per-run `fontSize`: `~/code/fdarian/gpuix/FORK.md:789-800`).
- **Original:** `<code className="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground">` (`page.tsx:15-21`), and the same chip on the `:hover` in the comparison's caption by the global `code:not(pre code)` rule (`app/globals.css:349-355`): 12px type, 4px radius, 4px side padding, 4px side margin.
- **Port:** the shared `Code` (`src/lib/doc-page.tsx:52-74`): a no-break space outside the chip for the margin and one inside each end for the padding, around a Menlo run at the prose's 13px, square corners. gpuix's line wrapper treats a no-break space as a break opportunity (`zed/crates/gpui/src/text_system/line_wrapper.rs:450`), so a line can end between the padding and the text: the "Reduced motion" paragraph ends its first line with an empty chip before "`<MotionConfig>`" (`screenshots/fluid-hover/use-when.png`). The page used a bare span with no padding before moving to the shared chip, which never stranded but hugged its text.
- **Workaround:** none; the stranding depends on where the line happens to break.
- **Fidelity:** approximated.
- **Components it hits:** every page with inline code (motion, surfaces, typography, and the chips in the demos' captions).

## "Blink or glide": the script is a JS loop, the cursor moves on `left` / `top`

- **Cause:** `port choice` (gpuix has no `requestAnimationFrame` and no keyframes on a value JS can read) plus `gpuix gap` (no transforms: README "Missing features").
- **Original:** one framer `animate(y, keyframes, { times, ease: "easeInOut", repeat: Infinity })` on a `MotionValue`, paused and resumed in place; the cursor is a `motion.span` on `x` / `y`; the loop runs while `useInView(amount: 0.35)` and a visiting pointer pauses it (`demos.tsx:164-377`).
- **Port:** the same three round trips (2 s, 0.8 s, 0.3 s legs) evaluated by hand with a cubic-bezier `easeInOut` from the shared 16 ms clock (`src/lib/clock.ts`), the cursor an absolutely positioned div moved by `left` / `top` each tick, and the fluid list fed the same point as a `mousemove` with window coordinates (`src/pages/fluid-hover/plain-vs-fluid.tsx:41-243`). In view is an `IntersectionObserver` at threshold 0.35 against the page scroller. A pointer inside takes over through `onMouseEnter` / `onMouseMove` / `onMouseDown` on the demo's root and the script resumes on leave. The pause button's tooltip, icon swap and hold-the-frame behaviour match.
- **Fidelity:** approximated (the timer's 16 ms cadence instead of the display's frames).
- **Components it hits:** just this page; the other scripted loops (thinking-steps, carousel-dots) use the same clock.

## "Blink or glide": captions differ slightly

- **Cause:** `port choice` (captions).
- **Original:** the play / pause icon button is the right end of the preview header, 40px square, through `ComponentPreview`'s `playbackButton`; `useReducedMotion()` stops the script (`demos.tsx:288-292`, `:380-400`, `lib/docs/ComponentPreview.tsx:140-170`); the two captions are flex rows whose text and `<code>` runs are separate flex items 8px apart (`demos.tsx:344-376`).
- **Port:** the pause button is the same 40px header button, through the shared `ComponentPreview`'s `playback` option (icon, tooltip and click; `src/lib/doc-page.tsx:204-249`, `src/pages/fluid-hover/plain-vs-fluid.tsx:245-258`). Reduced motion stops the script as in the source (`createReducedMotion()`, `src/pages/fluid-hover/plain-vs-fluid.tsx:109-110`); each caption is one centred `<text>` with inline runs, so the gaps around the chip are a normal space.
- **Fidelity:** approximated.

## "Show the math": dashed rules are a gradient

- **Cause:** `gpuix gap` (a dashed border on a one-sided, zero-height box paints nothing; `borderStyle` is per element, `FORK.md:779-781`).
- **Original:** `border-t border-dashed border-foreground/20` lines at the midpoints between row centres (`app/docs/fluid-hover/demos.tsx:459`).
- **Port:** each rule is a 1px box with a `repeating-linear-gradient` of 3px dashes and 3px gaps at 20% foreground (`src/pages/fluid-hover/show-the-math.tsx:110-120`). The distance label is right-aligned by a `right` offset (the source translates it by `-100% - 8px`). Everything else (cursor line at 70%, rail at 20px, dots 8px with their 150 ms colour fade, mono 11px label) is the source's geometry.
- **Workaround:** the gradient.
- **Fidelity:** approximated (dash phase differs from Chrome's).
- **Components it hits:** just this page.

## "3 axes": the strip, list and grid are the port's components

- **Cause:** `not ported yet` (the components' own drift entries apply).
- **Original:** `Tabs` / `TabsList` / `TabItem`, an inline `Dropdown aria-label="Folders"` of `MenuItem`s, and a two-column `CardGroup` of clickable `Card`s (`demos.tsx:530-606`).
- **Port:** the same composition on `src/components/tabs.tsx`, `dropdown.tsx` and `card.tsx` (`src/pages/fluid-hover/axes.tsx`). `Dropdown` has no `aria-label` prop, so the list has no accessible name; see `drift/tabs.md`, `drift/dropdown.md` and `drift/card.md` for how each component differs.
- **Fidelity:** approximated.

## "When to split a list": narrower canvas, a hand-built sidebar, hand-broken callouts

- **Cause:** `port choice` (the 600px page column, `src/app.tsx:42`), `gpuix gap` (no balanced text wrap; a wrapped `<text>` is as wide as its container, so there is no per-line extent to read: `FORK.md:765`) and `not ported yet` (sidebar parts).
- **Original:** a 640 x 400 canvas, scrolled sideways when narrower, with a 260px framed `Sidebar` (`SidebarProvider`, `SidebarGroup`, `SidebarMenuSub`, `SidebarMenuSubButton href`, a `SidebarSeparator`, a disabled `SidebarMenuButton` at 50% opacity) and three callouts whose arrows are SVG `<marker>` paths measured against the real rows with a `MutationObserver` / `ResizeObserver` and a `Range` over the glyphs' line boxes (`demos.tsx:866-1246`).
- **Port:**
  - The frame's inner width is 598px, so the canvas is 598 wide and the sidebar sits 179px from the left (the source's 200 less 21), keeping the left labels, the arrows and the right label inside the frame (`src/pages/fluid-hover/lists.tsx:35-44`).
  - The sidebar is a plain column of `SidebarContent`, `SidebarGroupLabel` and two `SidebarMenu` scopes; the sub rows are level-1 `SidebarMenuButton`s, not link buttons; the divider is a local 1px `color.border` box with 8px side margins; "Knowledge" is `disabled` (the hover skips it) inside a wrapper at 50% opacity, because `SidebarMenuButton`'s `disabled` hides a row from the hover without dimming it (`drift/sidebar.md`, "Disabled rows").
  - The parent's chevron swaps between `chevron-down` and `chevron-right` (`trailingIcon`); the source turns one chevron 90 degrees with a spring and shows it only on hover while open (transforms: README "Missing features").
  - The arrows are two SVG paths (the curve, then the chevron head computed from the curve's end tangent) because gpuix's SVG has no `marker`. The target rows are measured through wrappers around them (`onLayout` plus a per-frame loop for 600 ms after the Chat row toggles, since the sub-menu's height springs), and the callout copy is broken by hand where `text-balance` breaks it ("Children ride with / their parent."), each line its own `<text>`, so the label's glyph extent is the lines' boxes.
  - The arrows stay hidden until the rows are painted, and keep their last position while the demo is culled to `display: none`.
- **Fidelity:** approximated.
- **Components it hits:** just this page; the sidebar drift is in `drift/sidebar.md`.

## "What it costs": three stats, not four, and not the same two measurements

- **Cause:** `gpuix gap` (no readable style writes, no transforms; no `requestAnimationFrame`).
- **Original:** four stats: moves, pick per move, longest frame between two `requestAnimationFrame` callbacks, and layout writes, counted by a frame loop that diffs the highlight's inline `top` / `left` / `width` / `height` against its `transform` (`demos.tsx:608-863`). A top / left animation would write one every frame; the page's claim is that the highlight writes none.
- **Port:** three stats (`src/pages/fluid-hover/cost.tsx`). "pick per move" times the port's own `pickNearest` on every move with the measured rects, as the source does (mean of the last 100). "longest frame" is the longest gap between two ticks of the shared 16 ms timer while the pointer is inside (a stalled tick over 100 ms is dropped by `src/lib/clock.ts`), so it shows a stall in the process, not a paint. "layout writes" is dropped: the port's highlight animates `top` / `left` / `width` / `height` through gpuix's native `motion`, there is no inline style to watch, and no number would be an honest measurement. The sentence "1 element, 1 transform, 1 loop per move" is kept verbatim, and is true of the element and the loop only.
- **Workaround:** the stats sit in one row of three; the source's grid is two columns on a narrow viewport and four wide.
- **Fidelity:** approximated (two of three stats as in the source, the third a different measurement; one dropped).
- **Components it hits:** every fluid list's highlight (`src/lib/fluid-highlight.tsx`), which moves on layout properties.

## "Use when" / "Skip when" and the section rhythm

- **Cause:** `port choice`.
- **Original:** a `grid gap-6 pt-6 sm:grid-cols-2` of two lists with `list-disc pl-5 marker:text-muted-foreground` (`page.tsx:125-146`).
- **Port:** a two-column row at 24px gap; each bullet is a 5px circle in `mutedForeground` in a 24px gutter, the text beside it (`src/pages/fluid-hover.tsx:86-128`). The columns never stack, because the page column is a fixed 600px.
- **Fidelity:** approximated.

## Each demo stage hides its content while far from the viewport

- **Cause:** `gpuix gap` (every element is laid out and painted even when a scroller clips it away: README "Missing features", culling row).
- **Original:** no such step; the browser skips what is off screen.
- **Port:** every `ComponentPreview` on the page passes `cull`, which keeps the preview body's height and sets its content to `display: none` when more than 25% of a viewport from the page scroller, as `DemoCard` does (`src/lib/doc-page.tsx:298-344`); the 200-row list is the reason. It is an opt-in of the shared frame, off for the other pages, and it duplicates `DemoCard`'s observer instead of sharing it, to leave `src/lib/demo-kit.tsx` alone.
- **Workaround:** the above.
- **Fidelity:** exact once painted.
- **Components it hits:** every long page.

## Smaller differences

- **Cause:** `port choice` (reason not stated).
- **Original:** rows are `<button>`s with `focus-visible:ring-1`; the page text is Inter and the monospace is `font-mono` (`demos.tsx:131-162`). The axes demo's padding is `responsive` (compact on mobile).
- **Port:** rows are `buttonProps` divs with an outline offset of 0 on `focusVisible` (`src/pages/fluid-hover/parts.tsx:27-110`), no-op click; the monospace is Menlo, which the browser resolves to `ui-monospace` (same in Chrome on macOS, not Safari). The Code tab shows the source's five snippets verbatim (`src/pages/fluid-hover/snippets.ts`) in plain Menlo without highlighting, so they describe the React hook, not the port's. The axes demo has the default padding only (the page column is a fixed 600px).
- **Fidelity:** exact except the monospace face.
