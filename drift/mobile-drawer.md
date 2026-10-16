# mobile-drawer

Original: `registry/base/mobile-drawer.tsx` (Base UI Dialog + Motion). Ported in `src/components/mobile-drawer.tsx`, demo in `src/demos/mobile-drawer.tsx`.

## `DialogBackdrop` closes on mousedown, not click

- **Original:** Base UI closes the drawer on a click that presses and releases on the backdrop; a press that starts elsewhere and releases there does not close it.
- **gpuix lacks:** the DOM rule. `DialogBackdrop` closes in `onMouseDown` (`packages/solid/src/components/dialog.ts:152`, the `onMouseDown` that calls `state.setOpen(false)`).
- **Workaround:** the port does not use `DialogBackdrop`. Its own full-window `div` with `onClick` closes the drawer (`mobile-drawer.tsx:54-73`) and ignores a click that arrives while the exit is playing, since gpuix keeps the layer up through it.
- **Fidelity:** exact.
- **Components it hits:** dialog, and anything built on `DialogBackdrop`.

## No `x: -100%`; the slide animates `left`

- **Original:** `initial={{ x: "-100%" }}` and `animate={{ x: 0 }}` on the compositor.
- **gpuix lacks:** translate. Transforms are the known gap; `motion` can animate `left`, which re-lays the panel out each frame.
- **Workaround:** the panel is `position: absolute` in the full-window layer and animates `left` between `-256` and `0` (`mobile-drawer.tsx:92-112`) on `tween.moderate` (a critically damped spring) in and `tween.moderateExit` (a 120 ms tween) out. The backdrop fades on `{ duration: 0.16 }` in. The unmount waits for `onMotionComplete`, with a 220 ms timer as the fallback (`:20`, `:41`).
  The content is mounted with the panel and rides along as it slides, as on the web; fluid hover's rows measure correctly mid-slide (probed with the motion clock stepped 25 ms at a time).
- **Fidelity:** approximated (same motion, layout cost per frame).
- **Components it hits:** every sliding panel (sheet, toast stack).
