# combobox

Original: `registry/base/combobox.tsx` (shared: `registry/default/lib/popup.ts`, `fluid-hover-highlight.tsx`, `hooks/use-fluid-hover.ts`, `lib/size-context.tsx`, `lib/shape-context.tsx`, `lib/elevated.tsx`), demo in `app/docs/combobox/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/combobox.tsx`, demo in `src/demos/combobox.tsx`.
Popup chrome is shared: `src/lib/popup.tsx`, `src/lib/presence.ts`, `src/lib/list-nav.ts`.

Base UI behaviour (filtering, highlight, Enter, Escape, ARIA) is tracked row by row in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` ("Combobox"); this file covers what looks or behaves differently. Single selection only. Dark mode: the port reads the same palette (`src/lib/theme.ts`), and no dark-only drift was found beyond the shadow and substrate entries below.

## IME composition is invisible to JS

- **Cause:** `gpuix gap`.
- **Original:** Base UI's `Combobox.Input` handles composition (`compositionstart` / `compositionend`, `which === 229` on keydown), so Enter or arrows during composition do not pick or move (Base UI `combobox/input/ComboboxInput.tsx:100-101,223-233,~413`).
- **Port:** the field filters on every `onChange` (`base-ui:src/combobox/root/use-combobox-root.ts:282-295`); Enter and arrows are handled without an IME guard (`:235-281`).
- **gpuix lacks:** composition events and a truthful `isComposing`: a key that feeds an IME is consumed by the platform before GPUI sees it, so `keydown` cannot cancel it, `isComposing` is always `false` and no `composition*` events exist (`~/code/fdarian/gpuix/FORK.md:493-496, 559-563`).
- **Workaround:** none; IME input is untested.
- **Fidelity:** approximated (unverified for composed input).
- **Components it hits:** command-menu, dropdown-search, input-group, input-message: any text field that reacts to Enter or arrows.

## No `<input type="hidden">`

- **Cause:** `gpuix gap`.
- **Original:** Base UI renders hidden inputs carrying the picked value, so a `<form>` submits it under `name` and an empty `required` one blocks the submit (Base UI `combobox/root/AriaCombobox.tsx:1592-1706`; FF passes `name`, `required` at `combobox.tsx:348-349`).
- **Port:** `FormValue` (`base-ui:src/utils/form-value.tsx`, used at `src/components/combobox.tsx:174-182`).
- **gpuix lacks:** `type="hidden"`: `InputType` is `text | password | number | email | search | tel | url` (`packages/native/js/host.ts:1175`), and `FormData` reads only named, enabled `<input>`s.
- **Workaround:** `FormValue` is a real input kept 1px, transparent, pointer-less and out of the tab order; when an empty required one takes focus it hands it to the combobox's input.
- **Fidelity:** exact.
- **Components it hits:** select, color-picker (any control that is not an input and submits a value).

## Implicit submission does not validate, and there is no submit button

- **Cause:** `gpuix gap`.
- **Original:** a `<button type="submit">`, or Enter in a form control, submits the form; an empty `required` control blocks it, fires `invalid` and takes focus.
- **Port:** the demo's Submit button calls `form.requestSubmit()` (`src/demos/combobox.tsx:275-282`).
- **gpuix lacks:** a submit button (`SubmitEvent.submitter` is always `null`, `packages/native/js/host.ts:1209`), and Enter in a form `<input>` with an empty `required` control does nothing instead of validating; only `requestSubmit()` validates. A form with two or more `<input>`s does not submit on Enter at all (gpuix `README.md:3051-3055`), and a combobox with `name` or `required` adds `FormValue` as a second input, so Enter in it never submits.
- **Workaround:** `requestSubmit()` from a button.
- **Fidelity:** exact for `requestSubmit()`, dropped for implicit submission.
- **Components it hits:** select, any form in a demo.

## CSS transforms (popup scale)

- **Cause:** `gpuix gap`.
- **Original:** the popup enters from `opacity 0, y -4 (4 when flipped above), scaleY 0.96` with `origin-top` (`origin-bottom` above) on `spring.fast`, exits on `spring.fast.exit` (`combobox.tsx:811-824`, `popup.ts:16-23`).
- **Port:** `PopupSurface` slides the card 4px from the reported side on `top` and fades it, no scale (`src/lib/popup.tsx:43`, `:62-70`).
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:1194-1205`; README "Missing features", CSS transforms row).
- **Workaround:** the slide.
- **Fidelity:** approximated.
- **Components it hits:** select, dropdown, color-picker, tooltip, dialog.

## Highlights travel on `top` / `left`, not a transform

- **Cause:** `gpuix gap`.
- **Original:** the hover and checked pills are pinned at 0,0 and moved with `x` / `y` (`fluid-hover-highlight.tsx:121-131`; checked marker `combobox.tsx:1022-1038`).
- **Port:** both animate `top` / `left` / `width` / `height` (`src/lib/fluid-highlight.tsx:92-99`, used at `src/components/combobox.tsx:350-365`).
- **gpuix lacks:** transforms; see README "Missing features", CSS transforms row, and `drift/select.md`.
- **Workaround:** none needed visually.
- **Fidelity:** approximated (same path, different cost).
- **Components it hits:** every fluid hover list.

## A popup cannot grow to its widest row

- **Cause:** `gpuix gap`.
- **Original:** `min-w-[var(--anchor-width)]` on the popup, which then grows to its widest row (`combobox.tsx:831`).
- **Port:** a fixed `width` equal to the field's, and never narrower than the field (`src/lib/popup.tsx:76-77`, `src/components/combobox.tsx:303`). A longer label ellipsizes (`:424-426`).
- **gpuix lacks:** an intrinsic (`max-content`) width; see README "Missing features", intrinsic `width` row, and `drift/select.md`.
- **Workaround:** none; the combobox has no `popupWidth` prop.
- **Fidelity:** approximated.
- **Components it hits:** select, dropdown, scroll-area.

## Cap-height text trim

- **Cause:** `gpuix gap`.
- **Original:** each row label uses `[text-box:trim-both_cap_alphabetic]` with `py-1 -my-1` (`combobox.tsx:1156`).
- **Port:** the label is centred by its full line box (`src/components/combobox.tsx:415-428`).
- **gpuix lacks:** `text-box-trim` / `text-box-edge`; README "Missing features", badge row, and `drift/select.md`.
- **Workaround:** none; about a pixel of drift.
- **Fidelity:** approximated.
- **Components it hits:** badge, select, every trimmed label.

## Hovering a focused field

- **Cause:** `port choice` (reason not stated).
- **Original:** `hover:bg-muted/50 focus-within:bg-card` (`combobox.tsx:392`). Tailwind v4 emits `hover` after `focus-within`, so by cascade order a hovered, focused field should show `muted/50`, not `card` (read from the variant order, not seen in a browser).
- **Port:** a hovered, focused field stays `card` (`src/components/combobox.tsx:198-202`).
- **Workaround:** n/a.
- **Fidelity:** approximated (unverified against the browser).
- **Components it hits:** just this one.

## Scrolling list: no `ScrollArea` thumb or scroll fade

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Popup list scrolls in plain `overflow`, not ScrollArea"](dropdown.md#popup-list-scrolls-in-plain-overflow-not-scrollarea), where the entry lives. Here: original `combobox.tsx:989,1075`; port `src/components/combobox.tsx:328-338`.

## A click between rows is not routed to the highlighted row

- **Cause:** `not ported yet`. Same drift as [dropdown.md, "Clicks in the padding and between rows are not routed to the lit row"](dropdown.md#clicks-in-the-padding-and-between-rows-are-not-routed-to-the-lit-row), where the entry lives. Here: original `combobox.tsx:1001`; port list padding `src/components/combobox.tsx:340-348`.

## Highlight opacity and lifecycle

- **Cause:** `not ported yet`.
- **Original:** the hover and checked pills fade their opacity on a fixed 0.08s tween whatever the positional spring (`fluid-hover-highlight.tsx:82-96`; checked: `combobox.tsx:1034-1040`). The checked pill mounts with `initial={false}`, so it is simply there when the popup opens. All three overlays are torn down as the close begins (`open && ...`, `combobox.tsx:1009-1045`).
- **Port:** one transition covers position and opacity (`src/lib/fluid-highlight.tsx:69-75`), so the checked pill's fade is the 160ms `moderate` spring and it fades in from `opacity: 0` on every open (`:93`). The overlays stay mounted through the exit fade (`src/components/combobox.tsx:350-365`).
- **Workaround:** none; the popup's own 80ms fade covers most of it.
- **Fidelity:** approximated.
- **Components it hits:** select, dropdown (every `FluidHighlight` user).

## The highlight resets on leaving the list, not on leaving a row

- **Cause:** `port choice` (the hover state belongs to the list container, as in `createFluidHover`).
- **Original:** `useListNavigation` resets the highlight from each item's `onPointerLeave` unless the pointer went to another item (`floating-ui-react/hooks/useListNavigation.ts:709-743`), so moving from a row into the list's 4px padding drops it, and `autoHighlight="always"` refills row 0 (`AriaCombobox.tsx:1198-1207`). Read from source, not seen in a browser.
- **Port:** `onMouseLeave` on the list container (`src/components/combobox.tsx:143-146`, `:340-343`, `base-ui:src/combobox/root/use-combobox-root.ts:296-299`), where the padding counts as inside, so the lit row stays while the pointer is over the padding and resets to row 0 only once it leaves the list.
- **Workaround:** none; a row-level leave would also need the fluid hover to ignore the padding.
- **Fidelity:** approximated (a few pixels of padding).
- **Components it hits:** just this one.

## Disabled is `readOnly` plus `tabIndex` -1

- **Cause:** `not ported yet`.
- **Original:** Base UI `disabled`: the input is disabled and unfocusable, the field is `opacity-50 pointer-events-none` (`combobox.tsx:384`).
- **Port:** the root is `opacity: 0.5` with `pointerEvents: "none"` (`src/components/combobox.tsx:162-172`), the input is `readOnly` with `tabIndex` -1 and `aria-disabled` (`base-ui:src/combobox/root/use-combobox-root.ts:345-353`).
- **Workaround:** the stand-in. gpuix has `<input disabled>` now (never focusable; `FORK.md:499-500`).
- **Fidelity:** approximated (looks the same; assistive tech sees `aria-disabled`, not a disabled input).
- **Components it hits:** just this one.

## Pressing the icon area focuses and opens the field

- **Cause:** `port choice` (reason not stated).
- **Original:** only the `<input>` opens the popup on press (`openOnInputClick`); the icon and padding do nothing (`ComboboxInput.tsx:188-207`).
- **Port:** the icon plus input box also focuses the input and opens the popup (`src/components/combobox.tsx:205-206`, `base-ui:src/combobox/root/use-combobox-root.ts:316-321`).
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## The field's text reverts when the close starts

- **Cause:** `port choice` (judgement call 2, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:631`: "visually minor, left").
- **Original:** the typed text reverts to the picked label after the popup unmounts; a frozen `closeQuery` keeps the list steady during the exit (Base UI `AriaCombobox.tsx:800-831`).
- **Port:** `closePopup` resets the text at once (`base-ui:src/combobox/root/use-combobox-root.ts:147-151`); the list keeps its old query through the fade, so only the input text differs.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Keyboard reveal keeps 4px of padding

- **Cause:** `port choice` (reason not stated; `LIST_PADDING` is the list's own padding).
- **Original:** Base UI scrolls the highlighted row into view, nearest edge (`useListNavigation.ts` `scrollIntoView`), which in a `p-1` list lands flush with the viewport edge.
- **Port:** `revealRow(..., "nearest", LIST_PADDING)` leaves 4px beyond the row (`src/components/combobox.tsx:31,137`, `base-ui:src/combobox/root/use-combobox-root.ts:217-222`, `base-ui:src/internals/composite/composite.ts:65-88`).
- **Fidelity:** approximated (unverified against the browser).
- **Components it hits:** select.

## API shape and value type

- **Cause:** `port choice` (reason not stated).
- **Original:** compound components (`Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`); `items` of `string | { value, label }`, rows rendered by the caller with `icon` / `disabled` on `ComboboxItem`; no value is `""` (`combobox.tsx:127-216,1094-1215`).
- **Port:** one `Combobox` with props; items are `string | { value, label, icon?, disabled? }`; no value is `null`; adds `width`, `testId`, `labelledBy`, `emptyText` (`src/components/combobox.tsx:69-112`).
- **Fidelity:** approximated.
- **Components it hits:** all ported compound components (select, dropdown).

## Field width

- **Cause:** `port choice` (reason not stated).
- **Original:** the field sizes to its content with `min-w-[160px]` (128px compact); a width comes from the caller's `className` (`combobox.tsx:518`; docs `w-[280px]` on the long list).
- **Port:** a fixed 280px default and no minimum (`src/components/combobox.tsx:98,113`).
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Empty-state text has a default

- **Cause:** `port choice` (reason not stated).
- **Original:** `ComboboxEmpty` shows its children and nothing when there are none; the docs always pass text (`combobox.tsx:1219-1239`).
- **Port:** `emptyText` defaults to "No results found." (`src/components/combobox.tsx:323`); the views demo shows it where the source says "No view matches." (`src/demos/combobox.tsx:179-187`).
- **Fidelity:** exact for the layout (`px-3 py-6`, centred, body text).
- **Components it hits:** just this one.

## Side, align and offset are fixed

- **Cause:** `not ported yet`.
- **Original:** `ComboboxContent` takes `side` (bottom), `align` (start) and `sideOffset` (6) (`combobox.tsx:773-782`).
- **Port:** `PopupSurface` is called with `align="start"` only, `side` defaults to bottom, gap 6 (`src/components/combobox.tsx:297-306`, `src/lib/popup.tsx:28,54`). No docs demo uses them (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md:633`).
- **Fidelity:** approximated.
- **Components it hits:** select (same popup).

## Not ported: multiple selection, chips, `hideSelected`

- **Cause:** `port choice` (single selection only, scoped out by plan; `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:567`).
- **Original:** `multiple` with `ComboboxChips` (springing field height, popping chips, Backspace removes the last, ArrowLeft walks the chips), merge/split selection blocks, `hideSelected` and `ComboboxEmpty allSelected` (`combobox.tsx:152-161,552-768,899-980`, `use-merge-split.ts`).
- **Port:** none.
- **Fidelity:** dropped.
- **Components it hits:** checkbox-group has the merge/split blocks.

## Not ported: `onCreate` and `createLabel`

- **Cause:** `port choice` (FF styling layer, not Base UI; lead decision, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:600`).
- **Original:** a last "Create “query”" row when no label matches exactly, with a plus icon (`combobox.tsx:75-86,168-169,226-232,258-284,1059-1073`).
- **Port:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Not ported: `variant` (bordered / borderless)

- **Cause:** `port choice` (FF styling layer, not Base UI; lead decision, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:601`).
- **Original:** `bordered` (ring at rest) or `borderless` (ring only on hover and focus) (`combobox.tsx:380-403`).
- **Port:** bordered only (`src/components/combobox.tsx:195-197`).
- **Fidelity:** dropped.
- **Components it hits:** input-group has its own ladder.

## Not ported: `error`

- **Cause:** `port choice` (FF styling layer, not Base UI; lead decision, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:601`).
- **Original:** a destructive-tinted ring (`ring-destructive/50`), `aria-invalid`, and a caption below the field in `text-destructive` with `pl-3` (`combobox.tsx:508-548`).
- **Port:** none; the root is a single 36px box with no caption slot.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Not ported: `size` (compact) and the ladder

- **Cause:** `port choice` (FF styling layer, not Base UI; lead decision, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:601`).
- **Original:** `size="compact"` or a surrounding `SizeProvider`: 28px field and rows, 12px text, 14px icons, `gap-1`, `px-2` / `px-1.5` (`combobox.tsx:488-530`, `size-context.tsx`).
- **Port:** the default step only (`FIELD_HEIGHT` / `ROW_HEIGHT` 36, `src/components/combobox.tsx:27-28`).
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo

Source page `app/docs/combobox/page.tsx`: Playground, Basic, With icons, Multiple selection, Create from the query, Hide picked rows, Variants, Long list, Error & disabled, API tables. Port `src/demos/combobox.tsx`: Playground and four cards.

- **Cause:** `port choice` (reason not stated) for the data and copy; `not ported yet` for sections that need a feature the combobox has but the demo does not show.
- **Present:** Playground, Basic, With icons (with `clearable`), Long list (25 timezones, globe icon, 280px, "Search timezones…", "No timezone matches."), Disabled. Extras with no source counterpart: external set button and value caption, prefix `filter`, a form with `name` / `required`.
- **Missing, port has no feature:** Multiple selection, Create from the query, Hide picked rows, Variants, Error (see the not-ported entries).
- **Missing, port could show it:** the doc prose and API tables.
- **Playground:** the single combobox over the 17 component names (280px, "Pick a component…", nothing picked), with Leading icon, Clear button and Disabled switches and a shuffle that also clears the pick. Left out, no API in the port: the Multiple, Create from query and Hide picked rows switches, the Variant select and the Error switch (and the multiple-only default of the source, which opens with two chips). No Code tab or "Get code" preset dialog. Hide picked rows is disabled unless Multiple is on in the source; here it is absent. The preview frame is the shared 420px `PlaygroundLayout` one, not the source's 360px with the field top-anchored in a 350px box.
- **Differs:**
  - Basic uses 12 string frameworks with "Solid" preselected and a search icon; the source has 7 `{ value, label }` items, nothing preselected, no icon (`:9-22,36,57`).
  - Basic placeholder is "Select framework…", the source's is "Select a framework…" (`:58`).
  - Views: Inbox, Starred, Recent, Café, Private (disabled), icons mail / star / clock; the source has Shared with me (users), Starred, Recent, Private (lock), Inbox, none disabled, and "Jump to view…" placeholder with a search icon (`:24-30,66-73`). The port's views field has no icon.
  - Disabled placeholder matches ("Disabled").
- **Fidelity:** approximated.
