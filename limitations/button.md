# button

Original: `registry/base/button.tsx` (Base UI `Button`). Ported in `src/components/button.tsx`, demo in `src/demos/button.tsx`.

## A held Space does not press the button

- **Original:** a native `<button>` matches `:active` while Space is held, so the press-shrink (`group-active:`) plays for a keyboard activation too.
- **gpuix lacks:** a keyboard `:active` state. `active` styles come from the pointer's press chain only (`~/code/fdarian/gpuix/FORK.md:305-306`). Rechecked on the test renderer: with a focused `buttonProps` element carrying `active: { backgroundColor }`, the capture while `nativeSimulateKeyDown(id, "space")` is held is byte-identical to the resting one.
- **Workaround:** none; Space still activates on key-up (`buttonProps`, `packages/solid/src/components/button.ts:52-57`), without the pressed look.
- **Fidelity:** approximated: the activation is exact, the pressed look is missing for the keyboard.
- **Components it hits:** every `buttonProps` button.

## `simulateKeystrokes("space")` delivers no key-up

- **Original:** n/a (a test-harness effect).
- **gpuix lacks:** a key-up from `simulateKeystrokes`: it makes one native call (`packages/native/js/testing.ts:441-450`), so a focused `buttonProps` element sees a keydown for `" "` and neither `keyup` nor `click`, while `nativeSimulateKeyDown` then `nativeSimulateKeyUp` gives keydown, click, keyup. The helper also still takes GPUI key names (`space`, `cmd-shift-p`; `~/code/fdarian/gpuix/README.md:3186`).
- **Workaround:** scenarios press Enter, which activates on key-down (`press` in `scripts/screenshots.tsx:168-171` calls `simulateKeystrokes`). `nativeSimulateKeyDown` / `nativeSimulateKeyUp` would do it, but `ShotContext` has no helper for them.
- **Fidelity:** exact in the real window; a harness gap only.
- **Components it hits:** any scenario that wants Space on a Base UI-style button.
