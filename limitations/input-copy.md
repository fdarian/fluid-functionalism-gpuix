# input-copy

Original: `registry/default/input-copy.tsx`. Ported in `src/components/input-copy.tsx`, demo in `src/demos/input-copy.tsx`.

## No clipboard

- **Original:** `navigator.clipboard.writeText`, falling back to `document.execCommand("copy")`; a rejection shows the red cross.
- **gpuix lacks:** any clipboard write from JS. The native addon has no method for it (`packages/native/index.d.ts`; the only clipboard code is the text editors' own copy and paste in `packages/native/src/custom_elements/input.rs`). Missing feature.
- **Workaround:** `copyToClipboard` spawns `pbcopy` (macOS) or `wl-copy` with `Bun.spawn` and rejects on a non-zero exit, so the error state is real. The component takes a `copy` prop to swap it out; the demo's screenshot scenarios pass a no-op so they never touch the clipboard of whoever runs them.
- **Fidelity:** approximated: works on macOS and Wayland only, and depends on the host runtime being Bun.
- **Components it hits:** any copy affordance (chat-message copy, code blocks).

## An element with `onMouseDown` and `onMouseMove` swallows its descendants' clicks

- **Original:** a `mousedown` handler on a wrapper never stops a button inside it from receiving `mouseup` and `click`.
- **gpuix lacks:** the event model allows it: `packages/native/src/renderer.rs:5663` calls `capture_pointer()` on every element that has both a `mouseDown` and a `mouseMove` listener, so the pointer is captured by that ancestor and the child's `mouseUp` / `click` never fire (I saw `mouseDown` on the child and nothing after). Nothing in the props says that pairing has this side effect. A bug, or at least a trap.
- **Workaround:** the shared Tooltip spreads those two handlers on its wrapper, which broke the click on the copy row. InputCopy uses the Tooltip's function-children form, so the handlers sit on the row itself (the element that wants the click), and passes no `onMouseMove`.
- **Fidelity:** exact once worked around.
- **Components it hits:** tooltip (wrapper form), color-picker's channel tooltips, anything that puts both listeners on a container.

## Hover tint behind the value (`<mark>`)

- **Original:** a `<mark>` around the value takes `bg-[#6B97FF]/20` while the row is hovered: an inline background hugging the text.
- **gpuix lacks:** inline backgrounds. A `<text>` with `backgroundColor` would fill its box, and a filled element also blocks its ancestors' hover (see input-group).
- **Workaround:** the `highlight` prop (the find-in-page wash) on the `<text>`, `{ query: value, caseSensitive: true, color, radius: 2 }`, applied only while hovered. It hugs the glyphs like a `<mark>` and takes no hit target. Works with the ellipsis truncation.
- **Fidelity:** approximated (a feature meant for search results, but visually equivalent).
- **Components it hits:** just this one.

## The check and cross draw themselves, and pop in

- **Original:** the check / cross strokes draw with `pathLength` 0 to 1, and the swap scales the glyph 0.6 to 1 (wait mode: the copy icon shrinks out to 0.8 first).
- **gpuix lacks:** animating SVG path length (`MotionStyle` in `packages/native/js/host.ts` has width, height, opacity, top, right, bottom, left, borderRadius only). Scale is the already-known missing transforms. Missing feature.
- **Workaround:** the result glyph is a static lucide `check` / `x`, remounted per copy so a fade-in (`motion` opacity, spring.fast) replays when you copy again. The label is a hidden "Copied" in flow with the visible label absolutely placed over it, so the row never resizes.
- **Fidelity:** approximated (fade instead of draw and pop).
- **Components it hits:** any stroke-draw glyph (checkbox, switch tick).

## The tooltip cannot say whether it was showing

- **Original:** Radix's `onOpenChange` tells InputCopy whether the tooltip was visible when the press began, so "Copied" appears only if the tooltip was already open.
- **gpuix lacks:** n/a: the shared `Tooltip` has no open-change callback, and gpuix's own `Tooltip` (`packages/solid/src/components/tooltip.ts`) does, but this port's component does not wrap it.
- **Workaround:** InputCopy runs its own 500ms timer from `mouseenter` that mirrors the tooltip's delay and treats a press after it as "was showing".
- **Fidelity:** approximated (the two timers can drift by a frame).
- **Components it hits:** just this one.

## Colour transitions on the action

- **Original:** `transition-colors duration-80` on the value tint, icon colour and stroke.
- **gpuix lacks:** colour transitions (see the README translation table).
- **Workaround:** instant switch.
- **Fidelity:** dropped.
- **Components it hits:** all.
