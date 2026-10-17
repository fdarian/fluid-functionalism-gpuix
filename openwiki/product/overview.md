---
type: product overview
title: Project overview
description: What fluid-functionalism-gpuix is (the fluidfunctionalism.com component library and site ported to Solid on the gpuix GPUI renderer), the question it answers, its upstream and licence, the mixed upstream pin, the sibling repositories it depends on, and a short dated history.
tags: [overview, product, upstream, gpuix]
sources:
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-17T05:21:14.095Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T05:21:14.095Z
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
with a cause (588 at the 2026-10-17 recount, printed by `scripts/drift-counts.ts`), so the repository doubles as a catalogue of what gpuix can and cannot do against a real, demanding
design system. That catalogue fed the gpuix fork's work directly
(see [gpuix gaps and divergence rounds](../gpuix/gaps-and-divergence-rounds.md)).

It is a port, not a fork: the upstream is React and DOM, every file is rewritten, and staying current means reading
upstream diffs and porting them by hand. Local only; it is not published (one blocker: the Untitled UI icon licence,
see [Base UI extraction](../history/base-ui-extraction.md#open-follow-ups)).

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
  exist only there.
- **`~/code/fdarian/base-ui-solid-gpuix`**: headless Solid ports of the Base UI primitives (keys, selection, open
  state, focus, ARIA), split out of this repository on 2026-10-17.

All three must resolve to one `solid-js` and one `@gpuix/solid`; see
[Port decisions, pnpm wiring](../decisions/port-decisions.md#pnpm-wiring-one-solid-js-one-gpuixsolid).

## History in brief

| Date | Milestone |
|---|---|
| 2026-10-12 | Button, Combobox and Sidebar with fluid hover (`889d6eb`) |
| 2026-10-13 | Native springs in the fork; dark scheme and theme switcher; every component ported in a six-way fan-out; shared logic extracted into `src/lib/` |
| 2026-10-14/15 | Static Inter, System theme, browser-style window frame, Base UI audit; migration to gpuix's DOM-parity release |
| 2026-10-16 | Drift audit by cause; the owner's [four decisions](../decisions/user-decisions-2026-10-16.md); rest of the site ported; gpuix Round 4 adopted |
| 2026-10-17 | History extracted into this repository; Base UI primitives moved to base-ui-solid-gpuix ([details](../history/base-ui-extraction.md)); gpuix Round 5 and the gap pass adopted at `poc` `dcfc7a0e` ([details](../gpuix/gaps-and-divergence-rounds.md#adoption-pass-2026-10-17)) |
