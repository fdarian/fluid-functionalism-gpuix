# color-picker

Original: `registry/default/color-picker.tsx`. Ported in `src/components/color-picker.tsx` (colour maths in `src/components/color-picker-math.ts`, copied from the original), demo in `src/demos/color-picker.tsx`. The panel, the format menu, the channel fields with scrubbing, swatches and the popover are ported; size pinning, the eyedropper and named colours are not.

## Gradients take two stops

- **Original:** the hue rail is one `linear-gradient` of seven stops, and the saturation square stacks two gradients in one `background`.
- **gpuix lacks:** more than two stops. `LinearGradientBackground.stops` is a two-element tuple (`packages/native/js/host.ts`, `LinearGradientBackground`), and `background` takes one gradient, not a list. Missing feature.
- **Workaround:** the rainbow is six two-stop gradients side by side in a flex row (`colorSpace: "srgb"`, so each segment interpolates like the CSS one). The square is two stacked absolute layers: white to the pure hue, then black to transparent. The alpha rail is a transparent-to-solid gradient (second stop at 0.98) over the checker.
- **Fidelity:** exact for the hue rail and the square, up to segment seams.
- **Components it hits:** slider with a gradient track.

## No conic gradient or tiled backgrounds (the alpha checkerboard)

- **Original:** one `conic-gradient` with `background-size: 8px 8px` paints the checker behind tiles, swatches and the alpha rail.
- **gpuix lacks:** conic gradients, `background-size` / `background-repeat`, and image tiling. `<svg source>` is monochrome, tinted by `style.color`. Missing feature.
- **Workaround:** a backing div in `--checker-b` plus a monochrome SVG whose single `<path>` holds every `--checker-a` square, generated per size (`checkerSource`). The cells are 4px, the quadrant size of the original's 8px tile.
- **Fidelity:** exact. One SVG per tile, swatch and rail, with up to about 160 sub-paths on the rail.
- **Components it hits:** any patterned fill (table zebra, skeletons).

## No `cursor: none`

- **Original:** the square hides the OS cursor and a 55%-white ghost ring stands in for it, previewing where a press will land.
- **gpuix lacks:** `none` in `CursorValue` (`packages/native/js/host.ts`). Missing feature.
- **Workaround:** `cursor: "crosshair"` with the ghost ring drawn as well, so both show.
- **Fidelity:** approximated.
- **Components it hits:** slider (thumb that replaces the pointer).

## No pointer lock, so scrubbing has no virtual cursor

- **Original:** channel fields use Base UI's `NumberField.ScrubArea`: pointer lock, a drawn two-headed arrow in place of the cursor, and unlimited travel.
- **gpuix lacks:** pointer lock and a way to hide the cursor. Missing feature.
- **Workaround:** a press records its x, a move past 3px scrubs by one step per pixel, and a press with no drag starts editing. The fields have `cursor: "ew-resize"` and the OS cursor stays visible, so travel ends at the screen edge.
- **Fidelity:** approximated.
- **Components it hits:** slider's click-to-edit value; any drag-to-scrub field.

## Focus does not select the text

- **Original:** focusing a field selects everything, so typing replaces the old value.
- **gpuix lacks:** programmatic selection on `<input>`: no `select()` / `setSelectionRange`, and no select-on-focus prop (`set_prop` handles `value`, `placeholder`, `readOnly`, `theme`, `minRows`, `maxRows`, in `packages/native/src/custom_elements/input.rs:518`). Missing feature.
- **Workaround:** none. The caret lands where the press was; the screenshot scenario clears the hex field with Backspace.
- **Fidelity:** dropped.
- **Components it hits:** input-copy would want it too; slider's value editor.

## `mouseDown` plus `mouseMove` on one element captures the pointer

- **Original:** pointer handlers on a wrapper do not change what its children receive.
- **gpuix lacks:** the pairing is a side effect: `packages/native/src/renderer.rs:5663` calls `capture_pointer()`, which makes the element the target of the whole gesture. That is what the square, the rails and the scrub fields want, but it is also what broke the shared Tooltip around a clickable child (see limitations/input-copy.md). Bug-shaped trap.
- **Workaround:** the pointer-driven parts own their `onMouseDown` + `onMouseMove` + `onMouseUp` and nothing inside them needs a click. The channel tooltips use the Tooltip's function-children form, so its enter and leave handlers go on the field, and `onMouseMove` is left out of the tooltip trigger.
- **Fidelity:** exact.
- **Components it hits:** tooltip, input-copy, slider, scroll-area (any draggable).

## An absolutely positioned child takes the hit

- **Original:** decorative layers (the checker, the colour, the hairline) never intercept pointer events.
- **gpuix lacks:** the CSS default. `position: absolute` and any non-transparent fill insert a blocking hitbox (`packages/native/src/style.rs:318`, `renderer.rs:5347`), so a swatch whose layers are absolute never received its own click until every layer got `pointerEvents: "none"`. Same trap as limitations/input-group.md, from the other side (click, not hover).
- **Workaround:** `pointerEvents: "none"` on every decorative layer, and a transparent hit-area div (`left: -8`, `right: -8`) over each rail.
- **Fidelity:** exact.
- **Components it hits:** every component built from stacked layers.

## An outside press is per element, so a trigger and its card need geometry

- **Original:** Base UI's Popover treats the trigger, the popup and the nested format menu as one dismissable group.
- **gpuix lacks:** a group-aware outside press in this port's popup primitive. `onMouseDownOutside` fires per element (`renderer.rs:5586`), so the trigger and the anchored card each report the other's presses as outside. gpuix does export `DismissableLayer` (`packages/solid/src/components/floating.ts`), but the shared `PopupSurface` does not use it. Hover flags (what the combobox does) lag the pointer by an event, so the first press after a move closed the popover under a test pointer.
- **Workaround:** `useInside` asks the painted bounds of the trigger and the card whether the press landed on either; an open format menu holds the popover open.
- **Fidelity:** exact.
- **Components it hits:** combobox, select, dropdown (they use hover flags).

## A focus-listening wrapper dims with the rest of the page

- **Original:** n/a (CSS has no focus dimming).
- **gpuix lacks:** an opt-in. Any element with a key listener is focusable, so the popover's wrapper (it handles Escape) dimmed its trigger while the hue thumb had keyboard focus. Already noted in the README for buttons and inputs; this is the wrapper case.
- **Workaround:** `keyboardFocusDim: false` on the wrapper as well.
- **Fidelity:** exact.
- **Components it hits:** any component that listens for keys on a container.

## Box shadows: one layer, no inset

- **Original:** the swatch stacks an inset hairline, a 2px background-coloured gap and a 2px accent ring; the thumb a white border plus a 1px black ring; the surfaces `--shadow-N` stacks.
- **gpuix lacks:** multiple shadows and inset shadows (README translation table).
- **Workaround:** a real 1px border for the hairline; the swatch ring is an `outline` offset by 2 over a background-coloured spread shadow; the thumb is a border plus a 1px outline. Popup surfaces keep the shared `shadow3()`.
- **Fidelity:** approximated.
- **Components it hits:** all.

## No eyedropper, no CSS colour names

- **Original:** the eyedropper uses `window.EyeDropper`, and named colours ("tomato") resolve through a canvas 2D context.
- **gpuix lacks:** an OS screen-colour sampler, and a CSS colour resolver. Missing features.
- **Workaround:** the eyedropper button is not rendered (the original hides it where the API is missing, which leaves the format menu at half width, as here). `parseColor` reads hex, rgb(a), hsl(a) and oklch only; a swatch it cannot read throws.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Rail semantics and tabular digits

- **Original:** Radix Slider sets `aria-valuenow`, `aria-valuemin` and `aria-valuemax`; `tabular-nums` keeps the channel digits from jittering while scrubbing.
- **gpuix lacks:** `aria-valuenow` / `aria-valuemin` / `aria-valuemax` (`HostProps` has `aria-valuetext` only), and OpenType feature styles (`font-variant-numeric`). Missing features.
- **Workaround:** the thumb carries `role="slider"` and `aria-valuetext`. Digits stay proportional.
- **Fidelity:** dropped for the number features, approximated for the semantics.
- **Components it hits:** slider, table.

## Surface ladder above level 3, and the sized variant

- **Original:** the panel and its menus climb `--surface-3` to `--surface-8`; every part follows a `size` pin (36px or 28px).
- **gpuix lacks:** nothing: a token gap in this port. `lib/theme.ts` carries only `card`, so the levels 3 to 8 live in the component, and `size` is not ported (the default 36px step only).
- **Workaround:** a local ladder for dark; light is white at every level, as in the source.
- **Fidelity:** exact for default size, dropped for compact.
- **Components it hits:** dropdown, select, dialog (they would want the same ladder in the theme).

## Colour and layout animation

- **Original:** `transition-colors duration-80` on the fields and triggers; the popover and menu enter with `scaleY: 0.96`; the chevron rotates 180 degrees.
- **gpuix lacks:** colour transitions, transforms (known).
- **Workaround:** states switch instantly; the popup slides 4px and fades; the chevron is swapped for a lucide `chevron-up`.
- **Fidelity:** approximated.
- **Components it hits:** all.
