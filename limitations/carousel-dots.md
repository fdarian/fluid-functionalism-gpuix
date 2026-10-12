# carousel-dots

Original: `registry/default/carousel-dots.tsx` (docs demos: `app/docs/carousel-dots/`). Ported in `src/components/carousel-dots.tsx`, demo in `src/demos/carousel-dots.tsx`.

Ported: static dots, the pill that stretches on the moderate spring, autoplay (the pill fills over `duration`, then the next slide; `paused`, `loop`), a driven `progress` (a number or an accessor, not a `MotionValue`), the shared hover highlight over each dot's 18px click area, labels, keyboard activation, and the demo's sliding slide label with direction. Not ported: `useReducedMotion` (gpuix exposes no such preference).

## A filled child blocks its parent's hover and click

- **Original:** the dot's coloured pill is a child of its `<button>`; clicks and hover on it count as on the button.
- **gpuix lacks:** bubbling through filled or absolute boxes: they insert a hitbox that hides the ancestors behind them (`packages/native/src/style.rs:317`, `renderer.rs:5335`; detail in [accordion.md](accordion.md)). With the pill (translucent fill) in place only the 6px of padding around each dot reacted. Bug-shaped.
- **Workaround:** `pointerEvents: "none"` on the pill and the fill. Both are decoration; the button is the target.
- **Fidelity:** exact.
- **Components it hits:** any control with a filled child: switch thumb, checkbox box, radio dot, badges in buttons.

## `overflow: hidden` clips to a rectangle

- **Original:** the fill is a full-width pill slid in from the left (`translateX`) behind the dot's `overflow-hidden rounded-full`, so its visible end is always a round cap.
- **gpuix lacks:** rounded clipping. gpui's `ContentMask` is bounds only (`zed/crates/gpui/src/window.rs:1930`, "to leave room to support more complex shapes in the future"), so a child that overflows a rounded box shows square corners. Transforms are already known; this is the second reason the slide cannot be kept. Missing feature.
- **Workaround:** the fill is a pill that grows from a dot (`width = 6 + p * 18`, radius 3), which is the same picture without any clipping.
- **Fidelity:** exact.
- **Components it hits:** anything that clips children to a radius: progress bars, avatars, image cards, the popup shells (their corners are clipped by a rectangle, hidden only because their children are transparent).

## The autoplay clock is a JS timer, not a motion

- **Original:** a `MotionValue` advanced every frame by `requestAnimationFrame` drives the fill's transform without re-rendering.
- **gpuix lacks:** a pausable, readable motion track: `motion` runs to its target on its own clock (`packages/native/src/motion.rs`), so a fill that must hold on `paused` and resume where it was cannot be one native tween; there is no `requestAnimationFrame` and no value you can drive the style from without a Solid update. Missing feature.
- **Workaround:** a 16ms `setInterval` advances a signal by the elapsed time (frames longer than 100ms are ignored, like the original's stall guard), and the fill's `width` is a plain style written each frame. It costs one style mutation per frame per playing carousel.
- **Fidelity:** approximated: timer jitter instead of frame-locked updates.
- **Components it hits:** any progress or timer-driven visual: thinking indicator, queued stack, banner countdowns.

## No capture-phase events

- **Original:** the demo marks a change as "by hand" with `onPointerDownCapture` / `onKeyDownCapture` on a wrapper, set before the dot's own handler runs.
- **gpuix lacks:** capture handlers: `HostProps` has only bubbling-style `onMouseDown` / `onKeyDown` (`packages/native/js/host.ts`). Missing feature.
- **Workaround:** the wrapper uses `onMouseDown` / `onKeyDown`. A dot is not occluding (after the fix above), so the wrapper still sees the press first; the order was not stress-tested.
- **Fidelity:** approximated.
- **Components it hits:** none beyond this demo.
