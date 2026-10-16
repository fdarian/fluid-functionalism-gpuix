# carousel-dots

Original: `registry/default/carousel-dots.tsx` (docs demos: `app/docs/carousel-dots/`). Ported in `src/components/carousel-dots.tsx`, demo in `src/demos/carousel-dots.tsx`.

Ported: static dots, the pill that stretches on the moderate spring, autoplay (the pill fills over `duration`, then the next slide; `paused`, `loop`), a driven `progress` (a number or an accessor, not a `MotionValue`), the shared hover highlight over each dot's 18px click area, labels, keyboard activation, and the demo's sliding slide label with direction.

## No `requestAnimationFrame`

- **Original:** a `MotionValue` advanced every frame by `requestAnimationFrame` drives the fill without re-rendering.
- **gpuix lacks:** `requestAnimationFrame`: no display-synced JS frame callback, only `setTimeout` / `setInterval` (`~/code/fdarian/gpuix/FORK.md:205-207`).
- **Workaround:** one shared 16 ms `setInterval` (`src/lib/clock.ts`, `onFrame`) feeds the autoplay (`src/components/carousel-dots.tsx:82-99`): it advances a signal by the elapsed time (frames longer than 100 ms are dropped, like the original's stall guard) and the fill's `width` is a plain style written each frame, one style mutation per frame per playing carousel.
- **Fidelity:** approximated (timer jitter instead of frame-locked updates).
- **Components it hits:** every JS-driven loop: thinking-indicator, thinking-steps, file-thumbnail.
