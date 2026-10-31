---
type: decision record
title: User decisions of 2026-10-16
description: The four product decisions the project owner made on 2026-10-16 after the first full drift audit (Base UI popup focus model, source-matching motion, adopting newly possible gpuix features, porting everything not ported) and the merges that carried them out.
tags: [decisions, product, focus, motion, scope]
sources:
  - id: openwiki-source-5ebe82cc5f9e383e14411602
    resource: repo://src/app.tsx
  - id: openwiki-source-923ee25729d055f35a254df3
    resource: repo://src/components/command-menu.tsx
  - id: openwiki-source-8cffcceccd160fa6e065925b
    resource: repo://src/components/dropdown-search.tsx
  - id: openwiki-source-b2339f18f5ebd00b96967bf6
    resource: repo://src/components/queued-stack.tsx
  - id: openwiki-source-5d68d99ffd3483c46c7aaac8
    resource: repo://src/components/select.tsx
  - id: openwiki-source-63a83316feacc83e2a230285
    resource: repo://src/components/slider.tsx
  - id: openwiki-source-26d9c038c2027980be5931cf
    resource: repo://src/components/tabs-subtle.tsx
  - id: openwiki-source-a6e7d28cb827574c90025f7b
    resource: repo://src/home/bento-grid.tsx
  - id: openwiki-source-b4238869522a9de0f81c49d7
    resource: repo://src/lib/fluid-highlight.tsx
  - id: openwiki-source-ff84ac67d7a6ebc693884d4f
    resource: repo://src/lib/popup.tsx
  - id: openwiki-source-1a25dd521e50a4d59274e1c2
    resource: repo://src/lib/theme.ts
  - id: openwiki-source-49cf2fce7c8c4bae61263360
    resource: repo://src/pages/audio-mixer.tsx
  - id: openwiki-source-f8fd84e93d4dd9789aeddba9
    resource: repo://src/pages/compare.tsx
generated: { by: "claude-code", at: "2026-10-31T01:58:44.003Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-31T01:58:44.003Z
---

# User decisions of 2026-10-16

On 2026-10-16 the drift audit (`limitations/` renamed to `drift/`, merged in `037f742`) listed every difference from
the source by cause. Several entries were deliberate shortcuts the port had taken, so the owner was asked to rule
on them. These four decisions are settled: don't reopen them without new evidence, and treat a drift entry that
contradicts one as a bug, not a "port choice".

## 1. Popup focus model matches Base UI

Before this, popups kept keyboard focus on the trigger (or the field) and drove the highlight from there, which was
simpler on gpuix at the time. Decision: **match Base UI, so focus moves into the popup** (Select, Dropdown, the
colour picker's format menu, the dropdown's search list and inline panel). The Combobox was checked against Base UI
and correctly keeps focus in its input; a row press keeps it there.

Carried out on the focus+motion branch, merged in `bd81bac` (per-component merges `1e7d639` Select, `57b5acf`
Dropdown, `7cc383c` colour picker, `0fb9f43` Combobox). Row-level consequence: Select rows set `tabIndex` explicitly
rather than through a prop spread, because a spread applies late and the row would not yet be focusable when the
open moves focus into it.

## 2. Motion matches the source

The port had added or dropped motion where gpuix made the source's version awkward. Decision: **match the source**:

- the command menu's scroll rides the same 80 ms spring as its highlight fill, so row and fill arrive together;
- no 448 ms snap window on the accordion or sidebar (the port had invented one);
- no snap while filtering (the highlight follows the source's behaviour);
- tabs-subtle's pill width and margin spring (`spring.fast`), as in the source.

Merged with the focus model in `bd81bac` (and `ac3162b` for accordion, sidebar and tabs motion).

## 3. Adopt newly possible gpuix features

As the gpuix fork closed gaps, workarounds in the port became unnecessary. Decision: **adopt what gpuix can now
do, and fix comments that still describe the old limitation**. The list at the time: multi-layer and inset
shadows (the source's `shadow-surface-N` recipes as one `boxShadow`), `colorFade` (Tailwind's `transition-colors` as a
real CSS transition), reduced motion (`<MotionConfig reducedMotion="user">` plus `createReducedMotion()` where the
source reads it), `tabular-nums`, `navigator.clipboard`, `position: sticky` and `zIndex`.

Carried out together with the gpuix Round 4 migration, merged in `bcf7479`. The rounds themselves are on
[gpuix gaps and divergence rounds](../gpuix/gaps-and-divergence-rounds.md). This decision is standing: each later
gpuix round produces a new adoption pass, and the Round 5 / gap-pass adoption on 2026-10-17 was the second one, and the move to `poc` `20a0c327` (real
`display: table`, `inline-*`, container queries, `fit-content`, group hover states) the third. The home grid's
columns now come from a container query rather than a media query; see
[the table and container pass](../gpuix/gaps-and-divergence-rounds.md#table-and-container-pass-2026-10-17).

The largest later pass applied this decision together with decision 2 on 2026-10-30 and 31, when gpuix gained
transforms, layout and shared-layout glides and animated `filter`: box-property stand-ins (chevrons, popup entrances,
the fluid highlight, switch and slider thumbs, spinners, the scripted cursors) became the source's own transforms and
the queued-to-sent and bento re-slot morphs were ported. See
[Transforms, layout glides and filter](../gpuix/transforms-and-layout-adoption.md); what stayed an approximation (size
morphs, `var()` in a Motion key) is recorded there and in the README gap rows, not papered over.

## 4. Port everything not ported

Until then the port covered the components and a showcase. Decision: **port the rest of the site**: the home
bento grid, the System pages (motion, scrollbars, sizes, skill, surfaces, typography, fluid hover), `/compare`,
`/concepts`, Audio Mixer, the ⌘K menu's Recent and Actions groups, the "Make them yours" customise rows (Radius,
Size, Icons), and the doc-page Playgrounds. Merged in `3eb2d74`. The Changelog page and the release-driven New dots
followed later at the newer upstream pin (see [UPSTREAM.md](../../UPSTREAM.md)).

What remains is the `not ported yet` column of the drift table in [README.md](../../README.md#drift-from-the-source);
those entries are in scope by this decision, not optional.
