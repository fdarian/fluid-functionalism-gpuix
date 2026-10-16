# fluid-hover

Original: `app/docs/fluid-hover/page.tsx` and `demos.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), with the page chrome of `lib/docs/DocPage.tsx` and `lib/docs/ComponentPreview.tsx`.
Ported in `src/pages/fluid-hover.tsx` (the page, prose and scenarios) with the demos under `src/pages/fluid-hover/` (`plain-vs-fluid.tsx`, `show-the-math.tsx`, `axes.tsx`, `lists.tsx`, `cost.tsx`, shared pieces in `parts.tsx`), routed by the page registry (`src/lib/demo.ts` `loadPages`).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it. The preview frame, the heading and the missing prev / next arrows are the same drift as every page; see
`drift/site.md` ("Preview frame") and `drift/introduction.md`.

## The "Reference" section is not ported

- **Cause:** `port choice` (the port has no API tables anywhere).
- **Original:** a "Reference" section with `PropsTable`s for the hook's options, its return value and `FluidHoverHighlight`'s props, plus the closing sentence about the transform (`page.tsx:25-48,155-187`).
- **Port:** none; the page ends at "Reduced motion". The `hookOptions`, `hookReturn` and `highlightProps` data are not carried over.
- **Fidelity:** dropped.
- **Components it hits:** every page whose source has a `PropsTable`.

## The Installation block has no "Copy prompt" button

- **Cause:** `not ported yet` (no page or demo has the install prompt; the Showcase hero's "Copy install prompt" is dead).
- **Original:** `DocPage` renders an "Installation" title with `installNote`, and a `CopyPromptButton` that copies `buildInstallPrompt` (`lib/docs/DocPage.tsx:118-152`, `lib/docs/install-prompt.ts`).
- **Port:** the title and the note, verbatim, without the button (`src/pages/fluid-hover.tsx:123-129`).
- **Fidelity:** approximated (text exact, button dropped).
- **Components it hits:** every docs page.

## The sidebar has no "New" dot and the site menu no "New" tag

- **Cause:** `not ported yet` (`PageModule` has no `isNew` / `dotColor`; `src/lib/demo.ts`).
- **Original:** `systemList` marks Fluid Hover `isNew: true` (`lib/docs/components.ts:23`): a blue dot in the sidebar and a "New" description in the site menu (`app/components/site-command-menu.tsx:206-217`).
- **Port:** a plain "Fluid Hover" row and a plain menu row. The menu row has no icon, as in the source (`icon` is only set for the Pages group, `:200-202`), and `menuKeywords` is the slug plus the description's words, as the source builds them (`src/pages/fluid-hover.tsx:20-24`). It sorts first in System (`order = 1`), where the source sorts the System list alphabetically.
- **Fidelity:** approximated.
- **Components it hits:** every System page the source marks new (typography, with its warning dot).

## Inline code chips have no padding, radius or smaller type

- **Cause:** `gpuix gap` (a `<span>` has no padding, border or radius, and no per-run `fontSize`: `~/code/fdarian/gpuix/FORK.md:765-773`).
- **Original:** `<code className="mx-1 rounded bg-[light-dark(#EBEBED,#2C2C2C)] px-1 py-0.5 text-site-caption text-foreground">` (`page.tsx:15-21`), and the same chip on the `:hover` in the comparison's caption by the global `code:not(pre code)` rule (`app/globals.css:349-355`): 12px type, 4px radius, 4px side padding, 4px side margin.
- **Port:** `Code` is a `<span>` with the same ground colour, the foreground ink and Menlo at the prose's 13px (`src/pages/fluid-hover/parts.tsx:54-67`). Padding made of no-break spaces was tried and dropped: gpuix breaks a line between the padding and the text, which stranded an empty chip at the end of "No `<MotionConfig>` needed" (its wrapper treats a no-break space as a break opportunity, `zed/crates/gpui/src/text_system/line_wrapper.rs:450`).
- **Workaround:** none; the chip hugs its text.
- **Fidelity:** approximated.
- **Components it hits:** every page with inline code (motion, typography, and the chips in the demos' captions).

## "Blink or glide": the script is a JS loop, the cursor moves on `left` / `top`

- **Cause:** `port choice` (gpuix has no `requestAnimationFrame` and no keyframes on a value JS can read) plus `gpuix gap` (no transforms: README "Missing features").
- **Original:** one framer `animate(y, keyframes, { times, ease: "easeInOut", repeat: Infinity })` on a `MotionValue`, paused and resumed in place; the cursor is a `motion.span` on `x` / `y`; the loop runs while `useInView(amount: 0.35)` and a visiting pointer pauses it (`demos.tsx:164-377`).
- **Port:** the same three round trips (2 s, 0.8 s, 0.3 s legs) evaluated by hand with a cubic-bezier `easeInOut` from the shared 16 ms clock (`src/lib/clock.ts`), the cursor an absolutely positioned div moved by `left` / `top` each tick, and the fluid list fed the same point as a `mousemove` with window coordinates (`src/pages/fluid-hover/plain-vs-fluid.tsx:50-190`). In view is an `IntersectionObserver` at threshold 0.35 against the page scroller. A pointer inside takes over through `onMouseEnter` / `onMouseMove` / `onMouseDown` on the demo's root and the script resumes on leave. The pause button's tooltip, icon swap and hold-the-frame behaviour match.
- **Fidelity:** approximated (the timer's 16 ms cadence instead of the display's frames).
- **Components it hits:** just this page; the other scripted loops (thinking-steps, carousel-dots) use the same clock.

## "Blink or glide": the pause button sits in the frame's corner, reduced motion is ignored, captions differ slightly

- **Cause:** `port choice` (no preview header: `drift/site.md`) and `not ported yet` (reduced motion, README "Drift from the source" site rows).
- **Original:** the play / pause icon button is the right end of the preview header, 40px square (`demos.tsx:380-400`, `lib/docs/ComponentPreview.tsx:140-170`); `useReducedMotion()` stops the script (`demos.tsx:288-292`); the two captions are flex rows whose text and `<code>` runs are separate flex items 8px apart (`demos.tsx:344-376`).
- **Port:** a 36px ghost icon `Button` absolutely placed 8px from the frame's top right (`src/pages/fluid-hover/parts.tsx:93-176`); no `prefers-reduced-motion` check (`matchMedia` exists in the fork, nothing reads it); each caption is one centred `<text>` with inline runs, so the gaps around the chip are a normal space.
- **Fidelity:** approximated.

## "Show the math": dashed rules are a gradient, the dots do not fade

- **Cause:** `gpuix gap` (a dashed border on a one-sided, zero-height box paints nothing; `borderStyle` is per element, `FORK.md:755-757`) and `port choice` (the colour transition).
- **Original:** `border-t border-dashed border-foreground/20` lines at the midpoints between row centres, and `transition-colors` on the dots (`demos.tsx:406-508`).
- **Port:** each rule is a 1px box with a `repeating-linear-gradient` of 3px dashes and 3px gaps at 20% foreground (`src/pages/fluid-hover/show-the-math.tsx:109-119`); the active dot changes colour at once. The distance label is right-aligned by a `right` offset (the source translates it by `-100% - 8px`). Everything else (cursor line at 70%, rail at 20px, dots 8px, mono 11px label) is the source's geometry.
- **Fidelity:** approximated (dash phase differs from Chrome's, no dot fade).
- **Components it hits:** just this page.

## "3 axes": the strip, list and grid are the port's components

- **Cause:** `not ported yet` (the components' own drift entries apply).
- **Original:** `Tabs` / `TabsList` / `TabItem`, an inline `Dropdown aria-label="Folders"` of `MenuItem`s, and a two-column `CardGroup` of clickable `Card`s (`demos.tsx:530-606`).
- **Port:** the same composition on `src/components/tabs.tsx`, `dropdown.tsx` and `card.tsx` (`src/pages/fluid-hover/axes.tsx`). `Dropdown` has no `aria-label` prop, so the list has no accessible name; see `drift/tabs.md`, `drift/dropdown.md` and `drift/card.md` for how each component differs.
- **Fidelity:** approximated.

## "When to split a list": narrower canvas, a hand-built sidebar, hand-broken callouts

- **Cause:** `port choice` (the 600px page column, `src/app.tsx:45`), `gpuix gap` (no balanced text wrap; a wrapped `<text>` is as wide as its container, so there is no per-line extent to read: `FORK.md:765`) and `not ported yet` (sidebar parts).
- **Original:** a 640 x 400 canvas, scrolled sideways when narrower, with a 260px framed `Sidebar` (`SidebarProvider`, `SidebarGroup`, `SidebarMenuSub`, `SidebarMenuSubButton href`, a `SidebarSeparator`, a disabled `SidebarMenuButton` at 50% opacity) and three callouts whose arrows are SVG `<marker>` paths measured against the real rows with a `MutationObserver` / `ResizeObserver` and a `Range` over the glyphs' line boxes (`demos.tsx:866-1246`).
- **Port:**
  - The frame's inner width is 598px, so the canvas is 598 wide and the sidebar sits 179px from the left (the source's 200 less 21), keeping the left labels, the arrows and the right label inside the frame (`src/pages/fluid-hover/lists.tsx:36-47`).
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
- **Port:** a two-column row at 24px gap; each bullet is a 5px circle in `mutedForeground` in a 24px gutter, the text beside it (`src/pages/fluid-hover.tsx:72-115`). The columns never stack, because the page column is a fixed 600px.
- **Fidelity:** approximated.

## Each demo stage hides its content while far from the viewport

- **Cause:** `gpuix gap` (every element is laid out and painted even when a scroller clips it away: README "Missing features", culling row).
- **Original:** no such step; the browser skips what is off screen.
- **Port:** `PreviewFrame` keeps its height and sets its content to `display: none` when more than 25% of a viewport from the page scroller, as `DemoCard` does (`src/pages/fluid-hover/parts.tsx:93-176`); the 200-row list is the reason. It duplicates `DemoCard`'s observer instead of sharing it, to leave `src/lib/demo-kit.tsx` alone.
- **Workaround:** the above.
- **Fidelity:** exact once painted.
- **Components it hits:** every long page.

## Smaller differences

- **Cause:** `port choice` (reason not stated).
- **Original:** rows are `<button>`s with `focus-visible:ring-1`; the page text is Inter and the monospace is `font-mono` (`demos.tsx:131-162`).
- **Port:** rows are `buttonProps` divs with an outline offset of 0 on `focusVisible` (`src/pages/fluid-hover/parts.tsx:198-285`), no-op click; the monospace is Menlo, which the browser resolves to `ui-monospace` (same in Chrome on macOS, not Safari). The `y` / `x` / `xy` code block snippets of the source's Code tab are not shown (no Code tab: `drift/site.md`).
- **Fidelity:** exact except the monospace face.
