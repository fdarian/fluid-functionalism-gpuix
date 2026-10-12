# tooltip

Original: `registry/base/tooltip.tsx`. Ported in `src/components/tooltip.tsx`, demo in `src/demos/tooltip.tsx`.

All four sides, rich content, per-tooltip and provider delay with skip-delay grouping, `forceOpen` and `followCursor` are ported. Three gaps changed the API or the behaviour.

## A filled child hides the pointer from its ancestors

- **Original:** `Tooltip.Trigger render={children}` merges its hover and focus handlers onto whatever element the caller passes, so `<Tooltip><Button/></Tooltip>` just works. DOM `mouseenter` also fires on an ancestor while the pointer is over a descendant.
- **gpuix lacks:** the same ancestry. An element with a non-transparent fill, `position: absolute`, or `pointerEvents: "auto"` inserts a blocking hitbox (`packages/native/src/style.rs:317` `should_occlude`, applied at `renderer.rs:5335`). GPUI's hover set stops at that hitbox, so a wrapper's `onMouseEnter` / `onMouseMove` never fire while the pointer is over such a child. `Button` sets `pointerEvents: "auto"` and paints a fill, so a wrapper around it never sees the hover. A bug in spirit (CSS `:hover` and `mouseenter` cascade up), a missing feature in the letter of GPUI's hit testing.
- **Workaround:** `Tooltip` children may be a function, `(trigger) => <el {...trigger} />`, receiving `onMouseEnter` / `onMouseMove` / `onMouseLeave` / `onMouseDown` to spread on the trigger. A plain unfilled child still works through the wrapper. The demo therefore uses a local `TriggerButton` that looks like `Button`, because `Button` does not take those handlers.
- **Fidelity:** approximated (different API, same behaviour).
- **Components it hits:** any wrapper that needs hover on a filled or `auto` child: dropdown triggers, tabs with tooltips, sidebar rail handle.

## mouseDown plus mouseMove on one element captures the pointer

- **Original:** the trigger's handlers are passive; the child's click always arrives.
- **gpuix lacks:** the same. gpuix calls `capture_pointer()` on any element that has both `onMouseDown` and `onMouseMove` (`packages/native/src/renderer.rs:5663`), so mouseUp and click go to that element instead of the child under it. The first version of the wrapper listened to both on every tooltip and swallowed the clicks of buttons and rows inside it (reported by the input and chat groups). A surprise: nothing signals that listening to both changes where the release goes. Bug-shaped trap.
- **Workaround:** `onMouseMove` is attached only when `followCursor` is set; `onMouseDown` (dismiss on press) stays.
- **Fidelity:** exact, except that a follow-cursor tooltip still captures the press of its own trigger.
- **Components it hits:** any wrapper that tracks the pointer and also listens for a press.

## `<anchored align="center">` offsets the layer twice

- **Original:** Base UI's `Positioner side="top"` centres the popup on the trigger.
- **gpuix lacks:** a correct centre alignment. `wrap_at_trigger` (`packages/native/src/custom_elements/anchored.rs:193` top and bottom, `:217` left and right) centres the zero-sized wrapper with flex, so the layer's origin is already `centre − size/2`, and `resolved_anchor` (`:155`, `:158`) then anchors the layer's own `BottomCenter` / `LeftCenter` at that origin, shifting it by `size/2` again. The chip lands half its width off on top/bottom and half its height off on left/right. A bug.
- **Workaround:** pass an explicit `anchor` (`bottomLeft` for top, `topLeft` for bottom and right, `topRight` for left) together with `align="center"`. The wrapper's centring then places the corner correctly and `gap` still offsets by side.
- **Fidelity:** exact once worked around.
- **Components it hits:** anything centred under or beside its trigger (dropdown, select, popover-like pieces).

## No collision flip

- **Original:** Base UI flips the tooltip to the opposite side when it would leave the viewport and shifts it along the edge.
- **gpuix lacks:** a flip that keeps clear of the trigger. `fit="snap"` (the default, `anchored.rs:352`) slides the layer back inside the window and so can cover the trigger; `fit="switch"` flips to the far edge of the trigger, which the README already notes covers it.
- **Workaround:** `fit` stays at its snap default; the demo keeps triggers clear of the window edge. Missing feature.
- **Fidelity:** approximated.
- **Components it hits:** every anchored popup.

## Focus opens the tooltip

- **Original:** a keyboard-focused trigger (`:focus-visible`) opens the tooltip too.
- **gpuix lacks:** an `onFocus` that says whether focus came from the keyboard (`style.focusVisible` exists only as a style state), so hover is the only trigger. Missing feature.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** any component whose focus has a side effect (dropdown typeahead, combobox).

## Smaller notes

- `followCursor` is `offset` on the layer, set from `onMouseMove` against `getElementBounds` of the wrapper (null on the first call, which only switches tracking on, so the first move is skipped). Exact, with a frame of lag.
- The `scaleY` of the popup enter and the rotated "Move along me" label of the vertical follow area need transforms (already known); the label is stacked in three lines instead.
- Headless screenshots only advance a `motion` spring when a frame is drawn, so scenarios settle twice after a hover to capture the finished state.
