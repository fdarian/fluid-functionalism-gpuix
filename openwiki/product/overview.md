---
type: product overview
title: Project overview
description: What fluid-functionalism-gpuix is (the fluidfunctionalism.com component library and site ported to Solid on the gpuix GPUI renderer), the question it answers, its upstream and licence, the mixed upstream pin, the sibling repositories it depends on, and a short dated history.
tags: [overview, product, upstream, gpuix]
sources:
  - id: openwiki-source-52df002f39d8608aefccfdde
    resource: repo://drift/home.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-2aee0d3ec729fdf1999ccc89
    resource: repo://THIRD_PARTY_NOTICES.md
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-23T19:28:25.041Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-23T19:28:25.041Z
---

# Project overview

## What it is

A port of **[Fluid Functionalism](https://fluidfunctionalism.com)** (source
[github.com/mickadesign/fluid-functionalism](https://github.com/mickadesign/fluid-functionalism), MIT, by Micka
Touillaud), a React and Tailwind component library known for its "fluid hover" (one highlight that glides between
rows), springs and careful keyboard behaviour, to **gpuix**: a Solid renderer on Zed's GPUI, with no DOM and no CSS
engine. The app is a desktop window that reproduces the library's site: every component with its demo page, the
home bento grid, the docs and System pages, Compare, Concepts, Audio Mixer, Changelog and the ⌘K site menu.

It started on 2026-10-12 as an experiment answering one question: **can gpuix draw this library faithfully?** The
answer is yes, with recorded differences. Every difference from the source is an entry in `drift/`
with a cause (539 on 2026-10-23 after Round 15c on gpuix `f6f09d95` closed the half-pixel glyph-origin and tabs-subtle cap-box entries; 541 on 2026-10-22 after the bento Sidebar sample person was renamed "Com Truise" (a port-choice entry); 540 after Round 15a on gpuix `8352e66c` added the half-pixel glyph-origin entry; 539 earlier that day, after the table's border-color fade entry closed on gpuix `511bebab`; 540 after the font-smoothing entry closed on `f7b62f11`; it had been 541 since the Untitled UI drop and the sample-photo replacement added a few; 532 right after the `b03d4e27` adoption, 538 after the 2026-10-19 native-animation round, down from 577 once variable fonts and the round 6 features closed their entries; printed by `scripts/drift-counts.ts`), so the repository doubles as a catalogue of what gpuix can and cannot do against a real, demanding
design system. That catalogue fed the gpuix fork's work directly
(see [gpuix gaps and divergence rounds](../gpuix/gaps-and-divergence-rounds.md)).

It is a port, not a fork: the upstream is React and DOM, every file is rewritten, and staying current means reading
upstream diffs and porting them by hand. The GitHub repository is public. What its licences allowed was settled by
dropping assets rather than documenting caveats: the Untitled UI icon set and the source's sample photo are gone (see
[Base UI extraction](../history/base-ui-extraction.md#open-follow-ups)).

## Where to read what

| Question | Read |
|---|---|
| How to run it, add a component, the gpuix gaps, the drift counts | [README.md](../../README.md) |
| Which upstream commit each file tracks, and how to sync | [UPSTREAM.md](../../UPSTREAM.md) |
| Where a component or page differs from the source, and why | `drift/<name>.md` |
| Where a behaviour primitive differs from Base UI | `BASE-UI-AUDIT.md` in the sibling repository `../base-ui-solid-gpuix` |
| Rules for working in the repository | [AGENTS.md](../../AGENTS.md) |
| Why it is built this way | [Port decisions](../decisions/port-decisions.md), [User decisions of 2026-10-16](../decisions/user-decisions-2026-10-16.md) |

## The upstream pin is mixed

Most files track upstream `0a0377e` (2026-10-11, "Merge PR #69"). The site nav and the Changelog page track
`d5c3606` (2026-10-14), because the Changelog and the release-driven New dots did not exist at `0a0377e` and the live
site was the only place to see them. Which files are at which pin, and how to catch the rest up, is in
[UPSTREAM.md](../../UPSTREAM.md). A reference clone of the source lives outside the repository at
`~/.claude/notes/ff-source/`.

## Three repositories, one runtime

- **This repository**: looks, motion, fluid hover, pages.
- **`~/code/fdarian/gpuix`**, branch `poc`: the owner's fork of [remorses/gpuix](https://github.com/remorses/gpuix),
  which follows DOM/CSS semantics wherever upstream gpuix did not. Its `README.md` and `FORK.md` are the gpuix
  reference. The port needs the fork, not upstream gpuix: native springs, the DOM event model and many fixes
  exist only there. The README names the minimum fork commit (`f6f09d95` as of 2026-10-23); read it there, not here.
- **`~/code/fdarian/base-ui-solid-gpuix`**: headless Solid ports of the Base UI primitives (keys, selection, open
  state, focus, ARIA), split out of this repository on 2026-10-17.

All three must resolve to one `solid-js` and one `@gpuix/solid`; see
[Port decisions, pnpm wiring](../decisions/port-decisions.md#pnpm-wiring-one-solid-js-one-gpuixsolid).

## History in brief

| Date | Milestone |
|---|---|
| 2026-10-12 | Button, Combobox and Sidebar with fluid hover (`889d6eb`) |
| 2026-10-13 | Native springs in the fork; dark scheme and theme switcher; every component ported in a six-way fan-out; shared logic extracted into `src/lib/` |
| 2026-10-14/15 | Static Inter (replaced by the variable files on 2026-10-18), System theme, browser-style window frame, Base UI audit; migration to gpuix's DOM-parity release |
| 2026-10-16 | Drift audit by cause; the owner's [four decisions](../decisions/user-decisions-2026-10-16.md); rest of the site ported; gpuix Round 4 adopted |
| 2026-10-17 | History extracted into this repository; Base UI primitives moved to base-ui-solid-gpuix ([details](../history/base-ui-extraction.md)); gpuix Round 5, the gap pass, then real tables, `inline-*` and container queries adopted, ending at `poc` `20a0c327` ([details](../gpuix/gaps-and-divergence-rounds.md#adoption-pass-2026-10-17)) |
| 2026-10-18 | gpuix round 6 adopted: outline styles, Inter 4.0 variable with the source's weight tokens and easing, `textWrap`, underline offsets, cap-height `textBox` trim, `calc()` slider layers, hairline borders ([details](../gpuix/gaps-and-divergence-rounds.md#round-6-adoption-pass-2026-10-18)) |
| 2026-10-19 | Pinned to gpuix `poc` `e5231304`; perf follow-up: culling and the cached fluid-hover box kept on measurement (the cache was dropped on 2026-10-21), the changelog's `width: 100%` wrappers removed ([details](../gpuix/gaps-and-divergence-rounds.md#perf-follow-up-on-poc-365f7c88-and-e5231304-2026-10-19)) |
| 2026-10-19 | Pinned to gpuix `poc` `5fda771a`; JS frame-clock loops (spinner, thinking indicator, carousel fill, scripted cursors) moved to native animation, `StableLabel` back to two ghosts, `check:scenarios` lists all failures ([details](../gpuix/gaps-and-divergence-rounds.md#native-animation-round-on-poc-5fda771a-2026-10-19)) |
| 2026-10-21 | Pinned to gpuix `poc` `b03d4e27`: fractional rects, fluid-hover rects rounded like the source's `offset*` reads and no container-box cache, culling kept on a re-run, the second `StableLabel` ghost within noise, native SVG stroke draws for the button spinner, menu-item check and input-copy; drift 538 to 532 ([details](../gpuix/gaps-and-divergence-rounds.md#fractional-rects-adoption-on-poc-b03d4e27-2026-10-21)) |
| 2026-10-21 | Pinned to gpuix `poc` `83bab5a7`: authored lengths keep their fraction (the rounding gap row closed), `animate()` on a motion value returns playback controls so plain-vs-fluid is one paused-and-played animation again, `finished` resolves only on finish, tabs-subtle's unfolding label back on the source's strut block; drift stays at 541 ([details](../gpuix/gaps-and-divergence-rounds.md#authored-lengths-and-playback-controls-on-poc-83bab5a7-2026-10-21)) |
| 2026-10-21 | Pinned to gpuix `poc` `196d69ce` (Round 12): paint-only loop ticks are patched instead of drawn whole unless an input, a positioned or translucent ancestor, or a motion value gets in the way; ThinkingIndicator's words stack in one grid cell and thinking-steps lost an anchorless `position: relative` so their shimmers patch; `pnpm footprint` gained `patched/s`, `full/s` and `why`; culling kept on a headless re-run; two new README gap rows for the inputs and positioned-ancestor blockers ([details](../gpuix/gaps-and-divergence-rounds.md#round-12-paint-only-patch-ticks-on-poc-196d69ce-2026-10-21)) |
| 2026-10-21 | Adopted gpuix `poc` `f7b62f11` (Round 13a; the README named `f6997028` after it): `WebkitFontSmoothing: 'antialiased'` on the root closes the heavier-text gap, the `scrollTop` setter lays out only what is pending so the `renderer.scrollTo` workaround is reverted, and the scroll end is exact so the release spy's slack is gone; ThinkingSteps, Quill and Beacon rows match the source's heights; the window opens on the first non-primary display (`FF_DISPLAY`); drift 541 to 540 ([details](../gpuix/gaps-and-divergence-rounds.md#round-13a-font-smoothing-scrolltop-setter-and-exact-scroll-end-on-poc-f7b62f11-2026-10-21)) |
| 2026-10-22 | Pinned to gpuix `poc` `f993d9b9` (Round 14b): an idle window no longer wakes JS every vsync and an unfocused visible window draws at the display rate, so the README's idle-floor row is gone and `pnpm footprint` no longer samples the key window; the memory row now holds headless figures only ([details](../gpuix/gaps-and-divergence-rounds.md#round-14b-idle-window-and-unfocused-window-pacing-on-poc-f993d9b9-2026-10-22)) |
| 2026-10-22 | Pinned to gpuix `poc` `511bebab` (Round 13b): a `border-color` transition on a collapsed-table part costs no layout, so the table rows fade their rules again and `check-table` asserts zero layout work plus a drawn fade; the page-switch row is re-measured on gpuix's shape store; `contentVisibility` is evaluated and does not replace `createCulling`; drift 540 to 539 ([details](../gpuix/gaps-and-divergence-rounds.md#round-13b-adoption-on-poc-511bebab-2026-10-22)) |
| 2026-10-22 | Pinned to gpuix `poc` `8352e66c` (Round 15a): an atomic inline keeps its fractional origin, so tabs-subtle's unfolded label baseline and Beacon's Priority pills match Chrome exactly; a forced layout no longer delivers `onLayout` / `ResizeObserver`; measured heights round like `offsetHeight` through `toOffsetPx`; a new gap, glyphs at a half-pixel origin paint 1px above Chrome; drift 539 to 540 ([details](../gpuix/gaps-and-divergence-rounds.md#round-15a-atomic-inline-origin-and-forced-layout-on-poc-8352e66c-2026-10-22)) |
| 2026-10-22 | Command Menu demo drops the three cards the source page has no section for (Tabs and filters, Compact, the footer's custom-hints panel); the bento Sidebar preview's sample person is renamed "Com Truise" to go with the replacement photo; drift 540 to 541 ([`drift/home.md`](../../drift/home.md), [`drift/command-menu.md`](../../drift/command-menu.md)) |
| 2026-10-23 | Pinned to gpuix `poc` `e591681e` (Round 16): a forced bounds read after a layout write costs one pass (about 2.9 ms on the Command Menu page) and none after a paint-only write; an observer-toggled `contentVisibility: 'hidden'` was A/B-tested against `createCulling` and lost, so culling stays; `check-command-menu` prints the forced-read probe and `check-site-nav` asserts a switch back to the Changelog lands at the top ([details](../gpuix/gaps-and-divergence-rounds.md#round-16-the-contentvisibility-ab-on-poc-e591681e-2026-10-23)) |
| 2026-10-23 | Pinned to gpuix `poc` `c6475390` (Round 14a): paint patching now reaches loops next to an input, under a positioned or translucent ancestor, on a motion value and in an `<svg>`, so the port deleted its off-screen `onScreen` gates and `Show` swaps on the button, file-thumbnail and thinking-indicator loops and ThinkingIndicator's conditional `position: relative` (no measurable cost); a loop that draws nothing still costs about 3.5% CPU in gpuix's dormant tick, and the word roll, fluid-hover cursor and carousel fill stay whole-frame layout loops ([details](../gpuix/gaps-and-divergence-rounds.md#round-14a-paint-patching-reaches-inputs-positioned-ancestors-and-motion-values-on-poc-c6475390-2026-10-23)) |
| 2026-10-23 | Pinned to gpuix `poc` `6f2a72d3` (Round 14c): input to an idle window wakes the frame loop, which fixes the lag after Cmd-K into the Command Menu once the page had stopped ticking (gpuix #77, answered by #93); no port change, and no headless regression check exists because the test renderer cannot post a native event ([details](../gpuix/gaps-and-divergence-rounds.md#round-14c-input-to-an-idle-window-wakes-the-frame-loop-on-poc-6f2a72d3-2026-10-23)) |
| 2026-10-23 | Pinned to gpuix `poc` `f6f09d95` (Round 15c): the test renderer defaults to scale 1 and offscreen windows keep their size, so `scripts/test-window.ts` is gone; glyph origins round half up and cap and x heights come from OS/2, so the half-pixel text entry in `drift/home.md` and the tabs-subtle cap-box entry are deleted (drift 541 to 539); the bento card pins `flexBasis: '0%'`, so FF no longer depends on gpuix #96; screenshots recaptured, 1 px label and row shifts on almost every page ([details](../gpuix/gaps-and-divergence-rounds.md#round-15c-scale-1-test-windows-half-up-glyph-origins-and-os2-cap-heights-on-poc-f6f09d95-2026-10-23)) |
