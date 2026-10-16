# command-menu

Original: `registry/default/command-menu.tsx`, demo in `app/docs/command-menu/page.tsx` and `lib/docs/playgrounds/command-menu.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/command-menu.tsx`, demo in `src/demos/command-menu.tsx`. The site's own menu (`src/lib/site-command-menu.tsx`) is covered in `drift/site.md`.

Ported: items as data with groups, suggestions, filter and keywords, the fluid highlight, the keyboard (arrows with wrap and disabled skipping, Home / End, Enter, Escape, ← → across tabs), tabs, filters row, footer hints with the Enter action, custom rows, the dialog shell. Sizes, spacing and type of the field, tabs, rows, headings, caps and footer match the source in both steps (`metrics`, `command-menu.tsx:196-242`).

## The panel's height does not spring to its rows

- **Cause:** `not ported yet`.
- **Original:** the column is measured (`offsetHeight`) and the frame springs to that number on `spring.moderate`, so filtering rows, switching tabs and the empty state resize the panel smoothly; reduced motion snaps (`:692-729`).
- **Port:** the root is a plain flex column (`src/components/command-menu.tsx:483-496`); the panel snaps to its content, capped by `maxHeight` (`:299-313`). In the dialog the top edge is fixed, so the bottom edge jumps as rows filter down.
- **Workaround:** none. `createMeasuredHeight` (`src/lib/measured-height.ts`) is the tool the collapses use.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The list is a bare scroller: no edge fade, no scroll-aware dividers, no custom scrollbar

- **Cause:** `not ported yet`.
- **Original:** the list is a `ScrollArea` with `scroll-fade` (32 px mask, crisp at the true ends) and `scroll-divider`: a static `border-border/60` top line, a stronger hairline on top that grows as rows pass under it, a bottom hairline that stands while rows continue and goes at the end. The footer draws no line of its own; with no footer the bottom hairline is hidden (`:1069-1072`; `app/globals.css:1087-1236`). The thumb is FF's `w-2.5` track.
- **Port:** a bare `overflowY: "scroll"` div with a fixed `borderTopWidth: 1` in `color.border` (0.12 alpha, where `/60` is `color.borderFaint`, 0.072) (`:866-877`); gpuix's overlay scrollbar; the footer always draws a `color.border` line on top (`:1186-1187`), so a short list that never scrolls still has a line above the footer where the source has none. `ScrollArea` already offers `fade`, `fadeSize` and `divider` (`src/components/scroll-area.tsx:64-70`, `:358-391`, its own divider also uses `color.border`) and is simply not used here.
- **Workaround:** none.
- **Fidelity:** dropped (fade, scroll-aware lines, thumb); approximated (static lines).
- **Components it hits:** sidebar (also a bare scroller).

## A press on a row, a tab or the list takes focus from the field on Windows and Linux

- **Cause:** `gpuix gap`.
- **Original:** the list and the tab row call `preventDefault()` on `mousedown`, so a pick or a tab click leaves DOM focus in the field and the keyboard keeps working (`:1090`, `:957`).
- **Port:** the list and the tab row call `preventDefault()` in `onMouseDown` (`src/components/command-menu.tsx:733`, `:916`), which keeps focus in the field on macOS and in the test renderer (`scripts/check-command-menu.tsx`: after a tab click the field is still focused and ← → still switch tabs).
- **gpuix lacks:** on Windows and Linux a press reaches JavaScript through a queue after native has moved focus, so `preventDefault()` in `onMouseDown` has no effect (`~/code/fdarian/gpuix/README.md:3259-3266`; README Bugs row "command-menu, and any list that keeps focus in a field while it is pressed"). There, a tab click blurs the field and ↑ ↓ Enter and Esc go nowhere until the field is clicked again. Not run on those platforms.
- **Workaround:** none.
- **Fidelity:** exact on macOS; approximated on Windows and Linux.
- **Components it hits:** combobox and any list that keeps focus in a field on a press.

## Tabs cannot take focus and carry no tab semantics

- **Cause:** `not ported yet`.
- **Original:** `TabsSubtle` on Base UI Tabs: `role="tablist"` / `tab` / `aria-selected`, roving tab stop, a travelling focus ring for keyboard focus, `aria-label="Filter results"`, a `icon` per tab, horizontal scroll when the tabs overflow; the hover pill is `bg-active` at 0.4 opacity, the selected pill dims to 0.8 under another tab's hover, and when the pointer leaves the hover pill glides back to the selected tab (`:951-973`; `registry/base/tabs-subtle.tsx:178-255`).
- **Port:** plain `div`s with `onClick` and no role, tabindex or focus ring (`src/components/command-menu.tsx:764-787`); the hover pill is a plain `color.hover` fill (0.04 / 0.06 alpha, where 0.4 of `active` is 0.028 / 0.04) and fades out in place; the selected pill never dims; `CommandMenuTab` has no `icon` (`:62-65`); no overflow scrolling (`:699-710`). Tab labels do keep the selected-pill glide on `moderate` and the hover pill's start from the selected tab (`:712-726`). The focus ring that `createFocusRing` gives tabs-subtle (`src/lib/focus-ring.tsx`) is not wired here.
- **Workaround:** none; ← → in the field switch tabs.
- **Fidelity:** approximated (looks the same at rest, no keyboard or semantics).
- **Components it hits:** just this one.

## Label weight 550 is a static 600 and does not ease

- **Cause:** `gpuix gap` (shared; variable-font axes, see the "Variable-font axes" row in `README.md` "Missing features").
- **Original:** the selected tab's label eases between weight 400 and 550 (`registry/base/tabs-subtle.tsx:326-337`).
- **Port:** SemiBold 600 switches at once, with a hidden semibold copy reserving the width (`src/components/command-menu.tsx:655-677`).
- **Workaround:** static cuts.
- **Fidelity:** approximated.
- **Components it hits:** tabs, tabs-subtle, sidebar.

## Accessibility tree is thinner

- **Cause:** `not ported yet`.
- **Original:** rows have `id` and `aria-disabled`; sections are `role="group"` labelled by their heading; the empty state is `role="status" aria-live="polite"` (`:1105-1110`, `:1286-1289`, `:1159-1160`). The field's `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete` and `aria-activedescendant` are ported (`:858-863`).
- **Port:** the field and the rows' `id` / `aria-selected` follow the source (`src/components/command-menu.tsx:695-700`, `:993-994`, `:1140-1142`); disabled rows carry no `aria-disabled`, sections no group role or label, and the empty state no status role. gpuix does expose these (`~/code/fdarian/gpuix/README.md:2965-2985`); the combobox port uses them (`src/components/combobox.tsx:448-455`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## IME composition is invisible to JS

- **Cause:** `gpuix gap`.
- **Original:** keys inside an IME composition belong to the composer: Enter commits a candidate, arrows pick one (`:776`).
- **Port:** the handler acts on every key (`src/components/command-menu.tsx:516-573`).
- **gpuix lacks:** `isComposing` and `composition*` events (`~/code/fdarian/gpuix/FORK.md:499-505`); see `drift/combobox.md`, README "Missing features" row "IME composition".
- **Workaround:** none; untested.
- **Fidelity:** approximated.
- **Components it hits:** combobox, dropdown-search, input-group, input-message.

## A click between rows is not routed to the highlighted row

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Clicks in the padding and between rows are not routed to the lit row"](dropdown.md#clicks-in-the-padding-and-between-rows-are-not-routed-to-the-lit-row), where the entry lives. Here: original `command-menu.tsx:1087`; port list `src/components/command-menu.tsx:911-924`.

## Row label never truncates, disabled rows keep the pointer cursor

- **Cause:** `not ported yet`.
- **Original:** the label is `truncate` and shares the row with the description (both shrink); a disabled row is `opacity-50 pointer-events-none`, so no pointer cursor (`:1300`, `:1308`, `:1324-1334`).
- **Port:** the label is `flexShrink: 0`, `nowrap`, so a long label pushes the description out and is clipped without an ellipsis by the wrapper's `overflow: hidden`; only the description gets an ellipsis (`src/components/command-menu.tsx:1095-1126`). A disabled row dims to 0.5 but keeps `cursor: "pointer"` (`:1041-1042`); picking and highlighting it are still refused (`:373-375`, `select`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Label text is not trimmed to the cap height

- **Cause:** `gpuix gap` (shared; `text-box-trim`, see README "Missing features").
- **Original:** rows, headings and the empty state use `[text-box:trim-both_cap_alphabetic]`, so labels centre on their caps (`:1324`, `:1331`).
- **Port:** flex centring of the full line box (`src/components/command-menu.tsx:1088-1111`), about a pixel of drift.
- **Workaround:** flex centring.
- **Fidelity:** approximated.
- **Components it hits:** badge, select, every list row.

## State changes do not fade over 80 ms

- **Cause:** `not ported yet`.
- **Original:** row text and icon colour and stroke width ease over `duration-80`; the field's search icon likewise on focus (`:849`, `:1306`, `:1317`).
- **Port:** row text, row icon and the field icon switch at once (`src/components/command-menu.tsx:610-613`, `:1081-1084`, `:1102-1111`). `colorFade` and `Icon`'s `fade` exist (`src/lib/theme.ts:451-455`, `src/lib/icon.tsx:21`) and combobox and select use them; whether gpuix can tween `strokeWidth` is not checked.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## A wheel scroll re-picks the row under a stationary pointer

- **Cause:** `port choice` (stated in `src/lib/fluid-hover.ts:202-206`: a scroll event carries no pointer position, so the port re-picks at the last one seen).
- **Original:** the hook has no scroll listener; rows moving under a still pointer change the highlight on the next mouse move (a browser also fires a synthetic move after a scroll).
- **Port:** `onScroll` runs `pick()`; a keyboard move calls `releasePointer()` so the scroll it causes does not re-pick (`src/components/command-menu.tsx:440`, `:899`; `src/lib/fluid-hover.ts:202-206`, `:229-231`).
- **Workaround:** n/a.
- **Fidelity:** exact in effect.
- **Components it hits:** every fluid list in a scroller.

## Highlight travel animates `top` / `left`, not a transform

- **Cause:** `gpuix gap` (shared; transforms, see README "Missing features" row "CSS transforms").
- **Original:** the fill is pinned to the padding corner and moved with `x` / `y` on the compositor (`registry/default/fluid-hover-highlight.tsx:74-76`, `:128-134`).
- **Port:** `motion` on `top` / `left` / `width` / `height`, re-laying out per frame (`src/lib/fluid-highlight.tsx:69-86`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** every fluid list.

## Scroll travel starts a microtask after the key

- **Cause:** `gpuix gap`.
- **Original:** the key handler starts the scroll animation in the same call (`registry/default/command-menu.tsx:569-602`).
- **Port:** the motion value that carries the travel is created at the first travel and its calls wait for a microtask (`src/components/command-menu.tsx:410-436`, `:465-470`); the menu's release of it waits too, so closing on Esc or leaving the page from a click does not throw.
- **gpuix lacks:** a motion value cannot be created, driven or released inside a handler that native called synchronously (a key, a press): the renderer throws "This renderer call cannot run inside an event handler that native called synchronously". A menu mounts from ⌘K and unmounts on Esc, so a value made at mount would throw.
- **Workaround:** `queueMicrotask`; one microtask is under a frame, so nothing shows. Each `scrollTop` write during the travel is a renderer call (about 7 ms apiece in the offscreen renderer); a live frame-rate check is open.
- **Fidelity:** exact in effect.
- **Components it hits:** slider (its `createAnimateQueue`), and any component that animates a motion value from a key or press.

## Reduced motion reaches only the list scroll

- **Cause:** `not ported yet`.
- **Original:** the highlight travel, the list scroll and the height spring snap under the OS setting; the opacity fade stays (`registry/default/command-menu.tsx:567`, `:590`, `:723`; `registry/default/fluid-hover-highlight.tsx:83-91`).
- **Port:** the arrow-key scroll reads `createReducedMotion()` and jumps (`src/components/command-menu.tsx:407`, `:460-463`). The fill's travel and the dialog's fades ignore it; nothing else in `src/` reads the setting.
- **Workaround:** none.
- **Fidelity:** approximated (the scroll snaps, the fill still glides).
- **Components it hits:** every component with motion.
- **Note:** gpuix's `MotionConfig reducedMotion="user"` makes `motion.*` position and size properties jump (`~/code/fdarian/gpuix/README.md:1953-1966`); the fill is a `motion.div`, so one wrapper at the app root would cover it.

## Panel frame: a border and one shadow, and the dialog uses surface 3

- **Cause:** `not ported yet` (the stated reason, "gpuix paints one outer shadow", no longer holds: `boxShadow` takes a list, `~/code/fdarian/gpuix/README.md:5192`).
- **Original:** `Elevated offset=2 shadowLevel=3` for the inline panel (surface 3, `--shadow-3`: a 1 px ring plus two drops, with an inset highlight and ring in dark). The dialog panel is `surfaceClasses(substrate + 4)`, surface 5 with `--shadow-5` (`app/docs/command-menu/page.tsx:344-354`; `registry/base/dialog.tsx:30`, `:190`, `:274`).
- **Port:** `CommandMenuPanel` is `color.card` (surface 3) with a real 1 px `popupBorder` (it takes layout, the ring does not) and `shadow3()` (the 3 px drop alone) for both the inline panel and the dialog (`src/components/command-menu.tsx:314-328`, `:1363`; `src/lib/theme.ts:469-481`). In dark mode the dialog is `#252525` where the source draws `#333333`.
- **Workaround:** `popupBorder` stands in for the ring.
- **Fidelity:** approximated.
- **Components it hits:** every popup, dialog and mobile-drawer.

## Dialog enter and exit

- **Cause:** `gpuix gap` (the scale).
- **Original:** the backdrop fades on `spring.slow` (240 ms, exit 160 ms tween); the panel springs from `scale: 0.97` with opacity on `spring.slow` (`registry/base/dialog.tsx:228-239`, `:286-293`).
- **Port:** the scrim and the panel both use `slow` in / `slowExit` out (240 / 160 ms), as in the source; the panel slides 4 px down in place of the scale (`src/components/command-menu.tsx:1349-1433`). The layer unmounts when the scrim's exit completes (`onMotionComplete`, with a 260 ms timer for an exit that never animates) (`:1346`, `:1355`).
- **gpuix lacks:** `scale` (no transforms, `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the 4 px slide stands in for the scale.
- **Fidelity:** approximated (no scale).
- **Components it hits:** every popup that scales in.

## Dialog shell: no modal semantics, closes on mousedown, thinner props

- **Cause:** `not ported yet`.
- **Original:** Base UI Dialog: `role="dialog"` named by a screen-reader-only `title` and `description` props, focus trapped and returned to the trigger on close, page scroll locked and the page hidden from the accessibility tree, Escape closes from anywhere, an outside press closes (a click that presses and releases on the backdrop in `drift/dialog.md`), `defaultOpen` and an uncontrolled mode, `modal`, `container` and `className` props (`:1449-1568`).
- **Port:** its own `<anchored fill="window">` layer, not the ported `Dialog` (`src/components/command-menu.tsx:1288-1372`): no role, title or description; `HideOutside` (`src/lib/modal.tsx`, used by `src/components/dialog.tsx:331`) is not used; no focus return; `open` and `onOpenChange` are required; the scrim closes on `mousedown` through `onMouseDownOutside` (`:1321`; the dialog port works around this with a click, `drift/dialog.md`); Escape works from the field only (`:530-534`).
- **Workaround:** none.
- **Fidelity:** approximated (looks and closes the same with the pointer and the field focused).
- **Components it hits:** just this one.

## The trigger shortcut is the caller's

- **Cause:** `port choice` (reason not stated; the doc comment only says opening from a key is the caller's).
- **Original:** `CommandMenuDialog` takes `shortcut` (default `"mod+k"`, `null` binds nothing) and `shortcutScope`, and listens on `window` itself; several dialogs on one combo are arbitrated: the open one answers first, then the most recent in scope (`:1430-1447`, `:1508-1540`).
- **Port:** no `shortcut` or `shortcutScope`; `createSiteMenu` binds Mod+K by hand for the site menu (`src/components/command-menu.tsx:1289`; `src/lib/site-command-menu.tsx:44-63`). The demo's dialogs bind their combos in demo code (`matchesCombo` in `src/demos/command-menu.tsx`; see "Demo: dialog and footer sections differ in small ways"), with no arbitration between dialogs on one combo.
- **Workaround:** the demo's own `window` / `onKeyDown` listeners.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Shortcut helpers are a subset

- **Cause:** `not ported yet`.
- **Original:** exports `parseShortcut`, `matchesShortcut` (layout-aware, falls back to the physical key), `hasModifier`, `isMacPlatform`, `useIsMac`; `formatShortcut(shortcut, mac)` accepts aliases (`command`, `win`, `super`, `control`, `opt`, `del`, `plus`, `spacebar`, `arrowup`...) and keeps a trailing `+` as the key (`:118-303`).
- **Port:** only `formatShortcut(shortcut)` with `IS_MAC` baked in; `CAP_LABELS` knows `cmd`, `option`, `return`, `esc`, `space`, `up` / `down` / `left` / `right` but not the other aliases, so `"command+k"` draws "Command" (`src/components/command-menu.tsx:81-136`). A trailing `+` is kept as the key, as in the source (`"mod++"` draws the modifier and `+`, `shortcutTokens`, `:113-125`). The site menu carries its own `isModK` (`src/lib/site-command-menu.tsx:60-64`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## `size` does not scope the filter controls, and the dialog width is fixed

- **Cause:** `not ported yet`.
- **Original:** an omitted `size` follows the surrounding `SizeProvider`, which also gives a 480 px dialog; `CommandMenuFilters` sets its children to `compact` (`registry/default/command-menu.tsx:458-460`, `:1016`).
- **Port:** an omitted `size` follows the Size row (`src/components/command-menu.tsx:454`), but the dialog width is always 540 (`:1249`), and filter controls are the caller's to make compact.
- **Workaround:** pass `size` to each filter control.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

## Parts take no `className`, `style`, `ref` or rest props

- **Cause:** `not ported yet`.
- **Original:** every part forwards a ref and spreads rest props; `CommandMenuInput` takes the `<input>` props (`aria-label`, `onKeyDown`, which runs first and can `preventDefault()`), `CommandMenuEmpty` takes any children, `CommandMenuFooter` takes `children` to replace the hints, `CommandMenuItem` takes `className` and `onClick` (`:755-886`, `:1151-1171`, `:1364-1415`).
- **Port:** typed prop lists only (`src/components/command-menu.tsx:502-507`, `:988`, `:1187-1190`, `:1018-1027`): `CommandMenuEmpty` takes a string, `CommandMenuFooter` has no `children`, no `className`. Port-only: required `testId` on the root, `CommandMenuPanel`, `CommandMenuItemText`, `searchIcon`, and a click on the field row that focuses the input (`:560-565`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Input line box in the compact step

- **Cause:** `not ported yet`.
- **Original:** the field is 14 / 24 px (default) and 13 / 20 px (compact, `leading-5`); 16 px on a coarse pointer (`:877-878`).
- **Port:** the field's box is a fixed 24 px high and only `fontSize` is applied, so in compact the line box is 24 where the source has 20; `SUBTITLE_COMPACT`'s 18 line height is never used (`src/components/command-menu.tsx:208-209`, `:639-640`). The touch size does not apply on desktop.
- **Workaround:** none.
- **Fidelity:** approximated (the caret is taller in compact).
- **Components it hits:** just this one.

## Clipped rows are still laid out and painted

- **Cause:** `gpuix gap`.
- **Original:** a browser skips paint for content a scroller clips away, and `content-visibility: auto` skips layout too, so a page of eight menus costs about what one does.
- **Port:** the whole page is built, laid out and painted each frame (checked in `src/lib/demo-kit.tsx:17-73`, the workaround below).
- **gpuix lacks:** culling. Every element, including rows and cards outside a scroller's viewport, is built, laid out and painted each frame. Only `<virtual-list>` skips them (`~/code/fdarian/gpuix/README.md:2519-2530` "Performance model", `:2602` "Pannable surfaces must cull"; the README row "Culling"). The command-menu page has about 1,400 elements and 800 text runs, which cost 57 ms of CPU a frame (18 ms in the native draw) against 10 ms (3.6 ms) on the dropdown page; the 80 ms highlight spring got one or two frames, so it read as a jump, and a wheel tick cost 110 to 135 ms (numbers from the earlier measurement, not re-run in this audit).
- **Workaround:** `DemoCard` (`src/lib/demo-kit.tsx:30-73`) watches its content with an `IntersectionObserver` rooted at the page scroller (`rootMargin: "25% 0px"`, `:27`, `:50`) and, once the card is more than a quarter of the scroller away, sets its content to `display: none` (no box is built for it or anything inside) and pins the height it had (`:47`, `:71-73`). The card stays mounted, so typed text and tabs survive a scroll away and back. This brought the frame to 20 ms (6.6 ms native). A `<virtual-list>` page was not used: it needs each card as a direct child of the list, which no demo's markup is, and the scenario helper `reveal()` (`src/demos/command-menu.tsx:828-851`) reads bounds a row outside the window does not have. The menu's own list is not virtualised either: the highlight lives inside the scrolled content and fluid hover measures every row, so a menu's 15 clipped rows still cost a few ms each.
- **Fidelity:** approximated (same output, a hitch of a frame or two when a card far from the scroller is jumped to).
- **Components it hits:** any long page or list; the other demo pages gain the same card hiding.

## Demo: variants of the source page that are missing

- **Cause:** `not ported yet`.
- **Original:** the page has a Playground (rail: trigger shortcut, descriptions, shortcut caps, suggestions first, tabs, filters, footer hints; "Open as a dialog"; Get code presets), the sections Basic, Descriptions / shortcuts / disabled rows, Suggestions, Tabs, Filters, "Dialog and trigger shortcut", Footer hints, Custom rows, and eight API reference tables; each section has a sentence of prose (`app/docs/command-menu/page.tsx:389-596`, `:598-634`; `lib/docs/playgrounds/command-menu.tsx`).
- **Port:** every section and every playground control, default and shuffle is there, with the same 15 rows, groups, keywords, suggestions and copy; plus two cards the source has no section for, "Tabs and filters" (the playground's both-on state) and "Compact" (`size="compact"`, which the source reaches only through the site's Size row) (`src/demos/command-menu.tsx`). Missing: the playground's Get code presets and Code tab, a pick's toast (the playground shows nothing on a pick), the API tables, the prose, a pill state (the Radius row covers the site's), and the page title "CommandMenu" and description ("1 field over every action. Type, arrow, Enter."): the port's title is "Command Menu" with no description.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: dialog and footer sections differ in small ways

- **Cause:** `not ported yet` for the toast; `port choice` (reason not stated) for the extra footer panel.
- **Original:** a pick shows a toast, `Ran “<label>”`; the dialog section's first dialog binds its own combo through `CommandMenuDialog`'s `shortcut="mod+p"`, the second passes `shortcut={null}`; the playground's dialog takes `shortcut` and `shortcutScope` (the preview, so the combo fires only while focus is inside it); the footer section is one panel with tabs and suggestions (`page.tsx:364`, `:508-545`, `:547-566`; `lib/docs/playgrounds/command-menu.tsx:325-342`).
- **Port:** a pick sets a line of text, `Ran: <label>`. `CommandMenuDialog` has no `shortcut` prop, so the demo binds the combos itself: ⌘P through a `window` keydown listener for the page's lifetime in the dialog section (`DialogSection`), and the playground's combo through `onKeyDown` on the preview, which only sees keys while focus is inside it (`matchesCombo`, `Playground`). Both are demo code, so a second use of the component repeats them. The footer section adds a second panel with custom hints, which the source only mentions in prose (`FooterSection`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
