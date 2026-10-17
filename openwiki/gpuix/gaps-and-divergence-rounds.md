---
type: history and status
title: gpuix gaps and divergence rounds
description: Which gpuix gaps the port works around (summary, with the README as the full list), and the history of DOM divergences this port reported to the gpuix fork, round by round, with the gpuix commits that landed and the migrations the port made in response.
tags: [gpuix, gaps, upstream, history, migration]
sources:
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-f870e66b983ce90f21118b51
    resource: repo://scripts/drift-counts.ts
  - id: openwiki-source-5ebe82cc5f9e383e14411602
    resource: repo://src/app.tsx
  - id: openwiki-source-1dd7881206b2ce896ff9b518
    resource: repo://src/components/scroll-area.tsx
  - id: openwiki-source-b9ce445bfbcee83ede413754
    resource: repo://src/components/sidebar.tsx
  - id: openwiki-source-94d7540365b6edfe6f6a0bbe
    resource: repo://src/components/table.tsx
  - id: openwiki-source-a6e7d28cb827574c90025f7b
    resource: repo://src/home/bento-grid.tsx
  - id: openwiki-source-2784d511d2f9a521edaf8bb9
    resource: repo://src/lib/app-frame.tsx
  - id: openwiki-source-ff84ac67d7a6ebc693884d4f
    resource: repo://src/lib/popup.tsx
  - id: openwiki-source-88a6e1849924a665249303d0
    resource: repo://src/lib/stable-label.tsx
  - id: openwiki-source-d5126066c122ba41a6591f24
    resource: repo://src/lib/theme-fade.tsx
generated: { by: "claude-code", at: "2026-10-17T07:13:17.848Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T07:13:17.848Z
---

# gpuix gaps and divergence rounds

gpuix is a GPUI-backed renderer with no DOM and no CSS engine. The port runs on the fork at
`~/code/fdarian/gpuix`, branch `poc` (a fork of remorses/gpuix). Since 2026-10-15 the fork's governing rule is
**DOM/CSS semantics win**: when gpuix and a browser disagree, gpuix is wrong, and breaking changes are fine (it has
no other users). That rule is what makes this port a useful test bed: every place the port had to work around gpuix
is a candidate divergence to report.

## Gaps the port still works around

The authoritative, row-by-row list is [README.md, "gpuix gaps across components"](../../README.md#gpuix-gaps-across-components),
split into Bugs and Missing features, each with the components it hits and the workaround. Per-component drift files
link to those rows rather than repeating them. The ones that shape the most code:

- **No CSS transforms** (scale, rotate, translate). Popups keep the opacity fade and a 4px slide but lose the
  `scaleY: 0.96` entrance; chevrons and spinners swap or redraw glyphs; panels move on `top`/`left`.
- **Layout-property motion only.** The fluid highlight glides on `top`/`left`/`width`/`height`, which re-lays out per
  frame, instead of a transform.
- **Variable fonts.** Only a font's default instance renders, hence static Inter and SemiBold 600 for 550.
- **No culling.** Clipped or scrolled-away content is still built, laid out and painted, so long demo pages hide far
  cards with `display: none`.
- **Test-renderer quirks** (a capture is the view alone, with no titlebar or traffic lights; batched keystrokes deliver
  an input's `onChange` after the whole batch) that constrain the screenshot harness.
- **Windows/Linux** dispatch is asynchronous, so `preventDefault()` on press arrives too late there. The fork
  scoped itself to macOS only on 2026-10-16, so these are not reported as open.

The list was recounted and rewritten in both 2026-10-17 [adoption passes](#adoption-pass-2026-10-17), so it is current
against gpuix `poc` `20a0c327`. The bugs and gaps worth knowing before touching layout code:

- A one-sided border paints nothing on a box whose content height is 0.
- A multi-value `padding` or `margin` string throws "invalid length"; use the longhands.
- `calc()` inside a motion value throws (a motion value holds a colour or a percentage), so derived layers stay
  in JS and trail their inputs by a frame.
- A `fit-content` box in a column flex container with a horizontal negative margin keeps the height of a wrapped
  first pass; a block parent avoids it.
- gpui measures text up to the next whole pixel, so a shrink-to-fit box is up to 1px wider than Chrome's.
- Flex `order` is ignored inside an `@container` block, and Tab follows the painted order under `order`, not the
  document order; the banner uses `row` / `row-reverse` instead.
- Table parts are not animatable (a collapsed-border row rule snaps where the source eases it), and gpuix has the
  `has*` states but neither a `:has(.x)` selector nor a parent state that styles its children.

Two earlier entries here were closed by `20a0c327` and should not be re-reported: a `width: 100%` child under a
`fit-content` parent filling the column, and a percentage `maxWidth` not clamping a `fit-content` box.

## How a round works

The port records a gap in its drift file, then the batch is sent to the gpuix fork session with numbered items
(`#N`, numbered continuously across rounds). The fork replies per item with **FIXED** (and a commit),
**WONTFIX** (with a reason), **DOC** (documented deviation), or **PUSHBACK** (the claim was wrong). When a round
lands, the port runs one migration pass: rebuild the native addon and the `@gpuix/solid` dist, `pnpm install` to
refresh the `file:` copy, apply the breaking changes, drop the workarounds the fix made unnecessary, and update
drift and the README. Since the 2026-10-16 decision to [adopt newly possible gpuix
features](../decisions/user-decisions-2026-10-16.md#3-adopt-newly-possible-gpuix-features), each pass also adopts
whatever new capability matches the source.

Rounds 1 to 3 were the fork's own code reviews (its integration commits, the whole fork, and the app-region branch);
they are listed here only where their result reached the port.

## Timeline

### Native springs (2026-10-13)

Fork `poc` commits `527ec49`, `f422de9`, `a02ec23` added `motion` springs. The port moved from tweens to native
springs the same day (see [Port decisions](../decisions/port-decisions.md#motion-native-gpuix-springs-not-tweens)).
Other pre-DOM fork patches the port relies on: the display-link frame pump, appearance (System theme) and font
registration.

### DOM-parity release (2026-10-15, gpuix `92434742`)

The fork rewrote its event model and styling to DOM semantics (zed `0c67dc0547`). Asked for by the port: nested
wheel scroll chaining, bubbling with `stopPropagation`, hover up ancestors, explicit `setPointerCapture` instead of
implicit capture, never-stale bounds, ARIA, focus modality, window pointermove, popup flip with available height and
anchor width. Breaking for the port. Migration merged in `7c1a99d`: the `pointerEvents: "none"` occlusion
workarounds, the implicit-capture drag hacks, the mouse-down-close on backdrops and the scroll area's wheel
containment came out.

### appRegion (2026-10-16, gpuix `7161175a`)

A window drag region (`appRegion: "drag" | "no-drag"`). A transparent titlebar no longer drags without one, so the
port marked the app frame's 40px bar as a drag region (`6a84236`).

### Round 4: demo migration divergences (2026-10-16, against `poc` `7161175a`)

Items #1 to #19, found while migrating. What landed in gpuix `f28cb588` (zed `3c05253c5f`), and what the port did:

| # | Divergence | Result |
|---|---|---|
| 1, 15 | Reading focus, or writing a motion value, inside a press/key handler threw (VIEW_BUSY); no popup opened with the pointer in tests; no `document.activeElement` | FIXED (`00cc0df1`); the port dropped its deferred slider motion write |
| 2 | `buttonProps` on Enter clicked a nested element twice | FIXED (`7caa7bc4`) |
| 3 | `DialogBackdrop` closed on mousedown, Base UI closes on click | FIXED (`8ed3203e`) |
| 4 | `DialogPopup` re-created on any reactive prop change, losing focus | FIXED (Solid only) |
| 5 | `window`/`document` mousemove only fired over elements with a listener, blocking a submenu safe polygon | FIXED (`42a22855`, `2d94e7dc`) |
| 6 | Horizontal scroll width ignored descendant overflow; `max-content` rejected | Overflow FIXED; intrinsic keywords DOC, then FIXED in the gap pass |
| 7 | One large wheel event split across nested scrollers | FIXED |
| 8 | Enter skipped validation with a required field empty | PUSHBACK: the demo form had two inputs and no submit button, which HTML does not submit either |
| 9 | Bun abort `thread local panicked on drop` | FIXED (`48ab765d`); teardown is now explicit `dispose()` |
| 10 | Test renderer ignored appearance and window options, used GPUI key names, sent no key-up, GPUI wheel sign | FIXED (`f1f969b2`, `0140ddc2`, `8d687b45`, and others) |
| 11 | Event target/relatedTarget were ids, not elements | FIXED (`7cf13991` and follow-ups) |
| 12 | Accessibility dump did not flag `aria-hidden` descendants | FIXED |
| 14 | Clipped content still laid out and painted (Command Menu ~57 ms/frame) | WONTFIX the cull (layout dominates); the 57 ms was three test-renderer draws per move, FIXED to ~19 ms. The port keeps `display: none` on far cards |
| 16, 17, 18 | Mask on macOS only; `preventDefault` late and no physical key on Windows/Linux | DOC (macOS-only scope); the physical key was FIXED later in the gap pass |
| 19 | "Volume: " + "78%" rendered without the space | Not a gpuix bug: the parts were separate flex items, which CSS also strips. Fixed in the port by putting the label in one text run |

Migration merged in `bcf7479`, together with the adoption of shadows, colour fades, reduced motion, tabular-nums,
clipboard, sticky and `zIndex`. Breaking changes handled: event targets are elements, the test renderer takes
Playwright key names with key-up and the DOM wheel sign, and roots unmount through `dispose()` (`955609d`). Drift and
README gaps that Round 4 closed were removed in `732538b`.

### Round 5: divergences after moving to `f28cb588` (2026-10-16)

Items #20 to #28, sent to the fork's gap-closing pass:

| # | Divergence | Result |
|---|---|---|
| 20 | An outer `boxShadow` painted under the whole box, so a translucent fill over it doubled up | FIXED (`6531e2d2`) |
| 21 | `MotionConfig reducedMotion` jumped every animated position and size | FIXED (`8a32ce93`) with partial pushback: only width, height, insets and layout glides jump, as framer-motion's positional keys |
| 22 | No way to apply one transition everywhere for a theme cross-fade | FIXED: `setUniversalStyle` / `<UniversalStyle>`, a `* {}` layer |
| 23 | Inline run colours (a `<mark>`) could not transition | FIXED |
| 24 | `fontVariantNumeric` on an `<input>`'s own style ignored | FIXED (`7218a32b`) |
| 25 | No TypeScript declaration for `navigator.clipboard` | FIXED (`390dbdc8`) |
| 26 | Inline `<span>`: no pointer events, padding or per-run `fontSize` | FIXED |
| 27 | Focus order on mousedown | PUSHBACK: already DOM order; a related deviation (cancelled pointerdown still sent mouse events) was found and FIXED |
| 28 | Sticky clamped to the content box | PUSHBACK: the spec, Chromium and Firefox clamp to the content box too |

### Gap-closing pass (2026-10-17)

The fork worked through its whole gap inventory in lanes: gpuix `gaps` tip `62da6990` (zed `637cd3df6e`), landed on
`poc` as `120dd049`. Beyond Round 5 it closed, among others: em/rem/vw/vh and `calc()`, `min-content`/`max-content`/
`fit-content` widths, `width: auto` motion, `zIndex` across stacking contexts, `url()` backgrounds and masks, SVG
`marker`/`pattern`/`filter`, the physical key code, and IME composition events. At that point still not built:
container queries, `display: table`, `display: inline-*`, `:has()`, and culling of clipped subtrees. The
[table and container pass](#table-and-container-pass-2026-10-17) adopted the first three; `:has()` selectors and
culling remain open.

## Adoption pass (2026-10-17)

Done against gpuix `poc` `dcfc7a0e`, the fork after it rebased. **Every gpuix SHA in the Round 5 table and the
gap-closing section above is pre-rebase**; they identify the fixes but no longer resolve on `poc`. The pass ran in
slices, one checkout at a time, because the check-* scenarios load base-ui-solid-gpuix live. This repository's
dist copy of `@gpuix/solid` was byte-identical to the fork's, so no rebuild was needed.

What it changed, by Round 5 item:

- **#20 outer shadow.** Cards lost the opaque page-colour fill that hid a doubled shadow; filled buttons already used
  the single-quad press fill ([why](../decisions/port-decisions.md#press-shrink-through-one-fill-quad)).
- **#21 reduced motion.** The port now matches framer-motion: only positional keys (width, height, insets, layout
  glides) jump, other properties still animate. The accordion's own outer gate was removed; the chevron turn, the
  scrollbar thumb and the switch thumb follow the web instead of the old blanket jump. The scrollbar thumb is
  `MotionConfig` "never".
- **#22 theme cross-fade** through `UniversalStyle` ([decision](../decisions/port-decisions.md#theme-system-light-and-dark-through-createappearance)).
- **#23, #24, #25.** The input-copy value tint is a span background that eases over 80 ms; `fontVariantNumeric` sits on
  the colour input's own style; `src/navigator.d.ts` is gone.
- **#26 inline spans.** Sentences with code chips and links are one `<text>` with real padding, margin and radius on
  spans, and the slider value is one run with a clickable span per number. Residual: underline offset and the
  Cite chip's vertical offset. The Ask-user inline option stays a block: `StableLabel`'s hidden semibold copy cannot
  sit inside a text run (`display: inline-*` was not built yet; the [next pass](#table-and-container-pass-2026-10-17)
  changed this).
- **#27 refocus after press: kept.** The mousedown refocus workaround was tried out of base-ui and put back,
  because on the web focus returns after the popup exits while in gpuix the blur lands after the synchronous
  handler returns.
- **Intrinsic widths.** Popups are content-sized with the trigger's width as a minimum (the `popupWidth` option is
  gone; dropdown panels clamp to their container and the window); the scroll area's content box has
  `min-width: fit-content` as Base UI's does; `w-fit` hugs use `fit-content`; the Dialog panel is
  `calc(100% - 2rem)` wide with `top` 12vh, so a resize needs no window-size signal.
- **`zIndex`, `url()`, `em`/`rem`.** Card footers take z-30 and the Beacon popover z-50 as the source does; the
  Markdown to-do tick and the Lumen swatches are the sheet's data-URI mask and images; markdown padding is `em`.
- **Safe polygon.** Tooltip and dropdown submenus use base-ui's safe polygon, driven by a window `mousemove`. The
  grace and dwell timers are gone. `blockPointerEvents` is approximated: clicks on siblings still land.

Pitfalls the pass hit and a future one should expect:

- **A moved layout rule can regress somewhere unrelated.** The scroll-area content change made sidebar labels stop
  truncating (a vertical area's content box must be `width: 100%`); the fix is `ScrollArea`'s `contentStyle`, which
  `SidebarContent` overrides as the source does. The cause was this port, not a gpuix bug. The full checks only
  caught it through the regenerated screenshots, so look at them.
- **Closed gaps hide in drift entries.** Dozens of README rows and drift entries described gaps gpuix had already
  closed. The pass rewrote them to say what is left, deleted the ones nothing remained of, and re-pointed about 130
  `FORK.md`, gpuix and base-ui line cites to `dcfc7a0e`. A drift entry whose gap closed should say what the port
  still does differently, not vanish silently.
- **The README count table is generated.** `scripts/drift-counts.ts` prints it from `drift/*.md` (588 entries
  after the pass, 577 after the next one); paste its output instead of editing numbers, because the hand-kept table and the intro total had
  drifted apart.
- **Two behaviour gaps in base-ui turned up while re-pointing its audit refs**: the menu typeahead forgot its query
  after 750 ms where Base UI uses 500 ms (fixed, with a check-dropdown assertion), and the scrollbar's
  press-on-track handler lacks the mousedown `preventDefault`, so focus blurs (recorded in base-ui's audit; check
  there for its status).

Verification: all 38 scenarios and 79 tests pass, and 177 screenshots were regenerated. IME composition and the
physical key code are closed in gpuix on macOS only, and the port reads neither (`isModK` reads `key`), so those
README rows stay.

## Table and container pass (2026-10-17)

A second adoption pass the same day, against gpuix `poc` `20a0c327`, which added real `display: table` (with
collapsed borders), `display: inline-*`, container queries, working `fit-content`, and named `groupHover` /
`groupFocusWithin` states. The three features that were "not built" in the gap-closing pass are the ones adopted.
What the port changed, so a later reader can tell a regression from intent:

- **Table is a real table.** `Table` is `display: table` inside a block wrapper holding the fluid highlight;
  `TableHeader`, `TableBody` and `TableRow` are the table-row-group and row display values, so columns size to
  content as in the source. The estimated column widths are gone from the Compare page's shadcn table, the Scrollbars
  page's double-overflow table, the Typography markdown and Spacing tables, the Sizes token reference (inside a
  horizontal `ScrollArea` with `min-width: 560`, as the source) and the ScrollArea demo's both-axis card, which now
  uses the real `Table`. The row highlight still follows the fluid hover's pick, not the pointer
  ([why](../decisions/port-decisions.md#hover-and-press-native-state-styles-first)).
- **`StableLabel` is a real `inline-grid`.** The hidden semibold copy and the visible copy share one grid cell, so it
  wraps like the source, with `nowrap` and `truncate` opt-in. That lets the Ask-user inline title be an inline-grid
  atom inside a text run. `Badge` is `inline-flex` with a `style` prop, and the Lumen citation chips use it. The
  thinking-steps details wrapper is a block, as the source's, because a `fit-content` flex child with a negative
  margin hit a layout bug.
- **Container queries replace `createMediaQuery`.** `App` wraps the window in a full-size `viewport` container
  (`containerType: inline-size`), so the home bento grid's 768px and 1280px breakpoints are `@container` blocks
  that query it. gpuix has no media queries, so a source viewport breakpoint is a query on this container.
  `check-home-grid` mounts one window per breakpoint. The banner's `@max-sm/banner` layout is a real container
  query on a grid. `fit-content` is used for the Introduction's command rows and code block.
- **Group states replace hover signals** in the card's dismiss chip and the colour picker, plus state styles for the
  colour picker's swatch ring, format label and the invite dialog's email field.
- **Residuals recorded rather than hidden**: banner Tab order and `order` inside a container block, the
  `:has()` / group-has selector gap (banner description flag and the surfaces elevation stack stay as a context
  flag and a pointer signal), the inert row-rule fade, and the text-measurement rounding of shrink-to-fit boxes.
  README gap rows were rewritten and the drift entries the pass closed were deleted or recaused; the README count
  table, printed by `scripts/drift-counts.ts`, now totals 577.
- **Screenshots**: tables, banner, scroll-area, sizes, thinking-steps, ask-user-questions and the Lumen and Beacon
  concepts were regenerated; `concepts-lumen/sources.png` was kept as the old capture because it differed only by
  noise.
