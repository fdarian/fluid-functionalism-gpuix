---
type: history and status
title: gpuix gaps and divergence rounds
description: Which gpuix gaps the port works around (summary, with the README as the full list), and the history of DOM divergences this port reported to the gpuix fork, round by round, with the gpuix commits that landed and the migrations the port made in response.
tags: [gpuix, gaps, upstream, history, migration]
sources:
  - id: openwiki-source-dbc5a68e94d7e3a15a776857
    resource: repo://drift/fluid-hover.md
  - id: openwiki-source-52df002f39d8608aefccfdde
    resource: repo://drift/home.md
  - id: openwiki-source-d4a4bb7ecd3d3f6e47c46abd
    resource: repo://drift/table.md
  - id: openwiki-source-5cfc44b662eef11b303099d9
    resource: repo://drift/tabs-subtle.md
  - id: openwiki-source-7bed81eca49ee8a9899cacc5
    resource: repo://drift/thinking-indicator.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-8792b0b9d5aaa145ee2ebfa4
    resource: repo://scripts/check-command-menu.tsx
  - id: openwiki-source-fac7a3f3768fe057d1557909
    resource: repo://scripts/check-kit.tsx
  - id: openwiki-source-5838b94eb489d7c269600dc3
    resource: repo://scripts/check-tabs-subtle.tsx
  - id: openwiki-source-f870e66b983ce90f21118b51
    resource: repo://scripts/drift-counts.ts
  - id: openwiki-source-092597adc6c8ddcc5594efb5
    resource: repo://scripts/footprint.tsx
  - id: openwiki-source-edfff899d93ec8844d1b24df
    resource: repo://scripts/perf-page-switch.tsx
  - id: openwiki-source-5ebe82cc5f9e383e14411602
    resource: repo://src/app.tsx
  - id: openwiki-source-52272ff1f298332dd4484482
    resource: repo://src/components/carousel-dots.tsx
  - id: openwiki-source-923ee25729d055f35a254df3
    resource: repo://src/components/command-menu.tsx
  - id: openwiki-source-1dd7881206b2ce896ff9b518
    resource: repo://src/components/scroll-area.tsx
  - id: openwiki-source-b9ce445bfbcee83ede413754
    resource: repo://src/components/sidebar.tsx
  - id: openwiki-source-63a83316feacc83e2a230285
    resource: repo://src/components/slider.tsx
  - id: openwiki-source-94d7540365b6edfe6f6a0bbe
    resource: repo://src/components/table.tsx
  - id: openwiki-source-26d9c038c2027980be5931cf
    resource: repo://src/components/tabs-subtle.tsx
  - id: openwiki-source-1000133251cbebcd6e8f1e8a
    resource: repo://src/components/thinking-indicator.tsx
  - id: openwiki-source-e937d0413e1c4205eb067717
    resource: repo://src/components/thinking-steps.tsx
  - id: openwiki-source-a79b6ccf1548a05902eb90b6
    resource: repo://src/demos/thinking-steps.tsx
  - id: openwiki-source-a6e7d28cb827574c90025f7b
    resource: repo://src/home/bento-grid.tsx
  - id: openwiki-source-2784d511d2f9a521edaf8bb9
    resource: repo://src/lib/app-frame.tsx
  - id: openwiki-source-b100b0574d7a0258fad9b8f3
    resource: repo://src/lib/clock.ts
  - id: openwiki-source-3763179c46a618f0eea1b1ba
    resource: repo://src/lib/cull.ts
  - id: openwiki-source-ba98ccdc6cabbcd0f3dd70c6
    resource: repo://src/lib/fluid-hover.ts
  - id: openwiki-source-ff84ac67d7a6ebc693884d4f
    resource: repo://src/lib/popup.tsx
  - id: openwiki-source-88a6e1849924a665249303d0
    resource: repo://src/lib/stable-label.tsx
  - id: openwiki-source-d5126066c122ba41a6591f24
    resource: repo://src/lib/theme-fade.tsx
  - id: openwiki-source-1a25dd521e50a4d59274e1c2
    resource: repo://src/lib/theme.ts
  - id: openwiki-source-977d15831a92c2a09bd8801a
    resource: repo://src/pages/changelog/changelog-view.tsx
  - id: openwiki-source-81c2a5e01f16d1053272b0de
    resource: repo://src/pages/changelog/entry.tsx
  - id: openwiki-source-805db717791883f12f02d567
    resource: repo://src/pages/changelog/release-spy.ts
  - id: openwiki-source-872f10458af3aae905a0ee5a
    resource: repo://src/pages/fluid-hover/plain-vs-fluid.tsx
generated: { by: "claude-code", at: "2026-10-22T04:24:54.591Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-22T04:24:54.591Z
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
  `scaleY: 0.96` entrance; chevrons swap or redraw glyphs; the file-thumbnail spinner cannot rotate and slides an
  SVG dash instead; panels move on `top`/`left`.
- **Layout-property motion only.** The fluid highlight glides on `top`/`left`/`width`/`height`, which re-lays out per
  frame, instead of a transform.
- **Clipped content still costs a frame** (gpuix #46: retained and clipped content is not free). Long demo pages
  therefore hide far regions with `display: none` through the port's own `src/lib/cull.ts`; this is a kept
  workaround, not a removed one: the removal comparison was re-run on `b03d4e27` and culling off was worse on 9 pages
  and better on none, and again headless on `196d69ce` with the same result. `511bebab` added `contentVisibility:
  'auto'` (#71, the opt-in half of #46), which does not stand in for it: its margin is a fixed 150% of the viewport
  against the port's 25%, an unmeasured region has no scroll anchoring, and its containment clips shadows and focus
  rings. The measurements are in
  [Port decisions, Performance decisions](../decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27).
- **Test-renderer quirks** (a capture is the view alone, with no titlebar or traffic lights; batched keystrokes deliver
  an input's `onChange` after the whole batch) that constrain the screenshot harness.
- **Windows/Linux** dispatch is asynchronous, so `preventDefault()` on press arrives too late there. The fork
  scoped itself to macOS only on 2026-10-16, so these are not reported as open.

The list was recounted and rewritten in both 2026-10-17 [adoption passes](#adoption-pass-2026-10-17) and again in the
[round 6 pass](#round-6-adoption-pass-2026-10-18); the README names `poc` `8352e66c` as the minimum fork (it said `ed4e99c3` after round 6, `365f7c88` briefly in the 2026-10-19 [follow-up](#perf-follow-up-on-poc-365f7c88-and-e5231304-2026-10-19), then `e5231304`, then `5fda771a` in the [native-animation round](#native-animation-round-on-poc-5fda771a-2026-10-19); then `b03d4e27` in the [fractional-rects adoption](#fractional-rects-adoption-on-poc-b03d4e27-2026-10-21), `83bab5a7` in the [authored-lengths adoption](#authored-lengths-and-playback-controls-on-poc-83bab5a7-2026-10-21), `196d69ce` in the [Round 12 pass](#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21), `f6997028` after the [Round 13a adoption](#round-13a-font-smoothing-scrolltop-setter-and-exact-scroll-end-on-poc-f7b62f11-2026-10-21) of `f7b62f11`, `f993d9b9` in [Round 14b](#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22), `511bebab` in [Round 13b](#round-13b-adoption-on-poc-511bebab-2026-10-22), and `8352e66c` in [Round 15a](#round-15a-atomic-inline-origin-and-forced-layout-on-poc-8352e66c-2026-10-22)). The bugs and gaps worth knowing before touching layout code:

- A function-form `createTransform` of several motion values is computed in JS and can trail its inputs by a frame
  on a live window (not seen on the test renderer). `calc()` strings of the row's own width avoid it where the layer
  depends on one value.
- `text-wrap: balance` past 6 lines per forced-break segment, and `pretty` on a paragraph whose last line is long,
  approximate Chromium's breaker.
- A `fit-content` box in a column flex container with any horizontal negative margin (left or right, even -1) keeps
  the height of a wrapped first pass (94x40 where CSS gives 94x20). A positive or vertical margin does not trigger it
  and `alignSelf: "flex-start"` does not cure it; a block parent does.
- A sticky box ignores the scroller's padding when it pins. At rest gpuix agrees with Chrome; after a scroll it pins at
  the scrollport edge where Chrome holds it at the padding edge, so the dropdown search field cannot sit in a padded
  scroller (the margin is not the cause; re-measured on 2026-10-19, it replaced an earlier "negative margin" reading).
- Rects and authored lengths are both fractional now. Since `b03d4e27`, `getBoundingClientRect`, `ResizeObserver`,
  `IntersectionObserver` and `onLayout` return 1/64 px values (`client*` and `scroll*` stay integers), and since
  `83bab5a7` an authored inset, padding or size keeps its fraction (`top: 110.5` lands at 110.5) where it used to round
  to a whole device pixel, half toward zero. A highlight placed from a measured rect therefore no longer lands off
  what was measured. The fluid highlight still rounds rects, now only to match the source's `offset*` reads, which are
  integers and which gpuix does not have. The older whole-pixel snapping of every JS bounds read (#45) is gone, so a
  check can read a fractional box and no longer needs a scale-up to see sub-pixel differences. Since `8352e66c` an
  atomic inline (tabs-subtle's `inline-grid` label, Beacon's badges, a URL chip) also keeps its fractional origin and a
  half-pixel one rounds up like Chrome, where it used to sit at a whole device pixel, up to half a pixel off. The
  residue is the cap height, read as 0.704em where Chrome has 0.727em, and the glyph rows in the next item.
- Text whose top lands exactly on a half device pixel (.5 at scale 1, .25 or .75 at scale 2) paints its glyphs one
  row above Chrome's, because gpuix rounds a glyph origin half down in `split_glyph_origin` and Chrome rounds a text
  baseline half up. Boxes, fills and positions are exact; only the glyph row differs, and only on exact ties. The
  showcase's ThinkingSteps tile is the known instance (an odd-height box centres the Research Agent card at y.5). Not
  nudged in the port; a drift entry in `drift/home.md` and a README gap row. See
  [Round 15a](#round-15a-atomic-inline-origin-and-forced-layout-on-poc-8352e66c-2026-10-22).
- A looping native animation replays the whole page every tick, so it is cheap only on light pages (7 ms a tick at
  3000 nodes, about 60 ms at 12000): see the [`b03d4e27` adoption](#fractional-rects-adoption-on-poc-b03d4e27-2026-10-21).
- Flex `order` is ignored inside an `@container` block, and Tab follows the painted order under `order` where Chrome
  keeps the markup order (`order` 3, 2, 1 is visited c, b, a, not a, b, c). gpuix's own README and `order.rs` say
  focus and tab order stay in document order, so the docs and the behaviour disagree; the banner uses `row` /
  `row-reverse` instead.
- The first draw of a long page is whole: a page mounts in one batch and builds, lays out and shapes every node,
  because nothing marks a region far until an `IntersectionObserver` has reported against a first layout. A 1900-node
  tree drew in 45 ms against 8 ms with all but 12 entries `display: none`. The port's `createCulling` hides far
  regions only after its first report, so the first draw on Changelog, Showcase and Command Menu is still whole; the
  question to gpuix is a way to mount a region culled before its first layout (`511bebab`'s `contentVisibility` is
  its shape, but the port cannot use it yet, above). The line cache half closed on `511bebab`: its shape store cut a
  revisit's shapes to single digits (see [Round 13b](#round-13b-adoption-on-poc-511bebab-2026-10-22)). Repro r11
  (outside the repo); `scripts/perf-page-switch.tsx` measures it.
- `has*` states exist (`hasHover`, `hasActive`, `hasFocus`, `hasFocusVisible`, `hasDisabled`, `hasEnabled`) but gpuix
  has neither a `:has(.x)` selector nor a parent state that styles its children. Collapsed-border transitions are no
  longer a gap: see [Round 13b](#round-13b-adoption-on-poc-511bebab-2026-10-22).

Earlier entries here were closed and should not be re-reported: a `width: 100%` child under a `fit-content` parent
filling the column and a percentage `maxWidth` not clamping a `fit-content` box (`20a0c327`); on `b03d4e27`, the
cap-trimmed label that tabs and tabs-subtle centre sitting a pixel off Chrome's at 1x (gpuix #44), whose two drift
entries were removed; and on `83bab5a7`, the authored-length rounding, a trimmed `inline-grid` label in a block with a
strut sitting about 5.5 px high, and the missing pause/play on a motion value's animation; and on `f7b62f11`, the heavier text (font smoothing), the `scrollTop` setter's layout cascade and the scroll range ending one pixel short of `scrollHeight - clientHeight`; and on `f993d9b9`, the idle window waking JS on every vsync and the unfocused visible window drawing below the display rate; and on `511bebab`, the collapsed-border colour transition that rebuilt the table's layout; and on `8352e66c`, an atomic inline placed at a whole device pixel (the tabs-subtle baseline and Beacon pill drift, gpuix #80) and a forced layout delivering `onLayout` and `ResizeObserver` reports.

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
| 14 | Clipped content still laid out and painted (Command Menu ~57 ms/frame) | WONTFIX the cull (layout dominates); the 57 ms was three test-renderer draws per move, FIXED to ~19 ms. The port keeps `display: none` on far regions (`cull.ts`), and as of `poc` `e5231304` still needs it (gpuix #46) |
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
culling remain open (culling is still open as gpuix #46 on `e5231304`).

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
  spans, and the slider value is one run with a clickable span per number. Residual then: underline offset (closed by
  [round 6](#round-6-adoption-pass-2026-10-18)) and the Cite chip's vertical offset. The Ask-user inline option stays a block: `StableLabel`'s hidden semibold copy cannot
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
- **`StableLabel` is a real `inline-grid`.** Hidden copies (the source's ghost span, semibold; since 2026-10-19 a
  normal-weight copy too, see the [native-animation round](#native-animation-round-on-poc-5fda771a-2026-10-19)) and
  the visible copy share one grid cell, so it wraps like the source, with `nowrap` and `truncate` opt-in. That lets the Ask-user inline title be an inline-grid
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

## Round 6 adoption pass (2026-10-18)

Round 6 of the fork was a batch of CSS-semantics fixes and additions. The port adopted them in the commits after
the table and container pass, in this order: outlines, variable Inter and weight easing, `textWrap` and underline
offsets, `textBox` trim, `calc()` motion, borders, `width: auto`, then the drift recount. The
drift table went from 577 to 537 entries (gpuix gap 124 to 82), mostly deletions of entries whose cause was gone.
What changed, and what a later reader should not "fix" back:

- **An outline needs `outlineStyle`.** gpuix paints an outline only when it has a style, as CSS does. Until the
  fix, every `outlineWidth` plus `outlineColor` pair (focus rings, state styles, the inline ones) was invisible;
  `outlineStyle: 'solid'` now sits beside each. A new ring written without it draws nothing and no error says why.
- **Longhands override `gap`.** `columnGap` and `rowGap` win over the shorthand, so the stacked rows that relied on
  a `gap` plus a longhand lost their 2px; both longhands are set per case instead.
- **Variable Inter and weight easing.** The static cuts and "SemiBold 600 for 550" are gone, and the weight eases
  where the source transitions `font-variation-settings`
  ([decision](../decisions/port-decisions.md#fonts-inter-variable-weight-through-fontvariationsettings)). The
  page headings are bold again as the source's are, and the command menu's tab label eases its weight with its
  colour. Two README gap rows (variable-font axes, multi-value `padding`) were deleted: `padding: "4px 8px"` and a
  four-value `margin` lay out correctly.
- **`textWrap`, underline offset, `textBox`.** Headings balance and paragraphs prettify where the source does
  (`li` text stays plain), underlines take the source's `underline-offset`, and labels trim to cap height with
  `capTrim`. A label that clips (`truncate`) adds padding and equal negative margins through `clippedCapTrim`,
  because the clip box is the trimmed one and would shave ascenders and descenders; the source's `py-1 -my-1` does
  the same. The typography emulation of the trim was removed. The page screenshots with wraps, underlines or
  trimmed labels were recaptured.
- **`calc()` in motion values.** The slider's comfortable fill, handle line and scrubber strip and the compact step
  dots are `calc()` strings of the row's own width, as in the source, so none reads a measured width and a resize
  reaches them in the frame that lays it out. The old "derived layers trail their inputs" workaround of pixel maths
  from a measured width is gone; only the one-frame lag of a function-form transform of two values remains.
- **One-sided borders on empty boxes paint.** The Show the math rules, the Introduction's `hr`, the playground
  divider and the Markdown rule are one-sided borders on empty boxes as in the source, replacing the `height: 2`
  workaround.
- **`width: auto` animates from the change.** gpuix starts a `width: auto` animation at the style change rather
  than the next measuring frame, so tabs-subtle dropped its snap-and-remeasure step: a label unfolds from the commit
  frame as it folds, and a tab selected at mount is born at its label width. `check-tabs-subtle` samples both on a
  held clock.

Pitfalls this pass hit:

- **File:line refs in drift entries moved three times.** Each batch of edits shifted the cited lines, and the
  fix was a separate "move the refs" commit after every batch. Do the ref move once, after the last edit.
- **A culled card has no bounds.** The thinking-steps screenshot scenario centres on a card far below the window,
  and the port's `cull.ts` hides its content until it is scrolled near, so `scrollTo` calls `shot.reveal` first; without it `centerOf` has
  nothing to read.
- **Measure against the browser, not the source's comment.** The source's `font-weight.ts` claim of at most 0.4 px
  width change fails in Chromium too; the check was rewritten to assert parity with the browser.
- **The count table is still generated.** Totals come from `bun scripts/drift-counts.ts`, including the stale
  counts in `UPSTREAM.md`.

## Perf follow-up on `poc` `365f7c88` and `e5231304` (2026-10-19)

The fork landed perf and text fixes after round 6 (nested-flex layout made linear, #36; fractional text, #41;
per-edge snapping of bounds reads, #45), and the port re-tested each workaround that depended on the old behaviour.
Which ones survived is the useful part, because several look removable:

- **Kept: off-screen culling.** gpuix #46 still bills a frame for content a scroller clips away. The removal run on
  both pins agreed (sum of sidebar-sweep draw p95 over 49 pages 500 to 688 ms on `365f7c88`, 520 to 670 ms on
  `e5231304`), and it agreed again on `b03d4e27`. Details: [Port decisions](../decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27).
- **Kept then, dropped later: fluid hover's cached container box.** A live `getBoundingClientRect` was a layout pass of
  about 6 ms on gpuix; the idle cost of reading it per pick is invisible to a sweep benchmark and shows only in idle
  frame-callback time. It was removed on `b03d4e27` (below).
- **Dropped then, restored later: the second `StableLabel` ghost.** It cost about 1.5 ms of sweep draw p95 on
  `365f7c88`, so this round kept one. It came back on 2026-10-19 (below) because a one-ghost label whose normal copy
  is wider shrinks on selection; the cost was re-measured and accepted.
- **Kept then, closed later: the cap-trimmed label drift entry**, re-measured (gpuix #44); the entries went when `b03d4e27` fixed it.
- **Removed: the changelog's `width: '100%'` column wrappers.** #36 made nested flex columns linear; measured
  change on `e5231304` was nil (changelog sweep draw p95 10.9 to 11.0 ms, idle CPU 58.8 to 57.6%, sum 520 to 487 ms).
- **Removed: the README "real window can fail to boot with the display asleep" known issue.**
- **Adapted, later reverted: `check-weight-widths`** tolerated 1px on neighbour and shrink assertions for #45's
  per-edge snapping. With the two-ghost label the box cannot move, so the check asserts exactly again; on `b03d4e27`
  it also measures at the rendered size (below).
- **Adapted: the changelog Releases jump** re-aims while the port's culled entries un-pin on the way
  (`drift/site.md`); a cost of keeping the cull, not a gpuix bug.

The pitfall repeated here: a perf experiment on gpuix needs both the sweep draw p95 and the idle CPU or
frame-callback time, because the two regress independently (culling shows in both; the bounds read only in idle).

## Line-height pass on `poc` `e5231304` (2026-10-19)

gpuix `e5231304` lays out text with no `lineHeight` at the font's own metrics, where a browser under Tailwind's
preflight uses `html { line-height: 1.5 }`. The port followed in a few commits; the reasons are what a later reader
cannot get from the diff:

- **The root carries `lineHeight: 1.5`.** It sits on `App`'s `viewport` container, so every text with no token of its
  own, and every form control (preflight sets them to `font: inherit`), gets the source's leading. Since
  `e5231304`, `normal` is the font's own metrics, as in Chrome; a control that set a font size and no line height
  matched neither the source's token nor the inherited value, which is why each input below got its own leading.
- **An input's box is its line.** The source's inputs have no fixed height; the line box of the text is the box. The
  ports therefore spread the type token (font size and line height) instead of fixing a height: the colour picker
  and input-group fields, the sidebar search and the slider's edit field (line plus its 1px border, 21px; the
  button demo's playground field is the source's `h-7`, 28px). gpuix centres text in a taller input, so rows keep
  their height and centre. The
  command menu's field takes `FIELD` / `FIELD_COMPACT` (14/24 and 13/20, the source's `leading-6` / `leading-5`),
  not the subtitle step's 20 and 18, so its drift entry "Input line box in the compact step" was removed and
  `check-command-menu` asserts both boxes. Combobox and dropdown-search fields set `24px` explicitly. The Compare
  page's shadcn input is the source's content box (22px high at 20px leading) because that component is a replica.
- **The check harness wraps a bare view.** `check-kit` renders the view under test inside a `display: contents`
  box with `lineHeight: 1.5`, because only `App` carries the root rule; without the wrapper a scenario that mounts a
  component alone measures a different box from the app. `display: contents` adds no layout of its own.
- **README gap rows were re-measured against Chromium, not trusted.** Four rows changed: Tab order under `order`
  (the cite is now gpuix's own contradicting docs), the dropdown sticky row (padding, not margin; see above), the
  fit-content row (any negative margin, no `alignSelf` cure), and the `has*` list gained `hasDisabled` and
  `hasEnabled`. The "bold Helvetica Neue line box is 24px in gpuix and 25px in Chrome" row was removed: the two are
  equal now. A dropdown RTL drift entry now notes gpuix's inherited `direction: 'rtl'`, which a port with a direction
  provider could use; the source has no RTL demo. The drift count went from 540 to 539.
- **Screenshots were recaptured** on `e5231304`; spacing was checked against the source rendered in Chromium
  (introduction, card, command-menu). The playground-shuffled captures were left alone because `Math.random` picks
  their variant, so compare the content area by pixels, not hashes.

## Native animation round on `poc` `5fda771a` (2026-10-19)

The README named `5fda771a` as the minimum fork at the time (now `b03d4e27`). It carries a retention fix: six checks had needed a workaround
for gpuix retaining elements, and they pass plainly on this pin. The same day the port moved its JS frame-clock loops
to gpuix's native animation. Several earlier notes here said gpuix could not animate these; that is no longer true,
and the remaining limits are narrower.

- **What moved**: the file-thumbnail spinner, the thinking indicator (glyph, shimmer, word cycle), the carousel-dots
  fill, the Fluid Hover plain-versus-fluid cursor and the skill pages' script cursor. Costs, the pause workaround and
  the list of remaining `onFrame` users are in
  [Port decisions](../decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation).
- **What gpuix still lacks for this** (recorded in the drift entries, README gap rows pointing at them):
  - **Pause, play and seek on an animation** (closed on `83bab5a7`). Only `stop()`, `cancel()` and `complete()`
    existed, so a pause was `stop()` plus a new `animate()` from the current value; exact only when the animation was
    linear (the cursor kept its easing in a `createTransform` of a linear progress value for that reason).
  - **`background-position` is not animatable**, so the shimmer is per-letter colour keyframes sampled from the
    gradient's cycle: stepped per letter, with no kerning between letters, and positioned by letter count rather
    than glyph advance (`drift/thinking-indicator.md`). Spinning and chevron turns still need a transform, which
    gpuix does not have (`motion` cannot animate an SVG `transform` attribute), hence the sliding-dash spinner.
  - **`requestAnimationFrame`** does not exist (only `setTimeout`), so the leftover loops stay on the shared
    interval clock. The README row for it now lists only thinking-steps.
  - **CSS keyframes took style properties, not SVG attributes** such as `strokeDashoffset`; a `motion.circle` with
    `repeat` played the file-thumbnail spinner instead. Closed on `b03d4e27`: stroke keyframes work, and the button
    spinner uses them.
- **Two frame-loop gaps found after adopting it** (README Bugs table, `1c7517a0`; neither had a workaround, FF kept
  the native animations). The timer starvation is closed on `b03d4e27` (timers run between ticks, gpuix #56) and the
  per-tick cost is restated there; both are kept below as the history and the symptoms to recognise:
  - **A native loop can starve Bun's timers and IPC.** When an animation keeps requesting frames and one draw takes
    longer than a display frame (about 13 ms at 75 Hz), gpuix's frame-wake callback is always already queued when
    `tick()` returns, so Bun never gets to run `setTimeout`, `setInterval` or IPC. In the repro (a kept
    `~/.claude/notes/ff-gpuix-repros/r7-frame-loop-starves-timers.tsx`, outside the repo) a still page gets 10 timer
    callbacks a second, an animating one gets 0, and animating with `startFrameLoop` at `frameMs` 16 gets 8-9. It
    only bites when a draw is slow: on the showcase page under heavy machine load (draws of 25-32 ms) the perf
    harness's mount reply never arrived, while at normal load the page draws in about 4.6 ms and is fine. The
    trigger was `224f89d7` (the shimmer as native keyframes); the old JS clock avoided it only by leaving gaps
    between its 33 ms ticks. So **a perf or check run on a loaded machine can hang for this reason, not because of
    the change under test.**
  - **One animating text rebuilds the whole page every frame.** First measured as about 28 ms a frame for a single
    looping colour animation on a 3000-node page, so native frames looked cheap only on light pages (file-thumbnail
    about 1.8 ms, showcase about 4.6 ms). It affects every native loop on a heavy page (thinking-indicator,
    thinking-steps, file-thumbnail, carousel-dots) and fed the first gap: the heavier the page, the likelier a draw
    outlasts a frame. The figure was re-measured on `b03d4e27` (below): 7 ms a tick on 3000 nodes.
- **The second `StableLabel` ghost is back** (`54405f67`): a label whose normal copy is wider shrinks on selection
  with a semibold-only ghost, so the cell is `max(normal, semibold)` again and `check-weight-widths` asserts it
  exactly. The cost on `5fda771a` was +1.0-1.7 ms of sidebar-sweep draw p95, paid on frames that build rather than
  replay; on `b03d4e27` it is within noise. Trying `inline-grid` to `grid` gained nothing, since flex items are blockified and retained either way.
  Reasoning and numbers: [Port decisions](../decisions/port-decisions.md#stablelabels-second-ghost-what-it-cost-and-what-did-not-help).
- **Two non-gpuix changes from the round**: the thinking-steps demo cards start at half in view, as the source, and
  the Customise card's rows sit 34 px apart following the source's nesting (a 44 px title row, a rows block with a 6 px
  gap and 12 px above and below), which moved the `src/app.tsx` refs cited by `drift/site.md`.
- **`check:scenarios` runs every check** and lists the failures at the end instead of stopping at the first, so one
  red check no longer hides the rest of a 30-minute run.

## Fractional rects adoption on `poc` `b03d4e27` (2026-10-21)

The README now names `b03d4e27` as the minimum fork. The reason it is a pin and not an upgrade note: since it,
`getBoundingClientRect`, `ResizeObserver`, `IntersectionObserver` and `onLayout` return fractional 1/64 px values like
Chrome (`client*` and `scroll*` stay integers), so code and checks written for whole-pixel reads change meaning.
Most of the round is re-testing workarounds and deleting the ones that stopped being true; drift went from 538
entries to 532.

- **Rects are fractional, but authored lengths are still rounded** (true on `b03d4e27`; closed on `83bab5a7`, below). gpuix lays out an authored inset, padding or size
  on a whole device pixel (half toward zero), so a highlight placed from a measured fractional rect ends up to
  0.5 px off its row. The fluid highlight now rounds each measured rect to integers like the source's `offset*` reads
  and the table's highlight rests on the row's `offsetTop`; `check-reduced-motion` compares against that, and
  `check-choice-group` compares the checkbox square at its measured width instead of a rounded one. The reasons:
  [Port decisions, fluid hover](../decisions/port-decisions.md#fluid-hover-one-highlight-nearest-row-sessions).
- **Closed upstream and removed here**: the cap-trimmed label baseline (tabs, tabs-subtle drift entries and the README
  row), the per-edge snapping of bounds reads, timers starving behind a native loop (gpuix #56), and the layout pass on
  a bounds read after a paint-only write (#47). The README's "gaps as of" paragraph lists them as gone.
- **New on `b03d4e27`, closed on `83bab5a7`: a trimmed inline-grid in a line box still sits high.** The closed gap
  was the cap-trimmed label centred in a flex box. A `textBox: trim-both cap alphabetic` `inline-grid` label inside a
  block that has a 16 px / 24 px strut is seated about 5.55 px above Chrome (cap top 3 px under the block's top, Chrome
  8.55 px), although the block's own line box is the right 24 px. tabs-subtle's unfolding label is the only place hit,
  so it sets the clip `height: 24` and offsets the label with an authored `marginTop`, which gpuix then rounds (so up
  to 0.5 px off). (The atomic-inline half of that residue closed on `8352e66c`, [Round 15a](#round-15a-atomic-inline-origin-and-forced-layout-on-poc-8352e66c-2026-10-22).) It is a README "Bugs" row and an entry in `drift/tabs-subtle.md` (5 to 6 entries, gpuix-gap column 0
  to 1), which took the drift total from 532 to 533. Do not report the earlier trimmed-label baseline as reopened:
  that one stays closed. The reasoning: [Port decisions, drift/](../decisions/port-decisions.md#drift-and-its-cause-values).
- **Reversed: fluid hover's container-box cache.** The cache existed to avoid a 6 ms layout pass per read. With #47 it
  measured within noise and was dropped, so `pick` reads the rect on every pick like the source.
- **Kept, re-measured: off-screen culling.** Off was worse on 9 pages and better on none; the plan to remove it after
  #46 does not apply while the gap row stands (the `196d69ce` re-run, headless, agreed: [Round 12](#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21)). Method and numbers:
  [Port decisions, Performance decisions](../decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27).
- **Changed: the second `StableLabel` ghost is now within noise** (seven sidebar pages, p95 -0.35 to +0.30 ms), credited
  to gpuix #46 and #58 (an `opacity: 0` text paints nothing and hidden labels are not re-measured). It stays for the
  width, not for speed.
- **Per-tick cost of a looping native animation, restated.** gpuix bills the whole page per replayed root: one looping
  colour keyframe on one text took 7 ms a tick on 3000 nodes and about 60 ms on 12000, against 0.1 ms with nothing
  animating, and a page with a running loop idles at 37-45% CPU (carousel-dots, file-thumbnail, thinking-indicator,
  thinking-steps, queued-stack, showcase, fluid-hover, changelog, and the button page: its native loading spinner took
  the source's always-loading Saving button from 3.8% idle to 41%). This replaces the earlier "28 ms" figure and the
  starvation row. The README keeps it as a bug row with no workaround except pausing off-screen loops through culling
  (restated again on `196d69ce`, where paint-only ticks are patched: [Round 12](#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21)).
- **SVG stroke keyframes now work**, so the button's loading spinner, the menu-item check and the input-copy check and
  cross became native draws. Their drift entries closed (button 9 to 8, input-copy 10 to 8) apart from input-copy's
  scale-in; the file-thumbnail spinner remains a sliding dash because its only gap is the rotate transform. See
  [Port decisions, native animation](../decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation).
- **Pause on a motion value's animation** was restated precisely: `getAnimations()` covers CSS `animation` and
  `transition` runs only, not `motion.*` or motion values, so the `stop()` plus new `animate()` workaround stayed for
  the carousel fill and the plain-vs-fluid cursor (until `83bab5a7`, below).
- **`check-weight-widths` measures at 13 px** with fractional bounds and a 0.03 px parity tolerance, no longer at 130 px
  divided by 10.

Pitfall carried over from this round: the culling, ghost and bounds-read numbers of one pin are not evidence about
another. They moved between `e5231304`, `5fda771a` and `b03d4e27` for reasons on gpuix's side (retention,
re-measurement of hidden labels, layout passes on reads), so re-measure on the pin you are on before keeping or
deleting a workaround.

## Authored lengths and playback controls on `poc` `83bab5a7` (2026-10-21)

The README now names `83bab5a7` as the minimum fork. Three changes on the gpuix side, each retiring something the
`b03d4e27` round had to keep. The drift total stayed at 541: the tabs-subtle entry changed shape rather than closing,
and the carousel-dots and fluid-hover entries lost a clause, not a section.

- **An authored length keeps its fraction.** `top: 110.5` lands at 110.5, so the README's "authored lengths are
  rounded" bug row is gone. The fluid highlight's `toOffsetRect` still rounds, but its comment now says why correctly:
  the source reads integer `offset*` values and gpuix has no `offset*`, not that gpuix rounds on layout. Do not remove
  the rounding when adopting this pin; it is parity with the source. Reasoning:
  [Port decisions, fluid hover](../decisions/port-decisions.md#fluid-hover-one-highlight-nearest-row-sessions).
- **A trimmed `inline-grid` in a strut block sits on the baseline.** tabs-subtle dropped the `height: 24` clip and the
  authored `labelTop` offset for the source's `fontSize: 16, lineHeight: '24px'` block. What remained on this pin was
  half a device pixel of atomic-inline placement (closed on `8352e66c`) and a 0.28 px cap-height metric difference (gpuix
  0.704em, Chrome 0.727em), recorded as a drift entry that was rewritten, not deleted. The README "Bugs" row for it is gone. `check-tabs-subtle` then pinned the
  baseline within 0.5 px of Chrome's (0.01 px since `8352e66c`) and compares no cap box. See
  [Port decisions, drift/](../decisions/port-decisions.md#drift-and-its-cause-values).
- **`animate()` on a motion value returns playback controls, and `finished` means finished.** The controls are
  Motion's: `pause()`, `play()`, `stop()`, `cancel()`, `time`, `speed`, `state`. `finished` now resolves only when the
  animation finishes or `complete()`s, never on `stop()` or on being replaced. Two ports changed: plain-vs-fluid's
  cursor is again the source's single repeating `animate()` paused and played in place (its linear progress value and
  range-form `createTransform` are gone, and the README pause row with them), and carousel-dots dropped the `current`
  flag and the fill-reached-1 check that guarded against `finished` resolving on a stop. The carousel fill still
  stops and restarts on pause, by choice: one effect restarts and plays it (the ordering trap is in
  [Port decisions](../decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation)).
- **Verification gotcha that fractional lengths exposed.** A fixed wait after a scroll is not enough before a click on
  something a spring just moved, because the tail of a spring moves the box by fractions of a pixel; `check-thinking-steps`
  now waits for the button's bounds to hold still for eight polls.
- **Screenshots were recaptured on the pin**, by page group, in four commits; most files changed by a few bytes.

## Scroll-write and first-layout rows (2026-10-21, repros r10 and r11)

Two new README Bugs rows, found while chasing a stutter under a held arrow in the site menu and a hitch on sidebar
clicks. Neither is fixed in gpuix; both are open questions for the fork, and the port worked around the first.

- **r10, the `scrollTop` setter's layout cascade (closed on `f7b62f11`, see [Round 13a](#round-13a-font-smoothing-scrolltop-setter-and-exact-scroll-end-on-poc-f7b62f11-2026-10-21)).** On a held ArrowDown at 30 ms
  repeats, 32 of 34 keys were handled in 2 s with a drawn-frame gap of 109-119 ms at p90 through the setter (69-79 layout passes per drain at p90, 94 ms),
  against 0 passes and 0.1 ms through `renderer.scrollTo`. The port worked around it in the command menu and the page-switch reset until the pin
  made the setter cheap; the reasons and the trap (a single-key check passes) are in [Port decisions](../decisions/port-decisions.md#scroll-writes-use-the-plain-scrolltop-setter-and-a-page-switch-is-measured-by-its-first-draw).
- **r11, first-draw layout and shaping cost of a long page.** No workaround beyond the Changelog's release spy no
  longer forcing a second layout before the first draw. The README row was written first against the line cache's
  age-out (`finish_frame`) and then updated on gpuix `83bab5a7` with the shape counts of the repeat visits (Changelog
  215, Showcase 286-300 on every visit); `511bebab` closed that half, [Round 13b](#round-13b-adoption-on-poc-511bebab-2026-10-22).
- **A new harness**, `scripts/perf-page-switch.tsx`, headless, measures the page-switch hitch per sidebar click (mount
  JS, first draw, later frames); the README's harness notes list it next to the real-window `scripts/perf.tsx`.

## Footprint round on `poc` `83bab5a7` (2026-10-21, repros r13 to r16)

Not an adoption: no code moved to gpuix features. `pnpm footprint` (reasons and caveats in
[Port decisions](../decisions/port-decisions.md#measuring-idle-cpu-and-memory-pnpm-footprint-and-what-each-mode-can-and-cannot-say))
measured what a still window costs, and three README Bugs rows were written or rewritten from it. All three are
questions for the fork; none has a workaround in this repository, and the owner accepts the costs for now.

- **Per-draw cost, restated (r13).** The earlier "7 ms a tick on 3000 nodes" row said only that the page is replayed.
  With a test renderer on `83bab5a7` the cost is the layout pass that runs on every draw (even for paint-only kinds:
  `layouts/s` equals `draws/s`) plus the prepaint walk, since retention already holds the build to 3 elements a frame:
  2.2 / 6.5 / 26 ms of CPU a draw at 1.3k / 5.2k / 20.8k elements for one 6-24 px animated element, within 5% across
  colour, SVG dash, SVG `d`, width and absolute `top`. At 20.8k elements the loop falls to 30 draws a second against the
  75 Hz clock. The ask to gpuix changed accordingly: skip layout for paint-only kinds, and relayout only from the
  nearest fixed-size ancestor for geometry kinds (the paint-only half landed in Round 12, below). FF's knockouts add that a single live loop is enough to keep a page
  drawing (see the [loop decision](../decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation)).
- **Idle-window floor (r14), a new row; removed in [Round 14b](#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22).**
  On `83bab5a7` the display link woke JS and pumped AppKit on every vsync of a real window with 0 draws, which
  showed up as a floor under every static page. It was the fork's and not the port's (an empty one-text window cost
  the same, and FF arms no timer while idle), and the ask was to gate the wake on a requested frame or a live
  animation. gpuix did, and the row and its figures are gone from the README.
- **Memory high-water (r15), a new row; rewritten in Round 14b.** A one-text gpuix window was most of the
  introduction's footprint, the showcase was much larger, and after a `--tour` the footprint stayed high with the
  retained element count back at its start, so it is allocator and CoreText high-water, not a leak. The only
  repository-side lever was the images: `avatar.jpg` and `og.png` now ship at 2x their largest displayed size. The
  window figures of this round were measured on `83bab5a7` and are not carried forward.
- **A measurement trap found on the way (r16); gone in Round 14b.** The footprint driver learned to report which
  app was frontmost, because a window CPU figure for an animated page depended on it. gpuix removed the dependence
  and the driver's sampling went with it.

## Round 12: paint-only patch ticks on `poc` `196d69ce` (2026-10-21)

The README now names `196d69ce` (zed `8e2114a5ca`) as the minimum fork. gpuix answered the r13 ask for the paint-only
half: a tick of a colour, opacity or SVG stroke dash or shape loop is drawn as a patch of its own unit of at most 256
elements (0.6-1.0 ms a tick live) instead of a whole frame. Without a blocker, r13 patches colour, SVG dash and SVG `d`
at 0.24-0.47 ms and 2-4% CPU at every page size, while width and absolute `top` loops stay whole frames (~70% of a core
at 20.8k elements). Whether FF's own pages benefit depends on three blockers, found with the new `patched/s`,
`full/s` and `why` columns of `pnpm footprint` (what they mean:
[Port decisions](../decisions/port-decisions.md#measuring-idle-cpu-and-memory-pnpm-footprint-and-what-each-mode-can-and-cannot-say)).
Before this round's repository changes, all nine animated pages read `patched/s` 0.

- **An `<input>` or `<textarea>` anywhere on the page makes every tick `Unsteady` (r17, a new row).** Even an
  unfocused, idle or culled one does; only `display: none` spares it. One input beside one colour loop takes the page
  from 0.4-0.6 ms and 3.9-4.5% CPU to 4.0-4.8 ms and 27.6-32.9% on 7.8k elements, while the input alone costs nothing.
  FORK.md lists inputs as never retained, a likely source that r17 did not confirm. Hits the button (PlayText input),
  queued-stack (composer textarea) and showcase (eight inputs). Not worked around: the inputs are the source's own. The
  ask: `Unsteady` only for an element that follows the clock in the frame being patched, such as a focused caret.
- **A loop under a positioned or translucent ancestor is declined as `UnknownUnit` (r18, a new row).** FORK.md says a
  relative box is a unit and an absolute one is none; measured, a `relative`, `absolute` or `opacity: 0.5` wrapper
  declines the loop in it (3.1-5.5 ms and 21.6-33.1% against 0.4 ms and 3.3-3.5%). When the animated element is itself
  `absolute` nothing is recorded in `declines` or `unpatchable`, so the case looks like a harness that never ticked.
  Hits the button (press surface, spinner wrapper, inert opacity) and file-thumbnail (spinner overlay).
- **Active motion values stay full frames**: carousel-dots' fill and the plain-vs-fluid cursor on fluid-hover and
  changelog, which the source animates with transforms gpuix lacks.
- **What the repository changed.** Only two pages had a blocker the source does not have. ThinkingIndicator's words
  were absolutely positioned inside a relative cell; they now stack in one grid cell and are positioned only while
  they roll (`cc294fcf`), as the source's inline-grid slot works. Its page went from 18% CPU with every tick whole to
  10% with about 62 ticks a second patched and 6 whole (the rolls). The thinking-steps step wrapper dropped a
  `position: relative` that anchored nothing (`96f4e653`); the page is unchanged because its draws are JS-driven, but
  an isolated active step went from 67 whole ticks a second to 67 patched. After this, eight of nine animated pages
  still draw whole ticks. Knockouts removing every blocker read button 25 to 4.5% CPU, thinking-indicator 16.5 to
  9.6%, queued-stack 20.5 to 7.4% and file-thumbnail 11.9 to 8.0%, which is the size of the prize if gpuix lifts them.
  The counters name the reason but not the element, so the knockouts, not `why`, were what attributed each blocker.
- **Culling re-measured, and stays.** Headless on `196d69ce` (an uncommitted culling-off knockout, two alternating
  pairs, load 3-13) off was worse on showcase, input-message, changelog and fluid-hover (for example fluid-hover
  16 / 16 to 51 / 40% CPU, input-message 1.3 / 0.5 to 53 / 36% because its off-screen loop runs) and +4-9 MB on five
  pages, better on none. The live `pnpm perf` A/B did not run; every attempt was occluded. Numbers:
  [Port decisions, Performance decisions](../decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27).

Pitfall: the footprint figures were taken at load 3-13 and the r17 and r18 repros at load 5-29 on the test renderer;
compare CPU percentages only against a run at similar load, and read `patched/s` first, which load moves less.

## Round 13a: font smoothing, scrollTop setter and exact scroll end on `poc` `f7b62f11` (2026-10-21)

The port adopted `f7b62f11` (zed `da3e5b19db`); the README's pin line and gap table then moved on to `f6997028`
(zed `67414fd389`, the commit that added window placement, `x`/`y` and `getAllDisplays()`), which was the minimum fork the
README named until [Round 14b](#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22). Three open gpuix items closed, and three small look fixes the pin made possible landed with them.
The drift total went from 541 to 540: only the font-smoothing entry in `drift/site.md` was removed (`site` 47 to 46,
gpuix-gap column 88 to 87).

- **Font smoothing is a style key now (the r8 gap).** `WebkitFontSmoothing: 'antialiased'` is inherited, so one
  declaration on the app's root viewport matches the source's `html, body` rule; the 9-42% heavier-ink gap, its README
  Bugs row and the `drift/site.md` entry are gone. The workaround that had been on offer (writing `AppleFontSmoothing`
  into the app's preferences) was never taken. Because text weight changed everywhere, 81 screenshots were recaptured
  together; files whose only other change was a `Math.random` playground variant, a caret or a timing state were left
  alone, as the repo's screenshot-noise rule says.
- **A `scrollTop` write lays out only what is pending (the r10 cascade).** The `renderer.scrollTo` workaround in the
  command menu's `writeScroll` and the page-switch `navigate` was reverted to `scroller.scrollTop = top`, as the
  source does, and the README's scroll-travel bugs row went with it. `check-command-menu`'s per-drain layout-pass
  bound dropped from 4 to 1 (worst measured 1 over 3 runs), the same bound for the wrap replay. Decision and trap:
  [Port decisions](../decisions/port-decisions.md#scroll-writes-use-the-plain-scrolltop-setter-and-a-page-switch-is-measured-by-its-first-draw).
- **The scroll range ends exactly at `scrollHeight - clientHeight`.** The changelog release spy lost its two-pixel
  `BOTTOM_SLACK` and compares against `scrollHeight` directly, and `check-scroll-area` now describes the exact end
  rather than the one-short range (the sibling primitive repo dropped the read-back in `scrollAlong` for the same
  reason). `check-scroll-area` keeps the half-pixel content because it is where a rounding regression would show.
- **Three pages matched Chrome's boxes once the type was right.** ThinkingSteps puts the body type on the Collapse inner
  div, where the source puts it, so the Sources row is 21 px with the chip at +1; Quill's status Badge sits in the cell
  directly (the flex wrapper is gone) and its rows are the source's 39 px; Beacon's badge cells go through the cell's
  text line box like `TableCell`, giving the source's 41 px rows with the badge at +11.5. All three were the port's own
  nesting differing from the source's (a bare badge in a Beacon cell made the row 42 px), fixed in the port, not gpuix
  changes.
  Their screenshots (thinking-steps, concepts-lumen, concepts-quill, concepts-beacon, showcase grid-5 and grid-6)
  were recaptured.
- **Not a gpuix change but in the same stretch:** the window opens on the first non-primary display (centred in its work
  area; `FF_DISPLAY=<index>` picks another, a bad index throws with the list of displays), using the placement API the
  `f6997028` fork added. `pnpm perf` and `footprint --window` place their windows the same way.

Pitfall carried over: a README "gpuix now does" table and a drift count are only as current as the last pin they were
re-read against. The pin line was edited twice in one afternoon (`f7b62f11`, then `f6997028`), so read the README's
current line rather than this page for the minimum fork.

## Round 14b: idle window and unfocused-window pacing on `poc` `f993d9b9` (2026-10-22)

The README now names `f993d9b9` (zed `9686aee204`) as the minimum fork. It closed two of the footprint round's
findings and shrank a third; no component or look code moved.

- **An idle window wakes 0 times a second.** The README's idle-floor Bugs row (the display link waking JS on every
  vsync of a real window, a floor under any static page) was removed, and the "gone from this list"
  sentence now names the idle window with the other things gpuix does. The row's figures are not carried over: the
  repository holds no in-window idle number until a window run is made on this pin.
- **An unfocused visible window draws at the display rate.** The earlier cap on a non-key window made animated
  window figures depend on which app was frontmost. With it gone, `scripts/footprint.tsx` stopped sampling the
  frontmost app and lost its `key` column, its mixed-state flag and its `keyFraction` JSON field; only the occlusion
  check remains. Footprint JSON written before this change carries `keyFraction` and was taken under the cap.
- **The memory row was rewritten on headless figures only.** gpuix #79 cut 5 MB of per-process cost (frame buffers,
  JS heap, AppKit colour tables). Headless `pnpm footprint` on `f993d9b9`: the introduction is 65 MB (JS heap
  8 MB), the showcase 131 MB (heap 18 MB); after one `--tour` the introduction sits at 192 MB, peak 194 MB, up from
  67 MB fresh, and a forced GC does not lower it, with the retained element count back at 744. The in-window floor
  and the cost of one retained element are explicitly left to be re-measured on the next bench, so the row no
  longer states a window figure; the earlier window figures (measured on `83bab5a7`) were dropped, not updated.

The reading rule from the footprint harness still holds: [Port decisions](../decisions/port-decisions.md#measuring-idle-cpu-and-memory-pnpm-footprint-and-what-each-mode-can-and-cannot-say)
says what headless can and cannot answer. Read the README's pin line, not this page, for the current minimum fork.

## Round 13b adoption on `poc` `511bebab` (2026-10-22)

The README now names `511bebab` (zed `271ec25880`) as the minimum fork. Three things moved at adoption, and `704af9e5` later updated the page-switch row; drift went from 540 to 539
entries (`table` 6 to 5, only the removed fade entry).

- **A `border-color` transition on a collapsed-table part is closed (#68).** It lays out nothing and patches with the
  table as its unit, so the table row declares `fade(['border-color'], 80)` again, the README "Collapsed-border
  transitions" row and the table drift entry are gone, and the other drift files no longer list collapsed-border
  transitions among the shared gaps. `check-table` was rewritten from a relative layout-build bound to zero builds, zero
  nodes created or removed and a drawn fade; the reasoning is in
  [Port decisions](../decisions/port-decisions.md#the-table-rows-border-color-fade-dropped-while-it-cost-layout-restored-on-gpuix-511bebab).
- **The page-switch row was re-measured (#71).** gpuix's shape store (8 MiB) fixes the line cache that aged lines out
  between frames: shapes per revisit went from 215 to 8-12 on Changelog, 291 to 4 on Showcase and 142 to 0 on Command
  Menu, while a first visit still shapes every line (211 to 183, 293 to 237, 144 to 138) inside a whole-page layout.
  Median first-draw time, first visit / revisit, `f993d9b9` to `511bebab`, headless `scripts/perf-page-switch.tsx` on
  release builds of both commits, two alternated runs each at load 3-10: Changelog 82-83 / 58-62 to 43-50 / 29-35,
  Showcase 47-51 / 36-38 to 41-44 / 36-37, Command Menu 57 / 48-49 to 47-51 / 41-51. The Command Menu's 340-440 ms of
  mount JS was the same on both commits, and was not steady state: each of its 11 menus snapped its list with
  `scrollTop = 0` on the first run of the `rowsKey` effect, one forced layout pass of ~28 ms over the whole page per
  write. `704af9e5` skips that first snap (a fresh list is already at 0), taking mount JS to ~41 ms (median of 4 runs
  of 4 visits, alternated on one build). What remains is the question of mounting a region culled before its first
  layout.
- **A new README gap row, scroll writes after a mutation.** A `scrollTop`, `scrollTo` or bounds read after a mutation
  lays out first, one pass per write, and the pass walks the whole retained tree, `display: none` and
  `contentVisibility: hidden` subtrees included; even a paint-only change costs the full pass at the next write. In the
  gpuix test renderer the pass is linear (~0.4-0.5 us per element) but FF's costs ~5 us per element, about 10x, for a
  reason the repro does not give. The question for gpuix is no pass for a paint-only change and a pass over dirty
  subtrees only. FF's answer is to avoid the write while a page mounts; `navigate`'s own `scrollTop = 0` (~7 ms a visit)
  stays. Reasoning in
  [Port decisions](../decisions/port-decisions.md#scroll-writes-use-the-plain-scrolltop-setter-and-a-page-switch-is-measured-by-its-first-draw).
- **`contentVisibility` was evaluated and not adopted.** The README culling rows now say why it does not replace
  `createCulling` (margin, scroll anchoring, containment clipping shadows and focus rings), and the command-menu and
  site drift entries carry the same note.

`check-kit` gained `kit.still`, a wall-clock bounds-stillness wait used by `check-thinking-steps` and
`check-weight-widths` so that clicks no longer race a loaded machine; see
[Port decisions](../decisions/port-decisions.md#screenshots-and-check--scenarios) for the
trap. Read the README's pin line, not this page, for the current minimum fork.

## Round 15a: atomic inline origin and forced layout on `poc` `8352e66c` (2026-10-22)

The README now names `8352e66c` (zed `d382e6e5cb`) as the minimum fork. Two gpuix changes landed, one gap was found on the new pin, and no component's look code moved apart from a rounding helper. The drift total went from 539 to 540: one entry added (`home`, gpuix-gap column 0 to 1), none closed outright, since the tabs-subtle entry was rewritten.

- **An atomic inline keeps its fractional origin and rounds a half pixel up like Chrome (gpuix #80 closed).** tabs-subtle's
  unfolded label baseline is now exactly Chrome's (24.00 and 20.00 inside the tab) and `check-tabs-subtle` tightened
  from 0.5 px to 0.01 px; the drift entry now names only the 0.28 px cap-height metric (gpuix 0.704em, Chrome 0.727em),
  which stays. Beacon's Priority pills are level with the Status pill as in Chrome, at 1x and 2x, so the
  `concepts-beacon` screenshots moved 1 px and the showcase `grid-5` / `grid-6` Sources URL chips sit 1 px lower;
  those captures were recaptured. The chip-to-text distance had matched Chrome only by coincidence before this pin.
- **A forced layout no longer delivers `onLayout` or `ResizeObserver` reports.** A bounds read or a `scrollTop` write
  used to run observers inside the call; now the reports arrive with the next painted frame, after that frame's scroll
  events, as in Chrome. `base-ui-solid-gpuix` adapted (`bce5ba1` scroll-area, `a20251f` combobox), which is why the
  drift files' `base-ui:` line refs into `use-scroll-area-root.ts` (-1) and `use-combobox-root.ts` (+2) moved. Two
  consumers in this repository are one frame late, exactly as the source is in Chrome, and were left unchanged:
  fluid hover's pick after a scroll and the composer stage's pin. Read the README's `onLayout` / `ResizeObserver`
  row for the timing, not an older note that a size arrives "after the first paint".
- **Smaller 15a rows in the README's "gone from this list".** A non-finite `scrollTop` is read as 0 and a scroll-only
  write on a `<virtual-list>` works.
- **The measured height is rounded once, in the shared hook.** At scale 2 a ThinkingSteps step laid out 60.5 px where
  Chrome's `offsetHeight` is 61, so the next step sat 0.5 px high. The first fix rounded in ThinkingSteps alone and was
  then moved into `createMeasuredHeight` (`src/lib/offset.ts`, `toOffsetPx`), shared with fluid hover's `toOffsetRect`.
  Why, and the check that pins it: [Port decisions, fluid hover](../decisions/port-decisions.md#fluid-hover-one-highlight-nearest-row-sessions).
- **New gap found on this pin: glyphs at a half-pixel origin paint 1 px above Chrome.** Layout is exact, so a text box
  at y.5 is at y.5 in both; the difference is the paint step. `split_glyph_origin` rounds half down where Chrome
  rounds a text baseline half up, so on the showcase ThinkingSteps tile label tops are 348 / 409 / 477 against Chrome's
  349 / 410 / 478 while the chip fill rows match. It is recorded in `drift/home.md` and a README Bugs row, with no
  workaround: the card is not nudged because its layout is Chrome's. The repro and run script are outside the repo
  (`~/.claude/notes/ff-gpuix-repros/r15a-chip-half-pixel/`). Do not file it as an atomic-inline regression; the
  inline itself is right.

Pitfall: when a screenshot moves 1 px after a pin, tell the cause apart before recapturing. Boxes and fills that moved
toward Chrome are the atomic-inline fix; glyph rows that sit above Chrome's on a half-pixel top are the open
`split_glyph_origin` gap. Read the README's pin line, not this page, for the current minimum fork.
