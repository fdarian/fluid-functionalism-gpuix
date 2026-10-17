---
type: history and status
title: gpuix gaps and divergence rounds
description: Which gpuix gaps the port works around (summary, with the README as the full list), and the history of DOM divergences this port reported to the gpuix fork, round by round, with the gpuix commits that landed and the migrations the port made in response.
tags: [gpuix, gaps, upstream, history, migration]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:20.113Z
sources:
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-2784d511d2f9a521edaf8bb9
    resource: repo://src/lib/app-frame.tsx
  - id: openwiki-source-4debc99e1bba986521a754c5
    resource: repo://src/navigator.d.ts
generated: { by: "claude-code", at: "2026-10-17T00:13:20.113Z" }
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
- **Test-renderer quirks** (window options ignored, batched keystrokes) that constrain the screenshot harness.
- **Windows/Linux** dispatch is asynchronous, so `preventDefault()` on press arrives too late there. The fork
  scoped itself to macOS only on 2026-10-16, so these are not reported as open.

Treat the README list as **possibly stale**: it was written against the DOM-parity release, and the 2026-10-17 gap
pass (below) closed several rows the port has not yet adopted.

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
`marker`/`pattern`/`filter`, the physical key code, and IME composition events. Still not built: container queries,
`display: table`, `display: inline-*`, `:has()`, and culling of clipped subtrees.

## Pending: the Round 5 / gap-pass adoption

As of 2026-10-17 the port has **not** migrated to `120dd049`; it was held until the
[Base UI extraction](../history/base-ui-extraction.md) finished. The next adoption pass, across this repository and
base-ui-solid-gpuix, has to:

- rebuild the gpuix dist and `pnpm install` from this repository's root;
- handle two breaking changes: a numeric `lineHeight` is now a unitless multiplier (convert px values), and a border
  without a style is `none` (add `borderStyle: "solid"`);
- drop the workarounds now unnecessary: the mousedown refocus workaround (#27), `src/navigator.d.ts` (#25), the
  opaque-fill-under-shadow arrangement (#20), the input wrapper carrying `fontVariantNumeric` (#24), the nbsp-padded
  code chips and the slider's split value label (#26);
- adopt: `UniversalStyle` for the theme cross-fade (#22), mark colour transitions (#23), the reduced-motion nuance
  (#21), intrinsic widths for the scroll-area wrapper and select popup, `zIndex` across stacking contexts, `url()`
  backgrounds, the physical key and IME;
- then update `drift/` and the README gap rows, rerun `pnpm check` and the screenshots.

Several README gap rows and drift entries (inline span padding, per-run font size, SVG marker, `width: auto` motion,
intrinsic width) describe gaps this pass already closed in gpuix; they stay until the adoption confirms each one.
