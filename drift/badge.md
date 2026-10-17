# badge

Original: `registry/default/badge.tsx`, demo in `app/docs/badge/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/badge.tsx`, demo in `src/demos/badge.tsx`.

Checked with no drift: the 17 hexes, heights (24 / 20), paddings (10 / 8), gaps (6 / 4), dot sizes (7 / 6), type (12/16 and 11/14), the 15% tint mixed into the page background (`color-mix(in srgb, ...)` redone in sRGB, channel by channel), gray on `--accent`, the gray dot on `--muted-foreground`, the dot variant's 1px `--border` outline with a transparent fill, `whitespace-nowrap`, both schemes.

## Label is not trimmed to cap height

- **Cause:** `gpuix gap`.
- **Original:** `[text-box:trim-both_cap_alphabetic]` on the label span so the letterforms centre in the fixed-height pill (`registry/default/badge.tsx:148-151`).
- **Port:** the label keeps the type scale's line height (16 for `caption`, 14 for `micro`, `src/lib/theme.ts:306-307`) inside a 24px or 20px pill, flex-centred (`src/components/badge.tsx:29-32`, `:83-93`, `:102-104`).
- **gpuix lacks:** `text-box-trim` / `text-box-edge`: `StyleDesc` has neither (searched `packages/native/js/host.ts`, `packages/native/src`), so a label is centred by its full line box. README "gpuix gaps", badge row.
- **Workaround:** none. Visible only as roughly a pixel of optical drift.
- **Fidelity:** approximated.
- **Components it hits:** any component that trims its label (button, inline card title, `CardButton`, `CardFeature`).

## Size aliases `sm`, `md`, `lg`

- **Cause:** `port choice` (reason not stated).
- **Original:** `sm` / `md` / `lg` are accepted and mapped onto the two-step ladder (`registry/default/badge.tsx:64-75`, `:102-109`).
- **Port:** `size` takes only `default` | `compact`; omitted, it follows the Size row (`src/components/badge.tsx:27`, `:55`).
- **Workaround:** pass `default` or `compact`.
- **Fidelity:** dropped (aliases).
- **Components it hits:** just this one (button has the same aliases, see button.md).

## No `className`, `ref` or HTML attributes

- **Cause:** `port choice` (reason not stated; Solid components with a fixed prop list).
- **Original:** `BadgeProps` extends `HTMLAttributes<HTMLSpanElement>` and forwards `className`, `style` and the rest to the span (`:77-84`, `:131-137`); `badgeVariants` is exported.
- **Port:** `variant`, `size`, `color`, `testId`, `children`, and a `style` (a `StyleDesc` laid over the badge's own, for the inline chip in `src/pages/concepts-lumen.tsx`) only (`src/components/badge.tsx:46-53`). The badge is `inline-flex` as in the source, so it sits in running text.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** every ported component.

## Demo: same sections, plus a Sizes card

- **Cause:** `port choice` (reason not stated).
- **Original:** `app/docs/badge/page.tsx:65-109`: Solid and Dot (the five featured colours), Colors (all 17, solid row then dot row), an API reference table. No compact example.
- **Port:** `src/demos/badge.tsx:68-100`: the same three, with identical labels and gaps, plus a Sizes card (default and compact, solid and dot). No API table.
- **Workaround:** n/a.
- **Fidelity:** exact for the shared sections.
- **Components it hits:** just this one.
