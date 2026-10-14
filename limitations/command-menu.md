# command-menu

Original: `registry/default/command-menu.tsx`. Ported in `src/components/command-menu.tsx`, demo in `src/demos/command-menu.tsx`.

Everything the docs page shows is ported and renders in both themes: the field, subtle tabs, filters, grouped rows with descriptions, shortcut caps and disabled rows, suggestions, the empty state, the footer hints (with the highlighted row's Enter action), custom rows, and the dialog. Seven gaps, most of them in input and event handling rather than styling.

## `<input>` consumes ←, → (and Home, End) before JS hears them

- **Original:** the field's `onKeyDown` switches tabs on ← / → (and jumps to the first / last row on Home / End while the query is empty), calling `preventDefault()` so the caret does not move.
- **gpuix lacks:** a way to intercept those keys. The single-line input binds `left`, `right`, `home`, `end` (and their shift / cmd variants) as GPUI actions (`packages/native/src/custom_elements/input.rs:200-209`, handlers at `:1669-1690`), and an action consumes the keystroke, so `onKeyDown` is never called for them. `up`, `down`, `escape` and typed keys do arrive. Missing feature: no opt-out of the editor's bindings and no "before the editor" key hook.
- **Workaround:** none for the keys. The handler is written, so it works the moment the keys reach it; tabs switch by click only, and the footer still advertises `Tabs ← →` like the original, which is therefore a hint that does nothing today.
- **Fidelity:** dropped (keyboard tab switching, Home / End).
- **Components it hits:** any component that drives a list or tabs from a text field's arrow keys (combobox has the same Home / End gap; dropdown-search ← / →).

## No global shortcut for the dialog

- **Original:** `CommandMenuDialog` binds ⌘K (any combo) on `window`, from wherever focus is.
- **gpuix lacks:** a way for a component to register a window key handler. Window key events only reach the `onKeyDown` passed to `render()` (`packages/solid/src/root.ts:85-104`, `WindowKeyEventHandlers` in `packages/native/js/host.ts`), which a component cannot reach without editing `src/main.tsx`. Missing feature.
- **Workaround:** the dialog opens from a button (`open` / `onOpenChange`); the `⌘K` cap beside it is display only. Escape from the field, a press outside the panel, and a pick all close it.
- **Fidelity:** dropped (the shortcut), exact for the rest.
- **Components it hits:** any "press a key anywhere" affordance (sidebar search `⌘K`, dialog Escape when focus is outside the panel).

## A positioned or absolute element eats the mouse for its ancestors

- **Original:** a `position: relative` / `absolute` child is paint-only; hover and clicks still reach the tab or row it sits in.
- **gpuix:** any element with `position` set (or a fill) gets `block_mouse_except_scroll` (`packages/native/src/renderer.rs:5336-5352`, `style::should_occlude`), which stops the hit test there, so the tab behind a positioned label never saw hover or click. `StyleDesc.pointerEvents` documents this (`host.ts`) but only `"none"` opts out. A bug-shaped trap rather than a missing feature: it is HTML-unlike and silent.
- **Workaround:** `pointerEvents: "none"` on the ghost-span label wrapper and on both texts in the tab label. The sidebar's `RowLabel` uses the same ghost-span trick; it was not checked there.
- **Fidelity:** exact once set.
- **Components it hits:** every port of the semibold ghost-span trick (tabs, tabs-subtle, sidebar rows, menu rows); the shared highlights already set it.

## `scrollIntoView` scrolls to the scroller's direct child, not to the element

- **Original:** `scrollTop` is computed from the row's `offsetTop`, and the viewport is centred on the keyboard row on a spring.
- **gpuix lacks:** an element-accurate scroll. `HostElement.scrollIntoView()` finds the scroller's *direct child* that contains the element and scrolls to that (`packages/native/src/renderer.rs:3860-3890`). With the README's required layout (rows and overlay in one relative wrapper inside the scroller) that child is the whole wrapper, so it never moves. Behaves as designed, but not what the name says.
- **Workaround:** `renderer.getElementBounds` for the row and the scroller plus `getScrollOffset`, then `scrollTo(0, -target)` to centre the row (native clamps at the end). The viewport jumps instead of springing, while the highlight still glides.
- **Fidelity:** approximated (centred, but instant).
- **Components it hits:** combobox, select, dropdown and any keyboard-driven list in a scroller.

## Panel height does not follow its rows

- **Original:** the panel measures its column (`ResizeObserver`) and springs `height` to it on `moderate`, so filtering shrinks the panel smoothly.
- **gpuix lacks:** nothing now: `motion` can animate `height` and `onLayout` reports the column's height after the first paint and on every change (`src/lib/measured-height.ts`, as the accordion does). Not ported yet.
- **Workaround:** none; the panel snaps to its new height when the rows change.
- **Fidelity:** dropped.
- **Components it hits:** none in gpuix terms; the accordion, the sidebar sub-menu, input-message and thinking-steps already use `onLayout` for the same job.

## Scroll divider and scroll fade

- **Original:** `ScrollArea` with `scroll-divider` (hairlines that strengthen once rows pass under them) and `scroll-fade` (32px mask at the clipped edges).
- **gpuix lacks:** `mask-image`, and any scroll-linked style. Missing feature.
- **Workaround:** a fixed `1px` border above the list (and above the footer). `border-border/60` is the plain `color.border` token; there is no per-use alpha on a token.
- **Fidelity:** approximated (static hairlines, no fade); a clipped row at the list's edge is cut hard, as the screenshots show.
- **Components it hits:** every popup list (combobox, select, dropdown), scroll-area.

## Tab hover pill

- **Original:** the hover pill is `bg-active` at 0.4 opacity, glides from the selected tab, and on leaving glides back to it before fading.
- **gpuix lacks:** nothing structural; `FluidHighlight` (shared) fades out in place and has no "return to" target, and `createFluidHover` only picks along `y`, so the tab row measures rects through it but resolves hover from each tab's `onMouseEnter`.
- **Workaround:** `color.hover` at full alpha instead of `color.active` at 0.4, and a fade-out where the original returns to the selected tab.
- **Fidelity:** approximated.
- **Components it hits:** tabs, tabs-subtle.
