# mobile-drawer

Original: `registry/base/mobile-drawer.tsx` (Base UI Dialog + Motion). Ported in `src/components/mobile-drawer.tsx`, demo in `src/demos/mobile-drawer.tsx`.

A 256px left panel (surface-3 and its shadow) over a dimmed window, opened and closed by the parent (`open`, `onClose`), closing on Escape, a backdrop press, or a row the parent closes it from. Like the dialog it is composed over gpuix's headless `Dialog`; the focus trap, Escape, scroll lock, click blocking and focus return are the same ones probed in `limitations/dialog.md`, and they hold here (focus returns to the trigger on close; wheeling over the backdrop does not move the page; the panel scrolls on its own when its content is taller than the window). The demo's panel holds the shared sidebar rows, so the fluid hover runs inside a popup layer that is moving.

## `DialogPortal` builds its children twice

- **Original:** Base UI mounts the popup subtree once.
- **gpuix:** `DialogPortal` (`packages/solid/src/components/dialog.ts:110`) spreads `...props` into the `anchored` element (`dialog.ts:117`), which reads the `children` getter and builds the whole backdrop-plus-popup subtree, then declares `get children() { return props.children }` (`dialog.ts:137`), which builds it again. The first copy is never attached but its effects, timers and layers stay alive until the portal unmounts. Here it surfaced as the shared fluid hover (a `SidebarMenu`) measuring a menu that was never attached and throwing "painted bounds still unavailable after 12 frames (container)" from a timer. It is a bug. The same happens in `limitations/dialog.md`'s dialog: everything inside `DialogContent` was built twice (a second Select, a second nested Dialog with its own state).
- **Workaround:** `once()` (exported from `components/dialog.tsx`) builds the content on the first read and hands the same nodes back, and drops them when the mounting scope is disposed so the next open builds fresh ones. Both `DialogContent` and `MobileDrawer` use it.
- **Fidelity:** exact once worked around.
- **Components it hits:** every popup built on `DialogPortal` (dialog, mobile-drawer, command-menu if it is a dialog, anything with state or timers in its content).

## A scroller's padding is counted twice in its scroll extent

- **Original:** `overflow-y-auto p-4` scrolls only when the content is taller than the box.
- **gpuix:** a `overflowY: "scroll"` box with padding scrolls by `2 x padding` even when its content fits (a 16px-padded box with two 40px rows scrolled 32px; without the padding, or with the padding moved to an inner element, it does not scroll). A bug in scroll extent, in the native layout.
- **Workaround:** the scroller has no padding; an inner box carries the 16px.
- **Fidelity:** exact.
- **Components it hits:** scroll-area, the sidebar content (8px padding on a scroller), combobox / select lists with padded scrollers, any padded scroll box.

## Painted bounds of nested elements disagree under a moving ancestor

- **Original:** `getBoundingClientRect` is always consistent within a frame.
- **gpuix:** `getElementBounds` returns the last painted frame per element, and a container and its row read in the same tick differed by one frame of the ancestor's travel while the drawer slid (container `x -208`, its first child's wrapper `x -192`, 16px apart where they should be equal). The fluid hover measures `row - container`, so its rects came out skewed by that travel (the active highlight sat 14px to the right of its row and spilled past the panel) and keep the error until the next pointer enter re-measures. An inconsistency in the tracked bounds, not a layout bug.
- **Workaround:** the panel slides empty and its content fades in when the slide has stopped (`onMotionComplete`), so the menu is measured at rest. The content is no longer visible during the 160ms slide.
- **Fidelity:** approximated (the content does not travel with the panel).
- **Components it hits:** every fluid-hover list inside something that animates its position (accordion bodies, popups that slide in, scroll-area).

## No `x: -100%`; the slide animates `left`

- **Original:** `initial={{ x: "-100%" }}` and `animate={{ x: 0 }}` on the compositor.
- **gpuix lacks:** transforms (known). `motion` can animate `left`, which re-lays the panel out each frame.
- **Workaround:** the panel is `position: absolute` in the full-window layer and animates `left` between `-256` and `0` on the `moderate` spring in (critically damped, no overshoot) and the 120 ms tween out. The backdrop fades on `{ duration: 0.16 }` in and the `moderate` exit tween out. The unmount waits for `onMotionComplete`, with a 220 ms timer as the fallback.
- **Fidelity:** approximated (same motion, layout cost per frame).
- **Components it hits:** every sliding panel (sheet, toast stack).

## Smaller notes

- `z-40` backdrop and `z-50` panel are document order inside the layer (no `zIndex`, known). The `DialogPopup` wrapper covers the window as the focus scope with `pointerEvents: "none"`, and only the panel takes hits, so a press on the dim area reaches the backdrop.
- `overflow-y-auto` is `overflowY: "scroll"`; gpuix has no `auto`. No scrollbar is drawn (the original relies on the OS one).
- Tab: the shared sidebar rows are not tab stops (that port skips the traveling focus ring), so inside the drawer Tab leaves focus on the popup. The trap itself is the same one that cycles correctly in the dialog.
- `triggerRef` maps to `DialogPopup`'s `finalFocus`; without it focus goes back to whatever held it before the drawer opened, which was the trigger in the probe.
- `useSurface` / `SurfaceProvider` (the surface level a nested panel inherits) is not ported: the panel is fixed at surface-3 as in the original's default substrate.
- Initial focus goes to the first tab stop inside the drawer once the content has mounted (after the slide settles), like Base UI's default; with no tab stop (the shared sidebar rows are not) it stays on the popup, which is Base UI's fallback too. The demo's "Done" button is the first stop and proves it.
- `onClose` fires once: gpuix keeps its layer up through the exit, so Escape and backdrop presses still arrive then, and are ignored while `open` is false.
