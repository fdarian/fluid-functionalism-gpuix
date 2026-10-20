# dropdown

Original: `registry/base/dropdown.tsx`, with `registry/default/menu-item.tsx`, `dropdown-search.tsx` and `dropdown-sub.tsx`; demo in `app/docs/dropdown/page.tsx` and `lib/docs/playgrounds/dropdown.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/dropdown.tsx`, `menu-item.tsx` and `dropdown-search.tsx`, demo in `src/demos/dropdown.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (CSS transforms, selector `:has(.x)` and group-has, collapsed-border transitions) are one line each and link to the README row.

## The parent list ignores the pointer toward a submenu instead of `pointer-events: none`

- **Cause:** `port choice` (the headless primitive cannot set `pointer-events` on the consumer's elements).
- **Original:** Base UI's `safePolygon({ blockPointerEvents: true })` sets `pointer-events: none` on the parent popup from a hover open until the pointer reaches the submenu, so the rows the pointer crosses on its way are not hit (`useHoverFloatingInteraction.ts:94-160`); `useSubmenuHost` holds the parent's highlight on the trigger meanwhile (`registry/default/dropdown-sub.tsx:54-157`, `:140-149`).
- **Port:** the polygon itself is Base UI's (`base-ui:src/floating-ui-solid/safe-polygon.ts`), started by the row's `mouseleave` and fed by a window `mousemove` listener (`base-ui:src/menu/submenu-trigger/menu-submenu-trigger.ts:48-54`, `:118-129`; wiring `src/components/dropdown.tsx:785-798`, `:811`, `:908-909`). Meanwhile the list stops forwarding the pointer to the fluid hover (`base-ui:src/menu/list/menu-list.ts:283-316`), so the trigger stays lit under the rows it crosses. A click on a row crossed that way still lands, where Base UI's would hit nothing. Hovering a trigger opens its submenu after 100 ms (`HOVER_OPEN_MS`, `src/components/dropdown.tsx:74`, `base-ui:src/menu/submenu-trigger/menu-submenu-trigger.ts:93-103`). A hover-opened submenu leaves focus on its parent row, as Base UI does, until the pointer reaches a row inside it or ArrowRight enters.
- **Workaround:** none needed for the highlight; the click-through is the only visible difference.
- **Fidelity:** approximated (the list drops the pointer itself).
- **Components it hits:** any popup with a nested popup.

## CSS transforms (popup scaleY entrance)

- **Cause:** `gpuix gap`. README "Missing features" row "CSS transforms".
- **Original:** every popup, submenus included, enters and exits with `scaleY: 0.96` about its side's origin (`registry/base/dropdown.tsx:622-630`); the root popup also slides 4px from the resolved side (`--popup-enter-y`, `registry/default/lib/popup.ts:17-26`), side popups (submenus) slide 0px but still scale.
- **Port:** the root popup slides 4px from the reported side and fades (`src/lib/popup.tsx:43`, `:65-71`); a submenu only fades (`src/components/dropdown.tsx:906-912`). Timings are the source's: enter `spring.fast` (80 ms), exit 60 ms tween.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:1198-1209`).
- **Workaround:** the slide and fade above.
- **Fidelity:** approximated.
- **Components it hits:** select, combobox, color-picker.

## Submenu and inline panel colour is fixed at surface-3

- **Cause:** `not ported yet`. `PopupSurface` (the main popup) follows its substrate through `src/lib/surface-context.ts`; the submenu and inline panel do not read it.
- **Original:** `Elevated offset={2}` is `min(substrate + 2, 8)`, so a dropdown opened inside a dialog or a raised card sits on a lighter surface; only its shadow level is pinned (`registry/default/lib/elevated.tsx`, `registry/base/dropdown.tsx:133-135`). The search field paints the same level (`registry/default/dropdown-search.tsx:233`).
- **Port:** the main popup is `min(substrate + 2, 8)` (`src/lib/popup.tsx`); the submenu and inline panel are always `color.card` (surface-3, `src/components/dropdown.tsx:558`, `:925`).
- **Fidelity:** exact on the page, approximated for a submenu or inline panel inside a raised surface.
- **Components it hits:** just this one.

## Popup list scrolls in plain `overflow`, not ScrollArea

- **Cause:** `not ported yet`. `src/components/scroll-area.tsx` exists with the thumb and the mask fade.
- **Original:** rows scroll inside `ScrollArea` with the hover-revealed thumb and a 32px `scroll-fade` on the viewport, dropped while a search field is mounted (`registry/base/dropdown.tsx:714`; `registry/default/lib/popup.ts:35-37`).
- **Port:** a `div` with `overflowY: "scroll"` (`src/components/dropdown.tsx:376-387`): no custom thumb, no edge fade.
- **Fidelity:** approximated.
- **Components it hits:** select (`src/components/select.tsx:411`), combobox (`src/components/combobox.tsx:336`), command-menu (`src/components/command-menu.tsx:961`).

## Checked background appears with a fade instead of already being there

- **Cause:** `not ported yet`. `FluidHighlight` has no `initial={false}` mode.
- **Original:** the single-select background is `initial={false}`, so a row checked at mount, or at popup open (the rows stay registered between opens), shows the finished block (`registry/base/dropdown.tsx:195-215`, `:722-742`). It animates `top/left/width/height` on `spring.moderate`, opacity in 0.08 s, exit `spring.moderate.exit` (120 ms).
- **Port:** `FluidHighlight` always starts at `opacity: 0` and fades in on the one `glide` transition, `moderate` (160 ms spring), for opacity too (`src/lib/fluid-highlight.tsx:92-95`; `src/components/dropdown.tsx:206-227`). On the inline demo and on every popup open the checked block fades in over about 160 ms rather than being present from frame one; exit is the same 120 ms tween.
- **Fidelity:** approximated.
- **Components it hits:** any list that uses `FluidHighlight` for a selected background.

## Multiple selection: merge and split morph is a plain grow/shrink

- **Cause:** `not ported yet`. gpuix animates per-corner radii in `motion` (`~/code/fdarian/gpuix/FORK.md:1141-1143`, as `drift/checkbox-group.md` records); nothing here does.
- **Original:** `useMergeSplitBlocks` (`registry/default/hooks/use-merge-split.tsx`): when one unchecked row bridges two checked runs, the facing edges glide to the bridging row's midpoint with the inner corners straightening (corners trail by 70 ms), then swap to one block; deselecting a middle row plays the inverse. Spring `moderate`, corner radius 8 (`registry/base/dropdown.tsx:121-126`, `:193`).
- **Port:** one `FluidHighlight` per run id, rect from the run's first to last row, radius 8 on all four corners (`src/components/dropdown.tsx:165-186`, `:215-227`). A merge makes the surviving block spring-grow over the whole union while the absorbed one fades out, the motion the source's comment says it avoids; a split shrinks the block and fades a new one in. `multi-merged.png` and `multi-split.png` show the end states, which match.
- **Fidelity:** approximated (end states exact, the transition differs).
- **Components it hits:** checkbox-group (`drift/checkbox-group.md`, same cause and wording).

## The check slot is reserved on every row with a boolean `checked`

- **Cause:** `not ported yet`.
- **Original:** the check svg exists only while `checked`, inside `AnimatePresence initial={false}` (`registry/default/menu-item.tsx:241-272`), so an unchecked row has no slot. The check draws (`pathLength` 0 to 1, 80 ms ease-out) and retracts on exit (40 ms ease-in), and a row checked at mount shows it finished.
- **Port:** the draw is ported: `CheckMark` (`src/lib/icon.tsx:98-152`, `LIST_CHECK` is the source's `M4 12L9 17L20 6`) at 16px, stroke 2, always mounted so it can retract, with the same timings and a row checked at mount finished (`src/components/menu-item.tsx:152-162`; `scripts/check-dropdown.tsx` "check mark" reads the draw and the retract from captured pixels). It sits in a 16px slot, with its 8px gap, that is reserved for any row with a boolean `checked`, so an unchecked radio row's label is 24px narrower than the source's (the source only reserves it while checked); it only shows on a label long enough to clip.
- **Fidelity:** exact in the mark and its motion; the layout differs only by the reserved slot.
- **Components it hits:** just this one (select and combobox draw it too, with no such slot).

## Clicks in the padding and between rows are not routed to the lit row

- **Cause:** `not ported yet`.
- **Original:** `useFluidHover` routes a click that lands between rows, in the 4px padding or past the last row, to the highlighted row, so what is lit is what a click hits; the popup and the inline panel both pass `handlers.onClick` (`registry/default/hooks/use-fluid-hover.ts:40-47`, `:583`; `registry/base/dropdown.tsx:144`, `:667`).
- **Fidelity:** dropped.
- **Components it hits:** any list on `createFluidHover` (select, combobox, tabs, sidebar).

## Inline panel focus ring: no fade, cleared by the pointer

- **Cause:** `not ported yet`. The ring has no `AnimatePresence`-style fade, and the panel clears it on any pointer move.
- **Original:** the ring is a `motion.div` in `AnimatePresence` that springs `left/top/width/height` on `spring.fast`, fades 0.08 s and exits on `spring.fast.exit` (`registry/base/dropdown.tsx:224-243`). It is set from `onFocus` only when the target `:focus-visible` (`:145-156`) and stays until focus leaves the panel (`:157-161`); a mouse move changes the hover highlight, not the ring.
- **Port:** `Show` mounts and unmounts the ring with no fade either way (`src/components/dropdown.tsx:236-257`), though it springs between rows. Any pointer move over the panel clears it (`:594`, `:598`). The rows are the focus targets (the group is not focusable), and a row's `onFocus` draws the ring only for `event.focusVisible` (`base-ui:src/menu/item/menu-item.ts:117-119`, `src/components/dropdown.tsx:461-466`), as the source does (`:144-155`); a press that focuses a row lights it and draws no ring. Focus leaving the rows clears the ring and the highlight (`:541-552`).
- **Fidelity:** approximated for the fade and the clearing.
- **Components it hits:** just this one (popup menus draw no ring in either build).

## Search field is a child of the scroller, not of the list

- **Cause:** `gpuix gap`.
- **Original:** the field is `sticky top-0 z-20 -mx-1 -mt-1 mb-0.5` inside the padded `p-1` list, `border-b border-border/60`, painted with the surface so rows scroll underneath; `DropdownSearch` in an inline `Dropdown` is simply open (`registry/default/dropdown-search.tsx:228-231`, `:317-331`).
- **Port:** `DropdownSearch` renders nothing and registers its props with the list around it, which draws the field as the first child of the scroller, ahead of the padded rows: `position: sticky`, `top: 0`, `zIndex: 20`, the popup's `surface(level)` fill, the rows' top padding cut to 2px (`src/components/dropdown-search.tsx:68-146`; `src/components/dropdown.tsx:388-397`). A row the keyboard reveals stops below the field (`revealRow`'s `topInset`, `base-ui:src/internals/composite/composite.ts:65-88`); the source's `scrollIntoView` lets it slide under. An inline `Dropdown` hosts `DropdownSearch` the same way and draws the field above the rows, not sticky (`dropdown.tsx:571-586`); ArrowDown and ArrowUp leave it for the first and last row.
- **gpuix lacks:** the scroller's padding when it pins a sticky box. At rest gpuix and Chrome agree (a sticky child of a `padding: 4` scroller at y 50 sits at y 54, the negative margin or not). After scrolling, gpuix pins the box at the scrollport edge (y 50) where Chrome holds it at the scroller's padding edge (54); a sticky box with no negative margin differs the same way (270 against 274). So the field cannot sit in the padded list as the source has it: it would pin 4px above where the source's does, over the list's top padding. Measured on the test renderer and against Chrome, not traced in gpuix's `sticky.rs`.
- **Workaround:** the scroller has no padding; the field is its first child, where the scrollport edge and the padding edge are the same line, and the rows carry the padding.
- **Fidelity:** exact visually; the DOM structure differs.
- **Components it hits:** command-menu draws its own field.

## Compact size is not ported

- **Cause:** `not ported yet`. No size context in the port; `height.controlCompact` is passed per component (`src/components/button.tsx`, `input-group.tsx`).
- **Original:** `size="compact"` on `Dropdown` or `DropdownMenu`, or a surrounding `SizeProvider`, gives 28px rows, 12/18 text, 14px icons, `px-1.5` and `gap-1`, 11/14 group labels, and a 10px/`leading-5` search field (`registry/base/dropdown.tsx:100-103`, `:328-332`, `:902-908`; `registry/default/lib/size-context.tsx`; `dropdown-search.tsx:226`, `:328`, `:361`).
- **Port:** rows are always 36px, 13/20 text, 16px icons, `px 8` and `gap 8` (`src/components/menu-item.tsx:100-121`, `:36-53`; `src/components/dropdown-search.tsx:61`, `:88-98`).
- **Fidelity:** dropped.
- **Components it hits:** any component with a compact step.

## Props the port does not take

- **Cause:** `not ported yet` (nothing in gpuix prevents them) except where noted.
- **Original:** `Dropdown` takes `size`, `aria-label`, `className` and `ref` (`registry/base/dropdown.tsx:94-107`); `DropdownMenu` takes `size` (`:328-332`); `DropdownContent` takes `className`, `ref`, `side`, `align` (`start | center | end`), `sideOffset`, `alignOffset` (`:400-415`); `DropdownSubContent` takes `sideOffset` and `alignOffset` (`:863-891`); `MenuItem` takes `className` and any `div` prop, `onClick` included (`registry/default/menu-item.tsx:121-136`); `DropdownSearch` takes any `input` prop (`dropdown-search.tsx:193-207`); `DropdownLabel`, `DropdownSeparator` and `DropdownEmpty` take `className`.
- **Port:** `Dropdown` takes `checkedIndex`, `checkedIndices`, `testId` (`src/components/dropdown.tsx:425-431`); `DropdownContent` takes `align` (`start | end`) only (`:676-683`), with the side fixed at the bottom and a 6px gap (`src/lib/popup.tsx:11`); the submenu offsets are the constants `SUBMENU_SIDE_OFFSET` and `SUBMENU_ALIGN_OFFSET` (`src/components/dropdown.tsx:70-73`, `:894-899`); `MenuItem` has `chevron`, `submenu`, `onOpenSubmenu` and `testId` (`src/components/menu-item.tsx:71-92`). `DropdownLabel` and `DropdownEmpty` take a string child only (`menu-item.tsx:36`, `dropdown-search.tsx:41`). `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 398 records `side`, `sideOffset` and `alignOffset` as a lead decision: no ported consumer.
- **Fidelity:** dropped for the missing props.
- **Components it hits:** just this one.

## DropdownTrigger is a function child, not `render`

- **Cause:** `port choice` (reason not stated in the code; Solid has no `cloneElement`-style `render` merge, and the trigger's handlers must reach the element so the press, the id and `aria-*` are wired by hand).
- **Original:** `Menu.Trigger` re-exported; `<DropdownTrigger render={<Button variant="ghost">Open menu</Button>} />` (`registry/base/dropdown.tsx:384`, docs `app/docs/dropdown/page.tsx:559-561`).
- **Port:** `DropdownTrigger` calls its child with `{ attributes, onMouseDown, onClick, expanded }`, which every demo spreads onto the `Button` by hand (`src/components/dropdown.tsx:669-674`; `src/demos/dropdown.tsx:502-512`). The trigger has no `disabled` of its own; `DropdownMenu disabled` covers it.
- **Fidelity:** approximated (same behaviour, different call shape).
- **Components it hits:** none other (select and combobox own their triggers).

## DropdownMenu adds a wrapper element and dims on `disabled`

- **Cause:** `port choice` (reason from the code comments: the wrapper hosts the closed-state key handler (open on Enter, Space, ArrowDown, ArrowUp), the outside-press handler and the trigger and popup's shared logical subtree, `src/components/dropdown.tsx:633-667`; the dimming is the port's own, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 357).
- **Original:** `Menu.Root` renders no DOM; a disabled menu styles nothing, the consumer's `render` element decides (`registry/base/dropdown.tsx:354-364`).
- **Port:** a `relative flex` `div` wraps the trigger and the popup, and `disabled` sets `opacity: 0.5` on all of it (`:659-669`). A trigger that relies on its parent's layout (a flex row, an `inline` flow) sees the extra box.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## RTL: submenu side, arrow keys and chevron

- **Cause:** `port choice` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` rows 475-478, lead decision: no ported consumer; the source docs never mount a `DirectionProvider` and have no rtl demo). gpuix now has `direction: 'rtl'` (inherited; it mirrors a row's main axis, grid columns and `textAlign: start`; gpuix `README.md`, "Direction"), so a port with a direction provider could mirror the submenu side and the chevron; the menu keys would still be the primitive's.
- **Original:** `useDirection()` picks `side="left"` for rtl (`registry/base/dropdown.tsx:879-883`), Base UI swaps the submenu open and close keys, and the chevron mirrors with `rtl:-scale-x-100` (`registry/default/dropdown-sub.tsx:179`).
- **Port:** the submenu is always on the right and Right opens, Left closes (`src/components/dropdown.tsx:894-899`, `base-ui:src/menu/list/menu-list.ts:271-279`); the chevron never mirrors (`src/components/menu-item.tsx:142-151`).
- **Fidelity:** dropped, unreachable in the docs.
- **Components it hits:** just this one.

## A click on a submenu trigger opens it at once

- **Cause:** `port choice` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 387: "deliberate improvement; keep").
- **Original:** a mouse press on a submenu trigger is ignored in hover mode; hover opens after 100 ms and Enter, Space and Right open from the keyboard (`menu/submenu-trigger/MenuSubmenuTrigger.tsx:192-203`, per the audit).
- **Port:** `onSelect` opens on click before the 100 ms hover timer (`src/components/dropdown.tsx:809`, `base-ui:src/menu/submenu-trigger/menu-submenu-trigger.ts:106-110`); a mouse click counts as a hover open, so the submenu's polygon follows it.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## DropdownEmpty has no `aria-live`

- **Cause:** `not ported yet`.
- **Original:** `role="status" aria-live="polite"` (`registry/default/dropdown-search.tsx:382-383`).
- **Port:** `role="status"` only (`src/components/dropdown-search.tsx:44`). Spacing, size and colour match (`px-2 py-6`, body, muted).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Playground: no Get code dialog, preset URL or code snippet

- **Cause:** `not ported yet` (the site has no preset codec and no Code tab).
- **Original:** the Playground (`lib/docs/playgrounds/dropdown.tsx`) has Mode, Selection, Search, Create from query, Icons, Groups, Disabled row and Submenu, a shuffle, a Get code dialog (`GetCodeDialog`, `:475`) and a preset URL kept in sync with the controls (`usePresetUrlSync`, `:237`). It rebuilds a Code tab snippet from the controls (`buildPlaygroundCode`, `:62-186`).
- **Port:** all eight controls, their defaults, the derived constraints (Search and Submenu need the popup; Search turns Groups off; Create from query needs Search), the shuffle's odds and the preview are as the source, in `src/demos/dropdown.tsx` (`Playground`). No Get code dialog, no preset URL, no Code tab. The inline panel gets no `aria-label="Settings"`: `Dropdown` takes none (see "Props the port does not take").
- **Workaround:** none.
- **Fidelity:** dropped (Get code, preset URL, snippet); exact for the controls and the preview content.
- **Components it hits:** every playground.

## Demo page: no section copy, extra and altered cards

- **Cause:** `not ported yet` for the copy; `port choice` (reason not stated; the added rows and cards feed the scenarios, `src/demos/dropdown.tsx`) for the additions.
- **Original:** sections in order, each in a `ComponentPreview` with a Code tab (`app/docs/dropdown/page.tsx:509-810`): Playground, Basic, Groups, Triggered menu, Submenus, Multiple selection, Searchable menu, Searchable multiple selection, Create from the query, then 13 API Reference tables. Sections open with a line of prose (for example "3 parts: `DropdownMenu`, `DropdownTrigger`, `DropdownContent`. Any element goes in `render`." and "Hover Move to, then cut across Share to its submenu: the highlight stays on Move to until you stop on another row."), and the page opens with "2 forms: an inline panel, or a popup on any trigger."
- **Port:** the Playground, then nine `DemoCard`s titled "Dropdown, basic" and so on, with no prose, no Code tab and no API tables. Previews are `minHeight: 56` where the source uses `min-h-[160px]` for the popup cases.
  - Basic, Groups, Triggered, Submenus, Multiple, Searchable, Searchable multiple and Creatable exist with the source's rows, icons, copy and initial state ("Create “…”", "No languages found", "Search languages", `Labels · 2`, statuses `[0, 1, 2]`, used `["Button", "Combobox"]`).
  - Added: a "Dropdown, keyboard" card (Alpha to Charter with a disabled Beta and a picked/changes readout) and, in Submenus, a "Moved to ..." readout.
  - Altered: the Groups card marks "Display" `disabled`; the source row is enabled (`app/docs/dropdown/page.tsx:547`). The scenario `inline-disabled-lit` walks onto it.
- **Fidelity:** all nine source variants present; the prose dropped.
- **Components it hits:** the section prose and Code tab are absent from every ported demo.
