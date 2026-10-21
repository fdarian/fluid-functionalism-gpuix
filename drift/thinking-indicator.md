# thinking-indicator

Original: `registry/default/thinking-indicator.tsx` plus `.shimmer-text` in `app/globals.css:969-994`, demo in `app/docs/thinking-indicator/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/thinking-indicator.tsx`,
demo in `src/demos/thinking-indicator.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## `y: "80%"` words roll on `top`

- **Cause:** `gpuix gap`.
- **Original:** words enter `y: "80%" -> 0` over 0.24s and leave `y: 0 -> "-80%"` over 0.16s, both `[0.4, 0, 0.2, 1]`, inside an `overflow-hidden` grid cell under `AnimatePresence mode="popLayout"` (`thinking-indicator.tsx:124-134`).
- **Port:** same timings and curve, on `top` in pixels (`thinking-indicator.tsx:213-252`, `:307-336`).
- **gpuix lacks:** translate (README "gpuix gaps", CSS transforms row), so the roll moves a layout edge. `%` insets in `motion` exist now (`~/code/fdarian/gpuix/FORK.md:1237-1243`) and `top: "80%"` would resolve against the 20px cell, the same 16px as `ROLL`; the port has not switched.
- **Workaround:** the words and a hidden copy of the longest word, which reserves the width (`:314-319`), share one cell of a `display: grid`, `overflow: hidden` slot with no `position` of its own (`:307-312`). A word moves on `top`, 80% of the 20px line (`ROLL`, `:213`; `RollingWord`, `:224-252`), and is `position: relative` only while it enters or exits: `onMotionComplete` ends the enter, `useIsPresent()` starts the exit. At rest it is static, and `top: 0` is its place anyway. A positioned ancestor would make gpui decline the shimmer letters' colour ticks, drawing the whole page on every tick instead of patching it (`~/.claude/notes/ff-gpuix-repros/r18-positioned-ancestor-declines-unit.md`). The first word skips its enter (`AnimatePresence initial={false}`), which reports no completion, so it starts at rest (`entersAtRest`, `:259-275`). `transition` is switched on `useIsPresent()` so the exiting word takes the 0.16s tween. Each word is a fresh element (`<Show keyed>`) because Solid's `AnimatePresence` tracks elements, not keys.
- **Fidelity:** exact for the visible result. `top` re-lays out per frame where a translate would not.
- **Components it hits:** queued-stack (a card's `y` is likewise a `bottom` offset), mobile-drawer.

## Shimmer is painted one letter at a time

- **Cause:** `gpuix gap`. gpuix has `backgroundClip: "text"` over a gradient on a block (`~/code/fdarian/gpuix/README.md:6105-6112`, `FORK.md:786`), but no animated `background-position`: it is not in `MotionStyleTargets` (`packages/native/js/host.ts:123`), and a position string rewritten from JS would be a redraw per tick.
- **Original:** `.shimmer-text` is `color: transparent` over a 300%-wide `linear-gradient` clipped to the glyphs, sweeping `background-position` 0% to 100% every 1.5s `ease-in-out`, with `light-dark()` colour pairs (`globals.css:980-994`; used at `thinking-indicator.tsx:112`, `:116`, `:127`). The gradient box is the element's box: in the indicator that is the grid cell, as wide as the longest word ("Moonwalking"), for every word. No reduced-motion rule names it (`globals.css:1051`, `:1081` do not), so it keeps sweeping.
- **Port:** `Shimmer` splits the string into one `<text>` per letter in a flex row. Each letter plays its own native CSS animation, `ff-shimmer-<letters>-<index>-<colours> 1.5s linear infinite` (`thinking-indicator.tsx:119-150`). Its keyframes (`shimmerKeyframes`, `:81-108`, defined once per letter count, index and theme) are the colour the gradient shows at `(index + 0.5) / letterCount` of the text: 41 even samples of the cycle with the source's ease-in-out applied in the sampling, plus the three corners of the band (35%, 50%, 65%) so the ramps stay straight. No JS runs per frame. While the shimmer is culled (`useOnScreen`, `src/lib/cull.ts`) its letters carry no animation. Reduced motion is not honoured, as in the source. `scripts/check-thinking-indicator.tsx` reads the sweep from captured pixels.
- **Workaround:** per-letter colour keyframes, as above. Each letter is its own native loop, so every shimmer on screen is exposed to the frame-loop starvation in README's "gpuix gaps", Bugs table.
- **Fidelity:** approximated. Colour steps per letter instead of a smooth gradient. No kerning between letters, so a word is slightly wider than in the source (the hidden longest-word copy at `:314-319` too, as its comment says). The band is placed by letter count, not by glyph advance, and over the text width rather than the cell width, so a short word ("Thinking") is crossed at different positions than in the source. A space is a no-break space to keep its width (`:125-127`). A loop starts when its element mounts, as in the source, so each new word restarts the sweep. The hidden copy that reserves the width is `still` and plays nothing.
- **Components it hits:** thinking-steps (the active step label, via the same `Shimmer`).

## No `size` prop, `className`, `ref` or HTML attributes

- **Cause:** `not ported yet`. `banner.tsx:139` shows the port can take a `size` prop.
- **Original:** `size?: SizeVariant` picks the compact step (glyph 18px, body text 12/18 instead of 13/20) and wins over `SizeProvider`; `className`, `ref` and `HTMLAttributes<HTMLDivElement>` pass through to the root (`thinking-indicator.tsx:26-36`, `:64-65`, `:102`).
- **Port:** one size: glyph 20 (`:304`), `scale.body` text (`:249`, `:316`). Props are `showIcon` and `testId` only (`:259-262`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** thinking-steps (also no `size`).

## Screen reader text

- **Cause:** `port choice` (reason not stated).
- **Original:** `role="status"` holds an `sr-only` "Thinking…" and the cycling label is `aria-hidden`, so a screen reader hears one announcement (`thinking-indicator.tsx:57-60`, `:99`).
- **Port:** `role="status"` with `aria-label="Thinking…"` and no hidden text (`thinking-indicator.tsx:278-279`).
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
