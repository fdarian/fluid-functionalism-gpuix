# thinking-steps

Original: `registry/base/thinking-steps.tsx` (Base UI `Collapsible`) and `app/docs/thinking-steps/page.tsx`. Ported in `src/components/thinking-steps.tsx`, demo in `src/demos/thinking-steps.tsx`.

Transforms are already a known gap and are not repeated here. The shimmer and the looping clock are in [thinking-indicator.md](thinking-indicator.md).

## No `height: auto` and no layout observer

- **Original:** the panel and every step spring their height to a pixel value measured with `offsetHeight` and kept current by a `ResizeObserver`, so a step that grows (sources appear, an image loads, text streams in) pushes the panel with it.
- **gpuix lacks:** a `height: auto` target (`motion` animates numbers only, `packages/native/js/host.ts:27`, `MotionStyle`) and any layout-change event. The only measurement is `getElementBounds`, the last painted frame, and nothing is recorded for an element before its first paint (`packages/native/src/renderer.rs:2333`). Missing feature.
- **Workaround:** each animated box reads its content's painted bounds from one shared 33 ms timer, and only while it is "hot": just mounted, kicked by a prop or child change, or its last read differed. A step kicks on `label` / `description` / `status` / `isLast` and when its children are replaced; a collapse kicks on `open` and tells the boxes around it, because opening changes its own height, which only its parent can see. Nothing is polled when everything is settled. A panel that mounts open takes its first height with a zero-length tween.
- **Fidelity:** approximated. Heights lag the content by up to a frame plus the spring, and a size change nobody kicks (text typed by a child component that is not a prop of the step) is missed. This is why the streaming-text demo passes the typed text as `description` rather than as a child.
- **Components it hits:** accordion (its port reads a panel's height once, so it cannot follow later growth), queued-stack (reads the stack's width).

## A headless `getElementBounds` draws a frame

- **Original:** n/a (a test-harness effect).
- **gpuix lacks:** a cheap bounds read on the test renderer. `TestRenderer.getElementBounds` calls `self.flush()` first (`packages/native/src/test_renderer.rs:1118-1121`), a full draw: about 28 ms per call in the 1240x780 screenshot window, against a table lookup on the real renderer (`renderer.rs:2333-2336`). Polling every box every 33 ms, which a first draft did, starved the event loop (about 450 ms of lag, the demo's timers running at half speed) in the screenshots. The hot/cold scheme above exists because of it.
- **Workaround:** the hot/cold timer. Any component that reads bounds on a timer will be much slower under `scripts/screenshots.tsx` than in a window; poll only when something may have changed.
- **Fidelity:** exact in the real window; the headless numbers are a harness cost, not a product cost.
- **Components it hits:** anything that reads bounds on a timer: combobox, sidebar and accordion all do.

## An absolutely positioned child takes the pointer from its parent

- **Original:** the label's dual layer (an invisible semibold copy reserving the width, the visible label over it) sits inside the trigger, and a click or hover on the label is a click or hover on the trigger.
- **gpuix lacks:** that propagation. `position: absolute` makes an element a hit-test blocker (`packages/native/src/style.rs:323`, applied at `renderer.rs:5335`), so the visible label swallowed the trigger's `onMouseEnter` and `onClick` over the text: the trigger only responded to the strip past the label. Verified by logging enters while sweeping the pointer down the trigger. Same mechanism as the filled bubble in [chat-message.md](chat-message.md); a behaviour difference from the DOM, with no mention in the `pointerEvents` doc.
- **Workaround:** `pointerEvents: "none"` on the absolute label layer.
- **Fidelity:** exact.
- **Components it hits:** sidebar (its port uses the same hidden-copy trick), ask-user-questions (the option titles), chat-message.

## Chevron rotation

- **Original:** `motion.span animate={{ rotate: open ? 90 : 0 }}` with `spring.fast`.
- **gpuix lacks:** rotation (the known transform gap), so a spring on it is not an option either.
- **Workaround:** the rotation is inside the SVG source (`<g transform="rotate(a 12 12)">`) and a 100 ms JS ease-out rewrites it each 16 ms in whole degrees, so GPUI's SVG cache (keyed by the bytes, `zed/crates/gpui/src/elements/svg.rs:53`) holds at most 91 entries.
- **Fidelity:** approximated. A tween rather than the critically damped spring, and driven from JS.
- **Components it hits:** any disclosure chevron; the accordion port swaps between two glyphs instead, which is instant.

## `scale` and `filter: blur` entrances

- **Original:** sources enter `opacity 0, scale .85, blur(4px)` and images `opacity 0, blur(4px)`, with the blur on its own faster transition.
- **gpuix lacks:** `filter` and, as known, scale. `MotionStyle` has no filter.
- **Workaround:** opacity only, with the same delays.
- **Fidelity:** approximated (the blur-to-sharp reveal is dropped).
- **Components it hits:** just this one.

## `<img>` height from aspect ratio needs a definite width

- **Original:** `w-full max-w-[200px]` on an `<img>` sizes the height from the file's ratio whatever the parent's width.
- **gpuix lacks:** the same inference when the parent's width is not yet definite. With a fixed-width parent, `width: "100%"` plus `maxWidth` gave the right height; inside a step (a flex child whose width comes from `flexGrow`) the layout box kept the file's own 600px height, so the caption sat 500px below a correctly drawn image, and `objectFit: "cover"` with only a width does the same. Observed in the headless renderer; the cause is not traced.
- **Workaround:** `ThinkingStepImage` sizes the box outright (200 wide, height from an `aspectRatio` prop, default 2 for a 1200x600 file).
- **Fidelity:** approximated: the caller states the ratio.
- **Components it hits:** just this one (chat-message and file-thumbnail pass explicit sizes).

## No `IntersectionObserver`, no `aria-controls`

- **Original:** the docs page starts each streaming demo when half the card is on screen and pauses it when it leaves. Base UI wires `aria-controls` between the trigger and the panel.
- **gpuix lacks:** a visibility observer, and `aria-controls` (`HostProps` has `aria-expanded` but not `aria-controls`, `host.ts`).
- **Workaround:** the demos start on mount, with Pause / Play / Replay buttons; the trigger carries `aria-expanded` only.
- **Fidelity:** dropped for both.
- **Components it hits:** any autoplaying demo; any disclosure.
