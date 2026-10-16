# gpuix + fluid functionalism

Can [gpuix](https://github.com/remorses/gpuix), a GPUI-backed renderer with no DOM and no CSS engine, draw the
[fluidfunctionalism.com](https://fluidfunctionalism.com) component library?

Yes. 32 demo pages cover every component of the library (37 component files, counting shared parts such as
choice-group and menu-item), in the light and dark schemes, with the site's fluid hover, springs and keyboard
behaviour. Around them sit the site's own pages: the home bento grid, Introduction, the seven system pages, Compare
with shadcn, the Concepts mockups, Audio Mixer, and ten doc-page playgrounds. Every place the port looks or behaves
differently from the source is recorded in [Drift from the source](#drift-from-the-source): 670 entries, each tagged
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
| `demo.ts`, `demo-kit.tsx`, `page-nav.ts` | The demo and page contracts, the card every demo page is made of, and `navigate` / `current` for pages (deferred a microtask, see `drift/site.md`). |
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
| [accordion](drift/accordion.md) | 3 | 9 | 9 | 0 | 21 |
| [ask-user-questions](drift/ask-user-questions.md) | 2 | 5 | 9 | 3 | 19 |
| [audio-mixer](drift/audio-mixer.md) | 0 | 2 | 0 | 1 | 3 |
| [badge](drift/badge.md) | 1 | 3 | 0 | 0 | 4 |
| [banner](drift/banner.md) | 3 | 4 | 10 | 0 | 17 |
| [button](drift/button.md) | 4 | 4 | 3 | 1 | 12 |
| [card](drift/card.md) | 6 | 8 | 10 | 0 | 24 |
| [carousel-dots](drift/carousel-dots.md) | 2 | 3 | 3 | 1 | 9 |
| [chat-message](drift/chat-message.md) | 2 | 3 | 4 | 2 | 11 |
| [checkbox-group](drift/checkbox-group.md) | 3 | 0 | 6 | 1 | 10 |
| [color-picker](drift/color-picker.md) | 4 | 6 | 20 | 1 | 31 |
| [combobox](drift/combobox.md) | 7 | 13 | 8 | 1 | 29 |
| [command-menu](drift/command-menu.md) | 8 | 2 | 15 | 1 | 26 |
| [compare](drift/compare.md) | 6 | 9 | 0 | 2 | 17 |
| [concepts](drift/concepts.md) | 4 | 26 | 2 | 2 | 34 |
| [dialog](drift/dialog.md) | 8 | 2 | 3 | 1 | 14 |
| [dropdown](drift/dropdown.md) | 8 | 4 | 13 | 1 | 26 |
| [file-thumbnail](drift/file-thumbnail.md) | 1 | 4 | 1 | 1 | 7 |
| [fluid-hover](drift/fluid-hover.md) | 3 | 4 | 2 | 4 | 13 |
| [home](drift/home.md) | 1 | 1 | 1 | 2 | 5 |
| [input-copy](drift/input-copy.md) | 2 | 3 | 8 | 0 | 13 |
| [input-group](drift/input-group.md) | 1 | 1 | 4 | 1 | 7 |
| [input-message](drift/input-message.md) | 4 | 1 | 15 | 3 | 23 |
| [introduction](drift/introduction.md) | 1 | 4 | 2 | 1 | 8 |
| [mobile-drawer](drift/mobile-drawer.md) | 4 | 2 | 2 | 0 | 8 |
| [motion-page](drift/motion-page.md) | 4 | 3 | 2 | 3 | 12 |
| [nav-menu](drift/nav-menu.md) | 0 | 5 | 1 | 1 | 7 |
| [queued-stack](drift/queued-stack.md) | 4 | 2 | 5 | 1 | 12 |
| [radio-group](drift/radio-group.md) | 4 | 2 | 5 | 0 | 11 |
| [scroll-area](drift/scroll-area.md) | 3 | 6 | 2 | 1 | 12 |
| [scrollbars-page](drift/scrollbars-page.md) | 1 | 4 | 2 | 1 | 8 |
| [select](drift/select.md) | 9 | 3 | 8 | 2 | 22 |
| [sidebar](drift/sidebar.md) | 1 | 6 | 25 | 1 | 33 |
| [site](drift/site.md) | 5 | 6 | 22 | 6 | 39 |
| [sizes-page](drift/sizes-page.md) | 0 | 5 | 2 | 4 | 11 |
| [skill-page](drift/skill-page.md) | 3 | 5 | 0 | 1 | 9 |
| [slider](drift/slider.md) | 5 | 3 | 4 | 2 | 14 |
| [surfaces](drift/surfaces.md) | 1 | 3 | 4 | 4 | 12 |
| [switch](drift/switch.md) | 2 | 1 | 4 | 1 | 8 |
| [table](drift/table.md) | 3 | 1 | 5 | 0 | 9 |
| [tabs-subtle](drift/tabs-subtle.md) | 1 | 4 | 2 | 1 | 8 |
| [tabs](drift/tabs.md) | 2 | 2 | 4 | 0 | 8 |
| [thinking-indicator](drift/thinking-indicator.md) | 1 | 2 | 4 | 0 | 7 |
| [thinking-steps](drift/thinking-steps.md) | 4 | 3 | 7 | 1 | 15 |
| [tooltip](drift/tooltip.md) | 4 | 5 | 1 | 1 | 11 |
| [typography](drift/typography.md) | 4 | 0 | 1 | 6 | 11 |
| **Total** | **149** | **194** | **260** | **67** | **670** |

### gpuix gaps across components

These are the gpuix gaps that hit several components; the per-component files link here. They are as of the
DOM-parity release of the fork (`~/code/fdarian/gpuix/FORK.md`): what the port used to work around and gpuix now
does is gone from this list. "Bug" means gpuix does something wrong or inconsistent; "missing" means it does not
offer it. A count is given only where the code shows it.

#### Bugs

| Used by | What | Workaround here |
|---|---|---|
| combobox, dropdown, select, tooltip (every popup on gpuix's `DismissableLayer`), and `returnFocusTo` in dropdown, select, color-picker | `VIEW_BUSY`: reading focus state (`getFocusedElementId`, `matches(":focus")`) inside a mousedown, mouseup, click or wheel handler throws on macOS and in the test renderer, because those run in synchronous dispatch. gpuix's own `DismissableLayer` does it too, see the next row. There is no `document.activeElement` | none yet |
| every popup on gpuix's `DismissableLayer` (select, combobox, dropdown, color-picker, the customise card's selects), when a pointer press opens it, and the screenshots' light step (its click on the theme select throws) | Since gpuix `aae8c790` a press dispatches synchronously on macOS and in the test renderer. `DismissableLayer` reads `renderer.getFocusedElementId()` while it mounts (`packages/solid/src/components/floating.ts:80`), and a popup that a press handler opens mounts inside that dispatch, so the read throws `VIEW_BUSY` (`packages/native/src/events/sync_dispatch.rs:154`). Reproduced in the test renderer through `select.tsx`'s `onMouseDown` (`bun scripts/screenshots.tsx button`); not run in the live window. Windows and Linux queue the press, so the read is outside the dispatch there (not run) | none yet. `scripts/screenshots.tsx` fails at its final theme-switch step (a press on the theme select) for every demo, so the `light.png` files are stale; the scenario scripts open popups by keyboard (`scripts/check-popups.tsx`, `scripts/check-dropdown.tsx`) |
| command-menu, and any list that keeps focus in a field while it is pressed | On Windows and Linux the press reaches JavaScript through a queue after native has already moved focus, so `preventDefault()` in `onMouseDown` or `onPointerDown` has no effect and a press on something not focusable still blurs the field (gpuix `README.md:3259-3266`). Seen in the command menu: clicking a tab blurs the field. macOS and the test renderer apply it | `preventDefault()` in `onMouseDown` on the list and the tab row (`drift/command-menu.md`); it works on macOS only. Not run on Windows or Linux |
| slider | `MotionValue.animate` still throws inside a press, release or key handler ("This renderer call cannot run inside an event handler that native called synchronously"): it reads the value's current state from the renderer to start from. `set` and `jump` work there: the fork defers a motion-value write made there until the input returns (`renderer.rs:1389-1412`, FORK.md:361-363). Values derived in JS (`createTransform` of several values) still trail their inputs by one frame (FORK.md:915-917) | `createAnimateQueue` starts each `animate` in a microtask; `set` and `jump` are written directly (`drift/slider.md`) |
| accordion, banner, button, card, carousel-dots, chat-message, input-copy, input-message, tabs, tabs-subtle, thinking-steps (all use `buttonProps`) | `buttonProps` handles keydown on the way up, so a `buttonProps` element nested in another is clicked twice on Enter: the inner one clicks itself and the outer one clicks the same target. The fix is to act only when `target === currentTarget` | none; nested cases are not counted |
| dialog, mobile-drawer | `DialogBackdrop` closes on mousedown; the DOM and Base UI close on click | The app's own backdrop div closes on a click that presses and releases on it |
| dialog, mobile-drawer | A reactive prop change on `DialogPopup` re-creates the popup and loses focus | `aria-labelledby` and `-describedby` are static ids |
| scroll-area | A horizontal or both-axis scroller does not extend its scroll width for content that overflows through descendants (a block wrapper clamps to the viewport width) | The viewport is a flex row with `alignItems: "flex-start"` |
| any nested scrollers (scroll-area, combobox, select, sidebar) | One large wheel event chains its remainder to the outer scroller in the same event; a browser latches the whole event to the first scroller | none |
| select, combobox | Enter in a form `<input>` with an empty `required` control does nothing; HTML implicit submission validates, sets `invalid` and moves focus. Only `requestSubmit()` validates | The demos submit through `requestSubmit()` |
| dropdown submenus (audit rows 386, 721), tooltip | `window` and `document` mousemove listeners fire only when an element on the hit path has a mousemove listener, never over bare window background, so a safe polygon between trigger and popup cannot be tracked | A dwell timer for submenus (`SUBMENU_DWELL_MS`), a grace timer for the tooltip |
| slider (Audio Mixer's `Volume: 78%` labels) | A trailing space at the end of a text run is not drawn: the label text `"Volume: "` renders as `Volume:` and the value touches it (`src/components/slider.tsx:346`, `:453-455`, visible in `screenshots/audio-mixer/initial.png`). Observed; not traced to gpuix's source | none |
| any `<input>` with `textAlign: "right"` (the Button playground's Label field) | The style is accepted and does nothing in the test renderer (`drift/button.md`, "Playground: no Active switch, Label field not right-aligned"); unverified in a live window | none: left-aligned |
| tooltip and dialog demos | After a failed script run Bun aborts with `thread local panicked on drop` | none; the harness only |
| screenshots, app-frame | The test renderer ignores the window options (titlebar, traffic lights), `setAppearance` changes nothing and `onAppearanceChange` never fires; `createAppearance` is the machine's | Captures pin the scheme with `setThemeChoice` and show no traffic lights |
| screenshots | A mouse move without a held button is not delivered to an element that holds pointer capture; batched keystrokes deliver an input's `onChange` after the whole batch | `shot.moveHeld` sends the move with a button held; none for the batch |
| screenshots | The accessibility dump flags an `aria-hidden` node as hidden but not its descendants, and `A11yTreeDump` lacks `frame` | `scripts/screenshots.tsx` reads `frame.tab_stop_count` through a cast |

#### Missing features

| Used by | What | Workaround here |
|---|---|---|
| popups (select, combobox, dropdown, color-picker, dialog), tooltip, chevrons (accordion, card, color-picker, thinking-steps), scale-in entrances (banner, ask-user-questions, chat-message, input-copy, input-message, queued-stack, radio-group), spinners (file-thumbnail) | CSS transforms: no scale, rotate or translate, so the popups' `scaleY: 0.96` entrance and every turn and pop is impossible (audit rows 525, 606). The tooltip has no scale in the source (`tooltip.tsx:282-291`); it only slides on x / y, which is a transform too | Popups and the tooltip slide from the reported side and fade; glyphs swap, fade or are redrawn in SVG; panels move on `top` / `left` / `bottom` |
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
| button, home bento cards, compare | `box-shadow` paints under the whole border box with no knock-out, and one outer shadow per element: a translucent fill over it doubles up, and the source's stacked drops (`shadow-sm` to `shadow-lg`) keep one | An opaque fill over the shadow, or the shadow alone as the fill (`drift/button.md`, `drift/home.md`, `drift/compare.md`) |
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
  content through the fade; a trigger pressed during the fade is ignored. The backdrop is the app's own,
  because gpuix's closes on mousedown.
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
| `transition-colors duration-80`, `transition-[box-shadow]` | none then: state styles switched instantly, only `motion` animated. gpuix now animates colour and `boxShadow` and has CSS `transition` (FORK.md:814-818); not adopted yet | Dropped, now possible |
| spring `fast` / `moderate` (`motion/react`) | native `motion` spring, `{ type: "spring", duration: 0.08 / 0.16, bounce: 0 }`, velocity kept when the target changes mid-flight | Exact; `slow` (bounce 0.12, the exit 160 ms) drives the command menu's dialog and the banner |
| exits (`spring.fast.exit` …) | plain tweens, 60 ms / 120 ms, like the source | Exact |
| "snap, don't spring" on a reflow | a zero-length tween | Exact |
| `translate` / `x`,`y` travel of the highlight | `motion` on `top` / `left` / `width` / `height` (the only layout props it animates) | Equivalent, but it re-lays out per frame |
| `scaleY: 0.96` on popup enter | not possible, no transforms. Opacity plus the 4px slide stay (`top` −4 → 0) | Partly dropped |
| `z-index` (overlays under rows) | document order: the highlights are the container's first children and rows keep transparent backgrounds | Equivalent |
| press-shrink: inset-px layer plus same-colour `box-shadow` spread | the element carries `margin: 1` and a spread-1 shadow, and `active` sets spread 0 | Exact for flat fills |
| translucent fill (`--tint`, `bg-hover`) over that shadow | gpuix paints a shadow under its element with no knock-out, so a background on top doubles up. Fills are the shadow alone, with no `backgroundColor` | Exact, but a different mechanism |
| tertiary ring that moves inward on press (outer to inset shadow) | outline, offset 0 at rest and −1 pressed | Exact |
| `shadow-surface-3` (1px ring + two stacked drops) | `borderWidth: 1` plus one drop shadow. gpuix then painted a single non-inset shadow; it now takes multi-layer and `inset` `boxShadow` strings (FORK.md:646-649); not adopted yet | Approximated, now possible |
| `color-mix(in oklab, …)`, `light-dark()` | both columns kept as a token table; the scheme is a signal | Exact |
| dark `--shadow-3` (inset hairline + ring + drops) | popup `borderColor` of white at 5% plus the one drop shadow, for the same reason (multi-layer and `inset` shadows exist now, FORK.md:646-649; not adopted yet) | Approximated, now possible |
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
| icon stroke 1.5 → 2 on hover | `<Icon easeStroke>` (`src/lib/icon.tsx`) animates `strokeWidth` on a `motion.g` over 80 ms: input-copy, button, accordion, and the dropdown, select and combobox icons. Everywhere else the SVG string is swapped | Exact where `easeStroke` is set, except with the phosphor library (filled paths, the weight switches at once); instant elsewhere |
| `animation: spinner-move` | a static lucide `loader`: no rotation, no animation. gpuix now has keyframes and `strokeDasharray` / `strokeDashoffset` motion (FORK.md:822, :829); not adopted yet | Dropped, now possible |
| `AnimatePresence` exit of the popup | the popup stays mounted for 60 ms while its opacity fades | Approximated |

Not ported there (pill shape and the Radius, Size and Icons rows have landed since; Primitive is not ported):
multiple-select combobox and chips, rail resize, row actions, and `gapClick` (a
click between rows is not routed to the highlighted row).
</details>
