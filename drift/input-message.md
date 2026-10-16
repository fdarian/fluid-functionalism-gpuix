# input-message

Original: `registry/default/input-message.tsx`, demo in `app/docs/input-message/` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/input-message.tsx`,
demo in `src/demos/input-message.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## Scale on the send glyph, tiles, queued rows

- **Cause:** `gpuix gap`. No transforms (README "Missing features", scale-in entrances row, which lists input-message): source `scale` 0.6 (`input-message.tsx:1292-1298`), 0.9 (`:236-238`) and 0.97 (`:306-311`), and the Tab keycap's `-translate-y-px` (`:1247`). Port fades only (`input-message.tsx:207-215,290,370`); the keycap sits 1px low.

## The send button swap has no exit, and the first mount fades in

- **Cause:** `not ported yet`.
- **Original:** `AnimatePresence mode="wait" initial={false}` around the arrow / stop square: the old glyph exits (opacity 0, `spring.fast.exit`), then the new one enters (`input-message.tsx:1286-1320`). Nothing plays on mount.
- **Port:** `<For each={[mode === "stop" ? "stop" : "arrow"]}>` remounts a `motion.div` that fades in on `tween.fast` (`input-message.tsx:198-228`); the old glyph is gone at once and the arrow also fades in when the composer first mounts. `mode="wait"` exists in the fork (`~/code/fdarian/gpuix/FORK.md:826-827`).
- **Fidelity:** approximated.
- **Components it hits:** input-copy (`Swap`).

## Tiles and queued rows: no exit, no sibling slide

- **Cause:** `not ported yet`.
- **Original:** `FilePreviewTile` and `QueuedRow` carry `layout`, an `exit` (opacity 0, scale, `spring.fast.exit`), and sit in `AnimatePresence mode="popLayout"` (tiles), so a removed item animates out and its siblings slide into the gap (`input-message.tsx:230-239,301-313,1105,1143`).
- **Port:** enter fade only; a removed tile or row vanishes at once and the rest jump (`input-message.tsx:283-287,364-368`, `<For>` at `:991,1017`). The fork has `layout` and `popLayout` (`FORK.md:826-827`).
- **Fidelity:** approximated.
- **Components it hits:** queued-stack.

## Queue drag-reorder does not follow the pointer

- **Cause:** `not ported yet`.
- **Original:** `Reorder.Group` / `Reorder.Item` (axis y): the row follows the pointer while the others animate into place; the whole row is the handle (`cursor-grab`, `active:cursor-grabbing`), and a double click anywhere on it edits (`input-message.tsx:301-340,1135-1158`).
- **Port:** pointer capture on the label region only; the row under the pointer swaps with the one it crosses by a fixed stride of `row + 4` (`dragQueued`, `input-message.tsx:788-794`), nothing follows the cursor, and the file-count icon and padding are not draggable. Double click is `clickCount === 2` on the same region (`:433-447`). The fork has a `Reorder` primitive (`FORK.md:827`).
- **Fidelity:** approximated.
- **Components it hits:** queued-stack.

## The collapsing regions animate differently

- **Cause:** `not ported yet`.
- **Original:** the files, queue and suggestions regions open with `spring.moderate`; the exit has no override, so it uses the same spring (`input-message.tsx:1098-1101,1130-1132,1339-1345`). The suggestions region exits on height only, so its divider holds until the space closes (comment at `:1340-1343`). `AnimatePresence initial={false}`: a region already open at mount does not animate (`:1094,1125,1334`).
- **Port:** `Collapse` exits on the 120 ms tween (`tween.moderateExit`, `input-message.tsx:125,148`), fades opacity on exit for every region including suggestions (`:153-156`), and its `initial` is always `{ height: 0, opacity: 0 }` (`:152`), so a region open at mount (the Attachments demo's two files) animates in.
- **Fidelity:** approximated (the divider vanishing mid-collapse is what the source comment avoids).

## 80 ms fades are instant

- **Cause:** `not ported yet`.
- **Original:** `transition-opacity duration-80` on the badge and close button (`input-message.tsx:257,370`), `transition-colors duration-80` on a suggestion row's text and `transition-opacity` on its icon (`:429,445,451`), `transition-[box-shadow,color] duration-80` on the composer's ring (`:1060`).
- **Port:** the badge, close button and suggestion icon are shown or hidden at once (`input-message.tsx:263,490,561-581`), the row colour switches (`:556`), and `ring()` switches the outline colour (`:928-934`). The fork animates colours, `outlineColor` and `boxShadow` (`FORK.md:814-815`).
- **Fidelity:** approximated.

## Drag-over has no state

- **Cause:** `not ported yet`.
- **Original:** a file drag over the composer turns the ring `#6B97FF`, changes the placeholder to "Drop files here to add to chat" and hides the ghost (`input-message.tsx:507,574,653-656,1007-1027,1189-1195`).
- **Port:** `onDragOver` only calls `preventDefault` so the drop is delivered (`input-message.tsx:943-946`); the drop adds the files (`:950-955`).
- **Fidelity:** dropped.

## Files are paths, not `File`s

- **Cause:** `gpuix gap`. gpuix hands over paths from a drop or the picker, never a `File` (`input-message.tsx:43`).
- **Original:** `File[]`, identity `name-size-lastModified`, type from the browser (`input-message.tsx:946-967`).
- **Workaround:** `ComposerFile { path, name, type }`, identity is the path, and the type comes from a ten-entry extension table; anything else is `application/octet-stream` and fails the default `accept` (`input-message.tsx:43-103`). `onSend`, `files` and `QueuedMessage.files` carry `ComposerFile`.
- **Fidelity:** approximated.
- **Components it hits:** any component taking a `File`; the demo maps `ComposerFile` to chat-message's `{ name, type, src }` by hand (`src/lib/composer-stage.tsx:36-40`).

## The file picker is not filtered by `accept`

- **Cause:** `not ported yet`.
- **Original:** a hidden `<input type="file" accept multiple>`; `openFilePicker(acceptOverride)` narrows `accept` for one call, so the OS dialog only offers those types (`input-message.tsx:977-996,1074-1083`).
- **Port:** `renderer.promptForPaths({ files, multiple })` shows every file; the result is filtered afterwards (`input-message.tsx:698-716`). The fork lists file-picker `accept` filters (`FORK.md:459`).
- **Fidelity:** approximated.

## Clicking the composer's padding does not focus the textarea

- **Cause:** `not ported yet`. A bug, listed in the report.
- **Original:** `onMouseDown` on the whole composer focuses the textarea and cancels the default unless the target is a button, link, input, textarea or the queue (`input-message.tsx:912-928,1051`), so the padding, the footer gaps, the file row and the suggestions' padding all focus.
- **Port:** `onClick` on the inner wrapper around the textarea only (`input-message.tsx:1033-1042`). The cursor is `text` over the whole box (`:966-969`).
- **Fidelity:** approximated (focus lands on release, and only over the textarea).

## The caret is not moved after a programmatic value change

- **Cause:** `not ported yet` (unverified: where gpuix puts the caret after a programmatic change).
- **Original:** after accepting a suggestion, editing a queued message, or recalling history the caret is set to the end (`input-message.tsx:587-592,728-733,781-786`).
- **Port:** `focusTextarea()` only (`input-message.tsx:667-677,758-770,885-906`).

## History recalls only from a single-line draft

- **Cause:** `not ported yet`. The port's comment blames gpuix (`input-message.tsx:881`: "gpuix does not report the caret"), but the fork lists `selectionStart` / `selectionEnd` (`FORK.md:451`). Not checked on a textarea.
- **Original:** ArrowUp recalls when the caret is on the first line, ArrowDown when it is on the last, so a multi-line draft still navigates (`input-message.tsx:846-889`).
- **Port:** recalls only when the draft has no `\n` (`input-message.tsx:879-884`).
- **Fidelity:** approximated.

## Arrow keys may not reach the textarea's `onKeyDown`

- **Cause:** `gpuix gap`, as the port's comment states (`input-message.tsx:822-823`). Unverified here: `FORK.md:448-450` says a text editor's `keydown` runs before its built-in action. No README row covers it.
- **Original:** plain ArrowUp / ArrowDown drive the suggestion list and history (`input-message.tsx:788-889`).
- **Port:** the same handler also accepts Ctrl-P / Ctrl-N (`input-message.tsx:812-836`), and the demo's scenarios use `ctrl-n` / `ctrl-p` (`src/demos/input-message.tsx:644,763`). If the arrows really are swallowed, the keyboard path in the real window is Ctrl-P / Ctrl-N only.
- **Fidelity:** approximated.

## The resting ring in dark mode

- **Cause:** `port choice` (`popupBorder` "stands in for the shadow ring", `lib/theme.ts:35`).
- **Original:** `surfaceClasses(2, 2)` (`input-message.tsx:1057`): `--shadow-light-2` in light (1px ring plus a drop) and `--shadow-dark-2` in dark, an inset 1px ring at 2% white and an inset top highlight at 1% (`app/globals.css:138,161`).
- **Port:** an outline outside the box in `color.popupBorder` (6% black in light, 5% white in dark) plus the drop (`input-message.tsx:925-931,959-975`). Light is the same; dark has a stronger, outer ring and no top highlight.
- **Fidelity:** approximated in dark.

## Slot buttons are not scaled down in compact

- **Cause:** `not ported yet`.
- **Original:** the footer sets `[&_button]:h-6 [&_button.w-7]:w-6` and the caption text size on every descendant button in compact, so the consumer's slot buttons and the send button are 24px (`input-message.tsx:1270-1272`).
- **Port:** only the send button is 24 (`steps.compact.button`, `input-message.tsx:111`); slot content keeps its own size.
- **Fidelity:** approximated.

## Queued row icon strokes

- **Cause:** `not ported yet`.
- **Original:** the image, enter and down-arrow icons pass no `strokeWidth`, so they draw at lucide's 2 (`input-message.tsx:344,443,448`). The file count is `tabular-nums` (`:345`).
- **Port:** strokes of 1.5 (`input-message.tsx:417,569,578`); the file count lacks `tabular-nums` (`:431`).
- **Fidelity:** approximated.

## The ghost placeholder

- **Cause:** `not ported yet`.
- **Original:** the overlay is `absolute inset-0 overflow-hidden` and is described to assistive tech by an `sr-only` hint wired through `aria-describedby` (`input-message.tsx:1225-1261`).
- **Port:** `top / left / right` without `bottom` or clipping (`input-message.tsx:1091-1106`); no hint text.
- **Fidelity:** approximated.

## Accessibility wiring

- **Cause:** `not ported yet`. gpuix accepts `aria-*` (`FORK.md:455`).
- **Original:** `aria-activedescendant` on the textarea and an `id` on each option (`input-message.tsx:1204-1208,419`), a polite `role="status"` live region announcing "Message sent. N still queued." (`:708-710,1390-1392`), `aria-describedby` merging the ghost hint and `textareaProps` (`:1199-1203`).
- **Port:** `role="listbox"` / `option` / `aria-selected` and `listitem` labels are there (`input-message.tsx:530-531,1194-1195,368-369`); none of the three above.
- **Fidelity:** dropped.

## Props: no passthrough

- **Cause:** `not ported yet`.
- **Original:** `className`, `style`, `ref` and the div's HTML attributes on the root; `textareaProps` (a custom `aria-label`, `className`, `onFocus` / `onBlur`, `maxLength`, …) on the textarea (`input-message.tsx:126-210,491-495,513-519,1070,1219`).
- **Port:** `InputMessageProps` has neither (`input-message.tsx:587-630`); the textarea's `aria-label` is fixed "Message" (`:1051`). `testId` is added.
- **Fidelity:** dropped.

## IME composition, touch, static weights

- **Cause:** `gpuix gap`. One line each: the `isComposing` early return (`input-message.tsx:790`; README "Missing features", IME row, which lists input-message); the touch-only always-visible × (`useIsTouch`, `:77-87,367-368`; README, the `matchMedia` input-device row); the variable-font weight (`:340,432,1218`; README variable-font row).

## Demo page

- **Cause:** `port choice` for the shape (the demo is a showcase card, not a docs page; reason not stated beyond that); `not ported yet` for what is missing.
- **Original:** `app/docs/input-message/page.tsx`: Playground (toggles for placeholder suggestion, prompts, history, attachments, min rows, disabled, slots, queue status), Basic, Suggestions, Attachments (composer floating over a scrolling transcript, pre-filled, a Reset button), Queued messages (`queued-chat-demo.tsx`: a pausable streaming reply, `showQueue={false}` with the `QueuedStack` above the composer, the queued-to-sent morph, a `rich` variant with an attach dropdown and a model picker, Reset), Left Slot Only, Right Slot Only, Send Handler (no history), Disabled (text "This composer is disabled"), then a props table. Each has a `ComponentPreview` with code.
- **Port:** Playground (every control and the shuffle; `src/demos/input-message.tsx`), Basic, Suggestions, Attachments (pre-filled, a transcript that scrolls under the composer and stays pinned to its end, Reset), Queued messages (`src/lib/queued-chat.tsx`: pausable stream, the stack over the composer with `showQueue={false}`, Reset), the same with the rich attach menu and model picker, a built-in-rows queue card, both slots in one card, Send handler (with `history` added), Disabled (empty value) with Compact. Missing: the queued-to-sent morph, code snippets, props table. Extras: history, compact, the built-in-rows card.
- **Fidelity:** every source section has a port counterpart.

## Playground: what differs

- **Cause:** `not ported yet` (Get code); `port choice` (the preview frame is a `DemoCard`, as for every playground).
- **Original:** the panel ends with a "Get code" dialog (preset codes, `usePresetUrlSync`) and the Code tab shows a snippet generated from the toggles; the left slot is `Tooltip` "Attach" with an `icon-sm` button; the preview is 560px with compact padding.
- **Port:** no Get code, no snippet. The stage is 480px in the card's 20px padding. The left slot and the stack's tooltips are the same. Every control, default and the shuffle match.
- **Fidelity:** approximated.

## Queued chat: what differs

- **Cause:** `not ported yet` (morph, menu placement, edit focus); `gpuix gap` (queue types).
- **Original:** the front card morphs into its sent bubble (`morphLayoutId` on the stack and `layoutId` on `ChatMessage`); the attach and model menus open above their buttons (`bottom-full`); the buttons are lit while their menu is open (`active`) and wrapped in tooltips; editing a card puts the caret at the end of the composer.
- **Port:** no morph: neither `QueuedStack` nor `ChatMessage` takes a layout id, so a dispatched card fades out and its bubble fades in. `DropdownContent` has no side prop, so the menus open below the composer's slot buttons. `Button` has no `active` prop. Edit refills the composer but does not focus it: `InputMessage` has no ref and gpuix has no way to find its textarea from outside. The composer's `QueuedMessage` carries `ComposerFile`s and the stack's carries `FileLike`s, so `ComposerQueueStack` (`src/lib/composer-stage.tsx`) maps between them, caching one mapped object per message because the stack keys its cards by identity.
- **Fidelity:** approximated (morph dropped).
