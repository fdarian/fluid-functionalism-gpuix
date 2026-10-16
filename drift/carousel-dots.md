# carousel-dots

Original: `registry/default/carousel-dots.tsx`, demo in `app/docs/carousel-dots/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/carousel-dots.tsx`,
demo in `src/demos/carousel-dots.tsx`.

Ported and matching: the 6px dots and 24px pill on `moderate` (`carousel-dots.tsx:180-190`), track and fill colours (15% and 40% of foreground, `:23-24`), the 18px round click areas and 12px between dots (`:173`), the shared hover highlight along the x axis, the focus ring (`focusRing(0)`, README row `README.md:224`), default labels ("Go to slide N"), `role="group"` / `aria-label="Slides"`, Enter on key-down and Space on key-up through `buttonProps`, autoplay (`duration`, `paused`, `loop`, restart on every slide change, one request per slide), a driven `progress`, and the demo's sliding label with direction.

## Autoplay clock is a 16 ms timer, not `requestAnimationFrame`

- **Cause:** `gpuix gap` (`requestAnimationFrame` itself); driving the fill natively instead is `not ported yet`.
- **Original:** a `requestAnimationFrame` loop advances a `MotionValue` that drives the fill's `transform`, with no re-render (`carousel-dots.tsx:134-159`, `:161-162`).
- **Port:** one shared 16 ms `setInterval` (`src/lib/clock.ts:27`, `onFrame`) advances a signal (`carousel-dots.tsx:93-110`); stalled frames over 100 ms are dropped, like the original's stall guard (`clock.ts:15`, source `:82`). The fill's `width` is rewritten every frame (`:199-202`), one style mutation per frame per playing carousel.
- **gpuix lacks:** `requestAnimationFrame`: no display-synced JS frame callback, only `setTimeout` / `setInterval` (`~/code/fdarian/gpuix/FORK.md:205-208`; README "Missing features" row "`requestAnimationFrame` itself"). gpuix does have native, JS-free motion values (`createMotionValue`, `packages/solid/src/index.ts:36`; `FORK.md:824`), so the timer is not the only route; the port has not tried driving the fill natively.
- **Workaround:** the shared frame clock.
- **Fidelity:** approximated (timer jitter instead of frame-locked updates).
- **Components it hits:** every JS-driven loop: thinking-indicator, thinking-steps, file-thumbnail.

## The fill grows instead of sliding

- **Cause:** `gpuix gap` (no transforms; README "Missing features" row "CSS transforms").
- **Original:** the fill is a full-width pill slid in from the left with `translateX(calc((p - 1) * (100% - 6px)))`, never scaled, so its round end stays round and it tracks the pill's animating width (`carousel-dots.tsx:42-48`, `:236-242`).
- **Port:** a pill whose `width` goes from 6px to the 24px target, clipped by the dot's `overflow: hidden` (`carousel-dots.tsx:204-217`).
- **gpuix lacks:** CSS transforms.
- **Workaround:** the same silhouette at rest and at every `p` once the dot has finished widening.
- **Fidelity:** approximated. During the 160 ms width spring the port sizes the fill from the 24px target, not the animating width; autoplay restarts at `p = 0` there, so it is hard to see.
- **Components it hits:** just this one.

## `progress` takes a number or an accessor, not a `MotionValue`

- **Cause:** `port choice` (reason not stated).
- **Original:** `progress?: number | MotionValue<number>`; a `MotionValue` moves the fill each frame without re-rendering (`carousel-dots.tsx:71-74`, `:161`).
- **Port:** `number | (() => number)` (`carousel-dots.tsx:59`, `:72-77`).
- **gpuix lacks:** n/a: gpuix has `createMotionValue` (`packages/solid/src/index.ts:36`), but the port does not accept it.
- **Workaround:** pass a signal accessor.
- **Fidelity:** approximated (a signal write per update, not a native motion value).
- **Components it hits:** just this one.

## Container and extra props

- **Cause:** `port choice` (reason not stated).
- **Original:** `relative flex w-fit items-center`, plus `className`, a `ref` and the `div`'s HTML attributes (`carousel-dots.tsx:59-60`, `:165-176`).
- **Port:** `alignSelf: "flex-start"` for the shrink-to-fit width (`carousel-dots.tsx:128`); only `testId` is accepted besides the documented props (`:41-51`).
- **Workaround:** none.
- **Fidelity:** approximated (same width in a column parent; in a row parent `flex-start` pins it to the top where `w-fit` would not).
- **Components it hits:** any ported component without `className` passthrough.

## Demo: the slide's border

- **Cause:** `not ported yet`.
- **Original:** the slide box is `size-40 border border-border/60 bg-background` with the shape's container radius (`app/docs/carousel-dots/page.tsx:51-52`): the border at 60% of `--border`.
- **Port:** `borderColor: color.border` at full strength, 12% foreground rather than about 7% (`src/demos/carousel-dots.tsx:55-57`).
- **gpuix lacks:** nothing; `color.border` is an rgba token (`src/lib/theme.ts:100`, `:149`), so the 60% value needs its own token.
- **Workaround:** none.
- **Fidelity:** approximated (a stronger edge).
- **Components it hits:** just this demo.

## Demo: the label's exit uses the enter spring

- **Cause:** `not ported yet`.
- **Original:** `slideVariants`: enter at `x = dir * 24` with opacity 0, centre on `spring.moderate`, exit to `x = -dir * 24` on `spring.moderate.exit` (a 120 ms tween), `AnimatePresence mode="popLayout"` (`lib/docs/slide-direction.ts:16-18`; `page.tsx:55-64`).
- **Port:** one `transition={tween.moderate}` (the 160 ms spring) for enter and exit, with the offset moved on `left` / `right` instead of `x` (`src/demos/carousel-dots.tsx:60-89`). No `popLayout`: both labels are absolutely positioned.
- **gpuix lacks:** transforms (the `left` / `right` offset; README "Missing features" row "CSS transforms"). A per-target transition inside `exit` is not used (`tween.moderateExit` exists at `src/lib/theme.ts:444`); whether gpuix accepts one there was not checked.
- **Workaround:** `left` / `right` offsets.
- **Fidelity:** approximated (the leaving label is slower than the source's 120 ms).
- **Components it hits:** just this demo.

## Demo: direction marker listens in the bubble phase

- **Cause:** `gpuix gap` (suspected, unverified).
- **Original:** `markByHand` sets its flag in `onPointerDownCapture` and `onKeyDownCapture` on the wrapper, before the dot handles the event (`lib/docs/slide-direction.ts:36-44`).
- **Port:** `onMouseDown` / `onKeyDown` in the bubble phase (`src/demos/carousel-dots.tsx:20-27`). For a key, the dot's own `buttonProps` handler runs first and calls `click()`, which bubbles `onClick` to `onValueChange` along its path (`packages/native/js/host-runtime.ts:35-40`). If that delivery is synchronous, Enter on a back-pointing dot reads `picked = false` and the label moves forward. Space is safe (it clicks on key-up).
- **gpuix lacks:** a key capture twin: `Capture` handlers exist for pointer and mouse events (`packages/native/js/host.ts:991`); no `onKeyDownCapture` was found.
- **Workaround:** none.
- **Fidelity:** approximated (possibly wrong direction on an Enter pick).
- **Components it hits:** just this demo.

## Demo: layout and copy

- **Cause:** `port choice` (reason not stated).
- **Original:** two sections, "Static" and "Autoplay", one preview each, stacked, with prose ("Hover a dot to see its click area, then click it. The highlight glides from dot to dot." and "Add `autoplay` and the pill fills, then the next slide comes in. Hover the slide to pause. Reduced motion turns the timer off."), a code tab per preview and an API table (`app/docs/carousel-dots/page.tsx:125-147`). Both variants are present in the port.
- **Port:** one "CarouselDots" card with the two variants side by side under short captions, "Static: hover a dot to see its click area" and "Autoplay: hover the slide to pause" (`src/demos/carousel-dots.tsx:119-165`). No code tab, API table or reduced-motion remark.
- **Workaround:** n/a.
- **Fidelity:** exact for the variants; the prose is shortened.
- **Components it hits:** every demo (docs chrome).
