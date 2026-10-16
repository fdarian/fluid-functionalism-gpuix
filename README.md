# gpuix + fluid functionalism

Can [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine, draw the
[fluidfunctionalism.com](https://fluidfunctionalism.com) component library?

Yes. 32 demo pages cover every component of the library (37 component files, counting shared parts such as
choice-group and menu-item), in the light and dark schemes, with the site's fluid hover, springs and keyboard
behaviour. Around them sit the site's own pages: the home bento grid, Introduction, the seven system pages, Compare
with shadcn, the Concepts mockups, Audio Mixer, and ten doc-page playgrounds. Every place the port looks or behaves
differently from the source is recorded in [Drift from the source](#drift-from-the-source): 602 entries, each tagged
by cause (gpuix gap, port choice or not ported yet).

| | |
|---|---|
| ![showcase](screenshots/showcase/initial.png) | ![button hover](screenshots/button/hover.png) |
| ![combobox open](screenshots/combobox/open.png) | ![sidebar sub-menu](screenshots/sidebar/sub-menu.png) |

## Run it

```bash
bun install
bun --hot src/main.tsx
```

The app is a sidebar (Showcase, Introduction, a System group, then one demo page per component) plus a "Make them
yours" card with Theme (System follows the OS appearance), Radius, Size and Icons selects. The sidebar's Search row,
or ⌘K / Ctrl+K anywhere, opens the site menu: every page, the theme, a Recent group and a few actions in one field;
Compare, Concepts and Audio Mixer are reached from it. It sits in a browser-style frame: a transparent titlebar with
the traffic lights, a title across the top bar, and the page in a rounded panel. Inter is loaded from
`assets/fonts/`.

`@gpuix/native` and `@gpuix/solid` are bun workspaces pointing at the fork at `~/code/fdarian/gpuix`, wired like
[`../gpuix-pierre-diffs`](../gpuix-pierre-diffs) (see its README for building the native addon). The fork must be
at `poc` a02ec23 or later: the highlights and popups use its native `motion` springs, so rebuild the addon and the
`@gpuix/solid` dist after pulling it. The Solid JSX transform is a Bun preload (`bunfig.toml`), so there is no
build step. `solid-js` is pinned to the version gpuix resolves: two copies of Solid give two reactive systems and
nothing updates.

```bash
bun run typecheck                      # tsc
bun scripts/screenshots.tsx <slug>     # headless captures of one demo or page, into screenshots/<slug>/
bun scripts/live-check.tsx             # the same flow against the real window, via gpuix's automation client
```

`screenshots.tsx` takes a file name from `src/demos/` or `src/pages/` (or `showcase`) and writes `initial.png`,
whatever the page's `scenarios` capture, `pill.png` (Radius on Pill), `compact.png` (Size on Compact) and `light.png`
(the page after flipping the theme through the real control). The light step currently fails on pages that have a
right column (the click on the theme select throws, see the `DismissableLayer` row under Bugs); every capture before it is written. It runs on
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

A component adds `src/components/<name>.tsx`, `src/demos/<name>.tsx` and `drift/<name>.md`, and edits no shared
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
`drift/_TEMPLATE.md` is the shape of a drift file.

A page (Introduction, a system page, a concept) is a file in `src/pages/` instead: it exports `title`, `group`
(`"Pages"` or `"System"`), `order`, `layout` (`"docs"` keeps the sidebar and right column, `"full"` fills the
window), `listed` (`"sidebar"`, `"menu"` for the site menu only, or `"none"`), `Page`, and optionally `scenarios`,
`menuIcon` and `menuKeywords`. `PageModule` in `src/lib/demo.ts` is the contract, `usePageNav()` from
`src/lib/page-nav.ts` navigates, and `src/lib/doc-page.tsx` holds the shared doc chrome.

<details>
<summary>Shared code in <code>src/lib/</code></summary>

| File | What it holds |
|---|---|
| `theme.ts` | Both columns of every `light-dark()` in `app/globals.css` (`color-mix()` mixed offline), type scale, radii, springs. `color.x` reads a `scheme` signal, so a JSX prop that touches it re-colours on a theme change; read tokens inside JSX or a function, never at module scope. `withAlpha`, `surface(level)`, `focusRing(offset)`. |
| `fluid-hover.ts`, `fluid-highlight.tsx` | The site's `use-fluid-hover`: rows register with a `ResizeObserver`, their boxes are read with `getBoundingClientRect` when one reports, `pickNearest` (ported verbatim) resolves the pointer to a row including gaps, and one highlight glides between rows. `hover.containerProps` and `useHoverItem` wire a list. |
| `focus-ring.tsx` | The shared keyboard focus ring of accordion groups, tabs, tabs-subtle, checkbox, radio, select and the sidebar menu: one outline box 2px outside the focused row that springs between the rects fluid hover measures. `createFocusRing(hover)` collects `onFocus` / `onBlur` from the rows and counts only `event.focusVisible`, so a click draws none; the ring fades out 60 ms after the last blur and appears in place, not travelling from where it was. |
| `measured-height.ts` | A box whose height springs to its content's: the content box reports its size through `onLayout`, used by every collapse. |
| `popup.tsx`, `presence.ts` | Popup chrome on `<anchored fit="flip">` (`PopupSurface`; `createPlacementState` keeps the reported side and available height), and `createPresence` (mounted outlives open so an exit can play). |
| `list-nav.ts` | `moveIndex` (skip disabled, wrap or clamp) and `revealRow` (scroll a row into view by hand). |
| `stable-label.tsx` | A label that gains weight without moving its neighbours: a hidden semibold copy reserves the width. |
| `clock.ts` | One shared, ref-counted frame clock for every JS-driven loop. |
| `fonts.ts`, `app-frame.tsx` | The static Inter files passed to `render()` and the test renderer; the window frame (chrome-coloured bar, rounded page panel). |
| `press.ts`, `icons.ts`, `icon.tsx` | The press-shrink shadow; lucide glyphs as SVG strings (`defineIcon` for a component's own). |
| `site-command-menu.tsx`, `install-url.ts`, `platform.ts` | The site menu (a `CommandMenuDialog` of pages, theme, Recent and actions) and the window-wide Mod+K that toggles it, through gpuix's `window` event target; the registry URL the copy action writes; `IS_MAC` and `openUrl`. |
| `demo.ts`, `demo-kit.tsx`, `page-nav.ts` | The demo and page contracts, the card every demo page is made of, and `navigate` / `current` for pages. |
| `doc-page.tsx`, `playground.tsx` | The docs chrome (`DocPage`, `DocSection`, `ComponentPreview`, `Code`) and the playground scaffolding (`PlaygroundLayout`, `PlaygroundPanel`, the control rows, the right-rail slot). |
| `icons.ts`, `icons/` | The Icons row: one glyph table per library, `iconSource` reads the picked one. |
</details>

## Drift from the source

The source is fluidfunctionalism.com at commit `0a0377e` (mickadesign/fluidfunctionalism, "Merge pull request #69");
a copy is kept at `~/.claude/notes/ff-source/`. Each file in [`drift/`](drift) lists every place the port looks or
behaves differently from it, whatever the cause. A cause is one of: **gpuix gap**, gpuix lacks it or gets it wrong;
**port choice**, the port differs on purpose; **not ported yet**, nothing stops the port doing it. An entry that
names two causes counts as mixed; an entry with no cause (an exact or additive note) is not counted. Base UI
behaviour, row by row, is in [`BASE-UI-AUDIT.md`](BASE-UI-AUDIT.md). Files named after a component are that
component's drift; `site` is the shell, and `home`, `introduction`, `compare`, `concepts`, `audio-mixer`,
`nav-menu`, `fluid-hover`, `motion-page`, `scrollbars-page`, `sizes-page`, `skill-page`, `surfaces` and
`typography` are the pages.

| Component or page | gpuix gap | port choice | not ported yet | mixed | total |
|---|---:|---:|---:|---:|---:|
| [accordion](drift/accordion.md) | 3 | 9 | 7 | 0 | 19 |
| [ask-user-questions](drift/ask-user-questions.md) | 2 | 5 | 7 | 3 | 17 |
| [audio-mixer](drift/audio-mixer.md) | 0 | 2 | 0 | 1 | 3 |
| [badge](drift/badge.md) | 1 | 3 | 0 | 0 | 4 |
| [banner](drift/banner.md) | 3 | 4 | 7 | 0 | 14 |
| [button](drift/button.md) | 4 | 4 | 2 | 1 | 11 |
| [card](drift/card.md) | 5 | 7 | 7 | 0 | 19 |
| [carousel-dots](drift/carousel-dots.md) | 2 | 3 | 2 | 1 | 8 |
| [chat-message](drift/chat-message.md) | 2 | 3 | 2 | 3 | 10 |
| [checkbox-group](drift/checkbox-group.md) | 3 | 0 | 4 | 1 | 8 |
| [color-picker](drift/color-picker.md) | 3 | 6 | 15 | 1 | 25 |
| [combobox](drift/combobox.md) | 7 | 13 | 5 | 1 | 26 |
| [command-menu](drift/command-menu.md) | 7 | 2 | 12 | 1 | 22 |
| [compare](drift/compare.md) | 4 | 9 | 0 | 2 | 15 |
| [concepts](drift/concepts.md) | 4 | 27 | 2 | 1 | 34 |
| [dialog](drift/dialog.md) | 6 | 2 | 2 | 1 | 11 |
| [dropdown](drift/dropdown.md) | 7 | 4 | 10 | 2 | 23 |
| [file-thumbnail](drift/file-thumbnail.md) | 1 | 4 | 1 | 1 | 7 |
| [fluid-hover](drift/fluid-hover.md) | 4 | 5 | 2 | 2 | 13 |
| [home](drift/home.md) | 1 | 1 | 1 | 2 | 5 |
| [input-copy](drift/input-copy.md) | 3 | 4 | 6 | 0 | 13 |
| [input-group](drift/input-group.md) | 1 | 1 | 3 | 1 | 6 |
| [input-message](drift/input-message.md) | 4 | 0 | 14 | 3 | 21 |
| [introduction](drift/introduction.md) | 1 | 4 | 2 | 1 | 8 |
| [mobile-drawer](drift/mobile-drawer.md) | 3 | 2 | 1 | 0 | 6 |
| [motion-page](drift/motion-page.md) | 4 | 3 | 1 | 3 | 11 |
| [nav-menu](drift/nav-menu.md) | 1 | 5 | 1 | 0 | 7 |
| [queued-stack](drift/queued-stack.md) | 4 | 2 | 3 | 1 | 10 |
| [radio-group](drift/radio-group.md) | 4 | 2 | 3 | 0 | 9 |
| [scroll-area](drift/scroll-area.md) | 3 | 6 | 1 | 1 | 11 |
| [scrollbars-page](drift/scrollbars-page.md) | 1 | 4 | 2 | 1 | 8 |
| [select](drift/select.md) | 7 | 3 | 5 | 2 | 17 |
| [sidebar](drift/sidebar.md) | 1 | 7 | 22 | 1 | 31 |
| [site](drift/site.md) | 6 | 6 | 20 | 6 | 38 |
| [sizes-page](drift/sizes-page.md) | 0 | 5 | 2 | 4 | 11 |
| [skill-page](drift/skill-page.md) | 3 | 5 | 0 | 1 | 9 |
| [slider](drift/slider.md) | 5 | 3 | 2 | 1 | 11 |
| [surfaces](drift/surfaces.md) | 1 | 3 | 4 | 4 | 12 |
| [switch](drift/switch.md) | 2 | 1 | 2 | 1 | 6 |
| [table](drift/table.md) | 3 | 1 | 3 | 0 | 7 |
| [tabs-subtle](drift/tabs-subtle.md) | 2 | 4 | 2 | 0 | 8 |
| [tabs](drift/tabs.md) | 2 | 2 | 2 | 0 | 6 |
| [thinking-indicator](drift/thinking-indicator.md) | 1 | 2 | 3 | 0 | 6 |
| [thinking-steps](drift/thinking-steps.md) | 4 | 3 | 6 | 1 | 14 |
| [tooltip](drift/tooltip.md) | 4 | 5 | 1 | 1 | 11 |
| [typography](drift/typography.md) | 4 | 0 | 1 | 6 | 11 |
| **Total** | **143** | **196** | **200** | **63** | **602** |

### gpuix gaps across components

These are the gpuix gaps that hit several components; the per-component files link here. They are as of the
DOM-parity release of the fork (`~/code/fdarian/gpuix/FORK.md`): what the port used to work around and gpuix now
does is gone from this list. "Bug" means gpuix does something wrong or inconsistent; "missing" means it does not
offer it. A count is given only where the code shows it.

#### Bugs

| Used by | What | Workaround here |
|---|---|---|
| command-menu, and any list that keeps focus in a field while it is pressed | On Windows and Linux the press reaches JavaScript through a queue after native has already moved focus, so `preventDefault()` in `onMouseDown` or `onPointerDown` has no effect and a press on something not focusable still blurs the field (gpuix `README.md:3259-3266`). Seen in the command menu: clicking a tab blurs the field. macOS and the test renderer apply it | `preventDefault()` in `onMouseDown` on the list and the tab row (`drift/command-menu.md`); it works on macOS only. Not run on Windows or Linux |
| slider | Values derived in JS (`createTransform` of several values) still trail their inputs by one frame (FORK.md:915-917) | none (`drift/slider.md`) |
| accordion, banner, button, carousel-dots, chat-message, input-copy, input-message, tabs, tabs-subtle, thinking-steps (all use `buttonProps`) | `buttonProps` handles keydown on the way up, so a `buttonProps` element nested in another is clicked twice on Enter: the inner one clicks itself and the outer one clicks the same target. The fix is to act only when `target === currentTarget` | none; nested cases are not counted |
| scroll-area | A horizontal or both-axis scroller has no `min-width: fit-content` content wrapper (gpuix rejects intrinsic width keywords). `scrollWidth` counts overflowing descendants now, but a block wrapper is clamped to the viewport width and its `onLayout` reports that, so the area has no content size to draw a horizontal thumb from | The viewport is a flex row with `alignItems: "flex-start"` and the content wrapper is `flexShrink: 0`, so the wrapper takes its content's width |
| select, combobox | Enter in a form `<input>` with an empty `required` control does nothing; HTML implicit submission validates, sets `invalid` and moves focus. Only `requestSubmit()` validates | The demos submit through `requestSubmit()` |
| dropdown submenus (audit rows 386, 721), tooltip | `window` and `document` mousemove listeners fire only when an element on the hit path has a mousemove listener, never over bare window background, so a safe polygon between trigger and popup cannot be tracked | A dwell timer for submenus (`SUBMENU_DWELL_MS`), a grace timer for the tooltip |
| any `<input>` with `textAlign: "right"` (the Button playground's Label field) | The style is accepted and does nothing in the test renderer (`drift/button.md`, "Playground: no Active switch, Label field not right-aligned"); unverified in a live window | none: left-aligned |
| color-picker's value fields | `fontVariantNumeric` set in an `<input>`'s own style does nothing (measured: ten "1"s are the same width with `normal` and `tabular-nums`); set on a parent, the input inherits it | the property on the field's wrapper div (`src/components/color-picker.tsx`, `ColorInput`) |
| dropdown search field | A sticky box with a negative margin is held at its parent's content box, not at the border box the margin puts it (`drift/dropdown.md`, "Search field is a child of the scroller"): a `marginTop: -4` child of a `padding: 4` parent sits 4px low until the scroller moves it. Measured on the test renderer | The field is the scroller's first child, ahead of the padded list |
| tooltip and dialog demos | After a failed script run Bun aborts with `thread local panicked on drop` | none; the harness only |
| screenshots, app-frame | The test renderer ignores the window options (titlebar, traffic lights), `setAppearance` changes nothing and `onAppearanceChange` never fires; `createAppearance` is the machine's | Captures pin the scheme with `setThemeChoice` and show no traffic lights |
| screenshots | Batched keystrokes deliver an input's `onChange` after the whole batch | none |
| screenshots | The accessibility dump flags an `aria-hidden` node as hidden but not its descendants, and `A11yTreeDump` lacks `frame` | `scripts/screenshots.tsx` reads `frame.tab_stop_count` through a cast |

#### Missing features

| Used by | What | Workaround here |
|---|---|---|
| popups (select, combobox, dropdown, color-picker, dialog), tooltip, chevrons (accordion, card, color-picker, thinking-steps), scale-in entrances (banner, ask-user-questions, chat-message, input-copy, input-message, queued-stack, radio-group), spinners (file-thumbnail) | CSS transforms: no scale, rotate or translate, so the popups' `scaleY: 0.96` entrance and every turn and pop is impossible (audit rows 525, 606). The tooltip has no scale in the source (`tooltip.tsx:282-291`); it only slides on x / y, which is a transform too | Popups and the tooltip slide from the reported side and fade; glyphs swap, fade or are redrawn in SVG; panels move on `top` / `left` / `bottom` |
| input-copy, doc-page, site-command-menu, app, skill copy example (`navigator.clipboard`) | gpuix installs `navigator.clipboard` at runtime but ships no TypeScript declaration for it, and Bun's types have none | `src/navigator.d.ts` declares it as gpuix's `clipboard` |
| slider | `<input type="range">` (audit row 310) | A pointer-handled track and thumbs |
| select, combobox (`FormValue`) | `<input type="hidden">` | A real input that is invisible, unreachable and `aria-hidden` |
| accordion, ask-user-questions, input-message, sidebar, thinking-steps (`createMeasuredHeight`) | Motion on `width: auto`, and layout size morphs | The content box reports its size through `onLayout` and the outer box tweens to that number |
| not counted | Container queries | none |
| not counted | `:has()` | none |
| table | `display: table`, `border-collapse` and `inline-*`: columns cannot size to their widest cell | Flex rows with equal-width cells and an optional fixed `width` |
| not counted | `em`, `rem`, `vw` and `vh` units | Pixel numbers |
| not counted | `disabled` on anything but an input: other elements get `aria-disabled` only, so they stay focusable and clickable | `aria-disabled` plus the component's own guard |
| not counted | `url()` backgrounds and masks | `<img>` elements and SVG `<mask>` |
| command-menu (and every long demo page) | Culling: elements a scroller clips away are still built, laid out and painted each frame, so a page of many menus costs several times a short one (`<virtual-list>` is the only exception) | `DemoCard` hides its content with `display: none` while it is far from the page scroller (`drift/command-menu.md`) |
| file-thumbnail | A canvas pixel path (a PDF page preview) | The caller passes a type and the thumbnail shows a glyph |
| not counted | Effect groups (`filter`, `backdrop-filter`, `mask`, `clip`, group opacity) off macOS | none |
| carousel-dots, file-thumbnail, thinking-indicator, thinking-steps | `requestAnimationFrame` itself (only `setTimeout`, FORK.md:207). The animations are possible without it, through motion values and keyframes (FORK.md:822-826) | `lib/clock.ts`: one shared, ref-counted `setInterval` frame clock |
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
| fluid-hover, motion, scrollbars and sizes pages (every `Code` chip, the Scrollbars links) | Inline `<span>` boxes take no padding, margin, border radius, per-run `fontSize` or click events (`~/code/fdarian/gpuix/FORK.md:765-773`) | The chip's padding is no-break spaces around a Menlo run at the paragraph's size (`src/lib/doc-page.tsx:58-75`); links are underlined text that goes nowhere |
| surfaces and fluid-hover pages (the annotation arrows) | `<svg>` has no `marker` (`FORK.md:762`) | The arrowhead is two extra strokes laid along the curve's end tangent |
| concepts (Lumen's image swatches) | `<img>` takes `file://` and `blob:` URLs, not `data:` ones | A `linear-gradient` box instead of an SVG data URI |
| button, home bento cards, compare | An outer `box-shadow` paints under the whole border box with no knock-out (only `inset` shadows are clipped to the element, `shaders.metal:600-654`): a translucent fill over it doubles up | An opaque fill over the shadow, or the shadow alone as the fill (`drift/button.md`, `drift/home.md`, `drift/compare.md`) |
| skill page (the scripted-cursor examples) | Dispatching a synthetic pointer event, or setting `:hover`, on one element: the native simulate calls move the window's one pointer | The page calls the elements' `onMouseEnter` / `onMouseLeave` / `onMouseMove` props and `click()` directly (`drift/skill-page.md`, `src/pages/skill/scripted-pointer.ts`) |
| site menu (`isModK`) | A physical key: gpuix derives `code` from GPUI's layout-dependent `key`, so a non-Latin letter reports `code` `""` (`packages/native/src/events/key_names.rs:9-12`, `:138-160`). On Windows and Linux, Ctrl plus a Cyrillic or Greek letter cannot match a shortcut through `code`, as the source's `matchesShortcut` does. macOS reports the layout's Cmd letter, so ⌘K works there | none; the sidebar's Search row opens the menu (`drift/site.md`). Not run on Windows or Linux |

## Harness and shared-lib notes

Quirks of this repo's own code, kept apart from the gpuix gaps above.

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
  content through the fade; a trigger pressed during the fade is ignored.
- **Screenshots run on the test renderer** (`scripts/screenshots.tsx`).
  - Captures show no traffic lights or native titlebar, and pin the theme to Dark (`setThemeChoice`), because the
    test renderer ignores the window options and its appearance is the machine's.
  - `settle()` runs frames for real time, flushing the tree and draining native events each frame; a bare `flush()`
    never delivers `onMotionComplete`, so presence exits would never unmount. The first capture waits 800 ms.
  - Helpers read `getElementBounds` once per step to find an element's centre; nothing polls bounds. `shot.press`
    takes Playwright key names (`ArrowDown`, `Shift+Tab`) and `shot.scroll` the DOM's sign (positive scrolls down).
    There is no double-click or file-drop helper.
  - `shot.aria`, `expectAria`, `idOf`, `hasAriaNode` and `tabStopCount` assert on the accessibility tree.
  - Captures are not byte-stable: the text caret, timing-driven demos (thinking steps, shimmer, spinner) and
    queue text vary run to run. Compare the content area with a pixel diff, not file hashes.

<details>
<summary>How the first three components translate (Tailwind to gpuix)</summary>

The Button, Combobox and Sidebar were ported first, with this table kept as they went. Most rows have since
been fixed in gpuix or generalised into the gpuix gaps above. Rows that say "not adopted yet" are things gpuix
now does that the port has not picked up.

| Tailwind / CSS | gpuix | Fidelity |
|---|---|---|
| `hover:` / `active:` on the same element | `style.hover` / `style.active`, applied natively | Exact |
| `group-hover:` (icon stroke, label colour) | `onMouseEnter` / `onMouseLeave` plus a signal | Exact, one JS round trip |
| `focus-visible:ring-1` | `style.focusVisible` outline, offset 1 | Exact |
| `ring-1 ring-border` | `outlineWidth` / `outlineColor`: outside the box, takes no layout | Exact |
| `transition-colors` (`duration-80`, or Tailwind's 150 ms), `transition-[box-shadow]` and the other lists | CSS `transition` on the element: `colorFade` (`src/lib/theme.ts`) is Tailwind's `transition-colors` list that gpuix animates (`color`, `background-color`, `border-color`, `outline-color`) over 80 ms on Tailwind's curve, `colorFadeDefault` the same over 150 ms, `colorFadeNoRing(ms)` the list without `outline-color` for a box-shadow focus ring, `springFade([...])` an 80 ms colour or outline fade on a curve fitted to `spring.fast` where the source animates it with a spring, and `fade([...], ms, ease?)` any other list (`box-shadow`, one colour, the source's own curve). Button's two-speed surface layer is `surfaceFade` / `pressFade`. A signal-driven change and a `hover` / `active` / `focusVisible` change both ease (`scripts/check-color-fade.tsx`). `text-decoration-color`, `fill` and `stroke` are not CSS-transitionable here; an icon's strokes follow `color` through `currentColor` (`<Icon fade>`) | Exact |
| spring `fast` / `moderate` (`motion/react`) | native `motion` spring, `{ type: "spring", duration: 0.08 / 0.16, bounce: 0 }`, velocity kept when the target changes mid-flight | Exact; `slow` (bounce 0.12, the exit 160 ms) drives the command menu's dialog and the banner |
| exits (`spring.fast.exit` …) | plain tweens, 60 ms / 120 ms, like the source | Exact |
| "snap, don't spring" on a reflow | a zero-length tween | Exact |
| `translate` / `x`,`y` travel of the highlight | `motion` on `top` / `left` / `width` / `height` (the only layout props it animates) | Equivalent, but it re-lays out per frame |
| `scaleY: 0.96` on popup enter | not possible, no transforms. Opacity plus the 4px slide stay (`top` −4 → 0) | Partly dropped |
| `z-index` (`z-10` rows over the highlights, `z-20` rings, `z-30` card actions, `-z-10` fills) | `zIndex` on the positioned element, as in the source. It orders siblings only: where the source's z-indexed control sits in a plain wrapper, the wrapper takes the `zIndex` (and `pointerEvents: none` over an overlay, the control `auto`), and a popover in a positioned box over a later sibling needs its wrapper to take one too (`drift/concepts.md`, Beacon) | Exact within a parent; per-parent stacking is a gpuix gap |
| press-shrink: inset-px layer plus same-colour `box-shadow` spread | the element carries `margin: 1` and a spread-1 shadow, and `active` sets spread 0 | Exact for flat fills |
| translucent fill (`--tint`, `bg-hover`) over that shadow | gpuix paints a shadow under its element with no knock-out, so a background on top doubles up. Fills are the shadow alone, with no `backgroundColor` | Exact, but a different mechanism |
| tertiary ring that moves inward on press (outer to inset shadow) | outline, offset 0 at rest and −1 pressed | Exact |
| `shadow-surface-N` (1px ring plus stacked drops; in dark an inset highlight and ring, and a 1px outer hairline) | `shadow(N)` (`src/lib/theme.ts`): the `--shadow-N` recipe as one multi-layer, scheme-aware `boxShadow` string, with no border. The popups, dialog, drawer, queued card, tab pill and composer use it at the source's levels | Exact |
| Tailwind `shadow-sm` to `shadow-xl` | `twShadow` (`src/lib/theme.ts`): both drops of each, as the CSS strings | Exact |
| `color-mix(in oklab, …)`, `light-dark()` | both columns kept as a token table; the scheme is a signal | Exact |
| `prefers-color-scheme` ("System" theme) | `createAppearance()` reads the OS appearance and `bindSystemScheme` feeds it to the `scheme` token. System / Light / Dark are one `themeChoice` signal, and `renderer.setAppearance` mirrors Light / Dark so the native chrome follows | Exact in the window; captures run on the test renderer, whose appearance is fixed, so they pin Dark |
| `prefers-reduced-motion`, `<MotionConfig reducedMotion="user">`, `useReducedMotion()` | `App` wraps the tree in gpuix's `<MotionConfig reducedMotion="user">`, which makes every `motion.*` position and size property jump (opacity and colour keep fading). Where the source reads `useReducedMotion()` itself, the port reads `createReducedMotion()` at the same site: the fluid highlight, the accordion panel, the banner, the carousel timer, the thinking indicator, the command-menu scroll and the scripted demos. Pinned by `scripts/check-reduced-motion.tsx` | Approximated: gpuix reduces layout properties the source animates (`drift/site.md`); the OS setting is read on macOS only |
| Base UI `Positioner` (flip, `--anchor-width`, `--available-height`) | `<anchored fit="flip" deferred>`: gpuix picks the side and reports it with the room left (`onPlacement`), and `PopupSurface` caps the card to that room, slides from the reported side and is at least the trigger's width | Equivalent |
| `ScrollArea` (hover thumb, scroll fade) | a plain `overflowY: "scroll"`, on the combobox list and the sidebar | Dropped |
| `getBoundingClientRect` | `element.getBoundingClientRect()`, read when needed (layout is flushed first, so it is never stale) | Native |
| `ResizeObserver` | gpuix's `ResizeObserver` (fluid hover, slider width, queued stack) and `onLayout` (size, after the first paint and on every change) | Exact |
| `text-[length:…] leading-[…]` | `fontSize` + `lineHeight` | Exact |
| `[text-box:trim-both_cap_alphabetic]` | none: labels are centred by their line box | Dropped, a pixel of optical drift |
| Inter variable (`wght 550`, `opsz`) | static Inter TTFs (400, 500, 600, 700) passed as `fonts` to `render()`; the family is `Inter` for every weight. the site's 550 is set as SemiBold 600, there is no `opsz` | Approximated, one weight step |
| ghost-span that reserves the semibold width | the same trick: a hidden copy in flow, the visible label absolutely positioned over it | Exact |
| `truncate` | `whiteSpace: "nowrap"` + `textOverflow: "ellipsis"` on the combobox rows | Exact; sidebar labels are not truncated |
| icon stroke 1.5 → 2 on hover | `<Icon easeStroke>` (`src/lib/icon.tsx`) animates `strokeWidth` on a `motion.g` over 80 ms: accordion, button, card, tabs, tabs-subtle, nav-item, sidebar, thinking-steps, input-copy, input-group, and the dropdown, dropdown-search, menu-item, select, combobox and command-menu icons. Everywhere else the SVG string is swapped | Exact where `easeStroke` is set, except with the phosphor library (filled paths, the weight switches at once); instant elsewhere |
| `animation: spinner-move` | a static lucide `loader`: no rotation, no animation. gpuix now has keyframes and `strokeDasharray` / `strokeDashoffset` motion (FORK.md:822, :829); not adopted yet | Dropped, now possible |
| `AnimatePresence` exit of the popup | the popup stays mounted for 60 ms while its opacity fades | Approximated |

Not ported there (pill shape and the Radius, Size and Icons rows have landed since; Primitive is not ported):
multiple-select combobox and chips, rail resize, row actions, and `gapClick` (a
click between rows is not routed to the highlighted row).
</details>
