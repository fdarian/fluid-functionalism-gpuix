# sidebar

Original: `registry/base/sidebar.tsx` over `registry/default/sidebar-core.tsx` and `sidebar-menu.tsx` (plus the older `nav-menu.tsx` / `nav-item.tsx` and `registry/blocks/sidebar-*`), demo in `app/docs/sidebar/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/sidebar.tsx`, demo in `src/demos/sidebar.tsx`.
The site's own navigation sidebar is covered at the end: source `app/components/sidebar.tsx` and `sidebar-layout.tsx`, port `AppSidebar` in `src/app.tsx:86`.

The port is the menu only: `SidebarMenu` (one fluid-hover scope with a hover, an active-per-level and no focus overlay), `SidebarMenuButton` (`label`, `icon`, `dot`, `badge`, `trailingIcon`), `SidebarMenuSub`, and a fixed 256px `Sidebar` with `SidebarHeader`, `SidebarContent`, `SidebarGroupLabel` and `SidebarSearchField`. Everything else in the source is absent. Numbers that match (row 32 / sub-row 28 / label 32 high, 8px gap and left pad, radius 8, 16px icons, sub-menu `ml 15 + 1px border + pl 8`, badge slot 24 at right 8 with a 36px reserved pad, 256px width, header `p 8 gap 8`, hover / active tokens) are not listed.

Shared gpuix gaps that hit this component, each in its README row and not repeated here: [CSS transforms](../README.md) (the sub-menu chevron, the mobile sheet slide, the peek card), [variable-font axes](../README.md) (the label and badge weight shift from 400 to 550 is a switch to Inter SemiBold 600, at once), [`text-box-trim`](../README.md) (rows are centred by their line box), [`createMeasuredHeight`](../README.md) (the sub-menu height tween runs on `onLayout`, `src/components/sidebar.tsx:286`).

## Collapse, `SidebarProvider`, shell, trigger and shortcut

- **Cause:** `not ported yet`.
- **Original:** `SidebarProvider` owns open / mobile state, the `[` / `]` toggle key (`sidebar-core.tsx:47,208-290`), the `sidebar_state` cookie (`:43`) and a controllable width. `SidebarShell` springs the column's width to 0 on `spring.slow` while the panel slides out (`:556-760`, `peek="hover" | "click"` edge strip and floating card at `:600-690`). `SidebarTrigger` is a ghost icon button with an "Expand / Collapse sidebar" tooltip and the key chip (`:908-995`).
- **Port:** none. `Sidebar` is a fixed `SIDEBAR_WIDTH = 256` column (`src/components/sidebar.tsx:20,332-350`) with no open state, no key, no trigger, no peek.
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

- **Cause:** `port choice` (the plan scoped it out, `BASE-UI-AUDIT.md:651`; the app is a fixed desktop window, which the README does not state as the reason).
- **Original:** below `mobileBreakpoint` (768) the desktop shell fades out and `SidebarSheet` mounts: a Base UI Dialog sliding in on `spring.moderate`, scrim `bg-black/40` (`/80` dark), `initialFocus` on the panel, exit held until the spring lands, reduced motion drops the slide (`registry/base/sidebar.tsx:57-149`, `sidebar-core.tsx:512-540`).
- **Port:** none; no breakpoint, no sheet, `openMobile` does not exist.
- **Workaround:** none. `mobile-drawer` is a separate component with its own drift file.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Variants, side and the inner-edge border

- **Cause:** `not ported yet`.
- **Original:** `variant="sidebar" | "floating" | "inset"` (floating is a rounded `surface-3` card in a `p-2` gutter, inset a `py-2` rail beside a rounded `SidebarInset`), `side="left" | "right"` (mirrors the rail, key and slide), `collapsible="none"`, and `bordered` (default: a 1px `border-border` on the inner edge) (`registry/base/sidebar.tsx:157-263`, `sidebar-core.tsx:760-905`, `:1132-1160`).
- **Port:** one layout: left, no border, `color.background` fill, optional `leftCornerRadius` for the app frame (`src/components/sidebar.tsx:332-352`). The site's own sidebar uses `bordered={false}` (`app/components/sidebar.tsx:90`), so the borderless look matches the site but not the docs' default `Sidebar` layout.
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
- **Port:** a fixed right pad: 8px, or 36px when a badge is set (`src/components/sidebar.tsx:180`). No actions, no gutter maths, no popup freeze.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Row sizes and the outline variant

- **Cause:** `not ported yet`.
- **Original:** `SidebarMenuButton size="default" | "sm" | "lg"` (32 or 28 compact, 28, 48), `variant="outline"` (1px border, `bg-background`), `SidebarMenu size="default" | "compact"` follows the `SizeProvider` (`sidebar-menu.tsx:935-1010`, `:1279`). `sm` also drops the label to the compact body step.
- **Port:** two fixed heights from level: `height.menuRow` 32 and `height.menuSubRow` 28 (`src/components/sidebar.tsx:179`); text always `scale.body` (13/20). No compact ladder, no `lg`, no outline.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Status dot and the `dot` prop

- **Cause:** `not ported yet`.
- **Original:** `status="active" | "unread" | "idle"` leads the row with a filled or ringed 8px dot in the icon column (`bg-foreground/60` lit, `bg-muted-foreground/50` at rest), stamps `data-status`, adds visually-hidden ", unread", and `active` implies `isActive`; `dot="filled" | "ring"` is the visual-only escape hatch (`sidebar-menu.tsx:898-1042`). The site's new / updated dot is a separate 6px trailing `bg-blue-500` span the page composes as a child (`app/components/sidebar.tsx:31-42`).
- **Port:** only the trailing 6px dot, and it is the `dot` prop (a colour string, `src/components/sidebar.tsx:149,225-236`). The prop name means the opposite of the source's `dot`, and the leading status dots do not exist.
- **Workaround:** none.
- **Fidelity:** exact for the site's trailing dot (same 6px, same gap, label hugs the text); dropped for `status`.
- **Components it hits:** just this one.

## Keyboard: Tab stop, arrows, Home / End, Enter

- **Cause:** `not ported yet`.
- **Original:** rows are real `button` / `a` elements with a roving tabindex (the active row's button is the tab stop, else the first row; sub-rows 0 only when active) (`sidebar-menu.tsx:988-998,1434`). Arrow Up / Down / Left / Right, Home and End move focus over every visible button in DOM order, wrapping, and stop propagation so a page-level arrow handler does not also act (`:413-445`). Keyboard focus also moves the hover background (`:392`).
- **Port:** rows are `<div role="button" onClick>` with no `tabIndex` and no key handler, so Tab never reaches them (`src/components/sidebar.tsx:186-205`). Enter and Space do nothing; arrows do nothing. The search input is the only focusable element.
- **Workaround:** none. `createFocusRing` and `list-nav.ts` exist in `src/lib` for other components.
- **Fidelity:** dropped.
- **Components it hits:** just this one (README lists it as not ported).

## Traveling keyboard focus ring

- **Cause:** `not ported yet`.
- **Original:** one overlay per menu, a 1px `--focus-ring` (`#6B97FF`) box 2px outside the focused row (`shape.focusRing`, radius 10) that springs between rows on `spring.fast` and fades on `spring.fast.exit`, drawn only for `:focus-visible`; `focusRing={false}` turns it off (`sidebar-menu.tsx:538-560`, props at `:589`).
- **Port:** none. `radius.focusRing` and `src/lib/focus-ring.tsx` exist, but the sidebar does not use them.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Semantics and `aria-current`

- **Cause:** `not ported yet`.
- **Original:** `ul` / `li` lists with `aria-label` on each menu ("Main navigation", "System navigation", ...), the row is a `button` (or `a` through `render`), `aria-current="page"` only while active (the attribute is absent otherwise), sub-menu `aria-hidden` and `data-state` while closed (`sidebar-menu.tsx:1062,1385`, `app/components/sidebar.tsx:75,99`).
- **Port:** `role="button"` on a `div`, `aria-current={props.active === true}` so an inactive row carries `false` instead of no attribute (`src/components/sidebar.tsx:188-189`). No `aria-label` on menus, no list roles, a collapsed sub-menu stays in the tree (its rows are only skipped by hover).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Disabled rows

- **Cause:** `not ported yet`.
- **Original:** a disabled row stays in the layout at `opacity-50`, never lights, never takes a click and is skipped by the keyboard (`sidebar-menu.tsx:109-120,904`).
- **Port:** `disabled` is a function the sub-menu uses to hide collapsed rows from the hover (`src/components/sidebar.tsx:154,155-159`); it adds no dimming and a disabled row still fires `onClick`. A public disabled row does not exist.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## A click between rows lands on the highlighted row (`gapClick`)

- **Cause:** `not ported yet`.
- **Original:** the container's `onClick` is the fluid-hover handler: a click on the gutter, the sub-menu's `ml-15` strip or any padding presses the row the highlight sits on (`sidebar-menu.tsx:568`, `use-fluid-hover`).
- **Port:** the container wires `containerProps` (enter / move / leave only), so a click off a row does nothing (`src/components/sidebar.tsx:100-107`, `src/lib/fluid-hover.ts:238`). The hover can still sit on a row while the click falls through.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every fluid-hover list (README lists `gapClick` as not ported).

## 80 ms colour ease on label, icon and badge

- **Cause:** `not ported yet`.
- **Original:** label colour, icon colour, icon stroke width and badge colour / weight all run `transition-[...] duration-80` (`sidebar-menu.tsx:879,1015,1241`).
- **Port:** the colours switch at once: `Icon` is called without `fade` (`src/components/sidebar.tsx:208-214`; the prop exists, `src/lib/icon.tsx:6-12`) and `StableLabel` has no colour transition (`src/lib/stable-label.tsx`). The stroke width switch is a separate known gap, `BASE-UI-AUDIT.md:529`.
- **Workaround:** none.
- **Fidelity:** dropped (instant).
- **Components it hits:** `StableLabel` users (tabs, tabs-subtle, card).

## Label truncation

- **Cause:** `not ported yet` (everywhere but the menu row).
- **Original:** the label and its ghost both `truncate`, so a long label ends in an ellipsis and never wraps the row (`sidebar-menu.tsx:864-885`).
- **Port:** `SidebarMenuButton` passes `truncate` to `StableLabel` (an optional prop added for it: the wrapper clips, the visible text spans it and gets `textOverflow: "ellipsis"`), so a long thread title ends in an ellipsis before the badge (`src/components/sidebar.tsx`, `src/lib/stable-label.tsx`). A row with a `dot` hugs its text and does not truncate. Every other `StableLabel` user (tabs, tabs-subtle, card) still runs long text past its box.
- **Workaround:** none.
- **Fidelity:** exact for a plain or badged row; dropped for a dotted row and the other `StableLabel` users.
- **Components it hits:** `StableLabel` users (tabs, tabs-subtle, card).

## Badge: `tabular-nums`, `pointer-events-none`

- **Cause:** `not ported yet`.
- **Original:** `tabular-nums` on the digits; the badge is `pointer-events-none` (`sidebar-menu.tsx:1239`).
- **Port:** no tabular figures (`src/components/sidebar.tsx:252-275`); the badge box is a normal hit target (the README says decorative `pointerEvents: none` was dropped on purpose).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Highlight opacity fade is the position spring, not an 80 ms tween

- **Cause:** `not ported yet`.
- **Original:** the hover highlight keeps its positional spring but fades on `{ duration: 0.08 }` (`fluid-hover-highlight.tsx:resolveHighlightTransition`); the active background moves on `spring.moderate` with `opacity: { duration: 0.08 }` (`sidebar-menu.tsx:520-524`). Reduced motion keeps the fade and drops the travel.
- **Port:** `FluidHighlight` passes one transition for both position and opacity (`src/lib/fluid-highlight.tsx:53-57,79`), so the fade runs on the spring (0.08 s hover, 0.16 s active). gpuix accepts per-property transitions (`MotionTransition` `{ [prop]: curve }`, `packages/native/js/host.ts:256-260`).
- **Workaround:** none.
- **Fidelity:** approximated (the fade is about the same length for hover, twice as long for the active background).
- **Components it hits:** every `FluidHighlight` user.

## Reduced motion

- **Cause:** `not ported yet`.
- **Original:** the highlight and the sheet and shell springs honour `useReducedMotion` (travel snaps, opacity keeps fading) (`fluid-hover-highlight.tsx`, `sidebar-core.tsx:634`).
- **Port:** no reduced-motion read anywhere in `src/`. gpuix exposes it (`FORK.md:906`, `packages/native/js/motion-config.ts`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every motion component in the port.

## Overlays snap by a timer, not by row identity

- **Cause:** `port choice` (reason not stated beyond the comment at `src/components/sidebar.tsx:37-38`: rows reflow every frame, so the overlays must follow without gliding).
- **Original:** each overlay remembers its row. A different row springs; the same row moving because a sibling sub-tree collapsed above it snaps (`sidebar-menu.tsx:462-492`).
- **Port:** toggling a sub-menu raises one `reflow` flag for `trackMs.spring + 48` = 448 ms and every overlay (hover, both active ones) snaps for that whole window (`src/components/sidebar.tsx:75-80,119,128,135`). A pointer that moves to a different row inside that window gets a snap instead of a glide.
- **Workaround:** the timer.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## One active background per level

- **Cause:** `port choice` (reason not stated).
- **Original:** every active row gets a background, keyed by level and occurrence, so two active rows in one sub-menu both light (`sidebar-menu.tsx:462-476`), at any nesting depth; the key survives a move so it glides.
- **Port:** exactly two overlays, level 0 and level 1, each on the first active row of its level (`src/components/sidebar.tsx:83-92,108-130`). `level` is typed `0 | 1`; a deeper tree has no overlay.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Sub-menu height spring on every re-measure

- **Cause:** `not ported yet`.
- **Original:** the wrapper springs only when this sub-menu's own `open` changes; a height change from a nested sub-menu collapsing snaps (`toggling` guard, `sidebar-menu.tsx:1340-1375`, same in `SidebarGroup`, `sidebar-core.tsx:1305-1315`).
- **Port:** `transition={props.open ? moderate : moderateExit}` always (`src/components/sidebar.tsx:305`), so any content resize while open springs. Not reachable today (no nested sub-menus, no group collapse), so it only shows once those are added.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Sub-menu chevron

- **Cause:** `gpuix gap` (CSS transforms, linked: [README row](../README.md); same drift as `drift/accordion.md`).
- **Original:** the page composes one `chevron-right` in a 24px slot and turns it 90 degrees on `spring.fast`; while the parent is open the chevron is hidden at rest and returns on row hover or focus (`app/docs/sidebar/page.tsx:nestingCode`).
- **Port:** `trailingIcon` swaps `chevron-down` / `chevron-right` at once and always shows it (`src/components/sidebar.tsx:238-247`, `src/demos/sidebar.tsx:84-88`).
- **gpuix lacks:** transforms on SVG icons outside a `TransformationMatrix` sprite (`~/code/fdarian/gpuix/FORK.md:876-887`).
- **Workaround:** swap the glyph; no hover-reveal.
- **Fidelity:** approximated.
- **Components it hits:** accordion, card, color-picker.

## Group label: count column and spacing

- **Cause:** `not ported yet` (the count spacing); the `SidebarGroup` wrapper is covered above.
- **Original:** the site's count is a `h-5 min-w-5 px-1` centred box in the label row, `tabular-nums`, `text-site-caption` (12/16), so its digits share the badge column (centre 18px from the right edge) (`app/components/sidebar.tsx:62-64`). A label sits in a `SidebarGroup` (`p-2`), so groups are 16px apart (content `py-2` + group `p-2`).
- **Port:** the count is a bare `caption` text right-aligned at 8px, so a two-digit count ends 4px right of the badge column and has no tabular figures; and groups touch (the label follows the last row, no 16px gap) (`src/components/sidebar.tsx:389-413`, `src/app.tsx:81-103`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Search field (`SidebarInput` + search block)

- **Cause:** `not ported yet`.
- **Original:** `SidebarInput` is `h-8` (`h-7` compact), `px-3`, `bg-transparent` with `ring-1 ring-transparent`; hover `bg-muted/50` + `ring-border`; focus `bg-card` + `ring-border`; and `focus-visible:ring-[--focus-ring]` (a text input matches `:focus-visible` on any focus, so a focused field shows the blue ring). Fill and ring ease over 80 ms (`sidebar-core.tsx:1165-1195`). The block adds the icon at `left-2`, `pl-8 pr-12`, `aria-label="Search"`, default placeholder `Search…` and a chip `⌘K` that fades in on hover or focus over 80 ms, or `shortcut={null}` to drop it (`registry/blocks/sidebar-app/search-field.tsx`).
- **Port:** hover fill `mutedHalf`, focus fill `card`, and the outline is `color.border` for both hover and focus, never the focus-ring colour (`src/components/sidebar.tsx:417-445`). Fill, ring and chip switch at once. No `aria-label`; the demo passes `placeholder="Search"` without the ellipsis (`src/demos/sidebar.tsx:63`); the chip cannot be dropped (`shortcut` is required). Size is fixed at 32 (`height.menuRow`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Content scroller: no fade, no hairlines, header outside it

- **Cause:** `not ported yet`.
- **Original:** `SidebarContent` is a `ScrollArea` with `scroll-fade` (48px edge mask) and `scroll-divider` hairlines inset 8px at the top and bottom edges while there is more to scroll (`registry/base/sidebar.tsx:268-305`, `app/globals.css:1087-1196`); the site's Search row sits inside it and scrolls with the nav.
- **Port:** a plain `overflowY: "scroll"` column, no fade, no hairlines (`src/components/sidebar.tsx:371-386`); the Search row is in `SidebarHeader`, outside the scroller. `src/components/scroll-area.tsx` has a `divider` prop for the hairlines, not used here (`BASE-UI-AUDIT.md:794`). The `<ScrollArea>` row is also `Dropped` in the README table.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** combobox (also a bare scroller).

## Demo: which variants exist

- **Cause:** `not ported yet`.
- **Original:** the docs page (`app/docs/sidebar/page.tsx:1836-1992`) has: Playground (provider / sidebar / layout options), Layouts (sidebar, floating, inset, each a 640px shell with a `SidebarInset` beside it), Nesting (two levels, one section level and one parent level), Actions and badges (up to 3 actions, `showOnHover`), Header and footer (vertical and horizontal stacking), Callouts (stacked inlines and banners), Resize / collapse / peek (on hover, on click, with the rail tooltip pinned), Inside a dialog (`collapsible="none"` in a settings dialog), No icon rail version (scripted icon-rail vs peek comparison), Functional and perfectly aligned (alignment guides), and five API reference tables.
- **Port:** two cards. The Playground (see "Playground" below) covers Nesting, badges, Header and footer stacking and Callouts. The "Sidebar" card keeps the site-nav sample: a search field, a flat `Showcase` row, a "System" group of four rows, a "Components" group with a collapsible "Button" row (`Variants`, `Sizes`, `Icons`) (`src/demos/sidebar.tsx`). Scenarios: the playground's controls, then hover, hover over a label, sub-menu, sub-menu collapsed. Not ported as their own sections: Layouts, Actions (the actions need `SidebarMenuAction`), Resize / collapse / peek, Inside a dialog, the icon-rail comparison, the alignment guides, the API tables.
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
- **Port:** the sidebar alone in a 480px-tall `shape.container`-radius box inside a `DemoCard` (`src/demos/sidebar.tsx:50-59`), no inset content, no header brand row, no footer, icon-less rows, no badges (the `badge` prop is demoed only by the Playground). The dot colours are fixed hex (`BLUE` `#3B82F6`, `YELLOW` `#FBBF24`, `:16-17`); the site's second dot is `var(--warning)` (`#F59E0B` light, `#FCD34D` dark, `app/globals.css:102`), so in light mode the yellow dot differs and does not follow the theme (`color.warning` exists in `src/lib/theme.ts`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Blocks: workspace header, user footer, app sidebar, inset top bar, settings dialog

- **Cause:** `not ported yet`.
- **Original:** `registry/blocks/sidebar-workspace-header.tsx` (brand row with a workspace dropdown, tile / trigger cross-fade while peeking), `sidebar-user-footer.tsx` (avatar row, dropdown opening upward on the shared grid), `sidebar-app/*` (`AppSidebar`, `nav-data.ts` Platform / Workspace, `inset-topbar.tsx`, `page.tsx`), `dialog-sidebar/settings-dialog.tsx` (a dialog with the sidebar inside, a Select under `sm`). Only the search-field block is ported (folded in as `SidebarSearchField`). The dropdown's `side="top"` is also absent (`BASE-UI-AUDIT.md:395`; `drift/dialog.md` for the settings dialog).
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

- **Cause:** `port choice` (the port has four more demos than the source has components).
- **Original:** Search, then Showcase and Introduction, then a "System" group (Fluid Hover, Motion, Scrollbars, Sizes, Skill, Surfaces, Typography) and a "Components" group of 28, each with a count (`app/components/sidebar.tsx:91-124`, `lib/docs/components.ts:23-59,75`).
- **Port:** Search, Showcase, Introduction, a "System" group of the seven system pages with a count, and a "Components" group listing every discovered demo with a count: 32, the extra four being file-thumbnail, mobile-drawer, queued-stack and scroll-area (`src/app.tsx:86-154`). The Compare, Audio Mixer and Concepts pages have no sidebar row, as in the source; they are in the site menu (`drift/site.md`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## New / updated dots in the nav

- **Cause:** `not ported yet`.
- **Original:** `isNew` / `isUpdated` entries get a 6px dot after the label, `bg-blue-500` or the entry's `dotColor` (`app/components/sidebar.tsx:31-42,74`): Fluid Hover, Banner, CarouselDots, Combobox, CommandMenu blue; Typography and Skill `var(--warning)`.
- **Port:** the app passes no `dot` to any row (`src/app.tsx:96-103`), and `Demo` has no new / updated flag (`src/lib/demo.ts:55-70`). The demo page shows dots, the real nav does not.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Search row: where it sits and its chip

- **Cause:** `not ported yet` (the placement and the font size); the chip text and platform switch match.
- **Original:** `SiteCommandMenuTrigger` is a menu inside the scrolling `SidebarContent`, a row with the search icon and "Search" label, and a `SidebarMenuBadge` with a `font-sans text-site-caption` class (12/16; the badge's own micro class is 11/14 and which one wins depends on utility order) saying `⌘K` or `Ctrl K` (`app/components/site-command-menu.tsx:141-155`, `app/components/sidebar.tsx:93-95`).
- **Port:** the row is in the fixed `SidebarHeader` and its badge uses `scale.micro` (11/14) (`src/app.tsx:70-80`, `src/components/sidebar.tsx:252-275`). Same text (`SITE_MENU_SHORTCUT`, `src/lib/site-command-menu.tsx:28`).
- **Workaround:** none.
- **Fidelity:** approximated (a pixel of type size).
- **Components it hits:** just this one.

## Rail frame: margin, fill, corners

- **Cause:** `port choice` (the sidebar sits inside the app frame's rounded panel; reason for the fill not stated).
- **Original:** `Sidebar className="ml-2"`, `rail={false}`, no fill of its own, sticky `h-svh`, content `py-2` (`app/components/sidebar.tsx:90-91`).
- **Port:** no left margin; the column paints `color.background` and takes `leftCornerRadius={PANEL_INNER_RADIUS}` (9) so the fill follows the panel's corner (`src/app.tsx:69`, `src/components/sidebar.tsx:332-352`); content padding is `8 / 8 / 0` rather than `py-2`.
- **Workaround:** n/a.
- **Fidelity:** approximated.
- **Components it hits:** app frame.

## Collapse, reopen trigger, `[` toast, persistence

- **Cause:** `not ported yet`.
- **Original:** `SidebarLayout` runs `SidebarProvider` with the cookie-read `defaultOpen`; `[` collapses and a `showShortcutToast("[", "Sidebar expanded" | "Sidebar collapsed")` follows a key-driven change; a `DesktopReopenTrigger` fades in at the top-left (opacity and scale 0.95 on `spring.fast`) with its own tooltip; the page's `SidebarInset` reflows (`app/components/sidebar-layout.tsx:31-90,184-198`).
- **Port:** the sidebar is always open at 256px; no key, no toast, no trigger, no persistence (`src/app.tsx:231-317`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** app frame.

## Mobile sheet and its "Make them yours" footer

- **Cause:** `port choice` (reason not stated; the app is a desktop window, so the breakpoint is never crossed).
- **Original:** below 1280 the sidebar is a drawer opened by a fixed top-left `SidebarTrigger` ("Open navigation"), closing on route change, with a footer holding "Make them yours" (title, GitHub star button, settings) (`app/components/sidebar.tsx:129-145`, `sidebar-layout.tsx:93-102,184-196`).
- **Port:** none; "Make them yours" is the right-hand `CustomizeCard` with a Theme select only (`src/app.tsx:187-229,298`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** app frame.

## Left / Right arrows page through the docs

- **Cause:** `not ported yet`. Same drift as [site.md, "Arrow keys do not step through the pages"](site.md#arrow-keys-do-not-step-through-the-pages), where the entry lives (verified: the port's only key handler is ⌘K, `src/lib/site-command-menu.tsx:45-52`).
