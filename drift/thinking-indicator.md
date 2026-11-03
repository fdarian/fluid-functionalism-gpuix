# thinking-indicator

Original: `registry/default/thinking-indicator.tsx` plus `.shimmer-text` in `app/globals.css:969-994`, demo in `app/docs/thinking-indicator/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/thinking-indicator.tsx`,
demo in `src/demos/thinking-indicator.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## Shimmer is painted one letter at a time

- **Cause:** `gpuix gap`. gpuix has `backgroundClip: "text"` over a gradient on a block (`~/code/fdarian/ghia/README.md:6105-6112`, `FORK.md:786`), but no animated `background-position`: it is not in `MotionStyleTargets` (`packages/native/js/host.ts:123`), and a position string rewritten from JS would be a redraw per tick.
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
