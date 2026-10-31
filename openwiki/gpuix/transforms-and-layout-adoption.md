---
type: decision record
title: "Transforms, layout glides and filter: the 2026-10-30 adoption of gpuix 667084d0 to 5f7a9af9"
description: Why and how the port replaced box-property stand-ins with the source's transforms, adopted layout and layoutId glides, animated filter and per-target exit transitions on gpuix 667084d0 to 5f7a9af9, the traps found on the way (rect space, popLayout pins, glides measured at a commit, Unsteady layout boxes), and what is still an approximation.
tags: [gpuix, transforms, layout, motion, adoption, migration, drift]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-31T01:58:44.003Z
sources:
  - id: openwiki-source-52df002f39d8608aefccfdde
    resource: repo://drift/home.md
  - id: openwiki-source-6b2c42ba95a3acb7c949fd2c
    resource: repo://drift/queued-stack.md
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-fac7a3f3768fe057d1557909
    resource: repo://scripts/check-kit.tsx
  - id: openwiki-source-51a14916153f889e9e32dcd2
    resource: repo://src/components/ask-user-questions.tsx
  - id: openwiki-source-52272ff1f298332dd4484482
    resource: repo://src/components/carousel-dots.tsx
  - id: openwiki-source-da07ac8b1a874c0edaf95354
    resource: repo://src/components/chat-message.tsx
  - id: openwiki-source-16f9df5e36d9a8fea157dd84
    resource: repo://src/components/input-message.tsx
  - id: openwiki-source-888ed3b6a5a52622b4afcbfe
    resource: repo://src/components/radio-group.tsx
  - id: openwiki-source-e937d0413e1c4205eb067717
    resource: repo://src/components/thinking-steps.tsx
  - id: openwiki-source-a6e7d28cb827574c90025f7b
    resource: repo://src/home/bento-grid.tsx
  - id: openwiki-source-ba98ccdc6cabbcd0f3dd70c6
    resource: repo://src/lib/fluid-hover.ts
  - id: openwiki-source-ff84ac67d7a6ebc693884d4f
    resource: repo://src/lib/popup.tsx
generated: { by: "claude-code", at: "2026-10-31T01:58:44.003Z" }
---

# Transforms, layout glides and filter

Until 2026-10-30 gpuix had no transforms, so about forty places in the port approximated the source: popups lost their
`scaleY` entrance, chevrons swapped glyphs, panels and the fluid highlight moved on `top`/`left`, the file-thumbnail
spinner slid an SVG dash, and three loops (the word roll, the scripted cursor, the carousel fill) animated a layout
property. gpuix Round 25 (`667084d0`) added transforms, and four pins in two days (`667084d0`, `ae559246`, `e31ec048`,
`5f7a9af9`) added the rest. The port then moved every one of those places onto the source's own key, spring and origin
in one slice-by-slice pass, recaptured the screenshots, and rewrote the README gap table and the drift files around what
remains. The round-by-round gpuix bookkeeping is in [gpuix gaps and divergence rounds](gaps-and-divergence-rounds.md#rounds-24-to-38-transforms-layout-glides-and-filter-on-poc-667084d0-to-5f7a9af9-2026-10-30-to-31);
this page keeps the reasons, the traps and the leftovers.

## The rule the pass followed

Port the source's transform on the same key, spring and `transform-origin`, and delete the stand-in and its drift entry
together. A stand-in was kept only where the source's mechanism still could not be expressed, and then the entry was
rewritten to name the exact gap rather than the old "no transforms" cause. The drift total fell from 539 to 495 because
entries left with their stand-ins; the README table counts the rest (47 gpuix gap, 219 port choice, 183 not ported yet,
46 mixed).

What moved, so a reader can tell a deliberate transform from a leftover: popup entrances (`y` and `scaleY` about the
resolved side), tooltip chips and `followCursor` (`x`/`y` on a box around the chip), the dialog and command-menu panels
(scale .97 about the centre), the mobile drawer (`x` -100% to 0), accordion, thinking-steps, sidebar and colour-picker
chevrons, switch and slider thumbs, the scroll-area thumb, radio dot, banner (scale from .4, fixed bar on `y` -100%),
chat-message, queued-stack and the callout pile (`y` and `scale` from the bottom centre), input-message tiles and
queued rows, input-copy glyph swap, the thinking-indicator word roll, the fluid-hover cursor and distance label, the
carousel-dots fill, the skill page's press, cursor and timeline, the changelog dot and arrow, the file-thumbnail
spinner, and the highlight (`x`/`y` from 0,0, with `width` and `height` still box properties).

## Decisions and their reasons

- **Loops moved because the transform is cheaper, not only because it is faithful.** A looping `top` or `width` tick was
  a whole frame; on `x`/`y`/`translateX` it is a patched tick. The carousel fill is one animation held with `pause()` and
  `play()` and drawn through `translateX(calc((p - 1) * (100% - 6px)))` from a native range map, so a playing carousel
  costs no JS. The README per-tick row has the headless numbers for `ae559246`; the whole frames that remain are box-size
  springs the source springs too (thinking-steps' `height`, carousel-dots' track width) and JS commits.
- **Exits say so themselves.** gpuix #107 lets a target's own `transition` replace the component's for `animate`, `exit`
  and `initial`, and Solid's `AnimatePresence` plays an exit with it. Seven components dropped a `useIsPresent` ternary
  that picked a transition by presence; their checks sample the exit's real end instead of a fixed wait. The motion
  page's modal demo became an `AnimatePresence`. See [Port decisions](../decisions/port-decisions.md#motion-native-gpuix-springs-not-tweens).
- **`filter` is animatable (#106), so the blur reveal is the source's.** Thinking-steps chips and images and the
  copy-prompt glyphs enter on `blur(4px)`; `check-thinking-steps` reads the halo a blurred chip leaks past its edge. The
  earlier note that "the blur reveal stays a gpuix gap" is gone.
- **Colour fades include `fill` and `stroke`** since gpuix Round 15b: `colorFade` and the theme-fade layer now list them,
  so SVG icons cross-fade with the page.
- **A value spring ends on its target (#108)**, so the banner's scale spring no longer needs `restDelta`/`restSpeed` to
  come to rest.

## Traps found, in the order they cost time

- **A transform changes what a measurement means.** `getBoundingClientRect` is the transformed box and nothing
  re-measures when a scale settles, so a hover that landed while a select or dropdown was still scaling in left the
  fluid highlight off its row by the scale it was measured at. The fix reads rows in the container's layout pixels
  (container box over its observed layout size), which is also what the source's `offset*` reads give.
  `check-popups` hovers a row mid-entrance. The same rule explains why `check-weight-widths` maps a scaling popup's
  content back through the popup's scale and holds a turning chevron to its centre.
- **A layout glide starts only for a move measured at a commit (#113).** gpuix compares a box's position across commits,
  so a layout that changes because an animation above it ticked, or because scroll anchoring adjusted, carries the box
  with it and does not glide. Two consequences. First, `layout="position"` on ask-user-questions' footer buttons was tried
  and reverted on 2026-10-31 (`653f2e66`, `219c26d8`): the button beside a leaving one jumped, because a glide also ran for
  a box an animating ancestor moved (a +38 px excursion in the page scroller); it came back after #113 made that case
  not glide. Second, the home grid's cards cannot simply carry `layout` all the time (next bullet).
- **A leaving `popLayout` child keeps its pin only if its style is stable.** Before #114 a style object that was new on each
  read undid the pin, so input-message memoised the file tile's style; after #114 it is a plain object again, and the
  tile row stays the positioned parent `popLayout` measures against. A removed tile or queued row now leaves flow at once,
  so its siblings glide into place on `spring.fast`; the queue's 4 px spacing is the list's `gap`, because a per-row
  margin moved a sibling before it glided. A queued row still trails a region that moves it by a frame or two; the drift
  entry carries the measured numbers.
- **An on-screen `layout` box makes every tick of a looping page whole (`Unsteady`).** Always-on `layout` on the bento
  cards took the showcase's idle CPU from 22% to 36%, so the cards carry `layout` only while a `ResizeObserver` reports the
  grid resizing, switched on in the frame before the media query flips the columns (giving `layout` in the same commit as
  the new columns glides nothing). The columns are `createMediaQuery` state again for the same reason: the re-slot has
  to happen inside a commit. The cost of that gate is a card that moves for another reason inside 600 ms of a resize
  also glides. Queued-stack is the page that pays without the gate: `layout="position"` on the chat message idles it at
  25-29% CPU with 0 patched frames (9.7% before), and gpuix #113 did not change it, because the box never moves yet
  still counts as following the clock. A minimal repro with no FF code is in the author's notes
  (`ff-gpuix-repros/idle-layout-unsteady`); it is a gpuix question, not a port workaround.
- **One test renderer per thread.** A check that mounts a second root must unmount the first: a root a newer one replaced
  released its Switch thumb's motion value against the newer renderer and died with "unknown motion value" after every
  PASS (color-picker, dropdown, popups). `createCheck`'s unmount is idempotent for this reason.
- **A transformed box is its rounded layout position plus the exact translation, antialiased (#109)**, so thumbs and text
  at a fractional translation sit at a sub-pixel position as in Chrome. Recaptures therefore move slider and switch thumbs
  by up to half a pixel; the final recapture of all 49 pages kept a file's committed value whenever noise dominated.
- **A clip under a transform dropped its text on `ae559246` (#110, fixed `e31ec048`).** The sidebar callout pile
  clipped to its rounded corners again afterwards. #116 (`5f7a9af9`) fixed the same family for a `content-visibility:
  auto` box's proximity and an input caret under a transform; FF uses neither, so nothing in the port changed.

## What is still an approximation

Each of these has a README Missing-features or Bugs row and a drift entry that names the exact gap; do not paper over
them with a stand-in.

- **Size morphs.** `layout` and `layoutId` animate size as a scale about the box centre with radius and shadow corrected
  (#115), which is the source's projection, but a `layoutId` has no crossfade and no radius mix. The queued card's morph
  into its sent bubble is therefore opaque from its first frame while the card plays its own exit under it, and a scroll
  between the commit and the glide's first frame shifts the start by the distance scrolled (the second dispatch of the
  seeded demo starts 110 px above the card; `check-queued-morph` reads the transformed box mid-morph). The home grid's
  re-slot is ported with the gate above.
- **`var()` in a Motion key.** The source enters popups on `y: var(--popup-enter-y)`; gpuix substitutes `var()` only in the
  CSS transform properties, so a popup that flips starts its first open on the other side's 4 px slide (opacity 0 to 1
  over 80 ms) and is right from the second open.
- **Text under an animating transform** is rasterized at a rounded-up scale and re-rasterized through the exact matrix
  when the run ends, as Chrome composites an animating layer; a spring's last frames may shift a glyph by a pixel. Checks
  and screenshots read boxes at rest, where the matrix is exact.
- **The dropdown's RTL chevron mirror** stays out as a port choice (no direction context), not a gpuix gap.

## Verification notes

`scripts/check-*.tsx` were rewritten alongside: popups and tooltips sample mid-entrance, input-message and chat-message
sample a sibling mid-slide, `check-table` reads layout counters rather than retained builds (the collapsed table's paint
unit now counts a retained build on every transform tick), and the idle-input regression is headless
([Round 14c](gaps-and-divergence-rounds.md#round-14c-input-to-an-idle-window-wakes-the-frame-loop-on-poc-6f2a72d3-2026-10-23)).
`pnpm footprint` gained a 30 s limit per spawn after a synchronous `/usr/bin/footprint` hung the child's own deadline;
on `ae559246` memory in the README footprint figures is the child's RSS, not `phys_footprint`, so do not compare it with
older rows.
