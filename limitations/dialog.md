# dialog

Original: `registry/base/dialog.tsx` (Base UI Dialog + Motion). Ported in `src/components/dialog.tsx`, demo in `src/demos/dialog.tsx`.

Dialog, DialogTrigger, DialogContent (`sm` / `lg` / `xl`, compact, `position`, `showCloseButton`), Header, Footer, Title, Description and Close are ported, composed over gpuix's own headless `Dialog` (`packages/solid/src/components/dialog.ts`): a full-window `<anchored fill="window">` layer, a backdrop, a popup, Escape handling and focus in / out. The "with a sidebar" block (`SettingsDialog`) is a separate composed block, not ported. Probed behaviour (all run headless through the offscreen renderer, screenshots in `screenshots/dialog/`):

| Probe | Result |
|---|---|
| Overlay within the app window | The layer covers the whole window including the sidebar and the customise card. `scoped` renders it inside one region instead (needs a direct-child placement, below). |
| Focus on open | gpuix lands it on the popup itself (`tabIndex -1`); `FocusFirst` then moves it to the first tab stop in the popup with `focusNextWithin`, as Base UI does. It is a tick later (the popup's tree is committed natively after the mount) and must be built through `once()`, or the discarded copy of the portal's children takes a second step and skips the first stop. |
| Focus trap | Works. Tab cycles Cancel, Create, ✕ and wraps; Shift+Tab reverses. The page behind is never reached (`focusNextWithin`, `dialog.ts` popup `onKeyDown`). |
| Focus return | Escape returns focus to the trigger; a nested dialog returns it to the nested trigger. |
| Backdrop | A press closes it (on mouse **down**, not up: down on the backdrop and up on the panel still closes). The click does not reach the page: pressing a sidebar row behind it closes the dialog and does not navigate. |
| Hover behind the backdrop | Blocked: the sidebar's fluid hover does not follow the pointer under the layer. |
| Scroll lock | Works for free: `occlude` also takes the wheel, so wheeling over the backdrop or the panel does not scroll the page. |
| Stacking | A Select opened inside the dialog paints over it, even where it leaves the panel (popups are priority 1, the dialog 0), and a row picked over the backdrop is the topmost hit. A dialog opened from a dialog paints over the first, Escape or a backdrop press closes only the top one. |
| Escape with a Select open inside a dialog | Closes only the popup, then the dialog on the next press. |

## Escape and the dismiss-layer stack (fixed in the shared popup)

- **Original:** Base UI stacks layers; Escape closes only the topmost (the open Select), then the dialog on the next press.
- **gpuix:** its own `Select`, `Combobox` and `Dialog` push a `DismissableLayer` (`packages/solid/src/components/floating.ts`), and the window's Escape default action closes only the top layer (`packages/native/js/renderer-state.ts:205`).
- **Fix:** `PopupSurface` (`src/lib/popup.tsx`) now takes `onDismiss` and registers a `DismissableLayer` while the popup is open, so Select, Combobox and Dropdown all join the stack. Two traps: the default action reads the stack *after* element handlers run, so a component that closes itself on Escape pops its layer first and the same keystroke then reaches the dialog; those handlers call `preventDefault()` while open (a closed select still lets Escape through to the dialog). And the layer is a sibling that exists only while `open`, not through the 60 ms exit fade, so a second Escape in that window is not swallowed.
- **Verified:** the dialog demo's scenarios: Escape with a Select open closes only the popup, the next one closes the dialog.
- **Fidelity:** exact.
- **Components it hits:** select, combobox, dropdown (command-menu's filter select via the same surface); tooltip does not join the stack.

## `position: absolute` is relative to the parent element

- **Original:** the `container` prop portals the overlay into a `position: relative` element, and `absolute` resolves against the nearest positioned ancestor.
- **gpuix lacks:** the nearest-positioned-ancestor rule: an absolute child is placed against its **parent** element, whatever the ancestors' `position`. A first scoped overlay inside a button row came out the size of that row.
- **Workaround:** `Dialog` renders no element of its own, so `DialogContent scoped` can be a direct child of the region (`position: relative; overflow: hidden`), with the trigger in a sibling. Documented on the `scoped` prop.
- **Fidelity:** approximated (placement is constrained).
- **Components it hits:** anything that overlays a region (banner fixed, card selected fill, the sidebar highlight already works around it).

## `overflow: hidden` does not clip to the region's rounded corners

- A scoped overlay in a rounded region paints its square backdrop over the rounded corners. See `limitations/card.md`.
- **Fidelity:** approximated (a few pixels at the four corners).

## Scale 0.97 to 1 on enter and exit

- **Original:** the panel springs from `scale: 0.97`, and the `x: -50%`/`y: -50%` centring is a transform.
- **gpuix lacks:** transforms (known). `motion` animates `opacity`, `top`, `left`, `width`, `height`, `borderRadius` only.
- **Workaround:** the panel is centred by a flex layer (not by translation) and only fades, on the same `slow` spring in and 160 ms tween out. The scrim fades on the same transitions. The unmount waits for `onMotionComplete`, with a 260 ms timer as the fallback the original also keeps for throttled tabs.
- **Fidelity:** approximated (no scale).
- **Components it hits:** every popup that scales in.

## `DialogPortal` builds its children twice

- See `limitations/mobile-drawer.md`: `dialog.ts:117` and `dialog.ts:137` both read the portal's children, so the content exists twice and the discarded copy keeps its effects alive. `once()` in `components/dialog.tsx` builds `DialogContent`'s content once per open. Without it, a nested Dialog or a Select in the content was created twice, with separate state.

## Smaller notes

- `w-[calc(100%-2rem)] max-w-[400px]` is a layer with 16px side padding and a popup of `width: "100%"; maxWidth`; `top-[12dvh]` reads the window height through `createWindowSize()` (live on resize). Both are exact.
- `surface-5` and its shadow: the 1px ring is a border and the stack of drops is the single largest one (see the README's `shadow-surface-3` row); the dark inset highlight is dropped.
- `bg-black/40`, `dark:bg-black/80`: `rgba(0,0,0,.4 / .8)` by scheme.
- Base UI's `actionsRef` / `preventUnmountOnClose` bookkeeping is replaced by a `mounted` signal that outlives `shown` by the fade, because gpuix's `DialogPortal` unmounts the instant `open` goes false.
- A trigger pressed while the exit fade plays reopens it, and one pressed while the dialog is open closes it (Base UI's `useClick` toggles): `DialogTrigger` adds an `onClick` that decides before gpuix's own `setOpen(true)`, which is a no-op while `open` (= `mounted`) is true.
- gpuix keeps its layer up through the exit, so a second close request (backdrop, ✕) arrives after the dialog closed: `setOpen` ignores it, so `onOpenChange(false)` fires once. A second Escape in that window is handed on to the dialog behind: the popup's `onKeyDown` takes the layer down (`finish()`), and gpuix reads the stack after element handlers, so the key reaches the parent.
- A nested dialog paints no second scrim (Base UI's `Backdrop` is off for nested dialogs): the child reads the parent's scope.
- `modal={false}`: gpuix's backdrop dismissal is switched off (`disablePointerDismissal`) and the popup's `onMouseDownOutside` closes on a press anywhere outside it (the scrim takes a press on the trigger too, so that closes it), except, for a scoped dialog, on a trigger outside the overlay (it toggles the dialog itself) and while a dialog opened from it is mounted. Nested non-modal dialogs would need group-aware outside press (README). The scrim still takes the press, as in the original, so a page control under it is not pressed.
- The ✕ is labelled "Close" through `Button`'s `aria-label`.
- Trigger and Close compose through gpuix's `asChild`, so `<DialogTrigger><Button/></DialogTrigger>` spreads the handlers onto the Button's root element; the child must be a single host element.
- Positive: a dialog's DOM-order tab stops (content, then the ✕ last) match the original, and every focus ring is the shared `focusVisible` outline.
