# thinking-steps

Original: `registry/base/thinking-steps.tsx` (Base UI `Collapsible`), demo in `app/docs/thinking-steps/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/thinking-steps.tsx`,
demo in `src/demos/thinking-steps.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## Chevron rotation

- **Cause:** `gpuix gap`.
- **Original:** `motion.span animate={{ rotate: open ? 90 : 0 }}` with `spring.fast` (0.08s, no bounce) (`thinking-steps.tsx:112-125`).
- **Port:** `Chevron` rotates the path's own points (`chevronPath`) from a 100ms ease-out on the shared frame clock and draws them through `Icon easeStroke` (`thinking-steps.tsx:59-104`).
- **gpuix lacks:** rotation (README "gpuix gaps", CSS transforms row; no `transform`, `~/code/fdarian/gpuix/FORK.md:876`). `motion.path` animates `d`, `strokeWidth` and the other shape attributes but not a `transform` (`packages/native/js/host.ts:292-322`).
- **Workaround:** the points are rotated in JS, whole degrees, and redrawn as shapes (no SVG source per angle). The effect reads `angle()` inside `createEffect` (`:84`), so by reading it re-subscribes after every step and restarts the tween from the current angle; the move is then closer to an exponential ease-out than to a 100ms cubic, with a final snap when the original 100ms elapses.
- **Fidelity:** approximated. A tween rather than the critically damped spring, driven from JS.
- **Components it hits:** any disclosure chevron (accordion, card, color-picker); file-thumbnail's spinner uses the same SVG-rewrite technique.

## `scale` and `filter: blur` entrances

- **Cause:** `gpuix gap`.
- **Original:** sources enter `opacity 0, scale .85, blur(4px)` on `spring.moderate` with the blur on its own 0.12s transition (`thinking-steps.tsx:541-557`); images enter `opacity 0, blur(4px)`, opacity 0.2s `easeOut`, blur 0.15s (`:570-583`).
- **Port:** opacity only, with the same delays and the same opacity transitions (`ThinkingStepSource`, `thinking-steps.tsx:542-558`; `ThinkingStepImage`, `:555-607`, motion at `:565-570`).
- **gpuix lacks:** scale (the known transform gap), and an animatable `filter`: `filter: "blur(4px)"` paints as a static style, but `filter` is not among `MotionStyleTargets` (`packages/native/js/host.ts:87`), so it cannot be tweened.
- **Workaround:** none beyond opacity.
- **Fidelity:** approximated (the blur-to-sharp reveal and the pop are dropped).
- **Components it hits:** just this one (scale-in entrances elsewhere are listed in the README row).

## Variable font weight

- **Cause:** `gpuix gap`.
- **Original:** the trigger label eases between weight 400 and 550 over 80ms, and step labels are 550 (`thinking-steps.tsx:98-105`, `:444`).
- **Port:** the weight switches at once, SemiBold 600 for 550 (`StableLabel`, `src/lib/stable-label.tsx`; `thinking-steps.tsx:156-160`, `:336`).
- **gpuix lacks:** variable-font axes. See the README "gpuix gaps" row "Variable-font axes".
- **Workaround:** static cuts; a hidden semibold copy reserves the width.
- **Fidelity:** approximated.
- **Components it hits:** every `StableLabel` (tabs, tabs-subtle, sidebar, menu rows), card, table, banner.

## Hover background exit

- **Cause:** `not ported yet`. `motion.fastExit` (0.06s) exists (`src/lib/theme.ts:455`).
- **Original:** the trigger's hover background fades in over 0.08s and out with `spring.fast.exit`, 0.06s (`thinking-steps.tsx:65-75`).
- **Port:** one `transition={{ duration: 0.08 }}` serves both (`thinking-steps.tsx:114-132`, `:120`), so the exit is 20ms slower.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** any component that copied the same hover layer.

## A panel mounted open snaps for 100 ms after its first measure

- **Cause:** `gpuix gap` for the timer (no `requestAnimationFrame`; see the README row on `requestAnimationFrame`). The panel itself arrives at full height from the first frame.
- **Original:** a panel open at mount renders `initial={{ height: "auto" }}`, takes its measured pixel height with `duration: 0` and clears the snap one `requestAnimationFrame` after the first measure (`thinking-steps.tsx:160-163`, `:187-193`, `:221-228`).
- **Port:** the same: `initial={false}` with an `auto` target until `onLayout` reports a height, then the measured number on `tween.snap`, cleared by a 100 ms timer after that report (`Collapse` in `src/components/thinking-steps.tsx`). A toggle within 100 ms of the first report snaps instead of springing. `scripts/check-thinking-steps.tsx` samples the panel from the first frame.
- **Workaround:** `setTimeout`.
- **Fidelity:** approximated (the snap window is 100 ms, not one frame).
- **Components it hits:** accordion (same measured-height pattern).

## Closed panel is `inert`, not `hidden`

- **Cause:** `not ported yet`. gpuix has `display: none` (`FORK.md:564`; `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:107`). The port's comment that gpuix has no `display: none` (`thinking-steps.tsx:205`) is out of date.
- **Original:** the panel gets `hidden` once the exit animation finishes (`thinking-steps.tsx:195-218`).
- **Port:** height 0, `overflow: hidden`, and `inert` the moment `open` goes false (`thinking-steps.tsx:199-219`). A closed panel's content is still laid out each frame, and is out of the accessibility tree from the start of the exit rather than the end.
- **Workaround:** `inert`.
- **Fidelity:** exact visually; the accessibility tree changes sooner.
- **Components it hits:** accordion (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md:52`).

## Shimmer on the active step label

- **Cause:** `not ported yet` (same as the indicator's shimmer; see `drift/thinking-indicator.md`).
- **Original:** the active label span is `shimmer-text` and gets `…` appended; as a flex-column child it stretches to the whole text column, so the 300%-wide gradient is laid over the column, not the text (`thinking-steps.tsx:438-447`).
- **Port:** the shared per-letter `Shimmer`, positioned over the text only (`thinking-steps.tsx:434-443`).
- **Workaround:** none.
- **Fidelity:** approximated. Letter steps, no kerning, and the band crosses the label at different positions than in the source.
- **Components it hits:** thinking-indicator.

## Image box is sized outright

- **Cause:** `not ported yet`. An `<img>` with a `%` width or `maxWidth` gets its height from its intrinsic ratio, and `onLoad` reports `naturalWidth` / `naturalHeight` (`~/code/fdarian/gpuix/FORK.md:592`, `:665`). To port: `width: "100%"` with `maxWidth: 200` and `objectFit: "cover"`. The height then comes from the file's ratio once decoded; before decode the box is empty (`~/code/fdarian/gpuix/README.md:4291-4296`), so the step's height jumps on load, which the `aspectRatio` prop avoids. Check that the jump is acceptable, or size from `onLoad`'s `naturalWidth` / `naturalHeight`.
- **Original:** `<img class="w-full max-w-[200px] object-cover">` takes the file's aspect ratio and shrinks in a narrow column (`thinking-steps.tsx:586-593`).
- **Port:** a fixed 200px-wide box, height `200 / aspectRatio` with `aspectRatio` an extra prop defaulting to 2 (`thinking-steps.tsx:564-590`). The demo image is 1200x600, so the demos match. A different ratio letterboxes (`objectFit` is the default `contain`, the source is `cover`), and the box does not shrink below 200.
- **Workaround:** the `aspectRatio` prop, so the step's measured height is stable before the image decodes.
- **Fidelity:** approximated.
- **Components it hits:** card (image), file-thumbnail.

## Image edge hairline

- **Cause:** `port choice` (the comment says it keeps a pale screenshot's edge visible; why an overlay div and not the image's own outline is not stated).
- **Original:** `outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10` on the `<img>` (`thinking-steps.tsx:590`).
- **Port:** an absolutely positioned overlay div with a 1px inset outline in `color.border`, `rgba(23,23,23,.12)` light and `rgba(245,245,245,.12)` dark (`thinking-steps.tsx:592-605`; `src/lib/theme.ts:97`, `:146`).
- **Workaround:** the overlay.
- **Fidelity:** approximated (alpha .12 against .10, base colours slightly off black and white).
- **Components it hits:** just this one.

## Props and parts the port does not take

- **Cause:** `not ported yet`. `banner.tsx:139` shows the port can take a `size` prop.
- **Original:** `ThinkingSteps` takes `size` (pins the compact step: trigger `py-1.5`, icon 12, `compact` type scale) and `className` / HTML attributes (`thinking-steps.tsx:252-289`). `icon` is any `IconName` of the app's icon library (`:341`, `:387`). Header children are `ReactNode` (`:294-308`). `ThinkingStep`, `ThinkingStepSource` and `ThinkingStepImage` take `className`.
- **Port:** no `size`, `className` or `ref` anywhere (`thinking-steps.tsx:248-255`). `icon` is one of six glyphs (`:36-53`). Header children are a `string` (`:271-274`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** thinking-indicator (no `size`).

## `width` prop

- **Cause:** `port choice` (the port has no `className` to size the root with; no other reason stated).
- **Original:** `w-80 max-w-full` on the root, overridden through `className` (`thinking-steps.tsx:277`); the streaming-text demo passes `w-full px-8` (`app/docs/thinking-steps/page.tsx:461`).
- **Port:** `width` (default 320) and `maxWidth: "100%"` (`thinking-steps.tsx:247`, `:267-268`).
- **Workaround:** none.
- **Fidelity:** exact for the default.
- **Components it hits:** just this one.

## Demo: Streaming text sizing

- **Cause:** `not ported yet`.
- **Original:** the root is `className="w-full px-8"` (32px each side) and each description is a child `span` with `text-site-body leading-4.5`: 13px on an 18px line, `muted-foreground` (`app/docs/thinking-steps/page.tsx:426-435`, `:461`).
- **Port:** `width="100%"` with no padding (`src/demos/thinking-steps.tsx:267-272`), and the typed text goes through `description`, which is `scale.body`, 13 on a 20px line (`thinking-steps.tsx:444-448`; `src/demos/thinking-steps.tsx:243-255`).
- **Workaround:** none.
- **Fidelity:** approximated (wider text, 2px taller lines).
- **Components it hits:** just this one.

## Demo: autoplay and the playback button

- **Cause:** autoplay `not ported yet` (gpuix has `IntersectionObserver`, and `src/lib/demo-kit.tsx:42` already uses it; the demo comment at `src/demos/thinking-steps.tsx:22-27` that gpuix has none is out of date). Button `port choice` (reason not stated).
- **Original:** each streaming card starts paused, plays once at least half of it is visible, pauses below 10% visible (a manual pause is cleared then), and ends in a "Replay" state. The control is an icon button (pause, play, rotate-ccw, 16px) with a tooltip, in the preview frame's corner (`app/docs/thinking-steps/page.tsx:642-735`, `:654-678`, `:723`).
- **Port:** every card starts on mount, so lower cards have finished before they are scrolled to (the scenarios note this). The control is a ghost compact `Button` reading "Pause", "Play" or "Replay", right-aligned above the steps (`src/demos/thinking-steps.tsx:28-122`, `:106-117`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** any demo with a replay control.

## Demo: sections, titles and copy

- **Cause:** `port choice` (reason not stated; the port's demo pages show cards only).
- **Original:** six sections, "Basic", "Minimal", "Streaming", "Streaming Text", "With Images", "Full Example", the last five with a lead paragraph ("The simplest usage — two dots with no children or extras.", "Steps appear sequentially as they stream in. Active steps show a shimmer effect.", "Dots with long descriptions that stream in character by character, simulating LLM output.", "Steps can include inline images with optional captions using ThinkingStepImage.", "A 6-step research agent combining sources, details, descriptions, images, and a custom header."), a code tab and an API reference (`app/docs/thinking-steps/page.tsx:745-826`).
- **Port:** the same six demos with the same steps, labels, delays, sources and images, titled "Basic", "Minimal", "Streaming", "Streaming text", "With images", "Full", with no lead text, code tab or API tables (`src/demos/thinking-steps.tsx:426-467`).
- **Workaround:** none.
- **Fidelity:** exact for the content of each demo; copy and chrome dropped.
- **Components it hits:** every demo (no lead text, code tab or API table).
