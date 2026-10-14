# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` utility in `app/globals.css`. Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

Ported: vertical, horizontal and both-axis areas, the hover / scroll-driven thumb (4px resting, 6px on hover, three tints), thumb drag, track jump, and the scroll-aware edge fade. Not ported: the touch-primary native-overflow fallback (there is no touch input) and the scripted fake cursor of the docs page.

## gpuix paints no scrollbar

- **Original:** Base UI's `Scrollbar` / `Thumb` follow the viewport's `scroll` event and expose `--scroll-area-thumb-height`; `data-hovering` / `data-scrolling` drive the fade.
- **gpuix lacks:** a painted scrollbar: `overflow: "scroll"` draws nothing, so there is none to restyle. Missing feature.
- **Workaround:** the thumb is drawn by the component. Sizes come from `onLayout` on the viewport and the content (reported after the first paint and on every resize, so content or window resizes are followed) and the offset from `onScrollChange` (every change, whether wheel, drag, key, `scrollTo` or `scrollIntoView`). Nothing is polled. `onScroll` (the wheel event) only marks the scroll as the user's and keeps the nested-scroller containment below. An earlier version polled `getScrollOffset` at 0 / 16 / 48 / 100 ms after each wheel tick because gpuix had neither event.
- **Behaviours ported from Base UI:** thumb length `max(16, min(track, view - 8) * view / content)`, the corner square only while both scrollbars exist, `data-scrolling` per axis (500 ms after a user-driven offset change, cleared at once on drag release; a programmatic `scrollTo` from elsewhere does not show the bar), a press on the bare track jumping with Base UI's formula (thumb centre plus half the 8px thumb margins, so it lands about 8px low) and carrying on as a drag, primary button only, wheel over the track scrolling the viewport, a focusable viewport (tab stop while it overflows) that scrolls with arrows (40px), Page Up / Down and Space (87.5% of the view), Home and End.
- **Fidelity:** exact, up to a frame of event latency.
- **Components it hits:** any scroll surface that wants a styled scrollbar (combobox, select and sidebar lists use the bare scroller instead).

## Nested scrollers all scroll at once

- **Original:** a wheel tick scrolls the innermost scroller that can still move; at its end the tick chains to the parent (unless `overscroll-behavior` stops it).
- **gpuix lacks:** every scroll container under the pointer applies the tick. gpui's scroll listener (`zed/crates/gpui/src/elements/div.rs:3266`) never calls `stop_propagation`, and gpuix has no `overscrollBehavior`. A ScrollArea inside the (scrolling) demo page moved both. Missing feature in gpui; gpuix could expose it.
- **Workaround:** `containWheel`: the area remembers the nearest scrolling ancestor (walking `HostElement.parent`) and its offset, and puts the ancestor's offset back after any tick that moved the area. Once the area is at its limit the tick is left alone, so chaining works. The correction runs in JS after the native handler, so a frame of the ancestor moving is possible live; headless captures cannot show it. Verified with real wheel ticks on the page, an outer ScrollArea and an inner one (`nested-*` screenshots): the inner moves and the enclosing scrollers stay put, and once the inner is at its end the outer follows.
- **Fidelity:** approximated.
- **Components it hits:** every scroller inside the demo page (combobox / select lists inside a page, sidebar).

## No `mask-image`, no scroll-driven animation

- **Original:** `scroll-fade` is a `mask-image` gradient whose start / end strength is driven by a CSS scroll timeline, so it erases the content, whatever is behind it, and the true start / end edge stays crisp.
- **gpuix lacks:** masks of any kind, and animation timelines tied to scroll. `background` takes a two-stop linear gradient (`packages/native/js/host.ts`, `LinearGradientBackground`) but nothing to subtract alpha from content. Missing feature.
- **Workaround:** two edge overlays painting an opaque-to-clear gradient in the surface's own colour (`fadeColor`), with their opacity set from the synced scroll offset (`clamp(scrolled / 48)` at the start, `clamp(remaining / 48)` at the end). It lies about anything that is not that flat colour behind it (an image, a gradient, a different card), and `fadeColor` has to be passed in.
- **Fidelity:** approximated: exact over a flat surface, wrong elsewhere.
- **Components it hits:** anything using `scroll-fade` / `scroll-divider` (sidebar scroll regions, command menu, select).

## Pointer capture needs both handlers on the element

- **Original:** a thumb drag keeps tracking after the pointer leaves the thumb (Base UI captures the pointer).
- **gpuix has it, but only implicitly:** an element that listens for both `mouseDown` and `mouseMove` captures the pointer, so its later moves and its release arrive wherever the pointer goes (`packages/native/src/renderer.rs:5663`, `el.capture_pointer()`). Nothing in the docs or types says so, and an element with only `onMouseDown` gets no capture.
- **Workaround:** the track has `onMouseDown`, `onMouseMove` and `onMouseUp`, so a drag that leaves the track keeps working. An earlier version mounted a window-sized `<anchored fill="window" occlude>` while dragging to catch the moves; it is gone. Its gotchas, in case an overlay is ever needed again: a drag also began a text selection (`userSelect: "none"` stops it); `<anchored>` paints an opaque backdrop unless `backgroundColor` is a transparent value; handlers on the `<anchored>` itself never fire, only those on a child; and a release that lands before the overlay mounts is lost. A release the window never sees is still lost, so the first move with no `pressedButton` ends the drag. Verified headless with a held-button drag to 90px left of the track (`dragging.png` is identical with and without the overlay); not checked in the live window.
- **Fidelity:** exact.
- **Components it hits:** any drag handle: slider and color-picker rely on the same capture (element-local handlers), only the scroll bar ever needed the overlay.

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
