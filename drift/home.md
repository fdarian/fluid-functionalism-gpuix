# home

Original: `app/page.tsx`, `app/components/bento-grid.tsx`, `bento-card.tsx` and `bento-previews.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/home/` (`bento-grid.tsx`,
`bento-card.tsx`, `bento-previews.tsx`) and `Showcase` / `HeroArrows` in `src/app.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it. The hero's three buttons are not wired here (their `onClick`s belong to the install-prompt / docs / demo work).

## The grid does not animate when the column count changes

- **Cause:** `not ported yet`.
- **Original:** `animateLayout` makes every card a framer `layout` node on `spring.moderate`, so crossing 768px or 1280px FLIP-animates each card to its new slot while the preview and footer ride as `layout="position"` (`bento-card.tsx:54-62,96-129`, `bento-grid.tsx:52-71,111`).
- **Port:** the column count (`createMediaQuery` on the window width, 3 from 1280, 2 from 768, else 1) re-flows the grid at once (`src/home/bento-grid.tsx`). gpuix has `layout` (FLIP), but the test renderer cannot resize its window, so it could not be checked and was left out.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## The card's shadow needs an opaque fill

- **Cause:** `gpuix gap`.
- **Original:** `.bento-card-border` is a 1px border plus `0 1px 2px` drop shadow, hairline `light-dark` colours in three states: rest, hover, `:focus-within` (`app/globals.css:1244-1269`), on a transparent card.
- **Port:** the same three states through `hover` and `focusWithin` styles (`src/home/bento-card.tsx` `frame`), with `backgroundColor: color.background`. gpuix draws a box shadow under the whole border box instead of clipping it out of the inside, so over a transparent card it darkened the whole tile.
- **gpuix lacks:** an outer box shadow clipped out of the border box (CSS paints no shadow inside the box).
- **Workaround:** an opaque background in the page colour hides the shadow's interior.
- **Fidelity:** exact.
- **Components it hits:** any transparent box with an outer shadow.

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
  - **command-menu:** the source wraps the menu in `Elevated` (`offset=2`, `shadowLevel=3`); the port's `CommandMenuPanel` is the `surface-3` card with `--shadow-3`'s drop (`drift/command-menu.md`). The data is the same rows and suggestions.
  - **select, switch, radio-group, checkbox-group, tabs-subtle, thinking-indicator, thinking-steps, input-message, ask-user-questions:** the same content and layout as the source. The checkbox, radio, switch and select carry the differences listed in their own drift files; `tabs-subtle` has no `aria-label` prop.
- **Fidelity:** approximated.
- **Components it hits:** the tiles named.

## The remaining tiles are empty

- **Cause:** `not ported yet`.
- **Original:** previews for every slug in `displayOrder`.
- **Port:** the first 14 slugs of `displayOrder` have previews; the other 13 (slider, dropdown, tabs, input-copy, accordion, input-group, carousel-dots, button, table, dialog, color-picker, tooltip, badge) render a card with an empty stage, in the right grid slot, until `previewMap` gets their entries.
- **Fidelity:** dropped.

## The hero: arrows, spacing and the heading weight

- **Cause:** `port choice` (spacing), `gpuix gap` (weight: README "Drift from the source", variable-font rows).
- **Original:** a 680px column with `py-20 sm:py-28 px-6`, the heading at `fontWeights.bold` with `leading-none`, the two arrows at the row's right, and the grid below in a 1200px column (`app/page.tsx:20-70`). The next arrow's tooltip reads "Introduction →" with the arrow in mono at half opacity; the previous arrow is disabled, with `aria-label="No previous page"`.
- **Port:** the same two arrows (`HeroArrows`, `src/app.tsx`; icon size follows the Size row) with the tooltip, but the previous arrow is the `arrow-left` glyph, not `arrow-right` rotated 180° (no transforms), and the page column gives 24px of top padding where the source gives 80-112px. The heading is `App`'s shared one: semibold with a 34px line (`drift/introduction.md`). The grid's column is `width: 100%`, `maxWidth: 1200`, 24px side padding, so it spans the centre column; the window is 1240px, so the grid shows two columns (the source shows three from a 1280px viewport).
- **Fidelity:** approximated.
- **Components it hits:** just this page.
