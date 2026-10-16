# thinking-steps

Original: `registry/base/thinking-steps.tsx` (Base UI `Collapsible`) and `app/docs/thinking-steps/page.tsx`. Ported in `src/components/thinking-steps.tsx`, demo in `src/demos/thinking-steps.tsx`.

## Chevron rotation

- **Original:** `motion.span animate={{ rotate: open ? 90 : 0 }}` with `spring.fast`.
- **gpuix lacks:** rotation. Transforms are the known gap, and `motion` cannot animate an SVG `transform` attribute either.
- **Workaround:** the rotation is inside the SVG source (`<g transform="rotate(a 12 12)">`) and a 100 ms JS ease-out rewrites it on the shared `onFrame` clock (`src/lib/clock.ts:25`) in whole degrees, so GPUI's SVG cache (keyed by the bytes) holds at most 91 entries (`thinking-steps.tsx:56-88`).
- **Fidelity:** approximated. A tween rather than the critically damped spring, and driven from JS.
- **Components it hits:** any disclosure chevron; file-thumbnail's spinner uses the same SVG-rewrite technique.

## `scale` and `filter: blur` entrances

- **Original:** sources enter `opacity 0, scale .85, blur(4px)` and images `opacity 0, blur(4px)`, with the blur on its own faster transition.
- **gpuix lacks:** scale (the known transform gap), and an animatable `filter`: `filter: "blur(4px)"` paints as a static style, but `filter` is not among `MotionStyleTargets` (`packages/native/js/host.ts:87`), so it cannot be tweened.
- **Workaround:** opacity only, with the same delays (`ThinkingStepSource`, `thinking-steps.tsx:533-549`; `ThinkingStepImage`, `:555-575`).
- **Fidelity:** approximated (the blur-to-sharp reveal is dropped).
- **Components it hits:** just this one.
