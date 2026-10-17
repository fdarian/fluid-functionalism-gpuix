---
type: decision record
title: Port decisions and their reasons
description: Why the Fluid Functionalism port to gpuix uses native springs, native hover states, a single fluid highlight, shadow-based press-shrink, static Inter, createAppearance theming, Bun.Glob demo discovery, the drift/ convention, the screenshot and check-* harness, and its pnpm, tsconfig and Biome settings.
tags: [decisions, gpuix, fluid-hover, motion, tooling, pnpm]
verified:
  - by: openwiki/0.7.2
    at: 2026-10-17T00:13:20.113Z
sources:
  - id: openwiki-source-da7929b6e2478aead956fb3c
    resource: repo://biome.jsonc
  - id: openwiki-source-9156c3fc43d32433db430838
    resource: repo://drift/_TEMPLATE.md
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-40275cb92c3610938f16ade3
    resource: repo://pnpm-workspace.yaml
  - id: openwiki-source-dcc18690931a266c3aa8c94d
    resource: repo://scripts/check-single-instance.ts
  - id: openwiki-source-5ebe82cc5f9e383e14411602
    resource: repo://src/app.tsx
  - id: openwiki-source-456bdd1fc2b44eea01d30954
    resource: repo://src/components/button.tsx
  - id: openwiki-source-d8bbfda4e9c9d1361b2fe340
    resource: repo://src/lib/demo.ts
  - id: openwiki-source-b4238869522a9de0f81c49d7
    resource: repo://src/lib/fluid-highlight.tsx
  - id: openwiki-source-ba98ccdc6cabbcd0f3dd70c6
    resource: repo://src/lib/fluid-hover.ts
  - id: openwiki-source-34e6a24572026b7c65be92ae
    resource: repo://src/lib/fonts.ts
  - id: openwiki-source-a69db96d312e49d2e9f03b5a
    resource: repo://src/lib/playground.tsx
  - id: openwiki-source-3b294898e2170781e8b07475
    resource: repo://src/lib/press.ts
  - id: openwiki-source-1a25dd521e50a4d59274e1c2
    resource: repo://src/lib/theme.ts
  - id: openwiki-source-98d5ddb014a0fd4d678f6f2a
    resource: repo://tsconfig.json
generated: { by: "claude-code", at: "2026-10-17T00:13:20.113Z" }
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
natively with no JS round trip. Signals (`onMouseEnter` / `onMouseLeave`) are used only where Tailwind's
`group-hover` makes a *child* react to its parent, which gpuix state styles cannot express.

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

When Base UI primitives later took over keyboard behaviour, fluid hover stayed the owner of the highlighted row:
the primitive's highlight is controlled from `hover.activeIndex`, and a keyboard move calls `releasePointer()` so
the scroll it causes does not re-pick a row under a stationary pointer. See
[Base UI extraction](../history/base-ui-extraction.md).

## Press-shrink through an inset box shadow

The source shrinks a button on press with a layer inset 1px plus a same-colour `box-shadow` spread. gpuix
reproduces this: the surface carries a spread-1 shadow of its fill colour, and `active` sets spread 0. Because gpuix
paints an outer shadow under the whole box with no knock-out, a translucent fill (`--tint`, `bg-hover`) placed over
the shadow would double up, so translucent fills are drawn as the shadow alone, with no `backgroundColor`. The
tertiary variant's inward-moving ring uses an outline offset (0 at rest, -1 pressed) instead.

## Fonts: static Inter cuts

The source uses Inter variable (`wght 550`, `opsz`). gpuix renders only a font's default instance and cannot ease
variable axes, so the port ships static Inter 400/500/600/700 in `assets/fonts/` and passes them to `render()` and
the test renderer. The source's 550 is set as SemiBold 600; there is no optical sizing. A weight change therefore
switches at once instead of easing.

## Theme: System, Light and Dark through createAppearance

The first plan was light-only; on 2026-10-13 the user asked for dark and a theme switcher matching the live site.
Both columns of every `light-dark()` in `globals.css` are kept as a token table (with `color-mix()` mixed offline),
and the scheme is a signal so JSX re-colours on change. "System" follows the OS through gpuix's `createAppearance()`,
and `renderer.setAppearance` mirrors an explicit Light/Dark so the native window chrome follows. Default is System.
A consequence: tokens must be read inside JSX or a function, never at module scope, or they freeze at one scheme.

## Demo discovery through Bun.Glob

During the 2026-10-13 fan-out, six agents ported components in parallel in one tree. To keep them from colliding on
a shared registry, demos are discovered at startup with `Bun.Glob` and a dynamic `import`, and a component adds
only its own three files (component, demo, drift entry). Adding a demo file needs a restart of `--hot`.

## drift/ and its Cause values

<!-- openwiki: broken internal link [../../drift] file "../../drift" does not exist. Fix the href or restore the target, then delete this comment. -->
Each component or page has a file in [`drift/`](../../drift) listing every place the port looks or behaves
differently from the source, with source and port `file:line`. It started as `limitations/` (gpuix gaps only) and
was renamed on 2026-10-16 (`a2d666c`, merged in `037f742`) when the audit widened to every difference, whatever its
cause. Every entry has a **Cause**: `gpuix gap` (gpuix lacks it or gets it wrong), `port choice` (different on
purpose), or `not ported yet` (nothing blocks it). An entry naming two causes counts as mixed. Splitting by cause is
what made the backlog actionable: gaps go to the gpuix fork, `not ported yet` became the user's "port everything"
decision, and choices are left alone. The shape is [`drift/_TEMPLATE.md`](../../drift/_TEMPLATE.md); the counts
table is in the README.

## Screenshots and check-* scenarios

There is no browser to compare against, so verification is two headless harnesses on gpuix's offscreen test
renderer: `pnpm screenshots` (captures per page) and `pnpm check:scenarios` (the `scripts/check-*` files, which
assert behaviour, ARIA and focus). The README's "Screenshots run on the test renderer" notes list the test-renderer
quirks. One trap: **captures are not byte-stable**. The playgrounds pick variants with `Math.random`, and the caret
and timing-driven demos differ run to run, so compare the content area by pixel diff, never by hash, and do not
recommit `screenshots/` for noise.

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
- **Biome's a11y rules are off.** They misfired 209 times on gpuix JSX, which is not HTML (gpuix elements carry
  their own roles and ARIA props). Accessibility is asserted instead in the check-* scenarios through gpuix's
  accessibility tree.
