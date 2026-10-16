# mobile-drawer

Original: `registry/base/mobile-drawer.tsx` (Base UI Dialog + Motion). The source has no demo of it anywhere: no page imports `MobileDrawer` (only the registry wrapper `components/flavored/mobile-drawer.tsx` does), and the Sidebar's mobile mode uses its own sheet in `registry/default/sidebar-core.tsx`. Ported in `src/components/mobile-drawer.tsx`, demo in `src/demos/mobile-drawer.tsx`.

Matches the source: 256px wide, top / left / bottom edges, `aria-label="Navigation"`, a 16px inset, the scrim values, the backdrop fade (`{ duration: 0.16 }` in, the 120ms `moderate` exit tween out), the critically damped `moderate` slide in and 120ms tween out, the 220ms unmount fallback, Escape and backdrop click closing, focus returning to `triggerRef`, and "the drawer only reports closes".

## No `x: -100%`; the slide animates `left`

- **Cause:** `gpuix gap`. [README "Missing features": CSS transforms](../README.md#missing-features).
- **Original:** `initial={{ x: "-100%" }}` and `animate={{ x: open ? 0 : "-100%" }}` on the compositor (`registry/base/mobile-drawer.tsx:149-154`).
- **Port:** `position: absolute` in the full-window layer, `left` between `-DRAWER_WIDTH` (-256) and `0` (`src/components/mobile-drawer.tsx:83-105`), on `tween.moderate` in and `tween.moderateExit` out (`:86`). The unmount waits for `onMotionComplete`, with the 220ms timer as the fallback (`:17`, `:41`, `:87-89`).
- **gpuix lacks:** translate as a style (`~/code/fdarian/gpuix/FORK.md:876-887`); `motion` can animate `left`, which re-lays the panel out each frame.
- **Workaround:** `left`. The content is mounted with the panel and rides along as it slides, as on the web; fluid hover's rows measured correctly mid-slide (the earlier note says it was probed with the motion clock stepped 25ms at a time; not rechecked).
- **Fidelity:** approximated (same motion, layout cost per frame).
- **Components it hits:** any sliding panel.

## The scroller's own padding is counted twice in its scroll extent

- **Cause:** `gpuix gap` (as the port comment reports it; not rechecked, no gpuix `file:line` known).
- **Original:** the panel is the scroller and carries `p-4` (`registry/base/mobile-drawer.tsx:147`).
- **Port:** the padding sits on an inner box, so a short panel does not scroll by 2 x 16 (`src/components/mobile-drawer.tsx:107-110`).
- **gpuix lacks:** a scroll extent that counts a scroller's padding once.
- **Workaround:** the inner box.
- **Fidelity:** exact.
- **Components it hits:** any scroller with padding.

## No surface context for the panel's contents

- **Cause:** `not ported yet`. The ladder exists (`src/lib/surface-context.ts`, read by dialog and popups); the drawer neither reads nor provides it.
- **Original:** the level is `min(substrate + 2, 8)` and the children get it as their substrate (`registry/base/mobile-drawer.tsx:82-83`, `:161`).
- **Port:** the panel is always `color.card`, surface-3 (`src/components/mobile-drawer.tsx:98`). Opened over the page (substrate 1) that is the same colour; opened over a raised surface it would be too low.
- **Workaround:** none.
- **Fidelity:** exact on the page, approximated elsewhere.
- **Components it hits:** see the dialog entry.

## `triggerRef` is an element, not a ref object

- **Cause:** `port choice` (reason not stated; a Solid `ref` callback hands the element over, so there is no ref object to read).
- **Original:** `triggerRef?: RefObject<HTMLElement | null>` (`registry/base/mobile-drawer.tsx:30`, `:138`).
- **Port:** `triggerRef?: HostElement`, passed as `finalFocus` (`src/components/mobile-drawer.tsx:30`, `:67`); without it focus returns to whatever held it before the drawer opened.
- **Workaround:** n/a.
- **Fidelity:** exact.
- **Components it hits:** just this one.

## Focus lands on the first tab stop one tick after open

- **Cause:** `gpuix gap`. Same as [dialog](dialog.md).
- **Original:** Base UI focuses the first tabbable as the drawer opens.
- **Port:** `FocusFirst` from `dialog.tsx` runs `focusNextWithin` in a `setTimeout(0)` (`src/components/mobile-drawer.tsx:116`, `src/components/dialog.tsx:209-219`), while the panel is still sliding in.
- **Workaround:** the deferred call.
- **Fidelity:** approximated.
- **Components it hits:** dialog.

## The demo is the port's own

- **Cause:** `port choice` (reason not stated).
- **Original:** none; the registry lists `mobile-drawer` as a component (`registry.json:1439`) but no page shows it.
- **Port:** an "Open navigation" button (`tertiary`) beside "Current page: ...", and a drawer of a "Navigation" title, 14 `SidebarMenuButton` rows and a "Done" button (`src/demos/mobile-drawer.tsx:31-92`). Picking a row sets the page and closes.
- **Workaround:** n/a.
- **Fidelity:** n/a (no source copy to compare).
- **Components it hits:** just this one.
