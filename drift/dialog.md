# dialog

Original: `registry/base/dialog.tsx` (Base UI Dialog + Motion), demo in `app/docs/dialog/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/dialog.tsx`, demo in `src/demos/dialog.tsx`.

Dialog, DialogTrigger, DialogContent (`sm` / `lg` / `xl`, compact, `position`, `showCloseButton`, scoped), Header, Footer, Title, Description and Close are ported, composed over gpuix's own headless `Dialog` (`packages/solid/src/components/dialog.ts`): a full-window layer, a backdrop, a popup, Escape handling and focus in / out. Sizes (400 / 540 / 880, 360 / 480 / 800 compact), padding 24, header gap 6 and margin 16, footer gap 8 and margin 24, the ghost icon close button at top 12 / right 12, the title and body type steps, the `slow` spring in and `slowExit` tween out, the scrim values and Escape-only-the-top-layer all match the source.

## CSS transforms (scale 0.97 to 1, and the centring)

- **Cause:** `gpuix gap`. [README "Missing features": CSS transforms](../README.md#missing-features).
- **Original:** the panel springs from `scale: 0.97` on enter and back to it on exit, and `x: -50%` / `y: -50%` centre it (`registry/base/dialog.tsx:286-293`, `:271-273`).
- **Port:** the panel only fades, on `tween.slow` in and `tween.slowExit` out (`src/components/dialog.tsx:322-326`); the scrim fades on the same pair (`:287-291`). A flex layer centres the panel, not a translation (`:248-257`).
- **gpuix lacks:** `scale` and `translate` as styles (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the flex layer and the fade.
- **Fidelity:** approximated (no scale).
- **Components it hits:** every popup that scales in.

## `rem` and `dvh` units

- **Cause:** `gpuix gap`.
- **Original:** `w-[calc(100%-2rem)] max-w-[...]` and `top-[12dvh]` (`registry/base/dialog.tsx:272-273`).
- **Port:** 16px side padding on the layer (`EDGE`, `src/components/dialog.tsx:51`, `:253-254`) and the window height read through `createWindowSize()` (`:57`, `:241`, `:245-246`), which follows a resize.
- **gpuix lacks:** `em`, `rem`, `vw`, `vh`, `vmin` and `vmax` in value strings: the parsers are handed neither the inherited font size nor the window size (`~/code/fdarian/gpuix/FORK.md:749-754`).
- **Workaround:** as above.
- **Fidelity:** exact while the root font size is 16px.
- **Components it hits:** any component sized in `rem` or viewport units.

## `DialogBackdrop` closes on mousedown

- **Cause:** `gpuix gap`.
- **Original:** a backdrop closes on a click that presses and releases on it (Base UI's outside press; not rechecked against Base UI, its source is not on this machine), so pressing on the backdrop and releasing on the panel does not close.
- **Port:** its own backdrop `div` with `onClick`, modal only (`src/components/dialog.tsx:279-284`); the same in `src/components/mobile-drawer.tsx:54-59`.
- **gpuix lacks:** that rule: `DialogBackdrop` closes from `onMouseDown` (`packages/solid/src/components/dialog.ts:145-157`).
- **Workaround:** the own backdrop; it also ignores a request that arrives while the exit plays (`:123-128`), since gpuix keeps the layer up through it.
- **Fidelity:** exact.
- **Components it hits:** mobile-drawer.

## A reactive prop change re-creates `DialogPopup`

- **Cause:** `gpuix gap`.
- **Original:** the popup's `aria-labelledby` / `aria-describedby` can change while it is open.
- **Port:** static ids, always passed, even when no title or description is rendered (`src/components/dialog.tsx:306-309`; the ids at `:144-146`).
- **gpuix lacks:** a stable popup under changing props: `DialogPopup` sits inside a keyed `Show` and builds its element from a spread of its props, so a prop that changes re-creates the element and drops focus (`packages/solid/src/components/dialog.ts:169-209`).
- **Workaround:** the static ids; a reference to a missing id resolves to nothing.
- **Fidelity:** exact.
- **Components it hits:** mobile-drawer, and any gpuix popup given a reactive prop.

## Focus lands on the first tab stop one tick after open

- **Cause:** `gpuix gap`.
- **Original:** Base UI focuses the first tabbable inside the popup as it opens.
- **Port:** `FocusFirst` calls `focusNextWithin(popup.id)` in a `setTimeout(0)` (`src/components/dialog.tsx:199-209`).
- **gpuix lacks:** a first-tabbable initial focus: `DialogPopup` focuses the popup itself by default (`packages/solid/src/components/dialog.ts:162`), and the popup's children are only committed natively after the mount (port comment, `:204`).
- **Workaround:** the deferred `focusNextWithin`; for one tick the popup holds focus.
- **Fidelity:** approximated (one tick late).
- **Components it hits:** mobile-drawer (reuses `FocusFirst`).

## Surface levels: only the dialog and popups read the ladder

- **Cause:** `not ported yet`. The ladder is `src/lib/surface-context.ts` (`SurfaceContext`, `useElevatedSurface`). `DialogContent` (`min(substrate + 4, 8)`) and `PopupSurface` (`+ 2`) read and provide it, so a dialog on the page is surface-5, a dialog from a dialog surface-8 and a select or combobox inside a dialog surface-7 (`registry/base/dialog.tsx:189-190`, `registry/default/lib/elevated.tsx:39-41`). Nothing else reads it.
- **Original:** every surface component reads `useSurface()` and provides its own level to its children.
- **Port:** tabs (`+ 3`), the mobile drawer (`+ 2`), the color picker, the dropdown submenu and inline panel and the cards use fixed levels, so inside a dialog they sit lower than they do in the source (dark mode only; light mode is `#FFFFFF` at every level).
- **Fidelity:** approximated in dark mode (light mode is `#FFFFFF` at every level; only the shadow weight differs).
- **Components it hits:** tabs, mobile-drawer, color-picker, dropdown (submenu, inline panel), sidebar, card.

## `shadow-surface-5` painted as a border and one drop

- **Cause:** `not ported yet`. The comment at `src/lib/theme.ts:328-331` ("gpuix paints one outer shadow") is out of date: `boxShadow` takes `BoxShadow[]` or a CSS string with several layers and `inset` (`~/code/fdarian/gpuix/FORK.md:646-649`, `packages/native/js/host.ts:369-377`, `:558`).
- **Original:** `--shadow-5`: light, a 1px ring plus four stacked drops (1, 3, 6, 12px); dark, an inset top highlight, an inset ring, a 1px black outer ring and the same drops (`app/globals.css:141`, `:164`). No border, so the box keeps its full content size.
- **Port:** a 1px `popupBorder` border plus only the 12px drop, `shadow5()` (`src/components/dialog.tsx:219-227`, `:335-338`). The border takes 1px of layout on each side, so the content is 2px narrower than in the source at every size.
- **Workaround:** none.
- **Fidelity:** approximated (the small drops, the dark highlights and the outer ring are dropped).
- **Components it hits:** every surface-3 to surface-8 shadow in the port (`shadow3()` in `src/lib/theme.ts:332-340` is the same).

## Scoped dialog: no portal target, and the top offset is 24px

- **Cause:** `port choice` (the overlay is drawn in place because gpuix's `Dialog` renders no element of its own, `src/components/dialog.tsx:104-108`; the 24px reason is not stated).
- **Original:** `container={element}` portals the overlay and panel into that element, `absolute` instead of `fixed` (`registry/base/dialog.tsx:168-173`, `:213`, `:231`, `:271`). `position="top"` still sits `12dvh` of the viewport down (`:273`).
- **Port:** `<Dialog scoped>` draws into the nearest `position: relative` ancestor (`src/components/dialog.tsx:360-384`), and `position="top"` sits 24px down when scoped (`:245-246`). The prop is a boolean, not an element.
- **Workaround:** n/a.
- **Fidelity:** approximated (same layering; different API and offset).
- **Components it hits:** just this one.

## `DialogContent` takes no `className`, `style` or `ref`

- **Cause:** `not ported yet`.
- **Original:** `className`, `style`, `ref` and every div attribute pass through, and the docs say `xl` is a canvas for composed layouts: `className="p-0"` plus a fixed height (`registry/base/dialog.tsx:163-166`, `:261-285`, docs `app/docs/dialog/page.tsx:70`). Header, Footer, Title and Description take `className` too (`:325-381`).
- **Port:** the props are fixed (`size`, `compact`, `showCloseButton`, `position`, `testId`; `src/components/dialog.tsx:229-239`), padding is 24 (`:333`), and Header, Footer, Title and Description take only children (`:387-452`).
- **Workaround:** none.
- **Fidelity:** dropped (no zero-padding canvas, so the sidebar block cannot be built).
- **Components it hits:** just this one.

## `compact` is a prop, not the region's size

- **Cause:** `not ported yet`. The port has no size context (`useSize` / `useSizeVariant`).
- **Original:** `DialogContent`, `DialogTitle` and `DialogDescription` read the variant from the region, so a dialog opened in a compact region narrows and steps its type down by itself (`registry/base/dialog.tsx:193`, `:348-349`, `:368`).
- **Port:** `compact` must be passed to `DialogContent`, `DialogTitle` and `DialogDescription` separately (`src/components/dialog.tsx:232`, `:418-451`); the footer buttons take their own `size`.
- **Workaround:** none.
- **Fidelity:** exact when every piece is passed `compact`.
- **Components it hits:** every component with a compact step.

## `DialogTrigger` and `DialogClose` take one child only

- **Cause:** `port choice` (the single child becomes the control through gpuix's `asChild`; the children-as-label form has no use there; reason not stated beyond the comment at `src/components/dialog.tsx:177`).
- **Original:** `render={<Button/>}`, `asChild`, or plain children, plus any button attribute (`registry/base/dialog.tsx:118-160`).
- **Port:** `props.children` is the control; no `render`, no `asChild`, no other props (`src/components/dialog.tsx:178-193`, `:211-213`).
- **Workaround:** n/a.
- **Fidelity:** dropped (the surface), exact for the single-child case.
- **Components it hits:** just this one.

## Title weight is SemiBold 600

- **Cause:** `gpuix gap`. [README "Missing features": variable-font axes](../README.md#missing-features).
- **Original:** `fontWeights.semibold` through `fontVariationSettings` (`registry/base/dialog.tsx:357`).
- **Port:** `weight.semibold` (`src/components/dialog.tsx:426`).
- **Fidelity:** approximated.

## Demo variants

- **Cause:** `not ported yet` (the sidebar block); `port choice` for the rest (the demos exist to exercise behaviour; reason otherwise not stated).
- **Original:** the page has Basic, Sizes (sm / lg / xl) and "With a sidebar" (`registry/blocks/dialog-sidebar/settings-dialog.tsx`, a `SettingsDialog` over an `xl` dialog, a Sidebar of five sections, a ScrollArea of controls, and a Select that takes over below `sm`), then the props tables (`app/docs/dialog/page.tsx:152-208`).
- **Port:** Basic (with a non-modal button beside it), Stacking (a Select and a nested Dialog), Sizes, and Scoped to a container (`src/demos/dialog.tsx:168-259`). Basic and Sizes copy matches the source. Missing: "With a sidebar" (blocked by the `className` entry above). Extra: non-modal, Stacking, Scoped, which the source page does not show. The props tables and code snippets are not in the demo.
- **Workaround:** none.
- **Fidelity:** dropped for the sidebar block.
- **Components it hits:** sidebar, scroll-area, switch, select, input-group (the block uses them).

## The accessibility dump omits the frame and does not inherit `hidden`

- **Cause:** `gpuix gap`.
- **Original:** n/a (a test-harness effect): a modal hides everything outside it with `aria-hidden`, which hides the subtree.
- **Port:** the harness casts the dump to read `frame` (`scripts/screenshots.tsx:128-133`), and the demo asserts `hidden` on the page elements `HideOutside` marks themselves, not on their descendants (`src/lib/modal.tsx`, `src/demos/dialog.tsx:274-277`).
- **gpuix lacks:** an `A11yTreeDump` type that matches the native dump (`frame`, with the tab-stop count, is not declared, `packages/native/js/testing.ts:314-317`), and a `hidden` flag on the descendants of an `aria-hidden` node: only the node that carries the attribute is flagged.
- **Workaround:** the cast and the narrower assertion.
- **Fidelity:** exact; the descendants' flag is unverified.
- **Components it hits:** any modal.

## Bun aborts when a script ends with a Dialog mounted

- **Cause:** `gpuix gap`.
- **Original:** n/a (a harness effect).
- **Port:** `scripts/screenshots.tsx:224` ends with `process.exit(0)`; a failed scenario that throws still aborts.
- **gpuix lacks:** a clean teardown: a script that renders a Dialog, leaves it open and returns without `process.exit` ends in "thread local panicked on drop" and a Bun abort. Reproduced earlier with `createTestRoot` and `<Dialog defaultOpen>`; the same script exits cleanly once it calls `process.exit(0)`. The tooltip demo was reported to hit it as well (not rechecked).
- **Workaround:** `process.exit(0)`.
- **Fidelity:** exact; the abort is noise after the output.
- **Components it hits:** tooltip.
