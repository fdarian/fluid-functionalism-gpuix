# dropdown

Original: `registry/base/dropdown.tsx`, with `registry/default/menu-item.tsx`, `dropdown-search.tsx` and `dropdown-sub.tsx`. Ported in `src/components/dropdown.tsx`, `menu-item.tsx` and `dropdown-search.tsx`, demo in `src/demos/dropdown.tsx`.

Everything the docs page shows is ported and renders in both themes: the inline panel (with a keyboard focus ring), groups and separators, a triggered popup, submenus (hover to open, left and right arrows, Escape one level at a time), multiple selection with contiguous checked rows sharing one background, a searchable menu, searchable multiple selection and the creatable row. The trigger takes a function child (`DropdownTrigger`).

## No safe area toward a submenu: window mousemove only fires over listeners

- **Original:** Base UI keeps a submenu open with a safe triangle while the pointer crosses other rows, or the empty gap, on its way to the submenu.
- **gpuix lacks:** a `window` / `document` `mousemove` that fires over bare background: those listeners run only when some element on the pointer's hit path has a `mousemove` listener of its own, so the pointer between the trigger row and the popup (the 6px gap) is invisible to a polygon test.
- **Workaround:** while a submenu is open, a pointer that settles on another row for 120 ms takes the highlight and closes the submenu (`SUBMENU_DWELL_MS`, `src/components/dropdown.tsx:70`, `:429-442`), so a slow diagonal across another row changes the highlight where Base UI would not.
- **Fidelity:** approximated (dwell timer instead of a safe area).
- **Components it hits:** any popup with a nested popup.

## Reading focus state inside a mousedown handler throws `VIEW_BUSY`

- **Original:** `document.activeElement` is readable anywhere, including in a pointer handler, so a popup can note which element had focus when it opened.
- **gpuix lacks:** that read: `mousedown` and `pointerdown` (and, per `~/code/fdarian/gpuix/FORK.md:359-364`, `mouseup`, `click` and `wheel`) handlers run inside the synchronous input dispatch on macOS and in the test renderer, where `getFocusedElementId` throws "The root view is being updated by the input" (`packages/native/src/events/sync_dispatch.rs:154`). Probed on the test renderer: it throws in `onMouseDown` and answers in `onClick` and `onKeyDown`.
- **Workaround:** the pressed trigger's element id is recorded from the press event (`noteTrigger(event.elementId)`, `src/components/dropdown.tsx:907`, `:974`) and used when the menu opens, falling back to the focused element only for a keyboard open (`:858`).
- **Fidelity:** exact.
- **Components it hits:** any popup opened on press. `returnFocusTo` (`src/lib/popup-trigger.ts:13`, called from `src/components/select.tsx:242` and `src/components/color-picker.tsx:778`) reads the same state; no scenario closes those popups from a press, so that path was not exercised.

## No `width: max-content` / `fit-content`

- **Original:** the popup grows to fit its widest row, up to `max-w-full`.
- **gpuix lacks:** intrinsic sizing keywords for `width`: `max-content`, `min-content` and `fit-content` are rejected as "invalid dimension" (they exist in grid tracks only, `packages/native/js/host.ts:420-425`).
- **Workaround:** a fixed 288px panel (`PANEL_WIDTH`, `src/components/dropdown.tsx:60`, `:730`, `:1040`) and 224px submenus, never narrower than the trigger (`minWidth: "anchor-size(width)"`, `src/lib/popup.tsx:94`).
- **Fidelity:** approximated (a row wider than the panel does not widen it).
- **Components it hits:** select, combobox, any popup that sizes to content.

## CSS transforms (popup scaleY entrance)

- **Original:** the popup enters with `scaleY: 0.96`; side popups (submenus) do not.
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the popup slides 4px from the reported side and fades; submenus fade only (`src/lib/popup.tsx:64`, `:84-90`).
- **Fidelity:** approximated.
- **Components it hits:** select, combobox, color-picker.
