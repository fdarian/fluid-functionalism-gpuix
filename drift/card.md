# card

Original: `registry/default/card.tsx`, demo in `app/docs/card/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/card.tsx`, demo in `src/demos/card.tsx`.

Ported: Card, CardGroup (stacked / inline, 1 or 2+ columns, borderless / outlined, separated), the magnetic fluid hover in one and two dimensions (`createFluidHover`, `axis: "xy"` for grids), gap click (16px), the selected fill with the weight-changing title, hairline dividers that drop beside the lit or selected card, dismissible cards, CardMedia (icon tile, logo, logo pair), CardImage, CardFeature, CardButton (primary, secondary, ghost, link). `screenshots/card/` has the standard captures plus `grid-*`, `separated-and-outlined` and `promo-chip-hover`.

Checked with no drift: paddings and gaps of Card, CardHeader, CardContent, CardFooter and the inline-image column (16 / 12, 14 / 10, 12 / 10, gap 8), the 60px minimum height, the 32px media tile and its icon (18 / 16), the logo pair rule, the 160px inline image, the 1px inset image outline, dismiss chip size and position (28px at 8 / 8, icon 15 / 13), CardButton height, padding and glyphs (28, 10, 14 / 12, arrow 13), the four CardButton fills (`bg-foreground/90`, `bg-accent/80`, `bg-hover`, `bg-active` resolved as alphas), hairline colours (`border-border/60` is `borderFaint`), highlight and selected radii (12), type (subtitle 14/20, 13/18; caption 12/16, 11/14), dark tokens.

## Link cards: `href`, `external` and `CardButton` `href`

- **Cause:** `not ported yet`.
- **Original:** `Card` with `href` renders a stretched `<Link>` (new tab for `external`); `CardButton` with `href` renders a `<Link>` (`:226-232`, `:350-359`, `:981-993`).
- **Port:** no `href` or `external` on `Card` (`src/components/card.tsx:247-261`); `CardButton` has `external` only for the arrow glyph (`:930`, `:1012-1021`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## ARIA and alt text

- **Cause:** `not ported yet`.
- **Original:** the overlay button has `aria-label={label}` and `aria-pressed={selected || undefined}` (`:363-365`); a disabled card gets `aria-disabled` (`:413`) and drops the overlay; `CardMedia` and `CardImage` pass `alt` (`logoAlt`, `alt`, `:752-756`, `:804-806`).
- **Port:** the overlay gets `aria-label` and `aria-pressed` (only while selected) when the card is clickable and enabled, and the root `aria-disabled` when disabled (`src/components/card.tsx`, `Card`); `scripts/check-card.tsx` reads role `Button`, the label and `toggled` off the accessibility tree. The test renderer shows no node at all for a disabled or informational card (a plain `div`), so `aria-disabled` on the disabled root is set but not observed. The `<img>` elements get no `alt` (`:755-766`, `:799-814`) although `ImgProps` has it (`packages/native/js/host.ts:1435`).
- **Workaround:** none.
- **Fidelity:** exact on the root; `alt` dropped.
- **Components it hits:** just this one.

## Cursor over a clickable card

- **Cause:** `port choice` (reason not stated).
- **Original:** the overlay `<button>` has no `cursor-pointer` class (`:361-367`) and Tailwind v4's preflight resets buttons to `cursor: default`, so by the CSS a clickable card shows the arrow; a `href` card (an `<a>`) shows the hand. Not run in a browser.
- **Port:** `cursor: "pointer"` on the overlay of every clickable, enabled card (`src/components/card.tsx`, the overlay in `Card`).
- **Workaround:** n/a.
- **Fidelity:** approximated (unverified).
- **Components it hits:** just this one.

## Keyboard focus ring on a tile

- **Cause:** `port choice` (reason not stated).
- **Original:** the ring is `ring-1` on the overlay, inside a card that is `overflow-hidden` when it is a tile (standalone, or separated and outlined, `:339-343`), so by the CSS the 1px ring that falls outside the card is clipped away. A card in a plain group shows it. Not run in a browser.
- **Port:** the overlay's outline is offset -1 on a tile, so it falls inside the box and shows; offset 0 on any other card, as in the source, where inside an outlined, non-separated group the group's `overflow: "hidden"` clips it (`src/components/card.tsx`, the overlay in `Card`).
- **Workaround:** n/a.
- **Fidelity:** approximated (the port shows a ring the source probably does not).
- **Components it hits:** just this one.

## The chip over media has no backdrop blur

- **Cause:** `not ported yet`.
- **Original:** `bg-card/70 backdrop-blur-sm hover:bg-card` when the card has a `CardImage` (`:492-494`).
- **Port:** the 70% alpha alone (`src/components/card.tsx:51-52`, `:560-565`). The comment says gpuix has no backdrop blur; it has `backdropFilter` (`packages/native/js/host.ts:662-665`, `FORK.md:788-789`, effect groups, macOS).
- **Workaround:** the alpha.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## An inline dismissible card does not leave room for the chip

- **Cause:** `not ported yet`.
- **Original:** inline cards with `dismissible` give `card-header` `pr-10` (while the chip is revealed, or always with `dismissOnHover={false}`) so the single-line title does not run under it (`:430-438`).
- **Port:** `CardHeader` knows nothing of the chip (`src/components/card.tsx:583-613`); the chip overlays the text. No demo uses an inline dismissible card.
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## `CardAction` is pinned over the header instead of taking a grid column

- **Cause:** `not ported yet`.
- **Original:** `CardHeader` is a grid that gains a `1fr auto` template when a `card-action` is present; the action sits in column 2 spanning both rows, so the title and description make room (`:537`, `:650`).
- **Port:** `CardAction` is `position: absolute; top: 0; right: 0` on a column flex (`src/components/card.tsx:662-675`, `:583-613`); long text runs under it. gpuix has grid. No demo uses `CardAction`.
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Titles never wrap and cannot truncate

- **Cause:** `port choice` (reason not stated; the visible title is absolutely positioned over the invisible semibold copy, which needs both on one line. `CardTitle` does not use `StableLabel`, whose inline-grid wraps like the source's).
- **Original:** the title wraps normally; a consumer's `truncate` ellipsizes it (`:569-609`).
- **Port:** both copies are `whiteSpace: "nowrap"` (`src/components/card.tsx:630`, `:641`); a long title is clipped by a tile or runs past the column. The parts take no `className`, so there is no `truncate`. gpuix has `textOverflow: "ellipsis"` (`host.ts:757`).
- **Workaround:** none.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Font weight cannot be eased

- **Cause:** `gpuix gap`.
- **Original:** `transition-[font-variation-settings]` eases the title between regular and semibold when the card is selected (`:596-605`); the site's semibold is the variable `wght 550`.
- **Port:** the weight switches at once between 400 and the nearest static cut, SemiBold 600 (`src/components/card.tsx:620-649`); the invisible semibold copy in flow keeps the row from reflowing.
- **gpuix lacks:** variable-font axes: fonts render only their default instance, so there is one static file per weight and nothing to interpolate (`~/code/fdarian/gpuix/README.md:757`, `:6388`; `src/lib/fonts.ts`). README "gpuix gaps", card and table row.
- **Workaround:** static cuts.
- **Fidelity:** approximated (no easing, 600 for 550).
- **Components it hits:** every `StableLabel` (`src/lib/stable-label.tsx`): tabs, tabs-subtle, sidebar, menu rows; `CardTitle` does the same with its own pair of copies (above); also `CardFeature`'s title (semibold 550 in the source, `:886`).

## CSS transforms (the external-link arrow)

- **Cause:** `gpuix gap`.
- **Original:** the link button's arrow is an arrow-right with `-rotate-45` (`:958`).
- **Port:** the arrow-up-right glyph is drawn instead (`src/components/card.tsx:40`, `:1012-1021`).
- **gpuix lacks:** `rotate` (no `transform`; `~/code/fdarian/gpuix/FORK.md:1198-1209`). README "gpuix gaps", CSS transforms row.
- **Workaround:** the glyph swap.
- **Fidelity:** exact for the resting pose, no rotation tween.
- **Components it hits:** any rotated glyph.

## The highlight travels on `top` / `left`, not a transform

- **Cause:** `gpuix gap`.
- **Original:** `FluidHoverHighlight` moves with `x` / `y` transforms on the compositor (`registry/default/fluid-hover-highlight.tsx:72-76`, `:120-133`).
- **Port:** `FluidHighlight` animates `top`, `left`, `width` and `height` (`src/lib/fluid-highlight.tsx:10-17`, `:92-99`), re-laying out per frame.
- **gpuix lacks:** transforms (`FORK.md:1198-1209`); see the CSS transforms row in README.
- **Workaround:** layout props.
- **Fidelity:** approximated (same path and spring, more work per frame).
- **Components it hits:** every fluid hover list.

## Label is not trimmed to cap height

- **Cause:** `gpuix gap`.
- **Original:** `[text-box:trim-both_cap_alphabetic]` on the inline-card title, `CardFeature`'s title and `CardButton`'s label (`:564-565`, `:883`, `:965`).
- **Port:** no trim (`src/components/card.tsx:620-649`, `:896-902`, `:996-1006`).
- **gpuix lacks:** `text-box-trim`; README "gpuix gaps", badge row.
- **Workaround:** none.
- **Fidelity:** approximated (about a pixel).
- **Components it hits:** see `drift/badge.md`.

## The link variant underlines at the default offset

- **Cause:** `gpuix gap`.
- **Original:** `underline-offset-4` and `hover:underline` (`:915`).
- **Port:** `textDecoration: "underline"` on hover (`src/components/card.tsx:1005-1007`).
- **gpuix lacks:** an underline offset: `StyleDesc` has `textDecoration`, `-Line`, `-Style`, `-Color`, `-Thickness` and nothing for the offset (`packages/native/js/host.ts:766-776`; searched `packages/native/src` and `js`).
- **Workaround:** none.
- **Fidelity:** approximated (the line sits closer to the text).
- **Components it hits:** any `underline-offset-*`.

## The image rounds its own corners to the tile

- **Cause:** `port choice` (reason not stated; the tile also sets `overflow: "hidden"` and a radius at `:366-367`).
- **Original:** the image is `rounded-[2px]` and the tile's `overflow-hidden` + radius clips its outer corners (`:339-343`, `:813-815`).
- **Port:** `tileCorner()` hands the tile radius (minus 1 for a frame) to the image's outer corners and keeps 2px on the rest (`src/components/card.tsx:328-332`, `:814-829`).
- **Workaround:** n/a.
- **Fidelity:** exact in the cases checked by reading (stacked, inline, framed, borderless); the screenshots were not diffed.
- **Components it hits:** just this one.

## An explicit `size` does not scope the parts inside

- **Cause:** `not ported yet` (the port has no provider; the ambient size is the Size row, `sizeChoice()` in `src/lib/theme.ts`).
- **Original:** `size` wraps the card in a `SizeProvider`, so a nested `Button`, `Badge` and the rest follow (`registry/default/card.tsx:244-247`, `:276`, `:515`).
- **Port:** An omitted `size` follows the Size row (`src/components/card.tsx:267`); `compact` covers the card's own parts only, and nothing is provided to children.
- **Workaround:** pass `size` to each nested component.
- **Fidelity:** approximated.
- **Components it hits:** every component with a `size` prop.

## No `className`, `style`, `ref` or HTML attributes; `outlined` stands in for a border class

- **Cause:** `port choice` (reason not stated; Solid components with fixed prop lists).
- **Original:** every part forwards `className` and the HTML attributes; the promo demo gives `Card` `border border-border/60 overflow-hidden rounded-xl` and `CardContent` `flex flex-col gap-3` (`app/docs/card/page.tsx:330`, `:336`).
- **Port:** a standalone `Card` takes `outlined` for the frame (`src/components/card.tsx:255-256`, `:368-370`) and the demo wraps `CardContent`'s children in a 12px-gap column (`src/demos/card.tsx:228-241`). Parts take `children` only; `CardMedia` has no `className`.
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

## Playground: the Get code dialog and the preview frame

- **Cause:** `port choice` (the preset install flow and the Code tab have no counterpart in the port).
- **Original:** the rail ends with a "Get code" dialog that bit-packs the whole configuration into a preset code (`lib/docs/playgrounds/card.tsx:200-215`, `:316-320`) and the preview sits in `ComponentPreview` with a Preview / Code tabs pair and a snippet kept in sync (`app/docs/card/page.tsx:384-398`, `buildPlaygroundCode`).
- **Port:** every other control, default and the shuffle are ported (Media, Description, the three buttons, Orientation, Columns, Border, Separated, Fluid hover, Selected; the forced-Separated for Image, the single column for Inline, the six items at three columns). No Get code, no URL-synced preset, no snippet. The preview is the shared `DemoCard` frame with a 600 px minimum, the group capped at 560 px and centred (`src/demos/card.tsx`, `Playground`).
- **Workaround:** none.
- **Fidelity:** dropped (Get code, snippet), approximated (frame).
- **Components it hits:** every playground.
