# banner

Original: `registry/default/banner.tsx`. Ported in `src/components/banner.tsx`, demo in `src/demos/banner.tsx`.

All five statuses, both contrasts, inline and fixed, title / description / actions, custom icon, dismiss, compact, and the appear / dismiss animation are ported. Screenshots: `screenshots/banner/` (`scrolled-*.png` are the lower cards, captured with a taller scroll).

## Motion: pixel `height` only, no `fr` track, no scale, no margin

- **Original:** the banner's space is a one-row grid whose track runs `0fr`..`1fr`; the banner inside scales from 40% and shrinks to 60%, and `marginBottom` is animated to take back one flex gap, so nothing jumps when the banner mounts or unmounts. Values are linked with `useTransform`.
- **gpuix lacks:** animating anything but `width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius` (`packages/native/js/host.ts:27`, `packages/native/src/motion.rs:740`): no `fr`/`auto` height, no margin, no transform (known). No derived or linked motion values. Missing features.
- **Workaround:** the banner is measured once with `getElementBounds` (read after the first paint), then a `motion.div` animates `height` between 0 and that pixel value while an inner `motion.div` fades. The fixed bar rides its row with `top`. At rest the wrapper is a plain auto-height `div`, so rewrapping text never waits on a measurement; the wrapper type swaps per phase (`rest` / `measuring` / `opening` / `closing` / `gone`) and the body is rebuilt each time. The scale is dropped, and the parent's flex `gap` pops at unmount instead of closing with the row.
- **Fidelity:** approximated (height + fade, no scale, a gap-sized jump at the end).
- **Components it hits:** accordion, any collapsible region, anything that animates to content height.

## Grid, `order`, container queries

- **Original:** the parts sit on one `grid-cols-[auto_minmax(0,1fr)_auto_auto]`, actions are placed by `order-*` per variant, and `@max-sm/banner` (container query, 24rem) drops the actions under the text. `has-data-[slot=banner-description]` switches layout when a description exists.
- **gpuix lacks:** `gridTemplateColumns` takes only a track count (`host.ts:178`) with no `auto`/`fr` mix, no `order`, no `row-reverse` (`renderer.rs:5799` handles only `row` and `column`), no container queries, no `:has()`. Missing features.
- **Workaround:** a nested flex row: icon, content, dismiss. `BannerDescription` registers itself in a context so the content flips between a row (actions trail the title) and a column (actions under the text). `BannerActions` reorders its resolved children itself (reversed when trailing, so primary-first markup puts primary at the edge). The narrow-container layout is not ported; it needs the banner's width, which only `getElementBounds` read on a timer could supply.
- **Fidelity:** exact for the wide layout, dropped for `@max-sm`.
- **Components it hits:** card (grid header), dialog footer, any part-composed layout.

## `position: sticky`

- **Original:** the fixed variant is `sticky top-0` inside its scroll container.
- **gpuix lacks:** `sticky` (`position` is `absolute | relative | fixed`-ish, `style.rs:323`). Missing feature.
- **Workaround:** the demo's page is a flex column with the banner as a sibling above the scroller, which is what the doc's own snippet does with `<Banner variant="fixed">` between a header and `<main overflow-y-auto>`. A banner inside the scrolled content would scroll away.
- **Fidelity:** approximated.
- **Components it hits:** any sticky header (table headers, scroll-area).

## Two-colour glyphs (filled shape with a page-colour mark)

- **Original:** an inline SVG whose circle is `currentColor` and whose mark strokes `var(--background)`.
- **gpuix lacks:** per-path colour in `<svg>`: it is a monochrome mask tinted by `style.color` (`host.ts` `SvgProps`), so a second colour is lost.
- **Workaround:** an SVG `<mask>` cuts the mark out of the shape, so the banner's own fill shows through it. gpuix's renderer does honour `<mask>`. Works well; arguably better than the original, since the mark takes the fill rather than the page colour.
- **Fidelity:** exact (a subtle difference on tinted fills).
- **Components it hits:** none others noticed.

## `backgroundImage: linear-gradient(fill, fill)` layered over a base colour

- **Original:** a flat translucent fill drawn over an opaque `--background` on the fixed bar.
- **gpuix lacks:** stacked backgrounds: one `backgroundColor` or one `background` gradient per element.
- **Workaround:** an absolutely positioned first child paints the fill over the root's background, relying on document order (no `zIndex`, known).
- **Fidelity:** exact.
- **Components it hits:** any translucent fill over a solid one (card's selected fill, banner).

## Headless harness: `onMotionComplete` needed a drain

- **Original:** Motion's `AnimatePresence` / `onAnimationComplete` unmounts an exiting banner.
- **gpuix:** `renderer.flush()` (`packages/native/js/testing.ts:207`) does not drain native events; only `simulate*` calls drain them via `dispatchNativeEvents()` (`testing.ts:227`). `motionComplete` events (`renderer.rs:3537`) therefore never reached JS in the first version of `scripts/screenshots.tsx`, so an `AnimatePresence` exit or `onMotionComplete` never fired there. A harness gap, not a renderer bug; the harness's `settle()` now drains (commit 585c165) and the banner uses `onMotionComplete` directly.
- **Workaround:** none needed now. A motion only advances on painted frames, which `settle()` provides.
- **Fidelity:** exact.
- **Components it hits:** every component with an animated exit.

## Smaller notes

- `useReducedMotion`: gpuix exposes no `prefers-reduced-motion`, so the reduced-motion branches are dropped.
- Focus hand-off when a focused banner closes (`focusNeighbour`): not ported; `renderer.focusNext` exists and would do it.
- `BannerAction` ghost text is the shared Button's muted-to-foreground ghost, not the original's always-foreground override: the port's Button has no colour prop. A port gap, not a gpuix one.
