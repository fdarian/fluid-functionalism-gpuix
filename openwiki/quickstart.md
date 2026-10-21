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
  - id: openwiki-source-edfff899d93ec8844d1b24df
    resource: repo://scripts/perf-page-switch.tsx
  - id: openwiki-source-923ee25729d055f35a254df3
    resource: repo://src/components/command-menu.tsx
generated: { by: "claude-code", at: "2026-10-21T15:03:49.932Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-21T15:03:49.932Z
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
| Know why off-screen culling stays, why fluid hover reads its container's rect on every pick (the box cache was dropped) and rounds row rects to integers (the source's `offset*`; no longer a workaround), and why the two `StableLabel` ghosts stay although they now cost nothing measurable | [Port decisions, Performance decisions](decisions/port-decisions.md#performance-decisions-on-gpuix-poc-b03d4e27), [StableLabel's second ghost](decisions/port-decisions.md#stablelabels-second-ghost-what-it-cost-and-what-did-not-help) |
| Add an animation or loop (spinner, shimmer, autoplay, scripted cursor) and keep it off the JS frame clock | [Port decisions, native animation](decisions/port-decisions.md#js-frame-clock-loops-moved-to-gpuix-native-animation); `animate()` returns `pause()`/`play()` controls since `83bab5a7` (plain-vs-fluid uses them), and a looping native animation costs the whole page per tick unless gpuix patches it (since `196d69ce`, paint-only loops only, and not beside an input or under a positioned or translucent ancestor: [Round 12](gpuix/gaps-and-divergence-rounds.md#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21)) |
| Write a scroller's offset (a list that follows a spring, a page switch), or measure a sidebar-click hitch with `scripts/perf-page-switch.tsx` | [Port decisions, scroll writes and page switches](decisions/port-decisions.md#scroll-writes-go-through-rendererscrollto-and-a-page-switch-is-measured-by-its-first-draw): `renderer.scrollTo`, never the `scrollTop` setter, under a running motion value |
| Measure idle CPU or memory of a page or a whole session (`pnpm footprint`), or read a footprint figure | [Port decisions, measuring idle CPU and memory](decisions/port-decisions.md#measuring-idle-cpu-and-memory-pnpm-footprint-and-what-each-mode-can-and-cannot-say): headless versus `--window`, the key-window frame cap, `--tour`, and the `patched/s`, `full/s` and `why` columns that say whether a loop's ticks were patched; the gpuix-side floors are in [the footprint round](gpuix/gaps-and-divergence-rounds.md#footprint-round-on-poc-83bab5a7-2026-10-21-repros-r13-to-r16) |
| Change how the compiled binary is built (bunfig autoload, the native addon plugin, shipped image sizes) | [Port decisions, the compiled binary](decisions/port-decisions.md#the-compiled-binary-choices-that-only-show-up-outside-bun-srcmaintsx) |
| Check whether a behaviour (popup focus, motion, scope) is settled before changing it | [User decisions of 2026-10-16](decisions/user-decisions-2026-10-16.md) |
| Work around a gpuix limitation, or report one to the fork | [gpuix gaps and divergence rounds](gpuix/gaps-and-divergence-rounds.md), then the README gap rows |
| Migrate to a newer gpuix `poc` | [gpuix gaps and divergence rounds, Round 12 on `196d69ce`](gpuix/gaps-and-divergence-rounds.md#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21) for the latest, the [`83bab5a7` adoption](gpuix/gaps-and-divergence-rounds.md#authored-lengths-and-playback-controls-on-poc-83bab5a7-2026-10-21), the [`b03d4e27` adoption](gpuix/gaps-and-divergence-rounds.md#fractional-rects-adoption-on-poc-b03d4e27-2026-10-21), the [native-animation round](gpuix/gaps-and-divergence-rounds.md#native-animation-round-on-poc-5fda771a-2026-10-19), the [Round 6 pass](gpuix/gaps-and-divergence-rounds.md#round-6-adoption-pass-2026-10-18) and the [2026-10-17 pass](gpuix/gaps-and-divergence-rounds.md#adoption-pass-2026-10-17): how they went and their pitfalls |
| Change keyboard, selection, focus or ARIA behaviour | [Base UI extraction](history/base-ui-extraction.md), then `../base-ui-solid-gpuix` and its `BASE-UI-AUDIT.md` |
| Record where the port differs from the source | [`drift/_TEMPLATE.md`](../drift/_TEMPLATE.md); the convention's reasons are in [Port decisions](decisions/port-decisions.md#drift-and-its-cause-values). `bun scripts/drift-counts.ts` prints the README count table |
| Find what is still open before publishing | [Base UI extraction, Open follow-ups](history/base-ui-extraction.md#open-follow-ups) |

Two traps worth knowing before anything else: run `pnpm install` only from this repository's root (a second
`@gpuix/solid` breaks the app silently), and do not trust screenshot hashes (playgrounds use `Math.random`).
