# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` utility in `app/globals.css`. Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

Ported: vertical, horizontal and both-axis areas, the hover / scroll-driven thumb (4px resting, 6px on hover, three tints), thumb drag, track jump, and the scroll-aware edge fade. Not ported: the touch-primary native-overflow fallback (there is no touch input) and the scripted fake cursor of the docs page.

## gpuix paints no scrollbar and reports no scroll position

- **Original:** Base UI's `Scrollbar` / `Thumb` follow the viewport's `scroll` event and expose `--scroll-area-thumb-height`; `data-hovering` / `data-scrolling` drive the fade.
- **gpuix lacks:** `overflow: "scroll"` paints nothing, so there is no scrollbar to restyle. `onScroll` is the *wheel* event: it carries `deltaX` / `deltaY` only (`packages/native/src/renderer.rs:5605`), not an offset, and it does not fire for `scrollTo`, a thumb drag or a keyboard scroll. The offset is only readable by polling `renderer.getScrollOffset`. Missing feature.
- **Workaround:** the thumb is drawn by the component. After each wheel tick it reads `getElementBounds` (viewport, content) and `getScrollOffset`, at 0 / 16 / 48 / 100 ms, because the offset a tick produces is not readable in the same turn. Content that changes size is only picked up on the next hover or scroll (no `ResizeObserver`).
- **Fidelity:** approximated: right look, a frame or two of lag, no response to content resizing on its own.
- **Components it hits:** any scroll surface that wants a styled scrollbar (combobox, select and sidebar lists use the bare scroller instead).

## Nested scrollers all scroll at once

- **Original:** a wheel tick scrolls the innermost scroller that can still move; at its end the tick chains to the parent (unless `overscroll-behavior` stops it).
- **gpuix lacks:** every scroll container under the pointer applies the tick. gpui's scroll listener (`zed/crates/gpui/src/elements/div.rs:3266`) never calls `stop_propagation`, and gpuix has no `overscrollBehavior`. A ScrollArea inside the (scrolling) demo page moved both. Missing feature in gpui; gpuix could expose it.
- **Workaround:** `containWheel`: the area remembers the nearest scrolling ancestor (walking `HostElement.parent`) and its offset, and puts the ancestor's offset back after any tick that moved the area. Once the area is at its limit the tick is left alone, so chaining works. The correction runs in JS after the native handler, so a frame of the ancestor moving is possible live; headless captures cannot show it.
- **Fidelity:** approximated.
- **Components it hits:** every scroller inside the demo page (combobox / select lists inside a page, sidebar).

## No `mask-image`, no scroll-driven animation

- **Original:** `scroll-fade` is a `mask-image` gradient whose start / end strength is driven by a CSS scroll timeline, so it erases the content, whatever is behind it, and the true start / end edge stays crisp.
- **gpuix lacks:** masks of any kind, and animation timelines tied to scroll. `background` takes a two-stop linear gradient (`packages/native/js/host.ts`, `LinearGradientBackground`) but nothing to subtract alpha from content. Missing feature.
- **Workaround:** two edge overlays painting an opaque-to-clear gradient in the surface's own colour (`fadeColor`), with their opacity set from the synced scroll offset (`clamp(scrolled / 48)` at the start, `clamp(remaining / 48)` at the end). It lies about anything that is not that flat colour behind it (an image, a gradient, a different card), and `fadeColor` has to be passed in.
- **Fidelity:** approximated: exact over a flat surface, wrong elsewhere.
- **Components it hits:** anything using `scroll-fade` / `scroll-divider` (sidebar scroll regions, command menu, select).

## No pointer capture, and `<anchored>` swallows handlers

- **Original:** a thumb drag keeps tracking after the pointer leaves the thumb (Base UI captures the pointer).
- **gpuix lacks:** pointer capture: a `mouseMove` only reaches the element under the pointer. Missing feature.
- **Workaround:** while dragging, a window-sized `<anchored fill="window" occlude>` mounts and catches the moves and the release. Four gotchas found on the way: a drag started on the thumb also began a text selection across the page (`userSelect: "none"` on the track and the overlay stops it); `<anchored>` paints an opaque backdrop unless `backgroundColor` is set to a transparent value (the first attempt blanked the window); handlers set on the `<anchored>` itself never fired, only those on a child `div` of `width/height: 100%`; and a release that lands before the overlay has mounted (a click faster than a frame) is lost, so the first move with no `pressedButton` ends the drag.
- **Fidelity:** exact once working; a frame between press and overlay.
- **Components it hits:** slider, color-picker, any drag handle.

## Absolute boxes block their parent's hover

- **Original:** the thumb inside the track does not affect the track's hover (`group-hover/scrollbar`).
- **gpuix lacks:** an absolute child inserts a hitbox, so `onMouseEnter` / `onMouseLeave` of its parent stop firing over it (`packages/native/src/style.rs:317`, `renderer.rs:5335`). The same gap is described in [accordion.md](accordion.md). Bug-shaped: the opt-out exists but the default differs from HTML.
- **Workaround:** the thumb is `pointerEvents: "none"`; the track hit-tests the press against the thumb's span itself to decide between a drag and a track jump. The track also keeps its own hover flag because the root's hover drops while the pointer is over an absolute track.
- **Fidelity:** exact.
- **Components it hits:** every component with an absolute overlay inside a hover target.

## A both-axis scroller cannot overflow sideways

- **Original:** `overflow: auto` with a `w-max` child scrolls in both axes.
- **gpuix lacks:** `renderer.rs:5371` makes an x-only scroller `display: flex` with `min-width: 0`, but a scroller with both axes stays block, so a wide child fills the parent instead of overflowing. Bug.
- **Workaround:** the both-axis viewport sets `display: flex; flexDirection: row; alignItems: flex-start` itself.
- **Fidelity:** exact.
- **Components it hits:** table (wide tables), any two-axis scroller.

## Thumb colour and width do not share a transition

- **Original:** `transition-[background-color,width,height] duration-160` on the thumb.
- **gpuix lacks:** colour is not a `motion` property (`packages/native/src/motion.rs:14`), and `hover` / `active` state styles switch instantly. Width and `left` do animate.
- **Workaround:** width / offset animate on a 160 ms ease-in-out tween; the 8 / 12 / 16 % tint steps switch at once. The track's show / hide uses one tween with a delay (`delay` is supported), matching the original's 160 ms in, 120 ms out after a 160 ms wait.
- **Fidelity:** approximated: tint steps are not eased.
- **Components it hits:** any control that eases a fill on hover.
