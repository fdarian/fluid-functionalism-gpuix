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
- **Port:** same timings and curve, on `top` in pixels (`thinking-indicator.tsx:208-235`, `:287-314`).
- **gpuix lacks:** translate (README "gpuix gaps", CSS transforms row), so the roll moves a layout edge. `%` insets in `motion` exist now (`~/code/fdarian/gpuix/FORK.md:1237-1243`) and `top: "80%"` would resolve against the 20px cell, the same 16px as `ROLL`; the port has not switched.
- **Workaround:** the words and a hidden copy of the longest word, which reserves the width (`:294-299`), share one cell of a `display: grid`, `overflow: hidden` slot with no `position` of its own (`:287-292`). A word moves on `top`, 80% of the 20px line (`ROLL`, `:208`; `RollingWord`, `:221-235`), and is always `position: relative`, which `top` needs to move it. It used to be `relative` only while it entered or exited (`onMotionComplete`, `useIsPresent()`, an `entersAtRest` flag), because a positioned ancestor made gpui decline the shimmer letters' colour ticks and draw the whole page on every tick (`~/.claude/notes/ff-gpuix-repros/r18-positioned-ancestor-declines-unit.md`); gpuix #75 (c6475390, `~/code/fdarian/gpuix/FORK.md:3559`) patches a loop under a positioned ancestor, so the toggle is gone (e99b0655) and the page patches 62.0 shimmer ticks a second with the word `relative` at rest. `transition` is switched on `useIsPresent()` (`:229`) so the exiting word takes the 0.16s tween. Each word is a fresh element (`<Show keyed>`, `:309`) because Solid's `AnimatePresence` tracks elements, not keys.
- **Fidelity:** exact for the visible result. `top` re-lays out per frame where a translate would not, and gpuix draws a layout tick whole (`LayoutAnimation`, `~/code/fdarian/gpuix/FORK.md:3613-3614`): the roll is ~5 whole frames a second on showcase, queued-stack and thinking-indicator (headless on c6475390, README "Missing features", [CSS transforms](../README.md#missing-features) row), while the shimmer ticks around it are patches.
- **Components it hits:** queued-stack (a card's `y` is likewise a `bottom` offset), mobile-drawer.

## Shimmer is painted one letter at a time

- **Cause:** `gpuix gap`. gpuix has `backgroundClip: "text"` over a gradient on a block (`~/code/fdarian/gpuix/README.md:6105-6112`, `FORK.md:786`), but no animated `background-position`: it is not in `MotionStyleTargets` (`packages/native/js/host.ts:123`), and a position string rewritten from JS would be a redraw per tick.
- **Original:** `.shimmer-text` is `color: transparent` over a 300%-wide `linear-gradient` clipped to the glyphs, sweeping `background-position` 0% to 100% every 1.5s `ease-in-out`, with `light-dark()` colour pairs (`globals.css:980-994`; used at `thinking-indicator.tsx:112`, `:116`, `:127`). The gradient box is the element's box: in the indicator that is the grid cell, as wide as the longest word ("Moonwalking"), for every word. No reduced-motion rule names it (`globals.css:1051`, `:1081` do not), so it keeps sweeping.
- **Port:** `Shimmer` splits the string into one `<text>` per letter in a flex row. Each letter plays its own native CSS animation, `ff-shimmer-<letters>-<index>-<colours> 1.5s linear infinite` (`thinking-indicator.tsx:119-149`). Its keyframes (`shimmerKeyframes`, `:81-108`, defined once per letter count, index and theme) are the colour the gradient shows at `(index + 0.5) / letterCount` of the text: 41 even samples of the cycle with the source's ease-in-out applied in the sampling, plus the three corners of the band (35%, 50%, 65%) so the ramps stay straight. No JS runs per frame. It plays whether or not it is on screen: off screen, the page's culling (`content-visibility: hidden`, README's culling row) lets gpuix put it to sleep (Round 18, #97). Reduced motion is not honoured, as in the source. `scripts/check-thinking-indicator.tsx` reads the sweep from captured pixels.
- **Workaround:** per-letter colour keyframes, as above. Each letter is its own native loop, so every shimmer on screen is exposed to the per-tick cost in README's "gpuix gaps", Bugs table, where its colour ticks are patches since gpuix Round 14a (c6475390) and a shimmer left running off screen still costs ~3.5% CPU in the dormant-tick row.
- **Fidelity:** approximated. Colour steps per letter instead of a smooth gradient. No kerning between letters, so a word is slightly wider than in the source (the hidden longest-word copy at `:294-299` too, as its comment says). The band is placed by letter count, not by glyph advance, and over the text width rather than the cell width, so a short word ("Thinking") is crossed at different positions than in the source. A space is a no-break space to keep its width (`:124-126`). A loop starts when its element mounts, as in the source, so each new word restarts the sweep. The hidden copy that reserves the width is `still` and plays nothing.
- **Components it hits:** thinking-steps (the active step label, via the same `Shimmer`).

## No `size` prop, `className`, `ref` or HTML attributes

- **Cause:** `not ported yet`. `banner.tsx:139` shows the port can take a `size` prop.
- **Original:** `size?: SizeVariant` picks the compact step (glyph 18px, body text 12/18 instead of 13/20) and wins over `SizeProvider`; `className`, `ref` and `HTMLAttributes<HTMLDivElement>` pass through to the root (`thinking-indicator.tsx:26-36`, `:64-65`, `:102`).
- **Port:** one size: glyph 20 (`:284`), `scale.body` text (`:232`, `:296`). Props are `showIcon` and `testId` only (`:242-245`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** thinking-steps (also no `size`).

## Screen reader text

- **Cause:** `port choice` (reason not stated).
- **Original:** `role="status"` holds an `sr-only` "Thinking…" and the cycling label is `aria-hidden`, so a screen reader hears one announcement (`thinking-indicator.tsx:57-60`, `:99`).
- **Port:** `role="status"` with `aria-label="Thinking…"` and no hidden text (`thinking-indicator.tsx:258-259`).
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
