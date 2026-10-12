# badge

Original: `registry/default/badge.tsx`. Ported in `src/components/badge.tsx`, demo in `src/demos/badge.tsx`.

Badge is nearly a pure-style component; it hit only two gaps. Both variants (solid, dot), all 17 colours and both sizes are ported.

## `color-mix()` against a runtime colour

- **Original:** `color-mix(in srgb, <hue> 15%, var(--background))` for the solid tint, resolved by the browser against whichever theme is live.
- **gpuix lacks:** any colour function. `StyleDesc` colours are literals (`packages/native/js/host.ts:209`), so a mix cannot reference another colour or a theme variable. `LinearGradientBackground.colorSpace: "oklab"` exists (`host.ts:160`) but only interpolates two stops, it is not a mix operator.
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

## A `Show` among siblings leaves an empty text node that eats a flex `gap`

- **Original:** `{!isSolid && <span dot/>}` followed by the label: a falsy child renders nothing, so the flex `gap` only separates what is there.
- **gpuix:** Solid's universal compiler gives every dynamic child that is not the last one a `createTextNode("")` marker, and gpuix lays that empty text node out as a flex item, so each marker adds one `gap`. In the first version of this port every solid badge had its label pushed right by one `gap`. Not a gpuix bug as such (the renderer is doing what the tree says), but a trap for any port of conditional rendering inside a `gap` container.
- **Workaround:** put the conditional children in one fragment returned from a function (`{content()}`), which makes them a single dynamic child with no marker; or use margins instead of `gap`; or park decorations in one absolute layer.
- **Fidelity:** exact once worked around.
- **Components it hits:** every component with a `Show` / ternary among siblings inside a `gap` row or column (card and its parts, button, anything with optional icons).
