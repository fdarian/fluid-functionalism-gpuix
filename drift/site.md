# site

Original: the site shell of fluidfunctionalism.com at 0a0377e (kept at `~/.claude/notes/ff-source/`): `app/layout.tsx`, `app/components/sidebar-layout.tsx`, `right-panel.tsx`, `site-command-menu.tsx`, `playground-menu.tsx`, `app/globals.css`, `lib/docs/DocPage.tsx` / `ComponentPreview.tsx` / `PropsTable.tsx`, the settings providers, and every route under `app/`. The sidebar itself is in `drift/sidebar.md`. The Changelog entries and the menu's rows for it read the live site (d5c3606: the Changelog page, `app/changelog/`, `lib/changelog/`, and the release-driven New and Updated marks, which 0a0377e predates), so their source `file:line` refs are d5c3606's.
Ported in `src/main.tsx`, `src/app.tsx`, `src/lib/app-frame.tsx`, `src/lib/demo-kit.tsx`, `src/lib/doc-page.tsx`, `src/lib/playground.tsx`, `src/lib/page-nav.ts`, `src/lib/site-command-menu.tsx`, `src/lib/install-url.ts`, `src/lib/theme.ts` and `src/lib/changelog/`; the pages are the modules in `src/pages/` (each has its own `drift/<page>.md`), and there is no per-route demo for the shell.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of repeating it. Entries run: frame and layout, doc page, right panel and settings, site menu, the Changelog page, pages and registry items with no port.

## Window frame

- **Cause:** `port choice` (a desktop window has no browser to supply the chrome; reason not stated in code).
- **Original:** none; the browser draws the window. The page is the body on `--background` (`app/globals.css:331-338`).
- **Port:** a chrome-coloured window, a 40px drag bar with the title "Fluid Functionalism on gpuix" centred, and the page in a 10px-radius bordered panel with an 8px margin (`src/lib/app-frame.tsx:4-10, 13-78`). Transparent titlebar and traffic lights at 14/13 (`src/main.tsx:16-18`). The `chrome` token (`#EFEFEF` / `#0E0E0E`) is the port's own (`src/lib/theme.ts:19, 90, 139`).
- **Workaround:** n/a.
- **Fidelity:** dropped (extra chrome around every page).
- **Components it hits:** every page.

## The test renderer ignores window options and appearance

- **Cause:** `gpuix gap`.
- **Original:** n/a, this is about the harness.
- **Port:** the real window sets `titlebarTransparent`, `trafficLightX/Y` (`src/main.tsx:16-18`) and mirrors Light / Dark to `setAppearance` (`src/app.tsx:520-526`).
- **gpuix lacks:** the offscreen test window has no traffic lights, and `setAppearance` validates and does nothing, so `getAppearance()` stays the machine's and `appearanceChange` never fires (`packages/native/src/test_renderer.rs:834-840`, `packages/native/js/testing.ts:902-907`).
- **Workaround:** the screenshots pin the theme with `setThemeChoice("dark")` before rendering (`scripts/screenshots.tsx:215`) and flip it through the real select for the light capture (`:237-255`); a full page has no select, so the script sets Light directly. The select click is the step that fails today: it throws `VIEW_BUSY` from gpuix's `DismissableLayer` (README "gpuix gaps", Bugs), so every capture before `light.png` is written and the run ends with "the theme select has no Light row" (seen on `badge`).
- **Fidelity:** approximated (captures show the frame without the traffic lights; `light.png` is not written for pages with a right column).
- **Components it hits:** every demo capture.

## No responsive layout

- **Cause:** `not ported yet` (the fork now has `matchMedia` with size queries and change events, `~/code/fdarian/gpuix/FORK.md:831-832`; the port uses none).
- **Original:** the site switches at `xl` (1280px): below it the rail becomes a sheet behind a fixed top-left "Open navigation" trigger that closes on navigation, the right panel is hidden, and the settings move into the sheet's footer (`app/components/sidebar-layout.tsx:184-195`, `app/components/sidebar.tsx:130-141`, `app/globals.css:1020-1043`). Content is `max-w-[680px]` with `py-20 sm:py-28`, `mt-12` below `lg` (`app/docs/layout.tsx:1-7`). The title size follows the viewport: 22px below 640px, 28px above (`app/globals.css:416, 430-435`).
- **Port:** one fixed three-column layout at any width: sidebar, a page column of `PAGE_WIDTH` 600, a 296px customise column (`src/app.tsx:77, 541, 575, 613`); a "full" page fills the window instead (`:575-577`). The window opens at 1240x780 (`src/main.tsx:19-20`), already under the source's `xl`.
- **Workaround:** none.
- **Fidelity:** dropped (no narrow layout, no sheet).
- **Components it hits:** every page.

## Sidebar collapse and reopen are not part of the layout

- **Cause:** `not ported yet`. Same drift as [sidebar.md, "Collapse, reopen trigger, `[` toast, persistence"](sidebar.md#collapse-reopen-trigger--toast-persistence), where the entry lives.

## Arrow keys do not step through the pages

- **Cause:** `not ported yet`.
- **Original:** with no modifier and focus outside inputs, sliders, tablists, radiogroups, listboxes and menus, ← and → go to the previous and next page in `pageOrder` (Showcase, Introduction, Changelog, System pages, components); held keys keep advancing (`app/components/sidebar-layout.tsx:21-26, 126-170`).
- **Port:** no key handler in the app besides ⌘K (`src/lib/site-command-menu.tsx:66-77`). The order itself exists, with Changelog after Introduction as the source has it, for the menu's Previous page and Next page rows (`pageOrder`, `src/lib/page-nav.ts:5-23`, pinned by `scripts/check-site-nav.tsx`) and the hero's next arrow.
- **Workaround:** none; the menu rows and the arrow buttons do the same by pointer.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## Doc page header: title weight, no prev/next, no description on component pages

- **Cause:** `not ported yet` (arrows; the description on component pages); title weight is the shared static-font gap, see `README.md` "Variable-font axes" row.
- **Original:** `DocPage` renders the h1 in `text-site-display` bold (`wght 700, opsz 25`) with ghost icon-button prev / next arrows on the same row (tooltips "Name ←" / "Name →", disabled at either end), then the description 8px under the title and an optional intro paragraph; page gap 32 (`lib/docs/DocPage.tsx:73-128`, `registry/default/lib/font-weight.ts:25-29`).
- **Port:** every docs page and demo page takes `Heading`, `siteType.display` at `weight.semibold` (`src/app.tsx:80-92, 656-673`; it steps down with the Size row). The system pages put their description and optional intro under it through `DocPage` (Introduction does the same by hand), tucked up 8px by a negative margin (`src/lib/doc-page.tsx:164-221`, `:176`). A component demo page has the heading and the cards only: no description, no arrows. No docs page has arrows; only the home hero does (`src/app.tsx:317-358`). Page gap 24, top padding 40 (`src/app.tsx:581-583`) against the source's 112.
- **Workaround:** none.
- **Fidelity:** approximated (title lighter than the source's bold; arrows dropped, and the description on component pages).
- **Components it hits:** every demo page (description, arrows); every docs page, the Changelog page included (arrows, weight).

## No Installation block on component pages

- **Cause:** `port choice` (the port is not a registry; reason not stated).
- **Original:** an "Installation" heading with a note ("Base UI flavor. Switch in the right panel.", "Same source under both flavors.", or "One prompt for your coding agent: install command, usage, props.") and a copy-prompt button that writes `buildInstallPrompt(...)` to the clipboard and crossfades its icon to a check (`lib/docs/DocPage.tsx:130-170`, `lib/docs/copy-prompt-button.tsx:1-60`).
- **Port:** the seven system pages have the block through `DocPage`: the heading, a per-page note, and a primary "Copy prompt" button that writes the page's prompt string and shows a check for 2 s (`src/lib/doc-page.tsx:129-160, 164-221`); the prompts are written out per page (`src/pages/<page>/install-prompt.ts`, or in the page file). The component demo pages have none (`src/app.tsx:656-663`).
- **Workaround:** none.
- **Fidelity:** dropped (component pages).
- **Components it hits:** every component demo page.

## Preview frame: Inspect, highlighted code, and tabs on component pages

- **Cause:** `not ported yet` (Inspect, syntax highlighting, and the tabs and replay on component pages); the card look is a `port choice` (comment: "like the site's showcase cards", `src/lib/demo-kit.tsx:28`).
- **Original:** `ComponentPreview` is a `border-border/60` frame with a 52px header: the title (semibold), a `TabsSubtle` Preview / Code, an Inspect `Switch` that overlays rulers and a box-model inspector, and an optional replay button; the body is `bg-background` with `px-8 py-12`, `min-h-[120px]`, and an `align` and `padding` option; the Code tab shows a shiki-highlighted snippet; the frame border goes `foreground/40` on `:focus-within`, and a press on empty preview space routes the keyboard into the demo (`lib/docs/ComponentPreview.tsx:85-250`). Each block sits under a `DocSection` h2 (`lib/docs/DocPage.tsx:174-190`).
- **Port:** the system pages use `ComponentPreview` (`src/lib/doc-page.tsx:376-512`): a 12px-radius frame with a 52px header holding Preview / Code `TabsSubtle`, an optional replay or pause button, the border going 40% foreground on focus-within, `px-8 py-12` / `px-4 py-4` / none padding, a forced scheme for the source's `DarkPreview`, and optional culling. Its Code tab is plain monospace without highlighting; there is no Inspect switch or ruler overlay. The component demo pages still use `DemoCard`, a 12px-radius bordered box on `surface2` with 20px padding and a 44px footer carrying the title in muted body text, with no header, tabs, code, replay, focus border or section heading (`src/lib/demo-kit.tsx:29-96`); `DemoRow` is a 96px caption beside the controls, which the source does not have (`:98-125`).
- **Workaround:** none.
- **Fidelity:** dropped (Inspect; highlighting; tabs, code and replay on component pages); approximated (the frame).
- **Components it hits:** every demo page (all of it); every system page (Inspect, highlighting).

## Cards far from the scroller hide their content

- **Cause:** `gpuix gap` (no culling; see `README.md` "Culling" row and `drift/command-menu.md`).
- **Original:** the browser skips paint and layout for clipped content.
- **Port:** `DemoCard` sets its content to `display: none` and pins its height once it is more than 25% of the scroller away (`src/lib/demo-kit.tsx:14-55, 75`); `ComponentPreview` does the same with `cull` (`src/lib/doc-page.tsx:310-356`).
- **gpuix lacks:** culling.
- **Workaround:** that observer.
- **Fidelity:** approximated (a hitch of a frame or two when a far card is jumped to).
- **Components it hits:** every long demo page.

## API Reference props tables

- **Cause:** `not ported yet`.
- **Original:** each doc page ends with `DocSection title="API Reference"` holding a `PropsTable`: Prop / Type / Default / Description, the Default column dropped when no prop has one, monospace caption cells, `border-border/40` row rules, a horizontal `ScrollArea` with a `min-w-[520px]` table (`lib/docs/PropsTable.tsx:1-82`).
- **Port:** none; the demo pages stop at the last card and the system pages at their last section.
- **Workaround:** none; `drift/<component>.md` and the source comments carry the prop notes.
- **Fidelity:** dropped.
- **Components it hits:** every component with a doc page.

## Playgrounds: no Code tab, a demo-card frame, no inline fallback

- **Cause:** `not ported yet` (the Code tab and snippet, the inline fallback below `xl`); `port choice` (the frame, the shuffle glyph, the surface level).
- **Original:** ten components park a controls panel below "Make them yours" through `PlaygroundLayout`: accordion, ask-user-questions, banner, button, card, combobox, command-menu, dropdown, input-message, sidebar (`lib/docs/playgrounds/index.ts:26-37`, `lib/docs/playground.tsx:139-200`). The preview sits in the doc page's `ComponentPreview` with a Preview / Code tab and a snippet kept in sync with the controls; below `xl` the rail is `display: none` and the controls render inline under the preview; the panel provides `SurfaceProvider value={2}`; the shuffle button is a 28px ghost with a 15px lucide `Shuffle` at stroke 1.5 (`lib/docs/playground.tsx:105-137`).
- **Port:** all ten are ported, each as the first card of its demo page, plus the `queued-stack` "Queued chat" demo. `PlaygroundLayout` puts the preview in a `DemoCard` titled "Playground" (at least 420px tall) and mounts the controls in the right column's slot, fading them out when the preview leaves the page scroller's view (`src/lib/playground.tsx:242-320`). There is no Code tab or snippet, the rail is always present on a docs page (no narrow fallback: the layout has no breakpoint), the shuffle is a `Button` `icon-compact` whose glyph follows the button's size (14px) and goes to stroke 2 on hover (`:172-224`), and the panel sets its own `surface2` fill with no surface level for what it holds (`:190`).
- **Workaround:** none.
- **Fidelity:** dropped (Code tab, inline fallback); approximated (frame, shuffle glyph).
- **Components it hits:** the ten above; `drift/<component>.md` lists each playground's own differences.

## Customise card: no collapse

- **Cause:** `not ported yet`.
- **Original:** the panel is a 256px sticky column with a 16px right margin whose width, margin and opacity spring to 0 when `]` is pressed (toast "Properties panel expanded / collapsed"); a fixed top-right ghost button with the tooltip "Expand properties panel" `]` brings it back; the content scrolls in a `ScrollArea` with a scroll fade at `100svh - 2rem`; the card is `rounded-lg p-4 bg-muted` and hidden on the 404 page and on the full-screen routes (`app/components/right-panel.tsx:285-428`, `app/components/sidebar-layout.tsx:111-115, 184`).
- **Port:** a 296px column with 16px padding, so a 264px card, in the port's `ScrollArea` with a fade, `position: sticky; top: 0` beside the page column inside the page scroller as the source's is, at the scroller's own height (measured with `onLayout`: gpuix has no `100svh`, and the source's `top-4` and `max-h` are the column's padding here); the playground rail sits under the card in the same scroller. Always visible on a docs page, hidden on a "full" page, no collapse and no key (`src/app.tsx:606-642`). The card is radius 12 on `surface2` with a 16px padding and 12px gap (`src/app.tsx:396-407`); the source's `rounded-lg` is 8px on `bg-muted`.
- **Workaround:** none.
- **Fidelity:** approximated (card), dropped (collapse).
- **Components it hits:** just the shell.

## Customise card: header and credit

- **Cause:** `not ported yet`.
- **Original:** the heading "Make them yours" (semibold 550, title role) shares a row with a ghost GitHub-mark button showing the live star count (`15.2k` style, tabular figures, one cached fetch of the GitHub API per load, `window.open` on click); under the rows a 20px avatar and "Created by @micka_design" with a focus-ringed link (`app/components/right-panel.tsx:35-119, 261-279, 408-420`).
- **Port:** the heading alone, `siteType.title` at semibold 600 (`src/app.tsx:408-418`); no star button, no credit.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## The right column's rail is a page export

- **Cause:** `port choice` (a page export in place of a portal and a pathname test; same result).
- **Original:** the right panel hides "Make them yours" on `/changelog` (`showSettings = usePathname() !== "/changelog"`), and the page portals its Releases card into the rail's node (`useRightRailNode`), rendering nothing where the rail is `display: none` (`app/components/right-panel.tsx:328-330`, `app/changelog/changelog-view.tsx:538-552`, `lib/right-rail.tsx`).
- **Port:** a "docs" page may export `Rail`, and `App` renders it in the right column in place of `CustomizeCard`; a "full" page has no right column, so exporting one there throws (`PageModule.Rail`, `src/lib/demo.ts:146,192-199`; `src/app.tsx:627-633`). The page and its rail are siblings in `App`, so they share state through the page's own module: the Changelog's month in view and its jump are module signals only the scroll-spy writes (`src/pages/changelog/release-spy.ts:16-27`). The page scroller's `onScroll` reaches the page through `PageScrollContext`, a subscribe function `App` provides (`src/app.tsx:514-518,587`, `src/lib/demo-kit.tsx:18`). The playground rail's slot (`RightRailTarget`) stays mounted under the page's rail. With no Theme, Radius, Size or Icons select on the page, `scripts/screenshots.tsx` flips the theme directly for a page with a `Rail` (`scripts/screenshots.tsx:251-256`).
- **Workaround:** n/a.
- **Fidelity:** exact (the card alone in the rail, as on the source's `/changelog`).
- **Components it hits:** the Changelog page.

## Customise rows: Primitive is not ported

- **Cause:** `port choice` (the port is Base UI only, so a row that switched nothing would be fake; reason otherwise not stated).
- **Original:** the panel lists five borderless selects: Theme, Radius (Rounded, Pill), Size (Default, Compact), Icons (Lucide, Tabler, Phosphor, Hugeicons, Untitled UI) and Primitive (Radix, Base UI; the site's default is Base UI), each trigger at `h-7`, rows `py-3` with `gap-1.5` (`app/components/right-panel.tsx:122-259`, `lib/docs/site-settings.ts:26-31`). Primitive switches every dual-flavour page between the Radix and Base UI registries.
- **Port:** four rows, Theme, Radius, Size and Icons, each a 28px inline `Select` (`src/app.tsx:396-495`); Radius drives the reactive `shape` tokens (`src/lib/theme.ts:381-437`), Size the ambient `sizeChoice` and the `siteType` roles (`:320-370`), Icons the per-library glyph tables (`src/lib/icons.ts`). There is no Primitive row: every component is Base UI only and the Radix registry is not ported (`BASE-UI-AUDIT.md`).
- **Workaround:** none.
- **Fidelity:** dropped (one of five rows).
- **Components it hits:** the 17 dual-flavour components, in that they have no Radix build.

## Size row: components with no compact step do not follow it

- **Cause:** `not ported yet` (each component below has no compact step in the port; see its own drift file).
- **Original:** every component that reads `useSize` / `useSizeVariant` steps down together under Size: `accordion`, `ask-user-questions`, `badge`, `banner`, `button`, `card`, `chat-message`, `checkbox-group`, `color-picker`, `combobox`, `command-menu`, `dialog`, `dropdown` (and its sub-menus), `dropdown-search`, `input-copy`, `input-group`, `input-message`, `menu-item`, `nav-item`, `queued-stack`, `radio-group`, `select`, `sidebar`, `slider`, `switch`, `table`, `tabs`, `tabs-subtle`, `thinking-indicator` and `thinking-steps` (`registry/**/*.tsx` importing `size-context`).
- **Port:** `props.size ?? sizeChoice()` in 20 component files (`grep sizeChoice src/components`). These nine have no compact step and stay at the default whatever the row says: dropdown (with `menu-item`, `dropdown-search` and the sub-menus), combobox, sidebar, chat-message, color-picker, thinking-steps, thinking-indicator, queued-stack and ask-user-questions.
- **Workaround:** none.
- **Fidelity:** dropped (those components under Compact).
- **Components it hits:** the nine named.

## Icons row: component-owned glyphs stay lucide, and the Select shows a palette icon

- **Cause:** `not ported yet` (component-owned glyphs); `port choice` (the Select icon: the inline variant always shows the picked row's icon).
- **Original:** `IconProvider` swaps every glyph a component asks for by name (`registry/default/lib/icon-context.tsx`); the Icons row's trigger and its rows carry no icon (`app/components/right-panel.tsx:226-241`).
- **Port:** the five libraries' tables cover the shared glyph names (`src/lib/icons/*.ts`); a glyph a component defines itself with `defineIcon` stays lucide whichever library is picked (`src/lib/icons.ts:34-41`; 32 calls in 16 files). The inline `Select` shows the picked item's icon (`src/components/select.tsx:381-382`) and the Icons items carry a `palette` glyph (`src/lib/icons.ts:19-31`), so the row's trigger and its popup rows show a palette that the source's do not.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `defineIcon` glyph (chevrons, close marks, checks); just the shell for the Select.

## Theme: shortcut, tooltips, toasts

- **Cause:** `not ported yet`.
- **Original:** bare `T` cycles System -> Light -> Dark (not in inputs, no modifier); `R`, `S`, `I` do the same for Radius, Size, Icons. Each row has a tooltip "Press T to cycle" etc. (`registry/default/lib/theme-context.tsx:71-83`, `app/components/right-panel.tsx:169-242`). A sonner toast with the key as an inverted chip announces each shortcut change, and the menu's picks toast "Theme set to Dark" (`lib/docs/settings-toast.tsx`).
- **Port:** the four selects only (`src/app.tsx:420-495`); there is no toast component in `src/`.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## Theme change is not cross-faded

- **Cause:** `gpuix gap`. The source puts one rule on every element; gpuix has no stylesheet or universal selector to put it on, only a `transition` per element.
- **Original:** `ThemeProvider` adds `.transitioning` around the class swap, and `html.transitioning *` eases border-radius, background, colour, border, fill and stroke over 180ms ease-in-out on every element; the first apply is skipped (`registry/default/lib/theme-context.tsx:40-67`, `app/globals.css:856-866`).
- **Port:** `themeChoice` flips the palette signal and every `color.*` getter re-reads (`src/lib/theme.ts:200-254`). Components that declare a `transition` (mostly 80ms) ease the swap; the chrome, panel, headings, cards, sidebar and undeclared text cut at once. A 180ms fade on only the chrome and panel was tried and removed: with the text and cards still cutting, mid-swap shows new-theme text on a part-way background.
- **gpuix lacks:** a global transition rule (an inherited or universal `transition`).
- **Workaround:** none.
- **Fidelity:** approximated (declared component fades only, the rest cuts).
- **Components it hits:** every page.

## Theme and settings are not persisted

- **Cause:** `not ported yet`.
- **Original:** each setting is written to its own year-long cookie (`ff_theme`, `ff_shape`, `ff_size`, `ff_icons`, `ff_base`) and the root layout reads them back, so a reload paints the saved choice from the first frame (`lib/docs/settings-persistence.tsx`, `lib/docs/site-settings.ts:30-62`, `app/layout.tsx:58-69`).
- **Port:** every launch starts at System, Rounded, Default and Lucide (`src/lib/theme.ts:200-201, 325, 399`, `src/lib/icons.ts:29`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## System theme follows the OS through different code

- **Cause:** `port choice` (the window has no `prefers-color-scheme`; the fork exposes `createAppearance`).
- **Original:** `color-scheme: light dark` plus `light-dark()` tokens; a `.light` / `.dark` class on `<html>` pins one (`app/globals.css:46-50, 184-225`).
- **Port:** both columns kept as a token table, resolved by the `scheme()` signal; `bindSystemScheme(createAppearance())` feeds "system", and `renderer.setAppearance(themeChoice())` makes the native chrome follow (`src/lib/theme.ts:87-187, 203-254`, `src/app.tsx:510-526`). Token values match the source in both columns (checked: surfaces 1 to 8, foreground, muted, accent, status, checker, hover, active, tint); `--ring` and `--input` have no port token.
- **Workaround:** n/a.
- **Fidelity:** exact in the window; see "The test renderer ignores window options and appearance" for captures.
- **Components it hits:** every component.

## Static font weights and no `opsz`

- **Cause:** `gpuix gap`. See the README row "Variable-font axes (`fontVariationSettings`)" and the "Inter variable" row.
- **Original:** Inter variable with semibold `wght 550 / opsz 18` and bold `wght 700 / opsz 25` (`registry/default/lib/font-weight.ts:25-29`, `app/globals.css:6-18`).
- **Port:** static Inter cuts, semibold 600, no `opsz` (`src/lib/theme.ts:373-375`).
- **gpuix lacks:** variable-font axes.
- **Workaround:** nearest static weight.
- **Fidelity:** approximated.
- **Components it hits:** every component and page heading.

## Reduced motion reaches different properties than the source's

- **Cause:** `gpuix gap`.
- **Original:** `<MotionConfig reducedMotion="user">` wraps the app and drops transform and layout animations (`app/layout.tsx:73-77`). A `width` / `height` / `top` / `left` animation is not reduced unless the component reads `useReducedMotion()` itself (`motion-guidelines.md:270-286` lists the tabs hover pill, the selected backgrounds and the focus rings as stragglers), and `animate()` on a motion value ignores the config.
- **Port:** `App` wraps the tree in `<MotionConfig reducedMotion="user">` (`src/app.tsx:528`). gpuix reduces every `motion.*` position and size property (`width`, `height`, min/max, insets, margins, paddings, `gap`, `flexBasis`), and nothing else: opacity, colours, shadows and SVG geometry (`CheckMark`'s `pathLength`, `Icon`'s `easeStroke`) keep animating. The port has no transforms, so the source's `x` / `y` / `scale` travel is already one of those properties; but a source `animate` on a layout property that is not gated (the tabs pill, the sidebar sub-menu and thinking-steps collapses, the input-message collapse) glides there and jumps here. A motion value bound to a plain `div` (the slider's thumb and fill) keeps springing, as in the source. The source's own gates in `right-panel`, `sidebar-layout`, `playground-menu` and `not-found` have no counterpart: those pieces are not ported.
- **gpuix lacks:** a choice of which properties a config reduces, so a layout animation the source leaves moving cannot be left moving without a nested `<MotionConfig reducedMotion="never">` per site (`~/code/fdarian/gpuix/README.md:1953-1975`).
- **Workaround:** none; the port reduces more than the source.
- **Fidelity:** approximated (jumps where the source glides).
- **Components it hits:** tabs, tabs-subtle, sidebar, thinking-steps, input-message, scroll-area.

## Page scroller and base styles

- **Cause:** `not ported yet` (unverified live; read from code only).
- **Original:** `scrollbar-gutter: stable`, `overscroll-behavior-y: none`, a thin overlay scrollbar ramp tinted by `--overlay`, grayscale font smoothing, balanced headings, inline-code chips, and a focus-ring fallback for natively focusable elements (`app/globals.css:296-345, 326-332, 896-945, 868-891`).
- **Port:** the page column is a plain `overflowY: "scroll"` div (`src/app.tsx:551-562`) without the scrollbar styling. The docs pages have the inline-code chip and prose through `Code` and `Prose` (`src/lib/doc-page.tsx:44-74`; the chip is 13px with no-break-space padding, `drift/motion-page.md`); the shell has no prose.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every page.

## Site menu: Pages group has no Demo row and two rows the source lacks

- **Cause:** `not ported yet` (Demo); `port choice` (Concepts and Audio Mixer: the window has no URL bar to reach them).
- **Original:** Pages holds Showcase (home icon; keywords home / bento / gallery), Introduction (square-library; docs / getting started / install), Changelog (clock; releases / what's new / updates / breaking), Demo (play; slides / playground), Compare with shadcn (scaling; shadcn / side by side) (`app/components/site-command-menu.tsx:90-96, 199-213`).
- **Port:** Showcase, Introduction, Changelog (the clock icon and the same four keywords, as the page's `menuIcon` and `menuKeywords`; pinned by `scripts/check-site-nav.tsx`), Compare with shadcn, Audio Mixer (sliders-horizontal; mixer / eq / audio / slider) and Concepts (no icon; concepts / mockups), in page-module order (`src/lib/site-command-menu.tsx:111-142`, the `menuIcon` and `menuKeywords` exports of each `src/pages/*.tsx`). No Demo row: `/demo` is not ported. Audio Mixer and Concepts are rows the source's menu does not have; there they are reachable by URL only.
- **Workaround:** none.
- **Fidelity:** dropped (Demo); approximated (two extra rows).
- **Components it hits:** just the site menu.

## Site menu and Showcase: New and Updated follow no release, and Components lack keywords

- **Cause:** `not ported yet`.
- **Original:** a "System" group of the seven system pages and Components rows with the description "New" or "Updated" (New covers the latest release's New entries and the pages listed ahead of the next release, Updated its Updated and Breaking ones) and keywords of the slug plus every word of the component's description (`app/components/site-command-menu.tsx:194-225`, `lib/changelog/marks.tsx`, `lib/changelog/load.ts` `latestMarks`). The same marks badge the Showcase tiles, /demo and /compare (`app/components/bento-grid.tsx:105-127`).
- **Port:** the marks exist (`latestMarks`, `AHEAD_OF_RELEASE`, `src/lib/changelog/load.ts`) and only the nav reads them, for its New dots (`src/lib/changelog/releases.ts`, `src/app.tsx:192-243`). The System group is ported with the slug and description words as keywords and no icon (`src/lib/site-command-menu.tsx:142`, each system page's `menuKeywords`), but no "New" or "Updated" description. The Components group is the discovered demos with no description and no keywords, so the filter matches the title only (`:143-145`). The Showcase tiles' New badge is a fixed `isNew` per tile (`src/home/bento-grid.tsx:32,36,79`: CommandMenu, Combobox, CarouselDots) rather than the marks, so Banner, listed ahead of its release, has none. The port has 32 demos where the source lists 28 components; the extra four (file-thumbnail, mobile-drawer, queued-stack, scroll-area) are menu rows only (`listed: "menu"`).
- **Workaround:** none.
- **Fidelity:** dropped (the menu's badges and the Components keywords); approximated (the Showcase badges).
- **Components it hits:** just the site menu and the Showcase.

## Site menu: Settings has only Theme rows and no toast

- **Cause:** `not ported yet`.
- **Original:** Settings holds 3 Theme, 2 Radius, 2 Size, 5 Icons and 2 Primitive rows (14); a theme row reads "Theme: Follow system / Light / Dark", the action "Set theme to ...", description "Current" on the active one, icons monitor / sun / moon, keywords theme / appearance / mode; a pick toasts "Theme set to Light" (`app/components/site-command-menu.tsx:104-120, 227-298`).
- **Port:** only the three Theme rows, with the label "Theme: System" (the shared `THEMES` label, `src/lib/theme.ts:195`) instead of "Follow system", no toast (`src/lib/site-command-menu.tsx:145-157`). The Radius, Size and Icons rows exist in the customise card now but not in the menu, so 9 rows are missing (Primitive's 2 have no setting to change).
- **Workaround:** none.
- **Fidelity:** dropped (11 rows); approximated (label).
- **Components it hits:** just the site menu.

## Site menu: dialog title and description, shortcut routing

- **Cause:** `not ported yet`.
- **Original:** `CommandMenuDialog` takes `title="Site menu"` and `description="Jump to a page or change a setting."` as the dialog's accessible name, and binds `shortcut="mod+k"` itself (`app/components/site-command-menu.tsx:385-390`, `registry/default/command-menu.tsx:1425-1540`).
- **Port:** the dialog has no title or description props (`src/components/command-menu.tsx:1288-1292`). A separate window listener toggles the menu (`src/lib/site-command-menu.tsx:67-77`); `isModK` matches Meta or Ctrl, no Alt, on `event.key` alone (`:42-45`). On Dvorak the key that types "t" does not open it: gpuix derives `code` from `key`, so there is no physical K to match (`scripts/check-command-menu.tsx` checks ⌘T and ⌘⌥K stay closed and ⌘K toggles; the layout itself needs a live check).
- **Workaround:** none.
- **Fidelity:** exact on macOS.
- **Components it hits:** just the site menu.

## Site menu: ⌘K has no physical-key fallback for non-Latin layouts off macOS

- **Cause:** `gpuix gap`.
- **Original:** `matchesShortcut` reads the physical key (`code`) when `key` is not a Latin letter or digit, so Ctrl+K opens the menu on a Cyrillic or Greek layout (`registry/default/command-menu.tsx:195-230`).
- **Port:** `isModK` reads `key` only (`src/lib/site-command-menu.tsx:60-63`).
- **gpuix lacks:** a physical key. `code` is "derived from GPUI's `key`, which is layout-dependent on every platform", so a Cyrillic key reports `code` `""` (`~/code/fdarian/gpuix/packages/native/src/events/key_names.rs:9-12`, `:138-160`). On macOS this does not bite: GPUI reports the layout's Cmd letter, so ⌘K works on Cyrillic, Armenian and Dvorak-QWERTY (`~/code/fdarian/gpuix/zed/crates/gpui_macos/src/events.rs:425-439`). On Windows and Linux, Ctrl plus a non-Latin letter does not match (README Missing features row "site menu (`isModK`)"). Not run there.
- **Workaround:** none; the sidebar's Search row opens the menu.
- **Fidelity:** exact on macOS; dropped for non-Latin layouts on Windows and Linux.
- **Components it hits:** just the site menu.

## Site menu: Recent is kept for the session only

- **Cause:** `not ported yet` (persistence).
- **Original:** the last three pages opened through the menu are kept in `localStorage["ff:command-menu-recent"]`, read on open, and listed first under "Recent" while the field is empty, then dropped from their own group (`app/components/site-command-menu.tsx:51-53, 122-138, 170-188, 391`).
- **Port:** the same list through `CommandMenu`'s `suggestions` and `suggestionsLabel` (`src/lib/site-command-menu.tsx:221-222`), held in a module-level signal of at most three slugs (`:35-42`), so it starts empty on every launch.
- **Workaround:** none.
- **Fidelity:** approximated (the list does not survive a restart).
- **Components it hits:** just the site menu.

## Site menu: Actions have no toast, a fixed install flavour, and display-only arrow caps

- **Cause:** `not ported yet` (the toast, the arrow keys); `port choice` (the install flavour: the port has no Primitive row).
- **Original:** the Actions group offers "Copy install command" on a component page (writes `npx shadcn@latest add <url>` with the flavour the Primitive row picked, then toasts "Install command copied"), "Previous page" and "Next page" (shortcut caps `←` / `→`, which the sidebar layout's arrow keys honour), and "Open on GitHub" (`app/components/site-command-menu.tsx:299-360`, `lib/base-context.tsx:76-84`).
- **Port:** the same four rows, with the same descriptions, keywords and order (`src/lib/site-command-menu.tsx:159-207`, tab `:25-29`). The copy writes the Base UI URL always (`src/lib/install-url.ts:1-39`) and shows no toast (the port has no toast component); a refused write logs, the source swallows it. The `←` / `→` caps are drawn but nothing binds the keys (see "Arrow keys do not step through the pages"). "Open on GitHub" hands the URL to the OS (`src/lib/platform.ts:3-5`).
- **Workaround:** none.
- **Fidelity:** approximated (no confirmation after a copy; caps that promise keys that do nothing).
- **Components it hits:** just the site menu.

## Changelog: no Markdown route, and no link to it

- **Cause:** `port choice` (a desktop window has no URL, crawler or `<head>` for an agent to follow; reason not stated in code).
- **Original:** `/changelog.md` is the same page as one Markdown file, linked from the intro line as "View as Markdown" (underlined, the underline darkens on hover) and advertised in the page's `<head>` as `alternates.types["text/markdown"]`; the Copy migration prompt re-installs exactly the item that Markdown names (`app/changelog.md/`, `lib/changelog/markdown.ts`, `app/changelog/changelog-view.tsx:116-127`, `app/changelog/page.tsx:12-30`).
- **Port:** the intro line has no link, and there is no Markdown route or `markdown.ts`; the release files parse straight into the page. The Copy upgrade prompt and the Breaking entries' Copy migration prompts are built the same way as the source's (`src/pages/changelog/changelog-view.tsx:14-52`, `src/lib/changelog/upgrade-prompt.ts`, `migration-prompt.ts`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the Changelog page.

## Changelog: no copy-link icon beside a month

- **Cause:** `port choice` (a desktop window has no URL fragment to copy; reason not stated in code).
- **Original:** each month title has a 20px link button beside it, revealed on hover or focus, that sets `#<month>` and copies `/changelog#<month>`, its glyph swapping to a check for 2 s with a "Link copied" live region (`app/changelog/changelog-view.tsx:249-313`).
- **Port:** the month title and the "Released" date only (`src/pages/changelog/release-section.tsx:90-125`). A month is reached from the Releases card, which scrolls it to 32px under the top (`src/pages/changelog/release-index.tsx`, `release-spy.ts`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the Changelog page.

## Changelog: Breaking diffs are plain monospace

- **Cause:** `not ported yet` (nothing stops the port tinting tokens; it has no highlighter, as in "Preview frame" above).
- **Original:** each Breaking entry's diff is highlighted at build time (`diffHtml`), with the `+` and `-` lines tinted, in a bordered rounded box that scrolls sideways (`app/changelog/changelog-view.tsx:40-46`, `lib/changelog/markdown.ts`).
- **Port:** `DiffBlock` draws the box and the line tints, the marker in a 16px gutter, with every character in the foreground colour (`src/pages/changelog/diff-block.tsx:21-104`).
- **Workaround:** none.
- **Fidelity:** approximated (the diff structure, without syntax colours).
- **Components it hits:** the Changelog page's Breaking entries.

## Changelog: transforms are drawn by size and margin

- **Cause:** `gpuix gap` (CSS transforms; see the README row).
- **Original:** the month in view grows its timeline dot with `animate={{ scale: 1.3 }}` on `spring.moderate`, held centred by `-translate-y-1/2`; an entry's name has an arrow that nudges `translate-x-0.5` on hover (`app/changelog/changelog-view.tsx:181-206,336-345`).
- **Port:** the dot animates its box: width and height, the offset that keeps it centred, the radius and the ring's spread, each moved by the same 1.3 on `tween.moderate`, so it stays one `motion.div` (`src/pages/changelog/release-section.tsx:14-44,60-88`). The arrow's nudge is a 2px `marginLeft` (`src/pages/changelog/entry.tsx:85-132`).
- **gpuix lacks:** CSS transforms: no scale or translate (README "CSS transforms" row).
- **Workaround:** the size animation and the margin.
- **Fidelity:** approximated (the same ends and spring; the dot is redrawn at each size, so its ring and radius move with it).
- **Components it hits:** the Changelog page; the README row lists the rest.

## Changelog: the Sizes preview stage has no horizontal padding

- **Cause:** `port choice` (the preview itself is wider in the port: its Select trigger is 16px wider than the source's, see `drift/select.md`).
- **Original:** the Sizes stage is `px-6 py-8`, like the Showcase's overrides (`app/changelog/previews.tsx:99-106`).
- **Port:** `sizes: { x: 0, y: 32 }`. The toolbar does not shrink and is 570px wide, in a stage 574px inside its border, so 24px of padding would clip it; the other overrides match the source's (`src/pages/changelog/previews.tsx:24-33`).
- **Workaround:** none.
- **Fidelity:** approximated (the toolbar nearly touches the stage's edges).
- **Components it hits:** the Changelog page's Sizes entry.

## Changelog: the Releases card is the sidebar's menu, on `color.muted`

- **Cause:** `port choice` (the rows reuse `SidebarMenu` rather than the source's own fluid-hover list).
- **Original:** the card is `p-4 bg-muted` in the shape's container radius; its rows are `<a href="#month">` with `aria-current="location"`, a hover highlight and an active pill that glides on `spring.moderate`, the row weight easing 400 to 550, and a click that smooth-scrolls the month and `replaceState`s the hash (`app/changelog/changelog-view.tsx:554-680`).
- **Port:** `ReleaseIndexCard` is on `color.muted`, padding 16, `shape.container`, with the "Releases" header sized as "Make them yours" (`src/pages/changelog/release-index.tsx:13-57`). The rows are `SidebarMenuButton`s in one `SidebarMenu`, so the active fill glides as the sidebar's does, hover follows the pointer, arrows, Home and End move between months, and the active row is `aria-current="page"`; the weight switches at once (the static font gap). There is no URL hash to set. `color.muted` is the source's `bg-muted`; it differs from the `surface2` the port's own "Make them yours" card is on in the light theme (`#F4F4F5` against `#FCFCFC`; the two match in dark), see "Customise card: no collapse".
- **Workaround:** none.
- **Fidelity:** approximated (keyboard behaviour, `aria-current`, the weight step, no hash); exact for the card's fill and shape.
- **Components it hits:** the Changelog page.

## Home hero: "See demo" opens the site in the browser

- **Cause:** `not ported yet` (`/demo`).
- **Original:** the hero's buttons are a "Copy install prompt" button that copies the starter prompt with the visitor's settings, "Learn more" to `/docs` and "See demo" to `/demo` (`app/page.tsx:12-62`, `app/components/starter-install.tsx`).
- **Port:** "Copy install prompt" writes the source's starter prompt for the port's settings (Base UI, rounded, default size, Lucide icons, the current theme; `src/lib/starter-prompt.ts`) and its icon turns into a check for 2 s, without the crossfade; a refused write logs and leaves the icon alone, as the source's `CopyPromptButton` does (`src/app.tsx`, `Hero`). "Learn more" opens the Introduction page, the port's `/docs`. "See demo" goes to `/demo`, which is not ported, so it opens fluidfunctionalism.com/demo in the default browser through `open` / `xdg-open` (`src/lib/open-url.ts`; gpuix has no link opener); it is the one control that leaves the app. The bento grid and the prev / next arrows are ported (`src/home/`; differences in `drift/home.md`).
- **Workaround:** none.
- **Fidelity:** exact for Copy install prompt and Learn more; approximated for See demo (the browser, not an in-app page).
- **Components it hits:** just the home page.

## Pages not ported: /demo and /compare-bases

- **Cause:** `not ported yet` for /demo; `port choice` for /compare-bases (the port ships Base UI only; reason not stated, and the Radix registry is not ported).
- **Original:** `/demo` is a slide presentation of every component plus a settings slide, with a `?c=<slug>` param, and a pen `PlaygroundMenu` on each slide's card that opens the playground controls in a popover (`app/demo/page.tsx:1-349`, `app/components/playground-menu.tsx`); `/compare-bases` shows the Radix and Base UI builds side by side (`app/compare-bases/page.tsx`). Both are full-screen (no sidebar or right panel, `app/components/sidebar-layout.tsx:111-115`).
- **Port:** none. `/compare` is ported (`src/pages/compare.tsx`, `drift/compare.md`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none directly.

## "See demo" is disabled on Compare

- **Cause:** `not ported yet` (`/demo`).
- **Original:** the home hero and the Compare header link to `/demo` (`app/page.tsx`, `app/compare/page.tsx:155-161`).
- **Port:** Compare's "See demo" is a disabled tertiary button (`src/pages/compare.tsx:329-335`); the hero's opens fluidfunctionalism.com/demo in the browser (see "Home hero: \"See demo\" opens the site in the browser").
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the home hero and the Compare page.

## Pages not ported: /table and /stars

- **Cause:** `not ported yet` (left out of this port's scope; nothing stops them).
- **Original:** `/table` is a quotes table with `TabsSubtle` filters (`app/table/page.tsx`); `/stars` is a hidden easter egg that rasterises the live star count into a field of switches (`app/stars/`, `app/api/stars/route.ts`). Both are separate from `/docs/table`; `/stars` is full-screen.
- **Port:** none. `/concepts` (the index and Lumen, Atlas, Beacon, Quill) and `/slider` (Audio Mixer) are ported: `drift/concepts.md`, `drift/audio-mixer.md`.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none directly.

## Unlisted pages are reached from the site menu or their own links, and full pages hide the sidebar

- **Cause:** `port choice` (the window has no URL bar, history or back button).
- **Original:** `/compare`, `/concepts` and `/slider` are unlisted routes: typed or linked, and `/compare` is a menu row; `/concepts` and `/compare` are full-screen (`app/components/sidebar-layout.tsx:111-115`). The four concept pages are linked from the concepts index and its nav.
- **Port:** Compare, Concepts and Audio Mixer are Pages rows in the site menu (`listed: "menu"`); the concept pages are `listed: "none"`, reachable only from the index and the concept nav (`src/pages/concepts.tsx:43`, `src/pages/concepts/frame.tsx:75-96`). A "full" page (Compare, the index, the four concepts) drops the sidebar and the customise column (`src/app.tsx:541, 606`), so the way out is its own Home link, ⌘K, or on Compare the footer links; there is no back button. Audio Mixer is a "docs" page, so it keeps the sidebar and the right column.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** none directly.

## Pages not ported: 404

- **Cause:** `not ported yet` (a desktop app has no unknown route, so it has no use today).
- **Original:** `not-found.tsx`: a large "404" whose zero springs into line on hover or focus, "A little out of place.", "We couldn't find this page." and a tertiary "Back to showcase" button; the right panel is hidden on it (`app/not-found.tsx:1-74`, `app/components/sidebar-layout.tsx:184`).
- **Port:** `App` shows nothing for an unknown page: the `Switch` has no fallback (`src/app.tsx:589-599`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none.

## Web-only routes and metadata

- **Cause:** `port choice` (a desktop window has no URL, crawler, CLI registry or analytics; reason not stated).
- **Original:** registry endpoints `app/r/preset/[code]`, `app/r/setup/[slug]`, `app/r/starter/[slug]` that `npx shadcn` fetches; `app/api/stars` (cached GitHub star count); `robots.ts`, `sitemap.ts`; `middleware.ts` counting registry fetches; Vercel Analytics and Speed Insights; the title, description, favicons, manifest and Open Graph image (`app/layout.tsx:20-46, 89-90`).
- **Port:** none; the window title is the only metadata (`src/app.tsx:78`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none.

## Registry items with no port

- **Cause:** `not ported yet` for each item below, unless stated.
- **Original:** every component in `registry/base` and `registry/default` has a port except the blocks `sidebar-workspace-header`, `sidebar-user-footer`, `dialog-sidebar/settings-dialog`, and the `sidebar-app` composition (`app-sidebar`, `inset-topbar`, `nav-data`, `page`) (`registry/blocks/`). `nav-item` and `nav-menu` are ported (`src/components/nav-item.tsx`, `nav-menu.tsx`, `drift/nav-menu.md`). `search-field` is ported (`src/components/sidebar.tsx:542`); check `drift/sidebar.md` for the blocks. Ported as part of another file rather than on their own: `dropdown-sub` inside `src/components/dropdown.tsx` and `menu-item.tsx`; `fluid-hover-highlight` as `src/lib/fluid-highlight.tsx`; `sidebar-core` and `sidebar-menu` inside `src/components/sidebar.tsx`; `scroll-area` and `queued-stack` have their own files.
- **Port:** none for the items above. The `registry/radix` flavour of all 17 dual-flavour components is not ported on purpose (`port choice`; the port is Base UI only, see `BASE-UI-AUDIT.md`), and the registry lib items `elevated`, `surface-classes`, `type-scale` and `typography` have no port beyond the tokens in `src/lib/theme.ts`. The context items have an app-wide stand-in rather than a provider: `shape-context` is `shapeChoice` (`src/lib/theme.ts:400`), `size-context` is `sizeChoice` (`:325`), `icon-context` and the four extra icon libraries are `iconLibrary` and the tables in `src/lib/icons/` (`src/lib/icons.ts`); an explicit `size` does not scope the parts inside a component (`drift/select.md`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the sidebar demo (blocks), none for the rest.
