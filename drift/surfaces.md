# surfaces

Original: `app/docs/surfaces/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`), with `lib/docs/DocPage.tsx`, `lib/docs/ComponentPreview.tsx`, `registry/default/lib/elevated.tsx` and `surface-classes.ts`.
Ported in `src/pages/surfaces.tsx` (the page) and `src/pages/surfaces/` (`problem`, `solution`, `examples`, `invite-dialog`, `role-menu`, `annotations`, `elevated`, `visibility`, `snippets`), routed by the page registry. The doc chrome (`DocSection`, `SubHeading`, `Prose`, `ComponentPreview`, `MONO`, `SUBTITLE`) is the shared `src/lib/doc-page.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, variable-font axes, `text-box-trim`, `text-wrap: balance`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## Page header and Installation block follow the port's doc page

- **Cause:** `not ported yet` (arrows).
- **Original:** `DocPage` draws the title with prev / next arrows, the description, and an "Installation" block with the note "Installs the Elevated primitive plus the surface-context and surface-classes libs — the elevation ladder as code." and a copy-prompt button (`app/docs/surfaces/page.tsx:1298-1311`, `lib/docs/DocPage.tsx:73-170`).
- **Port:** `DocPage` from `src/lib/doc-page.tsx` (`src/pages/surfaces.tsx:Page`): `App`'s heading, the description under it (a node), the Installation block with the source's note and a Copy prompt button that copies `SURFACES_INSTALL_PROMPT`, then a 32px gap above each section like the source's. No prev / next arrows, as on [introduction.md](introduction.md#the-previous--next-arrows-are-missing); the heading weight and 8px description gap are [introduction.md's](introduction.md#the-heading-is-bold-in-the-source-semibold-here-and-sits-8px-above-the-subtitle-only-by-a-negative-margin) too (`marginTop: -16`).
- **Fidelity:** dropped (arrows).
- **Components it hits:** every docs page.

## The description's "light" and "dark" links underline at the default offset

- **Cause:** `gpuix gap` (an underline offset, see [`card.md`](card.md#the-link-variant-underlines-at-the-default-offset)).
- **Original:** `UseLightLink` / `UseDarkLink`: buttons inside the description's paragraph with `underline decoration-dotted underline-offset-2`, hover `text-foreground transition-colors` (`app/docs/surfaces/page.tsx:1265-1309`).
- **Port:** `ThemeLink` (`src/pages/surfaces.tsx:93-115`): a dotted-underlined `<span>` inside the description's one `<Prose>`, a button and Tab stop (Enter or Space switches, with a focus ring the source's button leaves to the browser), that calls `changeTheme`; hover eases the colour to foreground over 150 ms. The dots sit at the font's default offset, not 2px, and the underline does not fade with the colour (`text-decoration-color` is not transitionable, README "colour fade" row).
- **Fidelity:** approximated (underline offset).
- **Components it hits:** just this page.

## The preview frame has no Inspect switch and an unhighlighted Code tab

- **Cause:** `not ported yet`. Same drift as [site.md, "Preview frame"](site.md#preview-frame-inspect-highlighted-code-and-tabs-on-component-pages), narrowed to what this page ports.
- **Original:** `ComponentPreview` (52px header, `TabsSubtle` Preview / Code, Inspect `Switch`, shiki-highlighted code, `foreground/40` border on `:focus-within`, keyboard routing into the demo on a press of empty space) (`lib/docs/ComponentPreview.tsx:85-250`).
- **Port:** the shared `ComponentPreview` (`src/lib/doc-page.tsx`) keeps the border, the `foreground/40` focus-within border, the 52px header, the Preview / Code `TabsSubtle` and the Code tab, drawn in plain `foreground` Menlo 13/20 with a horizontal scroll. The Inspect switch, the highlighting and the keyboard routing are not ported. The page passes `padding="compact"` (`px-4 py-4`) or `"none"`, and `scheme="dark"` (next entry).
- **Fidelity:** approximated (Code tab uncoloured); dropped (Inspect).
- **Components it hits:** every docs page that gets a preview frame.

## The dark previews are a token scope, not a CSS class

- **Cause:** `port choice`.
- **Original:** `DarkPreview` wraps each frame in `className="dark bg-background"`, so every CSS variable resolves dark whatever the page theme; the Tokens demo's two rows use `.dark` and `.light` the same way (`app/docs/surfaces/page.tsx:38-45,189,208`).
- **Port:** `SchemeScope` in `src/lib/theme.ts` provides a scheme through Solid context, and `scheme()` (so every `color.x` and `surface(n)`) returns it while the read runs under a scope. `ComponentPreview`'s `scheme` prop wraps the frame in it with a `bg-background` backdrop. The whole frame, the demos, the real `ColorPicker`, `Slider` and `ScrollArea` and a popup that the picker opens under it all draw dark in a light page (`screenshots/surfaces/problem-light.png`, `color-picker-light.png`). A token read outside a reactive owner (an event handler, a timer) sees the page's scheme instead. `scheme()` skips the lookup while no scope is mounted, so other pages pay nothing.
- **Fidelity:** exact in the screenshots; untested for token reads made in handlers inside a scope.
- **Components it hits:** just this page; the scope is available to any page that forces a scheme.

## `Elevated`, the substrate context and the ladder's shadows are page-local; the components ignore them

- **Cause:** `not ported yet` (surface context in the components, see [dropdown.md](dropdown.md#popup-surface-colour-is-fixed-at-surface-3) and [color-picker.md](color-picker.md#popover-surface-level-is-5-not-substrate--2)).
- **Original:** `registry/default/lib/elevated.tsx`, `surface-context.tsx` and `surface-classes.ts`: every component reads `useSurface()` and sits at `min(substrate + offset, 8)`, with `shadow-surface-N` from `app/globals.css:137-162`.
- **Port:** `SurfaceProvider`, `useSurface` (an accessor), `Elevated` (`offset`, `shadowLevel`) live in `src/pages/surfaces/elevated.tsx`; `shadow(level)` in `src/lib/theme.ts` writes the whole `--shadow-N` recipe, light and dark (inset highlight and ring, hairline, stacked drops of 1 to 96px), as one multi-layer `boxShadow` string, and the components use it at the source's levels. Nothing in `src/components/` reads the context, so only this page's own panels lift.
- **Fidelity:** exact for the page's panels; the components do not lift.
- **Components it hits:** dropdown, select, combobox, color-picker, dialog (as above).

## The role menus are a page-local `SurfaceMenu`, not the port's `Dropdown`

- **Cause:** `not ported yet` (the `Dropdown` is fixed at surface 3, 288px wide, with no description rows).
- **Original:** the Substrate demo and the invite dialog render the real `Dropdown` (`className="w-full"` / `"!w-full"`) at the substrate's level, and the invite dialog's rows are a page-local `RoleItem` built on `useDropdown` with an 18px icon and a two-line label (`app/docs/surfaces/page.tsx:689-700,854-928,1205-1227`).
- **Port:** `SurfaceMenu` (`src/pages/surfaces/role-menu.tsx`) is `Elevated offset={2} shadowLevel={3}` around rows on the lib's `createFluidHover` and `FluidHighlight`, so the selected background and the hover highlight glide as in the dropdown. It has no keyboard navigation, no focus ring, no tab stop and no ARIA roles, and the rows do nothing on click. The Substrate demo's "Favorites / Recents / Private" rows and the invite dialog's role rows are drawn by it; the problem demo's menu is the source's presentational `StaticRoleItem` as it is there.
- **Workaround:** none; the real `Dropdown` cannot show a lifted background without a component change.
- **Fidelity:** approximated (look and hover exact, behaviour dropped).
- **Components it hits:** just this page.

## The invite dialog is a plain panel, its email field a static box, its chevron a different glyph

- **Cause:** `port choice` (a panel, as in the source), `gpuix gap` (transforms) for the chevron.
- **Original:** both dialogs are `div`s at `surfaceClasses(5)`, not the `Dialog` component; the email field is a `readOnly` `<textarea rows={2}>`; the role trigger's chevron is `rotate-180` (`app/docs/surfaces/page.tsx:502-612,1139-1248`).
- **Port:** the same panels in `src/pages/surfaces/invite-dialog.tsx`; the email field is a 58px bordered box with the placeholder text and a hover tint, no input; the chevron is a page-local `chevron-up` glyph because gpuix has no transforms (README "gpuix gaps across components", CSS transforms row). The "Send invites" button is `opacity: 0.5` as `disabled:opacity-50`; no element takes focus.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## The Problem canvas is 2px wider than the frame

- **Cause:** `port choice` (canvas).
- **Original:** the Problem canvas is a fixed 600 x 640 centred in the frame, which is 632px wide in the source's 680px column (`app/docs/surfaces/page.tsx:413-445`, `lib/docs/DocPage.tsx`, `app/docs/layout.tsx:3`).
- **Port:** the page column is 600px, so the frame's inner width is 598 and the 600px canvas sits at `marginLeft: -1` under the frame's clip; the dialog is at an explicit `left: 140`, not `left-1/2 -translate-x-1/2` (no transforms). The arrows end in the source's SVG `<marker>` chevron with `context-stroke` (`ArrowMarker`, `src/pages/surfaces/annotations.tsx`). Callouts, dial values and anchors are the source's.
- **Fidelity:** exact but for the canvas width.
- **Components it hits:** just this page.

## The solution callouts read tokens, not the painted colour

- **Cause:** `port choice`.
- **Original:** `SolutionAnnotations` reads each target's `getComputedStyle(el).backgroundColor` and converts it to hex (`app/docs/surfaces/page.tsx:930-1120`).
- **Port:** the swatch and hex are `surface(5)` and `surface(7)`, the levels the page gave the dialog and the menu; positions are measured with `getBoundingClientRect` under a `ResizeObserver` as the source does (`src/pages/surfaces/examples.tsx`). If the menu's level were wrong the label would not show it.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## The elevation stack tracks the pointer in a signal

- **Cause:** `gpuix gap` (a parent's `hasHover` styles the parent, not its children).
- **Original:** a surface's name is shown by `[&:hover>span]:opacity-100 [&:has([data-surface]:hover)>span]:opacity-0`, `transition-opacity duration-150` (`app/docs/surfaces/page.tsx:767-770`).
- **Port:** each box's `onMouseMove` stops propagation and sets the level under the pointer; the label of that level is opaque and the others transparent, with a 150ms `transitionProperty: "opacity"` on the label. The fade was not checked; the label appears (`screenshots/surfaces/stack.png`). Leaving the stage clears it. The source's rule is on the box and selects its child `span`; the port's label is a child of the box, and gpuix has no way to style a child from its parent's `hasHover`, nor `groupHover` for "an inner box is hovered" (a group only follows an ancestor, and the inner box is a sibling of the label), so `groupHover` could show the label while its box is hovered but not hide it again for the inner box (`src/pages/surfaces/solution.tsx:349-419`). The slider is the real `Slider` (range, `showSteps`), whose value label sits to the left of the track as in the component.
- **Workaround:** the signal.
- **Fidelity:** approximated.
- **Components it hits:** just this page.

## The colour picker's format menu only exists while the demo is on screen

- **Cause:** `gpuix gap` (an open popup whose anchor is off screen is clamped into the window; no portal container) and `port choice` (the gate).
- **Original:** `ColorPicker formatOpen` inside `ColorPickerPortalContainer`, so the open format menu portals into the demo's own container and scrolls with it (`app/docs/surfaces/page.tsx:838-852`).
- **Port:** `defaultFormatOpen`; the popup is gpuix's `anchored`, which keeps it in the window, so a picker mounted off screen showed its menu over unrelated content, and one mounted while hidden was dismissed by the first click anywhere. The picker is mounted only while at least half of its 520px stage is inside the page scroller (`src/pages/surfaces/visibility.ts`, an `IntersectionObserver` on the scroller as `DemoCard` uses), and unmounted when it scrolls away, so its value resets. A stage scrolled mostly out of view still draws the menu clamped to the window edge. The panel is at level 3 and the menu at 5 (`level` prop, `color-picker.tsx:1480-1481`, `:1671`; the menu `:943`), as in the source.
- **Workaround:** the visibility gate.
- **Fidelity:** approximated.
- **Components it hits:** any demo that opens a popup on mount.

## Smaller differences

- **Cause:** `port choice`, `not ported yet` where noted.
- **Original and Port:**
  - `text-site-subtitle` (14/20) is the shared `SUBTITLE` constant in `src/lib/doc-page.tsx`, the port's `type` has no such role (`app/globals.css:420`). Compact sizes follow the ambient size in the source; the port has the default step only ([site.md, "Customise rows not ported"](site.md#customise-rows-not-ported-radius-size-icons-primitive), `not ported yet`).
  - Section titles use a 16px line, SemiBold 600 for the variable 550 / 600 (README variable-font row), as in [introduction.md](introduction.md#section-titles-use-a-16px-line).
  - `font-mono` is Menlo (`ui-monospace` in the browser; same face in Chrome on macOS).
  - Substrate demo: the three columns are 181px wide in the 566px content box (191px in the source's 598px), the `border-border/40` edge is the dark literal `rgba(245,245,245,0.048)` because `color.border` is not a hex `withAlpha` can mix (`src/pages/surfaces/solution.tsx`).
  - Tokens demo: the chip row (564px) fits the 566px `ScrollArea` here as in the source, so neither scrolls and the fade never shows; the port's `ScrollArea` takes an explicit `height={110}`.
  - The Elevated demo's outer panel is `maxWidth: 480` with `width: 100%` centred by the column, where the source uses `max-w-[480px] mx-auto`.
  - The elevation stack's invisible ghost stack is `opacity: 0` with `pointerEvents: none` (`invisible` is not a gpuix style), so it takes layout but not events.
  - ⌘K: the System row has no icon, and its keywords are the slug and the description's words as the source computes them (`s.slug, ...s.description.split(/\W+/)`, `app/components/site-command-menu.tsx:206-216`), written out in `menuKeywords` without the empty string the split's trailing full stop leaves; the "New" badge does not apply to this page. The sidebar order is alphabetical like the source's `systemNavList`, so `order = 6` (after Skill).
  - The scenario captures `problem-light`, `tokens-light` and `color-picker-light` by setting the theme in code, then back to dark; the script's own final light step goes through the theme select.
- **Fidelity:** approximated.
