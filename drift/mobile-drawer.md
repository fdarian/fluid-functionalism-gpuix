# mobile-drawer

Original: `registry/base/mobile-drawer.tsx` (Base UI Dialog + Motion). The source has no demo of it anywhere: no page imports `MobileDrawer` (only the registry wrapper `components/flavored/mobile-drawer.tsx` does), and the Sidebar's mobile mode uses its own sheet in `registry/default/sidebar-core.tsx`. Ported in `src/components/mobile-drawer.tsx`, demo in `src/demos/mobile-drawer.tsx`.

Matches the source: 256px wide, top / left / bottom edges, `aria-label="Navigation"`, a 16px inset, the scrim values, the backdrop fade (`{ duration: 0.16 }` in, the 120ms `moderate` exit tween out), the critically damped `moderate` slide in and 120ms tween out, the 220ms unmount fallback, Escape and backdrop click closing, focus returning to `triggerRef`, and "the drawer only reports closes".

## `DialogBackdrop` closes on mousedown, not click

- **Cause:** `gpuix gap`. Same as [dialog](dialog.md).
- **Original:** Base UI closes the drawer on a click that presses and releases on the backdrop; a press that starts elsewhere and releases there does not close it.
- **Port:** its own full-window `div` with `onClick` closes the drawer, ignoring a click that arrives while the exit plays (`src/components/mobile-drawer.tsx:53-73`).
- **gpuix lacks:** the DOM rule: `DialogBackdrop` closes in `onMouseDown` (`packages/solid/src/components/dialog.ts:145-157`).
- **Workaround:** the own backdrop.
- **Fidelity:** exact.
- **Components it hits:** dialog, and anything built on `DialogBackdrop`.

## No `x: -100%`; the slide animates `left`

- **Cause:** `gpuix gap`. [README "Missing features": CSS transforms](../README.md#missing-features).
- **Original:** `initial={{ x: "-100%" }}` and `animate={{ x: open ? 0 : "-100%" }}` on the compositor (`registry/base/mobile-drawer.tsx:149-154`).
- **Port:** `position: absolute` in the full-window layer, `left` between `-DRAWER_WIDTH` (-256) and `0` (`src/components/mobile-drawer.tsx:92-112`), on `tween.moderate` in and `tween.moderateExit` out (`:95`). The unmount waits for `onMotionComplete`, with the 220ms timer as the fallback (`:21`, `:41`, `:96-98`).
- **gpuix lacks:** translate as a style (`~/code/fdarian/gpuix/FORK.md:876-887`); `motion` can animate `left`, which re-lays the panel out each frame.
- **Workaround:** `left`. The content is mounted with the panel and rides along as it slides, as on the web; fluid hover's rows measured correctly mid-slide (the earlier note says it was probed with the motion clock stepped 25ms at a time; not rechecked).
- **Fidelity:** approximated (same motion, layout cost per frame).
- **Components it hits:** any sliding panel.

## The scroller's own padding is counted twice in its scroll extent

- **Cause:** `gpuix gap` (as the port comment reports it; not rechecked, no gpuix `file:line` known).
- **Original:** the panel is the scroller and carries `p-4` (`registry/base/mobile-drawer.tsx:147`).
- **Port:** the padding sits on an inner box, so a short panel does not scroll by 2 x 16 (`src/components/mobile-drawer.tsx:114-118`).
- **gpuix lacks:** a scroll extent that counts a scroller's padding once.
- **Workaround:** the inner box.
- **Fidelity:** exact.
- **Components it hits:** any scroller with padding.

## `shadow-surface-3` painted as a border

- **Cause:** `not ported yet`. gpuix takes `BoxShadow[]` or a CSS string with several layers and `inset` (`~/code/fdarian/gpuix/FORK.md:646-649`, `packages/native/js/host.ts:558`); the comment at `src/lib/theme.ts:328-331` saying it paints one shadow is out of date.
- **Original:** `surfaceClasses(level, 3)` (`registry/base/mobile-drawer.tsx:147`): the `--shadow-3` ring and drops; in dark mode also an inset top highlight, an inset ring and a 1px black outer ring (`app/globals.css:162`). No border.
- **Port:** a `borderRightWidth: 1` in `popupBorder` and `shadow3()`, one drop (`src/components/mobile-drawer.tsx:107-110`; `src/lib/theme.ts:332-340`). The ring shows only on the right edge, so the dark highlights and outer ring are the visible loss.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every surface-3 or higher shadow (dialog has the same entry).

## No surface context for the panel's contents

- **Cause:** `not ported yet`. The ladder exists (`src/lib/surface-context.ts`, read by dialog and popups); the drawer neither reads nor provides it.
- **Original:** the level is `min(substrate + 2, 8)` and the children get it as their substrate (`registry/base/mobile-drawer.tsx:82-83`, `:161`).
- **Port:** the panel is always `color.card`, surface-3 (`src/components/mobile-drawer.tsx:107`). Opened over the page (substrate 1) that is the same colour; opened over a raised surface it would be too low.
- **Workaround:** none.
- **Fidelity:** exact on the page, approximated elsewhere.
- **Components it hits:** see the dialog entry.

## `triggerRef` is an element, not a ref object

- **Cause:** `port choice` (reason not stated; a Solid `ref` callback hands the element over, so there is no ref object to read).
- **Original:** `triggerRef?: RefObject<HTMLElement | null>` (`registry/base/mobile-drawer.tsx:30`, `:138`).
- **Port:** `triggerRef?: HostElement`, passed as `finalFocus` (`src/components/mobile-drawer.tsx:34`, `:76`); without it focus returns to whatever held it before the drawer opened.
- **Workaround:** n/a.
- **Fidelity:** exact.
- **Components it hits:** just this one.

## Focus lands on the first tab stop one tick after open

- **Cause:** `gpuix gap`. Same as [dialog](dialog.md).
- **Original:** Base UI focuses the first tabbable as the drawer opens.
- **Port:** `FocusFirst` from `dialog.tsx` runs `focusNextWithin` in a `setTimeout(0)` (`src/components/mobile-drawer.tsx:116`, `src/components/dialog.tsx:199-209`), while the panel is still sliding in.
- **Workaround:** the deferred call.
- **Fidelity:** approximated.
- **Components it hits:** dialog.

## The demo is the port's own

- **Cause:** `port choice` (reason not stated).
- **Original:** none; the registry lists `mobile-drawer` as a component (`registry.json:1439`) but no page shows it.
- **Port:** an "Open navigation" button (`tertiary`) beside "Current page: ...", and a drawer of a "Navigation" title, 14 `SidebarMenuButton` rows and a "Done" button (`src/demos/mobile-drawer.tsx:30-93`). Picking a row sets the page and closes.
- **Workaround:** n/a.
- **Fidelity:** n/a (no source copy to compare).
- **Components it hits:** just this one.
