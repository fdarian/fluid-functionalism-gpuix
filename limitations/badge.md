# badge

Original: `registry/default/badge.tsx`. Ported in `src/components/badge.tsx`, demo in `src/demos/badge.tsx`.

## `[text-box:trim-both_cap_alphabetic]`

- **Original:** trims the label's line box to cap height so the letterforms centre in the fixed-height pill.
- **gpuix lacks:** `text-box-trim` / `text-box-edge`: `StyleDesc` has neither (`packages/native/js/host.ts`), so a label is centred by its full line box.
- **Workaround:** none. The label keeps the type scale's line height (16 for `caption`, 14 for `micro`, `src/lib/theme.ts:265-266`) inside a 24px or 20px pill, flex-centred (`src/components/badge.tsx:29-30`, `:79-87`, `:98`). Visible only as roughly a pixel of optical drift.
- **Fidelity:** approximated.
- **Components it hits:** any component that trims its label.
