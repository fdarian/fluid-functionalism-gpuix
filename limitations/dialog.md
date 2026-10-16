# dialog

Original: `registry/base/dialog.tsx` (Base UI Dialog + Motion). Ported in `src/components/dialog.tsx`, demo in `src/demos/dialog.tsx`.

Dialog, DialogTrigger, DialogContent (`sm` / `lg` / `xl`, compact, `position`, `showCloseButton`), Header, Footer, Title, Description and Close are ported, composed over gpuix's own headless `Dialog` (`packages/solid/src/components/dialog.ts`): a full-window `<anchored fill="window">` layer, a backdrop, a popup, Escape handling and focus in / out. The "with a sidebar" block (`SettingsDialog`) is a separate composed block, not ported.

## CSS transforms (scale 0.97 to 1, and the centring)

- **Original:** the panel springs from `scale: 0.97` on enter and back on exit, and the `x: -50%` / `y: -50%` centring is a transform.
- **gpuix lacks:** `scale` and `translate` as styles (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** the panel is centred by a flex layer instead of by translation, and only fades, on the `slow` spring in and the `slowExit` tween out; the scrim fades on the same transitions (`src/components/dialog.tsx:270-279`, `:314-315`, `:346-351`).
- **Fidelity:** approximated (no scale).
- **Components it hits:** every popup that scales in.

## `rem` and `dvh` units

- **Original:** the panel is `w-[calc(100%-2rem)] max-w-[400px]` and `top-[12dvh]`.
- **gpuix lacks:** `em`, `rem`, `vw`, `vh`, `vmin` and `vmax` in value strings: they are invalid, because the parsers are handed neither the inherited font size nor the window size (`~/code/fdarian/gpuix/FORK.md:749-754`).
- **Workaround:** 16px side padding on the layer (`EDGE`, `src/components/dialog.tsx:51`) and the window height read through `createWindowSize()`, which follows a resize (`:57`, `:263`, `:267-268`).
- **Fidelity:** exact while the root font size is 16px.
- **Components it hits:** any component sized in `rem` or viewport units.

## `DialogBackdrop` closes on mousedown

- **Original:** a backdrop closes on a click that presses and releases on it (Base UI's outside press), so pressing on the backdrop and releasing on the panel does not close.
- **gpuix lacks:** that rule: `DialogBackdrop` closes from `onMouseDown` (`packages/solid/src/components/dialog.ts:151-154`).
- **Workaround:** the port renders its own backdrop `div` with `onClick` instead of `DialogBackdrop` (`src/components/dialog.tsx:303-310`; the same in `src/components/mobile-drawer.tsx:77`).
- **Fidelity:** exact.
- **Components it hits:** mobile-drawer.

## A reactive prop change re-creates `DialogPopup`

- **Original:** the popup's `aria-labelledby` / `aria-describedby` can change while it is open.
- **gpuix lacks:** a stable popup under changing props: `DialogPopup` sits inside a keyed `Show` and builds its element from a spread of its props, so a prop that changes re-creates the element and drops focus (`packages/solid/src/components/dialog.ts:168-208`).
- **Workaround:** the ids are static and always passed, even when no title or description is rendered (a reference to a missing id resolves to nothing; `src/components/dialog.tsx:331-334`).
- **Fidelity:** exact.
- **Components it hits:** any gpuix popup given a reactive prop.

## The accessibility dump omits the frame and does not inherit `hidden`

- **Original:** n/a (a test-harness effect): a modal hides everything outside it with `aria-hidden`, which hides the subtree.
- **gpuix lacks:** an `A11yTreeDump` type that matches the native dump (`frame`, with the tab-stop count, is not declared, `packages/native/js/testing.ts:314-317`), and a `hidden` flag on the descendants of an `aria-hidden` node: only the node that carries the attribute is flagged.
- **Workaround:** the harness casts the dump to read `frame` (`scripts/screenshots.tsx:128-133`), and the demo asserts `hidden` on the page elements `HideOutside` marks themselves, not on their descendants (`src/lib/modal.tsx`, `src/demos/dialog.tsx:274-277`).
- **Fidelity:** exact; the descendants' flag is unverified.
- **Components it hits:** any modal.

## Bun aborts when a script ends with a Dialog mounted

- **Original:** n/a (a harness effect).
- **gpuix lacks:** a clean teardown: a script that renders a Dialog, leaves it open and returns without `process.exit` ends in "thread local panicked on drop" and a Bun abort. Reproduced with `createTestRoot` and `<Dialog defaultOpen>`; the same script exits cleanly once it calls `process.exit(0)`. The tooltip demo was reported to hit it as well (not rechecked).
- **Workaround:** `scripts/screenshots.tsx` ends with `process.exit(0)`; a failed scenario that throws still aborts.
- **Fidelity:** exact; the abort is noise after the output.
- **Components it hits:** tooltip.
