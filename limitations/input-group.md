# input-group

Original: `registry/default/input-group.tsx`. Ported in `src/components/input-group.tsx`, demo in `src/demos/input-group.tsx`.

## A filled child hides the pointer from its ancestors' hover

- **Original:** the group's `mouseenter` / `mousemove` / `mouseleave` fire for the whole box, wherever the pointer is inside it. The field nearest the pointer draws its own `bg-muted/50` and ring, so the field under the pointer changes its background while it is hovered.
- **gpuix lacks:** CSS-like bubbling of hover. Any element with a non-transparent background, `position: absolute` or `pointerEvents: "auto"` inserts a blocking hitbox (`packages/native/src/style.rs:318` `should_occlude`, `packages/native/src/renderer.rs:5347`), and GPUI's hit test stops there, so its ancestors stop being hovered while the pointer is over it. Painting a fill on the field made the group get `mouseLeave`, the field lost its fill, the group got `mouseEnter` again, and so on. This is a bug-shaped trap rather than a missing feature: nothing says a fill is also a hit target. It is why fluid hover's rows must stay transparent, and why `pointerEvents: "auto"` on a field (to make it clickable) silently killed the group's hover.
- **Workaround:** the fill and ring live on an absolutely positioned `pointerEvents: "none"` layer behind the field's content, so the field has no hitbox of its own. No `pointerEvents: "auto"` anywhere inside a hover scope; disabled uses `"none"`.
- **Fidelity:** exact, but every component with a lit surface inside a fluid-hover scope needs the same split.
- **Components it hits:** any fluid-hover consumer that fills its rows (menus, sidebar rows with an active background).

## `<input>` has no `disabled`

- **Original:** `disabled` on the control removes it from the tab order and blocks focus, selection and typing.
- **gpuix lacks:** a `disabled` prop on `<input>` (`packages/native/js/host.ts` `InputProps` has `readOnly` only; `packages/native/src/custom_elements/input.rs:522`). `readOnly` still takes focus and shows a caret.
- **Workaround:** `readOnly` plus `pointerEvents: "none"` on the field, and `opacity: 0.5`. A keyboard user can still tab into the field.
- **Fidelity:** approximated (focusable by Tab, otherwise inert). Missing feature.
- **Components it hits:** input-group; combobox and input-message would need the same.

## No label association

- **Original:** Base UI `Field.Label` sets `htmlFor`, so a click on the label focuses the control, and `Field.Error` feeds `aria-describedby` / `aria-invalid`.
- **gpuix lacks:** a label-for relationship, `aria-describedby`, `aria-invalid` (`packages/native/js/host.ts` `HostProps` lists `aria-label`, `aria-description`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`, `aria-id`, `role` only). Missing feature.
- **Workaround:** the label's `onClick` focuses the input through `renderer.focusElement`, and the input carries `aria-label` set to the label text. The error text is not announced with the field.
- **Fidelity:** approximated for pointer users, dropped for the error announcement.
- **Components it hits:** input-group, combobox, input-copy.

## Headless pointer needs extra moves to light a hover scope

- **Original:** n/a (a test-harness note, not a runtime gap).
- **gpuix lacks:** nothing in a live window, where moves are continuous. With `renderer.nativeSimulateMouseMove`, the first move into a group only produced `mouseEnter` (no `mouseMove`), and a second move at nearly the same point sometimes produced nothing, so the fluid hover pick never ran. Two more small moves inside the field reliably did.
- **Workaround:** `pointAt()` in the demo steps twice after hovering.
- **Fidelity:** exact in a live window.
- **Components it hits:** every fluid-hover demo that captures a hover state.

## `transition-all duration-80` on the field ring and fill

- **Original:** the ring and fill fade over 80ms between rest, hover and focus.
- **gpuix lacks:** colour transitions (already in the README translation table); `motion` animates layout props and opacity only.
- **Workaround:** the states switch instantly.
- **Fidelity:** dropped.
- **Components it hits:** all.
