# select

Original: `registry/base/select.tsx`. Ported in `src/components/select.tsx`, demo in `src/demos/select.tsx`.

The component is data-driven (`items`, `value`, `onValueChange`) so the Theme picker in `src/app.tsx` keeps working unchanged. Its defaults (`variant: "inline"`) are that picker's borderless, 28px look; the docs' `bordered` / `borderless` variants, `size: "compact"`, trigger icon, placeholder, groups with labels and separators, disabled items, a disabled select, an error message, a scrolling list, typeahead and the 300 ms pick acknowledgement are ported as optional props.

## `scrollIntoView` cannot reach a row inside a wrapper

- **Original:** Base UI scrolls the highlighted option into view as the arrow keys move and when the popup opens on a selected value.
- **gpuix lacks:** an element-level scroll that finds the right ancestor offset. `scroll_element_into_view` walks up to the nearest scroller and scrolls to *the scroller's direct child that contains the element* (`packages/native/src/renderer.rs:3860` and `scroll_target` at `:3874`). Rows sit inside the relative overlay wrapper (an absolute child of a scroller is painted where it was placed, not where the content scrolled to, so the wrapper is mandatory), which makes the wrapper the only direct child: the call scrolls to child 0, i.e. nowhere. The combobox's `rowElements.get(next)?.scrollIntoView()` has the same problem. Missing feature (it should scroll to the element's own box).
- **Workaround:** `revealRow` reads the row's measured rect (already in content space), the scroller's bounds and `getScrollOffset`, and calls `scrollTo` with the new negative offset.
- **Fidelity:** exact for the end state; the jump is instant where Base UI's is too.
- **Components it hits:** combobox, command-menu, dropdown, anything with a keyboard-driven list inside a wrapper.

## Popup width tracks the trigger only through a bounds read

- **Original:** `min-w-[var(--anchor-width)]` on the popup, which then grows to its widest option.
- **gpuix lacks:** a size relation between an anchored layer and its anchor (`anchored.rs` has position props only) and an intrinsic-width popup that also respects a minimum. `PopupSurface` takes a fixed `width`.
- **Workaround:** on open, `getElementBounds` of the trigger wrapper gives the width; `popupWidth` is a manual minimum for long labels (the timezone list). The read is null until the wrapper has painted once, so opening before the first frame would throw. Missing feature, plus a trap: nothing in the type says the read can be null.
- **Fidelity:** approximated (popup never grows past the width it was given, long labels ellipsize).
- **Components it hits:** combobox (constant width), dropdown (`min-w` anchor), and every popup sized to its trigger.

## Animated check mark

- **Original:** the check is an SVG `path` whose `pathLength` animates 0 → 1 over 80 ms on pick and back over 40 ms on exit.
- **gpuix lacks:** animating anything inside an SVG. `motion` only drives `width`, `height`, `opacity`, `top`/`right`/`bottom`/`left` and `borderRadius` (`packages/native/js/host.ts:22`), and an `<svg source>` is a single tinted glyph, so there is no stroke-dash or path progress. Missing feature.
- **Workaround:** the check fades in over 80 ms, and only for a pick made while the popup is open (a row checked at open is shown finished, like `initial={false}`). No exit animation: the check is removed.
- **Fidelity:** approximated.
- **Components it hits:** dropdown, checkbox group, command-menu checked rows.

## Empty `Show` placeholders take a flex `gap` slot

- **Original:** `{error && <span/>}` renders nothing, so `gap-1` adds no space.
- **gpuix lacks:** the same. Solid's universal renderer inserts an empty text node for a false `Show` (`packages/solid/src/host.ts:137` `createHostText`), and that host node counts as a flex child, so `gap` adds 4px under a select that has no error. A bug, or at least a surprise; it moved the Theme picker 2 px until the gap was replaced with a `paddingTop` on the error line.
- **Workaround:** no `gap` on a column whose last child is conditional; pad the conditional child instead.
- **Fidelity:** exact once worked around.
- **Components it hits:** any flex column or row with `gap` and a conditional child (input-message, banner, dialog footers).

## Popup placement is manual

- **Original:** Base UI's Positioner flips the popup to the side with room.
- **gpuix lacks:** a flip that clears the trigger (README: `fit="switch"` anchors to the far edge and covers it). Missing feature.
- **Workaround:** `side` is chosen on open from the trigger's bounds, the window height and the list's estimated height (item, label and separator heights summed, capped at 300), like the combobox does. The timezone list flips above the trigger because 300px does not fit below it at that scroll position.
- **Fidelity:** approximated.
- **Components it hits:** combobox, dropdown, every anchored popup.

## Smaller notes

- **Border alpha tokens:** `border-destructive/50` and `bg-border/60` have no runtime mix, so both are resolved to rgba literals per scheme next to the component. Already known (`color-mix`); no theme token added.
- **Focus lives on the trigger:** gpuix rows are not focusable, so the keyboard drives a highlight index while focus stays on the trigger (Base UI moves real focus into the popup). Typeahead listens on the trigger through `src/lib/typeahead.ts` (Base UI's `useTypeahead` rules); a closed trigger commits the match without opening, like Base UI. On close, focus goes back to the trigger only if nothing else took it.
- **Press, drag, release:** the popup opens on mouse-down; a release over a row picks it after 400 ms or an 8px drag. Base UI also closes the popup when that release lands outside the trigger and popup; gpuix has no mouse-up-outside event, so the popup stays open there.
- **Not ported (FF styling layer):** the keyboard focus ring that springs between rows and the click-in-the-gap-picks-the-nearest-row handler.
- **Scrollbar and scroll fade:** the list is a bare `overflowY: "scroll"` (see the README's ScrollArea row).
- **Form props** (`name`, `required`, the hidden input): no form integration in gpuix, not ported.
