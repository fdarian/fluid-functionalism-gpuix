# gpuix + fluid functionalism

Can [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine, draw the
[fluidfunctionalism.com](https://fluidfunctionalism.com) component library?

Yes. 32 demo pages cover every component of the library (36 component files, counting shared parts such as
choice-group and menu-item), in the light and dark schemes, with the site's fluid hover, springs and keyboard
behaviour. What does not carry over is catalogued below: [15 gpuix bugs and 23 missing features](#gpuix-limitations).

| | |
|---|---|
| ![showcase](screenshots/showcase/initial.png) | ![button hover](screenshots/button/hover.png) |
| ![combobox open](screenshots/combobox/open.png) | ![sidebar sub-menu](screenshots/sidebar/sub-menu.png) |

## Run it

```bash
bun install
bun --hot src/main.tsx
```

The app is a sidebar of demo pages (one per component) plus a "Make them yours" card with a System / Light / Dark
switch (System follows the OS appearance). It sits in a browser-style frame: a transparent titlebar with the
traffic lights, a title across the top bar, and the page in a rounded panel. Inter is loaded from `assets/fonts/`.

`@gpuix/native` and `@gpuix/solid` are bun workspaces pointing at the fork at `~/code/fdarian/gpuix`, wired like
[`../gpuix-pierre-diffs`](../gpuix-pierre-diffs) (see its README for building the native addon). The fork must be
at `poc` a02ec23 or later: the highlights and popups use its native `motion` springs, so rebuild the addon and the
`@gpuix/solid` dist after pulling it. The Solid JSX transform is a Bun preload (`bunfig.toml`), so there is no
build step. `solid-js` is pinned to the version gpuix resolves: two copies of Solid give two reactive systems and
nothing updates.

```bash
bun run typecheck                      # tsc
bun scripts/screenshots.tsx <demo>     # headless captures of one page, into screenshots/<demo>/
bun scripts/live-check.tsx             # the same flow against the real window, via gpuix's automation client
```

`screenshots.tsx` takes a file name from `src/demos/` (or `showcase`) and writes `initial.png`, whatever the demo's
`scenarios` capture, and `light.png` (the page after flipping the theme through the real control). It runs on
gpuix's offscreen test renderer, so it needs the native addon but no window. `live-check.tsx` drives the real window
through the automation client and writes to `screenshots/live/`.

<details>
<summary>Known issue: the real window can fail to boot</summary>

With the display asleep, `bun src/main.tsx` crashes with `Fluid hover: painted bounds still unavailable`: no frame
is painted, so `getElementBounds` never returns a box. It reproduced at the first scaffold commit, which booted
fine earlier, so it is not a regression in the components. I suspect the macOS display-link frame loop does not tick
while the display sleeps, but that is unconfirmed. Run it with the screen awake.
</details>

## Adding a component

A component adds `src/components/<name>.tsx`, `src/demos/<name>.tsx` and `limitations/<name>.md`, and edits no shared
file. `src/lib/demo.ts` finds every `src/demos/*.tsx` with `Bun.Glob` and a dynamic `import` at startup (restart
`--hot` to pick up a new file), and the sidebar lists the demos by title. A demo file exports:

```ts
export const title = "Button";
export const group = "Components";
export function Demo(): JSX.Element {}              // one or more <DemoCard>s from src/lib/demo-kit
export const scenarios: DemoModule["scenarios"] = async (shot) => {};  // optional
```

`scenarios` drives `screenshots.tsx` with `shot.hover / click / down / up / press / moveTo / clickAt / scroll /
settle / expectText / capture`; see `ShotContext` in `src/lib/demo.ts`. Give elements a `testId` to target them.
`limitations/_TEMPLATE.md` is the shape of a limitations file.

<details>
<summary>Shared code in <code>src/lib/</code></summary>

| File | What it holds |
|---|---|
| `theme.ts` | Both columns of every `light-dark()` in `app/globals.css` (`color-mix()` mixed offline), type scale, radii, springs. `color.x` reads a `scheme` signal, so a JSX prop that touches it re-colours on a theme change; read tokens inside JSX or a function, never at module scope. `withAlpha`, `surface(level)`, `focusRing(offset)`. |
| `fluid-hover.ts`, `fluid-highlight.tsx` | The site's `use-fluid-hover`: rows register with a `ResizeObserver`, their boxes are read with `getBoundingClientRect` when one reports, `pickNearest` (ported verbatim) resolves the pointer to a row including gaps, and one highlight glides between rows. `hover.containerProps` and `useHoverItem` wire a list. |
| `measured-height.ts` | A box whose height springs to its content's: the content box reports its size through `onLayout`, used by every collapse. |
| `popup.tsx`, `presence.ts` | Popup chrome on `<anchored fit="flip">` (`PopupSurface`; `createPlacementState` keeps the reported side and available height), and `createPresence` (mounted outlives open so an exit can play). |
| `list-nav.ts` | `moveIndex` (skip disabled, wrap or clamp) and `revealRow` (scroll a row into view by hand). |
| `stable-label.tsx` | A label that gains weight without moving its neighbours: a hidden semibold copy reserves the width. |
| `clock.ts` | One shared, ref-counted frame clock for every JS-driven loop. |
| `fonts.ts`, `app-frame.tsx` | The static Inter files passed to `render()` and the test renderer; the window frame (chrome-coloured bar, rounded page panel). |
| `press.ts`, `icons.ts`, `icon.tsx` | The press-shrink shadow; lucide glyphs as SVG strings (`defineIcon` for a component's own). |
| `demo.ts`, `demo-kit.tsx` | The demo contract and the card every page is made of. |
</details>

## gpuix limitations

What gpuix still lacks or gets wrong, as of the DOM-parity release of the fork (`~/code/fdarian/gpuix/FORK.md`).
Everything the port used to work around and gpuix now does (bubbling hover and press, explicit pointer capture,
focus modality, ARIA and `inert`, forms, `fit="flip"` placement, motion values, colour transitions, gradients,
sticky, masks and the rest) is gone from this list. Where the port still does not use such a feature, that is a gap
in the port, tracked row by row in [`BASE-UI-AUDIT.md`](BASE-UI-AUDIT.md), not a gpuix limitation. Each component's
own file in [`limitations/`](limitations) has the detail. "Bug" means gpuix does something wrong or inconsistent;
"missing" means it does not offer it. A count is given only where the code shows it.

### Bugs

| Used by | What | Workaround here |
|---|---|---|
| combobox, dropdown, select, tooltip (every popup on gpuix's `DismissableLayer`), and `returnFocusTo` in dropdown, select, color-picker | `VIEW_BUSY`: reading focus state (`getFocusedElementId`, `matches(":focus")`) inside a mousedown, mouseup, click or wheel handler throws on macOS, because those run in synchronous dispatch. gpuix's own `DismissableLayer` does it, so a pointer-opened popup fails to open (seen headless, likely live too). There is no `document.activeElement` | none yet |
| accordion, banner, button, card, carousel-dots, chat-message, input-copy, input-message, tabs, tabs-subtle, thinking-steps (all use `buttonProps`) | `buttonProps` handles keydown on the way up, so a `buttonProps` element nested in another is clicked twice on Enter: the inner one clicks itself and the outer one clicks the same target. The fix is to act only when `target === currentTarget` | none; nested cases are not counted |
| dialog, mobile-drawer | `DialogBackdrop` closes on mousedown; the DOM and Base UI close on click | The app's own backdrop div closes on a click that presses and releases on it |
| dialog, mobile-drawer | A reactive prop change on `DialogPopup` re-creates the popup and loses focus | `aria-labelledby` and `-describedby` are static ids |
| scroll-area | A horizontal or both-axis scroller does not extend its scroll width for content that overflows through descendants (a block wrapper clamps to the viewport width) | The viewport is a flex row with `alignItems: "flex-start"` |
| any nested scrollers (scroll-area, combobox, select, sidebar) | One large wheel event chains its remainder to the outer scroller in the same event; a browser latches the whole event to the first scroller | none |
| select, combobox | Enter in a form `<input>` with an empty `required` control does nothing; HTML implicit submission validates, sets `invalid` and moves focus. Only `requestSubmit()` validates | The demos submit through `requestSubmit()` |
| dropdown submenus (audit rows 386, 721), tooltip | `window` and `document` mousemove listeners fire only when an element on the hit path has a mousemove listener, never over bare window background, so a safe polygon between trigger and popup cannot be tracked | A dwell timer for submenus (`SUBMENU_DWELL_MS`), a grace timer for the tooltip |
| tooltip and dialog demos | After a failed script run Bun aborts with `thread local panicked on drop` | none; the harness only |
| screenshots, app-frame | The test renderer ignores the window options (titlebar, traffic lights), `setAppearance` changes nothing and `onAppearanceChange` never fires; `createAppearance` is the machine's | Captures pin the scheme with `setThemeChoice` and show no traffic lights |
| screenshots | `simulateKeystrokes` takes GPUI key names (`down`, `tab`, `enter`), not DOM ones, and delivers a keydown only: `space` never gets its key-up or click | `shot.press` passes the names through; scenarios press Enter, which activates on keydown |
| screenshots | `nativeSimulateScrollWheel` keeps GPUI's sign: negative `deltaY` scrolls down, where `onWheel` sees positive-down | Scenarios pass negative deltas |
| screenshots | A mouse move without a held button is not delivered to an element that holds pointer capture; batched keystrokes deliver an input's `onChange` after the whole batch | `shot.moveHeld` sends the move with a button held; none for the batch |
| not counted | `relatedTarget` and `target` on focus events are element ids (numbers), not elements | none |
| screenshots | The accessibility dump flags an `aria-hidden` node as hidden but not its descendants, and `A11yTreeDump` lacks `frame` | `scripts/screenshots.tsx` reads `frame.tab_stop_count` through a cast |

### Missing features

| Used by | What | Workaround here |
|---|---|---|
| popups (select, combobox, dropdown, color-picker, tooltip, dialog), chevrons (accordion, card, color-picker, thinking-steps), scale-in entrances (banner, ask-user-questions, chat-message, input-copy, input-message, queued-stack, radio-group), spinners (file-thumbnail) | CSS transforms: no scale, rotate or translate, so the popup's `scaleY: 0.96` entrance and every turn and pop is impossible (audit rows 525, 606) | Popups slide from the reported side and fade; glyphs swap, fade or are redrawn in SVG; panels move on `top` / `left` / `bottom` |
| slider | `<input type="range">` (audit row 310) | A pointer-handled track and thumbs |
| select, combobox (`FormValue`) | `<input type="hidden">` | A real input that is invisible, unreachable and `aria-hidden` |
| accordion, ask-user-questions, input-message, sidebar, thinking-steps (`createMeasuredHeight`) | Motion on `width: auto`, and layout size morphs | The content box reports its size through `onLayout` and the outer box tweens to that number |
| not counted | Container queries | none |
| not counted | `:has()` | none |
| table | `display: table`, `border-collapse` and `inline-*`: columns cannot size to their widest cell | Flex rows with equal-width cells and an optional fixed `width` |
| not counted | `em`, `rem`, `vw` and `vh` units | Pixel numbers |
| not counted | `disabled` on anything but an input: other elements get `aria-disabled` only, so they stay focusable and clickable | `aria-disabled` plus the component's own guard |
| not counted | `url()` backgrounds and masks | `<img>` elements and SVG `<mask>` |
| file-thumbnail | A canvas pixel path (a PDF page preview) | The caller passes a type and the thumbnail shows a glyph |
| not counted | Effect groups (`filter`, `backdrop-filter`, `mask`, `clip`, group opacity) off macOS | none |
| carousel-dots, file-thumbnail, thinking-indicator, thinking-steps | `requestAnimationFrame` | `lib/clock.ts`: one shared, ref-counted `setInterval` frame clock |
| dropdown, select, combobox, scroll-area | Intrinsic `width`: `max-content`, `min-content` and `fit-content` are rejected outside grid tracks, so a popup cannot grow to its widest row | A fixed panel width (288px, 224px for submenus), `popupWidth`, `minWidth: "anchor-size(width)"` |
| badge | `text-box-trim` / `text-box-edge`: a label is centred by its full line box | Flex centring in a fixed-height pill (about a pixel of drift) |
| card, table (every `StableLabel`: tabs, tabs-subtle, sidebar, menu rows) | Variable-font axes (`fontVariationSettings`): only a font's default instance renders, so the weight cannot ease between 400 and 550 | Static cuts; the weight switches at once, SemiBold 600 for 550 |
| combobox (command-menu, dropdown-search, input-group, input-message) | IME composition: no `composition*` events, `isComposing` is always `false`, and `keydown` cannot cancel a key an IME consumed | none; IME input is untested |
| button (every `buttonProps` button) | A keyboard `:active` state: a held Space does not play the pressed look | none; Space still activates on key-up |
| thinking-steps | `filter` in `motion` targets: `blur()` paints as a static style but cannot be tweened | Opacity only |
| thinking-indicator | Percentage insets in `motion` (`top: "80%"`) | Pixel offsets from the line height |
| color-picker | A JS-visible CSS colour resolver: named colours and `color-mix()` resolve natively for styles only | `parseColor` reads hex, `rgb(a)`, `hsl(a)` and `oklch`; a name is rejected |
| queued-stack | An input-device signal: `matchMedia` fixes `hover` to `hover` and `pointer` to `fine`, so `(hover: none)` never matches | none; desktop only |
| combobox, select (any form) | A submit button: `SubmitEvent.submitter` is always `null` | The demos call `form.requestSubmit()` |

## Harness and shared-lib notes

Quirks of this repo's own code, kept apart from the gpuix list above.

- **Focus dimming.** gpuix dims every other focusable control while one has keyboard focus, so buttons, inputs and
  the tab and card wrappers set `keyboardFocusDim: false`.
- **Pointer events.** Filled and positioned boxes no longer block an ancestor's hover and press, so
  `pointerEvents: "none"` is left only where a browser needs it too: overlays above interactive siblings, the
  fluid highlights, a disabled cascade, the slider's press target, the hidden form input. The dropdown's submenu
  panel and the dialog and drawer popups opt back in with `"auto"`.
- **Overlays live inside the scrolled content.** Highlights and rows share a relative wrapper inside the scroller
  (combobox list), as in the DOM, where an absolute child of a scroller that is not its containing block does not
  scroll with the content. Rows are measured relative to that wrapper, so rects do not change as the list scrolls.
- **Escape.** `PopupSurface` joins gpuix's dismiss-layer stack while open, so Escape closes only the topmost popup,
  even inside a dialog.
- **Dialog.** gpuix's `Dialog` unmounts the instant `open` goes false, so a local `mounted` signal keeps the
  content through the fade; a trigger pressed during the fade is ignored. The backdrop is the app's own,
  because gpuix's closes on mousedown.
- **Screenshots run on the test renderer** (`scripts/screenshots.tsx`).
  - Captures show no traffic lights or native titlebar, and pin the theme to Dark (`setThemeChoice`), because the
    test renderer ignores the window options and its appearance is the machine's.
  - `settle()` runs frames for real time, flushing the tree and draining native events each frame; a bare `flush()`
    never delivers `onMotionComplete`, so presence exits would never unmount. The first capture waits 800 ms.
  - Helpers read `getElementBounds` once per step to find an element's centre; nothing polls bounds. `shot.press`
    takes GPUI key names and `shot.scroll` GPUI's sign (negative scrolls down). There is no double-click or
    file-drop helper.
  - `shot.aria`, `expectAria`, `idOf`, `hasAriaNode` and `tabStopCount` assert on the accessibility tree.
  - Captures are not byte-stable: the text caret, timing-driven demos (thinking steps, shimmer, spinner) and
    queue text vary run to run. Compare the content area with a pixel diff, not file hashes.

<details>
<summary>How the first three components translate (Tailwind to gpuix)</summary>

The Button, Combobox and Sidebar were ported first, with this table kept as they went. Most rows have since
were later fixed in gpuix or generalised into the limitations above.

| Tailwind / CSS | gpuix | Fidelity |
|---|---|---|
| `hover:` / `active:` on the same element | `style.hover` / `style.active`, applied natively | Exact |
| `group-hover:` (icon stroke, label colour) | `onMouseEnter` / `onMouseLeave` plus a signal | Exact, one JS round trip |
| `focus-visible:ring-1` | `style.focusVisible` outline, offset 1 | Exact |
| `ring-1 ring-border` | `outlineWidth` / `outlineColor`: outside the box, takes no layout | Exact |
| `transition-colors duration-80`, `transition-[box-shadow]` | none: state styles switch instantly. Only `motion` animates | Dropped |
| spring `fast` / `moderate` (`motion/react`) | native `motion` spring, `{ type: "spring", duration: 0.08 / 0.16, bounce: 0 }`, velocity kept when the target changes mid-flight | Exact; `slow` is unused |
| exits (`spring.fast.exit` …) | plain tweens, 60 ms / 120 ms, like the source | Exact |
| "snap, don't spring" on a reflow | a zero-length tween | Exact |
| `translate` / `x`,`y` travel of the highlight | `motion` on `top` / `left` / `width` / `height` (the only layout props it animates) | Equivalent, but it re-lays out per frame |
| `scaleY: 0.96` on popup enter | not possible, no transforms. Opacity plus the 4px slide stay (`top` −4 → 0) | Partly dropped |
| `z-index` (overlays under rows) | document order: the highlights are the container's first children and rows keep transparent backgrounds | Equivalent |
| press-shrink: inset-px layer plus same-colour `box-shadow` spread | the element carries `margin: 1` and a spread-1 shadow, and `active` sets spread 0 | Exact for flat fills |
| translucent fill (`--tint`, `bg-hover`) over that shadow | gpuix paints a shadow under its element with no knock-out, so a background on top doubles up. Fills are the shadow alone, with no `backgroundColor` | Exact, but a different mechanism |
| tertiary ring that moves inward on press (outer to inset shadow) | outline, offset 0 at rest and −1 pressed | Exact |
| `shadow-surface-3` (1px ring + two stacked drops) | `borderWidth: 1` plus one drop shadow. gpuix paints a single non-inset shadow | Approximated |
| `color-mix(in oklab, …)`, `light-dark()` | both columns kept as a token table; the scheme is a signal | Exact |
| dark `--shadow-3` (inset hairline + ring + drops) | popup `borderColor` of white at 5% plus the one drop shadow | Approximated |
| `prefers-color-scheme` ("System" theme) | `createAppearance()` reads the OS appearance and `bindSystemScheme` feeds it to the `scheme` token. System / Light / Dark are one `themeChoice` signal, and `renderer.setAppearance` mirrors Light / Dark so the native chrome follows | Exact in the window; captures run on the test renderer, whose appearance is fixed, so they pin Dark |
| Base UI `Positioner` (flip, `--anchor-width`, `--available-height`) | `<anchored fit="flip" deferred>`: gpuix picks the side and reports it with the room left (`onPlacement`), and `PopupSurface` caps the card to that room, slides from the reported side and is at least the trigger's width | Equivalent |
| `ScrollArea` (hover thumb, scroll fade) | a plain `overflowY: "scroll"`, on the combobox list and the sidebar | Dropped |
| `getBoundingClientRect` | `element.getBoundingClientRect()`, read when needed (layout is flushed first, so it is never stale) | Native |
| `ResizeObserver` | gpuix's `ResizeObserver` (fluid hover, slider width, queued stack) and `onLayout` (size, after the first paint and on every change) | Exact |
| `text-[length:…] leading-[…]` | `fontSize` + `lineHeight` | Exact |
| `[text-box:trim-both_cap_alphabetic]` | none: labels are centred by their line box | Dropped, a pixel of optical drift |
| Inter variable (`wght 550`, `opsz`) | static Inter TTFs (400, 500, 600, 700) passed as `fonts` to `render()`; the family is `Inter` for every weight. the site's 550 is set as SemiBold 600, there is no `opsz` | Approximated, one weight step |
| ghost-span that reserves the semibold width | the same trick: a hidden copy in flow, the visible label absolutely positioned over it | Exact |
| `truncate` | `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"` on the combobox rows | Exact; sidebar labels are not truncated |
| icon stroke 1.5 → 2 on hover | the SVG string is swapped | Exact, instant |
| `animation: spinner-move` | a static lucide `loader`: no rotation, no animation | Dropped |
| `AnimatePresence` exit of the popup | the popup stays mounted for 60 ms while its opacity fades | Approximated |

Not ported there: pill shape, the Radius / Size / Icons / Primitive rows of the customise card, multiple-select
combobox and chips, rail resize, the traveling keyboard focus ring in the sidebar, row actions, and `gapClick` (a
click between rows is not routed to the highlighted row).
</details>
