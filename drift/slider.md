# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine: range, step lists, value display; and the default-step pips and scrubber rows), demos in `app/docs/slider/page.tsx` of the source (the Audio Mixer page, `app/slider/page.tsx`, is `src/pages/audio-mixer.tsx`, see [`audio-mixer.md`](audio-mixer.md))
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/slider.tsx`,
demo in `src/demos/slider.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## No `<input type="range">`

- **Cause:** `gpuix gap`.
- **Original:** Base UI renders a visually hidden `<input type="range">` in each thumb, which gives the platform slider semantics, keyboard handling and a form value (`slider.tsx:1058-1081`, `:1649-1657`).
- **Port:** each thumb is a `role="slider"` div with `tabIndex`, `aria-valuenow` / `-min` / `-max` / `-orientation` / `-disabled` and an `aria-valuetext` where Base UI sets one (`base-ui:src/slider/thumb/slider-thumb.ts:113-162`); the default row has a 1px hidden thumb that carries the same (`src/components/slider.tsx:1284-1301`). `onKeyDown` does Arrow (Shift for `largeStep`), Home, End and Page with Base UI's step maths (`base-ui:src/slider/thumb/slider-thumb.ts:52-111`). There is no `name` prop and no form value.
- **gpuix lacks:** the input type. `InputType` is `"text" | "password" | "number" | "email" | "search" | "tel" | "url"` (`packages/native/js/host.ts:1336`).
- **Workaround:** the slider div described above.
- **Fidelity:** approximated: exact for pointer and keyboard users and the accessibility tree, absent from forms.
- **Components it hits:** none other.

## Thumbs, fill and bubbles move on `left` / `width` / `top`, not transforms

- **Cause:** `gpuix gap`. See the CSS transforms row in [`README.md`](../README.md#missing-features).
- **Original:** the thumb's x (`slider.tsx:925`), the bubbles' x and `y: 4 -> 0` (`:362-369`, `:1109-1113`) are transforms.
- **Port:** the thumb's `left` is a motion value (`src/components/slider.tsx:618`), bubbles animate `top` (`:93-96`); every frame re-lays out.
- **Workaround:** motion values and `motion.div` on layout props.
- **Fidelity:** exact for what is seen.
- **Components it hits:** every spring FF runs on a transform.

## Layers that mix two motion values are JS-derived, a frame behind native ones

- **Cause:** `gpuix gap`.
- **Original:** the comfortable layers are `useTransform` strings of `fillPercent` and `zeroOffset`, such as `calc(p * 100% + 20px - ...)`, evaluated by the browser against the row's live width (`slider.tsx:1342-1368`); the compact fill is a px `useTransform` of the thumbs' x (`:493-501`).
- **Port:** the same `calc()` strings, held as motion values, with the source's springs on `percent` and `zeroOffset`. The scrubber's fill and the pips' line depend on `percent` alone, so they are range-form transforms and native-linked (`src/components/slider.tsx:1014`, `:1019-1023`). The pips fill, the scrubber's line and its handle strip mix `percent` with `zeroOffset`, so they are function-form transforms returning `calc()` (`:1015-1018`, `:1024-1031`). The compact step dots are static `calc()` lefts, `10px + share * (100% - 20px)` (`:766-775`). No layer reads a measured width, so a resize reaches them in the frame that lays it out (`scripts/check-slider.tsx`, "follows a resize") and the row paints them from its first frame. The compact fill is the source's px transform too: a range-form transform of the thumb's x for a single slider (`:575-580`) and the function-form `second - first` for a range (`:581-584`). The thumbs' own x stays px, measured by `onLayout` (`:690`), as the source's is.
- **gpuix lacks:** a native-linked transform of more than one motion value. A function-form transform is computed in JavaScript from `change` events, so it can trail its inputs by a frame (`README.md:2110-2113` of gpuix, FORK.md:1262-1263). Not seen in the test renderer: sampled every 16 ms on a held clock, the function-form fill and the range-form line agree to the pixel.
- **Workaround:** `calc()` in function-form transforms where two values mix, range-form where one does.
- **Fidelity:** exact at rest and under a resize; mid-spring, a two-value layer can sit a frame behind a one-value layer on a live window.
- **Components it hits:** none other.

## Step dots and pips are hidden per item, not by a mask that follows the thumb

- **Cause:** `gpuix gap`. gpuix has `maskImage` (`packages/native/js/host.ts:673`), but a gradient string cannot be a motion value, so the mask cannot follow a spring.
- **Original:** compact step dots and the pips layer sit under `mask-image: linear-gradient(...)` driven by the thumb's or fill's motion value, a 2px feather that hides each dot as the edge passes it (`slider.tsx:513-528`, `:1194`; `:1370-1376`, `:1683`).
- **Port:** each dot is its own `motion.div` whose opacity goes to 0 when it is at or under the value (`dotHidden`, `src/components/slider.tsx:547-550`, `:766-799`) and each pip sits in a wrapper whose opacity drops, at once, when `pip <= value` (`:1112-1121`). At rest it looks the same. While a press springs the thumb, every passed dot fades together over the spring instead of one by one as the edge reaches it.
- **Workaround:** per-item opacity.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Click-to-edit differs: no number field, no accessible name

- **Cause:** `not ported yet`. gpuix has `type="number"` and number `min` / `max` / `step` (FORK.md:503-504, `packages/native/js/host.ts:1336`).
- **Original:** the field is `type="number"` with `min`, `max` and `step` (`step="any"` for a `steps` list), focused and selected on the next frame so typing replaces the number, `aria-label="Edit slider value (start)"` for a range (`slider.tsx:213-217`, `:258-271`), a `5ch` wide box with line height 20 and a 1px bottom border (`:255-279`).
- **Port:** a text `<input autoFocus>` (`src/components/slider.tsx`, the edit field in `ValueDisplay`) that selects its text on focus (`onFocus` calling `select()`), so typing replaces the number; no min / max / step on the field, no `aria-label`; 40 wide with the same bottom border, no fixed height: the box is the 20px line plus the 1px border, 21px as in the source. While editing, the label, the field and, in a range, the other value are items of a flex row, not part of the text run: gpuix lays an `<input>` out as a block, and a span with `display: flex` is a block too (gpuix README "Inline text"), so there is no inline-grid slot as in the source (`:232-270`). Outside editing the value is one `<text>` run with a clickable `<span>` per number, as in the source (`:285-335`). The seed, Enter / blur commit, Escape cancel, clamp and snap match (`:190-208`, `:292-298`).
- **Workaround:** none.
- **Fidelity:** approximated (a text field instead of a number field, so letters can be typed and the browser's spinner is absent).
- **Components it hits:** none other.

## Public props not ported

- **Cause:** `not ported yet`.
- **Original:** `hideFill`, `thumbColor`, `thumbBorderColor`, `trackClassName` / `trackStyle`, `fillClassName` / `fillStyle` (`slider.tsx:79-85`, applied at `:1134-1157`, `:935-937`), any of which forces the compact engine (`:1903-1915`); `className`, `ref` and HTML props land on the root (`:959-970`) or the comfortable row (`:1631`).
- **Port:** `CompactProps` and `variant` / `size` only, plus a harness `testId` (`src/components/slider.tsx:396-410`, `:1320-1325`); `needsCompact` checks `size`, an array value, `steps`, `showSteps`, `showValue`, `valuePosition` (`:1339-1346`). The knob is always `#FFFFFF` (`:631`), the fill `selectedWash`, with no way to override either.
- **Workaround:** none. Also in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` (Slider, last bullet).
- **Fidelity:** dropped.
- **Components it hits:** every ported component.

## Value bubbles are anchored overlays

- **Cause:** `port choice` (reason not stated; the offsets were not measured against the DOM).
- **Original:** an absolutely positioned `motion.div` at fixed `top` offsets (`-20` compact hover, `-16` thumb bubble, `-30` default row, `slider.tsx:1123`, `:365`, `:1596`), centred with `-translate-x-1/2`, radius `shape.bg` (`:373`).
- **Port:** a `ValueBubble` (`src/components/slider.tsx:71-123`) in an `<anchored side="top" align="center" fit="snap" deferred>` with `gap` 8 above a thumb or 0 above a zero-size marker at 4px (compact, `:802-823`) or -6px (default, `:1305-1324`); radius `shape.bg`. `align="center"` is the source's `-translate-x-1/2` over a box that follows the thumb or the cursor, so the bubble is `<anchored>` and not an absolute box with a transform. The anchor keeps the bubble inside the window, which the DOM bubble does not. The marker offsets reproduce the DOM's bubble bottom if the bubble is 24px tall.
- **Workaround:** none.
- **Fidelity:** approximated (placement unverified to the pixel).
- **Components it hits:** none other.

## `onChange` fires only when the value changes

- **Cause:** `port choice` (the audit row "Emits only on change", `../base-ui-solid-gpuix/BASE-UI-AUDIT.md`).
- **Original:** every pointer move and press calls `onChange` with the snapped value, changed or not (`slider.tsx:741`, `:788`, `:1473`).
- **Port:** `emitChange` returns when `next === values()[thumb]` (`base-ui:src/slider/root/slider-root.ts:53-64`); the comfortable `emit` does the same (`base-ui:src/slider/root/slider-root.ts:54-55`).
- **Workaround:** none.
- **Fidelity:** approximated (the same sequence of distinct values; fewer calls).
- **Components it hits:** none other.

## Default row: the label and value blocks are the card colour, sized by the max

- **Cause:** `port choice` (reason not stated; `surface2` is the demo card's colour).
- **Original:** the blocks that keep pips off the words are `bg-background` (`slider.tsx:1724`, `:1722`), and the value block is `minWidth` of `formatValue(max).length` ch around the current text (`:1721-1726`), so it grows with a longer value.
- **Port:** `color.surface2` (`src/components/slider.tsx:1162`, `:1173`), correct on the demo card and wrong on any other surface; the value block holds `formatValue(max())` rather than the current text (`:1176-1178`), so a current value wider than the max's (a "Medium" against "Ultra") is wider than its block and a pip can show beside it.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Demo: variants, extras and missing chrome

- **Cause:** `port choice` for the extra rows (they drive the screenshot scenarios and the resize check) and the split Steps row; `not ported yet` for the missing chrome.
- **Original:** `app/docs/slider/page.tsx:246-419`: Compact, Range, Steps (25 and 10 together), Non-uniform, Value Display (left, right, tooltip, `gap-6`), Format, Disabled, then Default, Default - Scrubber, Default - Format, Default - Disabled, each in a `w-72` well with a code toggle, plus an API Reference table (`:126-213`, `:421`) and the description "One slider, two ladder steps ..." (`:240`).
- **Port:** `src/demos/slider.tsx:49-261` has every one of those variants with the same values and copy (Compact, Range, Steps 25, Steps 10, Non-uniform, Left, Right, Tooltip, Format, Disabled, Pips, Scrubber, Format, Disabled), in three cards ("Slider: compact", "value display", "default"), Steps split into two rows and the value-display gap 8. Extras not in the source page: Decimal (step 0.1), and a Resize row in each of the compact and default cards (`:102-112`, `:220-232`). No code toggle, props table or description.
- **Workaround:** none.
- **Fidelity:** all source variants present; extras and chrome as above.
- **Components it hits:** every demo page.
