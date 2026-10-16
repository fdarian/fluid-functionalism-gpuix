# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine, a range, step lists and value display, plus the default-step pips and scrubber rows). Ported in `src/components/slider.tsx`, demo in `src/demos/slider.tsx`.

## No `<input type="range">`

- **Original:** Base UI renders a visually hidden `<input type="range">` in each thumb, which gives the platform slider semantics, keyboard handling and a form value.
- **gpuix lacks:** the input type. `InputType` is `"text" | "password" | "number" | "email" | "search" | "tel" | "url"` (`packages/native/js/host.ts:1175`).
- **Workaround:** each thumb is an element with `role="slider"`, `tabIndex`, `aria-valuenow` / `-min` / `-max` / `-orientation` / `-disabled` and an `aria-valuetext` where Base UI sets one (`slider.tsx:755-776`); the default row has a 1px hidden thumb that carries the same (`:1511-1535`). `onKeyDown` handles Arrow (Shift for `largeStep`), Home, End and Page with Base UI's step maths. There is no `name` prop and no form value.
- **Fidelity:** approximated: exact for pointer and keyboard users and the accessibility tree, absent from forms.
- **Components it hits:** none other.

## Motion values cannot be written from a press, release or key handler

- **Original:** Framer's `animate(motionX, px, spring.moderate)` and `motionX.set(px)` run straight from the pointer and keyboard handlers.
- **gpuix lacks:** the same freedom. `MotionValue.animate` and `jump` call into the renderer, which refuses while native is inside a key, press or release handler ("This renderer call cannot run inside an event handler that native called synchronously"). A slider's value change lands in exactly those handlers, and the effect that places the thumb runs synchronously inside the signal write.
- **Workaround:** `createMotionWrites` (`slider.tsx:158`) queues each write in a microtask. The thumb, fill and handle start moving one microtask after the event, before the next frame, so it is not visible. The fill of a range (`second - first`) and the comfortable row's layers read several values, which `createTransform` computes in JS, so they trail their inputs by one frame (FORK.md:915-917); the single compact fill is a native transform of the thumb's x and does not trail.
- **Fidelity:** exact for what is seen, except that a very fast drag can show the range fill's right edge one frame behind its thumb.
- **Components it hits:** none other; the Switch drag has the same restriction if it adopts motion values.
