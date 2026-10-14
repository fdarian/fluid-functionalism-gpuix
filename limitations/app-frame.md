# app-frame

Original: none. fluidfunctionalism.com is a web page; the browser supplies the window chrome. This is the port's own browser-style frame, in `src/lib/app-frame.tsx` and the `render()` options in `src/main.tsx`.

One entry per gap. Only gpuix gaps worth knowing about: transforms are already known, so link to them rather than re-reporting.

## No window drag region

- **Original:** a browser's tab strip drags the window, and a double-click on it zooms it.
- **gpuix lacks:** `Window::start_window_move` (`zed/crates/gpui/src/window.rs:2607`) and `WindowControlArea` (`zed/crates/gpui/src/window.rs:744`) are not plumbed to JS, so no element can be marked as a drag handle or as the zoom area.
- **Workaround:** none. The 40px top bar cannot be dragged and there is no double-click-to-zoom. With `titlebarTransparent` the native titlebar strip may still drag the window, but that is unverified (it needs a real window and a real pointer).
- **Fidelity:** `dropped`.
- **Components it hits:** just the frame.

## The test renderer ignores window options and appearance

- **Original:** n/a, this is about the harness.
- **gpuix lacks:** `createTestRoot` accepts `titlebarTransparent`, `trafficLightX` / `trafficLightY` and `setAppearance` but does nothing with them. There are no traffic lights or titlebar in a capture, and `createAppearance()` returns the machine's appearance and never changes.
- **Workaround:** the screenshots pin the theme with `setThemeChoice("dark")` before rendering, and the light capture flips it through the real control. The traffic-light inset and the native chrome follow only in the real window.
- **Fidelity:** `approximated` (captures show the frame without the traffic lights).
- **Components it hits:** every demo capture.

## Rounded panel, rectangular clip

- **Original:** `overflow-hidden rounded-[10px]` clips children to the rounded box.
- **gpuix lacks:** overflow clips to a rectangle (`ContentMask` is bounds-only, `zed/crates/gpui/src/window.rs:1930`), already listed in the README. Any child whose fill reaches a panel corner paints square over it.
- **Workaround:** the page row rounds itself to the panel's inner radius (10 minus the 1px border), and `Sidebar` takes an optional `leftCornerRadius` for the two corners its fill touches. All four corners were checked in light and dark captures, including under the dialog scrim.
- **Fidelity:** `approximated`. Only fills that touch a corner are handled; a future child that paints into a corner has to round itself too.
- **Components it hits:** sidebar. Also see card, carousel-dots, dialog, file-thumbnail, mobile-drawer, table, scroll-area and banner for the same clip rule.
