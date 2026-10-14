# button

Original: `registry/base/button.tsx` (Base UI `Button`). Ported in `src/components/button.tsx`, demo in `src/demos/button.tsx`.

Transforms, colour transitions and fonts are already known and not repeated here.

## A held Space does not press the button

- **Original:** a native `<button>` matches `:active` while Space is held, so the press-shrink (`group-active:`) plays for a keyboard activation too.
- **gpuix lacks:** a keyboard `:active` state. `style.active` follows the pointer only. Checked on the test renderer: with the button focused, the frame while Space is down is pixel-identical to the frame while any other key is down (only the focus ring differs), and different from a pointer press. Missing feature.
- **Workaround:** none; Space still activates on key-up (`buttonProps`), without the shrink.
- **Fidelity:** approximated: the activation is exact, the pressed look is missing for the keyboard.
- **Components it hits:** every `buttonProps` button (accordion and thinking-steps triggers have no pressed look anyway).

## `simulateKeystrokes("space")` delivers no key-up to elements

- **Original:** n/a (a test-harness effect).
- **gpuix lacks:** a key-up from `simulateKeystrokes` reaching an element's `onKeyUp`: Space never activates a `buttonProps` button in a scenario, while `nativeSimulateKeyDown` followed by `nativeSimulateKeyUp` does.
- **Workaround:** scenarios press Enter instead; `ShotContext` has no key-up helper.
- **Fidelity:** exact in the real window; a harness gap only.
- **Components it hits:** any scenario that wants Space on a Base UI-style button.
