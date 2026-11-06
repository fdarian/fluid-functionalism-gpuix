How this repo consumes the `ghia-base-ui` primitives, and the mechanics that make that seam work; read before moving behaviour between a component here and a primitive.

The split is in AGENTS.md (behaviour goes into the primitive, looks stay here). These are the consequences you meet in code:

- Primitives are headless `create*` functions (`createSelectRoot`, `createMenuList`, ...) returning state accessors and prop objects to spread on gpuix elements. They carry no styling, tokens or animation; timings such as the popup exit duration are passed in as options, because they are this site's look.
- **The highlight is controllable.** A primitive with a highlighted index owns it by default and accepts `highlightedIndex` and `onHighlightChange(index, reason)`. This repo passes fluid hover's `activeIndex` in so one highlight serves pointer and keyboard, and on a keyboard reason calls `hover.releasePointer()`. Picking the nearest row in a gap stays here, since Base UI has no such behaviour.
- **Refs are not in the prop objects.** A `ref` inside a JSX spread applies in an effect after the element exists, too late for primitives that read the element as the popup mounts, so consumers pass `ref={...}` on the element themselves.
- **Select rows assign props one by one.** `tabIndex` through a spread arrives after the open has already called `focus()` on the row, which is then not yet focusable.
- The site's own components stay here (command-menu, sidebar, nav-item, nav-menu, input-message, ask-user-questions, queued-stack, carousel-dots, colour-picker internals, cards). They import the primitives' list navigation, presence and pointer capture where the behaviour matches.
- `ghia-base-ui` and `@ghia/solid` must resolve to one copy each; `scripts/check-single-instance.ts` fails otherwise.
