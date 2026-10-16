# command-menu

Original: `registry/default/command-menu.tsx`, demo in `app/docs/command-menu/page.tsx` and `lib/docs/playgrounds/command-menu.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/command-menu.tsx`, demo in `src/demos/command-menu.tsx`. The site's own menu (`src/lib/site-command-menu.tsx`) is covered in `drift/site.md`.

Ported: items as data with groups, suggestions, filter and keywords, the fluid highlight, the keyboard (arrows with wrap and disabled skipping, Home / End, Enter, Escape, ← → across tabs), tabs, filters row, footer hints with the Enter action, custom rows, the dialog shell. Sizes, spacing and type of the field, tabs, rows, headings, caps and footer match the source in both steps (`metrics`, `command-menu.tsx:196-242`).

## Arrow keys jump to the row instead of scrolling to it

- **Cause:** `not ported yet`.
- **Original:** a keyboard move keeps the row at the centre of the viewport and the viewport travels there on `spring.fast` (80 ms), so row and fill move together; a new animation stops the running one; a move to row 0, a query reset and reduced motion snap (`registry/default/command-menu.tsx:569-602`, the spring at `:594-599`).
- **Port:** `move` calls `centerRow`, which calls `revealRow(..., "center")`, and that is an instant `scroller.scrollTo({ top })` (`src/components/command-menu.tsx:389-393`, `:423`; `src/lib/list-nav.ts:65-69`). The list jumps a row while the fill springs over 80 ms, so the fill chases a row that already moved. Home, End and the wrap at either end jump the same way.
- **Workaround:** none.
- **Fidelity:** dropped (the scroll is instant, the centring is exact).
- **Components it hits:** just this one; combobox and select use `revealRow` with `"nearest"`.
- **Note:** nothing stops a port. gpuix's `scrollTo({ behavior: "smooth" })` is no substitute, it runs 300 to 450 ms (`~/code/fdarian/gpuix/README.md:2264`) against 80 ms. Writing `scrollTop` each frame from the shared clock (`src/lib/clock.ts`) with the `fast` spring would match; `scrollTop` is settable and clamped (README `:2255`).

## The panel's height does not spring to its rows

- **Cause:** `not ported yet`.
- **Original:** the column is measured (`offsetHeight`) and the frame springs to that number on `spring.moderate`, so filtering rows, switching tabs and the empty state resize the panel smoothly; reduced motion snaps (`:692-729`).
- **Port:** the root is a plain flex column (`src/components/command-menu.tsx:463-476`); the panel snaps to its content, capped by `maxHeight` (`:299-313`). In the dialog the top edge is fixed, so the bottom edge jumps as rows filter down.
- **Workaround:** none. `createMeasuredHeight` (`src/lib/measured-height.ts`) is the tool the collapses use.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The list is a bare scroller: no edge fade, no scroll-aware dividers, no custom scrollbar

- **Cause:** `not ported yet`.
- **Original:** the list is a `ScrollArea` with `scroll-fade` (32 px mask, crisp at the true ends) and `scroll-divider`: a static `border-border/60` top line, a stronger hairline on top that grows as rows pass under it, a bottom hairline that stands while rows continue and goes at the end. The footer draws no line of its own; with no footer the bottom hairline is hidden (`:1069-1072`; `app/globals.css:1087-1236`). The thumb is FF's `w-2.5` track.
- **Port:** a bare `overflowY: "scroll"` div with a fixed `borderTopWidth: 1` in `color.border` (0.12 alpha, where `/60` is `color.borderFaint`, 0.072) (`:866-877`); gpuix's overlay scrollbar; the footer always draws a `color.border` line on top (`:1186-1187`), so a short list that never scrolls still has a line above the footer where the source has none. `ScrollArea` already offers `fade`, `fadeSize` and `divider` (`src/components/scroll-area.tsx:64-70`, `:350-383`, its own divider also uses `color.border`) and is simply not used here.
- **Workaround:** none.
- **Fidelity:** dropped (fade, scroll-aware lines, thumb); approximated (static lines).
- **Components it hits:** sidebar (also a bare scroller).

## A press on a row, a tab or the list takes focus from the field on Windows and Linux

- **Cause:** `gpuix gap`.
- **Original:** the list and the tab row call `preventDefault()` on `mousedown`, so a pick or a tab click leaves DOM focus in the field and the keyboard keeps working (`:1090`, `:957`).
- **Port:** the list and the tab row call `preventDefault()` in `onMouseDown` (`src/components/command-menu.tsx:735`, `:918`), which keeps focus in the field on macOS and in the test renderer (`scripts/check-command-menu.tsx`: after a tab click the field is still focused and ← → still switch tabs).
- **gpuix lacks:** on Windows and Linux a press reaches JavaScript through a queue after native has moved focus, so `preventDefault()` in `onMouseDown` has no effect (`~/code/fdarian/gpuix/README.md:3259-3266`; README Bugs row "command-menu, and any list that keeps focus in a field while it is pressed"). There, a tab click blurs the field and ↑ ↓ Enter and Esc go nowhere until the field is clicked again. Not run on those platforms.
- **Workaround:** none.
- **Fidelity:** exact on macOS; approximated on Windows and Linux.
- **Components it hits:** combobox and any list that keeps focus in a field on a press.

## Tabs cannot take focus and carry no tab semantics

- **Cause:** `not ported yet`.
- **Original:** `TabsSubtle` on Base UI Tabs: `role="tablist"` / `tab` / `aria-selected`, roving tab stop, a travelling focus ring for keyboard focus, `aria-label="Filter results"`, a `icon` per tab, horizontal scroll when the tabs overflow; the hover pill is `bg-active` at 0.4 opacity, the selected pill dims to 0.8 under another tab's hover, and when the pointer leaves the hover pill glides back to the selected tab (`:951-973`; `registry/base/tabs-subtle.tsx:178-255`).
- **Port:** plain `div`s with `onClick` and no role, tabindex or focus ring (`src/components/command-menu.tsx:733-756`); the hover pill is a plain `color.hover` fill (0.04 / 0.06 alpha, where 0.4 of `active` is 0.028 / 0.04) and fades out in place; the selected pill never dims; `CommandMenuTab` has no `icon` (`:62-65`); no overflow scrolling (`:699-710`). Tab labels do keep the selected-pill glide on `moderate` and the hover pill's start from the selected tab (`:712-726`). The focus ring that `createFocusRing` gives tabs-subtle (`src/lib/focus-ring.tsx`) is not wired here.
- **Workaround:** none; ← → in the field switch tabs.
- **Fidelity:** approximated (looks the same at rest, no keyboard or semantics).
- **Components it hits:** just this one.

## Label weight 550 is a static 600 and does not ease

- **Cause:** `gpuix gap` (shared; variable-font axes, see the "Variable-font axes" row in `README.md` "Missing features").
- **Original:** the selected tab's label eases between weight 400 and 550 (`registry/base/tabs-subtle.tsx:326-337`).
- **Port:** SemiBold 600 switches at once, with a hidden semibold copy reserving the width (`src/components/command-menu.tsx:626-648`).
- **Workaround:** static cuts.
- **Fidelity:** approximated.
- **Components it hits:** tabs, tabs-subtle, sidebar.

## Accessibility tree is thinner

- **Cause:** `not ported yet`.
- **Original:** the field is `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant` pointing at the highlighted row's id; rows have `id` and `aria-disabled`; sections are `role="group"` labelled by their heading; the empty state is `role="status" aria-live="polite"` (`:858-863`, `:1105-1110`, `:1286-1289`, `:1159-1160`).
- **Port:** rows carry `role="option"` and `aria-selected`, the wrapper `role="listbox"` (`src/components/command-menu.tsx:880-883`, `:1027-1028`); the input, rows' ids, groups, `aria-disabled` and the empty status have none. gpuix does expose these (`~/code/fdarian/gpuix/README.md:2965-2985`); the combobox port uses them (`src/components/combobox.tsx:448-455`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## IME composition is invisible to JS

- **Cause:** `gpuix gap`.
- **Original:** keys inside an IME composition belong to the composer: Enter commits a candidate, arrows pick one (`:776`).
- **Port:** the handler acts on every key (`src/components/command-menu.tsx:496-544`).
- **gpuix lacks:** `isComposing` and `composition*` events (`~/code/fdarian/gpuix/FORK.md:499-505`); see `drift/combobox.md`, README "Missing features" row "IME composition".
- **Workaround:** none; untested.
- **Fidelity:** approximated.
- **Components it hits:** combobox, dropdown-search, input-group, input-message.

## A click between rows is not routed to the highlighted row

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Clicks in the padding and between rows are not routed to the lit row"](dropdown.md#clicks-in-the-padding-and-between-rows-are-not-routed-to-the-lit-row), where the entry lives. Here: original `command-menu.tsx:1087`; port list `src/components/command-menu.tsx:880-891`.

## Row label never truncates, disabled rows keep the pointer cursor

- **Cause:** `not ported yet`.
- **Original:** the label is `truncate` and shares the row with the description (both shrink); a disabled row is `opacity-50 pointer-events-none`, so no pointer cursor (`:1300`, `:1308`, `:1324-1334`).
- **Port:** the label is `flexShrink: 0`, `nowrap`, so a long label pushes the description out and is clipped without an ellipsis by the wrapper's `overflow: hidden`; only the description gets an ellipsis (`src/components/command-menu.tsx:1062-1093`). A disabled row dims to 0.5 but keeps `cursor: "pointer"` (`:1041-1042`); picking and highlighting it are still refused (`:373-375`, `select`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Label text is not trimmed to the cap height

- **Cause:** `gpuix gap` (shared; `text-box-trim`, see README "Missing features").
- **Original:** rows, headings and the empty state use `[text-box:trim-both_cap_alphabetic]`, so labels centre on their caps (`:1324`, `:1331`).
- **Port:** flex centring of the full line box (`src/components/command-menu.tsx:1055-1078`), about a pixel of drift.
- **Workaround:** flex centring.
- **Fidelity:** approximated.
- **Components it hits:** badge, select, every list row.

## State changes do not fade over 80 ms

- **Cause:** `not ported yet`.
- **Original:** row text and icon colour and stroke width ease over `duration-80`; the field's search icon likewise on focus (`:849`, `:1306`, `:1317`).
- **Port:** row text, row icon and the field icon switch at once (`src/components/command-menu.tsx:581-584`, `:1048-1051`, `:1069-1078`). `colorFade` and `Icon`'s `fade` exist (`src/lib/theme.ts:310-314`, `src/lib/icon.tsx:21`) and combobox and select use them; whether gpuix can tween `strokeWidth` is not checked.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The highlight snaps while the rows re-filter

- **Cause:** `port choice` (the code comment: the row moved, not the pointer).
- **Original:** when the query changes the highlight springs on `spring.fast` to the new first row, like any move (`:605-615`; no snap passed to `FluidHoverHighlight`).
- **Port:** `reflow.raise()` on every row-set change turns the glide into a zero-length tween for 100 ms (`src/components/command-menu.tsx:264`, `:375`, `:401`, `:898`; `src/lib/fluid-hover.ts:246-270`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** any fluid list that filters (combobox, dropdown-search).

## A wheel scroll re-picks the row under a stationary pointer

- **Cause:** `port choice` (stated in `src/lib/fluid-hover.ts:202-206`: a scroll event carries no pointer position, so the port re-picks at the last one seen).
- **Original:** the hook has no scroll listener; rows moving under a still pointer change the highlight on the next mouse move (a browser also fires a synthetic move after a scroll).
- **Port:** `onScroll` runs `pick()`; a keyboard move calls `releasePointer()` so the scroll it causes does not re-pick (`src/components/command-menu.tsx:420`, `:868`; `src/lib/fluid-hover.ts:202-206`, `:229-231`).
- **Workaround:** n/a.
- **Fidelity:** exact in effect.
- **Components it hits:** every fluid list in a scroller.

## Highlight travel animates `top` / `left`, not a transform

- **Cause:** `gpuix gap` (shared; transforms, see README "Missing features" row "CSS transforms").
- **Original:** the fill is pinned to the padding corner and moved with `x` / `y` on the compositor (`registry/default/fluid-hover-highlight.tsx:74-76`, `:128-134`).
- **Port:** `motion` on `top` / `left` / `width` / `height`, re-laying out per frame (`src/lib/fluid-highlight.tsx:67-81`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** every fluid list.

## Reduced motion is not honoured

- **Cause:** `not ported yet`.
- **Original:** the highlight travel, the list scroll and the height spring snap under the OS setting; the opacity fade stays (`:567`, `:590`, `:723`; `registry/default/fluid-hover-highlight.tsx:83-91`).
- **Port:** nothing reads it; `createReducedMotion()` exists in gpuix (`~/code/fdarian/gpuix/README.md:998`) and is not used anywhere in `src/`.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component with motion.

## Panel frame: a border and one shadow, and the dialog uses surface 3

- **Cause:** `not ported yet` (the stated reason, "gpuix paints one outer shadow", no longer holds: `boxShadow` takes a list, `~/code/fdarian/gpuix/README.md:5192`).
- **Original:** `Elevated offset=2 shadowLevel=3` for the inline panel (surface 3, `--shadow-3`: a 1 px ring plus two drops, with an inset highlight and ring in dark). The dialog panel is `surfaceClasses(substrate + 4)`, surface 5 with `--shadow-5` (`app/docs/command-menu/page.tsx:344-354`; `registry/base/dialog.tsx:30`, `:190`, `:274`).
- **Port:** `CommandMenuPanel` is `color.card` (surface 3) with a real 1 px `popupBorder` (it takes layout, the ring does not) and `shadow3()` (the 3 px drop alone) for both the inline panel and the dialog (`src/components/command-menu.tsx:299-313`, `:1325`; `src/lib/theme.ts:328-340`). In dark mode the dialog is `#252525` where the source draws `#333333`.
- **Workaround:** `popupBorder` stands in for the ring.
- **Fidelity:** approximated.
- **Components it hits:** every popup, dialog and mobile-drawer.

## Dialog enter and exit

- **Cause:** `gpuix gap` for the scale; `port choice` (reason not stated) for the timing.
- **Original:** the backdrop fades on `spring.slow` (240 ms, exit 160 ms tween); the panel springs from `scale: 0.97` with opacity on `spring.slow` (`registry/base/dialog.tsx:228-239`, `:286-293`).
- **Port:** the scrim fades on `moderate` in / `moderateExit` out (160 / 120 ms); the panel fades and slides 4 px down on `fast` in / `fastExit` out (80 / 60 ms) (`src/components/command-menu.tsx:1291-1319`). The layer unmounts when the scrim's exit completes (`onMotionComplete`, with a 220 ms timer for an exit that never animates), so the longer scrim fade is not cut short (`:1287`, `:1296`). `src/components/dialog.tsx` uses `slow` for the same shell.
- **gpuix lacks:** `scale` (no transforms, `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the 4 px slide stands in for the scale.
- **Fidelity:** approximated (faster, no scale).
- **Components it hits:** every popup that scales in.

## Dialog shell: no modal semantics, closes on mousedown, thinner props

- **Cause:** `not ported yet`.
- **Original:** Base UI Dialog: `role="dialog"` named by a screen-reader-only `title` and `description` props, focus trapped and returned to the trigger on close, page scroll locked and the page hidden from the accessibility tree, Escape closes from anywhere, an outside press closes (a click that presses and releases on the backdrop in `drift/dialog.md`), `defaultOpen` and an uncontrolled mode, `modal`, `container` and `className` props (`:1449-1568`).
- **Port:** its own `<anchored fill="window">` layer, not the ported `Dialog` (`src/components/command-menu.tsx:1253-1334`): no role, title or description; `HideOutside` (`src/lib/modal.tsx`, used by `src/components/dialog.tsx:320`) is not used; no focus return; `open` and `onOpenChange` are required; the scrim closes on `mousedown` through `onMouseDownOutside` (`:1321`; the dialog port works around this with a click, `drift/dialog.md`); Escape works from the field only (`:530-534`).
- **Workaround:** none.
- **Fidelity:** approximated (looks and closes the same with the pointer and the field focused).
- **Components it hits:** just this one.

## The trigger shortcut is the caller's

- **Cause:** `port choice` (reason not stated; the doc comment only says opening from a key is the caller's).
- **Original:** `CommandMenuDialog` takes `shortcut` (default `"mod+k"`, `null` binds nothing) and `shortcutScope`, and listens on `window` itself; several dialogs on one combo are arbitrated: the open one answers first, then the most recent in scope (`:1430-1447`, `:1508-1540`).
- **Port:** no `shortcut` or `shortcutScope`; `createSiteMenu` binds Mod+K by hand for the site menu (`src/components/command-menu.tsx:1252`; `src/lib/site-command-menu.tsx:44-57`). The demo's dialog is only opened by its button.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Shortcut helpers are a subset

- **Cause:** `not ported yet`.
- **Original:** exports `parseShortcut`, `matchesShortcut` (layout-aware, falls back to the physical key), `hasModifier`, `isMacPlatform`, `useIsMac`; `formatShortcut(shortcut, mac)` accepts aliases (`command`, `win`, `super`, `control`, `opt`, `del`, `plus`, `spacebar`, `arrowup`...) and keeps a trailing `+` as the key (`:118-303`).
- **Port:** only `formatShortcut(shortcut)` with `IS_MAC` baked in; `CAP_LABELS` knows `cmd`, `option`, `return`, `esc`, `space`, `up` / `down` / `left` / `right` but not the other aliases, so `"command+k"` draws "Command" (`src/components/command-menu.tsx:83-138`). A trailing `+` is kept as the key, as in the source (`"mod++"` draws the modifier and `+`, `shortcutTokens`, `:113-125`). The site menu carries its own `isModK` (`src/lib/site-command-menu.tsx:42-46`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Size follows only the `size` prop; no pill shape

- **Cause:** `not ported yet`.
- **Original:** omitted `size` follows the surrounding `SizeProvider` (so a compact region gives a compact menu, a 480 px dialog and compact filter controls); `CommandMenuFilters` sets its children to `compact`; the dialog and panel radius follow the global shape (rounded 12 / pill 24) while the list keeps rounded (`:458-460`, `:1016`; `registry/base/dialog.tsx:277`).
- **Port:** `compact` is only `props.size === "compact"` (`src/components/command-menu.tsx:434`); there is no size context in `src/`, the dialog width is always 540 (`:1249`), and filter controls are the caller's to make compact. Pill shape is listed as not ported in `README.md` (end of the translation table).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

## Parts take no `className`, `style`, `ref` or rest props

- **Cause:** `not ported yet`.
- **Original:** every part forwards a ref and spreads rest props; `CommandMenuInput` takes the `<input>` props (`aria-label`, `onKeyDown`, which runs first and can `preventDefault()`), `CommandMenuEmpty` takes any children, `CommandMenuFooter` takes `children` to replace the hints, `CommandMenuItem` takes `className` and `onClick` (`:755-886`, `:1151-1171`, `:1364-1415`).
- **Port:** typed prop lists only (`src/components/command-menu.tsx:482-487`, `:955`, `:1154-1157`, `:985-994`): `CommandMenuEmpty` takes a string, `CommandMenuFooter` has no `children`, no `className`. Port-only: required `testId` on the root, `CommandMenuPanel`, `CommandMenuItemText`, `searchIcon`, and a click on the field row that focuses the input (`:560-565`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Input line box in the compact step

- **Cause:** `not ported yet`.
- **Original:** the field is 14 / 24 px (default) and 13 / 20 px (compact, `leading-5`); 16 px on a coarse pointer (`:877-878`).
- **Port:** the field's box is a fixed 24 px high and only `fontSize` is applied, so in compact the line box is 24 where the source has 20; `SUBTITLE_COMPACT`'s 18 line height is never used (`src/components/command-menu.tsx:193-194`, `:610-611`). The touch size does not apply on desktop.
- **Workaround:** none.
- **Fidelity:** approximated (the caret is taller in compact).
- **Components it hits:** just this one.

## Clipped rows are still laid out and painted

- **Cause:** `gpuix gap`.
- **Original:** a browser skips paint for content a scroller clips away, and `content-visibility: auto` skips layout too, so a page of eight menus costs about what one does.
- **Port:** the whole page is built, laid out and painted each frame (checked in `src/lib/demo-kit.tsx:17-73`, the workaround below).
- **gpuix lacks:** culling. Every element, including rows and cards outside a scroller's viewport, is built, laid out and painted each frame. Only `<virtual-list>` skips them (`~/code/fdarian/gpuix/README.md:2519-2530` "Performance model", `:2602` "Pannable surfaces must cull"; the README row "Culling"). The command-menu page has about 1,400 elements and 800 text runs, which cost 57 ms of CPU a frame (18 ms in the native draw) against 10 ms (3.6 ms) on the dropdown page; the 80 ms highlight spring got one or two frames, so it read as a jump, and a wheel tick cost 110 to 135 ms (numbers from the earlier measurement, not re-run in this audit).
- **Workaround:** `DemoCard` (`src/lib/demo-kit.tsx:30-73`) watches its content with an `IntersectionObserver` rooted at the page scroller (`rootMargin: "25% 0px"`, `:27`, `:50`) and, once the card is more than a quarter of the scroller away, sets its content to `display: none` (no box is built for it or anything inside) and pins the height it had (`:47`, `:71-73`). The card stays mounted, so typed text and tabs survive a scroll away and back. This brought the frame to 20 ms (6.6 ms native). A `<virtual-list>` page was not used: it needs each card as a direct child of the list, which no demo's markup is, and the scenario helper `reveal()` (`src/demos/command-menu.tsx:586-609`) reads bounds a row outside the window does not have. The menu's own list is not virtualised either: the highlight lives inside the scrolled content and fluid hover measures every row, so a menu's 15 clipped rows still cost a few ms each.
- **Fidelity:** approximated (same output, a hitch of a frame or two when a card far from the scroller is jumped to).
- **Components it hits:** any long page or list; the other demo pages gain the same card hiding.

## Demo: variants of the source page that are missing

- **Cause:** `not ported yet`.
- **Original:** the page has a Playground (rail: trigger shortcut, descriptions, shortcut caps, suggestions first, tabs, filters, footer hints; "Open as a dialog"; Get code presets), Basic, Descriptions / shortcuts / disabled rows, Suggestions, Tabs, Filters, "Dialog and trigger shortcut" with two dialogs (⌘P bound, and "Open, no shortcut"), Footer hints, Custom rows, and eight API reference tables; each section has a sentence of prose (`app/docs/command-menu/page.tsx:389-596`, `:598-634`; `lib/docs/playgrounds/command-menu.tsx`).
- **Port:** Basic, Descriptions / shortcuts / disabled rows, Suggestions, Tabs, Filters, Dialog, Footer hints, Custom rows, in the same order and with the same 15 rows, groups, keywords, suggestions and copy ("Type a command or search…", "No results.", the "Recent" label) (`src/demos/command-menu.tsx:50-212`, `:569-583`). Missing: the Playground and presets, the second dialog (no shortcut), tabs and filters sharing one row (the playground's both-on state; `CommandMenuTabs` takes children, no demo uses it), a compact or pill state, the API tables, the prose, and the page title "CommandMenu" and description ("1 field over every action. Type, arrow, Enter."): the port's title is "Command Menu" with no description.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: Filters use a hand-built select

- **Cause:** `not ported yet`.
- **Original:** two real `Select`s with `variant="borderless"`, the full fluid popup and keyboard (`app/docs/command-menu/page.tsx:469-505`).
- **Port:** a local `FilterSelect`: a hover-tinted button and a popup of plain rows with hover colour, no fluid highlight, no selected mark, no keyboard (arrows, Escape, typeahead), no focus ring, a fixed 150 px / 200 px popup (`src/demos/command-menu.tsx:243-341`). The port's `Select` already has `variant="borderless"` (`src/components/select.tsx:58`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: dialog and footer sections differ in small ways

- **Cause:** `not ported yet` for the toast and the shortcut; `port choice` (reason not stated) for the extra footer panel and footer in the dialog.
- **Original:** a pick shows a toast, `Ran “<label>”`; the Open button holds the `⌘P` cap and ⌘P really opens the dialog; the dialog has no footer; the footer section is one panel with tabs and suggestions (`page.tsx:364`, `:508-545`, `:547-566`).
- **Port:** a pick sets a line of text, `Ran: <label>` (`src/demos/command-menu.tsx:476`, `:484-487`; the `setOpen(false)` there duplicates `closeOnSelect`); the `⌘K` cap sits beside the button, not in it, and ⌘K opens the site menu, not this dialog, so the cap is wrong (`:467-474`; `src/lib/site-command-menu.tsx:44-57`); the dialog carries a `CommandMenuFooter` (`:493`); the footer section adds a second panel with custom hints (`:522-534`); the section is titled "Dialog", not "Dialog and trigger shortcut" (`:458`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
