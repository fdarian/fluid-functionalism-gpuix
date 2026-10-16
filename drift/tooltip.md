# tooltip

Original: `registry/base/tooltip.tsx`. Ported in `src/components/tooltip.tsx`, demo in `src/demos/tooltip.tsx`.

## The safe polygon needs pointer positions over bare window background

- **Original:** the popup is hoverable and `safePolygon` keeps it open while the pointer crosses the gap between trigger and popup, whatever is under the pointer there.
- **gpuix lacks:** pointer moves over empty space. `window` / `document` `mousemove` listeners fire only when some element on the hit path has a mousemove listener, never over the bare window background, so the polygon cannot be tracked.
- **Workaround:** a grace timer. Leaving the trigger or the chip closes after `GRACE_MS` (80 ms) unless the pointer reaches the chip or comes back (`tooltip.tsx:28`, `:146-151`, chip enter / leave at `:207-214`).
- **Fidelity:** approximated (a pointer that takes longer than the grace period to cross the gap loses the tooltip).
- **Components it hits:** dropdown submenus (the same polygon).

## `scaleY` on the popup enter

- **Original:** the popup enters with a `scaleY` as well as the slide and fade.
- **gpuix lacks:** scale. Transforms are the known gap.
- **Workaround:** the 4px slide and the opacity fade stay (`slideFrom`, `tooltip.tsx:66-77`; chip `initial` / `animate`, `:215-221`). The demo's vertical follow-cursor label, rotated in the original, is stacked in three lines (`src/demos/tooltip.tsx:45`).
- **Fidelity:** approximated (partly dropped).
- **Components it hits:** every popup with a scale entrance (select, combobox, dropdown).
