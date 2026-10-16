# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` / `scroll-divider` utilities in `app/globals.css:1087-1236`, demo in `app/docs/scrollbars/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

The Base UI behaviour rows (thumb maths, hover / scrolling state, drag, track press, wheel) are tracked in `BASE-UI-AUDIT.md` ("ScrollArea"); this file lists only what still looks or behaves differently.

## A horizontal or both-axis scroller does not extend its scroll width from its content

- **Cause:** `gpuix gap` (README "Bugs" table, scroll-area row; "Missing features", intrinsic width row).
- **Original:** `overflow: auto` with a `w-max` child scrolls in both axes (`app/docs/scrollbars/page.tsx:393`, `:426`); `Content` keeps `min-width: fit-content`.
- **Port:** the viewport of a horizontal or both-axis area is a flex row (`display: flex; flexDirection: row; alignItems: flex-start`, `src/components/scroll-area.tsx:510-516`) and its content box is `flexShrink: 0` (`:513-522`); a vertical area keeps `width: "100%"`.
- **gpuix lacks:** a content-sized width. `width: "max-content"` is rejected (only grid tracks take `max-content`; `FORK.md` area E, `:866-871`: it needs a layout run with max-content available space), so there is no `min-width: fit-content` for the content wrapper. `scrollWidth` counts overflowing descendants now, but a block wrapper is still clamped to the viewport width: its `onLayout` reports the viewport's width, so the area has no content size to draw a horizontal thumb from (checked: the horizontal and both-axis demos scroll but lose the x scrollbar). Only a flex item with `flexShrink: 0` takes its content's width.
- **Workaround:** the flex row above; callers give wide content `flexShrink: 0` or an explicit width (the demo's tiles and cells do, `src/demos/scroll-area.tsx:176`, `:187`, `:118`).
- **Fidelity:** exact.
- **Components it hits:** any two-axis scroller. The port's `Table` root is `width: "100%"` (`src/components/table.tsx:75`) but it does grow inside one when every cell carries a `width`, since each row's width is then the sum of its cells (the Scrollbars page's "Double overflow", `src/pages/scrollbars/demos.tsx:251-292`, `drift/scrollbars-page.md`).

## The edge fade is a mask, and masks are drawn on macOS only

- **Cause:** `gpuix gap` (README "Missing features": effect groups off macOS).
- **Original:** `.scroll-fade` / `.scroll-fade-x` are a CSS `mask-image` on the viewport whose end alphas follow a scroll timeline; browsers without scroll timelines (Firefox) get no fade (`app/globals.css:1087-1093`, `:1198-1235`).
- **Port:** `maskImage` on the viewport, a linear gradient rebuilt from the `onScroll` offset with the same ramps (alpha 1 at the true start / end, 0 once 48px lie past the edge, `src/components/scroll-area.tsx:339-369`, `:502`). The earlier overlay gradient in the surface colour is gone, so the content itself dissolves, as on the web.
- **gpuix lacks:** a mask on Windows and Linux. `maskImage` is an effect group (`FORK.md` area D), built on macOS in zed's `gpui_apple`; the WGSL and HLSL paths are unproven. There a masked viewport paints without the fade.
- **Workaround:** none needed on macOS.
- **Fidelity:** exact on macOS (apart from `Math.min(fadeSize, length / 2)` at `:359`, which the CSS does not do for a viewport under 96px); no fade elsewhere. A new gradient string is built on every scroll event. A `both` area fades vertically only, as the single class does on the web.
- **Components it hits:** any `ScrollArea` with `fade`.

## The thumb's 2px nudge is a `left` / `top`, not a translate

- **Cause:** `gpuix gap` (no transforms: [README "Missing features", first row](../README.md#missing-features)).
- **Original:** `-translate-x-0.5` / `-translate-y-0.5` on the thumb (`registry/base/scroll-area.tsx:152-155`).
- **Port:** `left` / `top` animates 1 to 0 with the width / height (`src/components/scroll-area.tsx:457-462`).
- **Workaround:** the same offset on a layout prop.
- **Fidelity:** exact (end states and timing match).
- **Components it hits:** just this one.

## Touch-primary devices keep the custom scrollbar

- **Cause:** `port choice` (desktop only: the audit notes gpuix has no touch input; `useTouchPrimary` is not ported).
- **Original:** on touch-primary devices the Base UI tree is replaced by a native-overflow `div` (`role="group"`, `aria-roledescription="scroll area"`, `tabIndex=0`) and `ScrollBar` renders nothing (`registry/base/scroll-area.tsx:49-75`, `:109-112`; `registry/default/hooks/use-touch-primary.tsx`).
- **Port:** one path, the drawn scrollbar (`src/components/scroll-area.tsx:477-541`).
- **Workaround:** n/a.
- **Fidelity:** dropped (no touch path).
- **Components it hits:** just this one.

## Keyboard scrolling is re-implemented

- **Cause:** `port choice` (reason not stated). gpuix already scrolls the nearest scroller on arrows, Page, Home, End and Space unless `preventDefault`ed (`FORK.md:584-586`), so the handler duplicates a default.
- **Original:** the viewport is a tab stop while it overflows and the browser scrolls it with the keys (Base UI `Viewport:367-369`; FF sets no `tabIndex` of its own on the Base UI path, `registry/base/scroll-area.tsx:83-92`); keys typed in a descendant input or listbox do not scroll it.
- **Port:** `onKeyDown` on the viewport maps arrows (40px), Page keys and Space (87.5% of the view), Home and End to `scrollTo`, and calls `preventDefault` (`src/components/scroll-area.tsx`, `onKeyDown`). It acts only when the viewport itself is the focused element and the key is not already `defaultPrevented`, so an input inside keeps Space, arrows and Home / End, and a child that handles arrows itself does not also scroll the area (`scripts/check-scroll-area.tsx`).
- **Workaround:** n/a.
- **Fidelity:** exact for the keys it maps; the rest of gpuix's own defaults are unreachable because the handler `preventDefault`s the mapped keys.
- **Components it hits:** just this one.

## Props: class names, `ref` and div props are gone

- **Cause:** `port choice` (no CSS classes in gpuix; `fade` and `divider` stand in for `scroll-fade` / `scroll-divider`).
- **Original:** `className`, `viewportClassName`, `ref`, any `<div>` prop, and a separately exported `ScrollBar` (`registry/base/scroll-area.tsx:29-33`, `:164`).
- **Port:** `width`, `height`, `style` (border and radius), `testId`, `fade`, `fadeSize`, `divider`; no `ref`, `aria-*` or `ScrollBar` export (`src/components/scroll-area.tsx:62-83`).
- **Workaround:** n/a.
- **Fidelity:** approximated (the fade is on only for the vertical axis, or the horizontal one of a horizontal area; the web picks per class).
- **Components it hits:** just this one.

## The sidebar and the command menu do not use it

- **Cause:** `not ported yet`.
- **Original:** the sidebar content and the command-menu list are a `ScrollArea` with `scroll-divider` and `scroll-fade` (`registry/base/sidebar.tsx:297-301`, `registry/default/command-menu.tsx:1069-1138`).
- **Port:** both use a bare `overflowY: "scroll"` scroller (`src/components/sidebar.tsx:532`, `src/components/command-menu.tsx:905`); the `divider` prop has no consumer.
- **Workaround:** gpuix's own overlay bar; the sidebar draws fixed hairlines.
- **Fidelity:** dropped for those two components.
- **Components it hits:** sidebar, command-menu (see their drift files).

## Demo: "The problem" is static and smaller

- **Cause:** the script is `not ported yet` (the component has no way to be driven, below); the size and copy are `port choice` (reason not stated).
- **Original:** two 256 x 224 lists (`h-56 w-64`) with a scripted fake cursor that slides in, scrolls down and back and leaves, feeding pointer events to the `ScrollArea` (`app/docs/scrollbars/page.tsx:248-262`, `:262-370`). Captions: "The native scrollbar hides until you scroll, so the list looks cut off" and "ScrollArea shows its scrollbar on hover and fades the edges", each with a leading X / check mark (`:347-366`).
- **Port:** 256 x 168, no cursor script; captions "Plain overflow: nothing says there is more below" and "ScrollArea: scrollbar on hover, faded edges" (`src/demos/scroll-area.tsx:138-162`). The plain panel is `overflowY: "scroll"`, so it shows gpuix's overlay bar, not a hidden macOS one.
- **Why not in the demo:** `ScrollArea` takes its hover and scroll offset only from real pointer and wheel events: no `ref`, no hover prop, no controlled offset (`src/components/scroll-area.tsx:62-83`). A demo cannot feed it a scripted cursor the way the source dispatches `pointermove` and sets `scrollTop` (`page.tsx:292-318`), and a cursor drawn over the lists with the thumb left unshown would be fake.
- **Workaround:** none without a component change.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: the horizontal strip needs an explicit height

- **Cause:** `port choice` (reason not stated; the viewport is `height: 100%` of the root, `src/components/scroll-area.tsx:503-504`).
- **Original:** `className="w-full"`, no height; the strip is as tall as its tiles (80 + 24 padding, `app/docs/scrollbars/page.tsx:380-405`).
- **Port:** `height={104}` (`src/demos/scroll-area.tsx:168`). Tiles, gap, padding, radius and the faded edges match.
- **Workaround:** the caller passes the height.
- **Fidelity:** exact at that height; an auto-height area is not supported.
- **Components it hits:** just this one.

## Demo: the both-axis table is hand-built, shorter, and framed

- **Cause:** `port choice` (reason not stated; the port's `Table` can overflow the viewport when its cells carry widths, as the Scrollbars page's "Double overflow" does, `src/pages/scrollbars/demos.tsx:251-292`, so the hand-built rows are not needed).
- **Original:** the real `Table` / `TableRow index` / `TableCell` inside `ScrollArea orientation="both"`, `h-80 w-full` = 320px tall, no frame, full month names, `text-right tabular-nums` cells (the port has both on the numbers), row hover from the table (`app/docs/scrollbars/page.tsx:422-462`, snippet `:149-180`).
- **Port:** flex rows of local `Cell`s (36px rows, 104 / 80px columns), 132px tall, inside a bordered 12px-radius frame, month names cut to three letters, no row hover (`src/demos/scroll-area.tsx:99-128`, `:201-261`).
- **Workaround:** fixed column widths, `flexShrink: 0` rows.
- **Fidelity:** approximated.
- **Components it hits:** table (README "Missing features": `display: table`).

## Demo: variants added, and docs prose dropped

- **Cause:** `port choice` (the extra cards are test fixtures; reason for dropping the prose not stated).
- **Original:** sections The problem, The scrollbar, The fade, Examples (Horizontal, Double overflow), API reference, with code snippets and a PropsTable; no divider, rounded-clip or nested examples (`app/docs/scrollbars/page.tsx:492-580`).
- **Port:** the first, horizontal and both-axis cards, plus "Rounded clip" (28px radius, with and without the fade), "Scroll divider" and "Nested scroll areas" (`src/demos/scroll-area.tsx:264-321`). No prose, no snippets, no API table, no `R` shape toggle hint.
- **Workaround:** n/a.
- **Fidelity:** all source variants present (the standalone fade is the last card, 288 x 256 as `w-72 h-64`), except the cursor script (above).
- **Components it hits:** every demo.
