---
type: history and decision record
title: Base UI extraction (2026-10-17) and open follow-ups
description: Why the Base UI behaviour primitives moved out of this repository into the sibling base-ui-solid-gpuix on 2026-10-17, the design decisions behind the headless primitives and how this app consumes them, how history was carried over, and the follow-ups left open.
tags: [base-ui, extraction, architecture, history, follow-ups]
sources:
  - id: openwiki-source-385da475ebb9649b27cbd9e7
    resource: repo://drift/site.md
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-5d68d99ffd3483c46c7aaac8
    resource: repo://src/components/select.tsx
  - id: openwiki-source-fe336569c2b23003ea632174
    resource: repo://src/lib/icons.ts
  - id: openwiki-source-2aee0d3ec729fdf1999ccc89
    resource: repo://THIRD_PARTY_NOTICES.md
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
  - id: openwiki-source-ff18555ad70362de0f452788
    resource: repo://UPSTREAM.md
generated: { by: "claude-code", at: "2026-10-21T02:32:37.460Z" }
verified:
  - by: openwiki/0.7.2
    at: 2026-10-21T06:46:50.862Z
---

# Base UI extraction (2026-10-17) and open follow-ups

## What moved and why

Until 2026-10-16 every component carried its own keyboard, selection, open-state, focus and ARIA logic, ported from
`@base-ui/react` 1.9.0 piece by piece and audited row by row against it. That logic is not specific to Fluid
Functionalism: any Solid-on-gpuix app needs the same Select or Menu behaviour. On 2026-10-17 the project was split
into two local repositories (never pushed, no remotes):

- **this repository**, the Fluid Functionalism port: styling, tokens, springs, popup chrome, focus ring, fluid
  hover, the site's pages;
- **`~/code/fdarian/base-ui-solid-gpuix`**, headless Solid ports of the Base UI primitives the port uses, plus the
  Base UI audit (`BASE-UI-AUDIT.md` in that repository), synced with Base UI through its own
  `UPSTREAM.md`.

The day-to-day rule that follows ("behaviour goes into the primitive, looks stay here") is in
[README.md, Adding a component](../../README.md#adding-a-component) and `AGENTS.md`.

## How the history was carried

This repository's history was extracted from the earlier monorepo with `git-filter-repo --subdirectory-filter`:
440 commits including 12 merges, with authors and dates kept and the tree identical to the source at the cut. The
first commit is `889d6eb` (2026-10-12). base-ui-solid-gpuix took 61 history commits by filtering the seven
`src/lib` files that became its foundation (presence, typeahead, list navigation, pointer capture, popup trigger,
modal marking, form value, and the placement half of the popup) plus the audit. At the owner's request neither
repository names the project's earlier home, in files, commit messages or provenance; keep it that way in new
commits and docs, and refer to past work by date and commit.

The work ran in phases: A, the foundation and the pnpm wiring; B, five component groups in parallel worktrees
(overlays, menus, controls, disclosure, listbox; merged here as `92cf341`, `88f391f`, `59564d4`, `0135d82`,
`a2bed08`); B2, consolidating shared helpers in base-ui; then docs, with every drift `file:line` ref re-verified
(`94e4a67` and the "port refs follow the code" commits). Behaviour was not allowed to change: every check-*
scenario and the screenshots had to pass after each slice.

## Design decisions

- **Headless `create*` functions, not components.** Each primitive is a Solid function (`createSelectRoot`,
  `createMenuList`, ...) returning state accessors and prop objects to spread on gpuix elements. No styling, no
  tokens, no animation; timings such as the popup exit duration are passed in as options, because they are this
  site's look, not Base UI's behaviour. A thin unstyled wrapper is allowed only where a gpuix component (the
  dismiss layer, `Dialog`, `<anchored>`) is required.
- **Folder layout mirrors Base UI's** (`src/select/root/use-select-root.ts` for `select/root/useSelectRoot.ts`), so
  an upstream diff maps file to file. Package `exports` maps `./*` to `./src/*/index.ts`, so a new primitive touches
  no shared file. Only parts this port uses are ported.
- **The highlight is controllable.** Primitives with a highlighted index own it by default but accept
  `highlightedIndex` and `onHighlightChange(index, reason)`, Base UI's controlled pattern. This port passes fluid
  hover's `activeIndex` in, so one highlight serves pointer and keyboard; on a keyboard reason it calls
  `hover.releasePointer()`. Picking the nearest row in a gap stays in this repository's fluid hover, since Base UI
  has no such behaviour.
- **Refs are returned as functions.** A `ref` inside a JSX spread applies in an effect after the element is created,
  which is too late for primitives that read the element as the popup mounts. So the prop objects carry no refs;
  consumers pass `ref={...}` on the element.
- **Select rows set props one by one.** The same lateness hit `tabIndex`: spread, it arrived after the open had
  already called `focus()` on the row, so the row was not yet focusable. Select's rows assign each prop explicitly.
- **The site's own components stay here** (command-menu, sidebar, nav-item and nav-menu, input-message,
  ask-user-questions, queued-stack, carousel-dots, colour-picker internals, cards). They import base-ui's list
  navigation, presence and pointer capture where the behaviour matches.
- **One runtime instance across both repositories**, which drove the pnpm wiring and the single-instance guard
  described in [Port decisions](../decisions/port-decisions.md#pnpm-wiring-one-solid-js-one-gpuixsolid).
- **base-ui uses relative imports**, not `#/`: its source is compiled under this repository's tsconfig, where `#/`
  points into this app.

## Open follow-ups

- **Untitled UI icons: resolved on 2026-10-21 by dropping the set.** The package declares MIT but its licence
  forbids distributing the icons, and the repository is public. The glyph data and the Icons option are gone; the
  Icons row offers four libraries and the port keeps its Lucide default (the source defaults to Untitled UI). The
  drop is a `port choice` entry in `drift/site.md`.
- **The source's sample photo is gone too.** `micka.png` was MIT as a file, not as a likeness (the earlier
  note on this follow-up); the owner chose not to ship it and uses `assets/chat-ai/avatar.jpg`, whose origin the
  notices do not record. The pages that show it each
  carry a "Sample photo" drift entry; see [THIRD_PARTY_NOTICES.md](../../THIRD_PARTY_NOTICES.md).
- **`noUncheckedIndexedAccess` is off** (244 errors when on, measured 2026-10-17). Turn it back on and fix the
  errors now that the extraction has settled the code.
- **FORK.md and gap-row staleness: resolved** by the gpuix adoption pass later the same day. About 130 line cites
  into the fork were re-pointed to `poc` `dcfc7a0e`, the closed gap rows and drift entries were rewritten or
  deleted, and base-ui's audit refs followed. See [gpuix gaps and divergence
  rounds](../gpuix/gaps-and-divergence-rounds.md#adoption-pass-2026-10-17). Line cites rot whenever the fork's
  `FORK.md` reflows, so expect a re-point after each fork rebase.
- Minor: twelve Biome warnings (such as `useOptionalChain`) left unfixed; `scripts/check-command-menu.tsx`
  deep-imports `@ghia/solid/dist/host.js` because the package exports no path for it; `clamp` is duplicated between
  this repository's scroll area and base-ui's scroll maths.
