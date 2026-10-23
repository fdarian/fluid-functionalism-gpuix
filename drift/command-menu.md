# command-menu

Original: `registry/default/command-menu.tsx`, demo in `app/docs/command-menu/page.tsx` and `lib/docs/playgrounds/command-menu.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/command-menu.tsx`, demo in `src/demos/command-menu.tsx`. The site's own menu (`src/lib/site-command-menu.tsx`) is covered in `drift/site.md`.

Ported: items as data with groups, suggestions, filter and keywords, the fluid highlight, the keyboard (arrows with wrap and disabled skipping, Home / End, Enter, Escape, ← → across tabs), tabs, filters row, footer hints with the Enter action, custom rows, the dialog shell. Sizes, spacing and type of the field, tabs, rows, headings, caps and footer match the source in both steps (`metrics`, `command-menu.tsx:211-265`).

## The panel's height does not spring to its rows

- **Cause:** `not ported yet`.
- **Original:** the column is measured (`offsetHeight`) and the frame springs to that number on `spring.moderate`, so filtering rows, switching tabs and the empty state resize the panel smoothly; reduced motion snaps (`:692-729`).
- **Port:** the root is a plain flex column (`src/components/command-menu.tsx:532-546`); the panel snaps to its content, capped by `maxHeight` (`:317-340`). In the dialog the top edge is fixed, so the bottom edge jumps as rows filter down.
- **Workaround:** none. `createMeasuredHeight` (`src/lib/measured-height.ts`) is the tool the collapses use.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The list is a bare scroller: no edge fade, no scroll-aware dividers, no custom scrollbar

- **Cause:** `not ported yet`.
- **Original:** the list is a `ScrollArea` with `scroll-fade` (32 px mask, crisp at the true ends) and `scroll-divider`: a static `border-border/60` top line, a stronger hairline on top that grows as rows pass under it, a bottom hairline that stands while rows continue and goes at the end. The footer draws no line of its own; with no footer the bottom hairline is hidden (`:1069-1072`; `app/globals.css:1087-1236`). The thumb is FF's `w-2.5` track.
- **Port:** a bare `overflowY: "scroll"` div with a fixed `borderTopWidth: 1` in `color.border` (0.12 alpha, where `/60` is `color.borderFaint`, 0.072) (`:965-972`); gpuix's overlay scrollbar; the footer always draws a `color.border` line on top (`:1287-1288`), so a short list that never scrolls still has a line above the footer where the source has none. `ScrollArea` already offers `fade`, `fadeSize` and `divider` (`src/components/scroll-area.tsx:39-53`, `:108-129`, its own divider also uses `color.border`) and is simply not used here.
- **Workaround:** none.
- **Fidelity:** dropped (fade, scroll-aware lines, thumb); approximated (static lines).
- **Components it hits:** sidebar (also a bare scroller).

## A press on a row, a tab or the list takes focus from the field on Windows and Linux

- **Cause:** `gpuix gap`.
- **Original:** the list and the tab row call `preventDefault()` on `mousedown`, so a pick or a tab click leaves DOM focus in the field and the keyboard keeps working (`:1090`, `:957`).
- **Port:** the list and the tab row call `preventDefault()` in `onMouseDown` (`src/components/command-menu.tsx:794`, `:980`), which keeps focus in the field on macOS and in the test renderer (`scripts/check-command-menu.tsx`: after a tab click the field is still focused and ← → still switch tabs).
- **gpuix lacks:** on Windows and Linux a press reaches JavaScript through a queue after native has moved focus, so `preventDefault()` in `onMouseDown` has no effect (`~/code/fdarian/gpuix/README.md:3918-3926`; README Bugs row "command-menu, and any list that keeps focus in a field while it is pressed"). There, a tab click blurs the field and ↑ ↓ Enter and Esc go nowhere until the field is clicked again. Not run on those platforms.
- **Workaround:** none.
- **Fidelity:** exact on macOS; approximated on Windows and Linux.
- **Components it hits:** combobox and any list that keeps focus in a field on a press.

## Tabs cannot take focus and carry no tab semantics

- **Cause:** `not ported yet`.
- **Original:** `TabsSubtle` on Base UI Tabs: `role="tablist"` / `tab` / `aria-selected`, roving tab stop, a travelling focus ring for keyboard focus, `aria-label="Filter results"`, a `icon` per tab, horizontal scroll when the tabs overflow; the hover pill is `bg-active` at 0.4 opacity, the selected pill dims to 0.8 under another tab's hover, and when the pointer leaves the hover pill glides back to the selected tab (`:951-973`; `registry/base/tabs-subtle.tsx:178-255`).
- **Port:** plain `div`s with `onClick` and no role, tabindex or focus ring (`src/components/command-menu.tsx:819-851`); the hover pill is a plain `color.hover` fill (0.04 / 0.06 alpha, where 0.4 of `active` is 0.028 / 0.04) and fades out in place; the selected pill never dims; `CommandMenuTab` has no `icon` (`:72-75`); no overflow scrolling (`:795-802`). Tab labels do keep the selected-pill glide on `moderate` and the hover pill's start from the selected tab (`:804-818`). The focus ring that `createFocusRing` gives tabs-subtle (`src/lib/focus-ring.tsx`) is not wired here.
- **Workaround:** none; ← → in the field switch tabs.
- **Fidelity:** approximated (looks the same at rest, no keyboard or semantics).
- **Components it hits:** just this one.

## Accessibility tree is thinner

- **Cause:** `not ported yet`.
- **Original:** rows have `id` and `aria-disabled`; sections are `role="group"` labelled by their heading; the empty state is `role="status" aria-live="polite"` (`:1105-1110`, `:1286-1289`, `:1159-1160`). The field's `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete` and `aria-activedescendant` are ported (`:858-863`).
- **Port:** the field and the rows' `id` / `aria-selected` follow the source (`src/components/command-menu.tsx:677-682`, `:975-976`, `:1123-1125`); disabled rows carry no `aria-disabled`, sections no group role or label, and the empty state no status role. gpuix does expose these (`~/code/fdarian/gpuix/README.md:3482-3537`); the combobox port uses them (`src/components/combobox.tsx:376`, `base-ui:src/combobox/root/use-combobox-root.ts:389-402`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## IME composition is not read

- **Cause:** `not ported yet` on macOS, `gpuix gap` on Windows and Linux.
- **Original:** keys inside an IME composition belong to the composer: Enter commits a candidate, arrows pick one (`:776`).
- **Port:** the handler acts on every key (`src/components/command-menu.tsx:569-626`).
- **gpuix lacks:** on Windows and Linux (TSF or IMM32, ibus), `isComposing` is always `false` and no `Process` keydown or `composition*` event is fired, and the composition keys go to the input method before GPUI sees them (`~/code/fdarian/gpuix/FORK.md:564-567`). macOS reports all three: `isComposing` on key events, a `Process` keydown for a key the input method takes first, and `compositionstart` / `compositionupdate` / `compositionend` (`FORK.md:496-499`; gpuix `README.md:3794-3820`). See `drift/combobox.md` and README "Missing features", row "IME composition". On macOS the handler could return early on `event.isComposing`; as it is, the key an input method takes first is a `Process` keydown that no `case` matches (`onKeyDown` switches on `event.key`).
- **Workaround:** none; untested.
- **Fidelity:** approximated.
- **Components it hits:** combobox, input-message.

## A click between rows is not routed to the highlighted row

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Clicks in the padding and between rows are not routed to the lit row"](dropdown.md#clicks-in-the-padding-and-between-rows-are-not-routed-to-the-lit-row), where the entry lives. Here: original `command-menu.tsx:1089`; port list `src/components/command-menu.tsx:974-989`.

## Row label never truncates, disabled rows keep the pointer cursor

- **Cause:** `not ported yet`.
- **Original:** the label is `truncate` and shares the row with the description (both shrink); a disabled row is `opacity-50 pointer-events-none`, so no pointer cursor (`:1300`, `:1308`, `:1324-1334`).
- **Port:** the label is `flexShrink: 0`, `nowrap`, so a long label pushes the description out and is clipped without an ellipsis by the wrapper's `overflow: hidden`; only the description gets an ellipsis (`src/components/command-menu.tsx:1154-1199`). A disabled row dims to 0.5 but keeps `cursor: "pointer"` (`:1138-1139`); picking and highlighting it are still refused (`:396`, `:492-493`, `select`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## A wheel scroll re-picks the row under a stationary pointer

- **Cause:** `port choice` (stated in `src/lib/fluid-hover.ts:243-245`: a scroll event carries no pointer position, so the port re-picks at the last one seen).
- **Original:** the hook has no scroll listener; rows moving under a still pointer change the highlight on the next mouse move (a browser also fires a synthetic move after a scroll).
- **Port:** `onScroll` runs `pickAtContainer()`; a keyboard move calls `releasePointer()` so the scroll it causes does not re-pick (`src/components/command-menu.tsx:486`, `:961`; `src/lib/fluid-hover.ts:243-245`, `:276-279`).
- **Workaround:** n/a.
- **Fidelity:** exact in effect.
- **Components it hits:** every fluid list in a scroller.

## Highlight travel animates `top` / `left`, not a transform

- **Cause:** `gpuix gap` (shared; transforms, see README "Missing features" row "CSS transforms").
- **Original:** the fill is pinned to the padding corner and moved with `x` / `y` on the compositor (`registry/default/fluid-hover-highlight.tsx:74-76`, `:128-134`).
- **Port:** `motion` on `top` / `left` / `width` / `height`, re-laying out per frame (`src/lib/fluid-highlight.tsx:83-100`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** every fluid list.

## Dialog enter and exit

- **Cause:** `gpuix gap` (the scale).
- **Original:** the backdrop fades on `spring.slow` (240 ms, exit 160 ms tween); the panel springs from `scale: 0.97` with opacity on `spring.slow` (`registry/base/dialog.tsx:228-239`, `:286-293`).
- **Port:** the scrim and the panel both use `slow` in / `slowExit` out (240 / 160 ms), as in the source; the panel slides 4 px down in place of the scale (`src/components/command-menu.tsx:1361-1446`). The layer unmounts when the scrim's exit completes (`onMotionComplete`, with a 260 ms timer for an exit that never animates) (`:1359`, `:1406`).
- **gpuix lacks:** `scale` (no transforms, `~/code/fdarian/gpuix/FORK.md:1198-1209`).
- **Workaround:** the 4 px slide stands in for the scale.
- **Fidelity:** approximated (no scale).
- **Components it hits:** every popup that scales in.

## Dialog shell: no modal semantics, closes on mousedown, thinner props

- **Cause:** `not ported yet`.
- **Original:** Base UI Dialog: `role="dialog"` named by a screen-reader-only `title` and `description` props, focus trapped and returned to the trigger on close, page scroll locked and the page hidden from the accessibility tree, Escape closes from anywhere, an outside press closes (a click that presses and releases on the backdrop in `drift/dialog.md`), `defaultOpen` and an uncontrolled mode, `modal`, `container` and `className` props (`:1449-1568`).
- **Port:** its own `<anchored fill="window">` layer, not the ported `Dialog` (`src/components/command-menu.tsx:1361-1446`): no role, title or description; `HideOutside` (`base-ui:src/floating-ui-solid/utils/mark-others.ts:35`, used by `src/components/dialog.tsx:195`) is not used; no focus return; `open` and `onOpenChange` are required; the scrim closes on `mousedown` through `onMouseDownOutside` (`src/components/command-menu.tsx:1433`; the dialog port uses gpuix's `DialogBackdrop`, which closes on a click); Escape works from the field only (`src/components/command-menu.tsx:612-620`).
- **Workaround:** none.
- **Fidelity:** approximated (looks and closes the same with the pointer and the field focused).
- **Components it hits:** just this one.

## The trigger shortcut is the caller's

- **Cause:** `port choice` (reason not stated; the doc comment only says opening from a key is the caller's).
- **Original:** `CommandMenuDialog` takes `shortcut` (default `"mod+k"`, `null` binds nothing) and `shortcutScope`, and listens on `window` itself; several dialogs on one combo are arbitrated: the open one answers first, then the most recent in scope (`:1430-1447`, `:1508-1540`).
- **Port:** no `shortcut` or `shortcutScope`; `createSiteMenu` binds Mod+K by hand for the site menu (`src/components/command-menu.tsx:1362-1366`; `src/lib/site-command-menu.tsx:60-78`). The demo's dialogs bind their combos in demo code (`matchesCombo` in `src/demos/command-menu.tsx`; see "Demo: dialog and footer sections differ in small ways"), with no arbitration between dialogs on one combo.
- **Workaround:** the demo's own `window` / `onKeyDown` listeners.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Shortcut helpers are a subset

- **Cause:** `not ported yet`.
- **Original:** exports `parseShortcut`, `matchesShortcut` (layout-aware, falls back to the physical key), `hasModifier`, `isMacPlatform`, `useIsMac`; `formatShortcut(shortcut, mac)` accepts aliases (`command`, `win`, `super`, `control`, `opt`, `del`, `plus`, `spacebar`, `arrowup`...) and keeps a trailing `+` as the key (`:118-303`).
- **Port:** only `formatShortcut(shortcut)` with `IS_MAC` baked in; `CAP_LABELS` knows `cmd`, `option`, `return`, `esc`, `space`, `up` / `down` / `left` / `right` but not the other aliases, so `"command+k"` draws "Command" (`src/components/command-menu.tsx:91-145`). A trailing `+` is kept as the key, as in the source (`"mod++"` draws the modifier and `+`, `shortcutTokens`, `:117-129`). The site menu carries its own `isModK` (`src/lib/site-command-menu.tsx:60-64`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## `size` does not scope the filter controls, and the dialog width is fixed

- **Cause:** `not ported yet`.
- **Original:** an omitted `size` follows the surrounding `SizeProvider`, which also gives a 480 px dialog; `CommandMenuFilters` sets its children to `compact` (`registry/default/command-menu.tsx:458-460`, `:1016`).
- **Port:** an omitted `size` follows the Size row (`src/components/command-menu.tsx:502`), but the dialog width is always 540 (`:1356`), and filter controls are the caller's to make compact.
- **Workaround:** pass `size` to each filter control.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

## Parts take no `className`, `style`, `ref` or rest props

- **Cause:** `not ported yet`.
- **Original:** every part forwards a ref and spreads rest props; `CommandMenuInput` takes the `<input>` props (`aria-label`, `onKeyDown`, which runs first and can `preventDefault()`), `CommandMenuEmpty` takes any children, `CommandMenuFooter` takes `children` to replace the hints, `CommandMenuItem` takes `className` and `onClick` (`:755-886`, `:1151-1171`, `:1364-1415`).
- **Port:** typed prop lists only (`src/components/command-menu.tsx:344-359`, `:942-946`, `:1260-1263`, `:1081-1090`, `:1051`): `CommandMenuEmpty` takes a string, `CommandMenuFooter` has no `children`, no `className`. Port-only: required `testId` on the root, `CommandMenuPanel`, `CommandMenuItemText`, `searchIcon`, and a click on the field row that focuses the input (`:642-647`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Clipped rows are still laid out and painted

- **Cause:** `gpuix gap`.
- **Original:** a browser skips paint for content a scroller clips away, and `content-visibility: auto` skips layout too, so a page of eight menus costs about what one does.
- **Port:** the whole page is retained and clipped, but still costs per frame (gpuix #46; checked in `src/lib/cull.ts:53-118` and `src/lib/demo-kit.tsx:6-52`, the workaround below).
- **gpuix lacks:** culling. Every element, including rows and cards outside a scroller's viewport, is built, laid out and painted each frame. `<virtual-list>` and `contentVisibility` (gpuix 511bebab, e591681e) skip them, but FF keeps `createCulling`: Round 16 answered the three reasons first given against it (Chrome's fixed 150% `auto` margin, no scroll anchoring, a clip from `contentVisibility`): FF's own `IntersectionObserver` at 25% can toggle `contentVisibility: 'hidden'` itself, with `containIntrinsicSize: auto <w> auto <h>` from the report rect; anchoring landed; `visible` applies no clip. That A/B (branch `cull-cv`, headless, e591681e) still lost to `createCulling`: entering the command-menu page took 8 layout passes against 2 (`check-command-menu` budget 4); a forced bounds read after a layout write cost 2 passes / 6.24 ms against 1 / 2.87 ms, and after a paint-only write 1.05 passes / 6.61 ms against 0.05 / 0.02 ms, because fluid-hover's `ResizeObserver` `measure()` reads a box (`src/lib/fluid-hover.ts:174`) and gpuix builds a hidden subtree for any geometry read (`packages/native/src/renderer.rs:488-527`), where a `display: none` box answers empty; and the one-column bento tiles were first read as laid out wrong without the `flexBasis` pin (card-ask-user-questions 921 against 305 px), which gpuix #89 showed is not a gpuix bug (see the "home bento tiles" row of the Bugs table). Page switches were equal (settled, median of visits #2-#4, changelog / showcase / command-menu / button: 98 / 223 / 128 / 59 ms on `cull-cv` against 103 / 221 / 136 / 60). `createCulling` stays; the source site uses no `content-visibility`. (README "Culling" row; the gpuix citations are `~/code/fdarian/gpuix/README.md:2989` "Performance model", `:3072` "Pannable surfaces must cull"). The command-menu page has about 1,400 elements and 800 text runs, which cost 57 ms of CPU a frame (18 ms in the native draw) against 10 ms (3.6 ms) on the dropdown page; the 80 ms highlight spring got one or two frames, so it read as a jump, and a wheel tick cost 110 to 135 ms (numbers from the earlier measurement, not re-run in this audit). On gpuix `poc` b03d4e27, measured live with `pnpm perf` at load average 1.4-3.1 in two alternating pairs (culling on against off, the `IntersectionObserver` effect disabled), turning culling off was worse on 9 pages and better on none: showcase idle CPU 45 to 80% and sidebar-sweep draw p95 5.5 to 11.1 ms, input-message idle 3.3 to 51.5%, fluid-hover idle 37 to 55% and p95 4.1 to 7.3 ms, changelog idle 37 to 46% and p95 4.2 to 6.1 ms, scrollbars p95 4.1 to 11.6, ask-user-questions 5.0 to 9.3, audio-mixer 5.0 to 8.4, command-menu 4.9 to 7.2, scroll-area 10.8 to 12.0; summed over 49 pages, idle CPU 464 to 575 and p95 244 to 274 ms (on e5231304 every page's p95 was 10-25 ms, now about 4-5 ms with culling). Retained and clipped content still costs per frame (gpuix #46), so the culling and the paused loops stay until it is fixed.
- **Workaround:** `DemoCard` (`src/lib/demo-kit.tsx:6-52`, through `createCulling` in `src/lib/cull.ts:53-118`) watches its content with an `IntersectionObserver` rooted at the page scroller (`rootMargin: "25% 0px"`, `OVERSCAN` at `cull.ts:35`, passed at `:102`) and, once the card is more than a quarter of the scroller away, sets its content to `display: none` (no box is built for it or anything inside) and pins the height it had (`cull.ts:95-100`, `demo-kit.tsx:26`). The card stays mounted, so typed text and tabs survive a scroll away and back. This brought the frame to 20 ms (6.6 ms native). A `<virtual-list>` page was not used: it needs each card as a direct child of the list, which no demo's markup is, and the scenario helper `reveal()` (`src/demos/command-menu.tsx:733-756`) reads bounds a row outside the window does not have. The menu's own list is not virtualised either: the highlight lives inside the scrolled content and fluid hover measures every row, so a menu's 15 clipped rows still cost a few ms each.
- **Fidelity:** approximated (same output, a hitch of a frame or two when a card far from the scroller is jumped to).
- **Components it hits:** any long page or list; the other demo pages gain the same card hiding.

## Demo: variants of the source page that are missing

- **Cause:** `not ported yet`.
- **Original:** the page has a Playground (rail: trigger shortcut, descriptions, shortcut caps, suggestions first, tabs, filters, footer hints; "Open as a dialog"; Get code presets), the sections Basic, Descriptions / shortcuts / disabled rows, Suggestions, Tabs, Filters, "Dialog and trigger shortcut", Footer hints, Custom rows, and eight API reference tables; each section has a sentence of prose (`app/docs/command-menu/page.tsx:389-596`, `:598-634`; `lib/docs/playgrounds/command-menu.tsx`).
- **Port:** every section and every playground control, default and shuffle is there, with the same 15 rows, groups, keywords, suggestions and copy. Missing: the playground's Get code presets and Code tab, a pick's toast (the playground shows nothing on a pick), the API tables, the prose, a pill state (the Radius row covers the site's), and the page title "CommandMenu" and description ("1 field over every action. Type, arrow, Enter."): the port's title is "Command Menu" with no description.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: dialog and footer sections differ in small ways

- **Cause:** `not ported yet`.
- **Original:** a pick shows a toast, `Ran “<label>”`; the dialog section's first dialog binds its own combo through `CommandMenuDialog`'s `shortcut="mod+p"`, the second passes `shortcut={null}`; the playground's dialog takes `shortcut` and `shortcutScope` (the preview, so the combo fires only while focus is inside it); the footer section is one panel with tabs and suggestions (`page.tsx:364`, `:508-545`, `:547-566`; `lib/docs/playgrounds/command-menu.tsx:325-342`).
- **Port:** a pick sets a line of text, `Ran: <label>`. `CommandMenuDialog` has no `shortcut` prop, so the demo binds the combos itself: ⌘P through a `window` keydown listener for the page's lifetime in the dialog section (`DialogSection`), and the playground's combo through `onKeyDown` on the preview, which only sees keys while focus is inside it (`matchesCombo`, `Playground`). Both are demo code, so a second use of the component repeats them.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
