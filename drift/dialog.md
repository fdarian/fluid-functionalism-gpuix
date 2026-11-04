# dialog

Original: `registry/base/dialog.tsx` (Base UI Dialog + Motion), demo in `app/docs/dialog/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/dialog.tsx`, demo in `src/demos/dialog.tsx`.

Dialog, DialogTrigger, DialogContent (`sm` / `lg` / `xl`, compact, `position`, `showCloseButton`, scoped), Header, Footer, Title, Description and Close are ported, composed over gpuix's own headless `Dialog` (`packages/solid/src/components/dialog.ts`): a full-window layer, a backdrop, a popup, Escape handling and focus in / out. Sizes (400 / 540 / 880, 360 / 480 / 800 compact), padding 24, header gap 6 and margin 16, footer gap 8 and margin 24, the ghost icon close button at top 12 / right 12, the title and body type steps, the `slow` spring in and `slowExit` tween out, the scrim values and Escape-only-the-top-layer all match the source.

`modal={false}` matches the source too. Base UI still renders the Backdrop (`fixed inset-0`, no `pointer-events: none`) and counts a press on it as outside, so the scrim takes the press, the page control under it is not pressed, and a press on the trigger lands on the scrim and closes the dialog. The port's `DialogBackdrop` sets `pointerEvents: "auto"` because gpuix's `DialogPortal` sets `"none"` on a non-modal layer; gpuix's own backdrop click then closes it. No drift.

## The panel is centred by a flex layer, not `x: -50%` / `y: -50%`

- **Cause:** `port choice` (gpuix's `Dialog` renders a full-window layer to place the popup in, and the flex centring puts the box on the same pixels).
- **Original:** the panel is `left-1/2 top-1/2` with `x: "-50%"` / `y: "-50%"` on the Motion element, and springs from `scale: 0.97` with opacity on `spring.slow`, back on `spring.slow.exit` (`registry/base/dialog.tsx:271-273`, `:286-293`).
- **Port:** the panel springs from `scale: 0.97` and opacity on `tween.slow` in and `tween.slowExit` out, about its own centre (`src/components/dialog.tsx:198-208`); the layer centres it with flex (`:147-155`), `paddingTop` 12vh for `position="top"`. `scripts/check-dialog.tsx` reads the panel at 400 x 70 centred in 800 x 600 at rest.
- **Workaround:** none needed; the scrim fades on the same pair (`:165-177`).
- **Fidelity:** exact (the same box and the same origin; only the way it is centred differs).
- **Components it hits:** just this one; the command menu's dialog centres its panel the same way.

## Focus lands on the first tab stop one tick after open

- **Cause:** `gpuix gap`.
- **Original:** Base UI focuses the first tabbable inside the popup as it opens.
- **Port:** `FocusFirst` calls `focusNextWithin(popup.id)` in a `setTimeout(0)` (`base-ui:src/dialog/popup/focus-first.ts:8-18`).
- **gpuix lacks:** a first-tabbable initial focus: `DialogPopup` focuses the popup itself by default (`packages/solid/src/components/dialog.ts:182`), and native's tab order exists only once the popup has painted (gpuix README, Dialog), so `focusNextWithin` from mount finds no stop and gpuix's own focus on the popup lands after that mount (checked: calling it synchronously left focus on the popup).
- **Workaround:** the deferred `focusNextWithin`; for one tick the popup holds focus.
- **Fidelity:** approximated (one tick late).
- **Components it hits:** mobile-drawer (reuses `FocusFirst`).

## Surface levels: only the dialog and popups read the ladder

- **Cause:** `not ported yet`. The ladder is `src/lib/surface-context.ts` (`SurfaceContext`, `useElevatedSurface`). `DialogContent` (`min(substrate + 4, 8)`) and `PopupSurface` (`+ 2`) read and provide it, so a dialog on the page is surface-5, a dialog from a dialog surface-8 and a select or combobox inside a dialog surface-7 (`registry/base/dialog.tsx:189-190`, `registry/default/lib/elevated.tsx:39-41`). Nothing else reads it.
- **Original:** every surface component reads `useSurface()` and provides its own level to its children.
- **Port:** tabs (`+ 3`), the mobile drawer (`+ 2`), the color picker, the dropdown submenu and inline panel and the cards use fixed levels, so inside a dialog they sit lower than they do in the source (dark mode only; light mode is `#FFFFFF` at every level).
- **Fidelity:** approximated in dark mode (light mode is `#FFFFFF` at every level; only the shadow weight differs).
- **Components it hits:** tabs, mobile-drawer, color-picker, dropdown (submenu, inline panel), sidebar, card.

## Scoped dialog: no portal target, and the top offset is 24px

- **Cause:** `port choice` (the overlay is drawn in place because gpuix's `Dialog` renders no element of its own, `src/components/dialog.tsx:80-85`; the 24px reason is not stated).
- **Original:** `container={element}` portals the overlay and panel into that element, `absolute` instead of `fixed` (`registry/base/dialog.tsx:168-173`, `:213`, `:231`, `:271`). `position="top"` still sits `12dvh` of the viewport down (`:273`).
- **Port:** `<Dialog scoped>` draws into the nearest `position: relative` ancestor (`src/components/dialog.tsx:240-261`), and `position="top"` sits 24px down when scoped (`:145`, `:153`). The prop is a boolean, not an element.
- **Workaround:** n/a.
- **Fidelity:** approximated (same layering; different API and offset).
- **Components it hits:** just this one.

## `DialogContent` takes no `className`, `style` or `ref`

- **Cause:** `not ported yet`.
- **Original:** `className`, `style`, `ref` and every div attribute pass through, and the docs say `xl` is a canvas for composed layouts: `className="p-0"` plus a fixed height (`registry/base/dialog.tsx:163-166`, `:261-285`, docs `app/docs/dialog/page.tsx:70`). Header, Footer, Title and Description take `className` too (`:325-381`).
- **Port:** the props are fixed (`size`, `compact`, `showCloseButton`, `position`, `testId`; `src/components/dialog.tsx:125-134`), padding is 24 (`:213`), and Header, Footer, Title and Description take only children (`:264-331`).
- **Workaround:** none.
- **Fidelity:** dropped (no zero-padding canvas, so the sidebar block cannot be built).
- **Components it hits:** just this one.

## `DialogTrigger` and `DialogClose` take one child only

- **Cause:** `port choice` (the single child becomes the control through gpuix's `asChild`; the children-as-label form has no use there; reason not stated beyond the comment at `src/components/dialog.tsx:111`).
- **Original:** `render={<Button/>}`, `asChild`, or plain children, plus any button attribute (`registry/base/dialog.tsx:118-160`).
- **Port:** `props.children` is the control; no `render`, no `asChild`, no other props (`src/components/dialog.tsx:111-119`, `:121-123`).
- **Workaround:** n/a.
- **Fidelity:** dropped (the surface), exact for the single-child case.
- **Components it hits:** just this one.

## Demo variants

- **Cause:** `not ported yet` (the sidebar block); `port choice` for the rest (the demos exist to exercise behaviour; reason otherwise not stated).
- **Original:** the page has Basic, Sizes (sm / lg / xl) and "With a sidebar" (`registry/blocks/dialog-sidebar/settings-dialog.tsx`, a `SettingsDialog` over an `xl` dialog, a Sidebar of five sections, a ScrollArea of controls, and a Select that takes over below `sm`), then the props tables (`app/docs/dialog/page.tsx:152-208`).
- **Port:** Basic (with a non-modal button beside it), Stacking (a Select and a nested Dialog), Sizes, and Scoped to a container (`src/demos/dialog.tsx:171-268`). Basic and Sizes copy matches the source. Missing: "With a sidebar" (blocked by the `className` entry above). Extra: non-modal, Stacking, Scoped, which the source page does not show. The props tables and code snippets are not in the demo.
- **Workaround:** none.
- **Fidelity:** dropped for the sidebar block.
- **Components it hits:** sidebar, scroll-area, switch, select, input-group (the block uses them).
