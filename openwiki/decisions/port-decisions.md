---
type: decision record
title: Port decisions and their reasons
description: Why the Fluid Functionalism port to gpuix uses native springs, native hover states, a single fluid highlight, a single-quad press-shrink fill, variable Inter with the source's weight tokens, createAppearance theming with a transient cross-fade layer, the kept off-screen culling (re-measured on b03d4e27), the dropped fluid-hover box cache, integer-rounded fluid-hover rects and two-ghost StableLabel (now within noise) with their measurements, the move of JS frame loops to native gpuix animation, file-discovered demos, the drift/ convention, the screenshot and check-* harness, and its pnpm, tsconfig and Biome settings.
tags: [decisions, gpuix, fluid-hover, motion, tooling, pnpm]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-21T00:57:11.792Z
sources:
  - id: openwiki-source-da7929b6e2478aead956fb3c
    resource: repo://biome.jsonc
  - id: openwiki-source-9156c3fc43d32433db430838
    resource: repo://drift/_TEMPLATE.md
  - id: openwiki-source-6305012da4c4c24b665faccd
    resource: repo://drift/file-thumbnail.md
  - id: openwiki-source-385da475ebb9649b27cbd9e7
    resource: repo://drift/site.md
  - id: openwiki-source-5cfc44b662eef11b303099d9
    resource: repo://drift/tabs-subtle.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-1d90d3d86ac1d41b49610f02
    resource: repo://scripts/check-reduced-motion.tsx
  - id: openwiki-source-dcc18690931a266c3aa8c94d
    resource: repo://scripts/check-single-instance.ts
  - id: openwiki-source-819b237d6ed6e51fbd2028b9
    resource: repo://scripts/check-weight-widths.tsx
  - id: openwiki-source-edfa365c97d8e399b7824f84
    resource: repo://scripts/registry-plugin.ts
  - id: openwiki-source-a29d9251e39930cd08b68b32
    resource: repo://scripts/run-scenarios.ts
  - id: openwiki-source-5ebe82cc5f9e383e14411602
    resource: repo://src/app.tsx
  - id: openwiki-source-456bdd1fc2b44eea01d30954
    resource: repo://src/components/button.tsx
  - id: openwiki-source-d17fc045a3296520b28371ae
    resource: repo://src/components/card.tsx
  - id: openwiki-source-52272ff1f298332dd4484482
    resource: repo://src/components/carousel-dots.tsx
  - id: openwiki-source-acfa9c6a13d1ded9117c4665
    resource: repo://src/components/color-picker.tsx
  - id: openwiki-source-239fd08429aaf6fcfc61fa9f
    resource: repo://src/components/file-thumbnail.tsx
  - id: openwiki-source-d16aa80995477f629b4eae12
    resource: repo://src/components/input-copy.tsx
  - id: openwiki-source-78d1990defa7b16135079930
    resource: repo://src/components/menu-item.tsx
  - id: openwiki-source-94d7540365b6edfe6f6a0bbe
    resource: repo://src/components/table.tsx
  - id: openwiki-source-26d9c038c2027980be5931cf
    resource: repo://src/components/tabs-subtle.tsx
  - id: openwiki-source-a79b6ccf1548a05902eb90b6
    resource: repo://src/demos/thinking-steps.tsx
  - id: openwiki-source-b100b0574d7a0258fad9b8f3
    resource: repo://src/lib/clock.ts
  - id: openwiki-source-3763179c46a618f0eea1b1ba
    resource: repo://src/lib/cull.ts
  - id: openwiki-source-896173aa84486fb035ca7515
    resource: repo://src/lib/demo-kit.tsx
  - id: openwiki-source-d8bbfda4e9c9d1361b2fe340
    resource: repo://src/lib/demo.ts
  - id: openwiki-source-b4238869522a9de0f81c49d7
    resource: repo://src/lib/fluid-highlight.tsx
  - id: openwiki-source-ba98ccdc6cabbcd0f3dd70c6
    resource: repo://src/lib/fluid-hover.ts
  - id: openwiki-source-34e6a24572026b7c65be92ae
    resource: repo://src/lib/fonts.ts
  - id: openwiki-source-8595e2831e329ac0413ba7f4
    resource: repo://src/lib/icon.tsx
  - id: openwiki-source-a69db96d312e49d2e9f03b5a
    resource: repo://src/lib/playground.tsx
  - id: openwiki-source-0f590d21e6a23d6af00e8e17
    resource: repo://src/lib/press.tsx
  - id: openwiki-source-88a6e1849924a665249303d0
    resource: repo://src/lib/stable-label.tsx
  - id: openwiki-source-d5126066c122ba41a6591f24
    resource: repo://src/lib/theme-fade.tsx
  - id: openwiki-source-1a25dd521e50a4d59274e1c2
    resource: repo://src/lib/theme.ts
  - id: openwiki-source-805db717791883f12f02d567
    resource: repo://src/pages/changelog/release-spy.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
generated: { by: "claude-code", at: "2026-10-21T00:57:11.792Z" }
---

# Port decisions and their reasons

The port began on 2026-10-12 (first commit `889d6eb`, Button, Combobox and Sidebar) as an experiment: can gpuix draw
this library at all? The choices below were made then and in the days after, each one forced or informed by what
gpuix could or could not do at the time. How the code implements them is in the source; this page keeps the *why*.
The full Tailwind-to-gpuix mapping table is in [README.md](../../README.md), section "How the first three components
translate".

## Motion: native gpuix springs, not tweens

The first plan (2026-10-12) mapped the source's `motion/react` springs onto tweens, because upstream gpuix had no
springs: `spring.fast` (critically damped, 80 ms) was to be a ~120 ms ease-out. On 2026-10-13 the gpuix fork's `poc`
branch gained native `motion` springs (fork commits `527ec49`, `f422de9`, `a02ec23`): `{ type: "spring", duration,
bounce }` or the stiffness/damping/mass form, with velocity kept when the target changes mid-flight. The plan was
revised the same day to use them, so `fast`, `moderate` and `slow` match the source's `springs.ts` numbers exactly.
That is why the README says the fork must be at `poc` `a02ec23` or later.

Two rules from the source were kept deliberately and are easy to lose in a refactor:

- **Exits stay tweens** (60 ms / 120 ms), as in the source.
- **Snap, don't spring, on a reflow.** When a row moved because the layout changed (a filter, a collapse), the
  highlight jumps; only pointer movement glides. A zero-length tween does the snap.

## Hover and press: native state styles first

`hover:` and `active:` on the same element map to gpuix's `style.hover` / `style.active`, which gpuix applies
natively with no JS round trip. Tailwind's `group-hover` and `group-focus-within` are `groupHover` /
`groupFocusWithin` with a named group, which gpuix also resolves natively: the card's dismiss chip reveals on its
card's group, and the colour picker's format label darkens on its trigger's group. Before the adoption pass of
2026-10-17 these were hover signals; do not reintroduce a signal for a child that only restyles from its parent's
hover or focus-within.

A signal (`onMouseEnter` / `onMouseLeave`) is still right in three cases:

- **The lit element is not the one under the pointer.** The table row highlights the fluid hover's pick, which
  still lights a body row while the pointer is over the header or past the last row, so `groupHover` on the row
  would not match the source's `is-active`.
- **The value is read in JS**, for example to choose between colour branches (a card over media).
- **A parent's `has*` state would have to style its children**, or a selector such as `:has(.x)` is needed: gpuix
  has neither (the surfaces' elevation stack keeps a pointer signal).

## Fluid hover: one highlight, nearest row, sessions

The site's signature effect is one highlight that glides between rows. The port keeps three rules from
`use-fluid-hover.ts`:

- **`pickNearest` is ported verbatim**, so a pointer in the gap between rows, in padding, or past the last row
  still resolves to a row and the highlight never blinks out between rows.
- **One highlight per list**, not one per row. The sidebar shares a single highlight across the whole menu
  including sub-menu rows.
- **Sessions.** Entering the container starts a new session; a new session remounts the highlight so it appears
  at the row instead of sliding in from wherever the last session left it. Inside a session it glides; on a
  reflow it snaps (see above).
- **Rows are measured as integers, the way the source's `offsetTop` / `offsetWidth` reads are** (2026-10-21, gpuix
  `b03d4e27`). Since that pin gpuix reports fractional rects (1/64 px), as Chrome does, but it lays an authored length
  out on a whole device pixel (half toward zero) where Chrome would keep `top: 110.5`. A highlight that glided to the
  measured fractional rect therefore ended 0.5 px off its row (basic-table rows sit at .5 px under collapsed borders).
  Rounding the rect to the source's integers makes the highlight rest where the source's does, and
  `check-reduced-motion` compares the table highlight to the row's `offsetTop` rather than its fractional y. Only the
  highlight is corrected; other authored fractions are left (README gap row).

When Base UI primitives later took over keyboard behaviour, fluid hover stayed the owner of the highlighted row:
the primitive's highlight is controlled from `hover.activeIndex`, and a keyboard move calls `releasePointer()` so
the scroll it causes does not re-pick a row under a stationary pointer. See
[Base UI extraction](../history/base-ui-extraction.md).

## Press-shrink through one fill quad

The source shrinks a button on press with a layer inset 1px plus a same-colour `box-shadow` spread. The port does
not copy the shadow. A filled button holds a `PressFill`: one absolutely positioned box, 1px outside the pressable
at rest, whose four edges the press pulls in to the pressable's own. The reasons, in the order they were found:

- **The first port used a spread shadow, drawn as the shadow alone.** gpuix then painted an outer shadow under the
  whole box with no knock-out, so a translucent fill (`--tint`, `bg-hover`) placed over it would have doubled up.
  Drawing translucent fills as the shadow alone avoided the doubling.
- **That left a seam.** Fill and ring were two primitives that antialias separately, so every rounded corner and pill
  end showed a thin grey ring. One quad has no seam.
- **gpuix now paints an outer shadow only outside the border box** (Round 5 item #20), which makes the original
  background-plus-spread recipe legal again. The port kept the single quad anyway: it is seamless, and the cards
  that had an opaque page-colour fill under their shadow to hide the doubling lost that fill instead.
- **The label must paint over the fill without a `zIndex`.** A negative `zIndex` on the fill and a stacking context
  on the button was the first arrangement; the port now follows the source: the label is a `position: relative` box
  after the fill in the tree.

Cost: a quad's edges land on whole device pixels, so the 1px pull-in is one step where the source's spread eases
through partial coverage. The tertiary variant's inward-moving ring is an outline offset (0 at rest, -1 pressed).

## Fonts: Inter variable, weight through fontVariationSettings

The port first shipped four static Inter cuts, because gpuix rendered only a font's default instance: the source's
`wght 550` became SemiBold 600, there was no optical sizing, and a weight change switched at once. Round 6 of the
gpuix fork (adopted 2026-10-18) added `fontVariationSettings` and made it animatable, so the port now ships the same
two Inter 4.0 variable files the source serves (upright and italic, family name `Inter Variable`) and
`theme.ts`'s `weight` tokens are the source's `fontWeights` strings, each `wght` paired with an `opsz`
(`'wght' 550, 'opsz' 18` for semibold). Three rules came out of it:

- **Use the token strings, not `fontWeight`, wherever the source uses `font-variation-settings`.** Plain
  `fontWeight` stays only where the source uses a plain weight class (the shadcn recreations on the Compare page,
  the skill page's generic tabs and menu, the title-bar chrome). Mixing them changes the optical size and so the
  advance widths.
- **Ease the weight where the source transitions it** (80 ms, with the colour when the source's transition lists
  both). `StableLabel` does it by default; `snapWeight` is for rows the source draws without a weight transition
  (the surfaces page's role rows). Weight is not eased on a label by default merely because it can be: copy the
  source's transition list.
- **`StableLabel` reserves the wider of the normal and semibold widths, which is not what the source does.** The
  source's hidden copy is semibold only, and its `font-weight.ts` claims semibold stays within 0.4 px of normal; that
  claim fails in the browser too, so a label whose semibold is narrower (Pro plan 51 to 50 px, Toggle dark mode)
  shrinks by up to about 1 px when selected and nudges its neighbours, there and here. The port has gone back and
  forth: a second hidden normal-weight copy first (so the cell never moves), dropped as `6ad107a` for a rare,
  sub-pixel effect (on the grounds of cost), then reinstated in `54405f67` (the 2026-10-19 round on gpuix
  `5fda771a`) because the point of the label is that its box does not change width. The cell is now
  `max(normal, semibold)`. The cost was real and accepted on `5fda771a`, and within noise on `b03d4e27`; either way
  the label keeps its two hidden `<text>` nodes; see
  [StableLabel's second ghost](#stablelabels-second-ghost-what-it-cost-and-what-did-not-help).

**The weight-width check measures against the browser, not the source's claim.** Chromium measuring the same
`InterVariable.ttf` and tokens does not reproduce the source's 0.4 px claim (Analytics grows 1.05 px; a long all-caps
string shrinks 1.13 px), and gpuix matches Chromium to 0.1 px. `scripts/check-weight-widths.tsx` therefore asserts
parity with the browser's delta and only prints how many strings the source's claim misses. Its second half mounts
every `StableLabel` user through its demo page and steps the held motion clock across the ease, asserting that the
label's box and the boxes of its row neighbours are exactly where they were. Its synthetic mount of labels that are
narrower at semibold ("Pro plan", "Toggle dark mode") asserts the cell is identical light and heavy and equals the
wider of the two copies, exactly. An interim version of the check (`407127fb`) allowed 1 px on neighbours and on the
shrink, because gpuix snapped every JS bounds read to whole device pixels per edge (#45) and the semibold-only ghost
really did shrink; with two ghosts the cell cannot move, and that loosening was reverted. A failure now is a real
move, so do not reintroduce a tolerance. It runs at 1x, so widths at a retina display's 2x scale are not measured.

Bounds became fractional on `b03d4e27`, which changed how the browser comparison is read. The check used to lay each
string out at 130 px and divide the width difference by 10, to get 0.1 px resolution out of whole-pixel reads
(parity tolerance 0.2 px). It now measures at the rendered 13 px, and the parity tolerance is 0.03 px: the worst
difference against the browser's table was 0.018 px, which is that table rounded to 0.01 px plus gpuix's 1/64 px
(0.016) on each width of the pair. A parity failure above 0.03 px is a real width difference, not rounding.

## Performance decisions on gpuix `poc` b03d4e27

Three choices that looked removable, each re-measured on the real window or the sweep harness (`pnpm perf`; the numbers
are not committed, so they live here and in the README gap rows). Their outcomes differ: culling stays, the container
box cache is gone, and the second `StableLabel` ghost stopped costing anything. The shared lesson is that every claim
about cost has an expiry date, because gpuix's retention and bounds-read behaviour changed between `e5231304`,
`5fda771a` and `b03d4e27`; re-measure before leaning on a number from an older pin.

- **Off-screen culling stays (`src/lib/cull.ts`).** gpuix lays out and paints elements a scroller clips away
  (gpuix #46: retained and clipped content is not free), so a page of many menus costs several times a short one.
  The port hides a region's content with `display: none` while it is a quarter viewport from the page scroller,
  keeps the region's measured height, and holds `onFrame` and timer loops still while hidden (`OnScreenContext`),
  because any signal a loop sets redraws the whole window. The earlier decision was to remove it once #46 landed
  and to re-run the removal comparison first; that comparison was re-run on `b03d4e27` and culling stays.
  - *Method.* Live `pnpm perf` at load average 1.4-3.1, two alternating pairs of runs, culling on against off (the
    `IntersectionObserver` effect disabled). Idle CPU and sidebar-sweep draw p95 are both read, since they regress
    independently.
  - *Result.* Off was worse on 9 pages and better on none. Showcase idle CPU 45 to 80% and p95 5.5 to 11.1 ms;
    input-message idle 3.3 to 51.5%; fluid-hover idle 37 to 55% and p95 4.1 to 7.3 ms; changelog idle 37 to 46% and
    p95 4.2 to 6.1 ms; scrollbars p95 4.1 to 11.6; ask-user-questions 5.0 to 9.3; audio-mixer 5.0 to 8.4;
    command-menu 4.9 to 7.2; scroll-area 10.8 to 12.0. Summed over 49 pages, idle CPU 464 to 575 and p95 244 to 274 ms.
  - *What changed since `e5231304`.* There every page's p95 with culling was 10-25 ms and removing it took changelog
    from 10.9 to 26.6 ms and command-menu from 16.7 to 37.4 (sum 520 to 670); now p95 is about 4-5 ms with culling and
    the gap from removal is smaller in absolute terms (summed p95 +30 ms against +150 before) but still
    one-directional. The old and new absolute numbers are not comparable: different pin and different load.
  - Costs of keeping it: a culled region has no bounds (screenshot scenarios call `shot.reveal` first), and the
    changelog Releases jump has to re-aim, below. The README "Culling" gap row carries the same numbers.
- **The changelog Releases jump re-aims while culled entries un-pin.** A jump computes its target while the entries
  above the month are pinned at their culled heights. They un-pin to their real heights as the smooth scroll passes
  them and come out a few px taller, so one scroll landed the month 4-5 px low (36-37 px under the top against the
  source's 32; once 281 px, on the wrong month). `release-spy.ts` recomputes the target on each page scroll and
  scrolls again when it moved by more than 1 px, stopping when the month is within 1 px, the page end is reached,
  or the user scrolls away (`scripts/check-changelog-rail.tsx` pins it). It only runs while a jump is in flight, so
  idle and sweep cost did not change. It is an approximation of the source's single `scrollIntoView`, recorded in
  `drift/site.md`.
- **Fluid hover no longer caches its container box (reversed on `b03d4e27`, `13d7ae26`).** On `e5231304` every
  `getBoundingClientRect` ran a layout pass of about 6 ms, and a live read per pick was not safe: on pages whose
  previews autoplay a cursor, idle JS frame-callback time went from about 3 to 330-430 ms per second (cached to live:
  changelog 3.0 to 328 ms/s, fluid-hover 3.9 to 376 ms/s) while sidebar-sweep draw p95 stayed unchanged, so a
  sweep-only benchmark would have missed it. The port cached the box and refreshed it on resize, scroll, pointer
  enter and page scroll. On `b03d4e27` a bounds read after a paint-only write runs no layout pass (gpuix #47), and
  the cache measured within noise against a live read, so it was dropped: `pick` reads the container's rect on every
  pick, like the source's `use-fluid-hover.ts`, and `containerBox()` is a fresh read. What it bought is gone, and what
  it cost was a staleness window (the container moving with no resize, no scroll event it receives and no page
  scroll). Do not reintroduce a cache on the strength of the old 6 ms figure; if a future pin makes the read slow
  again the symptom to watch is idle frame-callback time on autoplay pages, not sweep p95.

The changelog's `width: '100%'` column wrappers, added on 2026-10-17 when nested auto-width flex columns cost ~1.9x
per level (8 columns drew in 121 ms, 20 ms with the wrappers), were removed once gpuix #36 made that layout linear.
The removal measured no change (changelog sweep draw p95 10.9 to 11.0 ms), so they are not a perf decision to
restore.

### StableLabel's second ghost: what it cost and what did not help

On gpuix `b03d4e27` the second hidden copy is **within noise**: seven sidebar pages, three alternating runs each, sweep
draw p95 -0.35 to +0.30 ms and p50 at most 0.1 ms, except 0.5 ms on radio-group. On `5fda771a` the same comparison
showed **+1.0-1.7 ms p95 and about +0.1 ms p50 on every page measured**, which is why the label once dropped to one
ghost (`6ad107a`, measured about 1.5 ms on `365f7c88`). The README and the doc comment credit gpuix #46 and #58: an
`opacity: 0` text paints nothing, and hidden labels are not re-measured. The decision to keep two ghosts did not
change, because the reason was never the cost: the box must not change width when the weight changes, and
`check-weight-widths` needs the wider of the normal and semibold copies. What changed is that nobody should drop the
second ghost for speed any more.

What was learned on `5fda771a` and is worth keeping in case the cost returns: a hidden `<text>` cost about 2 us on a
frame that replays its label and 15-19 us on a frame that builds it, and the slow ~19% of live sweep draws were the
builds, so the cost was paid on frames that rebuilt the tree. Two things looked like cures and were not:

- **`inline-grid` to `grid` on the label wrapper was tried and reverted: no gain.** The label sits in flex rows, so
  its items are blockified and retained either way.
- **The text is not re-shaped** each frame, so it was not a measurement cost either. gpuix has no text-measure API,
  so a hidden copy is the only way to hold the wider width.

The numbers and a reproduction live outside the repository, in the author's notes
`~/.claude/notes/ff-gpuix-repros/` (`r2-hidden-text-cost.md`, `r3-hidden-text-rebuilt-frames.md`); they are not
repository files and may not exist on another machine. The `b03d4e27` result is in `stable-label.tsx`'s doc comment.

### JS frame-clock loops moved to gpuix native animation

Until 2026-10-19 the file-thumbnail spinner, the thinking indicator (glyph, shimmer, word cycle), the carousel-dots
autoplay fill and two scripted cursors (the Fluid Hover plain-versus-fluid cursor and the skill pages' script cursor)
ran on `onFrame`, one shared 16 ms `setInterval` clock (`src/lib/clock.ts`), because gpuix has no
`requestAnimationFrame`. gpuix does have native motion values, `repeat`, and CSS keyframes, so these now run in the
renderer and cost no JS per frame. The reasons to prefer it, and the traps:

- **What it buys.** A native frame costs about 1.8-3 ms of draw against about 7-11 ms for a JS-driven redraw, because
  every signal a JS loop sets redraws the whole window. Idle CPU before to after, same pages: file-thumbnail
  50.3 to 21.0%, carousel-dots 52.2/50.3 to 20.6/20.1%, plain-vs-fluid on Fluid Hover 65 to 36% (draw p50 11 to 3 ms)
  and on the changelog 64 to 39%, thinking-indicator 29.0 to 26.4% (draw p50 8.6 to 2.4 ms), script cursors on a
  page of examples 26 to 14.5%. Pages whose idle cost was something else did not move (changelog and showcase for the
  carousel; thinking-steps 70.9 to 69.2%).
- **It runs at display rate.** The old thinking indicator ran at 30 frames a second; native animations run at the
  display's 75 Hz with no throttle, so the saving there is the cheaper draw only, not fewer frames.
- **No pause, play or seek on a motion value's animation** (only `stop()`, `cancel()`, `complete()`;
  `getAnimations()` covers CSS `animation` and `transition` runs only, not `motion.*`). Every pause is
  `stop()` followed by a new `animate()` from the current value for the time left. That is exact for a linear
  animation and is how the carousel fill, the plain-vs-fluid cursor (a linear 0 to 1 progress value whose keyframes
  live in a range-form `createTransform`) and the script cursors pause. It also fixed a bug of the JS carousel: its
  restart effect tracked the options object, so hovering the slide reset the fill to 0, where the source holds it.
- **Pick the animation kind by what the property is.** The file-thumbnail spinner is a `motion.circle` sliding
  `strokeDashoffset`, because on `5fda771a` keyframes took style properties and not SVG attributes. That limit is
  gone on `b03d4e27`: the button's loading spinner (`615fd85c`) is the source's `spinner-move` and `spinner-dash`
  keyframes (`strokeDashoffset`, `strokeDasharray`) on a `pathLength` 100 path, drawn on the source's infinity path,
  36 px (28 compact), stroke 1.125, and a culled button holds the first frame. The file-thumbnail spinner stayed as it
  is because its only remaining gap is the missing rotate transform. The thinking-indicator shimmer is per-letter colour keyframes (`defineKeyframes`) because `background-position` is not
  animatable; the glyph is a `motion.path` morphing `d`; the word cycle is still a 4 s `setInterval`. Culled
  regions mount a still copy, and the hidden width-reserving copy plays nothing, so nothing animates off screen.
- **Stroke draws use `CheckMark`, not keyframes.** Also on `b03d4e27`, the menu-item check (`1fff79c0`) and the
  input-copy check and cross (`c3db5af1`) draw and retract through `CheckMark` (`motion.path` on `pathLength`)
  instead of fading in. `CheckMark` gained a `viewBox`, `drawOnMount` and a colour `fade`, because input-copy draws
  the source's own paths in a 20 x 16 box shown at 14 px, starts undrawn, and fixes the button variant's stroke at 2
  while only the copy icon eases with hover. Drift: the menu-item entry now records only the always-reserved check
  slot, and input-copy only the missing scale-in.
- **A looping native animation is not free on a heavy page.** It replays the whole page per tick (gpuix's
  per-replayed-root cost): one looping colour keyframe on one text took 7 ms a tick at 3000 nodes and about 60 ms at
  12000, against 0.1 ms with nothing animating, so a page with a running loop idles at 37-45% CPU (carousel-dots,
  file-thumbnail, thinking-indicator, thinking-steps, queued-stack, showcase, fluid-hover, changelog, and the button
  page, whose native loading spinner takes the source's always-loading Saving button from 3.8% idle to 41%). This is why
  culling also pauses the loops. On `5fda771a` such a loop could starve Bun's timers outright; as of `b03d4e27`
  timers run between ticks (9-10 callbacks a second at 3000 nodes, 7-8 at 12000; gpuix #56), so a hung perf or check
  run under load is no longer expected to be this.
- **Who still uses `onFrame`, and why** is recorded in the doc comment of `src/lib/clock.ts`: thinking-steps'
  chevron (the source's `rotate` is a transform gpuix cannot animate), the fluid-hover lists demo (re-measures rows
  while a sub-menu springs), and the cost meter (reads the clock's gaps as its stall probe). Do not add a new
  `onFrame` loop for something a motion value or keyframe can play.

Each conversion has its own check (`check-file-thumbnail`, `check-thinking-indicator`, `check-carousel-dots`,
`check-plain-vs-fluid`, `check-script-cursor`) that holds the motion clock and reads the result, so a native loop is
verified against the source's timing and easing rather than against a screenshot.

**The thinking-steps demo cards start when half of them is in view**, as the source does (`observeVisibleRatio` in
`src/lib/cull.ts`, an `IntersectionObserver` wrapper against the window). The four playback cards used to start on
mount, so off-screen cards mounted steps and ran active-step shimmers and the page idled near 70% CPU. A card now
waits paused, plays at 50% or more visible, pauses below 10% keeping its elapsed time, and a finished card stays
finished until replayed. A culled region has no box and reports 0, so it holds.

## Theme: System, Light and Dark through createAppearance

The first plan was light-only; on 2026-10-13 the user asked for dark and a theme switcher matching the live site.
Both columns of every `light-dark()` in `globals.css` are kept as a token table (with `color-mix()` mixed offline),
and the scheme is a signal so JSX re-colours on change. "System" follows the OS through gpuix's `createAppearance()`,
and `renderer.setAppearance` mirrors an explicit Light/Dark so the native window chrome follows. Default is System.
A consequence: tokens must be read inside JSX or a function, never at module scope, or they freeze at one scheme.

**The theme cross-fade is a transient universal layer.** The source fades every colour for 180 ms by adding a
`.transitioning` class for 200 ms around the swap. The port mounts a `UniversalStyle` (a gpuix `* {}` layer) in
`src/lib/theme-fade.tsx`, flips the palette 20 ms later, and removes the layer 200 ms after that. Three details are
easy to break:

- **The lead frame is required.** An element that first gains a `transition` in the same change as its colour jumps
  instead of easing, so the layer has to be in before the palette moves (the source forces a reflow for the same
  reason).
- **Only user actions fade.** `changeTheme` is the user path; captures and tests call `setThemeChoice` directly and
  cut at once. The layer exists only during a change, so first paint never fades.
- **Only three properties ease** (`background-color`, `color`, `border-color`): gpuix does not animate `fill` or
  `stroke`, which the source also lists.

## Demo discovery by file scan

During the 2026-10-13 fan-out, six agents ported components in parallel in one tree. To keep them from colliding on
a shared registry, nothing lists the demos: `scripts/registry-plugin.ts` scans `src/demos/*.tsx` with `Bun.Glob` at
startup and serves the result as the `virtual:demos` module (likewise pages and the changelog), which `src/lib/demo.ts`
reads. A component adds only its own three files (component, demo, drift entry). The same plugin feeds `Bun.build`,
because the compiled binary reads nothing from the repository; a runtime directory scan would find nothing there.

## drift/ and its Cause values

Each component or page has a file in `drift/` listing every place the port looks or behaves
differently from the source, with source and port `file:line`. It started as `limitations/` (gpuix gaps only) and
was renamed on 2026-10-16 (`a2d666c`, merged in `037f742`) when the audit widened to every difference, whatever its
cause. Every entry has a **Cause**: `gpuix gap` (gpuix lacks it or gets it wrong), `port choice` (different on
purpose), or `not ported yet` (nothing blocks it). An entry naming two causes counts as mixed. Splitting by cause is
what made the backlog actionable: gaps go to the gpuix fork, `not ported yet` became the user's "port everything"
decision, and choices are left alone. The shape is [`drift/_TEMPLATE.md`](../../drift/_TEMPLATE.md); the counts
table is in the README.

When the layout engine puts a thing somewhere the source does not and no style reproduces it, the port sets the
measurement outright and the drift entry records the residue. The tabs-subtle unfolding label is the example (the entry that took the
drift total to 533, 2026-10-21): in the source it sits in a block whose line box takes the button's 16 px / 24 px strut, so the
clip is 24 px tall, the baseline is 18 px down and the descender of "Teamspaces" shows. A `fontSize: 16, lineHeight:
24px` block gave the 24 px clip but gpuix seated the cap-trimmed `inline-grid` label about 5.5 px above Chrome's
baseline, so the clip is `height: 24` and the label gets an authored `marginTop` (`labelTop`, 18 minus the cap
height: 8.55 default, 9.27 compact). gpuix rounds that authored length too, so the label ends up to 0.5 px off
Chrome's; the entry records that, and the README "Bugs" row is the gpuix-side report. Do not go back to deriving it
from a strut until the gap row closes.

## Screenshots and check-* scenarios

There is no browser to compare against, so verification is two headless harnesses on gpuix's offscreen test
renderer: `pnpm screenshots` (captures per page) and `pnpm check:scenarios` (the `scripts/check-*` files, which
assert behaviour, ARIA and focus). `check:scenarios` runs every check
and lists all failures at the end (`b429d8ca`); it used to stop at the first one, which hid everything after it in
a 30-minute run. Run the check for the component you touched on its own (`bun scripts/check-<name>.tsx`). The README's "Screenshots run on the test renderer" notes list the test-renderer
quirks. One trap: **captures are not byte-stable**. The playgrounds pick variants with `Math.random`, and the caret
and timing-driven demos differ run to run, so compare the content area by pixel diff, never by hash, and do not
recommit `screenshots/` for noise.

A pin change is the exception to the partial recaptures described next: the `b03d4e27` adoption recaptured all of `screenshots/`
(fractional layout, trimmed-label baseline, native spinner, menu check and input-copy marks), then redid the shuffled
playgrounds and timing demos in their own commit.

Two things from the 2026-10-19 round (`a2eed755`, `ce7ee2b9`, `d9d2e93e`):

- **Recaptures are partial on purpose.** A round recaptures the pages whose content changed (here: the Customise
  card rows 34 px apart, the native-animation phases, `StableLabel` widths) and leaves noise-only files alone
  (changelog, compare). The nine `playground-shuffled` captures are redone in their own commit, because their
  random variant makes the diff noisy and their sidebar must sit at the same y as every other capture.
- **A scroll helper must not read "the element did not move" as "the page ended".** The old per-demo copies
  returned when the element's y equalled the previous attempt's, but a wheel can land without moving the page, so a
  capture could be taken with the element still off-screen and a wrong image committed. `scrollNearTop` in
  `src/lib/demo-kit.tsx` (`96dbbaea`, which replaced eight local copies) now counts consecutive wheels that moved
  nothing, up to 12 attempts, and throws `scrolling did not move <testId>` on the third; reaching the page end is
  the only legitimate early return. Use it for any demo scenario that scrolls an element into view.

## pnpm wiring: one solid-js, one @gpuix/solid

This is the most fragile part of the setup; the README's "How gpuix and base-ui-solid-gpuix are wired in" has the
full mechanics. The decisions and what forced them:

- **`@gpuix/solid` is a `file:` copy, not a `link:`.** A link resolves `solid-js` from the fork's own
  `node_modules`, giving two `solid-js` instances: two reactive systems, and nothing updates, silently. A copy
  resolves its peer from this app. Cost: run `pnpm install` here after rebuilding gpuix's dist.
  `packageImportMethod: clone-or-copy` keeps a gpuix rebuild from mutating the store.
- **`@gpuix/native` stays a `link:`**, and the workspace override points the copy's native dependency back at the
  fork.
- **base-ui-solid-gpuix is a workspace member** linked with `link:`. A plain link failed because a `file:`
  dependency gets a store path per project directory, so the sibling would get its own second `@gpuix/solid`.
- **Install only from this repository's root.** A bare `pnpm install` inside the sibling links a second copy, and
  pnpm 12 auto-installs before running scripts there too, so the sibling sets `verifyDepsBeforeRun: false`.
- **A guard catches it.** `scripts/check-single-instance.ts` (run by `check:scenarios`) fails when either package
  resolves to more than one file.

## Type checking and lint

- **`noUncheckedIndexedAccess` is off.** The `@total-typescript` base config turns it on; on 2026-10-17 it alone
  produced 244 errors, mostly in code the Base UI extraction was about to rewrite. It was turned off to land the
  extraction and is an open follow-up.
- **Biome skips `openwiki/` and `perf/`.** `perf/` is the frame-time data `pnpm perf` writes (not committed), which
  is not source (`14d29504`).
- **Biome's a11y rules are off.** They misfired 209 times on gpuix JSX, which is not HTML (gpuix elements carry
  their own roles and ARIA props). Accessibility is asserted instead in the check-* scenarios through gpuix's
  accessibility tree.
