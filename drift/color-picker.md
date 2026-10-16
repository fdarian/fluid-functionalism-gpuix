# color-picker

Original: `registry/default/color-picker.tsx` (rails come from `registry/radix/slider.tsx`'s compact engine), demo in `app/docs/color-picker/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/color-picker.tsx` (colour maths in `src/components/color-picker-math.ts`),
demo in `src/demos/color-picker.tsx`. Popup chrome is shared: `src/lib/popup.tsx`, `src/lib/presence.ts`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it. In this file, source line numbers are `color-picker.tsx:N` and port ones `src/components/color-picker.tsx:N`.

The colour maths is the same code: `color-picker-math.ts` matches `color-picker.tsx:153-474` function for function (formatting and `Math.pow` to `**` aside),
except `resolveCssColor` and `useIsClient`, which are gone (first entry). HSV state, sticky OKLCH hue, controlled-value echo skip, format re-emit, 0..1 / 0..255 rounding and string formats behave alike.
The square, hex and channel commit rules, and the alpha rail snap to whole percents also match.

## No JS-side CSS colour resolver (named colours)

- **Cause:** `gpuix gap`.
- **Original:** a swatch such as `tomato` resolves through a canvas 2D context (`fillStyle`), which accepts every CSS colour syntax (`color-picker.tsx:420-440`); the strip marks the matching swatch and a click commits it (`:1748-1758`, `:1895-1902`). `swatches` is documented as "Any CSS color" (`:103`).
- **Port:** `parseColor` reads hex, `rgb(a)`, `hsl(a)` and `oklch` only (`src/components/color-picker-math.ts:304-306`). A named entry in `swatches` still paints (styles resolve the name natively) but is never marked selected, and clicking or pressing it does nothing (`normalizedHex` returns `undefined`, `isSelectedSwatch`; `commitColor` drops an unreadable string); the source resolves it and picks it. The prop says so (`swatches`). A typed name is rejected as in the source (the hex field prefixes `#`).
- **gpuix lacks:** a JS-visible colour resolver. Named colours, `color-mix()` and the rest resolve natively for style values only (`~/code/fdarian/gpuix/FORK.md:661-662`), and nothing hands the resolved colour back to JS.
- **Workaround:** none. A static table of the CSS colour names inside `parseColor` would close most of it without gpuix.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## CSS transforms (popup scale, chevron turn)

- **Cause:** `gpuix gap`.
- **Original:** the popover and the format menu enter with `scaleY: 0.96` from the top corner and slide `y: -4` whichever side they open on (`color-picker.tsx:1005-1013`, `:2372-2382`), and the trigger's chevron rotates 180 degrees over 150ms (`:989-996`).
- **Port:** the popup slides 4px from the side it opened on (down from above, up from below) and fades (`src/components/color-picker.tsx:700-756`, `src/lib/popup.tsx:88-118`); the chevron is swapped for a `chevron-up` icon while open, at once (`:84`, `:1013`).
- **gpuix lacks:** `scale` and `rotate` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the slide and the icon swap above. README rows: "CSS transforms".
- **Fidelity:** approximated.
- **Components it hits:** every popup (select, combobox, dropdown share the same slide in `src/lib/popup.tsx:88-118`) and every rotating chevron.

## Static font weights in the format menu

- **Cause:** `gpuix gap`.
- **Original:** the checked format row eases between weight 400 and semibold 550 over 80ms (`color-picker.tsx:860-881`).
- **Port:** `StableLabel` switches to SemiBold 600 at once (`src/components/color-picker.tsx:1111-1115`, `src/lib/stable-label.tsx`).
- **gpuix lacks:** variable-font axes; see README "Missing features", variable-font row, and `drift/site.md` "Static font weights and no `opsz`".
- **Workaround:** static cuts.
- **Fidelity:** approximated.
- **Components it hits:** every `StableLabel`.

## Panel content sits 1px off centre

- **Cause:** `port choice` (reason not stated; looks unintended, a bug).
- **Original:** the panel is `w-[280px] p-3` with no border; the square, rails and fields are 256px wide with 12px either side (`color-picker.tsx:1956-1960`).
- **Port:** the card is 280px with a 1px border, and the 280px panel sits inside it (`src/components/color-picker.tsx:1659-1672`, `:1582-1591`; the popover card is the same, `:691-731`, panel at `:1824`). The panel shrinks to 278px while its children stay 256px, so in `screenshots/color-picker/default.png` the left inset is 13px and the right one 11px.
- **Workaround:** none.
- **Fidelity:** approximated (1px).
- **Components it hits:** just this one.

## Popover surface level is 5, not substrate + 2

- **Cause:** `port choice` (reason not stated; the ladder in `src/lib/surface-context.ts` is not read here).
- **Original:** the popover panel sits at `min(substrate + 2, 8)` and the format menu two above it (`color-picker.tsx:2247`, `:1025`); a standalone panel is `max(substrate, 3)` (`:1948`). On the docs page the substrate is 1, so the popover is surface 3 and its menu surface 5.
- **Port:** the popover card and its panel are hard-coded to level 5 and the menu is 7 (`src/components/color-picker.tsx:1826-1830`); a standalone panel takes a port-only `level` prop (default 3, `:1409-1410`, `:1643`). In `screenshots/color-picker/popover-open.png` the popover is visibly lighter than the inline panel; select and combobox popups use surface 3 on the page (`src/lib/popup.tsx`).
- **Workaround:** none.
- **Fidelity:** approximated (two steps lighter in the popover).
- **Components it hits:** just this one.

## Rails: hover preview and value bubble

- **Cause:** `not ported yet`.
- **Original:** hovering a rail fades in a 40% accent bar from the start to the snapped hover point (0.15s) and, after 100ms, a foreground-coloured bubble above it with the value (hue degrees or alpha percent), both hidden while pressed (`registry/radix/slider.tsx:1094-1120`, `:1152-1171`).
- **Port:** neither (`src/components/color-picker.tsx:461-606`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one; `src/components/slider.tsx` has its own.

## Rails: thumb does not spring

- **Cause:** `not ported yet`.
- **Original:** a press springs the thumb to the pressed spot on `spring.moderate`, a drag sets it directly, release and keyboard or programmatic changes spring again (`registry/radix/slider.tsx:721-723`, `:763-766`, `:799-815`, and the value-sync effect at `:611-625`).
- **Port:** `left` is a plain style from the value, so every change jumps (`src/components/color-picker.tsx:553`). The slider port animates its thumb with `animate` on a motion value (`src/components/slider.tsx`), which the rails do not use.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Rails: keyboard, ARIA and focus ring

- **Cause:** `not ported yet`.
- **Original:** Radix slider thumb: arrows, Shift+arrow and PageUp/PageDown move by 10, Home/End jump, and it exposes `aria-valuenow`, `-min`, `-max` (`registry/radix/slider.tsx`, primitive). The ring is a 24px circle whose opacity eases on `spring.fast` (`:940-952`), and the track has an `ew-resize` cursor only on the hit area (`:1087`).
- **Port:** arrows, Shift (10), Home and End only; no PageUp/PageDown (`src/components/color-picker.tsx:489-512`). The thumb has `aria-valuetext` but no `aria-valuenow`/`-min`/`-max` (`:535-538`; `slider.tsx:851-853` has them). The ring is `focusVisible` with a 2px offset, drawn about 2px wider, its colour easing over 80 ms on a spring-fitted curve (`:552-553`, `springFade`, `src/lib/theme.ts`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Hue rail is six gradients side by side

- **Cause:** `not ported yet`.
- **Original:** one `linear-gradient` with seven stops as the track (`color-picker.tsx:695-699`).
- **Port:** six flex children with two stops each (`src/components/color-picker.tsx:625-649`), on the stated ground that gpuix gradients take two stops. That holds only for the object form (`LinearGradientBackground.stops`, `host.ts:389`); the CSS-string `background` and `backgroundImage` take any number of stops (`host.ts:483-491`; `FORK.md:646-647`). Sub-pixel widths (254 / 6) can leave seams between the cells.
- **Workaround:** the six cells.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Checkerboard is an SVG of squares

- **Cause:** `not ported yet`.
- **Original:** one `conic-gradient` tiled at 8px (`CHECKER_BG`, `color-picker.tsx:485-489`) behind the tile, the swatch and the alpha rail (`:741`).
- **Port:** a backing fill plus a monochrome SVG path of the other squares, rebuilt for each size (`src/components/color-picker.tsx:86-131`), on the stated ground that gpuix has no conic gradients or tiled backgrounds. It has: `backgroundImage` takes `conic-gradient()` and `backgroundSize` / `backgroundRepeat` exist (`host.ts:483-496`; `FORK.md:646-649`). The squares line up with the source's (4px, `checker-a` on the top right).
- **Workaround:** the SVG.
- **Fidelity:** exact in pixels.
- **Components it hits:** just this one.

## Hairline sits over the colour

- **Cause:** `port choice` (follows the source comment's intent, not its rendering).
- **Original:** the 25% grey hairline is an `inset` box-shadow on the tile and swatch button, and the colour is an `absolute inset-0` child above it (`color-picker.tsx:1665-1672`, `:1692`, `:1713-1716`). By CSS paint order the child covers an inset shadow, so on an opaque colour the hairline does not show; it shows only through translucent ones. This was reasoned from the stacking rules, not checked in a browser.
- **Port:** the same `inset 0 0 0 1px` shadow, but on a separate overlay painted after the colour, so the hairline is always visible (`src/components/color-picker.tsx:158-169`, `:229-241`). On the tile or button itself it would sit under the checker, which is a child box here, not the parent's background, and would never show.
- **Workaround:** n/a.
- **Fidelity:** approximated (a hairline the source may not draw on opaque colours).
- **Components it hits:** just this one.

## Saturation square: the OS cursor stays

- **Cause:** `not ported yet`.
- **Original:** `cursor-none`; the ghost ring stands in for the pointer (`color-picker.tsx:616`, `:653-669`).
- **Port:** `cursor: "crosshair"`, so the crosshair and the ghost ring both show (`src/components/color-picker.tsx:366-367`), on the stated ground that gpuix has no `cursor: none`. It has (`host.ts:367`, `packages/native/src/style.rs:759`; `FORK.md:314`), on macOS only: Linux shows the default cursor, Windows is untested (`FORK.md:409-414`).
- **Workaround:** the crosshair.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Saturation square: ghost ring paints under the thumb

- **Cause:** `not ported yet`.
- **Original:** the thumb comes first and the ghost ring after it, so the ring is on top (`color-picker.tsx:636-669`).
- **Port:** the ghost is rendered before the thumb (`src/components/color-picker.tsx:416-450`); paint order is document order, so the thumb is on top.
- **Workaround:** none; swapping the two blocks fixes it.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Format menu: no travelling focus ring

- **Cause:** `not ported yet`.
- **Original:** a keyboard-focused row gets a 1px ring 2px outside it that glides between rows on `spring.fast` and fades out on `spring.fast.exit` (`color-picker.tsx:1118-1138`); it shows for `:focus-visible` only (`:1069-1072`).
- **Port:** the keyboard-lit row gets only the hover highlight; there is no ring (`src/components/color-picker.tsx:1055-1069`, `:1070-1117`); rows now take real focus, so a ring could follow `focusVisible` on the focused row. The select port has the ring (recent commit "Select: the keyboard-lit row gets a focus ring").
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Popover: focus is not moved in, restored or lost

- **Cause:** `not ported yet`.
- **Original:** Base UI Popover (`modal={false}`) moves focus into the panel on open, restores it to the trigger on close, and closes on focus-out and outside press (`color-picker.tsx:2204-2214`, `:2304-2311`). The trigger is a real button with no `aria-label`, so its name is the label and value text.
- **Port:** open and close change nothing about focus; only an outside press and Escape (from the wrapper) close it, with no focus-out handler (`src/components/color-picker.tsx:1698-1706`, `:1740-1751`). The trigger is a `div role="button"` whose `aria-label` is `triggerLabel` or "Pick a color" (`:1734`), which hides the value from its name. Read from the code, not run.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Popover remove X is not keyboard reachable

- **Cause:** `not ported yet`.
- **Original:** a `span role="button" tabIndex={0}`; Enter and Space remove without toggling the popover (`color-picker.tsx:2343-2363`).
- **Port:** a `div role="button"` with no `tabIndex` or key handler; a pointer click is kept off the trigger by a hover flag (`src/components/color-picker.tsx:1818-1842`, `:1762`).
- **Workaround:** none.
- **Fidelity:** approximated (pointer only).
- **Components it hits:** just this one.

## Channel fields: scrubbing without pointer lock

- **Cause:** `not ported yet` (pointer lock is macOS only, `FORK.md:314`, `:409-414`).
- **Original:** Base UI's `NumberField.ScrubArea` locks the pointer, draws a black `<->` cursor in its place, and counts 1px of travel per step with no dead zone (`pixelSensitivity={1}`), so a drag can run past the screen edge (`color-picker.tsx:1473-1510`). A press without a drag dispatches a click that starts editing (`:1479-1487`).
- **Port:** the pointer is captured, not locked, so the real cursor shows with an `ew-resize` shape and stops at the screen edge; a 3px dead zone separates a press from a scrub, and the first scrub step jumps by that travel (`src/components/color-picker.tsx:1119-1162`, `:1173`). No virtual cursor.
- **gpuix lacks:** n/a on macOS (`requestPointerLock` exists, `packages/native/index.d.ts:313`; the port does not call it).
- **Workaround:** capture plus the dead zone.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Channel fields: select-all on focus

- **Cause:** `not ported yet` (`select()` exists, `FORK.md:451`).
- **Original:** focusing a field, or a no-drag press, selects all its text, so typing replaces the value (`color-picker.tsx:1289-1292`, `:1485-1486`, `:1530-1534`).
- **Port:** focus places the caret and selects nothing (`src/components/color-picker.tsx:1079-1082`, `:1211-1214`); the demo clears the hex field with eight Backspaces (`src/demos/color-picker.tsx:204-208`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Channel fields: NumberField keys and input filtering

- **Cause:** `not ported yet`.
- **Original:** `NumberField` also handles Home/End (to `min`/`max` where set), and its scrub and arrow steps read Shift for `largeStep` and Alt for `smallStep`; it blocks non-numeric characters as you type (Base UI master `NumberFieldInput.tsx:350-385`, `NumberFieldRoot.tsx:217-225`, `NumberFieldScrubArea.tsx:230`; checked against master, not FF's pinned version).
- **Port:** ArrowUp/Down and Shift+arrow only; Home/End do nothing; no modifier during a scrub; any text can be typed (`src/components/color-picker.tsx:1097-1115`, `:1142-1144`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Channel fields: hue wraps at its maximum

- **Cause:** `port choice` (reason not stated; the port has one shared `bound` for both of the source's input kinds).
- **Original:** the scrub field wraps only values outside the range, so 360 stays 360 (`color-picker.tsx:1412-1418`); the text field maps 360 to 0 (`:1236-1243`). Hue fields use the scrub path.
- **Port:** `bound` always takes the modulo, so a typed 360 commits 0 (`src/components/color-picker.tsx:1050-1058`). The OKLCH H field then shows 0, where the source's sticky hue shows 360.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Size ladder is not ported

- **Cause:** `not ported yet`.
- **Original:** `size` pins the panel, the format menu and the popover trigger to the default (36px) or compact (28px) step: control height, padding, gap, 12px text, 16px tile and menu row padding (`color-picker.tsx:113-116`, `:830-831`, `:2075`, `:2242-2243`, `:2329`).
- **Port:** fixed 36px controls (`height.control`, `src/components/color-picker.tsx:1778`), 13px text, 20px tile (`:1777`). No `size` prop and no size context.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** any component with a `size` prop; the port has no `SizeProvider`.

## Eyedropper is not ported

- **Cause:** `not ported yet` (an `EyeDropper` exists on macOS only: `FORK.md:514-517`).
- **Original:** a pipette button beside the format menu where `window.EyeDropper` exists, hidden elsewhere or by `hideEyedropper`; a pick commits the colour like a swatch (`color-picker.tsx:1599-1640`, `:1983-1991`).
- **Port:** the format menu is the only item in its row, in the same half-width column (`src/components/color-picker.tsx:1617-1625`). No `hideEyedropper` prop; no `pipette` icon (`src/lib/icons.ts`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Props and exports the port lacks

- **Cause:** `not ported yet` for the behaviour props; `port choice` (gpuix takes `style`, not classes) for the class and ref ones.
- **Original:** `ColorPicker` takes `formatOpen`, `size`, `hideEyedropper`, `className`, a forwarded `ref` and div attributes (`color-picker.tsx:89-117`); `ColorPickerPopover` adds controlled `open`, `onOpenChange` and `triggerClassName` (`:119-137`); `ColorTile` takes `className` and `style` (`:1646-1651`); `ColorSwatch` takes every button attribute and `size` (`:139-147`); `ColorPickerPortalContainer` is exported (`:2431-2439`).
- **Port:** none of those; `ColorPickerPopover` has `defaultOpen` only and is uncontrolled for open state (`src/components/color-picker.tsx:1676-1687`). `ColorSwatch` takes `onClick` and `testId`, `ColorTile` neither class nor style (`:130`, `:175-181`). Port-only: `level` and `testId` (`:1409-1410`, `:1408`). No portal container: the menu and popover are `<anchored>` layers.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Accessible names differ

- **Cause:** `port choice` (reason not stated).
- **Original:** the format trigger has no label, so its name is "HEX" and so on (`color-picker.tsx:974-997`); the hex field is labelled "Hex value" (`:2116`).
- **Port:** the format trigger is "Color format" (`src/components/color-picker.tsx:972`), the hex field "Hex" (`:1318`); the popover trigger name is covered above.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: sections are merged into cards

- **Cause:** `port choice` (reason not stated; the file says only that the page is taller than the window, so scenarios show one card at a time).
- **Original:** six sections: Default, Popover, With Swatches, OKLCH Format, Controlled, Removable Trigger, then an "Eyedropper Support" note and two props tables (`app/docs/color-picker/page.tsx:96-179`).
- **Port:** four cards: "Default and popover" (the inline panel, the popover and the removable trigger side by side under captions), "With swatches", "OKLCH format", "Controlled" (`src/demos/color-picker.tsx:40-133`). Every variant the source demos exists; the Eyedropper section has no feature to describe. No Preview / Code tabs and no props tables: see `drift/site.md` ("Preview frame: Inspect, highlighted code, and tabs on component pages", "API Reference props tables"). Section and card titles differ in case ("With Swatches" / "With swatches").
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: "+ Add fill" button and the "Current:" readout

- **Cause:** `not ported yet` (`borderStyle: "dashed"` exists, `packages/native/src/style.rs:346`; the port loads Inter only, `src/lib/fonts.ts:4`).
- **Original:** the add button has a dashed border, muted text that goes to foreground on hover (`app/docs/color-picker/page.tsx:153-160`); the controlled readout shows the value in a monospace span (`:135-137`).
- **Port:** a solid border and fixed muted text (`src/demos/color-picker.tsx:63-84`); the readout is one body-text string (`:128-130`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
