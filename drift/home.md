# home

Original: `app/page.tsx`, `app/components/bento-grid.tsx`, `bento-card.tsx` and `bento-previews.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/home/` (`bento-grid.tsx`,
`bento-card.tsx`, `bento-previews.tsx`) and `Showcase` / `HeroArrows` in `src/app.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it. The hero's three buttons are not wired here (their `onClick`s belong to the install-prompt / docs / demo work).

## The grid does not animate when the column count changes

- **Cause:** `not ported yet`.
- **Original:** `animateLayout` makes every card a framer `layout` node on `spring.moderate`, so crossing 768px or 1280px FLIP-animates each card to its new slot while the preview and footer ride as `layout="position"` (`bento-card.tsx:54-62,96-129`, `bento-grid.tsx:52-71,111`).
- **Port:** the columns are `@container` blocks on the grid and its cards (`src/home/bento-grid.tsx`: 3 from 1280px, 2 from 768px, else 1, and `2 / span 2` for `side: "right"` at three) that query `viewport`, a window-wide `inline-size` container `App` wraps the frame in (`src/app.tsx`; gpuix has no media queries). The style flips in the frame that lays the container out, so the cards re-slot at once. gpuix has `layout` (FLIP), but the test renderer cannot resize its window (`scripts/check-home-grid.tsx` mounts one window per width instead), so a flip across a breakpoint could not be checked and was left out.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The tile name is a button, not a link

- **Cause:** `port choice` (no routes; the page registry navigates by slug).
- **Original:** an `<a href="/docs/<slug>">` row with `aria-label="View <name> documentation"`, a `hover:bg-hover` fill and an inset focus ring (`bento-card.tsx:106-117`).
- **Port:** a `buttonProps` div with the same aria-label that calls `usePageNav().navigate(slug)`, the same hover fill and an inside focus ring (`focusRing(-1)`). It goes to the component's demo page (the source's `/docs/<slug>`).
- **Fidelity:** approximated (role `Button`, not `Link`).
- **Components it hits:** just this one.

## Previews take the port's components, so some tiles differ

- **Cause:** `not ported yet` / `port choice`, per tile below.
- **Port:** one preview per slug in `previewMap` (`src/home/bento-previews.tsx`); the tiles below differ from the source's.
  - **combobox:** the source is a multiple combobox with two chips ("Button", "Combobox") already in, `ComboboxChips`. The port's `Combobox` is single-select, so the tile is the single field with "Button" picked, over the same 17 components. Its width follows the `max-w-[280px]` column (`onLayout`), because the port's combobox takes a pixel width.
  - **sidebar:** the source's rail is 14rem wide, `size="compact"` rows, with a status dot leading each thread, a ⌘K / ⌘N hint that appears on hover, an Acme avatar row and a photo user row as real menu rows, and `collapsible="none"`. The port's `Sidebar` is a fixed 256px with 32px rows and no status dots (`drift/sidebar.md`), so the tile has the search field and a "New thread" row (no ⌘N hint), the four threads with badges (no dots), and the workspace and user rows as plain 32px rows beside the menus, not fluid-hover rows. Four threads, as in the source; the main region beside the rail is blank, as in the source.
  - **chat-message:** the source pins both bubbles to `size="compact"`; the port's `ChatMessage` has no size prop, so they use the default step.
  - **card:** the source squeezes the four inline rows to a 52px minimum with `py-1.5`; the port's compact card is 60px, so the stack is 240px in a stage that has 255px left after the footer and 20px padding.
  - **command-menu:** the source wraps the menu in `Elevated` (`offset=2`, `shadowLevel=3`); the port's `CommandMenuPanel` is the `surface-3` card with `shadow(3)`, the whole `--shadow-3` recipe (`drift/command-menu.md`). The data is the same rows and suggestions.
  - **dropdown:** the inline panel is a fixed 288px with `flexShrink: 0` (`drift/dropdown.md`), where the source's is `max-w-full` and shrinks to the 255px a two-column stage leaves; the tile's horizontal padding is 8px instead of 24 so the panel fits whole.
  - **input-group:** a fixed 288px column that shrinks (`minWidth: 0`), inside the source's `max-w-[320px]`; at wide windows the group stays 288px where the source grows to 320 (`drift/input-group.md`).
  - **carousel-dots:** the slide is the demo's `Slide` at 192 x 64 (`src/demos/carousel-dots.tsx`), which moves on `left` / `right`, not a transform; the label is at the port's body size, the border is `color.border` where the source uses `border-border/60`.
  - **accordion:** the open first row plus four closed ones are about as tall as the stage, so the first row touches the card's top edge.
  - **slider, tabs, input-copy, button, table, dialog, color-picker, tooltip, badge:** the same content and layout as the source. The buttons are pinned to `size="compact"` (the source's `sm`) and the table shows four rows inside a tile (`BentoTileContext`). The dialog is the full-window one, as in the source.
  - **select, switch, radio-group, checkbox-group, tabs-subtle, thinking-indicator, thinking-steps, input-message, ask-user-questions:** the same content and layout as the source. The checkbox, radio, switch and select carry the differences listed in their own drift files; `tabs-subtle` has no `aria-label` prop.
- **Fidelity:** approximated.
- **Components it hits:** the tiles named.

## The hero: arrows and spacing

- **Cause:** `port choice` (spacing).
- **Original:** a 680px column with `py-20 sm:py-28 px-6`, the heading at `fontWeights.bold` with `leading-none`, the two arrows at the row's right, and the grid below in a 1200px column (`app/page.tsx:20-70`). The next arrow's tooltip reads "Introduction →" with the arrow in mono at half opacity; the previous arrow is disabled, with `aria-label="No previous page"`.
- **Port:** the same two arrows (`HeroArrows`, `src/app.tsx`; icon size follows the Size row) with the tooltip, but the previous arrow is the `arrow-left` glyph, not `arrow-right` rotated 180° (no transforms), and the page column gives 24px of top padding where the source gives 80-112px. The heading is `App`'s shared one: bold with a 34px line (`drift/introduction.md`). The grid's column is `width: 100%`, `maxWidth: 1200`, 24px side padding, so it spans the centre column; the window is 1240px, so the grid shows two columns (the source shows three from a 1280px viewport).
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## Sample photo: a different picture

- **Cause:** `port choice` (the repository owner chose not to ship the source's photo).
- **Original:** the Sidebar tile's user row shows the source's `public/micka.png` (918x928 PNG) as a 20px avatar (`app/components/bento-previews.tsx:868`).
- **Port:** `assets/chat-ai/avatar.jpg` (345x345 JPEG, `AVATAR_JPG` in `src/lib/assets.ts`) in the same 20px circle (`src/home/bento-previews.tsx:329`). The row's label is renamed to go with it (next entry).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** the Sidebar tile; the Changelog page's Sidebar entry embeds the same preview (`drift/site.md`).

## Sample person: a different name

- **Cause:** `port choice` (the repository owner renamed the sample person to go with the replacement photo).
- **Original:** the Sidebar tile's user row labels the photo `public/micka.png` with the source author's name, "Micka Touillaud" (`app/components/bento-previews.tsx:868-874`).
- **Port:** the label reads "Com Truise" (`src/home/bento-previews.tsx:326`), next to the photo in the previous entry.
- **Workaround:** none.
- **Fidelity:** approximated (the label text differs; its style and position are the source's).
- **Components it hits:** the Sidebar tile; the Changelog page's Sidebar entry embeds the same preview (`drift/site.md`).

## Text at a half-pixel origin paints its glyphs 1px above Chrome's

- **Cause:** `gpuix gap` ([README, "Bugs"](../README.md#bugs), "text whose top lands on a half device pixel").
- **Original:** the ThinkingSteps tile's `ThinkingStepsPreview` is centred in its box (`app/components/bento-previews.tsx:691-696`); the box is an odd height, so the Research Agent card sits at y.5. Chrome lays its text out there and rounds each baseline half up when it paints.
- **Port:** the same layout, to the 1/64 (`src/home/bento-previews.tsx:437-448`): in `screenshots/showcase/grid-5` at scrollTop 2860 the label is at 343.5, the Sources row at 371.5 and the chip at 372.5, as in Chrome. gpuix's `paint_glyph` (`zed/crates/gpui/src/window.rs:6791`) rounds the glyph origin half down through `split_glyph_origin` (`zed/crates/gpui/src/util.rs:177`, `round_half_down`), so the label glyphs land one row above Chrome's: tops 348 / 409 / 477 against 349 / 410 / 478 (`grid-5`, `grid-6`). The chip fill is on the same rows in both (373-392): gpuix 15a rounds an atomic inline at a half pixel up like Chrome, so before 15a the chip-to-text distance matched by coincidence.
- **gpuix lacks:** Chrome's half-up rounding of a text baseline in `split_glyph_origin`; a tie is a logical .5 at scale 1 and a .25 or .75 at scale 2. Numbers and the run script: `~/.claude/notes/ff-gpuix-repros/r15a-chip-half-pixel/` (README).
- **Workaround:** none. The card is not nudged: its layout is Chrome's.
- **Fidelity:** approximated (a 1px glyph row at half-pixel text origins; boxes, fills and the card's position are exact).
- **Components it hits:** the ThinkingSteps tile here; any text whose top lands on a tie. The component page (`drift/thinking-steps.md`) has integer origins and is not affected.
