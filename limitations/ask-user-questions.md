# ask-user-questions

Original: `registry/default/ask-user-questions.tsx` (1,880 lines, on Base UI `RadioGroup` / `CheckboxGroup` / `Field`) and `app/docs/ask-user-questions/page.tsx`. Ported in `src/components/ask-user-questions.tsx`, demo in `src/demos/ask-user-questions.tsx` (every docs example except the playground).

Transforms and font loading are already known gaps and are not repeated here. Ported: single and multi-select, `allowOther`, `freeText` (single and multi-line) with validation, skippable, chip on either side, inline and stacked layouts, controlled and uncontrolled index and answers, Back / Skip / Continue, the 1-9, arrow, Home / End, Enter, Space and Cmd+Enter keys, the shared fluid hover, merged selection blocks and the animated height of the question region.

## Keyboard shortcuts can only be card-scoped

- **Original:** `document.addEventListener("keydown")` so 1-9 work with no focus inside the card, with a registry that lets only one of several mounted instances answer.
- **gpuix lacks:** a window-level key subscription for a component. Window key events are wired to the options of the root (`packages/solid/src/root.ts:85`, `rootHandlers.onKeyDown`), not to anything a component can add. Element `onKeyDown` fires for the focused element and its ancestors that declare it.
- **Workaround:** the card is focusable (`tabIndex 0`) and one `onKeyDown` on it handles everything that bubbles up from a focused row or field. Digits work once focus is in the card, and several cards on one page never answer together, which the original needed its registry for.
- **Fidelity:** approximated: a digit does nothing until the card has focus (a click on it, or a Tab).
- **Components it hits:** any component with a page-level hotkey.

## Inline text that wraps as one paragraph

- **Original:** the inline layout is `<span>title</span> <span class="text-muted-foreground">description</span>`: one paragraph, two colours, wrapping word by word.
- **gpuix lacks:** inline runs of different colour or weight inside one text block. `README.md:3095`: "Do not nest `<text>` in `<text>`. Adjacent `<text>` siblings merge into one line. A `<text>` child of another `<text>` is a nested div."
- **Workaround:** a flex row that wraps (`flexWrap: "wrap"`, 4px column gap) holding the title and the description as separate `<text>` boxes. A long description drops to its own line as a whole instead of continuing the title's line; it does not break mid-sentence next to the title.
- **Fidelity:** approximated. Identical for the short descriptions in the docs; different for long ones (the stacked layout is for those).
- **Components it hits:** any row that mixes a bold label with running text.

## `<textarea>` gives no caret or selection

- **Original:** ArrowUp / ArrowDown inside the Other field hand focus to the neighbouring row only when the caret is already at the very start or end (`selectionStart` / `selectionEnd`), so a multi-line or wrapped draft can still be navigated.
- **gpuix lacks:** caret and selection access: a `<textarea>`'s events carry the whole `value` and nothing about the cursor (`EventPayload`, `packages/native/index.d.ts`).
- **Workaround:** up / down move to the neighbouring row only when the draft has no newline; with one the editor keeps the key. A draft that merely wraps on screen counts as one line, so up and down leave it.
- **Fidelity:** approximated.
- **Components it hits:** any text field that hands arrow keys to its surroundings.

## Focus events arrive out of order

- **Original:** `focusin` for the new row, after `focusout` for the old one.
- **gpuix:** moving focus from one row to the next (`renderer.focusElement`) delivered the new row's `onFocus` before the old row's `onBlur`. A handler that does `setFocused(null)` on blur therefore cleared the state the new row had just set, and Space stopped toggling the row that showed the focus ring. Observed, not traced to a source line.
- **Workaround:** blur only clears the focused index when it is still this row's.
- **Fidelity:** exact.
- **Components it hits:** any roving-focus list: radio-group, checkbox-group, tabs, menus.

## One focus ring that travels between rows

- **Original:** a single ring element glides between rows with the fast spring, fed by the container's `focusin`.
- **gpuix lacks:** nothing blocking: the container can measure rows like the hover highlight does. It is not ported, because gpuix has `focusVisible` on each focusable element, which gives the same result without a ring layer to keep in step with the question's height animation.
- **Workaround:** `focusVisible: { outlineWidth: 1, outlineColor: focusRing, outlineOffset: 2 }` on each row.
- **Fidelity:** approximated: the ring appears on the new row instead of travelling from the old one.
- **Components it hits:** sidebar (also lists the traveling ring as not ported).

## Merge and split of selected blocks

- **Original:** `useMergeSplitBlocks`: when one unselected row bridges two selected runs (or splits one), the facing edges glide to the bridge row's midpoint and the corners straighten, then swap to a single block with no visible jump.
- **gpuix lacks:** nothing blocking, but the hook is about 300 lines of timed phases over per-corner radii, and `motion` animates a single `borderRadius`, not four corners.
- **Workaround:** each contiguous run is one block, drawn with the shared `FluidHighlight` in a slot per run (`<Index>`). A run that grows or shrinks glides on `top` and `height`; two runs becoming one, or one becoming two, change the slot count, so the second block appears or disappears instead of converging.
- **Fidelity:** approximated.
- **Components it hits:** checkbox-group (the same hook).

## Footer buttons enter and exit

- **Original:** each footer button is a `motion.div` in `AnimatePresence mode="popLayout"`, scaling from 0.85 and fading, with the exiting one popped out of flow so its neighbours move at once.
- **gpuix lacks:** `scale` and `popLayout` (an exiting node stays in flow until it is gone; see [thinking-indicator.md](thinking-indicator.md)).
- **Workaround:** a 100 ms fade-in on mount and no exit animation: a button that goes away is removed at once.
- **Fidelity:** approximated.
- **Components it hits:** any list whose items leave.

## `aria-checked` and `aria-pressed` do not exist

- **Original:** the rows are `role="radio"` / `role="checkbox"` with `aria-checked`, on top of hidden Base UI primitives.
- **gpuix lacks:** `aria-checked` (the `HostProps` accessibility props are `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`, `packages/native/js/host.ts`).
- **Workaround:** `aria-selected` on the same rows. Assistive technology hears "selected" where it would have heard "checked".
- **Fidelity:** approximated.
- **Components it hits:** any checkbox- or radio-like row.

## Shared fluid hover and a question with no rows

Not a gpuix gap, a note for whoever uses `src/lib/fluid-hover.ts`: `remeasure()` throws, from a timer, if no container was ever registered ("painted bounds still unavailable ... (container)"). A free-text question has no rows, so the card skips `remeasure` for it. Elements far below the window do report bounds (checked: a row 2,800px down returned its box), so a tall page is not the problem.

## Also not ported

`autoFocus` of a free-text field on the first question is a prop (the demos turn it off so nine cards do not fight for focus), and the original's `preventScroll` has no counterpart: whether `autoFocus` scrolls the field into view was not checked. The footer buttons are local (a compact ghost and a primary), not the shared `Button`: its `leadingIcon` only takes the shared icon names and there is no left arrow among them, so they lack its press-shrink.
