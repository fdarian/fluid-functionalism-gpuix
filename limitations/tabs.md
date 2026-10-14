# tabs

Original: `registry/base/tabs.tsx`. Ported in `src/components/tabs.tsx`, demo in `src/demos/tabs.tsx`.

Ported: `Tabs` (controlled, `defaultValue`, first-tab fallback), `TabsList` (muted track, raised selected pill, dimming, hover preview that is born at the selected pill and glides home when the pointer leaves), `TabItem` (with and without icon, ghost-span label, stroke 1.5 / 2), `TabPanel`, the compact size, arrow / Home / End selection. Not ported: the `selectedIndex` / `onSelect` index API (value-based only), the elevation ladder (`useSurface`): the pill is always surface 4.

Hover uses the shared `createFluidHover` with `axis: "x"` (the option was added for this group), so the track's padding resolves to the nearest tab like the original. Transforms are already a known gap and are not repeated.

## No `:focus-visible` in JS, so the focus ring does not travel

- **Original:** one ring in the list springs from tab to tab and is drawn only when the focused tab matches `:focus-visible`.
- **gpuix lacks:** a way to read the focus modality (see [accordion.md](accordion.md)). `onFocus` / `onBlur` carry no `relatedTarget` either (`EventPayload` in `packages/native/index.d.ts`), so "focus left the list" is not answerable from the event. Missing feature.
- **Workaround:** each tab has a native `focusVisible` outline (1px, offset 1, which is where the ring sits). A tab's blur defers one microtask and asks `getFocusedElementId()` whether focus landed on a sibling before dropping the highlight. Arrow keys move focus with `renderer.focusElement` (focusing an enabled tab selects it, as `activateOnFocus` does), since there is no roving tabindex either; the last-focused tab holds the `tabIndex: 0` and the rest are `-1`.
- **Fidelity:** approximated: right look and keyboard behaviour, but the ring appears per tab instead of gliding.
- **Components it hits:** tabs-subtle, accordion, sidebar, nav menus.

## An empty reactive slot is a real flex child

- **Original:** `{Icon && <Icon />}` renders nothing, so `gap-2` only spaces what exists.
- **gpuix lacks:** every Solid text node becomes a real `text` element (`packages/solid/src/host.ts:209`, `createElement(node.id, "text")`), including the empty placeholder `<Show when={...}>` leaves behind when its condition is false. Inside a `display: flex; gap: 8` row that empty child still takes a gap, so a label with no icon sat 8px too far right. Bug-shaped difference from the DOM.
- **Workaround:** `gap` is set only when the icon exists (`gap: icon === undefined ? 0 : 8`).
- **Fidelity:** exact.
- **Components it hits:** anything with a conditional child in a flex row with `gap`: buttons with optional icons, menu rows, tabs-subtle.

## Layer opacity needs its own element

- **Original:** `transition={{ ...spring.moderate, opacity: { duration: 0.08 } }}`: position on a spring, opacity on a tween, one element.
- **gpuix lacks:** per-property transitions: a `motion` node has one `MotionTransition` (`packages/native/src/motion.rs:155`). Missing feature.
- **Workaround:** each pill is two nested `motion.div`s: the outer animates `left` / `top` / `width` / `height` on the spring, the inner animates `opacity` on the tween.
- **Fidelity:** exact, one extra element per pill.
- **Components it hits:** accordion, tabs-subtle, any layer that glides and fades on different curves.

## Colour changes are instant

- **Original:** `transition-[color,font-variation-settings] duration-80` on the label and `transition-[color,stroke-width]` on the icon.
- **gpuix lacks:** transitions on state or colour changes (`motion` animates only `width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`: `packages/native/src/motion.rs:14`). Already in the README table for hover colours.
- **Workaround:** none: the label colour, weight and icon stroke switch in one frame.
- **Fidelity:** approximated: an 80 ms ease is dropped.
- **Components it hits:** every component with a coloured label.

## `--shadow-4` is one drop shadow plus a border

- **Original:** the selected pill carries `--shadow-4`: a 1px ring plus three stacked drops (and an inset highlight in dark).
- **gpuix lacks:** stacked and inset shadows (known: README's `shadow-surface-3` row).
- **Workaround:** the same recipe as the popups: a 1px border in `popupBorder` and the largest single drop (`shadow3()`).
- **Fidelity:** approximated.
- **Components it hits:** every raised surface.
