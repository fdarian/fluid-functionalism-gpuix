# chat-message

Original: `registry/default/chat-message.tsx`. Ported in `src/components/chat-message.tsx`, demo in `src/demos/chat-message.tsx`.

Transforms are already a known gap and are not repeated here.

## A filled or positioned child takes the hover from its parent

- **Original:** `group-hover:` on the message reveals the meta row whenever the pointer is anywhere over the message, bubble included. DOM `:hover` and `mouseenter` count descendants.
- **gpuix lacks:** that inclusion. `should_occlude` (`packages/native/src/style.rs:317`) makes any element with a non-transparent background, or `position: absolute`, a hit-test blocker, and `renderer.rs:5335` applies it with `block_mouse_except_scroll`. Hit testing stops there, so the ancestor's `onMouseEnter` / `hover` does not see the pointer: moving from the message's gap onto the filled bubble fired `mouseLeave` on the message. Verified in the headless renderer. A behaviour difference from the DOM rather than a missing feature; the doc comment on `pointerEvents` explains the rule but not the effect on ancestors' hover.
- **Workaround:** `pointerEvents: "none"` on every filled descendant that is not interactive: the user bubble, and the thumbnail (root, image, and overlay) in `file-thumbnail.tsx`.
- **Fidelity:** exact for hover. Whether `pointerEvents: "none"` also stops text selection in the bubble is not checked.
- **Components it hits:** queued-stack (card hover over its thumbnails), and any card with a filled child; the sidebar and combobox rows avoid it by keeping rows transparent.

## Layout animation (`layout="position"`)

- **Original:** earlier messages slide up smoothly when a new one is appended, through Motion's FLIP layout animation.
- **gpuix lacks:** layout animations. `README.md:1101`: "Keyframes, variants, and shared layout animations are not available yet." Missing feature.
- **Workaround:** none. A new message appears at its final slot and the rest of the list jumps.
- **Fidelity:** dropped. The entrance itself (opacity and an 8px rise on `top`, spring `moderate`) is kept; the `scale: 0.96` and `transform-origin` are the known transform gap.
- **Components it hits:** queued-stack (reorder).

## `group-focus-within`

- **Original:** the meta row also stays revealed while an action button holds keyboard focus, so a keyboard user can reach the buttons.
- **gpuix lacks:** a focus-within state. `StyleDesc` offers `hover`, `active` and `focusVisible` on the focused element itself (`packages/native/js/host.ts`, `StyleDesc`), and the focus events are not documented to bubble. The meta row is `pointerEvents: "none"` until hovered, so tabbing to an action while the pointer is elsewhere reaches a button that is invisible and unclickable.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** any hover-revealed group.

## `tabular-nums`

- **Original:** the timestamp uses `tabular-nums` so digits do not jitter.
- **gpuix lacks:** OpenType feature control (`font-variant-numeric` / `font-feature-settings`) in `StyleDesc`.
- **Workaround:** none; Inter's default proportional figures are used.
- **Fidelity:** dropped. Inter is loaded, but gpuix cannot switch on its tabular-figures feature.
- **Components it hits:** queued-stack (the count badge).

## Notes that were not gaps

- `whitespace-pre-wrap break-words`: a `<text>` already keeps newlines and runs of spaces and breaks an over-long word, so the port needs nothing.
- `max-w-[80%]` and `self-end`: percentage `maxWidth` and `alignSelf` behave as in CSS.
- `transition-opacity duration-150` has no state-style counterpart (README translation table), so the meta row's fade is a `motion` opacity tween driven by a hover signal.
