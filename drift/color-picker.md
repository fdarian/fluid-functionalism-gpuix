# color-picker

Original: `registry/default/color-picker.tsx` (rails come from `registry/radix/slider.tsx`'s compact engine), demo in `app/docs/color-picker/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/color-picker.tsx` (colour maths in `src/components/color-picker-math.ts`),
demo in `src/demos/color-picker.tsx`. Popup chrome is shared: `src/lib/popup.tsx` (the select, combobox and dropdown card; the picker has its own `Popup` for the two cards below), presence is `base-ui:src/internals/use-transition-status.ts`. The format menu runs on the Menu primitives (`base-ui:src/menu/`) and the popover on the Popover ones (`base-ui:src/popover/`); `base-ui:` paths are in `../base-ui-solid-gpuix`, whose `BASE-UI-AUDIT.md` ("Color picker format menu", "Popover") compares them to Base UI.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it. In this file, source line numbers are `color-picker.tsx:N` and port ones `src/components/color-picker.tsx:N`.

The colour maths is the same code: `color-picker-math.ts` matches `color-picker.tsx:154-475` function for function (formatting and `Math.pow` to `**` aside),
except `resolveCssColor` and `useIsClient`, which are gone (first entry). HSV state, sticky OKLCH hue, controlled-value echo skip, format re-emit, 0..1 / 0..255 rounding and string formats behave alike.
The square, hex and channel commit rules, and the alpha rail snap to whole percents also match.

## No JS-side CSS colour resolver (named colours)

- **Cause:** `gpuix gap`.
- **Original:** a swatch such as `tomato` resolves through a canvas 2D context (`fillStyle`), which accepts every CSS colour syntax (`color-picker.tsx:421-441`); the strip marks the matching swatch and a click commits it (`:1748-1758`, `:1895-1902`). `swatches` is documented as "Any CSS color" (`:103`).
- **Port:** `parseColor` reads hex, `rgb(a)`, `hsl(a)` and `oklch` only (`src/components/color-picker-math.ts:304-306`). A named entry in `swatches` still paints (styles resolve the name natively) but is never marked selected, and clicking or pressing it does nothing (`normalizedHex` returns `undefined`, `isSelectedSwatch`; `commitColor` drops an unreadable string); the source resolves it and picks it. The prop says so (`swatches`). A typed name is rejected as in the source (the hex field prefixes `#`).
- **gpuix lacks:** a JS-visible colour resolver. Named colours, `color-mix()` and the rest resolve natively for style values only (`~/code/fdarian/gpuix/FORK.md:831-832`), and nothing hands the resolved colour back to JS.
- **Workaround:** none. A static table of the CSS colour names inside `parseColor` would close most of it without gpuix.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Popover surface level is 5, not substrate + 2

- **Cause:** `port choice` (reason not stated; the ladder in `src/lib/surface-context.ts` is not read here).
- **Original:** the popover panel sits at `min(substrate + 2, 8)` and the format menu two above it (`color-picker.tsx:2248`, `:1025`); a standalone panel is `max(substrate, 3)` (`:1948`). On the docs page the substrate is 1, so the popover is surface 3 and its menu surface 5.
- **Port:** the popover card and its panel are hard-coded to level 5 and the menu is 7 (`src/components/color-picker.tsx:1903`, `:1906`, `:954`); a standalone panel takes a port-only `level` prop (default 3, `:1490-1491`, `:1683`, `:1724`). In `screenshots/color-picker/popover-open.png` the popover is visibly lighter than the inline panel; select and combobox popups use surface 3 on the page (`src/lib/popup.tsx`).
- **Workaround:** none.
- **Fidelity:** approximated (two steps lighter in the popover).
- **Components it hits:** just this one.

## Rails: hover preview and value bubble

- **Cause:** `not ported yet`.
- **Original:** hovering a rail fades in a 40% accent bar from the start to the snapped hover point (0.15s) and, after 100ms, a foreground-coloured bubble above it with the value (hue degrees or alpha percent), both hidden while pressed (`registry/radix/slider.tsx:1094-1120`, `:1152-1171`).
- **Port:** neither (`src/components/color-picker.tsx:458-605`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one; `src/components/slider.tsx` has its own.

## Rails: thumb does not spring

- **Cause:** `not ported yet`.
- **Original:** a press springs the thumb to the pressed spot on `spring.moderate`, a drag sets it directly, release and keyboard or programmatic changes spring again (`registry/radix/slider.tsx:721-723`, `:763-766`, `:799-815`, and the value-sync effect at `:611-625`).
- **Port:** `left` is a plain style from the value, so every change jumps (`src/components/color-picker.tsx:555`). The slider port animates its thumb with `animate` on a motion value (`src/components/slider.tsx`), which the rails do not use.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Rails: keyboard, ARIA and focus ring

- **Cause:** `not ported yet`.
- **Original:** Radix slider thumb: arrows, Shift+arrow and PageUp/PageDown move by 10, Home/End jump, and it exposes `aria-valuenow`, `-min`, `-max` (`registry/radix/slider.tsx`, primitive). The ring is a 24px circle whose opacity eases on `spring.fast` (`:940-952`), and the track has an `ew-resize` cursor only on the hit area (`:1087`).
- **Port:** arrows, Shift (10), Home and End only; no PageUp/PageDown (`src/components/color-picker.tsx:492-515`). The thumb has `aria-valuetext` but no `aria-valuenow`/`-min`/`-max` (`:546-548`; the slider's thumb has them, `base-ui:src/slider/thumb/slider-thumb.ts:146-153`). The ring is `focusVisible` with a 2px offset, drawn about 2px wider, its colour easing over 80 ms on a spring-fitted curve (`src/components/color-picker.tsx:563-564`, `springFade`, `src/lib/theme.ts:545`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Hue rail is six gradients side by side

- **Cause:** `not ported yet`.
- **Original:** one `linear-gradient` with seven stops as the track (`color-picker.tsx:696-700`).
- **Port:** six flex children with two stops each (`src/components/color-picker.tsx:624-648`), on the stated ground that gpuix gradients take two stops. That holds only for the object form (`LinearGradientBackground.stops`, `host.ts:444-448`); the CSS-string `background` and `backgroundImage` take any number of stops (`host.ts:565-574`; `FORK.md:783-784`). Sub-pixel widths (254 / 6) can leave seams between the cells.
- **Workaround:** the six cells.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Checkerboard is an SVG of squares

- **Cause:** `not ported yet`.
- **Original:** one `conic-gradient` tiled at 8px (`CHECKER_BG`, `color-picker.tsx:486-490`) behind the tile, the swatch and the alpha rail (`:741`).
- **Port:** a backing fill plus a monochrome SVG path of the other squares, rebuilt for each size (`src/components/color-picker.tsx:109-154`), on the stated ground that gpuix has no conic gradients or tiled backgrounds. It has: `backgroundImage` takes `conic-gradient()` and `backgroundSize` / `backgroundRepeat` exist (`host.ts:565-577`; `FORK.md:783-786`). The squares line up with the source's (4px, `checker-a` on the top right).
- **Workaround:** the SVG.
- **Fidelity:** exact in pixels.
- **Components it hits:** just this one.

## Hairline sits over the colour

- **Cause:** `port choice` (follows the source comment's intent, not its rendering).
- **Original:** the 25% grey hairline is an `inset` box-shadow on the tile and swatch button, and the colour is an `absolute inset-0` child above it (`color-picker.tsx:1666-1673`, `:1692`, `:1713-1716`). By CSS paint order the child covers an inset shadow, so on an opaque colour the hairline does not show; it shows only through translucent ones. This was reasoned from the stacking rules, not checked in a browser.
- **Port:** the same `inset 0 0 0 1px` shadow, but on a separate overlay painted after the colour, so the hairline is always visible (`src/components/color-picker.tsx:181-191`, `:251-261`). On the tile or button itself it would sit under the checker, which is a child box here, not the parent's background, and would never show.
- **Workaround:** n/a.
- **Fidelity:** approximated (a hairline the source may not draw on opaque colours).
- **Components it hits:** just this one.

## Saturation square: the OS cursor stays

- **Cause:** `not ported yet`.
- **Original:** `cursor-none`; the ghost ring stands in for the pointer (`color-picker.tsx:617`, `:653-669`).
- **Port:** `cursor: "crosshair"`, so the crosshair and the ghost ring both show (`src/components/color-picker.tsx:374-375`), on the stated ground that gpuix has no `cursor: none`. It has (`host.ts:426`, `packages/native/src/style.rs:1124`; `FORK.md:333-339`), on macOS only: Linux shows the default cursor, Windows is untested (`FORK.md:449-455`).
- **Workaround:** the crosshair.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Format menu: no travelling focus ring

- **Cause:** `not ported yet`.
- **Original:** a keyboard-focused row gets a 1px ring 2px outside it that glides between rows on `spring.fast` and fades out on `spring.fast.exit` (`color-picker.tsx:1119-1139`); it shows for `:focus-visible` only (`:1069-1072`).
- **Port:** the keyboard-lit row gets only the hover highlight; there is no ring (`src/components/color-picker.tsx:985-991` the hover highlight, `:1007-1030` the row); rows take real focus (`base-ui:src/menu/item/menu-item.ts:114-119`), so a ring could follow `focusVisible` on the focused row. The select port has the ring (recent commit "Select: the keyboard-lit row gets a focus ring").
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Popover: focus is not moved in, restored or lost

- **Cause:** `not ported yet`.
- **Original:** Base UI Popover (`modal={false}`) moves focus into the panel on open, restores it to the trigger on close, and closes on focus-out and outside press (`color-picker.tsx:2205-2215`, `:2304-2311`). The trigger is a real button with no `aria-label`, so its name is the label and value text.
- **Port:** open and close change nothing about focus; only an outside press and Escape (from the wrapper) close it, with no focus-out handler (`base-ui:src/popover/root/popover-root.ts:46-53`, `src/components/color-picker.tsx:1797-1808`). The trigger is a `div role="button"` whose `aria-label` is `triggerLabel` or "Pick a color" (`:1808-1811`), which hides the value from its name. Read from the code, not run.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Popover remove X is not keyboard reachable

- **Cause:** `not ported yet`.
- **Original:** a `span role="button" tabIndex={0}`; Enter and Space remove without toggling the popover (`color-picker.tsx:2344-2364`).
- **Port:** a `div role="button"` with no `tabIndex` or key handler; a pointer click is kept off the trigger by a hover flag (`src/components/color-picker.tsx:1870-1894`, `:1756`, `:1816-1819`).
- **Workaround:** none.
- **Fidelity:** approximated (pointer only).
- **Components it hits:** just this one.

## Channel fields: scrubbing without pointer lock

- **Cause:** `not ported yet` (pointer lock is macOS only, `FORK.md:333-339`, `:449-455`).
- **Original:** Base UI's `NumberField.ScrubArea` locks the pointer, draws a black `<->` cursor in its place, and counts 1px of travel per step with no dead zone (`pixelSensitivity={1}`), so a drag can run past the screen edge (`color-picker.tsx:1474-1511`). A press without a drag dispatches a click that starts editing (`:1479-1487`).
- **Port:** the pointer is captured, not locked, so the real cursor shows with an `ew-resize` shape and stops at the screen edge; a 3px dead zone separates a press from a scrub, and the first scrub step jumps by that travel (`src/components/color-picker.tsx:1158-1203`, `:1215`). No virtual cursor.
- **gpuix lacks:** n/a on macOS (`requestPointerLock` exists, `packages/native/index.d.ts:310`; the port does not call it).
- **Workaround:** capture plus the dead zone.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Channel fields: select-all on focus

- **Cause:** `not ported yet` (`select()` exists, `FORK.md:503`).
- **Original:** focusing a field, or a no-drag press, selects all its text, so typing replaces the value (`color-picker.tsx:1290-1293`, `:1485-1486`, `:1530-1534`).
- **Port:** focus places the caret and selects nothing (`src/components/color-picker.tsx:1254-1257`, `:1189-1199`); the demo clears the hex field with eight Backspaces (`src/demos/color-picker.tsx:205-208`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Channel fields: NumberField keys and input filtering

- **Cause:** `not ported yet`.
- **Original:** `NumberField` also handles Home/End (to `min`/`max` where set), and its scrub and arrow steps read Shift for `largeStep` and Alt for `smallStep`; it blocks non-numeric characters as you type (Base UI v1.9.0, `number-field/input/NumberFieldInput.tsx:333-372`, `number-field/root/NumberFieldRoot.tsx:208-216`, `number-field/scrub-area/NumberFieldScrubArea.tsx:230`).
- **Port:** ArrowUp/Down and Shift+arrow only; Home/End do nothing; no modifier during a scrub; any text can be typed (`src/components/color-picker.tsx:1138-1156`, `:1177-1187`, `:1248-1253`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Channel fields: hue wraps at its maximum

- **Cause:** `port choice` (reason not stated; the port has one shared `bound` for both of the source's input kinds).
- **Original:** the scrub field wraps only values outside the range, so 360 stays 360 (`color-picker.tsx:1413-1419`); the text field maps 360 to 0 (`:1236-1243`). Hue fields use the scrub path.
- **Port:** `bound` takes the modulo for a field with `wrap` (the HSL and OKLCH hue fields), so a typed 360 commits 0 (`src/components/color-picker.tsx:1091-1104`, `wrap` set at `:1401`, `:1454`). The OKLCH H field then shows 0, where the source's sticky hue shows 360.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Size ladder is not ported

- **Cause:** `not ported yet`.
- **Original:** `size` pins the panel, the format menu and the popover trigger to the default (36px) or compact (28px) step: control height, padding, gap, 12px text, 16px tile and menu row padding (`color-picker.tsx:114-117`, `:830-831`, `:2075`, `:2242-2243`, `:2329`).
- **Port:** fixed 36px controls (`height.control`, `src/components/color-picker.tsx:1827`), 13px text, 20px tile (`:1848`). No `size` prop and no size context.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** any component with a `size` prop; the port has no `SizeProvider`.

## Eyedropper is not ported

- **Cause:** `not ported yet` (an `EyeDropper` exists on macOS only: `FORK.md:515`, `:577-580`).
- **Original:** a pipette button beside the format menu where `window.EyeDropper` exists, hidden elsewhere or by `hideEyedropper`; a pick commits the colour like a swatch (`color-picker.tsx:1600-1641`, `:1983-1991`).
- **Port:** the format menu is the only item in its row, in the same half-width column (`src/components/color-picker.tsx:1678-1686`, `:779`). No `hideEyedropper` prop; no `pipette` icon (`src/lib/icons.ts`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Props and exports the port lacks

- **Cause:** `not ported yet` for the behaviour props; `port choice` (gpuix takes `style`, not classes) for the class and ref ones.
- **Original:** `ColorPicker` takes `formatOpen`, `size`, `hideEyedropper`, `className`, a forwarded `ref` and div attributes (`color-picker.tsx:89-118`); `ColorPickerPopover` adds controlled `open`, `onOpenChange` and `triggerClassName` (`:119-137`); `ColorTile` takes `className` and `style` (`:1646-1651`); `ColorSwatch` takes every button attribute and `size` (`:139-147`); `ColorPickerPortalContainer` is exported (`:2431-2439`).
- **Port:** none of those; `ColorPickerPopover` has `defaultOpen` only and is uncontrolled for open state (`src/components/color-picker.tsx:1736-1748`; the primitive, `base-ui:src/popover/root/popover-root.ts:5-8`, takes `defaultOpen` and `onOpenChange` only). `ColorSwatch` takes `onClick` and `testId`, `ColorTile` neither class nor style (`src/components/color-picker.tsx:197-203`, `:156`). Port-only: `level` and `testId` (`:1489-1491`). No portal container: the menu and popover are `<anchored>` layers.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Accessible names differ

- **Cause:** `port choice` (reason not stated).
- **Original:** the format trigger has no label, so its name is "HEX" and so on (`color-picker.tsx:975-998`); the hex field is labelled "Hex value" (`:2116`).
- **Port:** the format trigger is "Color format" (`src/components/color-picker.tsx:889`), the hex field "Hex" (`:1374`, `:1287-1289`); the popover trigger name is covered above.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: sections are merged into cards

- **Cause:** `port choice` (reason not stated; the file says only that the page is taller than the window, so scenarios show one card at a time).
- **Original:** six sections: Default, Popover, With Swatches, OKLCH Format, Controlled, Removable Trigger, then an "Eyedropper Support" note and two props tables (`app/docs/color-picker/page.tsx:96-179`).
- **Port:** four cards: "Default and popover" (the inline panel, the popover and the removable trigger side by side under captions), "With swatches", "OKLCH format", "Controlled" (`src/demos/color-picker.tsx:40-135`). Every variant the source demos exists; the Eyedropper section has no feature to describe. No Preview / Code tabs and no props tables: see `drift/site.md` ("Preview frame: Inspect, highlighted code, and tabs on component pages", "API Reference props tables"). Section and card titles differ in case ("With Swatches" / "With swatches").
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: "+ Add fill" button and the "Current:" readout

- **Cause:** `not ported yet` (`borderStyle: "dashed"` exists, `packages/native/src/style.rs:663`; the port loads Inter only, `src/lib/fonts.ts:5`).
- **Original:** the add button has a dashed border, muted text that goes to foreground on hover (`app/docs/color-picker/page.tsx:153-160`); the controlled readout shows the value in a monospace span (`:135-137`).
- **Port:** a solid border and fixed muted text (`src/demos/color-picker.tsx:64-86`); the readout is one body-text string (`:130-132`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.
