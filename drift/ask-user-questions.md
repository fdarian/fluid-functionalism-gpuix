# ask-user-questions

Original: `registry/default/ask-user-questions.tsx` (1,880 lines, on Base UI `RadioGroup` / `CheckboxGroup` / `Field`) and `app/docs/ask-user-questions/page.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/ask-user-questions.tsx`, demo in `src/demos/ask-user-questions.tsx`.

Checked and the same: card, row, chip and footer sizes and padding at the `sm:` step (`ask-user-questions.tsx:1214-1240`, `:1819-1849`; port `:1083-1095`, `:255-283`), all spring values, the height morph (`spring.slow`, `:1259-1264`; port `:913-924`), controlled / uncontrolled state, answer shapes, roving tab stop, the Other and freeText states, and light and dark colours (all through `color.*`). The demo data (questions, options, copy, the email validator) is identical to the docs page.

## CSS transforms (scale-ins)

- **Cause:** `gpuix gap`. Shared: CSS transforms ([README, Missing features, first row](../README.md)).
- **Original:** each footer button enters and exits at `scale: .85` (`:1430-1432`, `:1490-1492`, `:1516-1518`); the single-select submit arrow overlay is `scale: .6` in and out (`:1700-1706`); the validation message rises from `y: -2` (`:1470-1471`).
- **Port:** footer buttons fade only (`FadeIn`, `ask-user-questions.tsx:1061-1071`); the arrow overlay fades over 80 ms (`:151-154`); the error has no entrance (`:997-1009`).
- **gpuix lacks:** `scale` (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** opacity only.
- **Fidelity:** approximated (no scale).
- **Components it hits:** banner, chat-message, input-copy, input-message, queued-stack, radio-group.

## Exits and sibling motion are missing

- **Cause:** `not ported yet` (gpuix has `AnimatePresence` with `mode="popLayout"` and `layout`, `FORK.md:827`).
- **Original:** footer buttons sit in `AnimatePresence mode="popLayout" initial={false}` with `layout="position"`, so a leaving button fades out while its neighbours slide at the same time and nothing animates on first mount (`:1425-1429`, `:1485-1489`). The submit arrow also fades out on exit with `spring.fast.exit` (`:1702-1706`).
- **Port:** a `Show` removes the button at once, and the others jump. `FadeIn` runs on every mount, including the first paint, which the source skips (`ask-user-questions.tsx:954-1054`, `:1061-1071`). The arrow overlay is unmounted when `showArrow` goes false (`:150`).
- **Workaround:** none.
- **Fidelity:** dropped (exits, sibling slide); approximated (first-mount fade).
- **Components it hits:** just this one.

## Chip fade has no transition

- **Cause:** `not ported yet`.
- **Original:** the chip is `transition-[opacity,font-variation-settings] duration-80`, so it fades out as the arrow overlay fades in (`:1742`).
- **Port:** `opacity` flips between 1 and 0 with no transition (`ask-user-questions.tsx:211`).
- **Workaround:** none.
- **Fidelity:** approximated (switches at once).
- **Components it hits:** just this one.

## Static font weights

- **Cause:** `gpuix gap`. Shared: variable-font axes ([README, Missing features, variable-font row](../README.md)).
- **Original:** option titles (through the ghost-span trick), the chip number, the heading and the textareas use `fontVariationSettings` 400 / 550, eased over 80 ms (`:1054-1058`, `:1742-1761`, `:1281`).
- **Port:** `StableLabel` and `weight.semibold` (600), switched at once (`ask-user-questions.tsx:712-716`, `:220-223`, `:939`).
- **Fidelity:** approximated.
- **Components it hits:** card, table, tabs, tabs-subtle, sidebar.

## Keyboard focus ring does not travel

- **Cause:** `not ported yet` (`src/lib/focus-ring.tsx` exists and select uses it).
- **Original:** one `motion.div` ring in `--focus-ring`, 2px outside the row (radius `shape.focusRing`, 10), springs between rows with `spring.fast` and fades in and out; it is never drawn on the Other row (`:932-963`, `:399-402`).
- **Port:** each row draws its own `focusVisible` outline at offset 2 (`ask-user-questions.tsx:282`), so the ring jumps from row to row and appears and disappears with no fade.
- **Workaround:** a per-row outline.
- **Fidelity:** approximated.
- **Components it hits:** just this one (accordion, tabs, checkbox, radio and select already travel).

## Selected backgrounds do not merge and split

- **Cause:** `not ported yet`.
- **Original:** `useMergeSplitBlocks` / `SelectionBackgrounds` give contiguous selected rows one block with stable run ids; bridging or splitting a run animates the boundary with the inner corners trailing by 70 ms (`:356-372`, `:930`; `registry/default/hooks/use-merge-split.tsx:13-24`).
- **Port:** one `FluidHighlight` per run, keyed by position in the list (`<Index>`), gliding on `tween.moderate` (`ask-user-questions.tsx:575-583`, `:667-678`). Joining two runs makes the second highlight fade out in place and the first jump to the union; the corners never animate.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** possibly checkbox-group (it merges contiguous checked rows; not checked here).

## Other-row hint grows from the corner (bug)

- **Cause:** `not ported yet`.
- **Original:** the "type here" outline mounts under `AnimatePresence` at the Other row's rect and only fades (`:478-914`).
- **Port:** it is always mounted and, when hidden, animates `top`, `left`, `width` and `height` to 0 (`ask-user-questions.tsx:640-659`). Showing it again grows it from the card's top-left corner while it fades in over 80 ms.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Row highlight stays after focus leaves the group (probable bug)

- **Cause:** `not ported yet`.
- **Original:** the rows container clears both `activeIndex` and `focusedIndex` when focus leaves the whole group (`:461-469`).
- **Port:** a row's `onBlur` clears `focusedRow` only (`ask-user-questions.tsx:701-703`, `:745-749`); `hover.activeIndex` is cleared by `onMouseLeave` and a question change alone (`src/lib/fluid-hover.ts:207-210`), so tabbing out of the rows should leave the last row lit. Read from code, not run.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Digit shortcuts are card-scoped, and the card is a tab stop

- **Cause:** `port choice` (reason not stated; the port routes all keys through one `onKeyDown` on the card).
- **Original:** `1`-`9` is a document-level listener that works with no focus in the card, answered by one instance chosen through `mountedInstances` (`:125-130`, `:174-221`). The root `<div>` is not focusable (`:1202-1223`).
- **Port:** the keys work only while focus is inside the card, and the card has `tabIndex={0}`, an extra Tab stop before the rows (`ask-user-questions.tsx:892-893`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** any component with a global shortcut.

## Keyboard focus restore across questions

- **Cause:** `port choice` (reason not stated).
- **Original:** when a keyboard-driven step changes the question, the new first row is focused in the same commit; a mouse step does not restore (`:394-424`).
- **Port:** the first row is focused 48 ms later, and `keyboardDriving` turns true on any keydown and false on mousedown (`ask-user-questions.tsx:462-475`, `:496`, `:894-896`).
- **Workaround:** a timer.
- **Fidelity:** approximated (a 48 ms gap).
- **Components it hits:** just this one.

## Arrow keys and Enter inside the Other field

- **Cause:** `not ported yet` for the caret test (gpuix has `selectionStart` / `selectionEnd`, `FORK.md:451`); `port choice` for the rest (reason not stated).
- **Original:** ↑/↓ leave the textarea only when the caret is at the very start or end (`:274-277`); plain Enter in a single-select Other field submits even with ⌘/⌃ held (`:1172-1177`); ↑ from no row goes to row `rowCount - 2` (`:316-318`).
- **Port:** ↑/↓ leave the textarea whenever the draft has no `\n`, so a long wrapped one-liner cannot be walked with ↑/↓ (`ask-user-questions.tsx:508-514`); ⌘/⌃+Enter does nothing there (`:434-436`, `:497-499`); ↑ from no row goes to the last row (`src/lib/list-nav.ts:22`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Other row aligns to the first line only on a newline

- **Cause:** `not ported yet`.
- **Original:** `isOtherMultiline` is `scrollHeight > 1.5 * lineHeight`, so a wrapped line counts (`:328-342`).
- **Port:** `otherText().includes("\n")` (`ask-user-questions.tsx:765`), so a draft that wraps without a newline leaves the chip centred on the tall row.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Inline description does not flow with the title

- **Cause:** `port choice` (reason not stated; `StableLabel` is a box, not an inline span).
- **Original:** the inline layout is one `<span>` of title, a space and the description, so a long description wraps on from the title's line (`:1076-1104`).
- **Port:** a wrapping flex row with a 4px column gap; a description wider than the room left on the title's line drops whole to the next line (`ask-user-questions.tsx:286-300`, `:712-726`).
- **Workaround:** none.
- **Fidelity:** approximated (only for long descriptions).
- **Components it hits:** none other.

## Validation error: no motion, no semantics

- **Cause:** `not ported yet` (the `Field` wiring is Base UI; the rest could be built).
- **Original:** `Field.Error` renders `motion.p role="alert"`, rising from `y: -2` with a 120 ms opacity, padded `px-2 sm:px-3`, and its id lands in the textarea's `aria-describedby` and `aria-invalid` (`:1253`, `:1463-1482`).
- **Port:** a plain `<text>` with `paddingLeft` 12, no `role`, no association with the field (`ask-user-questions.tsx:997-1009`).
- **Workaround:** none.
- **Fidelity:** approximated (visual); dropped (semantics).
- **Components it hits:** just this one.

## Group semantics and Base UI plumbing

- **Cause:** `port choice` (Base UI has no gpuix counterpart; the selection plumbing is signals).
- **Original:** rows sit in `RadioGroup` / `CheckboxGroup` with hidden `Radio` / `Checkbox` controls, `aria-labelledby` on the group, an `h3` title, and `aria-label` on the Other row (`:432-436`, `:1020-1041`, `:1278-1284`).
- **Port:** `role` and `aria-checked` on the rows and a `radiogroup` / `group` role on the container (`ask-user-questions.tsx:629`, `:261-262`); no `aria-labelledby`, no heading, no hidden form controls (no `name` / `value` in a form).
- **Workaround:** none.
- **Fidelity:** approximated (screen-reader and form behaviour dropped).
- **Components it hits:** checkbox-group, radio-group.

## Size ladder, `className`, `ref`

- **Cause:** `not ported yet` (README: "Not ported there: ... the Radius / Size ... rows").
- **Original:** `size` prop and `SizeProvider` give a compact step (rows `min-h-8`, chip 18/24, 11px header, `px-3.5`); `className` and the rest of the `div` props, and a `ref`, land on the card (`:107-110`, `:1229-1235`, `:1832-1838`).
- **Port:** one step; props are `testId` and `autoFocus` beside the source's flow props (`ask-user-questions.tsx:309-323`). Pill shape (`shape.bg`, `shape.container`, `shape.focusRing`) is not ported either; the radii are fixed at 8 / 12.
- **Workaround:** none.
- **Fidelity:** dropped (compact, pill).
- **Components it hits:** every component with a `size` or shape variant.

## Responsive and touch styling

- **Cause:** `gpuix gap` for touch (`(hover: none)` / `pointer-coarse` never match; see `drift/queued-stack.md`); `not ported yet` for the `sm:` breakpoint (gpuix has `matchMedia`).
- **Original:** below 640px the card pads 16 not 20, Back and Skip drop their arrows, Continue drops its ⌘↵ chip (`hidden sm:contents`), and the textarea gets `pointer-coarse:py-px -my-px` (`:1180-1193`, `:1226-1236`, `:1447`, `:1549`).
- **Port:** the ≥`sm` values only (`ask-user-questions.tsx:900-910`, `:984-1049`).
- **Workaround:** none; desktop only.
- **Fidelity:** dropped.
- **Components it hits:** any touch-aware component.

## Shortcut chip and footer buttons

- **Cause:** `not ported yet` (small details).
- **Original:** the chip is `shape.bg` radius, `font-sans`, `leading-none`, and "⌘" and "↵" are two children with `gap-0.5` (`:1593-1604`, `:1551-1552`). Back, Skip and Continue are `Button size="sm"` with trimmed icon-side padding via `className` (`:1440-1450`, `:1524-1541`).
- **Port:** one string "⌘↵", no 2px gap, `lineHeight: 11`, radius `radius.item` (`ask-user-questions.tsx:91-112`); `size="compact"`, which is the source's `sm` alias, with the Button's own icon padding (`:986-1048`; `src/components/button.tsx:26-31`).
- **Workaround:** `marginLeft: 2` to stand in for the label gap.
- **Fidelity:** approximated (about a pixel).
- **Components it hits:** just this one.

## freeText and Other field colour changes are instant

- **Cause:** `not ported yet`.
- **Original:** the freeText box is `transition-colors`, so its fill eases between rest, hover, focus and filled (`:1307`).
- **Port:** the background switches at once (`ask-user-questions.tsx:832-846`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## freeText autofocus is optional

- **Cause:** `port choice` (the demo page holds several flows; one stealing focus on load would be wrong).
- **Original:** a freeText question always takes focus when it appears, with `preventScroll` (`:349-354`).
- **Port:** same, but `autoFocus={false}` turns it off for the first question, and the demo sets it (`ask-user-questions.tsx:320`, `:854`; `src/demos/ask-user-questions.tsx:642`, `:701`). No `preventScroll`.
- **Workaround:** n/a.
- **Fidelity:** exact by default.
- **Components it hits:** just this one.

## Demo page

- **Cause:** mixed.
- **Original:** `page.tsx:1182-1309`: Playground, then Multiple questions, Multi-select, With other, Free text, Free text validation, Skippable, Chip on left, Stacked layout and Controlled, each in a `min-h-[560px]` preview aligned to the bottom with a corner Replay icon; the Controlled example has no readout; then four API Reference tables.
- **Port:** the same nine examples in the same order (`src/demos/ask-user-questions.tsx:718-760`).
  - `not ported yet`: the Playground (live controls with synced code) and the API tables and code tabs (docs chrome).
  - `port choice` (reason not stated): Replay is a ghost "Replay" button above the card (`:605-650`), not a corner icon with a tooltip.
  - `port choice` (reason not stated): the card is centred with no `min-h-[560px]` bottom alignment, so the page height changes as a flow changes.
  - `port choice` (reason not stated): the Controlled example adds a `currentIndex` / `answers` readout (`:653-714`).
- **Fidelity:** approximated.
- **Components it hits:** every demo page.
