# combobox

Original: `registry/base/combobox.tsx`. Ported in `src/components/combobox.tsx`, demo in `src/demos/combobox.tsx`. Single selection only: `multiple`, the chips field and `hideSelected` are out of scope. Not ported (FF styling layer, not Base UI): `onCreate`, `variant`, `error`, `size`. The shared popup limits (placement, width, exit) are in [`select.md`](select.md).

## The field is a plain `<input>`

- **Original:** Base UI's `Combobox.Input` is a real `input` with `aria-activedescendant`, a disabled state and IME composition handling.
- **gpuix lacks:** `disabled` on `<input>` (`InputProps` in `packages/native/js/host.ts:562`), `aria-activedescendant` and the other ARIA attributes (README ARIA row), and any way to tell whether the editor reports composition updates as `onChange`.
- **Workaround:** `disabled` is `readOnly` + `tabIndex: -1` + `pointerEvents: "none"` + opacity 0.5; the highlight is a virtual index while the input keeps focus; IME input is untested.
- **Fidelity:** approximated.
- **Components it hits:** input-group, input-message.

## Live placement

- **Original:** the Positioner re-flips and re-caps the popup as it resizes, scrolls or the window changes.
- **gpuix lacks:** a flip that clears the anchor and a layout signal for the window (README placement and ResizeObserver rows).
- **Workaround:** `place()` runs on open and again whenever the filtered row count changes, from the field's painted bounds.
- **Fidelity:** approximated.
- **Components it hits:** select, dropdown.

## Smaller notes

- **Highlight returns to the first row when the pointer leaves the list.** Read from `AriaCombobox.tsx:1198-1207` plus FF's `combobox.tsx:946-951` (`autoHighlight="always"` refills a dropped highlight); traced in source, not compared against a browser.
- **ArrowUp from a closed field opens on the first row** (or the picked one), like ArrowDown: FF's `autoHighlight="always"` sets row 0 on open whichever key opened it.
- **Opening** happens on mouse-down of the input or the chevron; focus alone never opens the popup.
