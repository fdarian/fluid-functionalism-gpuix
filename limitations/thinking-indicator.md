# thinking-indicator

Original: `registry/default/thinking-indicator.tsx` plus `.shimmer-text` in `app/globals.css`. Ported in `src/components/thinking-indicator.tsx`, demo in `src/demos/thinking-indicator.tsx`.

Transforms are already a known gap and are not repeated here. This component is the main probe for gpuix's looping animation limits.

## No keyframes, no repeat, no path morph

- **Original:** one `<motion.path>` animates `d` through five keyframes (`circleA, infinity, circleB, infinity, circleA`) over 6s with `times`, `easeInOut` between each pair and `repeat: Infinity`.
- **gpuix lacks:** keyframe arrays, `repeat`, and animating anything but `width` / `height` / `opacity` / `top` / `right` / `bottom` / `left` / `borderRadius` (`packages/native/js/host.ts:27`, `MotionStyle`). `README.md:1101`: "Keyframes, variants, and shared layout animations are not available yet." A native track runs to one target and settles. Missing feature.
- **Workaround:** a shared JS clock (`setInterval`, 33 ms) that every looping thing subscribes to. The glyph's path is interpolated in JS (same easeInOut cubic-bezier, 1.5s per segment) and written as a new `<svg source>` string every frame. The clock only runs while something is mounted.
- **Fidelity:** approximated. About 30 steps a second on the JS thread instead of the native frame pump, each frame a new SVG string for GPUI to parse and rasterise. GPUI caches the mask in its sprite atlas under a hash of the bytes (`zed/crates/gpui/src/elements/svg.rs:53`), so a path that varies continuously would add a tile per frame and never reuse one; the port quantises the time to whole frames so the loop repeats about 180 distinct strings. The motion is visually right; it costs CPU while it runs, and it stalls with the JS thread.
- **Components it hits:** file-thumbnail (spinner), thinking-steps (shimmer, and the chevron's rotation by the same SVG rewrite).

## No gradient-clipped text (shimmer)

- **Original:** `.shimmer-text`: `color: transparent` over a 5-stop 300%-wide `linear-gradient`, `background-clip: text`, `background-position` animated 0% to 100% every 1.5s with `ease-in-out`.
- **gpuix lacks:** a text fill other than a flat `color`; no `background-clip: text`. `LinearGradientBackground` takes exactly two stops (`host.ts:159`) and paints behind an element, not through glyphs. Missing feature.
- **Workaround:** one `<text>` per letter in a flex row. Each frame the JS clock evaluates the gradient (stops at 0, 35, 50, 65, 100%, the sweep eased with the same bezier) at that letter's position and sets its `color`.
- **Fidelity:** approximated. The band steps per letter instead of per pixel. Kerning between letters is lost, and the summed advances are wider than the whole string, so a slot that reserves width for the longest word must reserve it as letters too. A word costs one text node per letter, all restyled at 30 fps.
- **Components it hits:** thinking-steps (active step label).

## `y: "80%"` and a different transition for exit

- **Original:** words enter `y: "80%" -> 0` over 0.24s and leave `y: 0 -> "-80%"` over 0.16s, each with its own ease, inside an `overflow-hidden` grid cell, using `AnimatePresence mode="popLayout"`.
- **gpuix lacks:** percentage targets and translates (`MotionStyle` numbers only), one `transition` for the whole `motion.div` rather than one per target (`host.ts:98-103`, `MotionProps`), and a `popLayout` mode: an exiting node stays in flow until it is gone.
- **Workaround:** the words are absolutely positioned in a relatively positioned, `overflow: hidden` cell and move on `top` in pixels (80% of the 20px line). The `transition` prop is switched on `useIsPresent()` so the exiting word uses the 0.16s tween. A hidden copy of the longest word reserves the width. Each word is a fresh element (`<Show keyed>`) because Solid's `AnimatePresence` tracks elements, not keys.
- **Fidelity:** exact for the visible result. `top` re-lays out per frame where a translate would not.
- **Components it hits:** queued-stack (a card's `y` is likewise a `bottom` offset).

## `useReducedMotion`

- **Original:** the loop and the cycling stop under `prefers-reduced-motion`.
- **gpuix lacks:** any read of the OS accessibility settings.
- **Workaround:** none; the indicator always animates.
- **Fidelity:** dropped.
- **Components it hits:** thinking-steps (shimmer), and any component with a loop.
