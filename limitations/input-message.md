# input-message

Original: `registry/default/input-message.tsx`. Ported in `src/components/input-message.tsx`, demo in `src/demos/input-message.tsx`. Ported: the composer, the growing textarea, the send / queue / stop button, attachments (drop and picker), the reorderable queue rows with auto-dispatch, suggested prompts with the Tab ghost, sent-message history, slots, disabled and compact. The docs page's Sonner-style queue stack is the queued-stack component (`queued-stack`), not this one.

## The textarea never reports its bound keys

- **Original:** `onKeyDown` on the textarea sees ArrowUp, ArrowDown and Enter. History recall, walking the suggestion list and Enter-to-fill hang on them.
- **gpuix lacks:** key events for any key the text editor binds as an action. `<textarea>` binds Up, Down, Left, Right, Home, End, Backspace, Enter and the cmd/ctrl shortcuts (`packages/native/src/custom_elements/input.rs:182`, `text_editor_bindings`), GPUI runs the action, and the element's `keyDown` never reaches JS. I logged every `onKeyDown`: characters and Tab arrive, `up` / `down` / `enter` / `backspace` do not. JS handlers run after GPUI has finished dispatching, so they cannot cancel the action either (`packages/native/src/renderer.rs:3615`). Enter is the one that gets an escape hatch: `onSubmit`. Missing feature, and a bug-shaped surprise next to `<input>`, which has no Up / Down bindings and does deliver them.
- **Workaround:** Ctrl-P and Ctrl-N, which the editor does not bind, walk the suggestions and the history. The ArrowUp / ArrowDown branches are kept for an editor that lets them through. Enter goes through `onSubmit`, which accepts a highlighted suggestion first.
- **Fidelity:** approximated: the arrow keys do not work in a textarea.
- **Components it hits:** any textarea that wants arrow keys (command-menu's search is an `<input>` and is fine).

## No caret or selection

- **Original:** history recall only fires with the caret on the first (ArrowUp) or last (ArrowDown) line, then puts the caret at the end; accepting a suggestion places it at the end too.
- **gpuix lacks:** `selectionStart`, `selectionEnd`, `setSelectionRange` and `focus({preventScroll})` on `<input>` / `<textarea>` (`InputProps` in `packages/native/js/host.ts` has `value`, `placeholder`, `readOnly`, `theme`; `set_prop` in `input.rs:518`). A JS-set `value` leaves the caret wherever the editor puts it. Missing feature.
- **Workaround:** history recalls only while the draft is a single line, so the caret condition is moot. The caret after a recall or a fill is not controlled.
- **Fidelity:** approximated.
- **Components it hits:** color-picker (select-on-focus), input-copy.

## A flex `gap` counts the empty nodes `<Show>` leaves

- **Original:** a conditional child that renders nothing takes no part in layout, so `gap-1` between the visible rows is 4px.
- **gpuix lacks:** the same rule. Solid's renderer inserts an empty text node for every dynamic hole, gpuix keeps it as a child (`packages/native/src/renderer.rs:5677`, the children loop; the comment at `:5670` makes the empty node paint nothing but not leave the flex), and the layout engine counts it as a flex item, so each hole adds one gap. The composer came out 12px too tall (two holes before the textarea, one after the footer) and a card with a `<Show>` first child got a gap above its content. Bug.
- **Workaround:** no `gap` on any container that holds a `<Show>` or `<For>`: spacing is `margin` / `padding` on the real children. The same fix went into input-group (a hidden error row added 4px under every field) and input-copy.
- **Fidelity:** exact once worked around.
- **Components it hits:** every component with conditional children in a gapped flex.

## Attachments are paths, and the drag has no hover

- **Original:** `File` objects from drop and `<input type="file">`; a drag over the composer lights a blue ring and swaps the placeholder to "Drop files here to add to chat"; dedupe is `name-size-lastModified`; the picker is narrowed by `accept`.
- **gpuix lacks:** `File` / `Blob` (a drop or the picker yields absolute paths: `onFileDrop` payload `paths`, `promptForPaths`), a size or modified time for them, a type filter on the picker (`PathPromptOptions` has `files`, `directories`, `multiple`, `prompt`), and any drag-enter / drag-over / drag-leave for an OS file drag: the renderer wires `on_drop` only (`renderer.rs:5599`). Missing features.
- **Workaround:** `ComposerFile` is `{ path, name, type }`, with the type guessed from the extension; dedupe is by path; `accept` filters after the picker returns; the drag-over ring and placeholder are not drawn. The drop target is the whole composer. The screenshot script has no helper for a file drop, so the demo pre-fills the attachments, as the docs page does.
- **Fidelity:** approximated for add and remove, dropped for the drag-over state.
- **Components it hits:** chat-message, queued-stack (their files are the same paths).

## Height animation needs the content measured by hand

- **Original:** the attachments, queue and suggestions regions animate to a self-measured pixel height (`useRegionHeight`, a `ResizeObserver` on the content), on `spring.moderate`.
- **gpuix lacks:** `height: auto` in `motion` (`MotionStyle` takes numbers).
- **Workaround:** `Collapse` puts `onLayout` on the content box (`src/lib/measured-height.ts`), which reports its height after the first paint and on every size change, a wrap on resize included, and tweens the clip to it. The spring enter is `tween.moderate`; the exit is the 120ms tween.
- **Fidelity:** exact for size changes.
- **Components it hits:** accordion, queued-stack, any collapsing region.

## Reordering has no layout animation or drag primitive

- **Original:** `Reorder.Group` / `Reorder.Item` (framer): drag a row and its neighbours slide out of the way, and `layout` animates a removed row's siblings into the gap.
- **gpuix lacks:** shared-layout / FLIP animation and a drag-reorder primitive. `motion` animates `top` / `left` / `width` / `height` / `opacity` / `borderRadius`, not a change of position caused by a reflow. Missing feature.
- **Workaround:** a press on the row's label region starts a drag; moves convert the pointer's y into a slot (`row height + 4`) and the queue is re-ordered at once, so the rows jump instead of gliding. Alt-Up / Alt-Down, Enter / F2, Delete, and a double-click on the label work as in the original.
- **Fidelity:** approximated.
- **Components it hits:** queued-stack, carousel-dots.

## The close button's click survives only if its row does not capture the pointer

- **Original:** the row is draggable and its × is a button inside it.
- **gpuix lacks:** nothing new: `mouseDown` plus `mouseMove` on the row would capture the pointer and swallow the ×'s click (see limitations/input-copy.md).
- **Workaround:** the drag handlers sit on the label region, a sibling of the ×.
- **Fidelity:** exact.
- **Components it hits:** queued-stack.

## A filled child stops the container's hover

- **Original:** the composer's ring recolours on `:hover` wherever the pointer is inside it.
- **gpuix lacks:** the same rule for descendants: a row, keycap or badge with a fill takes the hover from its ancestors (see limitations/input-group.md).
- **Workaround:** the queued row's recessed fill and the Tab keycap are layers with `pointerEvents: "none"`; the tile's close badge, which must be clickable, tells its tile when it is hovered so the badge does not hide itself.
- **Fidelity:** exact.
- **Components it hits:** chat-message, queued-stack.

## Click anywhere to focus

- **Original:** `onMouseDown` on the composer focuses the textarea unless the target is inside a button, link, input or `[data-im-queue]`.
- **gpuix lacks:** an event target and `closest()`: a handler cannot tell which descendant took the press, and cannot stop a button's press from also reaching the container.
- **Workaround:** the focus handler is on the textarea's wrapper only, so the composer's padding, the footer and the regions do not focus it.
- **Fidelity:** approximated.
- **Components it hits:** any card that forwards a press to an inner field.

## Ring, drop shadow and the 20% focus colour

- **Original:** `shadow-surface-2` (an inset ring plus a drop) recoloured per state with an inline multi-shadow.
- **gpuix lacks:** multiple or inset shadows (README).
- **Workaround:** the ring is an `outline` (hairline at rest, `--border` on hover, foreground at 20% focused) and one drop shadow.
- **Fidelity:** approximated.
- **Components it hits:** all.

## Send-button morph, tile and row enter

- **Original:** the arrow and the stop square swap in wait mode with `scale` 0.6 to 1; tiles and rows enter with `scale` 0.9 / 0.97.
- **gpuix lacks:** transforms (known).
- **Workaround:** opacity fades only, on `spring.fast`.
- **Fidelity:** approximated.
- **Components it hits:** all.
