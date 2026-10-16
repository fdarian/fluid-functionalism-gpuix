# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine: range, step lists, value display; and the default-step pips and scrubber rows), demos in `app/docs/slider/page.tsx` of the source (the Audio Mixer page, `app/slider/page.tsx`, is `src/pages/audio-mixer.tsx`, see [`audio-mixer.md`](audio-mixer.md))
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/slider.tsx`,
demo in `src/demos/slider.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## No `<input type="range">`

- **Cause:** `gpuix gap`.
- **Original:** Base UI renders a visually hidden `<input type="range">` in each thumb, which gives the platform slider semantics, keyboard handling and a form value (`slider.tsx:1052-1075`, `:1649-1657`).
- **Port:** each thumb is a `role="slider"` div with `tabIndex`, `aria-valuenow` / `-min` / `-max` / `-orientation` / `-disabled` and an `aria-valuetext` where Base UI sets one (`src/components/slider.tsx:826-856`); the default row has a 1px hidden thumb that carries the same (`:1575-1601`). `onKeyDown` does Arrow (Shift for `largeStep`), Home, End and Page with Base UI's step maths (`:664-718`, `:1248-1290`). There is no `name` prop and no form value.
- **gpuix lacks:** the input type. `InputType` is `"text" | "password" | "number" | "email" | "search" | "tel" | "url"` (`packages/native/js/host.ts:1175`).
- **Workaround:** the slider div described above.
- **Fidelity:** approximated: exact for pointer and keyboard users and the accessibility tree, absent from forms.
- **Components it hits:** none other.

## Thumbs, fill and bubbles move on `left` / `width` / `top`, not transforms

- **Cause:** `gpuix gap`. See the CSS transforms row in [`README.md`](../README.md#missing-features).
- **Original:** the thumb's x (`slider.tsx:919`), the bubbles' x and `y: 4 -> 0` (`:362-369`, `:1109-1113`) are transforms.
- **Port:** the thumb's `left` is a motion value (`src/components/slider.tsx:845`), bubbles animate `top` (`:213-216`); every frame re-lays out.
- **Workaround:** motion values and `motion.div` on layout props.
- **Fidelity:** exact for what is seen.
- **Components it hits:** every spring FF runs on a transform.

## Motion writes are queued in a microtask

- **Cause:** `port choice` (written when gpuix threw on these calls; the fork now defers them, so the queue looks unnecessary, not re-tested).
- **Original:** `animate(motionX, px, spring.moderate)` and `motionX.set(px)` run straight from the pointer and key handlers (`slider.tsx:722`, `:778`, `:1475-1476`).
- **Port:** `createMotionWrites` (`src/components/slider.tsx:158-168`) queues every `animate` / `jump` in a microtask, one microtask after the event, before the next frame. Its comment and the README bug row say gpuix refuses these writes inside a press, release or key handler. The fork's `write_motion_values` (`packages/native/src/renderer.rs:1389-1412`, `packages/native/src/test_renderer.rs:1825`) and FORK.md:361-363 say a motion-value write made inside such a handler is deferred until the input returns. Reads (`get()`) were not checked.
- **Workaround:** the microtask queue.
- **Fidelity:** exact for what is seen.
- **Components it hits:** none other (the switch avoids motion values altogether).

## Derived layers trail their inputs by a frame, and the comfortable row is built in pixels

- **Cause:** `gpuix gap`.
- **Original:** the fill, handle, pips fill and masks are `useTransform` strings such as `calc(p * 100% + 20px - ...)` that mix a percentage with pixels (`slider.tsx:493-501`, `:1342-1376`), evaluated by the browser against the row's live width.
- **Port:** a range fill's `second - first` (`src/components/slider.tsx:794-797`) and every comfortable layer (`:1316-1330`) are `createTransform` functions that multiply by a measured `widthValue` (`:1297`, written from `onLayout`). Function-form transforms are computed in JS and run one frame behind their inputs (FORK.md:915-917, README bugs table), and a resize reaches the layers a frame after layout. The fill and handle line of the comfortable row are not rendered until the first `onLayout` (`:1483`), so they appear one frame after the row. The single compact fill is a range-form transform of the thumb's x (`:788-793`) and does not trail.
- **gpuix lacks:** a motion value that mixes `%` and `px` (motion values hold numbers, colours, lists or shadows: README "Motion values"), and a function-form transform that is not one frame late.
- **Workaround:** pixel maths from the measured width.
- **Fidelity:** approximated: a very fast drag can show a range fill or a pips fill one frame behind its thumb or handle.
- **Components it hits:** none other.

## Step dots and pips are hidden per item, not by a mask that follows the thumb

- **Cause:** `gpuix gap`. gpuix has `maskImage` (`packages/native/js/host.ts:571`), but a gradient string cannot be a motion value, so the mask cannot follow a spring.
- **Original:** compact step dots and the pips layer sit under `mask-image: linear-gradient(...)` driven by the thumb's or fill's motion value, a 2px feather that hides each dot as the edge passes it (`slider.tsx:507-522`, `:1194`; `:1370-1376`, `:1683`).
- **Port:** each dot is its own `motion.div` whose opacity goes to 0 when it is at or under the value (`dotHidden`, `src/components/slider.tsx:760-763`, `:1014`) and each pip's opacity drops when `pip <= value` (`:1409-1421`). At rest it looks the same. While a press springs the thumb, every passed dot fades together over the spring instead of one by one as the edge reaches it.
- **Workaround:** per-item opacity.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Pip colour and opacity do not ease

- **Cause:** `not ported yet`.
- **Original:** each pip is a `motion.div` animating `backgroundColor` (foreground active, muted otherwise) and `opacity` (1 / 0.3) on `spring.fast` (`slider.tsx:1695-1704`).
- **Port:** plain `div` with the values set at once (`src/components/slider.tsx:1413-1423`).
- **Workaround:** none.
- **Fidelity:** dropped (the active pip changes immediately).
- **Components it hits:** none other.

## Label, value and handle-line colours do not ease; the focus rings do not fade

- **Cause:** `not ported yet` (gpuix animates colours and `outlineColor`, FORK.md:815).
- **Original:** label and value go muted -> foreground on `spring.fast` (`slider.tsx:1773`, `:1784`, `:1833`, `:1847`); the handle line's colour steps 25% -> 50% -> 100% foreground on `spring.fast` (`:1749-1758`, `:1811-1820`); the row's focus outline animates in (`:1623-1626`); the compact thumb's focus ring animates `opacity` on `spring.fast` (`:944-953`).
- **Port:** plain `<text>` and `backgroundColor` bound to `isActive()` / `lineColor()` (`src/components/slider.tsx:1331-1336`, `:1509`, `:1528`, `:1544`); the row outline is `outlineWidth` 0 or 1 (`:1385-1387`) and the thumb's ring is `focusVisible: focusRing(1)` (`:855`). The thumb ring's geometry matches the source's 24px circle (outline 1px at offset 1 around the 20px box).
- **Workaround:** none.
- **Fidelity:** dropped (hover, focus and blur snap).
- **Components it hits:** none other.

## Value label weight shifts at once, and digits are not tabular

- **Cause:** `gpuix gap` for the weight (see the variable-font row in [`README.md`](../README.md#missing-features)); `not ported yet` for `tabular-nums`.
- **Original:** the compact value label goes normal -> semibold (`wght` 550) over 100 ms on hover or press (`slider.tsx:302-316`), and `tabular-nums` is on the label (`:309`), both bubbles (`:373`, `:1120`, `:1600`) and the default row's values (`:1722`, `:1782`, `:1845`).
- **Port:** the weight switches at once, SemiBold 600 for 550 (`src/components/slider.tsx:331-336`). No `fontVariantNumeric` is set anywhere in `src/`, although gpuix has it (`packages/native/js/host.ts:640`), so digits take their proportional widths and a changing number can shift by a pixel inside its reserved box.
- **Workaround:** a hidden copy at the heaviest weight reserves the width (`:426`).
- **Fidelity:** approximated (weight), dropped (tabular digits).
- **Components it hits:** the weight: every `StableLabel`. Tabular digits: any FF number readout (the port has no `fontVariantNumeric` anywhere).

## Click-to-edit differs: no select-all, no number field, no accessible name

- **Cause:** `not ported yet`. gpuix has `select()` on inputs, `type="number"` and number `min` / `max` / `step` (FORK.md:451, `packages/native/js/host.ts:1175`).
- **Original:** the field is `type="number"` with `min`, `max` and `step` (`step="any"` for a `steps` list), focused and selected on the next frame so typing replaces the number, `aria-label="Edit slider value (start)"` for a range (`slider.tsx:209-213`, `:258-271`), a `5ch` wide box with line height 20 and a 1px bottom border (`:255-279`).
- **Port:** a text `<input autoFocus>` (`src/components/slider.tsx:377-418`) with the caret at the end and nothing selected, so typing appends (the scenario backspaces first, `src/demos/slider.tsx:357`); no min / max / step on the field, no `aria-label`; 40 x 18 with the same bottom border. The seed, Enter / blur commit, Escape cancel, clamp and snap match (`:313-325`).
- **Workaround:** none.
- **Fidelity:** approximated (behaviour differs on the first keystroke; the field is about 2px shorter).
- **Components it hits:** none other.

## Public props not ported

- **Cause:** `not ported yet`.
- **Original:** `hideFill`, `thumbColor`, `thumbBorderColor`, `trackClassName` / `trackStyle`, `fillClassName` / `fillStyle` (`slider.tsx:78-84`, applied at `:1134-1157`, `:935-937`), any of which forces the compact engine (`:1903-1915`); `className`, `ref` and HTML props land on the root (`:959-970`) or the comfortable row (`:1631`).
- **Port:** `CompactProps` and `variant` / `size` only, plus a harness `testId` (`src/components/slider.tsx:464-478`, `:1627-1632`); `needsCompact` checks `size`, an array value, `steps`, `showSteps`, `showValue`, `valuePosition` (`:1636-1642`). The knob is always `#FFFFFF` (`:863`), the fill `selectedWash`, with no way to override either.
- **Workaround:** none. Also in `BASE-UI-AUDIT.md` (Slider, last bullet).
- **Fidelity:** dropped.
- **Components it hits:** every ported component.

## Value bubbles are anchored overlays

- **Cause:** `port choice` (reason not stated; the offsets were not measured against the DOM).
- **Original:** an absolutely positioned `motion.div` at fixed `top` offsets (`-20` compact hover, `-16` thumb bubble, `-30` default row, `slider.tsx:1116`, `:365`, `:1596`), centred with `-translate-x-1/2`, radius `shape.bg` (`:373`).
- **Port:** a `ValueBubble` (`src/components/slider.tsx:191-241`) in an `<anchored side="top" align="center" fit="snap" deferred>` with `gap` 8 above a thumb or 0 above a zero-size marker at 4px (compact, `:1034-1049`) or -6px (default, `:1604-1618`); radius `shape.bg`. The anchor keeps the bubble inside the window, which the DOM bubble does not. The marker offsets reproduce the DOM's bubble bottom if the bubble is 24px tall.
- **Workaround:** none.
- **Fidelity:** approximated (placement unverified to the pixel).
- **Components it hits:** none other.

## `onChange` fires only when the value changes

- **Cause:** `port choice` (the audit row "Emits only on change", `BASE-UI-AUDIT.md`).
- **Original:** every pointer move and press calls `onChange` with the snapped value, changed or not (`slider.tsx:735`, `:788`, `:1473`).
- **Port:** `emitChange` returns when `next === values()[thumb]` (`src/components/slider.tsx:525-534`); the comfortable `emit` does the same (`:1176-1178`).
- **Workaround:** none.
- **Fidelity:** approximated (the same sequence of distinct values; fewer calls).
- **Components it hits:** none other.

## A drag takes the thumb at once; the source's press spring keeps running

- **Cause:** `port choice` (reason not stated). Unverified against the DOM: `MotionValue.set` does not stop a running animation in Motion, as in gpuix (README "Motion values"), which is what the source relies on.
- **Original:** a press springs the thumb to the snapped spot (`slider.tsx:722`) and drag moves call `motionX.set(finalPx)` (`:778`). A move that arrives while the 160 ms spring is running is overwritten by the spring each frame, so a press-and-drag within that time eases to the press point first.
- **Port:** the first move turns `moving()` on and the effect `jump`s the thumb to the cursor's value (`src/components/slider.tsx:628-637`, `:771-785`), stopping the spring.
- **Workaround:** none.
- **Fidelity:** approximated (the port follows the cursor from the first move).
- **Components it hits:** none other.

## Default row: the label and value blocks are the card colour, sized by the max

- **Cause:** `port choice` (reason not stated; `surface2` is the demo card's colour).
- **Original:** the blocks that keep pips off the words are `bg-background` (`slider.tsx:1717`, `:1722`), and the value block is `minWidth` of `formatValue(max).length` ch around the current text (`:1721-1726`), so it grows with a longer value.
- **Port:** `color.surface2` (`src/components/slider.tsx:1450`, `:1460`), correct on the demo card and wrong on any other surface; the value block holds `formatValue(max())` rather than the current text (`:1464-1466`), so a current value wider than the max's (a "Medium" against "Ultra") is wider than its block and a pip can show beside it.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Default row at `disabled`: the blocks go translucent and a pip shows through

- **Cause:** `gpuix gap` (unconfirmed: this is from the test-renderer capture, `screenshots/slider/default.png`, Disabled row; check in the live window). The code applies `opacity: 0.5` to the wrapper (`src/components/slider.tsx:1348`), and the capture looks as if opacity is applied per layer instead of to the subtree, which README lists as "group opacity" in its effect-groups row.
- **Original:** `opacity-50` on the row (`slider.tsx:1619`) dims the finished row as one image, so the opaque `bg-background` blocks still hide the pips.
- **Port:** the surface blocks are dimmed too, so the last pip is visible next to the value (a dot beside the "2").
- **Workaround:** none.
- **Fidelity:** approximated (cosmetic; disabled rows only). A bug, not a deliberate difference.
- **Components it hits:** any component that dims a subtree that relies on opaque blocks (none found).

## Demo: variants, extras and missing chrome

- **Cause:** `port choice` for the extra rows (they drive the screenshot scenarios and the resize check) and the split Steps row; `not ported yet` for the missing chrome.
- **Original:** `app/docs/slider/page.tsx:246-419`: Compact, Range, Steps (25 and 10 together), Non-uniform, Value Display (left, right, tooltip, `gap-6`), Format, Disabled, then Default, Default - Scrubber, Default - Format, Default - Disabled, each in a `w-72` well with a code toggle, plus an API Reference table (`:126-213`, `:421`) and the description "One slider, two ladder steps ..." (`:240`).
- **Port:** `src/demos/slider.tsx:45-257` has every one of those variants with the same values and copy (Compact, Range, Steps 25, Steps 10, Non-uniform, Left, Right, Tooltip, Format, Disabled, Pips, Scrubber, Format, Disabled), in three cards ("Slider: compact", "value display", "default"), Steps split into two rows and the value-display gap 8. Extras not in the source page: Decimal (step 0.1), and a Resize row in each of the compact and default cards (`:84-107`, `:215-227`). No code toggle, props table or description.
- **Workaround:** none.
- **Fidelity:** all source variants present; extras and chrome as above.
- **Components it hits:** every demo page.
