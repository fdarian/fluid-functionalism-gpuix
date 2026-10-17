# thinking-indicator

Original: `registry/default/thinking-indicator.tsx` plus `.shimmer-text` in `app/globals.css:969-994`, demo in `app/docs/thinking-indicator/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/thinking-indicator.tsx`,
demo in `src/demos/thinking-indicator.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## `y: "80%"` words roll on `top`

- **Cause:** `gpuix gap`.
- **Original:** words enter `y: "80%" -> 0` over 0.24s and leave `y: 0 -> "-80%"` over 0.16s, both `[0.4, 0, 0.2, 1]`, inside an `overflow-hidden` grid cell under `AnimatePresence mode="popLayout"` (`thinking-indicator.tsx:124-134`).
- **Port:** same timings and curve, on `top` in pixels (`thinking-indicator.tsx:187-211`, `:261-265`).
- **gpuix lacks:** translate (README "gpuix gaps", CSS transforms row), and `%` for insets in `motion` (`~/code/fdarian/gpuix/FORK.md:925-926`; README row for thinking-indicator).
- **Workaround:** the words are absolutely positioned in a relatively positioned, `overflow: hidden` cell and move on `top`, 80% of the 20px line (`ROLL`, `:187`; `RollingWord`, `:199-211`). `transition` is switched on `useIsPresent()` so the exiting word takes the 0.16s tween. A hidden copy of the longest word reserves the width (`:257-261`). Each word is a fresh element (`<Show keyed>`) because Solid's `AnimatePresence` tracks elements, not keys.
- **Fidelity:** exact for the visible result. `top` re-lays out per frame where a translate would not.
- **Components it hits:** queued-stack (a card's `y` is likewise a `bottom` offset), mobile-drawer.

## Shimmer is painted one letter at a time

- **Cause:** `not ported yet`. gpuix has `backgroundClip: "text"` over a gradient on a block (`~/code/fdarian/gpuix/README.md:5078-5083`, `FORK.md:782`) and CSS `animation` with `defineKeyframes` (`packages/native/js/host.ts:744`); `backgroundPosition` is not in `MotionStyleTargets` (`host.ts:87`), but a clock-driven `backgroundPosition` string would do. The port's comment that gpuix cannot clip a background to text (`thinking-indicator.tsx:63-67`) is out of date.
- **Original:** `.shimmer-text` is `color: transparent` over a 300%-wide `linear-gradient` clipped to the glyphs, sweeping `background-position` 0% to 100% every 1.5s `ease-in-out`, with `light-dark()` colour pairs (`globals.css:980-994`; used at `thinking-indicator.tsx:112`, `:116`, `:127`). The gradient box is the element's box: in the indicator that is the grid cell, as wide as the longest word ("Moonwalking"), for every word.
- **Port:** `Shimmer` splits the string into one `<text>` per letter in a flex row, and each letter takes the gradient colour at `(index + 0.5) / letterCount` of the text, recomputed from the JS clock (`thinking-indicator.tsx:62-111`).
- **Workaround:** per-letter colour, as above.
- **Fidelity:** approximated. Colour steps per letter instead of a smooth gradient. No kerning between letters, so a word is slightly wider than in the source (the hidden longest-word copy at `:257-261` too, as its comment says). The band is placed by letter count, not by glyph advance, and over the text width rather than the cell width, so a short word ("Thinking") is crossed at different positions than in the source. A space is a no-break space to keep its width (`:71-73`).
- **Components it hits:** thinking-steps (the active step label, via the same `Shimmer`).

## Loops run on a JS clock

- **Cause:** `not ported yet`. gpuix has keyframes with `times`, `repeat` and `repeatType` (`host.ts:177-201`, `FORK.md:1140`) and `d` morphs on `motion.path` when the commands match, which they do here (`host.ts:262-322`; `FORK.md:1147-1148`). The port's "gpuix has no keyframes and no repeat" comment (`thinking-indicator.tsx:17-20`) is out of date.
- **Original:** the glyph is `motion.path` with `d` keyframes `[circleA, infinity, circleB, infinity, circleA]`, `times [0, .25, .5, .75, 1]`, 6s `easeInOut`, `repeat: Infinity` (`thinking-indicator.tsx:78-92`). The shimmer is a CSS animation (`globals.css:993`). The label moves on a 4000ms `setInterval` (`:42-48`). Each loop starts when the element mounts.
- **Port:** `useClock` ticks a shared signal about every 33ms (`FRAME_MS`, `thinking-indicator.tsx:14`, `:21-33`). The glyph path is recomputed and re-defined as a new SVG source each tick (`morphedPath`, `:142-165`; `MorphingGlyph`, `:167-180`), the shimmer recolours each letter, and the word index advances on `onFrame` (`:223-230`).
- **Workaround:** the frame clock `src/lib/clock.ts`. The path is quantised to whole 33ms frames so GPUI's SVG cache (keyed by the bytes) holds one raster per frame of the loop, about 182 (`:169-171`).
- **Fidelity:** approximated. The glyph moves in 33ms steps, not per display frame. The loop phase comes from the app's clock, not from mount, so every shimmer and glyph is in lockstep and a freshly mounted one starts mid-loop. Each `useClock` caller subscribes separately and writes the one shared signal, so with several shimmers on screen it fires more often than every 33ms (by reading, not measured).
- **Components it hits:** thinking-steps (shimmer); file-thumbnail and carousel-dots use the same clock.

## No `size` prop, `className`, `ref` or HTML attributes

- **Cause:** `not ported yet`. `banner.tsx:139` shows the port can take a `size` prop.
- **Original:** `size?: SizeVariant` picks the compact step (glyph 18px, body text 12/18 instead of 13/20) and wins over `SizeProvider`; `className`, `ref` and `HTMLAttributes<HTMLDivElement>` pass through to the root (`thinking-indicator.tsx:26-36`, `:64-65`, `:102`).
- **Port:** one size: glyph 20 (`:248`), `scale.body` text (`:209`, `:254`). Props are `showIcon` and `testId` only (`:219-222`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** thinking-steps (also no `size`).

## Screen reader text

- **Cause:** `port choice` (reason not stated).
- **Original:** `role="status"` holds an `sr-only` "Thinking…" and the cycling label is `aria-hidden`, so a screen reader hears one announcement (`thinking-indicator.tsx:57-60`, `:99`).
- **Port:** `role="status"` with `aria-label="Thinking…"` and no hidden text (`thinking-indicator.tsx:233-234`).
- **Workaround:** the label stands in for the hidden span.
- **Fidelity:** approximated (same words; the cycling words are not marked hidden).
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `port choice` (reason not stated).
- **Original:** one section, "Basic", `<ThinkingIndicator />`, plus a props table (`app/docs/thinking-indicator/page.tsx:24-32`). `showIcon={false}` appears only in the props table.
- **Port:** "Basic" and an added "Text only" row with `showIcon={false}` (`src/demos/thinking-indicator.tsx:12-17`).
- **Workaround:** none.
- **Fidelity:** exact for Basic; "Text only" is port-only.
- **Components it hits:** just this one.
