# switch

Original: `registry/base/switch.tsx`. Ported in `src/components/switch.tsx`, demo in `src/demos/switch.tsx`.

## Pointer capture works, but only through an implicit rule

- **Original:** `setPointerCapture` on the row keeps `pointermove` / `pointerup` coming after the pointer leaves, so the thumb follows a drag past the track and a release anywhere ends it.
- **gpuix lacks:** no capture API. An element that has both `onMouseDown` and `onMouseMove` is silently given `capture_pointer()` (`packages/native/src/renderer.rs:5663`). It works: headless, a drag to 300px outside the row still moved the thumb, and a `mouseUp` released outside the window area still ended the press and fired the toggle. It is undocumented and keyed on the listener pair, so a handler pair added for another reason changes behaviour. Not a bug, a missing explicit feature.
- **Workaround:** register all three of `onMouseDown` / `onMouseMove` / `onMouseUp` on the pressed element and keep the press state in a closure.
- **Fidelity:** exact for mouse. Release outside the *OS window* was not exercised (headless can only place the pointer in the surface).
- **Components it hits:** slider (same mechanism), anything draggable.

## Drag position has no live value to read or write

- **Original:** the thumb's `x` is a motion value. A drag writes it per `pointermove` with no animation, a press while the spring is mid-flight starts from `motionX.get()`, and release springs on from wherever it was.
- **gpuix lacks:** `motion` only takes a target (`MotionProps.animate`, `packages/native/js/host.ts:98`); there is no motion value, no imperative `set` or `animate`, and no read-back of the in-flight value. The animated props are also limited to width / height / opacity / top / left / right / bottom / borderRadius (`packages/native/src/motion.rs:14`), so `x` becomes `left`. Missing feature.
- **Workaround:** `left` is the target, and while dragging the transition is a zero-length tween so each `mouseMove` retargets to the pointer. Releasing switches back to the moderate spring, which gives the same hand-off from the release position. A drag that starts while the thumb is still springing starts from the resting target, not the in-flight position, so a very fast grab jumps by up to one spring's remaining distance.
- **Fidelity:** approximated (the press-mid-spring start).
- **Components it hits:** slider (thumb, fill, handle line), checkbox-group / radio-group backgrounds only for the glide.

## Mouse events do not bubble past a painted or positioned child

- **Original:** `pointerdown` / `pointerenter` on the row fire for presses on the track and label inside it.
- **gpuix lacks:** an element that paints a fill or is positioned occludes the elements behind it for `mouseDown`, `click`, `mouseEnter` and `mouseLeave`, parents included. Probed: a parent with a filled child gets no `down` / `click` / `enter` for a press on the child, and a merely positioned child makes the parent report `mouseLeave`. This is described for `pointerEvents` (`packages/native/js/host.ts:247`) and is by design, but it is a DOM difference with no way to opt a child into bubbling short of `pointerEvents: "none"`, which also stops it taking focus or its own hover.
- **Workaround:** the thumb is `pointerEvents: "none"`; the track, which must stay focusable for the ring, carries the same press handlers as the row, and hover is a count of the two elements the pointer is over instead of one enter / leave pair.
- **Fidelity:** exact.
- **Components it hits:** any component with a focusable child inside a pressable row (checkbox-group, radio-group, slider thumbs).

## Colour is not animatable

- **Original:** `transition-colors duration-80` on the track and label.
- **gpuix lacks:** colour and shadow are not in `MotionStyle` (`packages/native/src/motion.rs:14`) and state styles switch instantly; already listed in the README translation table.
- **Workaround:** none, the track and label colours step.
- **Fidelity:** dropped (80 ms crossfade).
- **Components it hits:** every component.

## `rounded-full` on a resizing thumb

- **Original:** `rounded-full` (9999px) keeps the thumb a pill while its width and height animate.
- **gpuix lacks:** nothing: an oversized `borderRadius` clamps to a pill, so the animated width / height need no radius tracking. Listed so the next port does not re-check it.
- **Workaround:** `borderRadius: 9999`.
- **Fidelity:** exact.
- **Components it hits:** slider thumb.
