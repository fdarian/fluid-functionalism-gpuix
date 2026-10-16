# banner

Original: `registry/default/banner.tsx`, demo in `app/docs/banner/page.tsx` and `lib/docs/playgrounds/banner.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/banner.tsx`,
demo in `src/demos/banner.tsx`. Screenshots: `screenshots/banner/` (`scrolled-*.png` are the lower cards, captured with a taller scroll).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## CSS transforms (the banner scales in and out)

- **Cause:** `gpuix gap`.
- **Original:** inline, the banner inside its row scales from 0.4 to 1 on appear (slow spring, a fast tier after the row) and shrinks from 1 to 0.6 from its top edge on dismiss, `transformOrigin: "top"` (`banner.tsx:177-189`, `:245`, `:298`, `:323-332`, `:356`).
- **Port:** the banner only fades (`banner.tsx:341-380`).
- **gpuix lacks:** `scale` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`; README "gpuix gaps", CSS transforms row).
- **Workaround:** none; the row's height tween and the fade carry the motion.
- **Fidelity:** approximated (height and fade, no scale).
- **Components it hits:** any enter or exit that scales.

## The fixed bar rides its row on `top`

- **Cause:** `gpuix gap`.
- **Original:** a fixed bar slides with `y: (row - 1) * 100%` while the row opens or closes, opacity following the row (`banner.tsx:236-238`, `:257`, `:290-296`).
- **Port:** `top` from 0 to minus the bar's height and back, the same springs and curve (the bar's `motion.div` in `src/components/banner.tsx`). The row's height animates between 0 and `auto`; the bar is not bottom-aligned in the row, because with `justifyContent: "flex-end"` the row's `auto` target follows the bar's offset and the row overshoots (measured on the demo: about 15px).
- **gpuix lacks:** translate (README CSS transforms row), and `%` for insets in `motion` (`FORK.md:901`).
- **Workaround:** the bar's measured height in pixels stands in for `100%`, read as the exit starts. A banner that is created closed has not been seen yet, so its first entrance fades in without sliding; later ones slide.
- **Fidelity:** exact for the visible result except that first entrance; `top` re-lays out each frame.
- **Components it hits:** thinking-indicator, queued-stack, mobile-drawer.

## Container queries and `:has()`

- **Cause:** `gpuix gap`.
- **Original:** `@max-sm/banner` (a container query at 24rem) drops the actions under the text, and `has-data-[slot=banner-description]` switches the layout when a description exists (`banner.tsx:450`, `:453`, `:597-603`).
- **Port:** the `:has()` switch is a context flag; the narrow layout does not exist (`banner.tsx:105-118`, `:187-191`, `:433-438`).
- **gpuix lacks:** container queries (they need a layout feedback pass that taffy and gpuix do not have) and `:has()` (no selector engine; gpuix has no stylesheet): `~/code/fdarian/gpuix/FORK.md:619-623`. README rows "Container queries" and "`:has()`".
- **Workaround:** `BannerDescription` registers itself in a context and the content flips between a row and a column from that flag. The narrow-container layout is not ported.
- **Fidelity:** exact for the wide layout and the `:has()` switch, dropped for `@max-sm`.
- **Components it hits:** card (grid header), dialog footer, any part-composed layout that reacts to its own width or to a child.

## Dismiss fade is its own tween

- **Cause:** `not ported yet`. gpuix has motion values and `useTransform` (`FORK.md:824`).
- **Original:** inline, the banner's opacity is the row's progress mapped from 1 (open) to 0.6 (the row is `shrinkTo` open) onto 1 to 0, so it is gone by the time the row is 60% open and always the row's height (`banner.tsx:317-332`). The fixed bar's opacity is the row's value outright.
- **Port:** inline, a separate 0.16s `easeOut` tween (`dismissFade`, `banner.tsx:129`, `:343-349`); the row runs 0.24s `easeInOut`. The fixed bar fades on the row's tween, as in the source.
- **Workaround:** none.
- **Fidelity:** approximated (same end points, different curve).
- **Components it hits:** just this one.

## Row does not give back the parent's gap

- **Cause:** `not ported yet`. `marginBottom` is animatable in `motion` (`packages/native/js/host.ts:107`).
- **Original:** in a flex column with a gap, the row also takes back one gap (`marginBottom: (row - 1) * gap`), measured at mount, so nothing jumps when the banner mounts or unmounts (`banner.tsx:148-152`, `:246-256`, `:270-279`, `:344`). The playground's inline page is a `gap-3` column (`lib/docs/playgrounds/banner.tsx:359-363`).
- **Port:** no margin. A closed banner renders nothing and an open or closing one is a row that starts at height 0, so the parent's gap appears when an appear starts and disappears when a dismiss ends: content below jumps by one gap: the playground's inline page is the same `gap: 12` column, so its lower skeleton lines step up 12px as a dismiss ends (visible between `screenshots/banner/playground-warning.png` and `playground-dismissed.png`). The "Dismissible" card's banner sits in a column without a gap.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Focus after a dismiss

- **Cause:** `not ported yet` (gpuix has `focus({ preventScroll })`, `FORK.md:444`).
- **Original:** if keyboard focus is inside the banner when it leaves, `focusNeighbour` moves it to the next focusable element after it, else the last one before it (`banner.tsx:200-213`, `:306-309`). The body is one element throughout.
- **Port:** the body is one element throughout too (the row stays mounted from the appear to the end of the exit), so a reopen during a dismiss keeps the ✕ focused. No hand-off: a focused ✕ keeps focus while the banner fades and loses it to nothing when the exit ends and the row unmounts.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Pointer events while faded

- **Cause:** `not ported yet`. `pointerEvents` is a style property (`~/code/fdarian/gpuix/README.md:4918`).
- **Original:** `pointerEvents` is `none` while the banner's opacity is under 0.5, so an appearing banner cannot catch clicks meant for what is under it and a leaving one cannot be hit twice (`banner.tsx:258-260`).
- **Port:** no gate. The banner is clickable at opacity 0 during an appear, and the ✕ of a closing banner calls `onDismiss` again.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Reduced motion is ignored

- **Cause:** `not ported yet`. gpuix has `matchMedia("(prefers-reduced-motion)")` and `MotionConfig reducedMotion="user"` (`FORK.md:831`).
- **Original:** `useReducedMotion()` drops the scale and the slide, keeps the fades, and snaps the row (`banner.tsx:235-238`, `:289`, `:297`, `:311-315`).
- **Port:** no check (`banner.tsx:126-129`, `:312-358`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** thinking-indicator, and every component whose source reads `useReducedMotion`.

## The fixed bar does not stick

- **Cause:** `not ported yet`. gpuix has `position: sticky` (`FORK.md:560`).
- **Original:** `sticky top-0 z-40` on the row, so the bar stays at the top of its scroll container and pushes the content down (`banner.tsx:353`).
- **Port:** the fixed variant is square corners and an opaque background; it is an ordinary flex child (`banner.tsx:240-250`). In the demo the page scrolls in a sibling below the bar, so the bar stays put either way (`src/demos/banner.tsx:108-189`). Placed first inside a scrolling container it would scroll away.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Status glyph mark is a mask

- **Cause:** `port choice` (the comment says the cut-out "works on any banner background").
- **Original:** the coloured statuses are a filled shape with the mark stroked in `--background`, the page colour (`banner.tsx:91-130`).
- **Port:** the mark is cut out with an SVG `<mask>`, so what shows through it is the banner's own fill over the surface (`banner.tsx:84-103`, `:220-229`).
- **Workaround:** the mask.
- **Fidelity:** approximated. The mark is pure page colour in the source and a tinted one in the port on a high-contrast banner, and on a surface that is not the page background.
- **Components it hits:** just this one.

## Dismiss button fades

- **Cause:** `not ported yet`. `colorFade` exists (`src/lib/theme.ts:451`) and `Icon` takes `fade` (`src/lib/icon.tsx:6-12`).
- **Original:** `transition-colors duration-80 hover:bg-hover hover:text-foreground` (`banner.tsx:497`).
- **Port:** the hover background is a state style and the icon colour comes from a signal, so both switch at once (`banner.tsx:393`, `:401`).
- **Workaround:** none.
- **Fidelity:** approximated (80ms fades dropped).
- **Components it hits:** any control with `transition-colors duration-80`.

## Action order is done by reversing the elements

- **Cause:** `not ported yet`. gpuix has `order` and `flexDirection: "row-reverse"`, and `order` keeps focus order in document order, as the DOM does (`packages/native/js/host.ts:399`, `:413-415`). The port's comment that it has neither (`banner.tsx:474-478`) is out of date.
- **Original:** every `BannerAction` places itself with CSS `order` by variant, while the markup stays primary first, so Tab visits primary, then secondary, then ghost in both layouts (`banner.tsx:628-634`, `:586-610`).
- **Port:** trailing the title, `BannerActions` reverses the resolved children (`banner.tsx:456-485`, `:460-463`), so Tab visits ghost, then secondary, then primary there. Under a description the order is as written.
- **Workaround:** the reversal.
- **Fidelity:** exact visually; the keyboard order differs in the trailing layout.
- **Components it hits:** just this one.

## Ghost action colour

- **Cause:** `not ported yet`.
- **Original:** a ghost `BannerAction` adds `text-foreground`, which overrides the ghost button's muted rest colour, so it reads foreground at rest and on hover (`banner.tsx:648-652`; its comment at `:618-619` describes "70% foreground", the code does not).
- **Port:** the plain ghost `Button`: muted at rest, foreground on hover (`banner.tsx:490-506`; `src/components/button.tsx:129-130`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Props and parts the port does not take

- **Cause:** `not ported yet`.
- **Original:** `Banner` takes `dismissLabel` (default "Dismiss"), `motion` (a `BannerMotionConfig` that overrides the appear and dismiss values) with the exported `bannerMotion`, `role`, `className`, `style`, `ref` and HTML attributes, and wraps its children in `SizeProvider` when `size` is set (the port's omitted `size` follows the Size row, `banner.tsx:143`, but a given one scopes no children) (`banner.tsx:154-195`, `:366-393`, `:407-413`, `:525`, `:694`). `BannerAction` takes any `Button` prop, `href` (renders a link) and `external` (`banner.tsx:636-690`). The parts take `className` and HTML attributes. `useShape()` sets the radii.
- **Port:** the ✕ label is the literal "Dismiss" (`banner.tsx:372`); the motion values are module constants (`:123-126`); the role is derived from `status` only (`:240-242`); `BannerAction` takes `variant`, `testId`, `onClick` and children (`:514-530`); the parts take children only. Radii are fixed (`radius.container` 12, `radius.item` 8, `:250`, `:414`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component without `className` and `ref` passthrough.

## Demo: playground

- **Cause:** `port choice`.
- **Original:** the playground has a code tab with the matching JSX and sits in `ComponentPreview` with a "Replay" in its toolbar (`app/docs/banner/page.tsx:110-126`, `lib/docs/playgrounds/banner.tsx:32-375`).
- **Port:** every control, default, the shuffle, the per-status copy, the "Show banner" button, the held page height (a `ResizeObserver`, as in the source) and the inline page and fixed `MockPage` previews are ported; no control is left out (`src/demos/banner.tsx`, `Playground`). No code tab (the site has no code snippets). The preview is a `DemoCard`, with no Replay (the "Show banner" button is the way back). The preview is the page column's width up to 560px (the source's 420px variant is for its `/demo` card). The skeleton lines are `color.hover` instead of `muted`, which equals the card's `surface2` in dark and would vanish. The hold re-measures on the first resize after a control changes, where the source re-measures in an effect after the commit.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every component whose source page has a playground.

## Demo: cards, lead sentences and widths

- **Cause:** `port choice` (reason not stated; the cards are tuned for the harness).
- **Original:** sections "Statuses", "Actions", "Fixed", "Custom icon", each with a lead sentence, then the code tab and API tables (`app/docs/banner/page.tsx:220-256`, `:90-110`). Statuses is a 2-column grid with `gap-x-3 gap-y-5`. The Fixed demo's Replay remounts it, so the banner arrives in place.
- **Port:** "Dismissible", "Fixed", "Statuses", "Actions", "Custom icon and compact" in that order. The widths, the `MockPage` (header skeleton, pill lines, 300px) and the 560/520 maxima follow the source. Statuses is two flex columns with `gap: 12`, rows `gap: 8`. A "Replay" `Button` sets `open` back to true, so the banner plays its appear animation again. Lead sentences, the code tab and the API tables are dropped.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** every demo (lead sentences, code tab, API tables).

## Demo: port-only variants

- **Cause:** `port choice` (to exercise the controlled `open` prop and compact in the harness).
- **Original:** no "Dismissible" card (a success, high-contrast "Changes saved" with ✕) and no compact banner.
- **Port:** both: "Dismissible" (`src/demos/banner.tsx:485-510`) and a compact error banner with a description and two actions in "Custom icon and compact" (`:587-606`).
- **Workaround:** none.
- **Fidelity:** exact (the compact metrics follow the source's `compact` branches, `banner.tsx:433`, `:479`, `:500` against `src/components/banner.tsx:37-58`).
- **Components it hits:** just this one.
