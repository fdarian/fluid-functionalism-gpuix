# select

Original: `registry/base/select.tsx`. Ported in `src/components/select.tsx`, demo in `src/demos/select.tsx`.

## A popup cannot grow to its widest option

- **Original:** `min-w-[var(--anchor-width)]` on the popup, which then grows to its widest option.
- **gpuix lacks:** an intrinsic (`max-content`) width. `minWidth: "anchor-size(width)"` ties the popup to the trigger (`src/lib/popup.tsx:93-94`), but the popup cannot also size itself to its content, because `width: "max-content"` is rejected (see scroll-area.md).
- **Workaround:** the card's width is `popupWidth` when given, else `"anchor-size(width)"` (`select.tsx:135`, `:579`), and never narrower than the trigger; `popupWidth` is a manual width for long labels (the timezone list). Without it a label wider than the trigger ellipsizes.
- **Fidelity:** approximated.
- **Components it hits:** combobox, dropdown, every popup sized to its trigger and its content.
