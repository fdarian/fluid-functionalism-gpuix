# sidebar

Original: `registry/base/sidebar.tsx` over `registry/default/sidebar-core.tsx` and `sidebar-menu.tsx` (plus the older `nav-menu.tsx` / `nav-item.tsx` and `registry/blocks/sidebar-*`), demo in `app/docs/sidebar/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/sidebar.tsx`, demo in `src/demos/sidebar.tsx`.
The site's own navigation sidebar is covered at the end: source `app/components/sidebar.tsx` and `sidebar-layout.tsx`, port `NavGroup` and `AppSidebar` in `src/app.tsx:102-254`. That section reads the live site (fluidfunctionalism.com at d5c3606: it has the Changelog page and the release-driven New dots, which 0a0377e predates), so its source `file:line` refs are d5c3606's.

The port is the menu only: `SidebarMenu` (one fluid-hover scope with a hover, an active-per-level and a focus-ring overlay), `SidebarMenuButton` (`label`, `icon`, `dot`, `badge`, `trailingIcon`), `SidebarMenuSub`, and a fixed 256px `Sidebar` with `SidebarHeader`, `SidebarContent`, `SidebarGroupLabel` and `SidebarSearchField`. Everything else in the source is absent. Numbers that match (row 32 / sub-row 28 / label 32 high, 8px gap and left pad, radius 8, 16px icons, sub-menu `ml 15 + 1px border + pl 8`, badge slot 24 at right 8 with a 36px reserved pad, 256px width, header `p 8 gap 8`, hover / active tokens) are not listed.

Shared gpuix gaps that hit this component, each in its README row and not repeated here: [CSS transforms](../README.md) (the sub-menu chevron, the mobile sheet slide, the peek card), [`createMeasuredHeight`](../README.md) (the sub-menu height tween runs on `onLayout`, `src/components/sidebar.tsx:532`).

## Collapse, `SidebarProvider`, shell, trigger and shortcut

- **Cause:** `not ported yet`.
- **Original:** `SidebarProvider` owns open / mobile state, the `[` / `]` toggle key (`sidebar-core.tsx:47,208-290`), the `sidebar_state` cookie (`:43`) and a controllable width. `SidebarShell` springs the column's width to 0 on `spring.slow` while the panel slides out (`:556-760`, `peek="hover" | "click"` edge strip and floating card at `:600-690`). `SidebarTrigger` is a ghost icon button with an "Expand / Collapse sidebar" tooltip and the key chip (`:908-995`).
- **Port:** none. `Sidebar` is a fixed `SIDEBAR_WIDTH = 256` column (`src/components/sidebar.tsx:51,549-570`) with no open state, no key, no trigger, no peek.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Rail: drag to resize, click to collapse

- **Cause:** `not ported yet`.
- **Original:** `SidebarRail` on the inner edge: drag clamps to 160-360px, dragging 56px past the minimum previews the collapse and drag-back re-expands, a click collapses, a `Tooltip` explains it, the edge hairline brightens on hover (`sidebar-core.tsx:1001-1130`, constants `:50-55`). `Sidebar` renders it by default (`rail`, `railTooltipOpen`, `registry/base/sidebar.tsx:168-172`).
- **Port:** none. README lists "rail resize" as not ported.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Mobile drawer (`SidebarSheet`)

- **Cause:** `port choice` (the plan scoped it out, `../base-ui-solid-gpuix/BASE-UI-AUDIT.md:662`; the app is a fixed desktop window, which the README does not state as the reason).
- **Original:** below `mobileBreakpoint` (768) the desktop shell fades out and `SidebarSheet` mounts: a Base UI Dialog sliding in on `spring.moderate`, scrim `bg-black/40` (`/80` dark), `initialFocus` on the panel, exit held until the spring lands, reduced motion drops the slide (`registry/base/sidebar.tsx:57-149`, `sidebar-core.tsx:512-540`).
- **Port:** none; no breakpoint, no sheet, `openMobile` does not exist.
- **Workaround:** none. `mobile-drawer` is a separate component with its own drift file.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Variants, side and the inner-edge border

- **Cause:** `not ported yet`.
- **Original:** `variant="sidebar" | "floating" | "inset"` (floating is a rounded `surface-3` card in a `p-2` gutter, inset a `py-2` rail beside a rounded `SidebarInset`), `side="left" | "right"` (mirrors the rail, key and slide), `collapsible="none"`, and `bordered` (default: a 1px `border-border` on the inner edge) (`registry/base/sidebar.tsx:157-263`, `sidebar-core.tsx:760-905`, `:1132-1160`).
- **Port:** one layout: left, no border, `color.background` fill, optional `leftCornerRadius` for the app frame (`src/components/sidebar.tsx:551-572`). The site's own sidebar uses `bordered={false}` (`app/components/sidebar.tsx:90`), so the borderless look matches the site but not the docs' default `Sidebar` layout.
- **Workaround:** none.
- **Fidelity:** dropped for floating, inset and right; approximated for the default (no border).
- **Components it hits:** just this one.

## Parts that are not ported

- **Cause:** `not ported yet`.
- **Original:** `SidebarInset` (`sidebar-core.tsx:1132`), `SidebarSeparator` (`:1221`), `SidebarGroup` (`p-2` wrapper, `collapsible` accordion with `open` / `defaultOpen` / `onOpenChange`, measured-height collapse, label turns into a toggle with a hover-revealed chevron on `spring.fast`, `:1258-1417,1419-1520`), `SidebarGroupAction` / `SidebarGroupActions` (24px icon buttons overlaid on the label row, up to 3, `:1558-1650`), `SidebarGroupContent`, `SidebarMenuItem` / `SidebarMenuSubItem` (the `li` rows), `SidebarMenuAction` / `SidebarMenuActions` (`showOnHover`, `sidebar-menu.tsx:1089-1260`), `SidebarMenuSkeleton` (pulsing placeholder rows, `sidebar-menu.tsx:1266`), `SidebarMenuSubButton` as its own part with `size sm | md`.
- **Port:** the menu button, sub-menu, group label and the header / content / footer frame only (`src/components/sidebar.tsx`); `SidebarFooter` is `p 8 gap 8` without the source's `mt-auto` (the content column grows, so it lands at the bottom anyway). Item and sub-item are folded into `SidebarMenuButton` (`level={1}`), the badge into its `badge` prop.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Row actions and the trailing gutter

- **Cause:** `not ported yet`.
- **Original:** actions sit at `right-1.5` (left of a badge at `right-8.5`), reveal on the row's own button hover or focus, and the row reserves `rowGutter(actionCount, hasBadge)` of right padding that widens on reveal (`sidebar-menu.tsx:733-760,904`). Hover tracking freezes while an action popup is open (`:363`).
- **Port:** a fixed right pad: 8px, or 36px when a badge is set (`src/components/sidebar.tsx:353-354`). No actions, no gutter maths, no popup freeze.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Row sizes and the outline variant

- **Cause:** `not ported yet`.
- **Original:** `SidebarMenuButton size="default" | "sm" | "lg"` (32 or 28 compact, 28, 48), `variant="outline"` (1px border, `bg-background`), `SidebarMenu size="default" | "compact"` follows the `SizeProvider` (`sidebar-menu.tsx:935-1010`, `:1279`). `sm` also drops the label to the compact body step.
- **Port:** two fixed heights from level: `height.menuRow` 32 and `height.menuSubRow` 28 (`src/components/sidebar.tsx:352`); text always `scale.body` (13/20). No compact ladder, no `lg`, no outline.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Status dot and the `dot` prop

- **Cause:** `not ported yet`.
- **Original:** `status="active" | "unread" | "idle"` leads the row with a filled or ringed 8px dot in the icon column (`bg-foreground/60` lit, `bg-muted-foreground/50` at rest), stamps `data-status`, adds visually-hidden ", unread", and `active` implies `isActive`; `dot="filled" | "ring"` is the visual-only escape hatch (`sidebar-menu.tsx:898-1042`). The site's New dot is a separate 6px trailing span the page composes as a child, in the changelog's `KIND_DOT.new` (`bg-[var(--info)]`) with an `sr-only` "New" (`app/components/sidebar.tsx:28-38`).
- **Port:** only the trailing 6px dot, and it is the `dot` prop (a colour string) with `dotLabel`, which the dot carries as `role="img"` and `aria-label` in place of the `sr-only` span (`src/components/sidebar.tsx:297-299,427-441`). The site nav passes `kindDotColor("new")`, the same `info` token (`src/app.tsx:193-194`). The prop name means the opposite of the source's `dot`, and the leading status dots do not exist.
- **Workaround:** none.
- **Fidelity:** exact for the site's trailing dot (same 6px, same gap, label hugs the text); dropped for `status`.
- **Components it hits:** just this one.

## Semantics and `aria-current`

- **Cause:** `not ported yet`.
- **Original:** `ul` / `li` lists with `aria-label` on each menu ("Main navigation", "System navigation", ...), the row is a `button` (or `a` through `render`), `aria-current="page"` only while active (the attribute is absent otherwise), sub-menu `aria-hidden` and `data-state` while closed (`sidebar-menu.tsx:1062,1385`, `app/components/sidebar.tsx:75,99`).
- **Port:** a `div` with `buttonProps` (role `button`) and `aria-current="page"` only while active, absent otherwise (`src/components/sidebar.tsx:359-377`). No `aria-label` on menus, no list roles, a collapsed sub-menu stays in the tree (its rows are `disabled`: skipped by hover, Tab, the arrows and activation, but still exposed to assistive tech).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Disabled rows

- **Cause:** `not ported yet`.
- **Original:** a disabled row stays in the layout at `opacity-50`, never lights, never takes a click and is skipped by the keyboard (`sidebar-menu.tsx:109-120,904`).
- **Port:** `disabled` is a function the sub-menu uses for its collapsed rows (`src/components/sidebar.tsx:306,327`). It takes the row out of the hover, the tab stops, the arrow order, and blocks click, Enter and Space (a pointer cannot reach a collapsed row anyway: the sub-menu's `overflow: hidden` clips its hit area). It adds no dimming, and a public disabled row does not exist.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## A click between rows lands on the highlighted row (`gapClick`)

- **Cause:** `not ported yet`.
- **Original:** the container's `onClick` is the fluid-hover handler: a click on the gutter, the sub-menu's `ml-15` strip or any padding presses the row the highlight sits on (`sidebar-menu.tsx:568`, `use-fluid-hover`).
- **Port:** the container wires `containerProps` (enter / move / leave only), so a click off a row does nothing (`src/components/sidebar.tsx:245`, `src/lib/fluid-hover.ts:277-284`). The hover can still sit on a row while the click falls through.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every fluid-hover list (README lists `gapClick` as not ported).

## Label truncation

- **Cause:** `not ported yet` (the dotted row).
- **Original:** the label and its ghost both `truncate`, so a long label ends in an ellipsis and never wraps the row (`sidebar-menu.tsx:864-885`).
- **Port:** `SidebarMenuButton` passes `truncate` to `StableLabel` (an optional prop added for it: the label's grid is one `minmax(0, 1fr)` column inside a `minWidth: 0` wrapper, and all three cells are `nowrap`, `overflow: hidden` and `textOverflow: "ellipsis"`), so a long thread title ends in an ellipsis before the badge (`src/components/sidebar.tsx`, `src/lib/stable-label.tsx`). A row with a `dot` hugs its text and does not truncate. Every other `StableLabel` user wraps its label inside the inline-grid like the source's `inline-grid` span, and takes `nowrap` where the source's labels never wrap (tabs, tabs-subtle).
- **Workaround:** none.
- **Fidelity:** exact for a plain or badged row; dropped for a dotted row (it hugs its text and does not truncate).
- **Components it hits:** just this one.

## Badge: `pointer-events-none`

- **Cause:** `port choice` (decorative `pointerEvents: none` was dropped on purpose, see the README).
- **Original:** the badge is `pointer-events-none`, its digits `tabular-nums` (`sidebar-menu.tsx:1239`).
- **Port:** the digits are tabular too (`src/components/sidebar.tsx:452-486`); the badge box is a normal hit target (the README says decorative `pointerEvents: none` was dropped on purpose).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Highlight opacity fade is the position spring, not an 80 ms tween

- **Cause:** `not ported yet`.
- **Original:** the hover highlight keeps its positional spring but fades on `{ duration: 0.08 }` (`fluid-hover-highlight.tsx:resolveHighlightTransition`); the active background moves on `spring.moderate` with `opacity: { duration: 0.08 }` (`sidebar-menu.tsx:520-524`). Reduced motion keeps the fade and drops the travel.
- **Port:** `FluidHighlight` passes one transition for both position and opacity (`src/lib/fluid-highlight.tsx:58-62,87`), so the fade runs on the spring (0.08 s hover, 0.16 s active). gpuix accepts per-property transitions (`MotionTransition` `{ [prop]: curve }`, `packages/native/js/host.ts:304-308`).
- **Workaround:** none.
- **Fidelity:** approximated (the fade is about the same length for hover, twice as long for the active background).
- **Components it hits:** every `FluidHighlight` user.

## One active background per level

- **Cause:** `port choice` (reason not stated).
- **Original:** every active row gets a background, keyed by level and occurrence, so two active rows in one sub-menu both light (`sidebar-menu.tsx:462-476`), at any nesting depth; the key survives a move so it glides.
- **Port:** exactly two overlays, level 0 and level 1, each on the first active row of its level (`src/components/sidebar.tsx:217-232,254-281`). `level` is typed `0 | 1`; a deeper tree has no overlay.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Sub-menu chevron

- **Cause:** `gpuix gap` (CSS transforms, linked: [README row](../README.md); same drift as `drift/accordion.md`).
- **Original:** the page composes one `chevron-right` in a 24px slot and turns it 90 degrees on `spring.fast`; while the parent is open the chevron is hidden at rest and returns on row hover or focus (`app/docs/sidebar/page.tsx:nestingCode`).
- **Port:** `trailingIcon` swaps `chevron-down` / `chevron-right` at once and always shows it (`src/components/sidebar.tsx:442-450`, `src/demos/sidebar.tsx:98-100`).
- **gpuix lacks:** transforms on SVG icons outside a `TransformationMatrix` sprite (`~/code/fdarian/gpuix/FORK.md:1198-1209`).
- **Workaround:** swap the glyph; no hover-reveal.
- **Fidelity:** approximated.
- **Components it hits:** accordion, card, color-picker.

## Group label: the library label is not the site's header

- **Cause:** `port choice` (the site's header is built in the app, as `NavGroup`; the library `SidebarGroupLabel` keeps its own plainer look).
- **Original:** the site's count is a `h-5 min-w-5 px-1` centred box in the label row, `tabular-nums`, `text-site-caption` (12/16), so its digits share the badge column (centre 18px from the right edge); the name is `text-foreground`; a `h-px bg-border` hairline (`ml-2 mr-3 mb-1`) sits under both, and a labelled `SidebarGroup` is `p-2 pt-4`, so groups are 16px apart below the first (`app/components/sidebar.tsx:55-74`).
- **Port:** the site nav is exact: `NavGroup` has the foreground name, the 20px count box, the hairline and the 16px top padding (`src/app.tsx:102-178`). The library `SidebarGroupLabel` (the demo page's) keeps its `count` prop as a bare `caption` text right-aligned at 8px, so a two-digit count ends 4px right of the badge column; it has no hairline, and its groups touch (`src/components/sidebar.tsx:641-672`).
- **Workaround:** none.
- **Fidelity:** exact in the site nav; approximated in the library label.
- **Components it hits:** just this one.

## Search field (`SidebarInput` + search block)

- **Cause:** `not ported yet`.
- **Original:** `SidebarInput` is `h-8` (`h-7` compact), `px-3`, `bg-transparent` with `ring-1 ring-transparent`; hover `bg-muted/50` + `ring-border`; focus `bg-card` + `ring-border`; and `focus-visible:ring-[--focus-ring]` (a text input matches `:focus-visible` on any focus, so a focused field shows the blue ring). Fill and ring ease over 80 ms (`sidebar-core.tsx:1165-1195`). The block adds the icon at `left-2`, `pl-8 pr-12`, `aria-label="Search"`, default placeholder `Search…` and a chip `⌘K` that fades in on hover or focus over 80 ms, or `shortcut={null}` to drop it (`registry/blocks/sidebar-app/search-field.tsx`).
- **Port:** hover fill `mutedHalf`, focus fill `card`, and the outline is `color.border` for both hover and focus, never the focus-ring colour (`src/components/sidebar.tsx:675-755`). Fill, outline and chip ease over 80 ms (the outline stands in for the source's `ring-1` box shadow). No `aria-label`; the demo passes `placeholder="Search"` without the ellipsis (`src/demos/sidebar.tsx:73`); the chip cannot be dropped (`shortcut` is required). Size is fixed at 32 (`height.menuRow`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Content scroller: the start hairline is never drawn

- **Cause:** `not ported yet`.
- **Original:** `SidebarContent` is a `ScrollArea` with `scroll-fade` (48px edge mask) and `scroll-divider` hairlines inset 8px at the top and bottom edges while there is more to scroll (`registry/base/sidebar.tsx:276-304`, `app/globals.css:1128-1196`). `.scroll-divider:first-child::before` hides the top one when nothing sits above the scroller, which is the site nav's case (its Search row scrolls inside it) but not a sidebar with a `SidebarHeader` over its content (`app/globals.css:1184`).
- **Port:** `SidebarContent` is a `ScrollArea` with `fade` and `divider={{ start: false }}`: the 48px fade follows the scroll, and the end hairline fades in over the last 48px (`src/components/sidebar.tsx:612-639`). The start hairline is dropped for every use, so the demo page's sidebar, which has a header above its content, lacks the top one the source draws there. The site nav matches the source, Search row inside the scroller (`src/app.tsx:206-218`).
- **Workaround:** none.
- **Fidelity:** exact for the site nav; approximated for the demo's sidebar.
- **Components it hits:** just this one.

## Demo: which variants exist

- **Cause:** `not ported yet`.
- **Original:** the docs page (`app/docs/sidebar/page.tsx:1836-1992`) has: Playground (provider / sidebar / layout options), Layouts (sidebar, floating, inset, each a 640px shell with a `SidebarInset` beside it), Nesting (two levels, one section level and one parent level), Actions and badges (up to 3 actions, `showOnHover`), Header and footer (vertical and horizontal stacking), Callouts (stacked inlines and banners), Resize / collapse / peek (on hover, on click, with the rail tooltip pinned), Inside a dialog (`collapsible="none"` in a settings dialog), No icon rail version (scripted icon-rail vs peek comparison), Functional and perfectly aligned (alignment guides), and five API reference tables.
- **Port:** two cards. The Playground (see "Playground" below) covers Nesting, badges, Header and footer stacking and Callouts. The "Sidebar" card keeps the site-nav sample: a search field, a flat `Showcase` row, a "System" group of four rows, a "Components" group with a collapsible "Button" row (`Variants`, `Sizes`, `Icons`) (`src/demos/sidebar.tsx`). Scenarios: the playground's controls, then hover, hover over a label, sub-menu, sub-menu collapsed, keyboard focus. `scripts/check-sidebar.tsx` also checks Tab, the arrows, Enter, Space, `aria-current` and the collapsed rows. Not ported as their own sections: Layouts, Actions (the actions need `SidebarMenuAction`), Resize / collapse / peek, Inside a dialog, the icon-rail comparison, the alignment guides, the API tables.
- **Workaround:** none.
- **Fidelity:** dropped for every section but Nesting, badges, Header and footer and Callouts.
- **Components it hits:** just this one.

## Playground

- **Cause:** `not ported yet` (the controls below), `port choice` (the preview shell).
- **Original:** `lib/docs/playgrounds/sidebar.tsx`: Layout (Design, Collapsed behavior, State), Header (Primary element, Stacking, Header actions), Sections (Collapsible, Section actions), Content level 1 (Primary element, Has children, Actions, Badges), Content level 2 (Leading icon, Actions, Badges), Footer (Primary element, Stacking, Footer actions, Callout, Stacked), a "Get code" dialog and a generated snippet.
- **Port:** the controls with a part behind them: Header Stacking and Header actions, Content level 1 Primary element / Has children / Badges, Content level 2 Leading icon / Badges, Footer Stacking / Footer actions / Callout / Stacked, with the source's defaults, disabled rules (threads do not nest, level 2 needs children, Stacked needs a callout) and shuffle odds (`src/demos/sidebar/playground.tsx`). **Left out:** Design (floating / inset / sidebar: no `variant`), Collapsed behavior (no peek), State (no open state, no `SidebarMenuSkeleton` for Loading), Header Primary element (no workspace-header block), Sections Collapsible and Section actions (no `SidebarGroup` / `SidebarGroupAction`), Content level 1 and 2 Actions (no `SidebarMenuAction`), Footer Primary element (no user-footer block), Get code, the snippet. Also differs: the shell is always the inset look, drawn in the demo as the rail beside a plain rounded `surface(2)` div (no `SidebarInset`, no trigger in a topbar, no shadow); the frame is a fixed 520px tall (source: the stage's height); the thread rows have no leading status dot (no `status`, see "Status dot"); the vertical header's action rows have no hover-revealed shortcut chip and the horizontal buttons' tooltips no shortcut; a parent row's chevron swaps glyphs and never hides at rest (see "Sub-menu chevron"); no tooltips on the footer rows; the sub-menu is not removed from the tree while collapsed (clipped to 0 height).
- **Callout:** `Card size="compact" dismissible` on a `surface(2)` wrapper (`src/demos/sidebar/callout.tsx`). Differs from the source's card: no `href` (it is a no-op `onClick` so the card still lights), no `surfaceHoverClasses` rise or inset-shadow ring (a flat `surface(2)` fill; the banner card lights with the card's own hover fill, the inline card, inside a `CardGroup` with its hover off, does not light at all), the inline tile has no brand-blue tint or glyph colour, the inline card is 12px left padded (source 10) with a 60px floor (source `min-h-0`), the title / description gap is 4 (source 2), and the banner mesh is rebuilt from the card demo's data URI with scaled opacities. The stacked pile follows the source geometry (peek 12, scale 0.05, gap 4, two peeks) with `bottom` offsets and box insets standing in for `y` and `scale`, so a receding card keeps its full-size contents and its visible strip is the top of the card.
- **Workaround:** none.
- **Fidelity:** approximated for the controls ported, dropped for those left out.
- **Components it hits:** just this one.

## Demo: frame and data

- **Cause:** `port choice` (reason not stated; the data is the site's nav rather than the docs page's "Aurora AI" product).
- **Original:** each preview is a full shell (sidebar and `SidebarInset` content) 640px tall (560 on a phone), `bg-background`, workspace header with a switcher, a user footer with a dropdown, rows with icons (`app/docs/sidebar/page.tsx:SHELL_HEIGHT`, `example-data.ts`: Chat, Agents, Knowledge, Runs, Evals, with sub-rows and badges).
- **Port:** the sidebar alone in a 480px-tall `shape.container`-radius box inside a `DemoCard` (`src/demos/sidebar.tsx`), no inset content, no header brand row, no footer, icon-less rows, no badges (the `badge` prop is demoed only by the Playground). The dots are the site nav's of 0a0377e: blue is a fixed `#3B82F6` (`bg-blue-500`), the other is `color.warning` (`var(--warning)`), read per paint so it follows the theme. The live nav's New dot is the one `info` token, which the demo does not use.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Blocks: workspace header, user footer, app sidebar, inset top bar, settings dialog

- **Cause:** `not ported yet`.
- **Original:** `registry/blocks/sidebar-workspace-header.tsx` (brand row with a workspace dropdown, tile / trigger cross-fade while peeking), `sidebar-user-footer.tsx` (avatar row, dropdown opening upward on the shared grid), `sidebar-app/*` (`AppSidebar`, `nav-data.ts` Platform / Workspace, `inset-topbar.tsx`, `page.tsx`), `dialog-sidebar/settings-dialog.tsx` (a dialog with the sidebar inside, a Select under `sm`). Only the search-field block is ported (folded in as `SidebarSearchField`). The dropdown's `side="top"` is also absent (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md:398`; `drift/dialog.md` for the settings dialog).
- **Port:** none of the others.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** dropdown, dialog.

## `nav-menu` and `nav-item`

- **Cause:** `not ported yet`.
- **Original:** `registry/default/nav-menu.tsx` + `nav-item.tsx`: the predecessor of the sidebar menu. One fluid-hover `nav` with an active-route background keyed by `activeSlug`, a traveling focus ring, arrow / Home / End keys and a roving tabindex; `NavItem` is a `Link` with `isNew` / `isUpdated` dots (`nav-menu.tsx:48-217`, `nav-item.tsx:24-131`). The site no longer uses them (the sidebar replaced them; only the bento and concepts pages mention "NavMenu").
- **Port:** not ported; the sidebar menu is the one fluid nav.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

# The site's own navigation sidebar

## Pages and groups

- **Cause:** `port choice` (the port has four more demos than the source has components, and keeps them out of the nav).
- **Original:** Search, then Showcase, Introduction and Changelog, then a "System" group (Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography) and a "Components" group of 28, each with a count; the labels are the component names (`app/components/sidebar.tsx:99-141`, `lib/docs/components.ts`).
- **Port:** the same rows in the same order: Search, the "Pages" modules listed `"sidebar"` (Showcase, then Introduction and Changelog by `order`), "System" with 7 and "Components" with 28, the demos listed `"sidebar"`, labelled with their titles, which are the component names as written in code. The four port-only demos, file-thumbnail, mobile-drawer, queued-stack and scroll-area, are listed `"menu"`: in the site menu, absent from the nav, the count and the prev / next order. The Compare, Audio Mixer and Concepts pages have no row, as in the source (`src/app.tsx:180-254`, `src/lib/page-nav.ts:5-23`; `drift/site.md`).
- **Workaround:** none.
- **Fidelity:** exact for the nav; approximated overall (four demos are reachable from the site menu only).
- **Components it hits:** just this one.

## Rail frame: margin, fill, corners

- **Cause:** `port choice` (the sidebar sits inside the app frame's rounded panel; reason for the fill not stated).
- **Original:** `Sidebar className="ml-2"`, `rail={false}`, no fill of its own, sticky `h-svh`, content `py-2` (`app/components/sidebar.tsx:98-99`).
- **Port:** no left margin; the column paints `color.background` and takes `leftCornerRadius={PANEL_INNER_RADIUS}` (9) so the fill follows the panel's corner (`src/app.tsx:205`, `src/components/sidebar.tsx:551-572`); content padding is `py-2` as the source's, made of the content's 8px sides and bottom and an 8px spacer above the first group (`src/app.tsx:208`). The column is a sibling of the page scroller, not inside it, so it needs no `sticky h-svh` to stay put.
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** app frame.

## Collapse, reopen trigger, `[` toast, persistence

- **Cause:** `not ported yet`.
- **Original:** `SidebarLayout` runs `SidebarProvider` with the cookie-read `defaultOpen`; `[` collapses and a `showShortcutToast("[", "Sidebar expanded" | "Sidebar collapsed")` follows a key-driven change; a `DesktopReopenTrigger` fades in at the top-left (opacity and scale 0.95 on `spring.fast`) with its own tooltip; the page's `SidebarInset` reflows (`app/components/sidebar-layout.tsx:31-90,184-198`).
- **Port:** the sidebar is always open at 256px; no key, no toast, no trigger, no persistence (`src/app.tsx:518-700`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** app frame.

## Mobile sheet and its "Make them yours" footer

- **Cause:** `port choice` (reason not stated; the app is a desktop window, so the breakpoint is never crossed).
- **Original:** below 1280 the sidebar is a drawer opened by a fixed top-left `SidebarTrigger` ("Open navigation"), closing on route change, with a footer holding "Make them yours" (title, GitHub star button, settings) (`app/components/sidebar.tsx:143-160`, `sidebar-layout.tsx:93-102,184-196`).
- **Port:** none; "Make them yours" is the right-hand `CustomizeCard` with a Theme select only (`src/app.tsx:397-516`, mounted at `:672`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** app frame.

## Left / Right arrows page through the docs

- **Cause:** `not ported yet`. Same drift as [site.md, "Arrow keys do not step through the pages"](site.md#arrow-keys-do-not-step-through-the-pages), where the entry lives (verified: the port's only key handler is ⌘K, `src/lib/site-command-menu.tsx:69-76`).
