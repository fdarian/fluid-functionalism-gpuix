# badge

Original: `registry/default/badge.tsx`. Ported in `src/components/badge.tsx`, demo in `src/demos/badge.tsx`.

Badge is nearly a pure-style component; it hit only two gaps. Both variants (solid, dot), all 17 colours and both sizes are ported.

## `color-mix()` against a runtime colour

- **Original:** `color-mix(in srgb, <hue> 15%, var(--background))` for the solid tint, resolved by the browser against whichever theme is live.
- **gpuix lacks:** any colour function. `StyleDesc` colours are literals (`packages/native/js/host.ts:221` onward), so a mix cannot reference another colour or a theme variable. `LinearGradientBackground.colorSpace: "oklab"` exists (`host.ts:157`) but only interpolates two stops, it is not a mix operator.
- **Workaround:** a small `mix()` in `src/components/badge.tsx` that blends the hue with `color.background` in sRGB at render time. It reads the `scheme` signal, so it re-mixes on a theme change. Missing feature.
- **Fidelity:** exact (same sRGB maths as the browser).
- **Components it hits:** any with a derived tint (banner high-contrast wash uses an oklab mix of a status colour over `transparent`, which is solved by emitting an rgba literal instead).

## `[text-box:trim-both_cap_alphabetic]`

- **Original:** trims the label's line box to cap height so the letterforms centre in the fixed-height pill.
- **gpuix lacks:** `text-box-trim`; labels are centred by their full line box. Missing feature.
- **Workaround:** none; `lineHeight` 16 inside a 24px pill. Visible only as roughly a pixel of optical drift.
- **Fidelity:** approximated.
- **Components it hits:** every component that trims its label (button, card title, table).

## Pill shape

Not ported, a deliberate scope cut from the plan (rounded only); gpuix has `borderRadius`, so a pill is just a larger radius.
