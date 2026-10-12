# checkbox-group

Original: `registry/base/checkbox-group.tsx`. Ported in `src/components/checkbox-group.tsx` (the row, group and hover machinery it shares with radio-group is in `src/components/choice-group.tsx`), demo in `src/demos/checkbox-group.tsx`.

## Merge / split choreography of the selected background

- **Original:** when one unchecked row bridges two checked runs, their inner edges glide to the bridge row's midpoint, the facing corners straightening to sharp and trailing by 70 ms, then swap to one block (and the inverse on a split). Per-corner radii, a per-property transition and a delay do the work.
- **gpuix lacks:** motion animates a single `borderRadius`, not the four corners (`packages/native/src/motion.rs:14`, `MotionStyle`; the static `borderTopLeftRadius` etc. exist, `packages/native/js/host.ts:220`), and a motion takes one `transition` for every property, so there is no "corners trail by 70 ms" or "opacity on 80 ms, position on a spring". Missing feature.
- **Workaround:** runs keep a stable id (a port of `useSelectionRuns`), so a run that grows or shrinks glides in place on the moderate spring. A merge makes the surviving block spring over the whole union while the absorbed one is removed; a split shrinks the survivor and the other half appears at its final size.
- **Fidelity:** approximated (the bridge-row choreography is dropped).
- **Components it hits:** radio-group is unaffected (one block); any selection list that merges blocks.

## The check mark draws itself

- **Original:** `pathLength` 0 → 1 over 80 ms ease-out on check, back over 40 ms ease-in on uncheck.
- **gpuix lacks:** no stroke animation (`stroke-dashoffset` / `pathLength`) on `<svg>`; svg is a tinted image (`source`), not a path tree. Missing feature.
- **Workaround:** the glyph sits in a clip (`overflow: "hidden"`) whose width springs 0 → glyph width with the same durations and easings, so it wipes in from the left like the stroke does; `AnimatePresence` plays the retraction.
- **Fidelity:** approximated (a left-to-right wipe, not following the path's length).
- **Components it hits:** any animated glyph (thinking-indicator, accordion chevron).

## One focus ring that springs between rows

- **Original:** a single absolute ring at the focused row's rect, springing between rows, shown only for keyboard focus (`:focus-visible` is read in the group's `onFocus`, plus a flag that suppresses the ring for a row focused by its own mousedown).
- **gpuix lacks:** the `focus` event has no payload (`packages/native/src/renderer.rs:4841`, `emit_event_full(.., |_| {})`), so JS cannot tell keyboard focus from a pointer press, and `window.last_input_was_keyboard()` is not exposed. The native `focusVisible` style does know. Missing feature. (Headless ordering is `mouseDown` then `focus`, so a JS flag set on press would work, but it depends on event order in the real window, which was not checked.)
- **Workaround:** every row carries `focusVisible: { outline 1px, offset 1 }`. It is shown only for keyboard focus, natively.
- **Fidelity:** approximated (the ring snaps to the new row instead of springing).
- **Components it hits:** radio-group; any list with one shared ring (sidebar, tabs).

## `click` is a mouse-up, with no press-origin check

- **Original:** `click` fires only when press and release land on the same element.
- **gpuix lacks:** `onClick` is wired to `on_mouse_up` (`packages/native/src/renderer.rs:5460`). Probed: press on one row, move, release on another row, and the second row gets `click` (the first gets none). A drag across a checkbox list therefore toggles whichever row it ends on. Bug (the comment there says GPUI's own click gesture is not finalised by the embedded pump).
- **Workaround:** none; the port uses `onClick` like the original.
- **Fidelity:** exact for a normal click, wrong for press-here-release-there.
- **Components it hits:** radio-group, every `onClick` consumer.

## Positioned children of a row take its mouse events

- **Original:** the 16px checkbox box is `relative` and its border and check are `absolute`; none of that affects hover or click on the row.
- **gpuix lacks:** a positioned or painted child occludes its parent for `mouseEnter` / `mouseLeave` / `mouseDown` / `click` (see switch.md). Left alone, hovering the square would drop the group's `onMouseLeave` and clear the hover highlight.
- **Workaround:** the box, its border and the check wrapper are `pointerEvents: "none"`, as is the label wrapper.
- **Fidelity:** exact.
- **Components it hits:** radio-group, switch, slider.

## Programmatic focus and Home / End

- **Original:** `element.focus()` on the next row.
- **gpuix lacks:** nothing: `renderer.focusElement(id)` (`packages/native/index.d.ts:128`) moves focus and a keyboard-initiated move shows the `focusVisible` ring. Listed so the next port does not re-check it.
- **Workaround:** `useGpuixRequired().focusElement(row.id)` from the row's key handler.
- **Fidelity:** exact.
- **Components it hits:** radio-group.
