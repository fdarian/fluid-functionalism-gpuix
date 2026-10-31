---
type: quickstart
title: Quickstart
description: Task routing for the Fluid Functionalism port to gpuix; which wiki page or repository document answers each kind of question.
tags: [quickstart, routing]
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-37e23bbd30830cb88f82931f
    resource: repo://scripts/check-idle-input.tsx
  - id: openwiki-source-edfff899d93ec8844d1b24df
    resource: repo://scripts/perf-page-switch.tsx
  - id: openwiki-source-923ee25729d055f35a254df3
    resource: repo://src/components/command-menu.tsx
generated: { by: "claude-code", at: "2026-10-31T01:58:44.003Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-31T01:58:44.003Z
---

# Quickstart

This repository ports the [fluidfunctionalism.com](https://fluidfunctionalism.com) component library and site to
Solid on gpuix (a GPUI renderer with no DOM or CSS). Behaviour primitives live in the sibling
`base-ui-solid-gpuix`; the gpuix fork lives at `~/code/fdarian/gpuix`, branch `poc`. The wiki keeps what the code and
the repository docs do not: reasons, decisions and history. For mechanics, go to the repository docs.

| If you need to... | Read |
|---|---|
| Understand what the project is and how the three repositories relate | [Project overview](product/overview.md) |
| Run the app, add a component or page, run checks and screenshots | [README.md](../README.md), [AGENTS.md](../AGENTS.md) |
| Sync with upstream, or know which upstream commit a file tracks | [UPSTREAM.md](../UPSTREAM.md) |
| Know why springs, hover, fluid hover, press-shrink, fonts, theme or the pnpm wiring are the way they are | [Port decisions](decisions/port-decisions.md) |
| Know why labels set weight through `fontVariationSettings` and `StableLabel` reserves the wider of the normal and semibold widths (two ghosts) | [Port decisions, Fonts](decisions/port-decisions.md#fonts-inter-variable-weight-through-fontvariationsettings) |
| Know why off-screen culling stays and why it is `content-visibility: hidden` rather than a `display: none` wrapper, why fluid hover reads its container's rect on every pick (the box cache was dropped) and rounds row rects to integers (the source's `offset*`; no longer a workaround), and why the two `StableLabel` ghosts stay although they now cost nothing measurable | [Port decisions, Performance decisions](decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27), [StableLabel's second ghost](decisions/port-decisions.md#stablelabels-second-ghost-what-it-cost-and-what-did-not-help) |
| Add an animation or loop (spinner, shimmer, autoplay, scripted cursor) and keep it off the JS frame clock | [Port decisions, native animation](decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation); `animate()` returns `pause()`/`play()` controls since `83bab5a7` (plain-vs-fluid uses them), and a looping native animation costs the whole page per tick unless gpuix patches it (since `196d69ce` for paint-only loops, since `c6475390` also beside an input or under a positioned or translucent ancestor, and since transforms (2026-10-30) a loop on `x`/`y`/`scale` patches too; a box-size spring, a JS commit or an on-screen `layout` box still draws whole: [Round 12](gpuix/gaps-and-divergence-rounds.md#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21), [the adoption](gpuix/transforms-and-layout-adoption.md#traps-found-in-the-order-they-cost-time)) |
| Write a scroller's offset (a list that follows a spring, a page switch), or measure a sidebar-click hitch with `scripts/perf-page-switch.tsx` | [Port decisions, scroll writes and page switches](decisions/port-decisions.md#scroll-writes-use-the-plain-scrolltop-setter-and-a-page-switch-is-measured-by-its-first-draw): the plain `scrollTop` setter is fine since `f7b62f11`; the check that would catch a cascade is a held key counted in layout passes per drain |
| Measure idle CPU or memory of a page or a whole session (`pnpm footprint`), or read a footprint figure | [Port decisions, measuring idle CPU and memory](decisions/port-decisions.md#measuring-idle-cpu-and-memory-pnpm-footprint-and-what-each-mode-can-and-cannot-say): headless versus `--window`, the occlusion check, `--tour`, and the `patched/s`, `full/s` and `why` columns that say whether a loop's ticks were patched (`all draw ms` is the draw time to compare across pins that patch differently); the gpuix-side findings are in [the footprint round](gpuix/gaps-and-divergence-rounds.md#footprint-round-on-poc-83bab5a7-2026-10-21-repros-r13-to-r16) and what `f993d9b9` closed in [Round 14b](gpuix/gaps-and-divergence-rounds.md#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22) |
| Change how the compiled binary is built (bunfig autoload, the native addon plugin, shipped image sizes) | [Port decisions, the compiled binary](decisions/port-decisions.md#the-compiled-binary-choices-that-only-show-up-outside-bun-srcmaintsx) |
| Check whether a behaviour (popup focus, motion, scope) is settled before changing it | [User decisions of 2026-10-16](decisions/user-decisions-2026-10-16.md) |
| Know why a motion is a transform, a `layout` glide or a recorded approximation (queued-to-sent morph, bento re-slot, popup `var()` entrance), and which traps a transform brings (fluid-hover rect space, `layout` measured at a commit, `popLayout` pins, one test renderer per thread) | [Transforms, layout glides and filter](gpuix/transforms-and-layout-adoption.md) |
| Check that input still reaches an idle window (the Command Menu lag, gpuix #77) | `bun scripts/check-idle-input.tsx`, headless on the test renderer's `postNativeEvent` and `setFrameWakeCallback`; the owner also confirmed the fix with real input on 2026-10-24: [Round 14c](gpuix/gaps-and-divergence-rounds.md#round-14c-input-to-an-idle-window-wakes-the-frame-loop-on-poc-6f2a72d3-2026-10-23) |
| Work around a gpuix limitation, or report one to the fork | [gpuix gaps and divergence rounds](gpuix/gaps-and-divergence-rounds.md), then the README gap rows |
| Migrate to a newer gpuix `poc` | [Transforms, layout glides and filter, `667084d0` to `5f7a9af9`](gpuix/transforms-and-layout-adoption.md) for the latest, then [gpuix gaps and divergence rounds, Round 18 on `a92b4f7f`](gpuix/gaps-and-divergence-rounds.md#round-18-animations-in-skipped-content-sleep-and-culling-moves-to-content-visibility-on-poc-a92b4f7f-2026-10-24) then [Round 15c on `f6f09d95`](gpuix/gaps-and-divergence-rounds.md#round-15c-scale-1-test-windows-half-up-glyph-origins-and-os2-cap-heights-on-poc-f6f09d95-2026-10-23), [Round 15a on `8352e66c`](gpuix/gaps-and-divergence-rounds.md#round-15a-atomic-inline-origin-and-forced-layout-on-poc-8352e66c-2026-10-22), [Round 13b on `511bebab`](gpuix/gaps-and-divergence-rounds.md#round-13b-adoption-on-poc-511bebab-2026-10-22), [Round 14b on `f993d9b9`](gpuix/gaps-and-divergence-rounds.md#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22), [Round 13a on `f7b62f11`](gpuix/gaps-and-divergence-rounds.md#round-13a-font-smoothing-scrolltop-setter-and-exact-scroll-end-on-poc-f7b62f11-2026-10-21), [Round 12 on `196d69ce`](gpuix/gaps-and-divergence-rounds.md#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21), the [`83bab5a7` adoption](gpuix/gaps-and-divergence-rounds.md#authored-lengths-and-playback-controls-on-poc-83bab5a7-2026-10-21), the [`b03d4e27` adoption](gpuix/gaps-and-divergence-rounds.md#fractional-rects-adoption-on-poc-b03d4e27-2026-10-21), the [native-animation round](gpuix/gaps-and-divergence-rounds.md#native-animation-round-on-poc-5fda771a-2026-10-19), the [Round 6 pass](gpuix/gaps-and-divergence-rounds.md#round-6-adoption-pass-2026-10-18) and the [2026-10-17 pass](gpuix/gaps-and-divergence-rounds.md#adoption-pass-2026-10-17): how they went and their pitfalls |
| Change keyboard, selection, focus or ARIA behaviour | [Base UI extraction](history/base-ui-extraction.md), then `../base-ui-solid-gpuix` and its `BASE-UI-AUDIT.md` |
| Record where the port differs from the source | [`drift/_TEMPLATE.md`](../drift/_TEMPLATE.md); the convention's reasons are in [Port decisions](decisions/port-decisions.md#drift-and-its-cause-values). `bun scripts/drift-counts.ts` prints the README count table |
| Find what is still open before publishing | [Base UI extraction, Open follow-ups](history/base-ui-extraction.md#open-follow-ups) |

Two traps worth knowing before anything else: run `pnpm install` only from this repository's root (a second
`@ghia/solid` breaks the app silently), and do not trust screenshot hashes (playgrounds use `Math.random`).
