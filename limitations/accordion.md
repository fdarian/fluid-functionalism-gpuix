# accordion

Original: `registry/base/accordion.tsx`. Ported in `src/components/accordion.tsx`, demo in `src/demos/accordion.tsx`.

Transforms (the chevron's 90 degree rotation becomes a `chevron-right` / `chevron-down` swap) are already known and not repeated here. The docs playground (live controls) is not ported.

## Absolute or filled elements block their parent's mouse events

- **Original:** a child (an absolutely positioned label, an overlay, a coloured dot) never affects its parent's hover or click: DOM mouse events bubble through it, so the row's `mousemove` still fires over its own label and a button is clickable over its own icon.
- **gpuix lacks:** any `position: absolute` / `fixed` box, and any box with a non-transparent fill, inserts a mouse hitbox, so the pointer over it never reaches an ancestor's `onMouseMove` / `onMouseEnter` / `onClick`. `should_occlude` in `packages/native/src/style.rs:317` returns true for those unless `pointerEvents: "none"`, and `renderer.rs:5335` turns that into `block_mouse_except_scroll`. A bug-shaped difference from the DOM: the opt-out exists, but the default is the opposite of HTML. It showed up here as fluid hover going dead exactly over the visible label of a row (the label `<text>` is absolute over its hidden bold copy), and in carousel-dots as dots that ignored hover and clicks over their own coloured pill (see [carousel-dots.md](carousel-dots.md)).
- **Workaround:** `pointerEvents: "none"` on every absolute or filled decoration inside a hover or click target.
- **Fidelity:** exact once applied.
- **Components it hits:** any component using the ghost-span label (sidebar, tabs, tabs-subtle, nav rows), and any button or row with a filled child. `src/components/sidebar.tsx` `RowLabel` has the same absolute `<text>` without `pointerEvents: "none"`.

## `motion` animates eight numbers, not colours

- **Original:** the open tint fades with `animate={{ opacity }}` on a `bg-accent/20` layer; the item's own background could also transition.
- **gpuix lacks:** `MotionStyle` is `width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius` (`packages/native/src/motion.rs:14`). No `backgroundColor`, margin or padding, so a colour change cannot be tweened. Missing feature.
- **Workaround:** the tint is an always-mounted absolute layer filling the item (`top/left/right/bottom: 0`) whose opacity is animated; it is a child of the item, so it follows the item's height for free, with no measuring.
- **Fidelity:** exact for the fade.
- **Components it hits:** any state that fades a fill (tabs hover pill, sidebar active row).

## One transition per `motion` node

- **Original:** framer takes per-property transitions: height on `spring.fast`, opacity on its own 60 ms tween (`transition={{ ...spring.fast, opacity: { duration: 0.06 } }}`).
- **gpuix lacks:** a `motion` node has one `MotionTransition` for all its properties (`packages/native/src/motion.rs:155`, `transition` in `MotionProps`, `packages/native/js/host.ts`). Missing feature.
- **Workaround:** two nested `motion.div`s: the outer springs `height`, the inner tweens `opacity`.
- **Fidelity:** exact, one extra element.
- **Components it hits:** tabs-subtle (label width plus opacity), any panel that fades while it resizes.

## `height: auto` cannot be animated

- **Original:** the panel animates to a measured layout height; framer would otherwise resolve `auto`.
- **gpuix lacks:** `motion` interpolates plain pixel numbers; there is no `auto` target (`packages/native/src/motion.rs:14`, `apply_to` writes `DimensionValue::Pixels`). Missing feature.
- **Workaround:** the inner box reports its height through `onLayout` (`src/lib/measured-height.ts`) and the outer box animates between 0 and that number. An open panel keeps `height: auto` until the first report lands. Content that later changes size reports again.
- **Fidelity:** exact; the spring starts a frame after the layout.

## A closed panel cannot be `display: none`

- **Original:** the closed panel is `hidden` once its exit is over, so nothing in it is read out.
- **gpuix lacks:** `display: none` (`apply_styles` reads only `flex` and `grid`, `packages/native/src/renderer.rs:6384-6388`). Missing feature.
- **Workaround:** the panel's text is unmounted when the exit is over (and for a panel that mounts closed, after its first paint), and mounted again on open; the measured height is kept, so the spring still runs. The region keeps its trigger's text as `aria-label` since `aria-labelledby` is not available.
- **Fidelity:** exact for reading and focus, as the panel holds text only.
- **Components it hits:** accordion, the sidebar sub-menu (same workaround), tabs-subtle's collapsing labels.

## No `:focus-visible` in JS, so no traveling focus ring

- **Original:** one focus ring in the group springs between rows, drawn only when the focused row matches `:focus-visible`.
- **gpuix lacks:** `focusVisible` is a native state style on one element (`packages/native/js/host.ts:262`); `onFocus` carries no modality, so JS cannot tell a keyboard focus from a click focus and cannot drive a shared, moving ring. Missing feature.
- **Workaround:** each trigger carries its own `focusVisible` outline (1px, offset 1, which is where the original ring sits). It appears and disappears per row instead of gliding. Arrow / Home / End (group only: Base UI 1.9.0 has none, the Radix variant the FF site shows does) move focus with `renderer.focusElement`, and every trigger is a tab stop through `tabIndex: 0`; keyboard focus also drives the shared hover highlight as in the original.
- **Fidelity:** approximated: right look, no travel.
- **Components it hits:** tabs, tabs-subtle, sidebar and every list with the shared ring.

## Highlight layers cannot interleave by z-order

- **Original:** the expanded tint, the hover fill and the rows stack: tint under hover under the rows.
- **gpuix lacks:** no `zIndex`, so paint order is document order. The shared hover highlight must be the group's first child, which puts it under each item's tint instead of over it.
- **Workaround:** none needed visually: both are translucent, and the blend differs from the original by a few percent of lightness while a row is hovered and open.
- **Fidelity:** approximated.
- **Components it hits:** any component with a persistent tint plus the shared hover highlight.
