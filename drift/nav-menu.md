# nav-menu

Original: `registry/default/nav-menu.tsx` and `registry/default/nav-item.tsx` (the source's own concept screens import them from `components/ui/`), in fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`. Ported in `src/components/nav-menu.tsx` and `src/components/nav-item.tsx`. There is no demo and no docs page in the source either: only the `/concepts` screens use them (`src/pages/concepts.tsx`, `src/pages/concepts/frame.tsx`), so the port has no `src/demos/` entry.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps (CSS transforms, variable-font axes, `text-box-trim`, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of repeating it.

Checked and equal: row height 32 / 28 (compact), `px` 12, icon 16 / 14 with an 8px gap, type 13/20 and 12/18, the hover highlight born at the active route's row when the pointer enters (`from`), the active-route background on `moderate`, the hover highlight on `fast`, the travelling focus ring (2px outset, shown for keyboard focus only), arrow keys (both axes, wrapping), Home / End, roving tab stop (the active route holds it; with no active route the first item does), `aria-current="page"`, label going semibold on the active route with a hidden semibold copy reserving the width, light and dark tokens, Radius and Size following the customise card.

## `slug` and `onClick` replace `href` and Next's `Link`

- **Cause:** `port choice` (the app has no URLs; a page is a slug, `src/lib/page-nav.ts`).
- **Original:** `NavItem` is a `Link` with `href`; `NavMenu activeSlug` is compared with each item's `href` (`nav-item.tsx:15`, `:41`, `nav-menu.tsx:42`).
- **Port:** `NavItem` takes `slug` for the comparison and `onClick` for the navigating (`nav-item.tsx:29-41`); the row is a `div` with `role="link"` and a tab stop. Enter and Space click it, as on a link and a button (`buttonProps`).
- **Workaround:** none.
- **Fidelity:** approximated (no middle-click, no status-bar URL, no prefetch).
- **Components it hits:** just these.

## `index` stays explicit and must be contiguous from 0

- **Cause:** `port choice` (reason not stated).
- **Original:** the same: each item passes its own `index` (`nav-item.tsx:16`). The source's arrow keys walk the DOM order of `a[data-nav-index]`, so a gap would be harmless there.
- **Port:** arrow keys, Home and End use the count of registered rows as the last index (`nav-item.tsx:75-98`), so a gap in `index` (or a repeated one) lands on the wrong row.
- **Workaround:** none; `concepts.tsx` and `frame.tsx` pass 0..n-1.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## The active background fades in; the source places it

- **Cause:** `not ported yet` (`FluidHighlight` always starts at opacity 0).
- **Original:** the active-route background has `initial={false}`, so it is on the first frame at its row, and only later route changes glide it (`nav-menu.tsx:159-171`).
- **Port:** `FluidHighlight` mounts at opacity 0 and the spring brings it to 1 (`src/lib/fluid-highlight.tsx:51-67`), so a frame mounted on a concept page shows the active row's fill coming in over about 160 ms.
- **Workaround:** none.
- **Fidelity:** approximated (a 160 ms fade on mount only).
- **Components it hits:** sidebar, dropdown (any `FluidHighlight` that is mounted already on).

## Semibold is 600, no `text-box-trim`

- **Cause:** `gpuix gap` for variable weight and `text-box-trim`. Same entry as [tabs-subtle.md, "Semibold is 600, no `text-box-trim`"](tabs-subtle.md).
- **Original:** the label eases its weight with its colour over 80 ms, both labels trimmed (`nav-item.tsx:99`).
- **Port:** SemiBold 600 switching at once, line-box centring in a fixed-height row (`nav-item.tsx:155-162`). The colour and stroke-width eases are ported (`fade`, `easeStroke`).
- **Workaround:** the hidden semibold copy (`StableLabel`) reserves the width.
- **Fidelity:** approximated.
- **Components it hits:** tabs, tabs-subtle, select, sidebar.

## The status dot sits in the flex row, and the label truncates

- **Cause:** `port choice` (a flex `gap` of 8 stands in for the source's `ml-2` inline dot).
- **Original:** `isNew` / `isUpdated` render a 6px dot after the label text, inside the label's grid (`nav-item.tsx:110-119`), and a long label is not truncated.
- **Port:** the dot is its own flex child after the label (`nav-item.tsx:166-179`); a row with a dot hugs its label, otherwise the label fills the row and ends in an ellipsis (`StableLabel` `truncate`, `nav-item.tsx:164`). `isUpdated` and `isNew` are both blue by default, as in the source; `dotColor` is `dotColorClass` as a colour (`nav-item.tsx:38`, `:69-73`).
- **Workaround:** none.
- **Fidelity:** approximated (the dot is no longer inline in the text).
- **Components it hits:** just this one.

## Focus leaving the menu keeps the hover fill while the pointer is inside

- **Cause:** `port choice` (the pattern `tabs-subtle.tsx` uses).
- **Original:** a blur to somewhere outside the `nav` clears the hover target and the ring (`nav-menu.tsx:121-126`), whatever the pointer does.
- **Port:** a blur clears the ring at once; the hover target is cleared only if the blur's `relatedTarget` is not an item and the pointer is outside the menu (`nav-item.tsx`).
- **Workaround:** none.
- **Fidelity:** approximated (a pointer resting on the menu keeps its hover fill after Tab leaves).
- **Components it hits:** tabs-subtle.

## API surface: `className`, ref, HTML props, `size`

- **Cause:** `port choice` (reason not stated).
- **Original:** `NavMenu` and `NavItem` forward refs and spread HTML attributes, and `NavItem` takes `className` (`nav-menu.tsx:42`, `nav-item.tsx:13-26`). `NavItem` reads the ambient size from `SizeProvider`.
- **Port:** props are only `activeSlug`, `aria-label` and `testId` on the menu, and `label`, `slug`, `index`, `icon`, `isNew`, `isUpdated`, `dotColor`, `onClick`, `testId` on the item. There is no `size` prop and no provider: both follow the Size row (`sizeChoice()`, `nav-item.tsx:58`).
- **Workaround:** none.
- **Fidelity:** dropped.
- **Components it hits:** most of the port.
