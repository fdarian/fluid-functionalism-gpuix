# slider

Original: `registry/base/slider.tsx` (the compact thumb-and-track engine: range, step lists, value display; and the default-step pips and scrubber rows), demos in `app/docs/slider/page.tsx` of the source (the Audio Mixer page, `app/slider/page.tsx`, is `src/pages/audio-mixer.tsx`, see [`audio-mixer.md`](audio-mixer.md))
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/slider.tsx`,
demo in `src/demos/slider.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, variable-font axes, `text-box-trim`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## No `<input type="range">`

- **Cause:** `gpuix gap`.
- **Original:** Base UI renders a visually hidden `<input type="range">` in each thumb, which gives the platform slider semantics, keyboard handling and a form value (`slider.tsx:1058-1081`, `:1649-1657`).
- **Port:** each thumb is a `role="slider"` div with `tabIndex`, `aria-valuenow` / `-min` / `-max` / `-orientation` / `-disabled` and an `aria-valuetext` where Base UI sets one (`base-ui:src/slider/thumb/slider-thumb.ts:113-162`); the default row has a 1px hidden thumb that carries the same (`src/components/slider.tsx:1288-1305`). `onKeyDown` does Arrow (Shift for `largeStep`), Home, End and Page with Base UI's step maths (`base-ui:src/slider/thumb/slider-thumb.ts:52-111`). There is no `name` prop and no form value.
- **gpuix lacks:** the input type. `InputType` is `"text" | "password" | "number" | "email" | "search" | "tel" | "url"` (`packages/native/js/host.ts:1336`).
- **Workaround:** the slider div described above.
- **Fidelity:** approximated: exact for pointer and keyboard users and the accessibility tree, absent from forms.
- **Components it hits:** none other.

## Thumbs, fill and bubbles move on `left` / `width` / `top`, not transforms

- **Cause:** `gpuix gap`. See the CSS transforms row in [`README.md`](../README.md#missing-features).
- **Original:** the thumb's x (`slider.tsx:925`), the bubbles' x and `y: 4 -> 0` (`:362-369`, `:1109-1113`) are transforms.
- **Port:** the thumb's `left` is a motion value (`src/components/slider.tsx:619`), bubbles animate `top` (`:93-96`); every frame re-lays out.
- **Workaround:** motion values and `motion.div` on layout props.
- **Fidelity:** exact for what is seen.
- **Components it hits:** every spring FF runs on a transform.

## Derived layers trail their inputs by a frame, and the comfortable row is built in pixels

- **Cause:** `gpuix gap`.
- **Original:** the fill, handle, pips fill and masks are `useTransform` strings such as `calc(p * 100% + 20px - ...)` that mix a percentage with pixels (`slider.tsx:499-507`, `:1342-1376`), evaluated by the browser against the row's live width.
- **Port:** a range fill's `second - first` (`src/components/slider.tsx:582-585`) and every comfortable layer (`:1013-1027`) are `createTransform` functions that multiply by a measured `widthValue` (`:996`, written from `:1005`, in turn from `onLayout` at `:1071-1073`). Function-form transforms are computed in JS and run one frame behind their inputs (FORK.md:1262-1263, README bugs table), and a resize reaches the layers a frame after layout. The fill and handle line of the comfortable row are not rendered until the first `onLayout` (`:1193`, `:1263`), so they appear one frame after the row. The single compact fill is a range-form transform of the thumb's x (`:570-575`) and does not trail.
- **gpuix lacks:** a motion value that mixes `%` and `px`. A string held by a motion value must be a colour or a percentage: a function-form transform returning `calc(25% + 20px)` and a range-form transform with `calc()` outputs both throw "a motion value string must be a colour or a percentage" (tried against the built gpuix; README "Lengths" says the same for `motion` targets), so `calc()` works only as a static style, which does not animate. A range-form transform of percentages (`['0%', '100%']`) does work and is native-linked, but each comfortable layer adds a fixed pixel part and two animated terms (`percent` and the zero offset) in one value, and no single percentage of the row is that; a function-form transform stays one frame late.
- **Workaround:** pixel maths from the measured width.
- **Fidelity:** approximated: a very fast drag can show a range fill or a pips fill one frame behind its thumb or handle.
- **Components it hits:** none other.

## Step dots and pips are hidden per item, not by a mask that follows the thumb

- **Cause:** `gpuix gap`. gpuix has `maskImage` (`packages/native/js/host.ts:673`), but a gradient string cannot be a motion value, so the mask cannot follow a spring.
- **Original:** compact step dots and the pips layer sit under `mask-image: linear-gradient(...)` driven by the thumb's or fill's motion value, a 2px feather that hides each dot as the edge passes it (`slider.tsx:513-528`, `:1194`; `:1370-1376`, `:1683`).
- **Port:** each dot is its own `motion.div` whose opacity goes to 0 when it is at or under the value (`dotHidden`, `src/components/slider.tsx:548-551`, `:770-786`) and each pip sits in a wrapper whose opacity drops, at once, when `pip <= value` (`:1107-1117`). At rest it looks the same. While a press springs the thumb, every passed dot fades together over the spring instead of one by one as the edge reaches it.
- **Workaround:** per-item opacity.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Value label weight shifts at once

- **Cause:** `gpuix gap` (see the variable-font row in [`README.md`](../README.md#missing-features)).
- **Original:** the compact value label goes normal -> semibold (`wght` 550) over 100 ms on hover or press (`slider.tsx:307-321`).
- **Port:** the weight switches at once, SemiBold 600 for 550 (`src/components/slider.tsx:217`). The digits are `tabular-nums`, as in the source, so only the weight can change the label's width.
- **Workaround:** a hidden copy at the heaviest weight reserves the width (`src/components/slider.tsx:327-335`), like the source's ghost span.
- **Fidelity:** approximated (weight).
- **Components it hits:** every `StableLabel`.

## Click-to-edit differs: no number field, no accessible name

- **Cause:** `not ported yet`. gpuix has `type="number"` and number `min` / `max` / `step` (FORK.md:503-504, `packages/native/js/host.ts:1336`).
- **Original:** the field is `type="number"` with `min`, `max` and `step` (`step="any"` for a `steps` list), focused and selected on the next frame so typing replaces the number, `aria-label="Edit slider value (start)"` for a range (`slider.tsx:213-217`, `:258-271`), a `5ch` wide box with line height 20 and a 1px bottom border (`:255-279`).
- **Port:** a text `<input autoFocus>` (`src/components/slider.tsx`, the edit field in `ValueDisplay`) that selects its text on focus (`onFocus` calling `select()`), so typing replaces the number; no min / max / step on the field, no `aria-label`; 40 x 18 with the same bottom border. While editing, the label, the field and, in a range, the other value are items of a flex row, not part of the text run: gpuix lays an `<input>` out as a block, and a span with `display: flex` is a block too (gpuix README "Inline text"), so there is no inline-grid slot as in the source (`:232-270`). Outside editing the value is one `<text>` run with a clickable `<span>` per number, as in the source (`:285-335`). The seed, Enter / blur commit, Escape cancel, clamp and snap match (`:190-208`, `:292-298`).
- **Workaround:** none.
- **Fidelity:** approximated (a text field instead of a number field, so letters can be typed and the browser's spinner is absent; the field is about 2px shorter).
- **Components it hits:** none other.

## Public props not ported

- **Cause:** `not ported yet`.
- **Original:** `hideFill`, `thumbColor`, `thumbBorderColor`, `trackClassName` / `trackStyle`, `fillClassName` / `fillStyle` (`slider.tsx:79-85`, applied at `:1134-1157`, `:935-937`), any of which forces the compact engine (`:1903-1915`); `className`, `ref` and HTML props land on the root (`:959-970`) or the comfortable row (`:1631`).
- **Port:** `CompactProps` and `variant` / `size` only, plus a harness `testId` (`src/components/slider.tsx:397-411`, `:1324-1329`); `needsCompact` checks `size`, an array value, `steps`, `showSteps`, `showValue`, `valuePosition` (`:1333-1339`). The knob is always `#FFFFFF` (`:632`), the fill `selectedWash`, with no way to override either.
- **Workaround:** none. Also in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` (Slider, last bullet).
- **Fidelity:** dropped.
- **Components it hits:** every ported component.

## Value bubbles are anchored overlays

- **Cause:** `port choice` (reason not stated; the offsets were not measured against the DOM).
- **Original:** an absolutely positioned `motion.div` at fixed `top` offsets (`-20` compact hover, `-16` thumb bubble, `-30` default row, `slider.tsx:1123`, `:365`, `:1596`), centred with `-translate-x-1/2`, radius `shape.bg` (`:373`).
- **Port:** a `ValueBubble` (`src/components/slider.tsx:71-123`) in an `<anchored side="top" align="center" fit="snap" deferred>` with `gap` 8 above a thumb or 0 above a zero-size marker at 4px (compact, `:794-814`) or -6px (default, `:1299-1317`); radius `shape.bg`. The anchor keeps the bubble inside the window, which the DOM bubble does not. The marker offsets reproduce the DOM's bubble bottom if the bubble is 24px tall.
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
- **Port:** `color.surface2` (`src/components/slider.tsx:1164`, `:1168`), correct on the demo card and wrong on any other surface; the value block holds `formatValue(max())` rather than the current text (`:1171-1173`), so a current value wider than the max's (a "Medium" against "Ultra") is wider than its block and a pip can show beside it.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** none other.

## Demo: variants, extras and missing chrome

- **Cause:** `port choice` for the extra rows (they drive the screenshot scenarios and the resize check) and the split Steps row; `not ported yet` for the missing chrome.
- **Original:** `app/docs/slider/page.tsx:246-419`: Compact, Range, Steps (25 and 10 together), Non-uniform, Value Display (left, right, tooltip, `gap-6`), Format, Disabled, then Default, Default - Scrubber, Default - Format, Default - Disabled, each in a `w-72` well with a code toggle, plus an API Reference table (`:126-213`, `:421`) and the description "One slider, two ladder steps ..." (`:240`).
- **Port:** `src/demos/slider.tsx:47-259` has every one of those variants with the same values and copy (Compact, Range, Steps 25, Steps 10, Non-uniform, Left, Right, Tooltip, Format, Disabled, Pips, Scrubber, Format, Disabled), in three cards ("Slider: compact", "value display", "default"), Steps split into two rows and the value-display gap 8. Extras not in the source page: Decimal (step 0.1), and a Resize row in each of the compact and default cards (`:100-110`, `:218-230`). No code toggle, props table or description.
- **Workaround:** none.
- **Fidelity:** all source variants present; extras and chrome as above.
- **Components it hits:** every demo page.
