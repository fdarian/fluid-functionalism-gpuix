# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine, a range, step lists and value display, plus the default-step pips and scrubber rows). Ported in `src/components/slider.tsx`, demo in `src/demos/slider.tsx`.

## No `<input type="range">`

- **Original:** Base UI renders a visually hidden `<input type="range">` in each thumb, which gives the platform slider semantics, keyboard handling and a form value.
- **gpuix lacks:** the input type. `InputType` is `"text" | "password" | "number" | "email" | "search" | "tel" | "url"` (`packages/native/js/host.ts:1175`).
- **Workaround:** each thumb is an element with `role="slider"`, `tabIndex`, `aria-valuenow` / `-min` / `-max` / `-orientation` / `-disabled` and an `aria-valuetext` where Base UI sets one (`slider.tsx:755-776`); the default row has a 1px hidden thumb that carries the same (`:1511-1535`). `onKeyDown` handles Arrow (Shift for `largeStep`), Home, End and Page with Base UI's step maths. There is no `name` prop and no form value.
- **Fidelity:** approximated: exact for pointer and keyboard users and the accessibility tree, absent from forms.
- **Components it hits:** none other.
