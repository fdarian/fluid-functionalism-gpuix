# gpuix + fluid functionalism

Can [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine, draw the
[fluidfunctionalism.com](https://fluidfunctionalism.com) component library?

Yes. 32 demo pages cover every component of the library (36 component files, counting shared parts such as
choice-group and menu-item), in the light and dark schemes, with the site's fluid hover, springs and keyboard
behaviour. What does not carry over is catalogued below: [7 gpuix bugs and 57 missing features](#gpuix-limitations),
ranked by how many components each one hurts.

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
| `fluid-hover.ts`, `fluid-highlight.tsx` | The site's `use-fluid-hover`: rows register, their painted boxes are read, `pickNearest` (ported verbatim) resolves the pointer to a row including gaps, and one highlight glides between rows. `hover.containerProps` and `useHoverItem` wire a list. |
| `bounds.ts` | `readBounds` (sync, null before first paint) and `awaitBounds` (12 tries x 16 ms, then throws). The first `getElementBounds` only turns tracking on. |
| `measured-height.ts` | A box whose height springs to its content's: re-reads while "hot", used by every collapse. |
| `popup.tsx`, `presence.ts` | Popup chrome on `<anchored>`, `placePopup` (side from bounds, capped height), `isInside` (outside presses by bounds), and `createPresence` (mounted outlives open so an exit can play). |
| `list-nav.ts` | `moveIndex` (skip disabled, wrap or clamp) and `revealRow` (scroll a row into view by hand). |
| `stable-label.tsx` | A label that gains weight without moving its neighbours: a hidden semibold copy reserves the width. |
| `clock.ts` | One shared, ref-counted frame clock for every JS-driven loop. |
| `fonts.ts`, `app-frame.tsx` | The static Inter files passed to `render()` and the test renderer; the window frame (chrome-coloured bar, rounded page panel). |
| `press.ts`, `icons.ts`, `icon.tsx` | The press-shrink shadow; lucide glyphs as SVG strings (`defineIcon` for a component's own). |
| `demo.ts`, `demo-kit.tsx` | The demo contract and the card every page is made of. |
</details>

## gpuix limitations

What gpuix lacks or gets wrong, found by porting every component. Transforms (no rotate, scale or translate) are
known and not repeated here. An entry counts the components that hit it; each component's own file
in [`limitations/`](limitations) has the detail, the original behaviour and the fidelity of its workaround.
"Bug" means gpuix does something wrong or inconsistent; "missing" means it simply does not offer it. When unsure I
called it missing. A few entries were disputed between component files: the occlusion rule below is documented in
`host.ts`, so it is listed as missing, not as a bug.

### Bugs

| Used by | What | gpuix source | Workaround here |
|---|---|---|---|
| **5**: mobile-drawer, scroll-area, sidebar, combobox, select | Scroller with padding scrolls by 2x padding even when content fits (padded overflowY:scroll box, 16px pad, 2x40px rows scrolled 32px) | not traced | No padding on the scroller; an inner box carries it |
| **4**: ask-user-questions, radio-group, checkbox-group, tabs | Focus events arrive out of order: new row's onFocus fires before the old row's onBlur (renderer.focusElement), so blur handlers clear fresh state | not traced | Blur only clears the focused index if it is still this row's |
| **3**: dialog, mobile-drawer, command-menu | DialogPortal builds its children twice: the anchored element reads the children getter, then declares get children() that builds it again; discarded copy keeps effects/timers alive | `packages/solid/src/components/dialog.ts:110, :117, :137` | once() builds content once per open and drops it on dispose |
| **3**: tooltip, dropdown, select | <anchored align="center"> offsets the layer twice (wrapper centres origin, then resolved_anchor shifts by size/2 again) | `packages/native/src/custom_elements/anchored.rs:193, :217, :155, :158` | Pass an explicit anchor (bottomLeft/topLeft/topRight) together with align="center" |
| **3**: mobile-drawer, accordion, scroll-area | getElementBounds is inconsistent within a tick under a moving ancestor: container and child read one frame of ancestor travel apart (16px), skewing fluid-hover rects | not traced | Slide the panel empty, measure at rest (onMotionComplete), then fade content in |
| **2**: checkbox-group, radio-group | onClick is wired to mouse-up with no press-origin check: press on row A, release on row B fires click on B | `packages/native/src/renderer.rs:5460` | none |
| **2**: scroll-area, table | A both-axis scroller stays display:block (only x-only scrollers get flex/min-width:0), so a wide child fills the parent instead of overflowing | `packages/native/src/renderer.rs:5371` | Viewport sets display:flex; flexDirection:row; alignItems:flex-start itself |

### Missing features

The 33 that hit four or more components:

| Used by | What | gpuix source | Workaround here |
|---|---|---|---|
| **23**: accordion, card, carousel-dots, chat-message, checkbox-group, color-picker, command-menu, dropdown, input-copy, input-group, input-message, queued-stack, radio-group, scroll-area, slider, switch, thinking-steps, tooltip, tabs, tabs-subtle, sidebar, button, file-thumbnail | Absolute/fixed boxes, non-transparent fills and pointerEvents:auto insert a hit-test blocker, so ancestors never get hover/enter/leave/down/click over them; no bubbling opt-in (by design per host.ts doc; many files call it bug-shaped) | `packages/native/src/style.rs:317 (also :318, :323)`<br>`packages/native/src/renderer.rs:5335 (also :5336-5352, :5347)`<br>`packages/native/js/host.ts:247` | pointerEvents:"none" on every decorative/filled/absolute child; own signals or counters where the child must stay interactive |
| **14**: accordion, banner, command-menu, dropdown, input-message, queued-stack, scroll-area, select, slider, tabs-subtle, thinking-steps, tooltip, combobox, sidebar | getElementBounds first call returns null (only turns tracking on), box exists from next painted frame, is last-frame stale and the padding box | `packages/native/src/automation.rs:83`<br>`packages/native/src/renderer.rs:2333` | Prime at mount, retry per frame (up to 12, then throw), re-read on enter/press, timers |
| **11**: accordion, card, color-picker, input-copy, input-group, scroll-area, switch, table, tabs, tabs-subtle, sidebar | No colour transitions: colour/background/border/shadow are not in MotionStyle and hover/active/focusVisible state styles switch instantly (transition-colors dropped) | `packages/native/src/motion.rs:14`<br>`packages/native/js/host.ts:27` | Instant switch, or an always-mounted absolute layer whose opacity is animated |
| **10**: ask-user-questions, tabs-subtle, thinking-steps, input-group, color-picker, combobox, input-copy, tabs, accordion, slider | No ARIA beyond role/aria-label/-description/-id/-expanded/-selected/-valuetext/-level: no aria-checked, -controls, -labelledby, -describedby, -invalid, -valuenow/min/max, no label-for | not traced | aria-selected / aria-id / aria-valuetext substitutes; label onClick focuses input |
| **9**: card, carousel-dots, dialog, file-thumbnail, mobile-drawer, table, scroll-area, banner, app-frame | overflow:hidden clips to a rectangle, not the rounded box (ContentMask is bounds-only); flush children show square corners | `zed/crates/gpui/src/window.rs:1930` | Child rounds its own corners (img borderRadius, tileCorner, the app frame's row and sidebar); pill that grows instead of a clipped slide |
| **8**: switch, slider, scroll-area, color-picker, input-copy, tooltip, queued-stack, input-message | Pointer capture is only implicit: an element with both onMouseDown and onMouseMove gets capture_pointer(); undocumented, no explicit API, and it swallows descendants' mouseUp/click | `packages/native/src/renderer.rs:5663`<br>`GPUI window.rs:2874, elements/div.rs:2724` | Put all three handlers on the dragged element only; drag region excludes child buttons; Tooltip function-children form |
| **8**: accordion, command-menu, input-message, scroll-area, slider, thinking-steps, tabs-subtle, sidebar | No ResizeObserver / layout-change signal: content or window resize is never reported, so measured heights, widths and thumbs go stale | `packages/native/src/automation.rs:83`<br>`packages/native/src/renderer.rs:2333` | Re-measure on hover/scroll/prop change, remeasureFor timers, hot/cold poll; some cases left stale |
| **8**: checkbox-group, select, input-copy, thinking-indicator, dropdown, switch, command-menu, accordion | No SVG internals animation: no stroke-dash/pathLength draw, no path morph, svg is one tinted glyph | `packages/native/js/host.ts:22`<br>`packages/native/js/host.ts:27` | Fade in, left-to-right clip wipe, or JS timer rewriting the svg source string |
| **7**: accordion, banner, command-menu, input-message, tabs-subtle, thinking-steps, sidebar | motion cannot target height:auto, fr tracks or layout size; only plain pixel numbers (apply_to writes DimensionValue::Pixels) | `packages/native/src/motion.rs:14`<br>`packages/native/src/motion.rs:740`<br>`packages/native/js/host.ts:27` | Measure content with getElementBounds and tween 0 to the pixel value |
| **7**: accordion, checkbox-group, radio-group, tabs, tabs-subtle, tooltip, sidebar | No focus modality in JS: onFocus/onBlur carry no payload (no keyboard-vs-pointer, no relatedTarget); focusVisible exists only as a native style on the focused element, so no traveling ring and no focus-opens-tooltip | `packages/native/js/host.ts:262`<br>`packages/native/src/renderer.rs:4841`<br>`EventPayload in packages/native/index.d.ts` | Per-element native focusVisible outline; microtask + getFocusedElementId; renderer.focusElement |
| **7**: command-menu, scroll-area, slider, select, dropdown, carousel-dots, sidebar | No mask-image / clip-path / scroll-linked styles, so scroll-fade, scroll-divider and step-dot sweeps are impossible | not traced | Flat-colour gradient overlays with opacity from scroll offset; fixed hairlines; per-dot opacity |
| **6**: dropdown, select, tabs, accordion, combobox, command-menu | Rows are not focusable roving-tabindex items: highlight is a virtual index, arrow keys move focus by renderer.focusElement, no focus return to trigger | not traced | Virtual highlight + wrapper key handlers; focusElement; typeahead buffer |
| **6**: scroll-area, dropdown, select, mobile-drawer, combobox, sidebar | No painted scrollbar, onScroll is wheel-only (deltaX/Y, no offset, not fired for scrollTo/drag/keys), only polled via getScrollOffset; overflow:auto absent (scroll only) | `packages/native/src/renderer.rs:5605` | Draw the thumb in-component, poll offset at 0/16/48/100 ms; bare scroller elsewhere |
| **6**: color-picker, input-message, slider, ask-user-questions, input-copy, input-group | No caret/selection access or select-on-focus on input/textarea (no select(), setSelectionRange, selectionStart); no type/step/min/max | `packages/native/src/custom_elements/input.rs:518`<br>`packages/native/src/custom_elements/input.rs:959` | autoFocus + manual delete; single-line-only history; none |
| **6**: accordion, tabs, tabs-subtle, slider, checkbox-group, thinking-indicator | motion has one MotionTransition per node, so no per-property transitions (spring + tween on one element) | `packages/native/src/motion.rs:155`<br>`packages/native/js/host.ts:98 (also :98-103)` | Two nested motion.divs, one transition each |
| **6**: slider, switch, banner, checkbox-group, radio-group, accordion | No motion values: no shared/derived (useTransform) or readable/imperative value, so linked layers are separate springs that can drift; mid-flight grab restarts from target | `packages/native/js/host.ts:98`<br>`packages/native/src/motion.rs:14` | Same spring and target maths on each layer; zero-length tween while dragging |
| **5**: color-picker, banner, thinking-indicator, slider, card | Gradients: only two stops and one background layer (no stacked backgrounds) | `packages/native/js/host.ts:159` | Several two-stop segments side by side; stacked absolute layers (document order) |
| **5**: banner, dropdown, command-menu, table, scroll-area | No position:sticky | `packages/native/src/style.rs:323` | Render the sticky piece above the scroller as sibling/chrome |
| **5**: banner, carousel-dots, thinking-indicator, thinking-steps, queued-stack | No reduced-motion preference or media queries (prefers-reduced-motion, hover:none) | not traced | none; always animate, desktop-only |
| **4**: scroll-area, combobox, select, sidebar | Nested scrollers all scroll at once: every scroll container under the pointer applies the wheel tick (listener never stops propagation), no overscrollBehavior | `zed/crates/gpui/src/elements/div.rs:3266` | containWheel restores the ancestor's offset after a tick that moved the area |
| **4**: select, command-menu, dropdown, combobox | element.scrollIntoView scrolls to the scroller's direct child containing the element, so rows inside the required wrapper scroll nowhere | `packages/native/src/renderer.rs:3860-3890 (scroll_target at :3874)` | revealRow: measured rect + getScrollOffset + scrollTo (instant jump) |
| **4**: slider, queued-stack, carousel-dots, scroll-area | Pointer events carry window x/y only: no element-local coordinates, so pointer-to-value needs padding-box bounds | `packages/native/src/automation.rs:83`<br>`EventPayload in packages/native/index.d.ts` | Read bounds on enter/press/move and subtract |
| **4**: dropdown, select, tooltip, combobox | Popup placement: no flip that clears the trigger (switch covers it, snap slides over it), no available-height measure | `packages/native/src/custom_elements/anchored.rs:351-352` | Choose side on open from trigger bounds + window height; max-height = room; no flip at right edge for submenus |
| **4**: dropdown, color-picker, combobox, select | No group-aware outside press or tree-bubbling for popups: onMouseDownOutside fires per element, a deferred anchored layer is hit-tested alone so the parent gets mouseLeave entering a submenu | `packages/native/src/renderer.rs:5586`<br>`DismissableLayer in packages/solid/src/components/floating.ts` | Compare event.x/y with painted bounds of trigger and popups; dwell timer for submenus |
| **4**: ask-user-questions, command-menu, sidebar, dialog | No window-level key subscription for components (window key events go only to render() options) | `packages/solid/src/root.ts:85 (also :85-104)` | Focusable container with onKeyDown; open from a button, shortcut cap is display-only |
| **4**: command-menu, input-message, dropdown, combobox | Text editor binds Left/Right/Home/End (input) and Up/Down/Enter/Backspace (textarea) as actions that consume the key; JS onKeyDown never fires and cannot cancel | `packages/native/src/custom_elements/input.rs:200-209 (handlers :1669-1690)`<br>`input.rs:182`<br>`packages/native/src/renderer.rs:3615` | Ctrl-P/Ctrl-N, onSubmit for Enter; none for Left/Right/Home/End |
| **4**: thinking-indicator, file-thumbnail, carousel-dots, thinking-steps | No keyframes or repeat, so loops (spinner, glyph morph, shimmer, autoplay clock) cannot be native motions; clock must be pausable/readable | `README.md:1101`<br>`packages/native/js/host.ts:27` | Shared JS setInterval clock (16-33 ms) rewriting style/svg each frame |
| **4**: chat-message, input-message, queued-stack, carousel-dots | No layout/shared-layout (FLIP) animation, layoutId morph or drag-reorder primitive: siblings jump | `README.md:1101` | Instant reorder; entrance kept on top/opacity |
| **4**: card, thinking-steps, file-thumbnail, chat-message | No aspectRatio in StyleDesc; <img> height from ratio is unreliable when parent width is not definite (observed 600px box, not traced) | `packages/native/js/host.ts:163-249 (absent)` | Pixel height / caller-stated ratio |
| **4**: banner, table, card, dialog | Grid/layout: gridTemplateColumns is a track count only (no auto/fr), no order, no row-reverse, no container queries, no :has(), no table layout | `packages/native/js/host.ts:178`<br>`packages/native/src/renderer.rs:5799` | Nested flex rows; equal-width columns; context-driven layout flip |
| **4**: color-picker, dialog, input-message, tabs | Box shadows: one layer, no inset | not traced | Border/outline for the ring + single largest drop shadow |
| **4**: chat-message, color-picker, queued-stack, table | OpenType feature control absent (tabular-nums / font-variant-numeric); not a font-loading gap | not traced | none; proportional digits |
| **4**: dialog, banner, card, sidebar | position:absolute resolves against the parent element, not the nearest positioned ancestor | not traced | Render the overlay as a direct child of the region (scoped prop) |

<details>
<summary>The 24 that hit three or fewer</summary>

| Used by | What | gpuix source | Workaround here |
|---|---|---|---|
| **3**: input-message, chat-message, queued-stack | File drop yields paths only: no File/Blob, size/mtime, picker type filter, or drag-enter/over/leave (only on_drop) | `packages/native/src/renderer.rs:5599` | {path,name,type} guessed from extension; filter after picker; no drag-over state |
| **3**: table, chat-message, card | No state-style group selectors: group-hover, group-focus-within, descendant selectors; hover/active/focusVisible apply to the element itself | `packages/native/js/host.ts (StyleDesc)` | Solid context/signals from the row; none for focus-within |
| **3**: input-group, combobox, input-message | <input> has no disabled prop (readOnly still focuses and shows caret) | `packages/native/src/custom_elements/input.rs:522`<br>`InputProps in packages/native/js/host.ts` | readOnly + pointerEvents:none + opacity 0.5; still tab-focusable |
| **3**: card, thinking-steps, dialog | No filter / backdrop-filter blur | not traced | Opacity only / flat 70% colour |
| **3**: checkbox-group, ask-user-questions, dropdown | motion animates one borderRadius, not per-corner radii; no corner straightening in merge/split | `packages/native/src/motion.rs:14 (also :22)`<br>`packages/native/js/host.ts:22 (static corners :220)` | One FluidHighlight per run; surviving block springs over the union |
| **3**: tabs-subtle, banner, accordion | motion cannot animate margin or padding | `packages/native/src/motion.rs:14`<br>`packages/native/src/motion.rs:740` | Gap carried as padding on an inner element; pixel height only |
| **3**: badge, banner, select | Colour functions absent: colours are literals, no color-mix() against a theme colour | `packages/native/js/host.ts:209`<br>`oklab gradient only interpolates two stops (host.ts:160)` | Own sRGB mix() at render time / rgba literals per scheme |
| **2**: thinking-indicator, thinking-steps | No text-fill other than flat colour (no background-clip:text gradient, shimmer) | `packages/native/js/host.ts:159` | One <text> per letter recoloured each frame from the JS clock |
| **2**: ask-user-questions, input-copy | No rich inline runs (colour/weight/background) inside one text block; nested <text> is a div; no inline backgrounds (<mark>) | `README.md:3095` | Wrapping flex row of separate <text> boxes; highlight prop for the wash |
| **2**: thinking-indicator, ask-user-questions | AnimatePresence has no popLayout mode: an exiting node stays in flow | not traced | Fade-in only / absolute-positioned words with top tween |
| **2**: color-picker, slider | No cursor:none and no pointer lock (scrub fields keep the OS cursor, travel ends at screen edge) | `CursorValue in packages/native/js/host.ts` | cursor crosshair/ew-resize; 3px-threshold scrub |
| **2**: input-copy, chat-message | No clipboard write from JS | `packages/native/index.d.ts` | Spawns pbcopy / wl-copy via Bun.spawn |
| **2**: carousel-dots, input-message | No capture-phase handlers or event target/closest(): a handler cannot tell which descendant took the press | `packages/native/js/host.ts (HostProps)` | Bubbling handlers on wrapper; handler on the textarea wrapper only |
| **2**: color-picker, table | No conic gradient, background-size/repeat or tiling (alpha checkerboard) | not traced | Backing div + generated monochrome SVG path of squares |
| **1**: app-frame | No window drag region: `Window::start_window_move` and `WindowControlArea` are not plumbed to JS, so the top bar cannot drag the window or zoom it on double-click (the native titlebar strip may still drag; unverified) | `zed/crates/gpui/src/window.rs:2607`<br>`zed/crates/gpui/src/window.rs:744` | none |
| **1**: app-frame | The test renderer ignores window options (titlebar, traffic lights) and `setAppearance`, and `createAppearance` there is the machine's appearance and never changes | `packages/native/js/testing.ts:120` | Captures pin the scheme with `setThemeChoice` and show no traffic lights |
| **1**: file-thumbnail | <img> has no onLoad/onError, no File/blob URL, no canvas pixel path (PDF preview) | `ImgProps in packages/native/js/host.ts` | Caller passes {name,type,src} and a pending flag; PDF shows glyph |
| **1**: file-thumbnail | No per-side border colour (borderColor is one value) | not traced | Stacked static ring + rotating SVG arc |
| **1**: slider | opacity is applied per primitive, not as an offscreen group, so overlapping children of a translucent parent show through each other | not traced | none |
| **1**: banner | svg is a monochrome tinted mask: no per-path colour | `SvgProps in packages/native/js/host.ts` | SVG <mask> cuts the mark out of the shape |
| **1**: card | No margin:auto (margin is number only) | `packages/native/js/host.ts:196` | flexGrow:1; flexBasis:0 spacer |
| **1**: thinking-steps | No IntersectionObserver / visibility observer | not traced | Start on mount with manual pause/play |
| **1**: select | No form integration (name, required, hidden input) | not traced | not ported |
| **1**: color-picker | No OS eyedropper / screen sampler and no CSS colour-name resolver | not traced | Eyedropper button not rendered; parseColor hex/rgb/hsl/oklch only |
</details>

## Harness and shared-lib notes

Quirks of this repo's own code, kept apart from the gpuix list above.

- **`Show` / `For` leave gap slots.** A conditional among siblings leaves an empty Solid text node that gpuix lays
  out as a flex or grid item, so each hole adds one `gap` (`packages/native/src/renderer.rs:5677`,
  `packages/solid/src/host.ts:137`). Component files disagree on whether this is a gpuix bug. Containers with
  conditional children use margin or padding, one fragment, or absolute layers, never `gap` (11 components).
- **Absolute and filled boxes block the mouse, so ours opt out.** Every decorative absolute or filled child inside a
  hover target sets `pointerEvents: "none"`; `StableLabel` and the fluid highlights do it for you. Forgetting it
  makes fluid hover go dead while the pointer is over that child.
- **Overlays live inside the scrolled content.** gpuix paints an absolute child of a scroller where it was placed,
  not where the content has scrolled to, so highlights and rows share a relative wrapper *inside* the scroller.
  Rows are measured relative to that wrapper, so rects do not change as the list scrolls.
- **Focus dimming.** gpuix dims every other focusable control while one has keyboard focus, so buttons and inputs
  set `keyboardFocusDim: false`. A key listener on a container makes it focusable, which triggers the dimming too.
- **Escape.** `PopupSurface` joins gpuix's dismiss-layer stack while open, so Escape closes only the topmost popup,
  even inside a dialog.
- **Shared Tooltip.** The wrapper form listens for `mouseDown` and `mouseMove`, which makes gpuix capture the pointer
  and swallow the child's click; `Button` cannot take its handlers either. The function-children form avoids both.
- **Dialog.** gpuix's `Dialog` unmounts the instant `open` goes false, so a local `mounted` signal and `once()`
  keep the content through the fade; a trigger pressed during the fade is ignored.
- **Hover-reveal groups** (chat-message actions) use `pointerEvents: "none"` until hovered, so a keyboard user can
  tab to an invisible, unclickable action: there is no focus-within.
- **Screenshots run on the test renderer.**
  - Captures show no traffic lights or native titlebar: the test renderer ignores the window options, so the top bar
    is empty apart from the title. They pin the theme to Dark (`setThemeChoice`) because its appearance is the
    machine's.
  - `settle()` sleeps real time and drains native events each frame; a bare `flush()` never delivers
    `onMotionComplete`, so presence exits would never unmount.
  - `TestRenderer.getElementBounds` triggers a full draw (about 28 ms), so timer-polled bounds can starve a run.
  - The first simulated move produces only `mouseEnter`, springs advance only on drawn frames, and there is no
    double-click or file-drop helper.
  - Captures are not byte-stable: the text caret, timing-driven demos (thinking steps, shimmer, spinner) and
    queue text vary run to run. Compare the content area with a pixel diff, not file hashes.

<details>
<summary>How the first three components translate (Tailwind to gpuix)</summary>

The Button, Combobox and Sidebar were ported first, with this table kept as they went. Most rows have since
generalised into the limitations above.

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
| Base UI `Positioner` (flip, `--anchor-width`) | `<anchored gap={6} deferred>`; the popup width is a constant. gpuix snaps an overflowing popup into the window, and its `switch` flip anchors to the far edge of the field and covers it, so the combobox picks `top` or `bottom` itself from the painted bounds and the window height | Approximated |
| `ScrollArea` (hover thumb, scroll fade) | a plain `overflowY: "scroll"`, on the combobox list and the sidebar | Dropped |
| absolute child of a scroll container | gpuix paints it where it was placed, not where the content has scrolled to, so rows and overlays share a relative wrapper *inside* the scroller | Needed workaround |
| `getBoundingClientRect`, `ResizeObserver` | `getElementBounds` (last painted frame) read on timers | Approximated, up to a frame stale |
| `text-[length:…] leading-[…]` | `fontSize` + `lineHeight` | Exact |
| `[text-box:trim-both_cap_alphabetic]` | none: labels are centred by their line box | Dropped, a pixel of optical drift |
| Inter variable (`wght 550`, `opsz`) | static Inter TTFs (400, 500, 600, 700) passed as `fonts` to `render()`; the family is `Inter` for every weight. 550 resolves to SemiBold 600, there is no `opsz` | Approximated, one weight step |
| ghost-span that reserves the semibold width | the same trick: a hidden copy in flow, the visible label absolutely positioned over it | Exact |
| `truncate` | `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"` on the combobox rows | Exact; sidebar labels are not truncated |
| icon stroke 1.5 → 2 on hover | the SVG string is swapped | Exact, instant |
| `animation: spinner-move` | a static lucide `loader`: no rotation, no animation | Dropped |
| `AnimatePresence` exit of the popup | the popup stays mounted for 60 ms while its opacity fades | Approximated |

Not ported there: pill shape, the Radius / Size / Icons / Primitive rows of the customise card, multiple-select
combobox and chips, rail resize, the traveling keyboard focus ring in the sidebar, row actions, and `gapClick` (a
click between rows is not routed to the highlighted row).
</details>
