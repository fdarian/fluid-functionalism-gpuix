# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine, a range, step lists and value display, plus the default-step pips and scrubber rows). Ported in `src/components/slider.tsx`, demo in `src/demos/slider.tsx`.

Not ported: the compact engine's `trackClassName` / `trackStyle` / `fillClassName` / `fillStyle` / `hideFill` / `thumbColor` / `thumbBorderColor` styling overrides (no docs page shows them).

## How well drag works

Good. `onMouseDown` / `onMouseMove` / `onMouseUp` on one element give a full drag, and everything a pointer-capture drag needs was observed headless:

- **Capture:** the press keeps owning the pointer. Moves 300px outside the element still arrive, and a release outside the element ends the press. gpuix turns this on implicitly when an element has both `onMouseDown` and `onMouseMove` (`packages/native/src/renderer.rs:5663`); see switch.md.
- **Value follows the pointer exactly:** a press snaps and springs the thumb (the moderate spring), each move re-snaps and places it (a zero-length tween, so the thumb sits under the pointer), and the range clamp stops a thumb 10px short of the other. Steps, step lists, a range and the scrubber's handle all behave as in the DOM version.
- **Two kinds of hover work with it:** the preview bar and the value bubble follow the pointer when nothing is pressed, from the same `onMouseMove`.
- **What was not measured:** latency and frame pacing in a real window. Every move is a native-to-JS event, a Solid update and a JS-to-native retarget; the headless run is not a measure of that. Releasing outside the *OS window* could not be driven headless.
- **Rough edges:** the pointer is a window coordinate, and pointer-to-value needs the track's painted bounds (next item). `click` is a mouse-up with no press-origin check (checkbox-group.md), which does not matter for a slider because presses are handled on `mouseDown`.

## No element-local pointer coordinates, and bounds are one frame stale

- **Original:** `getBoundingClientRect()` and `offsetWidth` read the live border box; a `ResizeObserver` keeps the width current.
- **gpuix lacks:** `EventPayload` carries window `x` / `y` only. The element's box comes from `getElementBounds` (`packages/native/src/automation.rs:83`, a tracker child inside the element), which: is `null` until the element has painted once, is the last painted frame (a read in the commit that mutates sees the old layout), is the border box, and never notifies on resize. Missing feature (events with element-local coordinates, a resize signal).
- **Workaround:** the slider polls for its first box (up to 12 frames, then throws), re-reads on `mouseEnter` and on every press, and the default row takes its 1px border off the painted width to size its absolute layers (presses map over the whole border box). A window resize while nothing is hovered leaves the thumbs at their old pixels until the next hover.
- **Fidelity:** approximated.
- **Components it hits:** fluid-hover (every list), carousel-dots, scroll-area, anything that maps the pointer onto geometry.

## No motion values: the thumb, fill and dots are separate native springs

- **Original:** the thumb `x` is one motion value; the fill, the step-dot mask and the tooltip are `useTransform`s of it, so every layer is glued together mid-spring and mid-drag.
- **gpuix lacks:** `motion` takes a target per element; no shared value, no derived value, and one `transition` for all of its properties (`packages/native/js/host.ts:98`; animatable props are only width / height / opacity / the four offsets / `borderRadius`, `packages/native/src/motion.rs:14`). Missing feature.
- **Workaround:** the thumb, the fill, the handle line and each dot are separate `motion.div`s with the same spring and the same target maths, so they move in step: a spring is linear in its target, so equal parameters keep their progress equal. They can drift when a retarget lands mid-flight with different distances per layer (the velocity carried over differs). The thumb's `x` becomes `left`, the tooltip rides the thumb by being its anchored child, and the preview bar's opacity is a 150 ms tween on its own element because a motion cannot mix a spring and a tween.
- **Fidelity:** approximated.
- **Components it hits:** switch, checkbox-group, radio-group, accordion, anything with a linked animation.

## `mask-image` for the step dots and the pips

- **Original:** a `linear-gradient` mask with a 2px feather follows the fill edge and hides the dots on the filled side (range: between the thumbs), per frame.
- **gpuix lacks:** masks (`mask-image`, `clip-path`). Overflow clips to a rect (a rounded one with `borderRadius`, which the track pill and the fill use fine), nothing finer. Missing feature.
- **Workaround:** each dot's opacity is 0 or 0.3 from the target value (hidden at or below the thumb; between the thumbs for a range), animated with the moderate spring. A dot fades as the thumb reaches its value instead of being swept away by the fill edge; at rest the picture is identical.
- **Fidelity:** approximated (rest exact; mid-motion fades instead of a feathered sweep).
- **Components it hits:** any scroll fade or edge fade (scroll-area, carousel-dots).

## `opacity` does not composite a group

- **Original:** `opacity-50` on a disabled slider dims the finished picture: a pip hidden behind the label box stays hidden.
- **gpuix lacks:** an element's opacity multiplies into each child's own paint, so overlapping children of a translucent parent show through each other. In the disabled pips row the blank box that hides a pip behind the value ends up half transparent and the pip leaks through. Missing feature (an offscreen group). Probably a bug-for-bug GPUI behaviour: `opacity` is applied per primitive.
- **Workaround:** none. The disabled default slider shows a faint pip at its value.
- **Fidelity:** approximated.
- **Components it hits:** any disabled state with overlapping layers (switch is fine: its thumb is one element).

## The pips hide behind the words with a box in the surface colour

- **Original:** transparent-text copies of the label and value sit on `bg-background` over the pips, so no dot crosses a word.
- **gpuix lacks:** nothing that blocks it, but the trick needs the backdrop colour: it hardcodes `--background`. Here the demo card is `surface-2`, so the boxes use `color.surface2`. A slider on any other surface shows two patches. (Same hack as the original on a page whose surface is not `--background`.)
- **Workaround:** `color.surface2`, with a comment.
- **Fidelity:** exact on the demo card.
- **Components it hits:** none other.

## `<input>` has no select-all on focus

- **Original:** the click-to-edit value is an `<input type="number">` focused and `select()`ed, so typing replaces the number; `step` / `min` / `max` come with it.
- **gpuix lacks:** a JS-callable selection. `SelectAll` is a native action bound to the platform shortcut and triple-click (`packages/native/src/custom_elements/input.rs:959`); `<input>` has no `type`, `step`, `min` or `max` either. Missing feature.
- **Workaround:** `autoFocus` puts the caret at the end of the seeded number, so editing means deleting first (Backspace, or triple-click). The commit parses and snaps the text in JS (to the grid, or to the nearest list entry), and Enter, blur and Escape work as in the original.
- **Fidelity:** approximated.
- **Components it hits:** input-group, input-copy, color-picker.

## Focus on a slider is keyboard-only because the thumb cannot be pressed

- **Original:** the Base UI thumb is `pointer-events-none`, so only Tab focuses it; `:focus-visible` drives the ring and the brighter label.
- **gpuix lacks:** nothing here, but it only works because of that: the `focus` event has no keyboard-or-pointer flag (checkbox-group.md). The compact thumbs use native `focusVisible`; the default row's ring and its brighter label follow `onFocus` / `onBlur` on a 1px hidden thumb that nothing can press.
- **Workaround:** a `pointerEvents: "none"`, `tabIndex: 0` element that handles Arrow, Home, End and Page keys.
- **Fidelity:** exact.
- **Components it hits:** none other.

## A filled child of a pressable element takes its presses

- **Original:** presses fall through the knob, the pips and the labels to the track.
- **gpuix lacks:** the same fill-blocks-parent rule as switch.md. It cost two bugs here: the knob (a filled in-flow `div`) and the centre pip each ate presses at their own position, so a thumb or a pip under the pointer made the slider unpressable at that spot.
- **Workaround:** every layer, including the knob, the pips and the blank boxes, is `pointerEvents: "none"`.
- **Fidelity:** exact.
- **Components it hits:** switch, checkbox-group, radio-group.
