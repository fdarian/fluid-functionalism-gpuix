# dropdown

Original: `registry/base/dropdown.tsx`, with `registry/default/menu-item.tsx`, `dropdown-search.tsx` and `dropdown-sub.tsx`; demo in `app/docs/dropdown/page.tsx` and `lib/docs/playgrounds/dropdown.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/dropdown.tsx`, `menu-item.tsx` and `dropdown-search.tsx`, demo in `src/demos/dropdown.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts, IME) are one line each and link to the README row.

## No safe area toward a submenu: window mousemove only fires over listeners

- **Cause:** `gpuix gap`.
- **Original:** Base UI keeps a submenu open with a safe triangle while the pointer crosses other rows, or the empty gap, on its way to the submenu. `useSubmenuHost` then holds the parent's highlight on the trigger (`registry/default/dropdown-sub.tsx:54-157`, `:140-149`) until focus moves, which the primitive does only once the pointer leaves the safe area.
- **Port:** while a submenu is open, a pointer that settles on another row for 120 ms takes the highlight and closes the submenu (`SUBMENU_DWELL_MS`, `src/components/dropdown.tsx:70`, `:423-450`). Hovering a trigger opens its submenu after 100 ms (`HOVER_OPEN_MS`, `:68`, `:1166-1175`).
- **gpuix lacks:** a `window` / `document` `mousemove` that fires over bare background: those listeners run only when some element on the pointer's hit path has a `mousemove` listener of its own, so the pointer between the trigger row and the popup (the 6px gap) is invisible to a polygon test (README "Bugs" row, audit rows 386 and 721).
- **Workaround:** the dwell timer above, so a slow diagonal across another row changes the highlight where Base UI would not.
- **Fidelity:** approximated (dwell timer instead of a safe area).
- **Components it hits:** any popup with a nested popup; tooltip has the same gap.

## Reading focus state inside a mousedown handler throws `VIEW_BUSY`

- **Cause:** `gpuix gap`.
- **Original:** `document.activeElement` is readable anywhere, including in a pointer handler, so a popup can note which element had focus when it opened and hand focus back on close (Base UI `returnFocus`).
- **Port:** the pressed trigger's element id is recorded from the press event (`noteTrigger(event.elementId)`, `src/components/dropdown.tsx:907`, `:974`) and used when the menu opens, falling back to the focused element only for a keyboard open (`:858`). Closing calls `returnFocusTo` (`:852`; `src/lib/popup-trigger.ts:8`).
- **gpuix lacks:** that read: `mousedown` and `pointerdown` (and, per `~/code/fdarian/gpuix/FORK.md:359-364`, `mouseup`, `click` and `wheel`) handlers run inside the synchronous input dispatch on macOS and in the test renderer, where `getFocusedElementId` throws "The root view is being updated by the input" (`packages/native/src/events/sync_dispatch.rs:154`). An earlier probe on the test renderer found it throws in `onMouseDown` and answers in `onClick` and `onKeyDown`; that was not re-run for this audit, and the README row says click throws too.
- **Workaround:** the recorded id above.
- **Fidelity:** exact for the open; unverified for the close. A press closes the menu from a `mousedown` handler in two places: the trigger's second press (`createPressToggle` `onMouseDown`, `src/lib/popup-trigger.ts:43-47` into `scope.setOpen(false)`) and an outside press (`onMouseDownOutside`, `dropdown.tsx:949-951`). Both reach `returnFocusTo`, which reads focus first (`popup-trigger.ts:13`). No scenario in `src/demos/dropdown.tsx` closes the menu that way (row picks close from `click` and `mouseup`, which the scenarios do run), so whether those two closes throw is not known.
- **Components it hits:** any popup opened or closed on press: select (`src/components/select.tsx:243`) and color-picker (`src/components/color-picker.tsx:778`) also call `returnFocusTo`.

## No `width: max-content` / `fit-content`

- **Cause:** `gpuix gap`. README "Missing features" row "Intrinsic width".
- **Original:** the popup is `w-72 min-w-[var(--anchor-width)] max-w-full` (`registry/base/dropdown.tsx:708`) and grows with the trigger; the inline panel is `w-72 max-w-full` (`:187`); submenus are `w-56`.
- **Port:** a fixed 288px panel (`PANEL_WIDTH`, `src/components/dropdown.tsx:60`, `:730`, `:1040`) and 224px submenus (`SUB_WIDTH`, `:61`, `:1293`), never narrower than the trigger (`minWidth: "anchor-size(width)"`, `src/lib/popup.tsx:94`). The inline panel is `flexShrink: 0` (`:731`), so it does not shrink in a narrow container, where the source's `max-w-full` does.
- **gpuix lacks:** intrinsic sizing keywords for `width`: `max-content`, `min-content` and `fit-content` are rejected as "invalid dimension" (they exist in grid tracks only, `packages/native/js/host.ts:420-425`).
- **Workaround:** the fixed widths above.
- **Fidelity:** approximated. The source's popup never actually grows past `w-72` either (its width is fixed unless the trigger is wider), so the loss is the `max-w-full` clamp only.
- **Components it hits:** select, combobox, any popup that sizes to content.

## CSS transforms (popup scaleY entrance)

- **Cause:** `gpuix gap`. README "Missing features" row "CSS transforms".
- **Original:** every popup, submenus included, enters and exits with `scaleY: 0.96` about its side's origin (`registry/base/dropdown.tsx:622-630`); the root popup also slides 4px from the resolved side (`--popup-enter-y`, `registry/default/lib/popup.ts:17-26`), side popups (submenus) slide 0px but still scale.
- **Port:** the root popup slides 4px from the reported side and fades (`src/lib/popup.tsx:64`, `:84-90`); a submenu only fades (`src/components/dropdown.tsx:1280-1283`). Timings are the source's: enter `spring.fast` (80 ms), exit 60 ms tween.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the slide and fade above.
- **Fidelity:** approximated.
- **Components it hits:** select, combobox, color-picker.

## Static font weights

- **Cause:** `gpuix gap`. README "Missing features" row "Variable-font axes".
- **Original:** a lit or checked row's label eases from `wght 400` to `550` over 80 ms (`registry/default/menu-item.tsx:224-233`); 
- **Port:** `StableLabel` switches at once to SemiBold 600 (`src/components/menu-item.tsx:227-232`, `src/lib/theme.ts:278`).
- **Fidelity:** approximated.
- **Components it hits:** every `StableLabel` (tabs, tabs-subtle, sidebar, menu rows).

## No text-box trim on row labels

- **Cause:** `gpuix gap`. README "Missing features" row "text-box-trim".
- **Original:** both stacked label spans carry `[text-box:trim-both_cap_alphabetic]` (`registry/default/menu-item.tsx:216`, `:224`), so the glyphs centre on cap height in the 36px row.
- **Port:** the 20px line box is centred by flex (`src/components/menu-item.tsx:201-215`, `src/lib/stable-label.tsx`), about a pixel of vertical drift against the source.
- **Fidelity:** approximated.
- **Components it hits:** badge, every row built on `StableLabel`.

## IME composition in the search field

- **Cause:** `gpuix gap`. README "Missing features" row "IME composition".
- **Original:** a native `<input>`; composition works (`registry/default/dropdown-search.tsx:337-364`).
- **Port:** gpuix `<input>` (`src/components/dropdown-search.tsx:100-138`); no `composition*` events, so the field's Escape/Tab/arrow handling cannot tell a key an IME consumed. Untested.
- **Fidelity:** exact for Latin input, unknown for IME.
- **Components it hits:** combobox, command-menu, input-group, input-message.

## Popup shadow is one drop and a border

- **Cause:** `not ported yet`. gpuix paints multi-layer and inset `boxShadow` (`~/code/fdarian/gpuix/FORK.md:646-649`); the comment above `shadow3` in `src/lib/theme.ts:329` ("gpuix paints one outer shadow") is stale.
- **Original:** `Elevated shadowLevel={3}` (`registry/base/dropdown.tsx:133-135`, `:641-645`): `--shadow-3` is a 1px ring, a `0 1px 1px -0.5px` drop and a `0 3px 3px -1.5px` drop in light (`app/globals.css:139`); in dark it adds an inset top highlight, an inset ring and a 1px outer ring (`:162`).
- **Port:** a 1px `popupBorder` border plus one `0 3px 3px -1.5px` drop (`src/lib/popup.tsx:97-101`, `src/components/dropdown.tsx:733-739`, `:1296-1300`; `src/lib/theme.ts:332`). No `1px` drop and no dark-mode inset highlight, so the dark popup edge reads flatter.
- **Workaround:** the border stands in for the ring.
- **Fidelity:** approximated.
- **Components it hits:** every popup and card (select, combobox, dialog, color-picker, tooltip).

## Popup surface colour is fixed at surface-3

- **Cause:** `not ported yet`. The port has no surface context.
- **Original:** `Elevated offset={2}` is `min(substrate + 2, 8)`, so a dropdown opened inside a dialog or a raised card sits on a lighter surface; only its shadow level is pinned (`registry/default/lib/elevated.tsx`, `registry/base/dropdown.tsx:133-135`). The search field paints the same level (`registry/default/dropdown-search.tsx:233`).
- **Port:** always `color.card` (surface-3) for the popup, submenu and inline panel (`src/lib/popup.tsx:97`, `src/components/dropdown.tsx:733`, `:1296`).
- **Fidelity:** exact on the page, approximated inside a raised surface.
- **Components it hits:** select, combobox, color-picker, any popup opened from a raised surface.

## Popup list scrolls in plain `overflow`, not ScrollArea

- **Cause:** `not ported yet`. `src/components/scroll-area.tsx` exists with the thumb and the mask fade.
- **Original:** rows scroll inside `ScrollArea` with the hover-revealed thumb and a 32px `scroll-fade` on the viewport, dropped while a search field is mounted (`registry/base/dropdown.tsx:714`; `registry/default/lib/popup.ts:35-37`).
- **Port:** a `div` with `overflowY: "scroll"` (`src/components/dropdown.tsx:591-603`): no custom thumb, no edge fade.
- **Fidelity:** approximated.
- **Components it hits:** select (`src/components/select.tsx:600`), combobox (`:564`), command-menu (`:874`).

## Checked background appears with a fade instead of already being there

- **Cause:** `not ported yet`. `FluidHighlight` has no `initial={false}` mode.
- **Original:** the single-select background is `initial={false}`, so a row checked at mount, or at popup open (the rows stay registered between opens), shows the finished block (`registry/base/dropdown.tsx:195-215`, `:722-742`). It animates `top/left/width/height` on `spring.moderate`, opacity in 0.08 s, exit `spring.moderate.exit` (120 ms).
- **Port:** `FluidHighlight` always starts at `opacity: 0` and fades in on the one `glide` transition, `moderate` (160 ms spring), for opacity too (`src/lib/fluid-highlight.tsx:74`; `src/components/dropdown.tsx:199-207`). On the inline demo and on every popup open the checked block fades in over about 160 ms rather than being present from frame one; exit is the same 120 ms tween.
- **Fidelity:** approximated.
- **Components it hits:** any list that uses `FluidHighlight` for a selected background.

## Multiple selection: merge and split morph is a plain grow/shrink

- **Cause:** `not ported yet`. gpuix animates per-corner radii in `motion` (`~/code/fdarian/gpuix/FORK.md:819-821`, as `drift/checkbox-group.md` records); nothing here does.
- **Original:** `useMergeSplitBlocks` (`registry/default/hooks/use-merge-split.tsx`): when one unchecked row bridges two checked runs, the facing edges glide to the bridging row's midpoint with the inner corners straightening (corners trail by 70 ms), then swap to one block; deselecting a middle row plays the inverse. Spring `moderate`, corner radius 8 (`registry/base/dropdown.tsx:121-126`, `:193`).
- **Port:** one `FluidHighlight` per run id, rect from the run's first to last row, radius 8 on all four corners (`src/components/dropdown.tsx:158-179`, `:208-220`). A merge makes the surviving block spring-grow over the whole union while the absorbed one fades out, the motion the source's comment says it avoids; a split shrinks the block and fades a new one in. `multi-merged.png` and `multi-split.png` show the end states, which match.
- **Fidelity:** approximated (end states exact, the transition differs).
- **Components it hits:** checkbox-group (`drift/checkbox-group.md`, same cause and wording).

## Check mark fades in; the source draws it

- **Cause:** `not ported yet`. `CheckMark` in `src/lib/icon.tsx:41` already draws and retracts the stroke, and select and combobox use it.
- **Original:** the check is a `motion.path` that draws (`pathLength` 0 to 1, 80 ms ease-out) and retracts on exit (40 ms ease-in); `AnimatePresence initial={false}` shows a row checked at mount finished (`registry/default/menu-item.tsx:241-272`). The svg exists only while `checked`.
- **Port:** a mounted-late `motion.div` fades the `check` glyph in over 80 ms ease-out; unchecking removes it at once, no retract (`src/components/menu-item.tsx:241-263`). The 16px slot, and its 8px gap, is always reserved for any row with a boolean `checked`, so an unchecked radio row's label is 24px narrower than the source's (the source only reserves it while checked); it only shows on a label long enough to clip.
- **Fidelity:** approximated.
- **Components it hits:** just this one (select and combobox already draw it).

## Row colour and stroke do not ease

- **Cause:** `not ported yet` for the colour; `port choice` for the stroke width (`src/lib/icon.tsx:9`: it is part of the SVG source, so it switches at once).
- **Original:** the leading icon, the label and the submenu chevron ease `color` and `stroke-width` over 80 ms when the row lights (`transition-[color,stroke-width] duration-80`, `registry/default/menu-item.tsx:204`, `:224`; `registry/default/dropdown-sub.tsx:180-186`); the search icon does the same on focus (`registry/default/dropdown-search.tsx:335`).
- **Port:** `Icon` takes a `fade` prop for the 80 ms colour ease (`src/lib/icon.tsx:9-23`) and select uses it (`src/components/select.tsx:569`), but `MenuItem` and the search icon do not pass it, and `StableLabel` has no fade (`src/components/menu-item.tsx:217-240`, `src/components/dropdown-search.tsx:94-99`). Colour and stroke both change on the same frame.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Clicks in the padding and between rows are not routed to the lit row

- **Cause:** `not ported yet`.
- **Original:** `useFluidHover` routes a click that lands between rows, in the 4px padding or past the last row, to the highlighted row, so what is lit is what a click hits; the popup and the inline panel both pass `handlers.onClick` (`registry/default/hooks/use-fluid-hover.ts:40-47`, `:583`; `registry/base/dropdown.tsx:144`, `:667`).
- **Port:** no click handler on `MenuBody` (`src/components/dropdown.tsx:185-198`); the port's `createFluidHover` returns no `onClick` (`src/lib/fluid-hover.ts:191-209`). A click on the padding, a label or a separator does nothing.
- **Fidelity:** dropped.
- **Components it hits:** any list on `createFluidHover` (select, combobox, tabs, sidebar).

## Inline panel focus ring: no fade, cleared by the pointer, drawn after a click

- **Cause:** `not ported yet`. gpuix reports `event.focusVisible`, which the panel does not read (audit row 423).
- **Original:** the ring is a `motion.div` in `AnimatePresence` that springs `left/top/width/height` on `spring.fast`, fades 0.08 s and exits on `spring.fast.exit` (`registry/base/dropdown.tsx:224-243`). It is set from `onFocus` only when the target `:focus-visible` (`:145-156`) and stays until focus leaves the panel (`:157-161`); a mouse move changes the hover highlight, not the ring.
- **Port:** `Show` mounts and unmounts the ring with no fade either way (`src/components/dropdown.tsx:229-249`), though it springs between rows. Any pointer move over the panel clears it (`:752`, `:756`). The group's `onFocus` lights `entryRow()` or the hovered row and draws the ring for any focus, including the mouse-down on a row that focuses the group (`:720-724`).
- **Fidelity:** approximated for the fade and the clearing; the click case is a bug (see report): `screenshots/dropdown/inline-checked.png` shows the ring on "Favorites" after a click on "Shared", with the pointer off the panel.
- **Components it hits:** just this one (popup menus draw no ring in either build).

## Focus model: virtual highlight, rows are not focus targets

- **Cause:** `port choice`. BASE-UI-AUDIT.md row 405: the trigger or the search field keeps real focus and the lit row is named through `aria-activedescendant`; gpuix rows could take focus, but the keyboard model is built on the virtual highlight.
- **Original:** Base UI `Menu.Item` rows take real focus with roving `tabindex` (`registry/base/dropdown.tsx:554-587`); `onFocus` lights the row (`:672-693`), typing on a focused row is redirected into the field (`registry/default/dropdown-search.tsx:132-168`), and Space on a row activates it (`:127-131`).
- **Port:** the field (or the trigger) keeps focus while arrows move `hover.activeIndex` (`src/components/dropdown.tsx:329-343`, `:362-418`; `src/components/dropdown-search.tsx:74-77`). Consequences, with a search field and a row lit by arrow:
  - Space types a space into the query and unlights the row (`:403-405` does nothing while `typing`, `:513-519` clears the lit row), where the source activates the row.
  - Home and End move the caret (`:389-398` return while `typing`), where on a focused row the source jumps to the first or last row.
  - Returning to the field from the bottom does not scroll the list to its top (source `scrollToTop`, `dropdown-search.tsx:86-100`, `:155`); the next arrow reveals the row.
  - The field has no `role="searchbox"`, `autoComplete="off"` or `spellCheck={false}` (source `registry/default/dropdown-search.tsx:343-347`); the port sets only `aria-activedescendant` (`src/components/dropdown-search.tsx:102`).
- **Fidelity:** approximated; the Space case is a bug (see report).
- **Components it hits:** color-picker's format menu is hand-written on the same virtual-highlight idea (audit "Color picker format menu").

## Search field is not sticky and cannot sit in an inline panel

- **Cause:** `not ported yet`. gpuix has `position: sticky` (`~/code/fdarian/gpuix/FORK.md:560`; README gpuix gaps intro); the comment at `src/components/dropdown-search.tsx:24-28` ("gpuix has no `position: sticky`") is stale. BASE-UI-AUDIT.md row 415 records it as not adopted.
- **Original:** the field is `sticky top-0 z-20 -mx-1 -mt-1 mb-0.5` inside the scrolling list, `border-b border-border/60`, painted with the surface so rows scroll underneath; `DropdownSearch` in an inline `Dropdown` is simply open (`registry/default/dropdown-search.tsx:228-231`, `:317-331`).
- **Port:** `DropdownSearch` renders nothing and hands its props to `DropdownContent`, which draws the field above the scroller (`src/components/dropdown-search.tsx:35-44`, `:69-141`; `src/components/dropdown.tsx:578-603`) with the rows' top padding cut to 2px (`:610`). Placed in an inline `Dropdown` it throws "DropdownSearch must be inside a DropdownContent" (`dropdown-search.tsx:36-39`). Visually the first frame matches; rows no longer slide under the field, and the thumb (if any) would start below it.
- **Fidelity:** approximated.
- **Components it hits:** command-menu draws its own field.

## Compact size is not ported

- **Cause:** `not ported yet`. No size context in the port; `height.controlCompact` is passed per component (`src/components/button.tsx`, `input-group.tsx`).
- **Original:** `size="compact"` on `Dropdown` or `DropdownMenu`, or a surrounding `SizeProvider`, gives 28px rows, 12/18 text, 14px icons, `px-1.5` and `gap-1`, 11/14 group labels, and a 10px/`leading-5` search field (`registry/base/dropdown.tsx:100-103`, `:328-332`, `:902-908`; `registry/default/lib/size-context.tsx`; `dropdown-search.tsx:226`, `:328`, `:361`).
- **Port:** rows are always 36px, 13/20 text, 16px icons, `px 8` and `gap 8` (`src/components/menu-item.tsx:201-232`, `:69-86`; `src/components/dropdown-search.tsx:66`, `:82-92`).
- **Fidelity:** dropped.
- **Components it hits:** any component with a compact step.

## Props the port does not take

- **Cause:** `not ported yet` (nothing in gpuix prevents them) except where noted.
- **Original:** `Dropdown` takes `size`, `aria-label`, `className` and `ref` (`registry/base/dropdown.tsx:94-107`); `DropdownMenu` takes `size` (`:328-332`); `DropdownContent` takes `className`, `ref`, `side`, `align` (`start | center | end`), `sideOffset`, `alignOffset` (`:400-415`); `DropdownSubContent` takes `sideOffset` and `alignOffset` (`:863-891`); `MenuItem` takes `className` and any `div` prop, `onClick` included (`registry/default/menu-item.tsx:121-136`); `DropdownSearch` takes any `input` prop (`dropdown-search.tsx:193-207`); `DropdownLabel`, `DropdownSeparator` and `DropdownEmpty` take `className`.
- **Port:** `Dropdown` takes `checkedIndex`, `checkedIndices`, `testId` (`src/components/dropdown.tsx:629-635`); `DropdownContent` takes `align` (`start | end`) only (`:1006-1013`), with the side fixed at the bottom and a 6px gap (`src/lib/popup.tsx:11`); the submenu offsets are the constants `SUBMENU_SIDE_OFFSET` and `SUBMENU_ALIGN_OFFSET` (`:65-67`, `:1271-1272`); `MenuItem` has `chevron`, `submenu`, `onOpenSubmenu` and `testId` (`src/components/menu-item.tsx:104-123`). `DropdownLabel` and `DropdownEmpty` take a string child only (`:69`, `dropdown-search.tsx:46`). BASE-UI-AUDIT.md row 395 records `side`, `sideOffset` and `alignOffset` as a lead decision: no ported consumer.
- **Fidelity:** dropped for the missing props.
- **Components it hits:** just this one.

## DropdownTrigger is a function child, not `render`

- **Cause:** `port choice` (reason not stated in the code; Solid has no `cloneElement`-style `render` merge, and the trigger's handlers must reach the element so the press, the id and `aria-*` are wired by hand).
- **Original:** `Menu.Trigger` re-exported; `<DropdownTrigger render={<Button variant="ghost">Open menu</Button>} />` (`registry/base/dropdown.tsx:384`, docs `app/docs/dropdown/page.tsx:559-561`).
- **Port:** `DropdownTrigger` calls its child with `{ attributes, onMouseDown, onClick, expanded }`, which every demo spreads onto the `Button` by hand (`src/components/dropdown.tsx:966-1004`; `src/demos/dropdown.tsx:198-208`). The trigger has no `disabled` of its own; `DropdownMenu disabled` covers it.
- **Fidelity:** approximated (same behaviour, different call shape).
- **Components it hits:** none other (select and combobox own their triggers).

## DropdownMenu adds a wrapper element and dims on `disabled`

- **Cause:** `port choice` (reason from the code comments: the wrapper hosts the key handler, the outside-press handler and the trigger and popup's shared logical subtree, `src/components/dropdown.tsx:943-951`; the dimming is the port's own, BASE-UI-AUDIT.md row 356).
- **Original:** `Menu.Root` renders no DOM; a disabled menu styles nothing, the consumer's `render` element decides (`registry/base/dropdown.tsx:354-364`).
- **Port:** a `relative flex` `div` with `tabIndex={-1}` wraps the trigger and the popup, and `disabled` sets `opacity: 0.5` on all of it (`:943-958`). A trigger that relies on its parent's layout (a flex row, an `inline` flow) sees the extra box.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## RTL: submenu side, arrow keys and chevron

- **Cause:** `port choice` (BASE-UI-AUDIT.md rows 471-474, lead decision: no ported consumer; the source docs never mount a `DirectionProvider`).
- **Original:** `useDirection()` picks `side="left"` for rtl (`registry/base/dropdown.tsx:879-883`), Base UI swaps the submenu open and close keys, and the chevron mirrors with `rtl:-scale-x-100` (`registry/default/dropdown-sub.tsx:179`).
- **Port:** the submenu is always on the right and Right opens, Left closes (`src/components/dropdown.tsx:1269`, `:406-416`); the chevron never mirrors (`src/components/menu-item.tsx:233-240`).
- **Fidelity:** dropped, unreachable in the docs.
- **Components it hits:** just this one.

## A click on a submenu trigger opens it at once

- **Cause:** `port choice` (BASE-UI-AUDIT.md row 386: "deliberate improvement; keep").
- **Original:** a mouse press on a submenu trigger is ignored in hover mode; hover opens after 100 ms and Enter, Space and Right open from the keyboard (`menu/submenu-trigger/MenuSubmenuTrigger.tsx:192-203`, per the audit).
- **Port:** `onSelect={show}` opens on click before the 100 ms hover timer (`src/components/dropdown.tsx:1187`).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## DropdownEmpty has no `aria-live`

- **Cause:** `not ported yet`.
- **Original:** `role="status" aria-live="polite"` (`registry/default/dropdown-search.tsx:382-383`).
- **Port:** `role="status"` only (`src/components/dropdown-search.tsx:49`). Spacing, size and colour match (`px-2 py-6`, body, muted).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo page: no Playground, no section copy, extra and altered cards

- **Cause:** `not ported yet` for the Playground and the copy; `port choice` (reason not stated; the added rows and cards feed the scenarios, `src/demos/dropdown.tsx:603`) for the additions.
- **Original:** sections in order, each in a `ComponentPreview` with a Code tab (`app/docs/dropdown/page.tsx:509-810`): Playground, Basic, Groups, Triggered menu, Submenus, Multiple selection, Searchable menu, Searchable multiple selection, Create from the query, then 13 API Reference tables. The Playground (`lib/docs/playgrounds/dropdown.tsx`) drives a live dropdown: Mode (menu or inline), Selection (single, multiple, none), Search, Create from query, Icons, Groups, Disabled row, Submenu, a theme row set, a preset URL and a Get-code dialog. Sections open with a line of prose (for example "3 parts: `DropdownMenu`, `DropdownTrigger`, `DropdownContent`. Any element goes in `render`." and "Hover Move to, then cut across Share to its submenu: the highlight stays on Move to until you stop on another row."), and the page opens with "2 forms: an inline panel, or a popup on any trigger."
- **Port:** nine `DemoCard`s titled "Dropdown, basic" and so on (`src/demos/dropdown.tsx:573-590`), with no prose, no Code tab, no API tables and no Playground. Previews are `minHeight: 56` where the source uses `min-h-[160px]` for the popup cases.
  - Basic, Groups, Triggered, Submenus, Multiple, Searchable, Searchable multiple and Creatable exist with the source's rows, icons, copy and initial state ("Create “…”", "No languages found", "Search languages", `Labels · 2`, statuses `[0, 1, 2]`, used `["Button", "Combobox"]`).
  - Added: a "Dropdown, keyboard" card (Alpha to Charter with a disabled Beta and a picked/changes readout) and, in Submenus, a "Moved to ..." readout (`:233-307`, `:309-352`).
  - Altered: the Groups card marks "Display" `disabled` (`src/demos/dropdown.tsx:185`); the source row is enabled (`app/docs/dropdown/page.tsx:547`).
- **Fidelity:** all nine source variants present; the Playground and the prose dropped.
- **Components it hits:** the section prose and Code tab are absent from every ported demo.
