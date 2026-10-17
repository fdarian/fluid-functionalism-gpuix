---
type: quickstart
title: Quickstart
description: Task routing for the Fluid Functionalism port to gpuix; which wiki page or repository document answers each kind of question.
tags: [quickstart, routing]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:20.113Z
sources:
  - id: openwiki-source-8037e2358a2c4f9b2c722a11
    resource: repo://AGENTS.md
generated: { by: "claude-code", at: "2026-10-17T00:13:20.113Z" }
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
| Check whether a behaviour (popup focus, motion, scope) is settled before changing it | [User decisions of 2026-10-16](decisions/user-decisions-2026-10-16.md) |
| Work around a gpuix limitation, or report one to the fork | [gpuix gaps and divergence rounds](gpuix/gaps-and-divergence-rounds.md), then the README gap rows |
| Migrate to a newer gpuix `poc` | [gpuix gaps and divergence rounds, Pending](gpuix/gaps-and-divergence-rounds.md#pending-the-round-5--gap-pass-adoption) |
<!-- openwiki: broken internal link [../../base-ui-solid-gpuix/BASE-UI-AUDIT.md] file "../../base-ui-solid-gpuix/BASE-UI-AUDIT.md" does not exist. Fix the href or restore the target, then delete this comment. -->
| Change keyboard, selection, focus or ARIA behaviour | [Base UI extraction](history/base-ui-extraction.md), then `../base-ui-solid-gpuix` and its [BASE-UI-AUDIT.md](../../base-ui-solid-gpuix/BASE-UI-AUDIT.md) |
| Record where the port differs from the source | [`drift/_TEMPLATE.md`](../drift/_TEMPLATE.md); the convention's reasons are in [Port decisions](decisions/port-decisions.md#drift-and-its-cause-values) |
| Find what is still open before publishing | [Base UI extraction, Open follow-ups](history/base-ui-extraction.md#open-follow-ups) |

Two traps worth knowing before anything else: run `pnpm install` only from this repository's root (a second
`@gpuix/solid` breaks the app silently), and do not trust screenshot hashes (playgrounds use `Math.random`).
