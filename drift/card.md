# card

Original: `registry/default/card.tsx`, demo in `app/docs/card/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/card.tsx`, demo in `src/demos/card.tsx`.

Ported: Card, CardGroup (stacked / inline, 1 or 2+ columns, borderless / outlined, separated), the magnetic fluid hover in one and two dimensions (`createFluidHover`, `axis: "xy"` for grids), gap click (16px), the selected fill with the weight-changing title, hairline dividers that drop beside the lit or selected card, dismissible cards, CardMedia (icon tile, logo, logo pair), CardImage, CardFeature, CardButton (primary, secondary, ghost, link). `screenshots/card/` has the standard captures plus `grid-*`, `separated-and-outlined` and `promo-chip-hover`.

Checked with no drift: paddings and gaps of Card, CardHeader, CardContent, CardFooter and the inline-image column (16 / 12, 14 / 10, 12 / 10, gap 8), the 60px minimum height, the 32px media tile and its icon (18 / 16), the logo pair rule, the 160px inline image, the 1px inset image outline, dismiss chip size and position (28px at 8 / 8, icon 15 / 13), CardButton height, padding and glyphs (28, 10, 14 / 12, arrow 13), the four CardButton fills (`bg-foreground/90`, `bg-accent/80`, `bg-hover`, `bg-active` resolved as alphas), hairline colours (`border-border/60` is `borderFaint`), highlight and selected radii (12), type (subtitle 14/20, 13/18; caption 12/16, 11/14), dark tokens.

## A nested `buttonProps` element is clicked twice by Enter

- **Cause:** `gpuix gap`.
- **Original:** Enter on a focused `<button>` inside a clickable card clicks that button once, and the click bubbles to the card.
- **Port:** the clickable card root, `CardButton` and the dismiss chip are all `buttonProps` elements, nested (`src/components/card.tsx:337-339`, `:985`, `:508`). The chip's click handler calls `stopPropagation` (`:511`), which stops the bubbled click but not the second keydown, so Enter on a focused chip or button runs its action twice.
- **gpuix lacks:** a target check in `buttonProps`' key handling: its `onKeyDown` clicks `event.elementId`, the focused element, and the keydown bubbles, so every enclosing `buttonProps` element clicks the same target again (`packages/solid/src/components/button.ts:34`, `:48`). Probed on the test renderer with an outer and an inner `buttonProps` div and focus on the inner: one Enter produced `inner, outer, inner, outer`. Space (on key-up, `:52-57`) has the same shape.
- **Workaround:** none.
- **Fidelity:** approximated (exact for the pointer, doubled for the keyboard).
- **Components it hits:** any `buttonProps` element inside another (README "Bugs" table lists the others).

## The clickable card is the root, not a stretched overlay (BUG: a `CardButton` click also clicks the card)

- **Cause:** `port choice` (reason not stated; gpuix has `position: absolute` and `zIndex`, `FORK.md:560-561`, so an overlay would work).
- **Original:** a stretched `<button>` (or `<a>`) at `z-20` sits behind the footer and actions (`z-30`), which are siblings, not descendants (`registry/default/card.tsx:345-369`, `:650`, `:698`). Clicking `CardButton` runs only its own handler.
- **Port:** the card root carries `buttonProps({ onClick })` (`src/components/card.tsx:337-339`), so `CardButton` (`:985`) and `CardAction` are inside it. `CardButton` and `CardAction` do not stop propagation, and gpuix click bubbles, so a click on a footer button also runs the card's `onClick`, and the Enter doubling above adds a second round. Only the chip guards against it (`:510-513`, "The card behind the chip is clickable too"). Read from the code and from the nested-`buttonProps` probe above (the outer handler ran for the inner click); not run on a card with both handlers. The demos hide it: every demo card's `onClick` is empty or a selection that has no `CardButton`.
- **Workaround:** none.
- **Fidelity:** approximated (the look is the same; the behaviour of a card with actions is not).
- **Components it hits:** just this one.

## Link cards: `href`, `external` and `CardButton` `href`

- **Cause:** `not ported yet`.
- **Original:** `Card` with `href` renders a stretched `<Link>` (new tab for `external`); `CardButton` with `href` renders a `<Link>` (`:226-232`, `:350-359`, `:981-993`).
- **Port:** no `href` or `external` on `Card` (`src/components/card.tsx:244-258`); `CardButton` has `external` only for the arrow glyph (`:888-898`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## ARIA and alt text

- **Cause:** `not ported yet`.
- **Original:** the overlay button has `aria-label={label}` and `aria-pressed={selected || undefined}` (`:363-365`); a disabled card gets `aria-disabled` (`:413`) and drops the overlay; `CardMedia` and `CardImage` pass `alt` (`logoAlt`, `alt`, `:752-756`, `:804-806`).
- **Port:** the root gets `aria-label` and `aria-selected={selected()}` on every card, clickable or not, and `aria-selected` is not a valid attribute for `role="button"` (`src/components/card.tsx:340-341`); a disabled card has no `aria-disabled` (`:379`); the `<img>` elements get no `alt` (`:755-766`, `:799-814`) although `ImgProps` has it (`packages/native/js/host.ts:1274`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Cursor over a clickable card

- **Cause:** `port choice` (reason not stated).
- **Original:** the overlay `<button>` has no `cursor-pointer` class (`:361-367`) and Tailwind v4's preflight resets buttons to `cursor: default`, so by the CSS a clickable card shows the arrow; a `href` card (an `<a>`) shows the hand. Not run in a browser.
- **Port:** `cursor: "pointer"` for every clickable, enabled card (`src/components/card.tsx:376`).
- **Workaround:** n/a.
- **Fidelity:** approximated (unverified).
- **Components it hits:** just this one.

## Keyboard focus ring on a tile

- **Cause:** `port choice` (reason not stated).
- **Original:** the ring is `ring-1` on the overlay, inside a card that is `overflow-hidden` when it is a tile (standalone, or separated and outlined, `:339-343`), so by the CSS the 1px ring that falls outside the card is clipped away. A card in a plain group shows it. Not run in a browser.
- **Port:** `focusVisible: focusRing(0)` on the root, an outline outside the box, which the card's own `overflow: "hidden"` does not clip (`src/components/card.tsx:378`, `:367`); inside an outlined, non-separated group the group's `overflow: "hidden"` clips it as in the source.
- **Workaround:** n/a.
- **Fidelity:** approximated (the port shows a ring the source probably does not).
- **Components it hits:** just this one.

## Standalone-hover, dismiss-chip and `CardButton` colours do not ease

- **Cause:** `not ported yet`.
- **Original:** `transition-colors duration-80` on a standalone clickable card (`:428`), the chip's colour and its opacity reveal (`transition-opacity duration-80`, `:487`, `:502`), `CardButton`'s colour (`:974`), and glyph `transition-[stroke-width]` (`:951`, `:958`).
- **Port:** all switch at once (`src/components/card.tsx:373-375`, `:537-545`, `:940-941`, `:986-1005`). gpuix animates colours and opacity on state-style and plain style changes (`FORK.md:815-818`); the stroke width needs `Icon` rebuilt from shape children (`BASE-UI-AUDIT.md:529`).
- **Workaround:** none.
- **Fidelity:** dropped (80ms fades).
- **Components it hits:** every component with a hover fill (see `drift/button.md`).

## The dismiss chip does not appear when the card has focus

- **Cause:** `not ported yet`.
- **Original:** with `dismissOnHover` the chip shows on `group-hover/card` and `group-focus-within/card`, and on its own `focus-visible` (`:501-502`), so tabbing to the card or one of its buttons reveals it.
- **Port:** `visible` is `hovered() || dismissFocused()`, the card's hover or the chip's own focus (`src/components/card.tsx:448-450`); focus on the card root or a `CardButton` does not reveal it. The chip is still a tab stop (`:519`) and appears when reached.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## The chip over media has no backdrop blur

- **Cause:** `not ported yet`.
- **Original:** `bg-card/70 backdrop-blur-sm hover:bg-card` when the card has a `CardImage` (`:492-494`).
- **Port:** the 70% alpha alone (`src/components/card.tsx:41-42`, `:539-543`). The comment says gpuix has no backdrop blur; it has `backdropFilter` (`packages/native/js/host.ts:567-570`, `FORK.md:651`, effect groups, macOS).
- **Workaround:** the alpha.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## An inline dismissible card does not leave room for the chip

- **Cause:** `not ported yet`.
- **Original:** inline cards with `dismissible` give `card-header` `pr-10` (while the chip is revealed, or always with `dismissOnHover={false}`) so the single-line title does not run under it (`:430-438`).
- **Port:** `CardHeader` knows nothing of the chip (`src/components/card.tsx:561-592`); the chip overlays the text. No demo uses an inline dismissible card.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## `CardAction` is pinned over the header instead of taking a grid column

- **Cause:** `not ported yet`.
- **Original:** `CardHeader` is a grid that gains a `1fr auto` template when a `card-action` is present; the action sits in column 2 spanning both rows, so the title and description make room (`:537`, `:650`).
- **Port:** `CardAction` is `position: absolute; top: 0; right: 0` on a column flex (`src/components/card.tsx:579-590`, `:640-646`); long text runs under it. gpuix has grid. No demo uses `CardAction`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Titles never wrap and cannot truncate

- **Cause:** `port choice` (reason not stated; the visible title is absolutely positioned over the invisible semibold copy, which needs both on one line).
- **Original:** the title wraps normally; a consumer's `truncate` ellipsizes it (`:569-609`).
- **Port:** both copies are `whiteSpace: "nowrap"` (`src/components/card.tsx:608`, `:621`); a long title is clipped by a tile or runs past the column. The parts take no `className`, so there is no `truncate`. gpuix has `textOverflow: "ellipsis"` (`host.ts:620`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Font weight cannot be eased

- **Cause:** `gpuix gap`.
- **Original:** `transition-[font-variation-settings]` eases the title between regular and semibold when the card is selected (`:596-605`); the site's semibold is the variable `wght 550`.
- **Port:** the weight switches at once between 400 and the nearest static cut, SemiBold 600 (`src/components/card.tsx:598-627`); the invisible semibold copy in flow keeps the row from reflowing.
- **gpuix lacks:** variable-font axes: fonts render only their default instance, so there is one static file per weight and nothing to interpolate (`~/code/fdarian/gpuix/README.md:756`, `:5302`; `src/lib/fonts.ts`). README "gpuix gaps", card and table row.
- **Workaround:** static cuts.
- **Fidelity:** approximated (no easing, 600 for 550).
- **Components it hits:** every `StableLabel` (`src/lib/stable-label.tsx`): tabs, tabs-subtle, sidebar, menu rows; also `CardFeature`'s title (semibold 550 in the source, `:886`).

## CSS transforms (the external-link arrow)

- **Cause:** `gpuix gap`.
- **Original:** the link button's arrow is an arrow-right with `-rotate-45` (`:958`).
- **Port:** the arrow-up-right glyph is drawn instead (`src/components/card.tsx:30`, `:971-979`).
- **gpuix lacks:** `rotate` (no `transform`; `~/code/fdarian/gpuix/FORK.md:876-887`). README "gpuix gaps", CSS transforms row.
- **Workaround:** the glyph swap.
- **Fidelity:** exact for the resting pose, no rotation tween.
- **Components it hits:** any rotated glyph.

## The highlight travels on `top` / `left`, not a transform

- **Cause:** `gpuix gap`.
- **Original:** `FluidHoverHighlight` moves with `x` / `y` transforms on the compositor (`registry/default/fluid-hover-highlight.tsx:72-76`, `:120-133`).
- **Port:** `FluidHighlight` animates `top`, `left`, `width` and `height` (`src/lib/fluid-highlight.tsx:6-13`, `:67-80`), re-laying out per frame.
- **gpuix lacks:** transforms (`FORK.md:876-887`); see the CSS transforms row in README.
- **Workaround:** layout props.
- **Fidelity:** approximated (same path and spring, more work per frame).
- **Components it hits:** every fluid hover list.

## No reduced-motion handling

- **Cause:** `not ported yet`.
- **Original:** the highlight snaps instead of travelling under `prefers-reduced-motion`, keeping the opacity fade (`registry/default/fluid-hover-highlight.tsx:79-90`, `:114`, `:133`).
- **Port:** `FluidHighlight` always travels (`src/lib/fluid-highlight.tsx`); no `matchMedia` or `reducedMotion` anywhere in `src/`. gpuix reads it (`FORK.md:831-833`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every motion in the port.

## Label is not trimmed to cap height

- **Cause:** `gpuix gap`.
- **Original:** `[text-box:trim-both_cap_alphabetic]` on the inline-card title, `CardFeature`'s title and `CardButton`'s label (`:564-565`, `:883`, `:965`).
- **Port:** no trim (`src/components/card.tsx:598-627`, `:859-865`, `:957-969`).
- **gpuix lacks:** `text-box-trim`; README "gpuix gaps", badge row.
- **Workaround:** none.
- **Fidelity:** approximated (about a pixel).
- **Components it hits:** see `drift/badge.md`.

## The link variant underlines at the default offset

- **Cause:** `gpuix gap`.
- **Original:** `underline-offset-4` and `hover:underline` (`:915`).
- **Port:** `textDecoration: "underline"` on hover (`src/components/card.tsx:963-965`).
- **gpuix lacks:** an underline offset: `StyleDesc` has `textDecoration`, `-Line`, `-Style`, `-Color` and nothing for the offset (`packages/native/js/host.ts:628-634`; searched `packages/native/src` and `js`).
- **Workaround:** none.
- **Fidelity:** approximated (the line sits closer to the text).
- **Components it hits:** any `underline-offset-*`.

## `CardImage` has a fixed height, not 16:9

- **Cause:** `not ported yet`.
- **Original:** stacked images are `w-full aspect-[16/9]` (`:817`).
- **Port:** `height` prop, default 160 (`src/components/card.tsx:778`, `:812`); the demos compute it by hand: 155 in the grid, 168 in the promo (`src/demos/card.tsx:76`, `:146`), 160 for the unset one. The doc comment says gpuix has no `aspect-video`; it has `aspectRatio` and sizes `<img>` like a replaced element (`packages/native/js/host.ts:601`, `FORK.md:561-562`).
- **Workaround:** the `height` prop.
- **Fidelity:** approximated (right at the demo widths, wrong at any other width).
- **Components it hits:** just this one.

## The image rounds its own corners to the tile

- **Cause:** `port choice` (reason not stated; the tile also sets `overflow: "hidden"` and a radius at `:366-367`).
- **Original:** the image is `rounded-[2px]` and the tile's `overflow-hidden` + radius clips its outer corners (`:339-343`, `:813-815`).
- **Port:** `tileCorner()` hands the tile radius (minus 1 for a frame) to the image's outer corners and keeps 2px on the rest (`src/components/card.tsx:325-329`, `:781-797`).
- **Workaround:** n/a.
- **Fidelity:** exact in the cases checked by reading (stacked, inline, framed, borderless); the screenshots were not diffed.
- **Components it hits:** just this one.

## `size` pins the card's parts only

- **Cause:** `not ported yet`.
- **Original:** `size` wraps the card in a `SizeProvider`, so a nested `Button`, `Badge` and the rest follow; omitted, it follows the surrounding provider (`:244-247`, `:276`, `:515`).
- **Port:** `compact` is `props.size === "compact"` for the card's own parts (`src/components/card.tsx:266`); nothing is provided to children, and an ambient size is not read.
- **Workaround:** pass `size` to each child.
- **Fidelity:** dropped.
- **Components it hits:** every component with a size ladder.

## `CardFeature` compact icon gap is 6, not 4

- **Cause:** `port choice` (reason not stated; looks like a slip).
- **Original:** the gap is the size ladder's `gap`: `gap-2` (8) default, `gap-1` (4) compact (`:871`, `registry/default/lib/size-context.tsx` `sizeMap`).
- **Port:** `marginRight: scope.compact() ? 6 : 8` (`src/components/card.tsx:838`).
- **Workaround:** none.
- **Fidelity:** approximated (2px).
- **Components it hits:** just this one.

## Corner radii are fixed

- **Cause:** `not ported yet`.
- **Original:** the tile, highlight and fill radii come from `shape.container` (12, 24 for the pill) and the media, chip and button radii from `shape.bg` / `shape.button` (8, 20) (`:211`, `:340`, `:503`, `:760`, `:777`, `:977`).
- **Port:** `radius.container` and `radius.item` (`src/components/card.tsx:232`, `:401`, `:533`, `:720`, `:998`). README: "pill shape" is not ported.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** every component that reads `shape`.

## No `className`, `style`, `ref` or HTML attributes; `outlined` stands in for a border class

- **Cause:** `port choice` (reason not stated; Solid components with fixed prop lists).
- **Original:** every part forwards `className` and the HTML attributes; the promo demo gives `Card` `border border-border/60 overflow-hidden rounded-xl` and `CardContent` `flex flex-col gap-3` (`app/docs/card/page.tsx:330`, `:336`).
- **Port:** a standalone `Card` takes `outlined` for the frame (`src/components/card.tsx:252-253`, `:369-371`) and the demo wraps `CardContent`'s children in a 12px-gap column (`src/demos/card.tsx:150-163`). Parts take `children` only; `CardMedia` has no `className`.
- **Workaround:** `outlined`.
- **Fidelity:** exact for the demos.
- **Components it hits:** every ported component.

## `CardEyebrow` is not ported

- **Cause:** `port choice` (the source marks it deprecated: "a card starts with its title", `:828-833`).
- **Original:** a small muted label above the title (`:834-853`).
- **Port:** none.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Layering is document order, not `zIndex`

- **Cause:** `not ported yet`.
- **Original:** the fill and dividers at `-z-10`, the overlay at `z-20`, actions at `z-30`, the highlight at `z-0` under the cards at `z-10` (`:208-212`, `:415`, `:445-509`).
- **Port:** the highlight is the group's first child and the decorative fill and hairlines share one absolute layer first in the card (`src/components/card.tsx:219-235`, `:382-431`); the comments say gpuix has no `zIndex` and that an empty text node eats a `gap`. gpuix has `zIndex` and gives an empty text node no box or `gap` slot (`FORK.md:561`, `:564-565`).
- **Workaround:** the wrapper layers.
- **Fidelity:** exact (no visible difference; the wrappers and comments are stale).
- **Components it hits:** carousel-dots and tabs carry the same comment (`src/components/carousel-dots.tsx:123`, `src/components/tabs.tsx:229`).

## Demo: order, widths, copy and the missing playground

- **Cause:** `not ported yet` (playground, widths); `port choice` (the rest, reason not stated).
- **Original:** `app/docs/card/page.tsx:413-451`: Playground, Basic, Grid, Outlined, Separated, Fully yours, Selected, then four API tables. The examples sit in `max-w-[520px]` / `560px` / `300px` columns (`:217`, `:241`, `:265`, `:289`, `:326`, `:363`). The title is "Fully yours — compose anything" and the promo copy has em dashes ("Renders your design exactly — token-driven", "One compositional API — borderless", `:340`, `:345`). After dismissing, a text link "Restore card" appears (`:316-322`).
- **Port:** `src/demos/card.tsx:201-224`: no playground, Basic, Selected, Grid, Outlined, Separated, Fully yours (Selected moved second). The groups fill the demo card's width; only the promo is capped (300, `:144`). The title and promo copy use colons ("Fully yours: compose anything", `:219`, `:155`, `:160`). "Restore card" is a ghost compact `Button` (`:139-143`). The four feature cards, icons, labels and descriptions, `BANNER` and `THUMB` match.
- **Workaround:** n/a.
- **Fidelity:** n/a.
- **Components it hits:** just this one.
