# banner

Original: `registry/default/banner.tsx`, demo in `app/docs/banner/page.tsx` and `lib/docs/playgrounds/banner.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/banner.tsx`,
demo in `src/demos/banner.tsx`. Screenshots: `screenshots/banner/` (`scrolled-*.png` are the lower cards, captured with a taller scroll).

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(selector `:has(.x)` and group-has) get a one-line entry here that links to the README row instead of
repeating it.

## The bar, the scale and the row are parallel tracks, not one value

- **Cause:** `gpuix gap`.
- **Original:** one `row` motion value (0 to 1) drives the row's height, the fixed bar's `y: (row - 1) * 100%` and opacity, and on dismiss the inline banner's `scale` (`banner.tsx:236-238`, `:257`, `:290-296`, `:323-332`). Inline, the banner appears from `scale` 0.4 and shrinks toward 0.6 from its top edge (`transformOrigin: "top"`, `:177-189`, `:245`, `:298`, `:356`).
- **Port:** the row's `height` animates between 0 and `auto` on its own track, and the fixed bar's `y` (`'-100%'` of its own height) and opacity run the same spring and tween beside it (`src/components/banner.tsx:372-405`); a fixed bar fades in place under reduced motion. The inline banner is a `motion.div` with `scale` bound to `barScale` and `transformOrigin: "top"` (`:408`): it grows from `FROM_SCALE` on `appearBanner` (the slow spring, delayed 80 ms) and, on dismiss, follows `rowProgress`, a motion value that runs the row's `dismissRow` tween beside the height, as `min(scale at dismiss, max(rowProgress, SHRINK_TO))` (`:176-184`, `:208-221`). The row is not bottom-aligned in the bar, because with `justifyContent: "flex-end"` the row's `auto` target follows the bar's offset and the row overshoots (measured on the demo: about 15px).
- **gpuix lacks:** a value to read from a `height` animation to `auto`: gpuix runs that tween itself, so nothing can derive the bar's `y`, the scale or the opacity from it.
- **Workaround:** the same transition on each track, and `rowProgress` as a copy of the row's tween for the scale. A dismiss mid-appear starts `rowProgress` at the row's current share of the bar's height.
- **Fidelity:** exact for the visible result (`check-banner` reads the scales 0.4 to 1 and 1 to 0.6, the top edge fixed, and the fixed bar's travel of its own height); the tracks can drift by a frame under load.
- **Components it hits:** thinking-indicator, queued-stack, mobile-drawer.

## `:has()` picks the description layout

- **Cause:** `gpuix gap`.
- **Original:** `has-data-[slot=banner-description]` on the banner and `group-has-data-[slot=banner-description]/banner` on the actions switch the layout when a description is a child: the icon and ✕ hold to the title line, and the actions move from the title row to under the text (`banner.tsx:450`, `:453`, `:597-603`). The narrow-container variant, `@max-sm/banner` (a container under 24rem, Tailwind 4.1's `sm`), drops the actions under the text too (`banner.tsx:602-603`); that part is ported.
- **Port:** the narrow layout is a real container query: the banner is `containerType: 'inline-size'` named `banner`, and `BannerActions` carries `'@container': { 'banner (width < 24rem)': ... }` that moves it to the third grid row, column 2, with the under-text margins (`banner.tsx:283-284`, `:511`, `:552`). The banner is a grid of `auto minmax(0, 1fr) auto auto` as in the source, and the parts place themselves in it. The `:has()` switch is a context flag: `BannerDescription` registers itself and the banner's `alignItems` and the actions' placement follow it (`banner.tsx:110-121`, `:168`, `:287`, `:493-498`, `:542`).
- **gpuix lacks:** `:has(.selector)`: only the state forms (`hasHover`, `hasActive`, `hasFocus`, `hasFocusVisible`, `hasDisabled`, `hasEnabled`) exist, and a selector on an attribute or a slot needs a selector engine (`~/code/fdarian/ghia/README.md` "Relational state"). README row "Selector `:has(.x)` and group-has".
- **Workaround:** the context flag. It is set in a render effect, so the first frame already has the description layout, and it follows the description mounting and unmounting.
- **Fidelity:** exact. The flag is only a different way to read the same fact; a description wrapped in another component still registers, where `:has()` would match it by slot as well.
- **Components it hits:** card (grid header), dialog footer, any part-composed layout that reacts to a child.

## Dismiss fade is its own tween

- **Cause:** `not ported yet`. gpuix has motion values and `useTransform` (`FORK.md:1146-1147`).
- **Original:** inline, the banner's opacity is the row's progress mapped from 1 (open) to 0.6 (the row is `shrinkTo` open) onto 1 to 0, so it is gone by the time the row is 60% open and always the row's height (`banner.tsx:317-332`). The fixed bar's opacity is the row's value outright.
- **Port:** inline, a separate 0.16s `easeOut` tween (`dismissFade`, `banner.tsx:138`, `:393-402`); the row runs 0.24s `easeInOut`. The fixed bar fades on the row's tween, as in the source.
- **Workaround:** none.
- **Fidelity:** approximated (same end points, different curve).
- **Components it hits:** just this one.

## Row does not give back the parent's gap

- **Cause:** `not ported yet`. `marginBottom` is animatable in `motion` (`packages/native/js/host.ts:143`).
- **Original:** in a flex column with a gap, the row also takes back one gap (`marginBottom: (row - 1) * gap`), measured at mount, so nothing jumps when the banner mounts or unmounts (`banner.tsx:148-152`, `:246-256`, `:270-279`, `:344`). The playground's inline page is a `gap-3` column (`lib/docs/playgrounds/banner.tsx:359-363`).
- **Port:** no margin. A closed banner renders nothing and an open or closing one is a row that starts at height 0, so the parent's gap appears when an appear starts and disappears when a dismiss ends: content below jumps by one gap: the playground's inline page is the same `gap: 12` column, so its lower skeleton lines step up 12px as a dismiss ends (visible between `screenshots/banner/playground-warning.png` and `playground-dismissed.png`). The "Dismissible" card's banner sits in a column without a gap.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Focus after a dismiss

- **Cause:** `not ported yet` (gpuix has `focus({ preventScroll })`, `FORK.md:485`).
- **Original:** if keyboard focus is inside the banner when it leaves, `focusNeighbour` moves it to the next focusable element after it, else the last one before it (`banner.tsx:200-213`, `:306-309`). The body is one element throughout.
- **Port:** the body is one element throughout too (the row stays mounted from the appear to the end of the exit), so a reopen during a dismiss keeps the ✕ focused. No hand-off: a focused ✕ keeps focus while the banner fades and loses it to nothing when the exit ends and the row unmounts.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Pointer events while faded

- **Cause:** `not ported yet`. `pointerEvents` is a style property (`~/code/fdarian/ghia/README.md:5691`).
- **Original:** `pointerEvents` is `none` while the banner's opacity is under 0.5, so an appearing banner cannot catch clicks meant for what is under it and a leaving one cannot be hit twice (`banner.tsx:258-260`).
- **Port:** no gate. The banner is clickable at opacity 0 during an appear, and the ✕ of a closing banner calls `onDismiss` again.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Status glyph mark is a mask

- **Cause:** `port choice` (the comment says the cut-out "works on any banner background").
- **Original:** the coloured statuses are a filled shape with the mark stroked in `--background`, the page colour (`banner.tsx:91-130`).
- **Port:** the mark is cut out with an SVG `<mask>`, so what shows through it is the banner's own fill over the surface (`banner.tsx:86-105`, `:255-264`).
- **Workaround:** the mask.
- **Fidelity:** approximated. The mark is pure page colour in the source and a tinted one in the port on a high-contrast banner, and on a surface that is not the page background.
- **Components it hits:** just this one.

## Action order follows the written order

- **Cause:** `gpuix gap`. gpuix has `order`, but the Tab order follows the painted order, not the document order its README states (a bare row of three `tabIndex={0}` boxes with `order` 3, 2, 1 is visited right to left), and an `order` inside an `@container` block is not read: the parent sorts by the style it reads without the block.
- **Original:** every `BannerAction` places itself with CSS `order` by variant, while the markup stays primary first, so Tab visits primary, then secondary, then ghost in every layout, and the order on screen follows the variant, not the order written (`banner.tsx:628-634`, `:586-610`).
- **Port:** the actions are written primary first and stay in that DOM order. `BannerActions` is `flexDirection: "row-reverse"` trailing the title, so the strongest action sits at the edge, and `row` under the text (a description, or the container under 24rem), so it leads. Tab visits the written order in both (`banner.tsx:510-558`). Placement follows the written order, not the variant: a ghost written first would lead under the text and sit at the edge trailing the title. Trailing, a row that wraps starts from the right, so the first line holds the first actions written, where the source's first line holds the lowest `order`.
- **Workaround:** the direction flip instead of `order`. `order` on each action would keep the placement by variant, but the Tab order would then follow it (ghost first).
- **Fidelity:** exact for actions written primary, secondary, ghost (the documented order); the placement is by position, not variant, when written otherwise.
- **Components it hits:** just this one.

## Ghost action colour

- **Cause:** `not ported yet`. The port's `Button` has no colour override (`labelColor` is internal, `src/components/button.tsx:191-200`); a `Button` prop for it would close this.
- **Original:** a ghost `BannerAction` adds `text-foreground`, which overrides the ghost button's muted rest colour, so it reads foreground at rest and on hover, with no colour change to ease (`banner.tsx:648-652`; its comment at `:618-619` describes "70% foreground", the code does not).
- **Port:** the plain ghost `Button`: muted at rest, foreground on hover, eased over 80 ms like the source's other ghost buttons (`banner.tsx:563-578`; `src/components/button.tsx:195-196`, `:231`).
- **Workaround:** none.
- **Fidelity:** approximated (the rest colour, and the hover fade the source does not have here).
- **Components it hits:** just this one.

## Props and parts the port does not take

- **Cause:** `not ported yet`.
- **Original:** `Banner` takes `dismissLabel` (default "Dismiss"), `motion` (a `BannerMotionConfig` that overrides the appear and dismiss values) with the exported `bannerMotion`, `role`, `className`, `style`, `ref` and HTML attributes, and wraps its children in `SizeProvider` when `size` is set (the port's omitted `size` follows the Size row, `banner.tsx:150`, but a given one scopes no children) (`banner.tsx:154-195`, `:366-393`, `:407-413`, `:525`, `:694`). `BannerAction` takes any `Button` prop, `href` (renders a link) and `external` (`banner.tsx:636-690`). The parts take `className` and HTML attributes. `useShape()` sets the radii.
- **Port:** the ✕ label is the literal "Dismiss" (`banner.tsx:433`); the motion values are module constants (`:129-138`); the role is derived from `status` only (`:276-278`); `BannerAction` takes `variant`, `testId`, `onClick` and children (`:562-577`); `BannerTitle` and `BannerActions` take a `testId`, the other parts children only. Radii are fixed (`radius.container` 12, `radius.item` 8, `:289`, `:451`).
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
- **Port:** both: "Dismissible" (`src/demos/banner.tsx:481-507`) and a compact error banner with a description and two actions in "Custom icon and compact" (`:624-634`).
- **Workaround:** none.
- **Fidelity:** exact (the compact metrics follow the source's `compact` branches, `banner.tsx:433`, `:479`, `:500` against `src/components/banner.tsx:38-59`).
- **Components it hits:** just this one.
