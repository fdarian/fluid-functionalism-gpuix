# carousel-dots

Original: `registry/default/carousel-dots.tsx`, demo in `app/docs/carousel-dots/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/carousel-dots.tsx`,
demo in `src/demos/carousel-dots.tsx`.

Ported and matching: the 6px dots and 24px pill on `moderate` (`carousel-dots.tsx:212-220`), track and fill colours (15% and 40% of foreground, `:29-30`), the 18px round click areas and 12px between dots (`:205-206`), the shared hover highlight along the x axis, the focus ring (`focusRing(0)`, README row `README.md:161`), default labels ("Go to slide N"), `role="group"` / `aria-label="Slides"`, Enter on key-down and Space on key-up through `buttonProps`, autoplay (`duration`, `paused`, `loop`, restart on every slide change, one request per slide; a pause holds the progress), a driven `progress`, and the demo's sliding label with direction, and the fill: the source's full-width pill slid in from the left by `translateX(calc((p - 1) * (100% - 6px)))`, never scaled (`carousel-dots.tsx:26-27`, `:229-244`).

## Autoplay plays a native animation, not a `requestAnimationFrame` loop

- **Cause:** `port choice` (cost: a JS frame loop redrew the window about 60 times a second for as long as a carousel was on screen; a native animation does not touch JS between frames).
- **Original:** a `requestAnimationFrame` loop advances a `MotionValue` by `dt / duration` each frame, with a 100 ms stall guard, and `useTransform(source, fillAt)` turns it into the fill's `transform`, `translateX(calc((p - 1) * (100% - 6px)))` (`carousel-dots.tsx:134-159`, `:161-162`). Pausing holds the progress.
- **Port:** the fill is a native motion value (`createMotionValue`, `carousel-dots.tsx:76`) that a `linear` `animate(1)` plays over `duration`, held with the animation's `pause()` and continued with `play()` (`:90-127`). The fill's transform is `createTransform(fill, [0, 1], [fillAt(0), fillAt(1)])` (`:129`), a native range map between the two `translateX(calc(... * (100% - 6px)))` strings that the fill's Motion `transform` binds (`:242`), so the string is blended by gpuix and no JS runs per frame. A CSS variable (`--p` through `var()`) was not used: a `--p` written from JS is a tree edit, not a patched tick, and Motion string keys do not substitute `var()` (gpuix `docs/fork/deviations.md`, "Transforms: Motion" and "a `--p` written from JS"); `x` in px from a measured width was not needed, because `100%` in a transform is the fill's own box and follows the pill while it widens. On finishing by itself, the animation's `finished` promise asks for the next slide, once (`:121-126`; gpuix resolves it only on a natural finish or `complete()`, so a stop or a jump never advances). A pause, reduced motion or a far culled region pauses the animation where it is and `play()` carries on with the time it has left; a `duration` that changes mid-slide sets the animation's `speed` (`:111`), as the source reads the duration live each frame; a new slide stops the animation and jumps the value to 0 first (`:97-101`).
- **gpuix lacks:** `requestAnimationFrame` itself (no display-synced JS frame callback, `~/code/fdarian/ghia/FORK.md:209-212`).
- **Workaround:** the native animation above. One effect owns the animation and the reset (`7d4918bb`: two order-dependent effects froze the app).
- **Fidelity:** exact in timing, in the fill's transform and in what pausing does. The source's 100 ms stall guard has no counterpart: the renderer's clock keeps counting through a stall, so the fill can be further along after one. The next slide is asked for when the completion reaches JS, a frame after the fill reaches 1.
- **Components it hits:** just this one (thinking-indicator and file-thumbnail moved to native loops too; thinking-steps still uses the shared clock).

## `progress` takes a number or an accessor, not a `MotionValue`

- **Cause:** `port choice` (reason not stated).
- **Original:** `progress?: number | MotionValue<number>`; a `MotionValue` moves the fill each frame without re-rendering (`carousel-dots.tsx:71-74`, `:161`).
- **Port:** `number | (() => number)` (`carousel-dots.tsx:54`, `:69-73`), jumped into the fill's own motion value (`:76-79`).
- **gpuix lacks:** n/a: gpuix has `createMotionValue` (`packages/solid/src/index.ts:42`), but the port does not accept a caller's.
- **Workaround:** pass a signal accessor.
- **Fidelity:** approximated (a signal write per update, not the caller's native motion value).
- **Components it hits:** just this one.

## Container and extra props

- **Cause:** `port choice` (reason not stated).
- **Original:** `relative flex w-fit items-center`, plus `className`, a `ref` and the `div`'s HTML attributes (`carousel-dots.tsx:59-60`, `:165-176`).
- **Port:** `width: "fit-content"` for `w-fit` (`carousel-dots.tsx:147`); only `testId` is accepted besides the documented props (`:47-57`).
- **Workaround:** none.
- **Fidelity:** exact for the width, in a column or a row parent; approximated for the props.
- **Components it hits:** any ported component without `className` passthrough.

## Demo: the slide's border

- **Cause:** `not ported yet`.
- **Original:** the slide box is `size-40 border border-border/60 bg-background` with the shape's container radius (`app/docs/carousel-dots/page.tsx:51-52`): the border at 60% of `--border`.
- **Port:** `borderColor: color.border` at full strength, 12% foreground rather than about 7% (`src/demos/carousel-dots.tsx:55-57`).
- **gpuix lacks:** nothing; `color.border` is an rgba token (`src/lib/theme.ts:94`, `:142`), so the 60% value needs its own token.
- **Workaround:** none.
- **Fidelity:** approximated (a stronger edge).
- **Components it hits:** just this demo.

## Demo: the label is not popped out of layout

- **Cause:** `port choice`.
- **Original:** `slideVariants`: enter at `x = dir * 24` with opacity 0, centre on `spring.moderate`, exit to `x = -dir * 24` on `spring.moderate.exit` (a 120 ms tween), `AnimatePresence mode="popLayout"` (`lib/docs/slide-direction.ts:16-18`; `page.tsx:55-64`).
- **Port:** the same `x` and `exit` transition (`src/demos/carousel-dots.tsx:63-77`). No `popLayout`: both labels are absolutely positioned over the whole frame.
- **Workaround:** absolute positioning.
- **Fidelity:** exact.
- **Components it hits:** just this demo.

## Demo: direction marker listens in the bubble phase

- **Cause:** `gpuix gap` (suspected, unverified).
- **Original:** `markByHand` sets its flag in `onPointerDownCapture` and `onKeyDownCapture` on the wrapper, before the dot handles the event (`lib/docs/slide-direction.ts:36-44`).
- **Port:** `onMouseDown` / `onKeyDown` in the bubble phase (`src/demos/carousel-dots.tsx:20-27`). For a key, the dot's own `buttonProps` handler runs first and calls `click()`, which bubbles `onClick` to `onValueChange` along its path (`packages/native/js/host-runtime.ts:35-40`). If that delivery is synchronous, Enter on a back-pointing dot reads `picked = false` and the label moves forward. Space is safe (it clicks on key-up).
- **gpuix lacks:** a key capture twin: `Capture` handlers exist for pointer and mouse events (`packages/native/js/host.ts:1147`); no `onKeyDownCapture` was found.
- **Workaround:** none.
- **Fidelity:** approximated (possibly wrong direction on an Enter pick).
- **Components it hits:** just this demo.

## Demo: layout and copy

- **Cause:** `port choice` (reason not stated).
- **Original:** two sections, "Static" and "Autoplay", one preview each, stacked, with prose ("Hover a dot to see its click area, then click it. The highlight glides from dot to dot." and "Add `autoplay` and the pill fills, then the next slide comes in. Hover the slide to pause. Reduced motion turns the timer off."), a code tab per preview and an API table (`app/docs/carousel-dots/page.tsx:125-147`). Both variants are present in the port.
- **Port:** one "CarouselDots" card with the two variants side by side under short captions, "Static: hover a dot to see its click area" and "Autoplay: hover the slide to pause" (`src/demos/carousel-dots.tsx:120-165`). No code tab, API table or reduced-motion remark.
- **Workaround:** n/a.
- **Fidelity:** exact for the variants; the prose is shortened.
- **Components it hits:** every demo (docs chrome).
