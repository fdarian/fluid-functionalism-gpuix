# dropdown

Original: `registry/base/dropdown.tsx`, with `registry/default/menu-item.tsx`, `dropdown-search.tsx` and `dropdown-sub.tsx`. Ported in `src/components/dropdown.tsx`, `menu-item.tsx` and `dropdown-search.tsx`, demo in `src/demos/dropdown.tsx`.

Everything the docs page shows is ported and renders in both themes: the inline panel (with a keyboard focus ring), groups and separators, a triggered popup, submenus (hover to open, ←/→, Escape one level at a time), multiple selection with contiguous checked rows sharing one background, a searchable menu, searchable multiple selection and the creatable row. The parts are the originals' (`Dropdown`, `DropdownMenu`, `DropdownTrigger`, `DropdownContent`, `DropdownSub*`, `DropdownSearch`, `DropdownEmpty`, `DropdownLabel`, `DropdownSeparator`, `MenuItem`), except that the trigger takes a function child (see below).

## A positioned element eats the mouse for its ancestors

- **Original:** a `position: relative` or absolutely placed child is paint-only; hover still reaches the list around it.
- **gpuix lacks:** the same, as already seen in the command menu and tooltip: any element with `position` set, or a fill, ends the hit test (`packages/native/src/renderer.rs:5336-5352`, `style::should_occlude` at `style.rs:317`). Here it bit three times: a `position: relative` row stopped the container's fluid hover; the ghost-span label (relative wrapper plus an absolute copy) needed `pointerEvents: "none"` on both layers; and a `Button` trigger, being filled, hides the pointer from the wrapper around it.
- **Workaround:** rows carry no `position`; both label layers set `pointerEvents: "none"`; the trigger is a function child (`<DropdownTrigger>{(trigger) => <Button onClick={trigger.onClick} />}`) rather than a wrapper that listens, and the menu decides "inside the trigger" from its painted bounds.
- **Fidelity:** exact once worked around. The `render` prop of Base UI's trigger has no equivalent, so the trigger needs the one extra function.
- **Components it hits:** tooltip, command-menu, every semibold ghost-span label.

## Hover and "outside" are bounds-based, not tree-based

- **Original:** a submenu is a DOM child of the menu's tree, so pointer events inside it bubble to the parent; the safe-area logic of Base UI keeps the submenu open while the pointer crosses other rows toward it, and an outside press is "anywhere that is not the menu, its submenus or the trigger".
- **gpuix lacks:** tree-bubbling for mouse events and a way to group elements for `onMouseDownOutside`. A deferred `<anchored>` layer is hit-tested on its own bounds, so the moment the pointer enters the submenu the parent popup gets `mouseLeave`, and `onMouseDownOutside` fires on every element the press is not inside, including the trigger (for the popup) and the popup (for the wrapper). A hovered flag is not a safe substitute: a press without a preceding move never sets it. Missing feature.
- **Workaround:** the parent holds its highlight on the open trigger through `mouseLeave`; while a submenu is open a pointer that settles on another row for 120 ms takes the highlight (and the submenu closes), where Base UI uses a safe triangle, so a slow diagonal across another row changes the highlight where the original would not. An outside press is classified by comparing `event.x/y` with the painted bounds of the trigger and of every open popup (primed at mount, because the first `getElementBounds` read only turns tracking on and returns null).
- **Fidelity:** approximated (dwell timer instead of a safe area).
- **Components it hits:** select, combobox, any popup with a nested popup.

## Popup placement: no flip, no available height

- **Original:** Base UI's Positioner flips the popup to the side with room and the popup's `max-height` follows `--available-height`.
- **gpuix lacks:** a flip that clears the trigger (`fit="switch"` flips to the far edge and covers it; `fit="snap"` slides the popup over the trigger, `packages/native/src/custom_elements/anchored.rs:351-352`) and any measure of the room around an anchor. Missing feature, already known from the combobox and select.
- **Workaround:** the side is chosen on open from the trigger's painted bounds and the window height, with the previous open's height as the guess (240 px the first time). Once the rows are measured the menu flips once if the real height does not fit, and its `max-height` is the room on the chosen side up to 480 px, so a long list scrolls instead of covering the trigger. That second step can land a frame or two into the popup's fade-in.
- **Fidelity:** approximated.
- **Components it hits:** select, combobox, tooltip, every anchored popup.

## Submenus anchor to a row, and cannot flip

- **Original:** `Menu.SubmenuRoot` positions beside its trigger row (`side="right"`, 6 px offset, -4 px along the row so the first row lines up) and flips to the left when there is no room.
- **gpuix lacks:** the flip (above). `<anchored side="right" align="start" gap={6} offset={{ y: -4 }}>` places it exactly like the original, and the popup is the trigger row's child, but nothing moves it to the left at a window edge; `snap` slides it over its parent instead.
- **Workaround:** none. The anchored layer sits inside an absolutely placed, mouse-transparent box that fills the row, because a bare `<anchored>` child of a flex row takes a `gap` slot and would shove the chevron left by 8 px when the submenu opens.
- **Fidelity:** exact on the right side, not handled at the right window edge.
- **Components it hits:** any nested popup.

## Rows are not focusable: no roving focus, no typeahead from focus

- **Original:** Base UI's `Menu.Item` owns focus: arrows move real focus between rows, typeahead matches on the focused row, Enter and Space activate it, and focus returns to the trigger on close.
- **gpuix lacks:** focusable rows with their own key handling in this layout (`tabIndex` is per element and Tab order is native), so the highlight is a virtual index. The trigger (or the search field) keeps real focus; the menu's wrapper handles `down`, `up`, `home`, `end`, `enter`, `space`, `left`, `right`, `escape` and `tab` as keys bubble to it from either, and a stack of handlers makes the deepest open submenu the one that answers. Space and Enter from a `Button` trigger also reach the button's own click, which is told apart from a mouse click by `event.key`.
- **Workaround:** the virtual highlight, plus a small typeahead (500 ms buffer) that is off while a search field is mounted. Focus is not returned to the trigger on close.
- **Fidelity:** approximated (no focus return, no screen-reader focus semantics).
- **Components it hits:** select, combobox, command-menu.

## Checked-run backgrounds merge, but the merge cannot straighten corners

- **Original:** contiguous checked rows share one background; toggling a bridge row plays a merge/split where the facing corners straighten from rounded to square while the halves converge.
- **gpuix lacks:** per-corner radius in `motion` (`MotionStyle.borderRadius` is one number, `packages/native/js/host.ts:22`, `motion.rs:22`), so the inner corners of two converging blocks cannot go square.
- **Workaround:** one `FluidHighlight` per run, ids kept stable across selections (a run reuses the id of the earlier run it overlaps), spanning the first to the last row of the run on the `moderate` spring. A run that appears fades in, one that goes fades out in place; a bridge that merges two runs grows one block and fades the other.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group (merged selection), any merge/split choreography.

## The search field cannot be sticky

- **Original:** `DropdownSearch` is `position: sticky; top: 0` inside the scrolling list, painted on the surface colour so rows scroll underneath it.
- **gpuix lacks:** `position: sticky`.
- **Workaround:** the field is drawn by `DropdownContent` above the scroller (it is part of the popup's chrome), and `DropdownSearch` only hands its props up. Visually identical, since the rows never need to show through it; the scroller's `max-height` subtracts the field's 36 px.
- **Fidelity:** exact.
- **Components it hits:** command-menu (its list is the same shape).

## Smaller notes

- **Check mark:** fades in (`motion` opacity) instead of drawing its path; see `limitations/select.md`. A row checked at mount shows the finished check, like `initial={false}`.
- **Popup enter:** opacity and the 4 px slide on `top`; no `scaleY` (transforms are a known gap). Submenus fade only, like the original's `--popup-enter-y: 0` for side popups.
- **`scrollIntoView`:** replaced by `getScrollOffset` plus `scrollTo` against the measured rect, as in select and the command menu (`packages/native/src/renderer.rs:3860-3890`).
- **Scroll fade and ScrollArea:** a bare `overflowY: "scroll"` list; no thumb, no edge mask (see the README's ScrollArea row).
- **Left, right, home and end in the search field** belong to the text editor and never reach `onKeyDown` (`custom_elements/input.rs:200-209`); here that only means ArrowLeft/Right edit the query rather than reach the menu, which is also what the original's field does.
- **`size="compact"`** is not ported; every row is the default 36 px.
- **Popup width:** 288 px (`w-72`), or the trigger's width if larger; the original grows to fit its widest row up to `max-w-full`.
