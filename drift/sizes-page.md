# sizes (page)

Original: `app/docs/sizes/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), inside
`DocPage` / `DocSection` (`lib/docs/DocPage.tsx`) and `ComponentPreview` (`lib/docs/ComponentPreview.tsx`), with `InspectOverlay` (`lib/docs/InspectOverlay.tsx`).
Ported in `src/pages/sizes.tsx`, with the demos in `src/pages/sizes/` (`toolbar.tsx`, `compact-region.tsx`, `token-inspector.tsx`, `token-table.tsx`,
`step-frame.tsx`, `ladder.ts`, `sort-options.ts`, `install-prompt.ts`), routed by the page registry (`src/lib/demo.ts` `loadPages`). The doc chrome, its code
chips, Copy prompt button, `ComponentPreview` frame and the missing prev / next arrows are the same as the Motion page's: see `drift/motion-page.md`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, variable-font axes, `text-box-trim`, `text-wrap: balance`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## No `SizeProvider`: every control in a region gets `size` explicitly

- **Cause:** `port choice` (the port has only the global Size row, `sizeChoice` in `src/lib/theme.ts`, and per-component `size` props; see `drift/site.md`, "Size row: components with no compact step do not follow it").
- **Original:** `<SizeProvider size={variant}>` pins the toolbar rows, the compact region and the token inspector, and everything inside follows, the `Dropdown` panel included (`app/docs/sizes/page.tsx:218, 313, 481`). The gap between controls comes from `sizeMap[variant].gap`.
- **Port:** each component in those regions is passed `size={step}` (`TabsSubtle`, `InputGroup`, `Select`, `Button`, `CheckboxGroup`, `CheckboxItem`), and the icon-only Filter button takes `size="icon"` / `"icon-compact"`. The row gap is `LADDER[step].gap` (`src/pages/sizes/ladder.ts`), the 8 / 4 the components share.
- **Workaround:** the explicit props above.
- **Fidelity:** exact where a component takes `size`; see the next entry for the one that does not.

## The frozen menu in "Compact regions" does not step

- **Cause:** `not ported yet` (`Dropdown` and `MenuItem` have no `size` prop and no ambient size: `src/components/menu-item.tsx:112` fixes rows at `height.control`, and the Size row leaves them out, `drift/site.md`).
- **Original:** the inline `Dropdown` panel inside the provider drops to 28px rows with the bar above it, and the callout "The menu inherits the region's step" points at it (`app/docs/sizes/page.tsx:313-345`, callout `:347-402`).
- **Port:** the real inline `Dropdown` (`src/components/dropdown.tsx:425`), which stays at 36px rows in the Compact step while the bar above it goes to 28px. The callout text is the source's, so in Compact it describes something the menu does not do. It is 288px wide (`PANEL_WIDTH`) where the source's is `!w-48` (192px), and the callout and arrow are shifted 96px right to keep their gap from its edge.
- **Workaround:** none without a `size` on `Dropdown` / `MenuItem`; the page does not touch those components.
- **Fidelity:** approximated (right in Default, wrong in Compact).
- **Components it hits:** dropdown, menu-item.

## The frozen menu is pointer-inert, not `inert`

- **Cause:** `port choice`.
- **Original:** `inert` on the wrapper, so the panel takes no clicks, no focus and is not announced (`app/docs/sizes/page.tsx:331-333`).
- **Port:** `pointerEvents: "none"` and `userSelect: "none"` on the wrapper (`src/pages/sizes/compact-region.tsx`). The panel is still a `tabIndex={0}` group, so Tab can land on it and the arrows move a ring.
- **Fidelity:** approximated (the pointer is ignored, the keyboard is not).

## The sort button is not drawn pressed

- **Cause:** `not ported yet` (`Button` has no `active` prop; `src/components/button.tsx:108-130`).
- **Original:** `<Button variant="tertiary" active trailingIcon={ChevronDown}>` shows the pressed fill that says "this opened the menu below" (`app/docs/sizes/page.tsx:316`).
- **Port:** the plain tertiary button with the trailing chevron.
- **Fidelity:** approximated.
- **Components it hits:** button.

## The token inspector is a smaller inspector

- **Cause:** `not ported yet` (`ComponentPreview` has no Inspect overlay, `drift/motion-page.md`); `gpuix gap` for the element lookup: gpuix has no `elementsFromPoint`, `getComputedStyle` or `ResizeObserver` to read a hit element's box, padding and font.
- **Original:** `InspectOverlay` over the frame hit-tests the deepest element under the cursor, snaps anonymous parts to their control, and draws rulers, crosshair guides at the box edges, padding and gap strips, and a tooltip with `tokenReadout` of the measured box, padding, gap and font (`lib/docs/InspectOverlay.tsx:249-768`, `app/docs/sizes/page.tsx:416-503`).
- **Port:** the demo's controls are hover targets, one per control: the button, the select trigger and each checkbox row (`InspectTarget`, `src/pages/sizes/token-inspector.tsx`). A transparent layer over each takes the pointer, so the control is frozen under it as the source's overlay freezes it, and the layer's own `onLayout` gives the measured width and height, so a step flip re-measures under a parked cursor. Hovering draws the content fill, the left and right padding strips (green, labelled) and the four box edges as guides across the frame body, and opens a pinned `Tooltip` with the source's `tokenReadout` rules (±1px matches against `LADDER`) in 11px mono. The padding, gap and font a control paints are restated per target (`BUTTON_METRICS`, `SELECT_METRICS`, `ROW_METRICS`), since the port has no ambient size context to read them from. Controls measure whole, as in the source; the parts inside (the icon, the label) are not separate targets, so the `icon` token never appears in a readout, and `text` appears for any hover on a control. No rulers, no gap strips, no vertical padding strips (the controls have none), no tooltip `!px-3.5 !py-4 max-w-[240px]` (an inner box adds the padding), and the Select, which is frozen, cannot be opened.
- **gpuix lacks:** a way to ask what is under the pointer and its layout box and computed padding, font and gap.
- **Workaround:** the per-control targets and restated metrics above.
- **Fidelity:** approximated (the readout matches the source's for the three controls shown; the rest of the overlay is reduced).

## Token reference uses the port's values, and drops two columns' worth of chrome

- **Cause:** `port choice` (the port has no Tailwind classes); `not ported yet` for the touch step.
- **Original:** a `ScrollArea orientation="horizontal"` around a `min-w-[560px]` table; the control row reads `h-9 · 36px`; the `field` row reads "13px / 20px, 16px on touch" (`app/docs/sizes/page.tsx:45-124`).
- **Port:** the same shape (`src/pages/sizes/token-table.tsx`): a horizontal `ScrollArea` around a `display: table` at `width: 100%`, `min-width: 560`, the columns sized to their content, the first flush left. In the page's 600px column the nowrap Token, Default and Compact cells leave "Applies to" about 135px, so it wraps to three to six lines and the table is 610px wide, scrolling 10px sideways (measured), where the source's column is up to 680px (`app/docs/layout.tsx:3`) and fits it. Values come from `LADDER` (`src/pages/sizes/ladder.ts`), which restates what `Select` `specs`, `TabsSubtle` `sizes`, `Tabs` `sizes`, `InputGroup` `steps` and `ROW` agree on: `36px`, `28px + 4px = 36px`, `13px / 20px`, `16px`, `12px / 8px`, `8px`. The `field` row drops the touch step (a desktop window has no iOS zoom on focus) and says so in its "Applies to" text, so that cell is not the source's. Row rules are `borderFaint` (7.2%) for `border-border/50` (6%).
- **Fidelity:** approximated.

## The toolbar rows

- **Cause:** `port choice` / `not ported yet`.
- **Original:** `ComponentPreview` at its `px-8 py-12`, `flex-wrap`, a `hidden sm:contents` group so phones see the trimmed toolbar, `SelectTrigger className="min-w-36 w-36"` (144px), `InputGroup className="w-24"`, tabs icons `Table2` / `SquareKanban`, filter icon `ListFilter` (`app/docs/sizes/page.tsx:142-276`).
- **Port:** `padding="none"` with a 16px side inset, because the 600px column leaves 534px inside the frame's `px-8` and the row needs 536 (the port's `Select` trigger is 160px at Default, 128px at Compact: `min-width` in `src/components/select.tsx` `specs`, with no prop to set it); the row does not wrap (it wrapped the controls under the tabs at the narrower inset); no phone layout (`drift/site.md`, "No responsive layout"). The search field is a 96px wrapper around the 288px `InputGroup`, which shrinks into it. The three icons are lucide data written with `defineIcon` (`src/pages/sizes/toolbar.tsx`), so they stay Lucide when the Icons row changes. The Filter button takes its icon through `icon` (the port's `Button` has no icon-as-children). The search placeholder is clipped to "Search.." at 96px.
- **Fidelity:** approximated.

## The Code tab is the source's snippet

- **Cause:** `port choice`.
- **Original:** the toolbar snippet with `SizeProvider`, `useSize()` and `InputGroup className="w-28"` (`app/docs/sizes/page.tsx:108-136`).
- **Port:** the same text, verbatim (`TOOLBAR_CODE` in `src/pages/sizes/toolbar.tsx`), so it shows the web API and not the `size="compact"` props the port passes. Plain monospace, no highlighting (`drift/motion-page.md`).
- **Fidelity:** exact text, not runnable in the port.

## The compact-region and inspector frames use the shape tokens

- **Cause:** `port choice`.
- **Original:** both frames are `${shape.container}` with a 52px header and the Default / Compact toggle (`app/docs/sizes/page.tsx:278-300, 440-503`).
- **Port:** `StepFrame` (`src/pages/sizes/step-frame.tsx`) reads `shape.container` (12 / 24), as the source does. The `ComponentPreview` above it is a fixed 12 in the port (`src/lib/doc-page.tsx`), so with Radius on Pill the toolbar frame stays at 12 while these two round to 24.
- **Fidelity:** exact for the two frames; the toolbar frame is the Motion page's drift.

## "Press S", the Typography link

- **Cause:** `not ported yet` (the `S` shortcut, `drift/site.md`, "Theme: shortcut, tooltips, toasts"); `gpuix gap` for the link's underline offset ([`card.md`](card.md#the-link-variant-underlines-at-the-default-offset)).
- **Original:** "Press `S` to toggle on the website" and an `<a href="/docs/typography" className="mx-1 text-foreground underline underline-offset-4">Typography</a>` (`app/docs/sizes/page.tsx:590-592, 616-622`).
- **Port:** both are verbatim. `S` does nothing (the Size row in the customise card changes the step); "Typography" is the shared `Link` (`src/lib/doc-page.tsx:82-120`) with the same `mx-1` and foreground colour, and a click or Enter shows the Typography page. Its underline sits at the default offset, not 4px.
- **Fidelity:** exact text, describes more than the port does; the link is exact but for the underline offset.

## The API reference sections are left out

- **Cause:** `port choice` (the port has no API tables).
- **Original:** "SizeProvider props" and "Component size prop" sections with a `PropsTable` each (`app/docs/sizes/page.tsx:554-585, 644-650`).
- **Port:** not shown. The port's components take `size?: "default" | "compact"` each (`Button` also `"icon"` and `"icon-compact"`); there is no provider.
- **Fidelity:** dropped.

## The ⌘K row

- **Cause:** none (the source's System rows have no icon).
- **Original:** `keywords: [s.slug, ...s.description.split(/\W+/)]`, no icon (`app/components/site-command-menu.tsx:206-218`).
- **Port:** `menuKeywords = ["sizes", ...description.split(/\W+/)]` of the `systemList` description (`src/pages/sizes.tsx`), no `menuIcon`.
- **Fidelity:** exact.
