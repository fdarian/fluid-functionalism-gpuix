# ask-user-questions

Original: `registry/default/ask-user-questions.tsx` (1,880 lines, on Base UI `RadioGroup` / `CheckboxGroup` / `Field`) and `app/docs/ask-user-questions/page.tsx` in the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/ask-user-questions.tsx`, demo in `src/demos/ask-user-questions.tsx`.

Checked and the same: card, row, chip and footer sizes and padding at the `sm:` step (`ask-user-questions.tsx:1219-1245`, `:1819-1849`; port `:1009-1027`, `:201-297`), all spring values, the height morph (`spring.slow`, `:1259-1264`; port `:80-84`, `:966-978`), controlled / uncontrolled state, answer shapes, roving tab stop, the Other and freeText states, and light and dark colours (all through `color.*`). The demo data (questions, options, copy, the email validator) is identical to the docs page.

## Footer neighbours jump instead of sliding

- **Cause:** `not ported yet` (gpuix has `layout`, `FORK.md:1149-1150`).
- **Original:** footer buttons sit in `AnimatePresence mode="popLayout" initial={false}` with `layout="position"`, so a leaving button fades and scales out while its neighbours slide at the same time (`:1425-1429`, `:1485-1489`).
- **Port:** the same `AnimatePresence mode="popLayout" initial={false}` around each cluster, a button entering and leaving on `scale` .85 and opacity (`ask-user-questions.tsx:1072`, `:1115`, `:1186-1198`); the submit arrow on .6, leaving on the 60 ms tween (`:154-200`, `:211-217`); the validation message rising from `y` -2 (`:1088-1094`). There is no `layout`, so the neighbours of a leaving button jump to its place at once.
- **Workaround:** none.
- **Fidelity:** approximated (sibling slide).
- **Components it hits:** just this one.

## Keyboard focus ring does not travel

- **Cause:** `not ported yet` (`src/lib/focus-ring.tsx` exists and select uses it).
- **Original:** one `motion.div` ring in `--focus-ring`, 2px outside the row (radius `shape.focusRing`, 10), springs between rows with `spring.fast` and fades in and out; it is never drawn on the Other row (`:932-963`, `:399-402`).
- **Port:** each row draws its own `focusVisible` outline at offset 2 (`ask-user-questions.tsx:300`), so the ring jumps from row to row and appears and disappears with no fade.
- **Workaround:** a per-row outline.
- **Fidelity:** approximated.
- **Components it hits:** just this one (accordion, tabs, checkbox, radio and select already travel).

## Selected backgrounds do not merge and split

- **Cause:** `not ported yet`.
- **Original:** `useMergeSplitBlocks` / `SelectionBackgrounds` give contiguous selected rows one block with stable run ids; bridging or splitting a run animates the boundary with the inner corners trailing by 70 ms (`:356-372`, `:930`; `registry/default/hooks/use-merge-split.tsx:13-24`).
- **Port:** one `FluidHighlight` per run, keyed by position in the list (`<Index>`), gliding on `tween.moderate` (`ask-user-questions.tsx:612-620`, `:711-722`). Joining two runs makes the second highlight fade out in place and the first jump to the union; the corners never animate.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** possibly checkbox-group (it merges contiguous checked rows; not checked here).

## Digit shortcuts are card-scoped, and the card is a tab stop

- **Cause:** `port choice` (reason not stated; the port routes all keys through one `onKeyDown` on the card).
- **Original:** `1`-`9` is a document-level listener that works with no focus in the card, answered by one instance chosen through `mountedInstances` (`:125-130`, `:174-221`). The root `<div>` is not focusable (`:1202-1223`).
- **Port:** the keys work only while focus is inside the card, and the card has `tabIndex={0}`, an extra Tab stop before the rows (`ask-user-questions.tsx:957`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** any component with a global shortcut.

## Keyboard focus restore across questions

- **Cause:** `port choice` (reason not stated).
- **Original:** when a keyboard-driven step changes the question, the new first row is focused in the same commit; a mouse step does not restore (`:394-424`).
- **Port:** the first row is focused 48 ms later (a synchronous focus from the effect leaves focus on nothing, checked), and `keyboardDriving` turns true on any keydown and false on mousedown (`ask-user-questions.tsx:480-494`, `:525`, `:948-956`).
- **Workaround:** a timer.
- **Fidelity:** approximated (a 48 ms gap).
- **Components it hits:** just this one.

## Arrow keys and Enter inside the Other field

- **Cause:** `not ported yet` for the caret test (gpuix has `selectionStart` / `selectionEnd`, `FORK.md:503`); `port choice` for the rest (reason not stated).
- **Original:** ↑/↓ leave the textarea only when the caret is at the very start or end (`:274-277`); plain Enter in a single-select Other field submits even with ⌘/⌃ held (`:1172-1177`); ↑ from no row goes to row `rowCount - 2` (`:316-318`).
- **Port:** ↑/↓ leave the textarea whenever the draft has no `\n`, so a long wrapped one-liner cannot be walked with ↑/↓ (`ask-user-questions.tsx:542-546`); ⌘/⌃+Enter does nothing there (`:526-527`, `:448-450`); ↑ from no row goes to the last row (`base-ui:src/internals/composite/composite.ts:26`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Other row aligns to the first line only on a newline

- **Cause:** `not ported yet`.
- **Original:** `isOtherMultiline` is `scrollHeight > 1.5 * lineHeight`, so a wrapped line counts (`:328-342`).
- **Port:** `otherText().includes("\n")` (`ask-user-questions.tsx:824`), so a draft that wraps without a newline leaves the chip centred on the tall row.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Validation error: no motion, no semantics

- **Cause:** `not ported yet` (the `Field` wiring is Base UI; the rest could be built).
- **Original:** `Field.Error` renders `motion.p role="alert"`, rising from `y: -2` with a 120 ms opacity, padded `px-2 sm:px-3`, and its id lands in the textarea's `aria-describedby` and `aria-invalid` (`:1253`, `:1463-1482`).
- **Port:** a plain `<text>` with `paddingLeft` 12, no `role`, no association with the field (`ask-user-questions.tsx:1063-1075`).
- **Workaround:** none.
- **Fidelity:** approximated (visual); dropped (semantics).
- **Components it hits:** just this one.

## Group semantics and Base UI plumbing

- **Cause:** `port choice` (Base UI has no gpuix counterpart; the selection plumbing is signals).
- **Original:** rows sit in `RadioGroup` / `CheckboxGroup` with hidden `Radio` / `Checkbox` controls, `aria-labelledby` on the group, an `h3` title, and `aria-label` on the Other row (`:432-436`, `:1020-1041`, `:1278-1284`).
- **Port:** `role` and `aria-checked` on the rows and a `radiogroup` / `group` role on the container (`ask-user-questions.tsx:665`, `:274-275`); no `aria-labelledby`, no heading, no hidden form controls (no `name` / `value` in a form).
- **Workaround:** none.
- **Fidelity:** approximated (screen-reader and form behaviour dropped).
- **Components it hits:** checkbox-group, radio-group.

## Size ladder, `className`, `ref`

- **Cause:** `not ported yet` (README: "Not ported there: ... the Radius / Size ... rows").
- **Original:** `size` prop and `SizeProvider` give a compact step (rows `min-h-8`, chip 18/24, 11px header, `px-3.5`); `className` and the rest of the `div` props, and a `ref`, land on the card (`:107-110`, `:1229-1235`, `:1832-1838`).
- **Port:** one step; props are `testId` and `autoFocus` beside the source's flow props (`ask-user-questions.tsx:326-340`).
- **Workaround:** none.
- **Fidelity:** dropped (compact).
- **Components it hits:** every component with a `size` variant.

## Responsive and touch styling

- **Cause:** `gpuix gap` for touch (`(hover: none)` / `pointer-coarse` never match; see `drift/queued-stack.md`); `not ported yet` for the `sm:` breakpoint (gpuix has `matchMedia`).
- **Original:** below 640px the card pads 16 not 20, Back and Skip drop their arrows, Continue drops its ⌘↵ chip (`hidden sm:contents`), and the textarea gets `pointer-coarse:py-px -my-px` (`:1180-1193`, `:1226-1236`, `:1447`, `:1549`).
- **Port:** the ≥`sm` values only (`ask-user-questions.tsx:955-963`, `:1035-1112`).
- **Workaround:** none; desktop only.
- **Fidelity:** dropped.
- **Components it hits:** any touch-aware component.

## Shortcut chip and footer buttons

- **Cause:** `not ported yet` (small details).
- **Original:** the chip is `font-sans`, `leading-none`, and "⌘" and "↵" are two children with `gap-0.5` (`:1593-1604`, `:1551-1552`). Back, Skip and Continue are `Button size="sm"` with trimmed icon-side padding via `className` (`:1440-1450`, `:1524-1541`).
- **Port:** one string "⌘↵", no 2px gap, `lineHeight: 11` (`ask-user-questions.tsx:98-122`); `size="compact"`, which is the source's `sm` alias, with the Button's own icon padding (`:1046-1107`; `src/components/button.tsx:39-46`, `:203-208`).
- **Workaround:** `marginLeft: 2` to stand in for the label gap.
- **Fidelity:** approximated (about a pixel).
- **Components it hits:** just this one.

## freeText autofocus is optional

- **Cause:** `port choice` (the demo page holds several flows; one stealing focus on load would be wrong).
- **Original:** a freeText question always takes focus when it appears, with `preventScroll` (`:349-354`).
- **Port:** same, but `autoFocus={false}` turns it off for the first question, and the demo sets it (`ask-user-questions.tsx:338`, `:908`; `src/demos/ask-user-questions.tsx:969`, `:1028`). No `preventScroll`.
- **Workaround:** n/a.
- **Fidelity:** exact by default.
- **Components it hits:** just this one.

## Demo page

- **Cause:** `not ported yet` (Playground Code tab and Get code, API tables, code tabs) + `port choice` (Replay button, centred card, Controlled readout; reason not stated). Itemised under Port.
- **Original:** `page.tsx:1182-1309`: Playground, then Multiple questions, Multi-select, With other, Free text, Free text validation, Skippable, Chip on left, Stacked layout and Controlled, each in a `min-h-[560px]` preview aligned to the bottom with a corner Replay icon; the Controlled example has no readout; then four API Reference tables.
- **Port:** the Playground and the same nine examples in the same order (`src/demos/ask-user-questions.tsx`, `Playground` and `Demo`).
  - Playground ported with every control, default, the shuffle, the question data and the bottom-anchored 420px stage (min height 560); a control change or Replay remounts the flow from question 1.
  - `not ported yet`: the Playground's synced Code tab, the `?preset=` URL sync and the "Get code" install dialog (preset codec, docs chrome), and the API tables and code tabs.
  - `port choice` (reason not stated): the playground's Replay is the same ghost "Replay" button above the card, not a corner icon (see below).
  - `port choice` (reason not stated): Replay is a ghost "Replay" button above the card (`:931-978`), not a corner icon with a tooltip.
  - `port choice` (reason not stated): the card is centred with no `min-h-[560px]` bottom alignment, so the page height changes as a flow changes.
  - `port choice` (reason not stated): the Controlled example adds a `currentIndex` / `answers` readout (`:980-1043`).
- **Fidelity:** approximated.
- **Components it hits:** every demo page.
