# combobox

Original: `registry/base/combobox.tsx`. Ported in `src/components/combobox.tsx`, demo in `src/demos/combobox.tsx`. Single selection only: `multiple`, the chips field and `hideSelected` are out of scope. Not ported (FF styling layer, not Base UI): `onCreate`, `variant`, `error`, `size`.

## IME composition is invisible to JS

- **Original:** Base UI's `Combobox.Input` handles composition (`compositionstart` / `compositionend`, `isComposing` on keydown), so Enter or arrows during composition do not pick or move.
- **gpuix lacks:** composition events and a truthful `isComposing`: a key that feeds an IME is consumed by the platform before GPUI sees it, so `keydown` cannot cancel it, `isComposing` is always `false` and no `composition*` events exist (`~/code/fdarian/gpuix/FORK.md:499-505`).
- **Workaround:** none. The field filters on every `onChange` (`src/components/combobox.tsx:335-342`); IME input is untested.
- **Fidelity:** approximated (unverified for composed input).
- **Components it hits:** command-menu, dropdown-search, input-group, input-message: any text field that reacts to Enter or arrows.

## No `<input type="hidden">`

- **Original:** Base UI renders a hidden input carrying the picked value, so a `<form>` submits it under `name` and an empty `required` one blocks the submit.
- **gpuix lacks:** `type="hidden"`: `InputType` is `text | password | number | email | search | tel | url` (`packages/native/js/host.ts:1175`), and `FormData` reads only named, enabled `<input>`s.
- **Workaround:** `FormValue` (`src/lib/form-value.tsx`, used at `src/components/combobox.tsx:381-389`) is a real input kept 1px, transparent, pointer-less and out of the tab order; when an empty required one takes focus it hands it to the combobox's input.
- **Fidelity:** exact.
- **Components it hits:** select, color-picker (any control that is not an input and submits a value).

## Implicit submission does not validate, and there is no submit button

- **Original:** a `<button type="submit">`, or Enter in a form control, submits the form; an empty `required` control blocks it, fires `invalid` and takes focus.
- **gpuix lacks:** a submit button (`SubmitEvent.submitter` is always `null`, `packages/native/js/host.ts:1208-1209`), and Enter in a form `<input>` with an empty `required` control does nothing instead of validating; only `requestSubmit()` validates.
- **Workaround:** the demo's Submit button calls `form.requestSubmit()` (`src/demos/combobox.tsx:126-129`).
- **Fidelity:** exact for `requestSubmit()`, dropped for implicit submission.
- **Components it hits:** select, any form in a demo.

## CSS transforms (popup scale)

- **Original:** the popup enters with `scaleY: 0.96` from its trigger.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** `PopupSurface` slides the card 4px from the reported side and fades it (`src/lib/popup.tsx:64`, `:84-90`).
- **Fidelity:** approximated.
- **Components it hits:** select, dropdown, color-picker.
