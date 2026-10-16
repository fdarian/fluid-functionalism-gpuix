# site

Original: the site shell of fluidfunctionalism.com at 0a0377e (kept at `~/.claude/notes/ff-source/`): `app/layout.tsx`, `app/components/sidebar-layout.tsx`, `right-panel.tsx`, `site-command-menu.tsx`, `playground-menu.tsx`, `app/globals.css`, `lib/docs/DocPage.tsx` / `ComponentPreview.tsx` / `PropsTable.tsx`, the settings providers, and every route under `app/`. The sidebar itself is in `drift/sidebar.md`.
Ported in `src/main.tsx`, `src/app.tsx`, `src/lib/app-frame.tsx`, `src/lib/demo-kit.tsx`, `src/lib/site-command-menu.tsx` and `src/lib/theme.ts`; there is no per-route demo for the shell.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of repeating it. Entries run: frame and layout, doc page, right panel and settings, site menu, pages and registry items with no port.

## Window frame

- **Cause:** `port choice` (a desktop window has no browser to supply the chrome; reason not stated in code).
- **Original:** none; the browser draws the window. The page is the body on `--background` (`app/globals.css:331-338`).
- **Port:** a chrome-coloured window, a 40px drag bar with the title "Fluid Functionalism on gpuix" centred, and the page in a 10px-radius bordered panel with an 8px margin (`src/lib/app-frame.tsx:4-7, 31-66`). Transparent titlebar and traffic lights at 14/13 (`src/main.tsx:14-22`). The `chrome` token (`#EFEFEF` / `#0E0E0E`) is the port's own (`src/lib/theme.ts:14, 85, 134`).
- **Workaround:** n/a.
- **Fidelity:** dropped (extra chrome around every page).
- **Components it hits:** every page.

## The test renderer ignores window options and appearance

- **Cause:** `gpuix gap`.
- **Original:** n/a, this is about the harness.
- **Port:** the real window sets `titlebarTransparent`, `trafficLightX/Y` (`src/main.tsx:15-17`) and mirrors Light / Dark to `setAppearance` (`src/app.tsx:239-244`).
- **gpuix lacks:** the offscreen test window has no traffic lights, and `setAppearance` validates and does nothing, so `getAppearance()` stays the machine's and `appearanceChange` never fires (`packages/native/src/test_renderer.rs:834-840`, `packages/native/js/testing.ts:902-907`).
- **Workaround:** the screenshots pin the theme with `setThemeChoice("dark")` before rendering and flip it through the real control for the light capture (`scripts/screenshots.tsx:201`, `:211-221`). README "gpuix gaps" lists the bug.
- **Fidelity:** approximated (captures show the frame without the traffic lights).
- **Components it hits:** every demo capture.

## No responsive layout

- **Cause:** `not ported yet` (the fork now has `matchMedia` with size queries and change events, `~/code/fdarian/gpuix/FORK.md:831-832`; the port uses none).
- **Original:** the site switches at `xl` (1280px): below it the rail becomes a sheet behind a fixed top-left "Open navigation" trigger that closes on navigation, the right panel is hidden, and the settings move into the sheet's footer (`app/components/sidebar-layout.tsx:184-195`, `app/components/sidebar.tsx:130-141`, `app/globals.css:1020-1043`). Content is `max-w-[680px]` with `py-20 sm:py-28`, `mt-12` below `lg` (`app/docs/layout.tsx:1-7`). The title size follows the viewport: 22px below 640px, 28px above (`app/globals.css:416, 430-435`).
- **Port:** one fixed three-column layout at any width: sidebar, a page column of `PAGE_WIDTH` 600, a 296px customise column (`src/app.tsx:45, 276, 297`). The window opens at 1240x780 (`src/main.tsx:18-19`), already under the source's `xl`.
- **Workaround:** none.
- **Fidelity:** dropped (no narrow layout, no sheet).
- **Components it hits:** every page.

## Sidebar collapse and reopen are not part of the layout

- **Cause:** `not ported yet`. Same drift as [sidebar.md, "Collapse, reopen trigger, `[` toast, persistence"](sidebar.md#collapse-reopen-trigger--toast-persistence), where the entry lives.

## Arrow keys do not step through the pages

- **Cause:** `not ported yet`.
- **Original:** with no modifier and focus outside inputs, sliders, tablists, radiogroups, listboxes and menus, ← and → go to the previous and next page in `pageOrder` (Showcase, Introduction, System pages, components); held keys keep advancing (`app/components/sidebar-layout.tsx:20-25, 117-162`).
- **Port:** no key handler in the app besides ⌘K (`src/app.tsx`, `src/lib/site-command-menu.tsx:45-51`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## Doc page header: title weight, description, no prev/next

- **Cause:** `not ported yet` (description and arrows); title weight is the shared static-font gap, see `README.md` "Variable-font axes" row.
- **Original:** `DocPage` renders the h1 in `text-site-display` bold (`wght 700, opsz 25`) with ghost icon-button prev / next arrows on the same row (tooltips "Name ←" / "Name →", disabled at either end), then the description 8px under the title and an optional intro paragraph; page gap 32 (`lib/docs/DocPage.tsx:73-128`, `registry/default/lib/font-weight.ts:25-29`).
- **Port:** `DemoPage` draws the demo's title in `scale.display` at `weight.semibold` (`src/app.tsx:48-60, 311-318`); no description, no arrows. Page gap 24, top padding 40 (`src/app.tsx:273-282`) against the source's 112.
- **Workaround:** none.
- **Fidelity:** approximated (title lighter than the source's bold; description and arrows dropped).
- **Components it hits:** every demo page.

## No Installation block

- **Cause:** `port choice` (the port is not a registry; reason not stated).
- **Original:** an "Installation" heading with a note ("Base UI flavor. Switch in the right panel.", "Same source under both flavors.", or "One prompt for your coding agent: install command, usage, props.") and a copy-prompt button that writes `buildInstallPrompt(...)` to the clipboard and crossfades its icon to a check (`lib/docs/DocPage.tsx:130-170`, `lib/docs/copy-prompt-button.tsx:1-60`).
- **Port:** none (`src/app.tsx:311-318`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every demo page.

## Preview frame: no Preview / Code tabs, Inspect, replay

- **Cause:** `not ported yet` (tabs, inspect, replay, code); the card look is a `port choice` (comment: "like the site's showcase cards", `src/lib/demo-kit.tsx:26`).
- **Original:** `ComponentPreview` is a `border-border/60` frame with a 52px header: the title (semibold), a `TabsSubtle` Preview / Code, an Inspect `Switch` that overlays rulers and a box-model inspector, and an optional replay button; the body is `bg-background` with `px-8 py-12`, `min-h-[120px]`, and an `align` and `padding` option; the Code tab shows a shiki-highlighted snippet; the frame border goes `foreground/40` on `:focus-within`, and a press on empty preview space routes the keyboard into the demo (`lib/docs/ComponentPreview.tsx:85-250`). Each block sits under a `DocSection` h2 (`lib/docs/DocPage.tsx:174-190`).
- **Port:** `DemoCard` is a 12px-radius bordered box on `surface2` with 20px padding and a 44px footer carrying the title in muted body text; no header, tabs, code, inspect, replay, focus border or section heading (`src/lib/demo-kit.tsx:56-91`). `DemoRow` is a 96px caption beside the controls, which the source does not have (`src/lib/demo-kit.tsx:94-121`).
- **Workaround:** none.
- **Fidelity:** dropped (the Code tab and Inspect); approximated (the frame).
- **Components it hits:** every demo page.

## Cards far from the scroller hide their content

- **Cause:** `gpuix gap` (no culling; see `README.md` "Culling" row and `drift/command-menu.md`).
- **Original:** the browser skips paint and layout for clipped content.
- **Port:** `DemoCard` sets its content to `display: none` and pins its height once it is more than 25% of the scroller away (`src/lib/demo-kit.tsx:13-54, 71-73`).
- **gpuix lacks:** culling.
- **Workaround:** that observer.
- **Fidelity:** approximated (a hitch of a frame or two when a far card is jumped to).
- **Components it hits:** every long demo page.

## API Reference props tables

- **Cause:** `not ported yet`.
- **Original:** each doc page ends with `DocSection title="API Reference"` holding a `PropsTable`: Prop / Type / Default / Description, the Default column dropped when no prop has one, monospace caption cells, `border-border/40` row rules, a horizontal `ScrollArea` with a `min-w-[520px]` table (`lib/docs/PropsTable.tsx:1-82`).
- **Port:** none; the demo pages stop at the last card.
- **Workaround:** none; `drift/<component>.md` and the source comments carry the prop notes.
- **Fidelity:** dropped.
- **Components it hits:** every component with a doc page.

## Doc-page playgrounds in the right rail

- **Cause:** `not ported yet`.
- **Original:** eleven components park a controls panel below "Make them yours" through `RightRailTarget`: accordion, ask-user-questions, banner, button, card, combobox, command-menu, dropdown, input-message, queued-stack, sidebar (`lib/docs/playgrounds/index.ts`, `lib/docs/playground.tsx:1-25`, `lib/right-rail.tsx`, `app/components/right-panel.tsx:424`). `PlaygroundMenu` offers the same panel from a pen button on the home and demo cards (`app/components/playground-menu.tsx`).
- **Port:** none; `drift/card.md` notes the card demo is "the docs page minus the playground".
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the eleven above.

## Customise card: collapse, sticky column, scroll area

- **Cause:** `not ported yet`.
- **Original:** the panel is a 256px sticky column with a 16px right margin whose width, margin and opacity spring to 0 when `]` is pressed (toast "Properties panel expanded / collapsed"); a fixed top-right ghost button with the tooltip "Expand properties panel" `]` brings it back; the content scrolls in a `ScrollArea` with a scroll fade at `100svh - 2rem`; the card is `rounded-lg p-4 bg-muted` and hidden on the 404 page (`app/components/right-panel.tsx:285-428`, `app/components/sidebar-layout.tsx:184`).
- **Port:** a fixed 296px column with 16px padding, so a 264px card; always visible, never scrolls, no key (`src/app.tsx:297-299`). The card is radius 12 on `surface2` with a 16px padding and 12px gap (`src/app.tsx:187-229`); the source's `rounded-lg` is 8px on `bg-muted`.
- **Workaround:** none.
- **Fidelity:** approximated (card), dropped (collapse, scroll).
- **Components it hits:** just the shell.

## Customise card: header and credit

- **Cause:** `not ported yet`.
- **Original:** the heading "Make them yours" (semibold 550, title role) shares a row with a ghost GitHub-mark button showing the live star count (`15.2k` style, tabular figures, one cached fetch of the GitHub API per load, `window.open` on click); under the rows a 20px avatar and "Created by @micka_design" with a focus-ringed link (`app/components/right-panel.tsx:35-119, 261-279, 408-420`).
- **Port:** the heading alone, semibold 600 (`src/app.tsx:207-216`); no star button, no credit.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## Customise rows not ported: Radius, Size, Icons, Primitive

- **Cause:** `not ported yet`. No provider exists for them; the port's components take `size` per use and have no shape or icon-library context (`grep ShapeProvider|SizeProvider src` finds nothing).
- **Original:** the panel lists five borderless selects: Theme (System, Light, Dark with monitor / sun / moon icons), Radius (Rounded, Pill), Size (Default, Compact), Icons (Lucide, Tabler, Phosphor, Hugeicons, Untitled UI) and Primitive (Radix, Base UI; the site's default is Base UI), each trigger at `h-7`, rows `py-3` with `gap-1.5` (`app/components/right-panel.tsx:122-259`, `lib/docs/site-settings.ts:26-31`). Radius swaps `shape.*` classes; Size sets `<html data-size>` and every `text-site-*` role steps down (`app/globals.css:437-457`); Primitive switches every dual-flavour page between the Radix and Base UI registries.
- **Port:** only Theme: one inline `Select` over `THEMES` (System, Light, Dark with the same icons) on a 28px row (`src/app.tsx:187-229`, `src/lib/theme.ts:183-189`). The type scale has only the default step and no `site-*` roles (`src/lib/theme.ts:266-275`). Every component is Base UI only; there is one icon set (lucide, `src/lib/icons.ts`).
- **Workaround:** none.
- **Fidelity:** dropped (four of five rows, and everything they drive).
- **Components it hits:** all of them (pill radius, compact steps, icon libraries, Radix flavour). See each `drift/<component>.md` for its own size handling.

## Theme: shortcut, tooltips, toasts

- **Cause:** `not ported yet`.
- **Original:** bare `T` cycles System -> Light -> Dark (not in inputs, no modifier); `R`, `S`, `I` do the same for Radius, Size, Icons. Each row has a tooltip "Press T to cycle" etc. (`registry/default/lib/theme-context.tsx:71-83`, `app/components/right-panel.tsx:169-242`). A sonner toast with the key as an inverted chip announces each shortcut change, and the menu's picks toast "Theme set to Dark" (`lib/docs/settings-toast.tsx`).
- **Port:** the select only (`src/app.tsx:218-226`); there is no toast component in `src/`.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## Theme change is not cross-faded

- **Cause:** `not ported yet`.
- **Original:** `ThemeProvider` adds `.transitioning` around the class swap, so border-radius, background, colour, border, fill and stroke ease over 180ms; the first apply is skipped (`registry/default/lib/theme-context.tsx:40-67`, `app/globals.css:856-866`).
- **Port:** `themeChoice` flips the palette signal and every `color.*` getter re-reads (`src/lib/theme.ts:191-228`); no colour transition is declared on the frame, panels or text. Gpuix has colour transitions (`colorFade`, `src/lib/theme.ts:309-314`, README "gpuix gaps" preface), so nothing stops it. Not checked live.
- **Workaround:** none.
- **Fidelity:** dropped (the swap is a hard cut).
- **Components it hits:** every page.

## Theme and settings are not persisted

- **Cause:** `not ported yet`.
- **Original:** each setting is written to its own year-long cookie (`ff_theme`, `ff_shape`, `ff_size`, `ff_icons`, `ff_base`) and the root layout reads them back, so a reload paints the saved choice from the first frame (`lib/docs/settings-persistence.tsx`, `lib/docs/site-settings.ts:30-62`, `app/layout.tsx:58-69`).
- **Port:** `themeChoice` starts at `"system"` on every launch (`src/lib/theme.ts:191-192`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the shell.

## System theme follows the OS through different code

- **Cause:** `port choice` (the window has no `prefers-color-scheme`; the fork exposes `createAppearance`).
- **Original:** `color-scheme: light dark` plus `light-dark()` tokens; a `.light` / `.dark` class on `<html>` pins one (`app/globals.css:46-50, 184-225`).
- **Port:** both columns kept as a token table, resolved by the `scheme()` signal; `bindSystemScheme(createAppearance())` feeds "system", and `renderer.setAppearance(themeChoice())` makes the native chrome follow (`src/lib/theme.ts:82-182, 194-214`, `src/app.tsx:235-244`). Token values match the source in both columns (checked: surfaces 1 to 8, foreground, muted, accent, status, checker, hover, active, tint); `--ring` and `--input` have no port token.
- **Workaround:** n/a.
- **Fidelity:** exact in the window; see "The test renderer ignores window options and appearance" for captures.
- **Components it hits:** every component.

## Static font weights and no `opsz`

- **Cause:** `gpuix gap`. See the README row "Variable-font axes (`fontVariationSettings`)" and the "Inter variable" row.
- **Original:** Inter variable with semibold `wght 550 / opsz 18` and bold `wght 700 / opsz 25` (`registry/default/lib/font-weight.ts:25-29`, `app/globals.css:6-18`).
- **Port:** static Inter cuts, semibold 600, no `opsz` (`src/lib/theme.ts:277-278`).
- **gpuix lacks:** variable-font axes.
- **Workaround:** nearest static weight.
- **Fidelity:** approximated.
- **Components it hits:** every component and page heading.

## Reduced motion is not honoured

- **Cause:** `not ported yet` (`MotionConfig reducedMotion="user"` exists in the fork, `~/code/fdarian/gpuix/FORK.md:831-832`; `grep MotionConfig src` is empty).
- **Original:** `<MotionConfig reducedMotion="user">` wraps the app, so transform, scale, position and layout animations drop while opacity and colour fades stay (`app/layout.tsx:73-77`).
- **Port:** every spring plays regardless of the OS setting.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every animated component.

## Page scroller and base styles

- **Cause:** `not ported yet` (unverified live; read from code only).
- **Original:** `scrollbar-gutter: stable`, `overscroll-behavior-y: none`, a thin overlay scrollbar ramp tinted by `--overlay`, grayscale font smoothing, balanced headings, inline-code chips, and a focus-ring fallback for natively focusable elements (`app/globals.css:296-345, 326-332, 896-945, 868-891`).
- **Port:** the page column is a plain `overflowY: "scroll"` div (`src/app.tsx:264-272`) without the scrollbar styling; no inline-code chip or prose styling exists (the shell has no prose).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every page.

## Site menu: no Recent group

- **Cause:** `not ported yet`.
- **Original:** the last three pages opened through the menu are kept in `localStorage["ff:command-menu-recent"]`, read on open, and listed first under "Recent" while the field is empty, then dropped from their own group (`app/components/site-command-menu.tsx:51-53, 122-138, 170-188, 391`).
- **Port:** `CommandMenu` supports `suggestions` and `suggestionsLabel` (`src/components/command-menu.tsx:329-330`) but the site menu passes neither (`src/lib/site-command-menu.tsx:106`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the site menu.

## Site menu: no Actions tab or rows

- **Cause:** `not ported yet` (the browser-only actions need `window.open`, clipboard and a router; `port choice` for "Open on GitHub" is arguable, reason not stated).
- **Original:** a fourth tab "Actions" and an Actions group (`app/components/site-command-menu.tsx:83-88, 299-360`): "Copy install command" (only on a component page, description is the component name, keywords npx / shadcn / add / registry, writes `npx shadcn@latest add <url>` and toasts "Install command copied" after the write); "Previous page" and "Next page" (only when there is one, shortcut caps `←` / `→`, description "Go to the previous page"); "Open on GitHub" (description `mickadesign/fluid-functionalism`, keywords source / star / repository).
- **Port:** tabs All / Pages / Settings (`src/lib/site-command-menu.tsx:21-25`); no action rows.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the site menu.

## Site menu: Pages group has one row, no keywords or icons

- **Cause:** `not ported yet`.
- **Original:** Pages holds Showcase (home icon; keywords home / bento / gallery), Introduction (square-library; docs / getting started / install), Demo (play; slides / playground), Compare with shadcn (scaling; shadcn / side by side) (`app/components/site-command-menu.tsx:90-95, 195-205`).
- **Port:** Showcase only, with the home icon and no keywords (`src/lib/site-command-menu.tsx:81`). The other three have no page to go to; see "Pages not ported".
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the site menu.

## Site menu: no System group; Components rows lack badges and keywords

- **Cause:** `not ported yet` (System pages); the Components descriptors are also `not ported yet`.
- **Original:** a "System" group of the seven system pages (Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography), and Components rows with the description "New" or "Updated" and keywords of the slug plus every word of the component's description (`app/components/site-command-menu.tsx:206-225`, `lib/docs/components.ts:23-67`).
- **Port:** a Components group of the discovered demos, no description, no keywords, so the filter matches the title only (`src/lib/site-command-menu.tsx:82`). The port has 32 demos where the source lists 28 components; the extra four (file-thumbnail, mobile-drawer, queued-stack, scroll-area) are registry items the source has no sidebar row or menu row for.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just the site menu.

## Site menu: Settings has only Theme rows and no toast

- **Cause:** `not ported yet`.
- **Original:** Settings holds 3 Theme, 2 Radius, 2 Size, 5 Icons and 2 Primitive rows (14); a theme row reads "Theme: Follow system / Light / Dark", the action "Set theme to ...", description "Current" on the active one, icons monitor / sun / moon, keywords theme / appearance / mode; a pick toasts "Theme set to Light" (`app/components/site-command-menu.tsx:104-120, 227-298`).
- **Port:** only the three Theme rows, with the label "Theme: System" (the shared `THEMES` label, `src/lib/theme.ts:186`) instead of "Follow system", no toast (`src/lib/site-command-menu.tsx:83-95`).
- **Workaround:** none.
- **Fidelity:** dropped (11 rows); approximated (label).
- **Components it hits:** just the site menu.

## Site menu: dialog title and description, shortcut routing

- **Cause:** `not ported yet`.
- **Original:** `CommandMenuDialog` takes `title="Site menu"` and `description="Jump to a page or change a setting."` as the dialog's accessible name, and binds `shortcut="mod+k"` itself (`app/components/site-command-menu.tsx:385-390`, `registry/default/command-menu.tsx:1425-1540`).
- **Port:** the dialog has no title or description props (`src/components/command-menu.tsx:1290-1294`). A separate window listener toggles the menu (`src/lib/site-command-menu.tsx:49-60`); `isModK` matches Meta or Ctrl, no Alt, on `event.key` alone (`:42-46`). On Dvorak the key that types "t" does not open it: gpuix derives `code` from `key`, so there is no physical K to match (`scripts/check-command-menu.tsx` checks ⌘T and ⌘⌥K stay closed and ⌘K toggles; the layout itself needs a live check).
- **Workaround:** none.
- **Fidelity:** exact on macOS.
- **Components it hits:** just the site menu.

## Site menu: ⌘K has no physical-key fallback for non-Latin layouts off macOS

- **Cause:** `gpuix gap`.
- **Original:** `matchesShortcut` reads the physical key (`code`) when `key` is not a Latin letter or digit, so Ctrl+K opens the menu on a Cyrillic or Greek layout (`registry/default/command-menu.tsx:195-230`).
- **Port:** `isModK` reads `key` only (`src/lib/site-command-menu.tsx:42-46`).
- **gpuix lacks:** a physical key. `code` is "derived from GPUI's `key`, which is layout-dependent on every platform", so a Cyrillic key reports `code` `""` (`~/code/fdarian/gpuix/packages/native/src/events/key_names.rs:9-12`, `:138-160`). On macOS this does not bite: GPUI reports the layout's Cmd letter, so ⌘K works on Cyrillic, Armenian and Dvorak-QWERTY (`~/code/fdarian/gpuix/zed/crates/gpui_macos/src/events.rs:425-439`). On Windows and Linux, Ctrl plus a non-Latin letter does not match (README Missing features row "site menu (`isModK`)"). Not run there.
- **Workaround:** none; the sidebar's Search row opens the menu.
- **Fidelity:** exact on macOS; dropped for non-Latin layouts on Windows and Linux.
- **Components it hits:** just the site menu.
## Pages not ported: home bento grid and the home hero

- **Cause:** `not ported yet`. The bento grid is previews of the live components; the port's Showcase is a card per demo.
- **Original:** `/` is the hero (h1 bold, tagline, a "Copy install prompt" button that copies the starter prompt with the visitor's settings, "Learn more" to `/docs`, "See demo" to `/demo`, and prev / next arrows) over a `BentoGrid` of one `BentoCard` per component, sized large / medium / small, each with a live preview from `previewMap` and a `PlaygroundMenu` pen (`app/page.tsx:12-62`, `app/components/bento-grid.tsx`, `bento-card.tsx`, `bento-previews.tsx` (916 lines), `starter-install.tsx`).
- **Port:** the hero has the same three buttons. "Copy install prompt" writes the source's starter prompt for the port's settings (Base UI, rounded, default size, Lucide icons, the current theme; `src/lib/starter-prompt.ts`) and its icon turns into a check for 2 s, without the crossfade (`src/app.tsx:116-130`). The source's "Learn more" and "See demo" go to `/docs` and `/demo`, which are not ported, so they open those pages of fluidfunctionalism.com in the default browser through `open` / `xdg-open` (`src/lib/open-url.ts`; gpuix has no link opener). No arrows. Below it 144x72 text-only cards, one per demo, that open the page on click (`src/app.tsx:141-185`).
- **Workaround:** none.
- **Fidelity:** dropped (previews, sizes, playground menus).
- **Components it hits:** just the home page.

## Pages not ported: Introduction and the system pages

- **Cause:** `not ported yet`.
- **Original:** `/docs` (Introduction: three principle sections, an `InputCopy` install line, arrows) and the system pages `/docs/fluid-hover`, `/docs/motion`, `/docs/scrollbars`, `/docs/sizes`, `/docs/surfaces`, `/docs/typography`, `/docs/skill` (`app/docs/page.tsx`, `app/docs/<slug>/page.tsx`, 188 to 1413 lines each; `lib/docs/components.ts:23-31, 69-80`).
- **Port:** none. The behaviours exist as shared libs (`src/lib/fluid-hover.ts`, `src/lib/fluid-highlight.tsx`, `src/lib/theme.ts` surfaces) with no page that documents them.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none directly.

## Pages not ported: /demo, /compare, /compare-bases

- **Cause:** `not ported yet` for /demo and /compare; `port choice` for /compare-bases (the port ships Base UI only; reason not stated, and the Radix registry is not ported).
- **Original:** `/demo` is a slide presentation of every component plus a settings slide, with a `?c=<slug>` param (`app/demo/page.tsx:1-349`); `/compare` puts each component beside its shadcn equivalent in the demo slide order (`app/compare/page.tsx`, `app/components/shadcn-previews.tsx`, `compare-fluid-previews.tsx`, `app/compare/shadcn-theme.css`); `/compare-bases` shows the Radix and Base UI builds side by side (`app/compare-bases/page.tsx`). All three are full-screen (no sidebar or right panel, `app/components/sidebar-layout.tsx:111-115`).
- **Port:** none.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none directly.

## Pages not ported: /concepts, /slider, /table, /stars

- **Cause:** `not ported yet`.
- **Original:** `/concepts` is an unlisted index (noindex) with four full-screen app mockups `/concepts/lumen`, `atlas`, `beacon`, `quill` built from the chat-message, input-message and thinking-indicator components and a `NavMenu` (`app/concepts/`); `/slider` is a mixer / EQ playground built from sliders (`app/slider/page.tsx`); `/table` is a quotes table with `TabsSubtle` filters (`app/table/page.tsx`); `/stars` is a hidden easter egg that rasterises the live star count into a field of switches (`app/stars/`, `app/api/stars/route.ts`). `/slider`, `/table` and `/stars` are separate from `/docs/slider` and `/docs/table`; `/concepts` and `/stars` are full-screen.
- **Port:** none.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none directly.

## Pages not ported: 404

- **Cause:** `not ported yet` (a desktop app has no unknown route, so it has no use today).
- **Original:** `not-found.tsx`: a large "404" whose zero springs into line on hover or focus, "A little out of place.", "We couldn't find this page." and a tertiary "Back to showcase" button; the right panel is hidden on it (`app/not-found.tsx:1-74`, `app/components/sidebar-layout.tsx:184`).
- **Port:** `App` shows nothing for an unknown page: the `Switch` has no fallback (`src/app.tsx:286-292`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none.

## Web-only routes and metadata

- **Cause:** `port choice` (a desktop window has no URL, crawler, CLI registry or analytics; reason not stated).
- **Original:** registry endpoints `app/r/preset/[code]`, `app/r/setup/[slug]`, `app/r/starter/[slug]` that `npx shadcn` fetches; `app/api/stars` (cached GitHub star count); `robots.ts`, `sitemap.ts`; `middleware.ts` counting registry fetches; Vercel Analytics and Speed Insights; the title, description, favicons, manifest and Open Graph image (`app/layout.tsx:20-46, 89-90`).
- **Port:** none; the window title is the only metadata (`src/app.tsx:46`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** none.

## Registry items with no port

- **Cause:** `not ported yet` for each item below, unless stated.
- **Original:** every component in `registry/base` and `registry/default` has a port except: `nav-item.tsx` and `nav-menu.tsx` (only the `/concepts` index uses them, `app/concepts/page.tsx:4-5`); and the blocks `sidebar-workspace-header`, `sidebar-user-footer`, `dialog-sidebar/settings-dialog`, and the `sidebar-app` composition (`app-sidebar`, `inset-topbar`, `nav-data`, `page`) (`registry/blocks/`). `search-field` is ported (`src/components/sidebar.tsx:547`); check `drift/sidebar.md` for the blocks. Ported as part of another file rather than on their own: `dropdown-sub` inside `src/components/dropdown.tsx` and `menu-item.tsx`; `fluid-hover-highlight` as `src/lib/fluid-highlight.tsx`; `sidebar-core` and `sidebar-menu` inside `src/components/sidebar.tsx`; `scroll-area` and `queued-stack` have their own files.
- **Port:** none for the items above. The `registry/radix` flavour of all 17 dual-flavour components is not ported on purpose (`port choice`; the port is Base UI only, see `BASE-UI-AUDIT.md`), and the registry lib items `elevated`, `surface-classes`, `shape-context`, `size-context`, `icon-context` and the four extra icon libraries, `typography` and `type-scale` have no port beyond the tokens in `src/lib/theme.ts`.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** the sidebar demo (blocks), none for the rest.
