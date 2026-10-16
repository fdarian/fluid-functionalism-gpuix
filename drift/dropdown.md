# dropdown

Original: `registry/base/dropdown.tsx`, with `registry/default/menu-item.tsx`, `dropdown-search.tsx` and `dropdown-sub.tsx`; demo in `app/docs/dropdown/page.tsx` and `lib/docs/playgrounds/dropdown.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/dropdown.tsx`, `menu-item.tsx` and `dropdown-search.tsx`, demo in `src/demos/dropdown.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts, IME) are one line each and link to the README row.

## No safe area toward a submenu: window mousemove only fires over listeners

- **Cause:** `gpuix gap`.
- **Original:** Base UI keeps a submenu open with a safe triangle while the pointer crosses other rows, or the empty gap, on its way to the submenu. `useSubmenuHost` then holds the parent's highlight on the trigger (`registry/default/dropdown-sub.tsx:54-157`, `:140-149`) until focus moves, which the primitive does only once the pointer leaves the safe area.
- **Port:** while a submenu is open, a pointer that settles on another row for 120 ms takes the highlight and closes the submenu (`SUBMENU_DWELL_MS`, `src/components/dropdown.tsx:71`, `:422-449`). Hovering a trigger opens its submenu after 100 ms (`HOVER_OPEN_MS`, `:69`, `:1193-1203`). A hover-opened submenu leaves focus on its parent row, as Base UI does, until the pointer reaches a row inside it or ArrowRight enters.
- **gpuix lacks:** a `window` / `document` `mousemove` that fires over bare background: those listeners run only when some element on the pointer's hit path has a `mousemove` listener of its own, so the pointer between the trigger row and the popup (the 6px gap) is invisible to a polygon test (README "Bugs" row, audit rows 386 and 721).
- **Workaround:** the dwell timer above, so a slow diagonal across another row changes the highlight where Base UI would not.
- **Fidelity:** approximated (dwell timer instead of a safe area).
- **Components it hits:** any popup with a nested popup; tooltip has the same gap.

## No `width: max-content` / `fit-content`

- **Cause:** `gpuix gap`. README "Missing features" row "Intrinsic width".
- **Original:** the popup is `w-72 min-w-[var(--anchor-width)] max-w-full` (`registry/base/dropdown.tsx:708`) and grows with the trigger; the inline panel is `w-72 max-w-full` (`:187`); submenus are `w-56`.
- **Port:** a fixed 288px panel (`PANEL_WIDTH`, `src/components/dropdown.tsx:56`, `:477`, `:1067`) and 224px submenus (`SUB_WIDTH`, `:62`, `:819`), never narrower than the trigger (`minWidth: "anchor-size(width)"`, `src/lib/popup.tsx:77`). The inline panel is `flexShrink: 0` (`:775`), so it does not shrink in a narrow container, where the source's `max-w-full` does.
- **gpuix lacks:** intrinsic sizing keywords for `width`: `max-content`, `min-content` and `fit-content` are rejected as "invalid dimension" (they exist in grid tracks only, `packages/native/js/host.ts:420-425`).
- **Workaround:** the fixed widths above.
- **Fidelity:** approximated. The source's popup never actually grows past `w-72` either (its width is fixed unless the trigger is wider), so the loss is the `max-w-full` clamp only.
- **Components it hits:** select, combobox, any popup that sizes to content.

## CSS transforms (popup scaleY entrance)

- **Cause:** `gpuix gap`. README "Missing features" row "CSS transforms".
- **Original:** every popup, submenus included, enters and exits with `scaleY: 0.96` about its side's origin (`registry/base/dropdown.tsx:622-630`); the root popup also slides 4px from the resolved side (`--popup-enter-y`, `registry/default/lib/popup.ts:17-26`), side popups (submenus) slide 0px but still scale.
- **Port:** the root popup slides 4px from the reported side and fades (`src/lib/popup.tsx:43`, `:64-70`); a submenu only fades (`src/components/dropdown.tsx:1311-1316`). Timings are the source's: enter `spring.fast` (80 ms), exit 60 ms tween.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the slide and fade above.
- **Fidelity:** approximated.
- **Components it hits:** select, combobox, color-picker.

## Static font weights

- **Cause:** `gpuix gap`. README "Missing features" row "Variable-font axes".
- **Original:** a lit or checked row's label eases from `wght 400` to `550` over 80 ms (`registry/default/menu-item.tsx:224-233`); 
- **Port:** `StableLabel` switches at once to SemiBold 600 (`src/components/menu-item.tsx:120-125`, `src/lib/theme.ts:375`).
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
- **Port:** gpuix `<input>` (`src/components/dropdown-search.tsx:83-117`); no `composition*` events, so the field's Escape/Tab/arrow handling cannot tell a key an IME consumed. Untested.
- **Fidelity:** exact for Latin input, unknown for IME.
- **Components it hits:** combobox, command-menu, input-group, input-message.

## Submenu and inline panel colour is fixed at surface-3

- **Cause:** `not ported yet`. `PopupSurface` (the main popup) follows its substrate through `src/lib/surface-context.ts`; the submenu and inline panel do not read it.
- **Original:** `Elevated offset={2}` is `min(substrate + 2, 8)`, so a dropdown opened inside a dialog or a raised card sits on a lighter surface; only its shadow level is pinned (`registry/default/lib/elevated.tsx`, `registry/base/dropdown.tsx:133-135`). The search field paints the same level (`registry/default/dropdown-search.tsx:233`).
- **Port:** the main popup is `min(substrate + 2, 8)` (`src/lib/popup.tsx`); the submenu and inline panel are always `color.card` (surface-3, `src/components/dropdown.tsx:481`, `:1327`).
- **Fidelity:** exact on the page, approximated for a submenu or inline panel inside a raised surface.
- **Components it hits:** just this one.

## Popup list scrolls in plain `overflow`, not ScrollArea

- **Cause:** `not ported yet`. `src/components/scroll-area.tsx` exists with the thumb and the mask fade.
- **Original:** rows scroll inside `ScrollArea` with the hover-revealed thumb and a 32px `scroll-fade` on the viewport, dropped while a search field is mounted (`registry/base/dropdown.tsx:714`; `registry/default/lib/popup.ts:35-37`).
- **Port:** a `div` with `overflowY: "scroll"` (`src/components/dropdown.tsx:634-645`): no custom thumb, no edge fade.
- **Fidelity:** approximated.
- **Components it hits:** select (`src/components/select.tsx:324`), combobox (`:564`), command-menu (`:874`).

## Checked background appears with a fade instead of already being there

- **Cause:** `not ported yet`. `FluidHighlight` has no `initial={false}` mode.
- **Original:** the single-select background is `initial={false}`, so a row checked at mount, or at popup open (the rows stay registered between opens), shows the finished block (`registry/base/dropdown.tsx:195-215`, `:722-742`). It animates `top/left/width/height` on `spring.moderate`, opacity in 0.08 s, exit `spring.moderate.exit` (120 ms).
- **Port:** `FluidHighlight` always starts at `opacity: 0` and fades in on the one `glide` transition, `moderate` (160 ms spring), for opacity too (`src/lib/fluid-highlight.tsx:81`; `src/components/dropdown.tsx:201-221`). On the inline demo and on every popup open the checked block fades in over about 160 ms rather than being present from frame one; exit is the same 120 ms tween.
- **Fidelity:** approximated.
- **Components it hits:** any list that uses `FluidHighlight` for a selected background.

## Multiple selection: merge and split morph is a plain grow/shrink

- **Cause:** `not ported yet`. gpuix animates per-corner radii in `motion` (`~/code/fdarian/gpuix/FORK.md:819-821`, as `drift/checkbox-group.md` records); nothing here does.
- **Original:** `useMergeSplitBlocks` (`registry/default/hooks/use-merge-split.tsx`): when one unchecked row bridges two checked runs, the facing edges glide to the bridging row's midpoint with the inner corners straightening (corners trail by 70 ms), then swap to one block; deselecting a middle row plays the inverse. Spring `moderate`, corner radius 8 (`registry/base/dropdown.tsx:121-126`, `:193`).
- **Port:** one `FluidHighlight` per run id, rect from the run's first to last row, radius 8 on all four corners (`src/components/dropdown.tsx:160-181`, `:210-222`). A merge makes the surviving block spring-grow over the whole union while the absorbed one fades out, the motion the source's comment says it avoids; a split shrinks the block and fades a new one in. `multi-merged.png` and `multi-split.png` show the end states, which match.
- **Fidelity:** approximated (end states exact, the transition differs).
- **Components it hits:** checkbox-group (`drift/checkbox-group.md`, same cause and wording).

## Check mark fades in; the source draws it

- **Cause:** `not ported yet`. `CheckMark` in `src/lib/icon.tsx:41` already draws and retracts the stroke, and select and combobox use it.
- **Original:** the check is a `motion.path` that draws (`pathLength` 0 to 1, 80 ms ease-out) and retracts on exit (40 ms ease-in); `AnimatePresence initial={false}` shows a row checked at mount finished (`registry/default/menu-item.tsx:241-272`). The svg exists only while `checked`.
- **Port:** a mounted-late `motion.div` fades the `check` glyph in over 80 ms ease-out; unchecking removes it at once, no retract (`src/components/menu-item.tsx:134-156`). The 16px slot, and its 8px gap, is always reserved for any row with a boolean `checked`, so an unchecked radio row's label is 24px narrower than the source's (the source only reserves it while checked); it only shows on a label long enough to clip.
- **Fidelity:** approximated.
- **Components it hits:** just this one (select and combobox already draw it).

## Clicks in the padding and between rows are not routed to the lit row

- **Cause:** `not ported yet`.
- **Original:** `useFluidHover` routes a click that lands between rows, in the 4px padding or past the last row, to the highlighted row, so what is lit is what a click hits; the popup and the inline panel both pass `handlers.onClick` (`registry/default/hooks/use-fluid-hover.ts:40-47`, `:583`; `registry/base/dropdown.tsx:144`, `:667`).
- **Fidelity:** dropped.
- **Components it hits:** any list on `createFluidHover` (select, combobox, tabs, sidebar).

## Inline panel focus ring: no fade, cleared by the pointer

- **Cause:** `not ported yet`. The ring has no `AnimatePresence`-style fade, and the panel clears it on any pointer move.
- **Original:** the ring is a `motion.div` in `AnimatePresence` that springs `left/top/width/height` on `spring.fast`, fades 0.08 s and exits on `spring.fast.exit` (`registry/base/dropdown.tsx:224-243`). It is set from `onFocus` only when the target `:focus-visible` (`:145-156`) and stays until focus leaves the panel (`:157-161`); a mouse move changes the hover highlight, not the ring.
- **Port:** `Show` mounts and unmounts the ring with no fade either way (`src/components/dropdown.tsx:233-254`), though it springs between rows. Any pointer move over the panel clears it (`:558`, `:562`). The rows are the focus targets (the group is not focusable), and a row's `onFocus` draws the ring only for `event.focusVisible` (`src/components/menu-item.tsx:187-189`, `dropdown.tsx:756-761`), as the source does (`:145-156`); a press that focuses a row lights it and draws no ring. Focus leaving the rows clears the ring and the highlight (`:817-829`).
- **Fidelity:** approximated for the fade and the clearing.
- **Components it hits:** just this one (popup menus draw no ring in either build).

## Search field is a child of the scroller, not of the list

- **Cause:** `gpuix gap`.
- **Original:** the field is `sticky top-0 z-20 -mx-1 -mt-1 mb-0.5` inside the padded `p-1` list, `border-b border-border/60`, painted with the surface so rows scroll underneath; `DropdownSearch` in an inline `Dropdown` is simply open (`registry/default/dropdown-search.tsx:228-231`, `:317-331`).
- **Port:** `DropdownSearch` renders nothing and registers its props with the list around it, which draws the field as the first child of the scroller, ahead of the padded rows: `position: sticky`, `top: 0`, `zIndex: 20`, the popup's `surface(level)` fill, the rows' top padding cut to 2px (`src/components/dropdown-search.tsx:61-121`; `src/components/dropdown.tsx:395-404`). A row the keyboard reveals stops below the field (`revealRow`'s `topInset`, `src/lib/list-nav.ts`); the source's `scrollIntoView` lets it slide under. An inline `Dropdown` hosts `DropdownSearch` the same way and draws the field above the rows, not sticky (`dropdown.tsx:868-881`); ArrowDown and ArrowUp leave it for the first and last row.
- **gpuix lacks:** a negative margin on a sticky box does not bleed over its parent's padding. A sticky `marginTop: -4` child of a `padding: 4` box is held at the parent's content box (y 54 where its layout slot is 50) until the scroller moves it, then pinned at 50; a CSS sticky box keeps its border box where the margin puts it. So the field cannot sit in the padded list as the source has it. Measured on the test renderer, not traced in gpuix's `sticky.rs`.
- **Workaround:** the field is the scroller's child, where the parent has no padding.
- **Fidelity:** exact visually; the DOM structure differs.
- **Components it hits:** command-menu draws its own field.

## Compact size is not ported

- **Cause:** `not ported yet`. No size context in the port; `height.controlCompact` is passed per component (`src/components/button.tsx`, `input-group.tsx`).
- **Original:** `size="compact"` on `Dropdown` or `DropdownMenu`, or a surrounding `SizeProvider`, gives 28px rows, 12/18 text, 14px icons, `px-1.5` and `gap-1`, 11/14 group labels, and a 10px/`leading-5` search field (`registry/base/dropdown.tsx:100-103`, `:328-332`, `:902-908`; `registry/default/lib/size-context.tsx`; `dropdown-search.tsx:226`, `:328`, `:361`).
- **Port:** rows are always 36px, 13/20 text, 16px icons, `px 8` and `gap 8` (`src/components/menu-item.tsx:201-232`, `:29-46`; `src/components/dropdown-search.tsx:52`, `:68-78`).
- **Fidelity:** dropped.
- **Components it hits:** any component with a compact step.

## Props the port does not take

- **Cause:** `not ported yet` (nothing in gpuix prevents them) except where noted.
- **Original:** `Dropdown` takes `size`, `aria-label`, `className` and `ref` (`registry/base/dropdown.tsx:94-107`); `DropdownMenu` takes `size` (`:328-332`); `DropdownContent` takes `className`, `ref`, `side`, `align` (`start | center | end`), `sideOffset`, `alignOffset` (`:400-415`); `DropdownSubContent` takes `sideOffset` and `alignOffset` (`:863-891`); `MenuItem` takes `className` and any `div` prop, `onClick` included (`registry/default/menu-item.tsx:121-136`); `DropdownSearch` takes any `input` prop (`dropdown-search.tsx:193-207`); `DropdownLabel`, `DropdownSeparator` and `DropdownEmpty` take `className`.
- **Port:** `Dropdown` takes `checkedIndex`, `checkedIndices`, `testId` (`src/components/dropdown.tsx:671-677`); `DropdownContent` takes `align` (`start | end`) only (`:1039-1047`), with the side fixed at the bottom and a 6px gap (`src/lib/popup.tsx:11`); the submenu offsets are the constants `SUBMENU_SIDE_OFFSET` and `SUBMENU_ALIGN_OFFSET` (`:35-37`, `:1300-1303`); `MenuItem` has `chevron`, `submenu`, `onOpenSubmenu` and `testId` (`src/components/menu-item.tsx:64-83`). `DropdownLabel` and `DropdownEmpty` take a string child only (`:29`, `dropdown-search.tsx:32`). `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 398 records `side`, `sideOffset` and `alignOffset` as a lead decision: no ported consumer.
- **Fidelity:** dropped for the missing props.
- **Components it hits:** just this one.

## DropdownTrigger is a function child, not `render`

- **Cause:** `port choice` (reason not stated in the code; Solid has no `cloneElement`-style `render` merge, and the trigger's handlers must reach the element so the press, the id and `aria-*` are wired by hand).
- **Original:** `Menu.Trigger` re-exported; `<DropdownTrigger render={<Button variant="ghost">Open menu</Button>} />` (`registry/base/dropdown.tsx:384`, docs `app/docs/dropdown/page.tsx:559-561`).
- **Port:** `DropdownTrigger` calls its child with `{ attributes, onMouseDown, onClick, expanded }`, which every demo spreads onto the `Button` by hand (`src/components/dropdown.tsx:1002-1036`; `src/demos/dropdown.tsx:502-512`). The trigger has no `disabled` of its own; `DropdownMenu disabled` covers it.
- **Fidelity:** approximated (same behaviour, different call shape).
- **Components it hits:** none other (select and combobox own their triggers).

## DropdownMenu adds a wrapper element and dims on `disabled`

- **Cause:** `port choice` (reason from the code comments: the wrapper hosts the closed-state key handler (open on Enter, Space, ArrowDown, ArrowUp), the outside-press handler and the trigger and popup's shared logical subtree, `src/components/dropdown.tsx:961-995`; the dimming is the port's own, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 359).
- **Original:** `Menu.Root` renders no DOM; a disabled menu styles nothing, the consumer's `render` element decides (`registry/base/dropdown.tsx:354-364`).
- **Port:** a `relative flex` `div` wraps the trigger and the popup, and `disabled` sets `opacity: 0.5` on all of it (`:972-996`). A trigger that relies on its parent's layout (a flex row, an `inline` flow) sees the extra box.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## RTL: submenu side, arrow keys and chevron

- **Cause:** `port choice` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` rows 474-477, lead decision: no ported consumer; the source docs never mount a `DirectionProvider`).
- **Original:** `useDirection()` picks `side="left"` for rtl (`registry/base/dropdown.tsx:879-883`), Base UI swaps the submenu open and close keys, and the chevron mirrors with `rtl:-scale-x-100` (`registry/default/dropdown-sub.tsx:179`).
- **Port:** the submenu is always on the right and Right opens, Left closes (`src/components/dropdown.tsx:1300`, `:408-416`); the chevron never mirrors (`src/components/menu-item.tsx:126-133`).
- **Fidelity:** dropped, unreachable in the docs.
- **Components it hits:** just this one.

## A click on a submenu trigger opens it at once

- **Cause:** `port choice` (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` row 389: "deliberate improvement; keep").
- **Original:** a mouse press on a submenu trigger is ignored in hover mode; hover opens after 100 ms and Enter, Space and Right open from the keyboard (`menu/submenu-trigger/MenuSubmenuTrigger.tsx:192-203`, per the audit).
- **Port:** `onSelect={show}` opens on click before the 100 ms hover timer (`src/components/dropdown.tsx:1215`).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## DropdownEmpty has no `aria-live`

- **Cause:** `not ported yet`.
- **Original:** `role="status" aria-live="polite"` (`registry/default/dropdown-search.tsx:382-383`).
- **Port:** `role="status"` only (`src/components/dropdown-search.tsx:35`). Spacing, size and colour match (`px-2 py-6`, body, muted).
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
