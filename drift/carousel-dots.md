# carousel-dots

Original: `registry/default/carousel-dots.tsx`, demo in `app/docs/carousel-dots/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/carousel-dots.tsx`,
demo in `src/demos/carousel-dots.tsx`.

Ported and matching: the 6px dots and 24px pill on `moderate` (`carousel-dots.tsx:187-197`), track and fill colours (15% and 40% of foreground, `:25-26`), the 18px round click areas and 12px between dots (`:180`), the shared hover highlight along the x axis, the focus ring (`focusRing(0)`, README row `README.md:161`), default labels ("Go to slide N"), `role="group"` / `aria-label="Slides"`, Enter on key-down and Space on key-up through `buttonProps`, autoplay (`duration`, `paused`, `loop`, restart on every slide change, one request per slide; a pause holds the progress), a driven `progress`, and the demo's sliding label with direction.

## Autoplay plays a native animation on the width, not a `requestAnimationFrame` loop on a transform

- **Cause:** `port choice` (cost: a JS frame loop redrew the window about 60 times a second for as long as a carousel was on screen; a native animation does not touch JS between frames).
- **Original:** a `requestAnimationFrame` loop advances a `MotionValue` by `dt / duration` each frame, with a 100 ms stall guard, and the fill's `transform` follows it (`carousel-dots.tsx:134-159`, `:161-162`). Pausing holds the progress.
- **Port:** the fill is a native motion value (`createMotionValue`, `carousel-dots.tsx:72`) that a `linear` `animate(1)` plays over `duration` (`:82-100`); `createTransform` maps it to the fill's `width` (`:102`, `:207`). On finishing by itself, the animation's `finished` promise asks for the next slide, once (`:93-98`; gpuix resolves it only on a natural finish or `complete()`, so a stop or a jump never advances). A pause, reduced motion or a far culled region stops the animation where it is and plays on from that value with the time left, so the progress is kept; a new slide jumps the value to 0 first (`:82-85`).
- **gpuix lacks:** `requestAnimationFrame` itself (no display-synced JS frame callback, `~/code/fdarian/gpuix/FORK.md:209-212`). A motion value's animation does have playback controls now (`animate()` returns Motion's, with `pause()` and `play()`), so a pause is no longer a gap.
- **Workaround:** the fill is still stopped and a new linear `animate()` plays from the current value with the time left, by choice rather than need: it keeps restart and play in the one effect (`7d4918bb`: two order-dependent effects froze the app), and because the ease is linear, restarting from the current value is exact.
- **Fidelity:** exact in timing and in what pausing does. The source's 100 ms stall guard has no counterpart: the renderer's clock keeps counting through a stall, so the fill can be further along after one. The next slide is asked for when the completion reaches JS, a frame after the fill reaches 1.
- **Components it hits:** just this one (thinking-indicator and file-thumbnail moved to native loops too; thinking-steps still uses the shared clock).

## The fill grows instead of sliding

- **Cause:** `gpuix gap` (no transforms; README "Missing features" row "CSS transforms").
- **Original:** the fill is a full-width pill slid in from the left with `translateX(calc((p - 1) * (100% - 6px)))`, never scaled, so its round end stays round and it tracks the pill's animating width (`carousel-dots.tsx:42-48`, `:236-242`).
- **Port:** a pill whose `width` goes from 6px to the 24px target, clipped by the dot's `overflow: hidden` (`carousel-dots.tsx:199-213`).
- **gpuix lacks:** CSS transforms.
- **Workaround:** the same silhouette at rest and at every `p` once the dot has finished widening.
- **Fidelity:** approximated. During the 160 ms width spring the port sizes the fill from the 24px target, not the animating width; autoplay restarts at `p = 0` there, so it is hard to see.
- **Components it hits:** just this one.

## `progress` takes a number or an accessor, not a `MotionValue`

- **Cause:** `port choice` (reason not stated).
- **Original:** `progress?: number | MotionValue<number>`; a `MotionValue` moves the fill each frame without re-rendering (`carousel-dots.tsx:71-74`, `:161`).
- **Port:** `number | (() => number)` (`carousel-dots.tsx:50`, `:65-69`), jumped into the fill's own motion value (`:73-75`).
- **gpuix lacks:** n/a: gpuix has `createMotionValue` (`packages/solid/src/index.ts:42`), but the port does not accept a caller's.
- **Workaround:** pass a signal accessor.
- **Fidelity:** approximated (a signal write per update, not the caller's native motion value).
- **Components it hits:** just this one.

## Container and extra props

- **Cause:** `port choice` (reason not stated).
- **Original:** `relative flex w-fit items-center`, plus `className`, a `ref` and the `div`'s HTML attributes (`carousel-dots.tsx:59-60`, `:165-176`).
- **Port:** `width: "fit-content"` for `w-fit` (`carousel-dots.tsx:120`); only `testId` is accepted besides the documented props (`:43-52`).
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

## Demo: the label's exit uses the enter spring

- **Cause:** `not ported yet`.
- **Original:** `slideVariants`: enter at `x = dir * 24` with opacity 0, centre on `spring.moderate`, exit to `x = -dir * 24` on `spring.moderate.exit` (a 120 ms tween), `AnimatePresence mode="popLayout"` (`lib/docs/slide-direction.ts:16-18`; `page.tsx:55-64`).
- **Port:** one `transition={tween.moderate}` (the 160 ms spring) for enter and exit, with the offset moved on `left` / `right` instead of `x` (`src/demos/carousel-dots.tsx:60-89`). No `popLayout`: both labels are absolutely positioned.
- **gpuix lacks:** transforms (the `left` / `right` offset; README "Missing features" row "CSS transforms"). A per-target transition inside `exit` is not used (`tween.moderateExit` exists at `src/lib/theme.ts:476`); whether gpuix accepts one there was not checked.
- **Workaround:** `left` / `right` offsets.
- **Fidelity:** approximated (the leaving label is slower than the source's 120 ms).
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
