# scroll-area

Original: `registry/base/scroll-area.tsx` plus the `scroll-fade` / `scroll-divider` utilities in `app/globals.css:1087-1236`, demo in `app/docs/scrollbars/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/scroll-area.tsx`, demo in `src/demos/scroll-area.tsx`.

The Base UI behaviour rows (thumb maths, hover / scrolling state, drag, track press, wheel) are tracked in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` ("ScrollArea"); this file lists only what still looks or behaves differently.

## The edge fade is a mask, and masks are drawn on macOS only

- **Cause:** `gpuix gap` (README "Missing features": effect groups off macOS).
- **Original:** `.scroll-fade` / `.scroll-fade-x` are a CSS `mask-image` on the viewport whose end alphas follow a scroll timeline; browsers without scroll timelines (Firefox) get no fade (`app/globals.css:1087-1093`, `:1198-1235`).
- **Port:** `maskImage` on the viewport, a linear gradient rebuilt from the `onScroll` offset with the same ramps (alpha 1 at the true start / end, 0 once 48px lie past the edge, `src/components/scroll-area.tsx:81-111`, `:230`). The earlier overlay gradient in the surface colour is gone, so the content itself dissolves, as on the web.
- **gpuix lacks:** a mask on Windows and Linux. `maskImage` is an effect group (`FORK.md` area D), built on macOS in zed's `gpui_apple`; the WGSL and HLSL paths are unproven. There a masked viewport paints without the fade.
- **Workaround:** none needed on macOS.
- **Fidelity:** exact on macOS (apart from `Math.min(fadeSize, length / 2)` at `:104`, which the CSS does not do for a viewport under 96px); no fade elsewhere. A new gradient string is built on every scroll event. A `both` area fades vertically only, as the single class does on the web.
- **Components it hits:** any `ScrollArea` with `fade`.

## A vertical area's content box is `width: 100%`, not `min-width: fit-content`

- **Cause:** `port choice` (the source's sidebar override applied to every vertical area; the web and gpuix agree on `fit-content`, so it is not a gpuix gap).
- **Original:** `Content` keeps Base UI's inline `min-width: fit-content`, which grows to a truncating label's full text width (CSS gives its `max-content`, since an `overflow: hidden` flex item still contributes its text to `min-content`); the source's `SidebarContent` forces `[&>div]:!block [&>div]:!min-w-0` on the viewport's child so rows truncate (`registry/base/sidebar.tsx:293-297`). Other vertical areas keep `fit-content`.
- **Port:** vertical-only areas get `width: "100%"` and the horizontal and both-axis ones keep `minWidth: "fit-content"` (`src/components/scroll-area.tsx:244-246`). gpuix resolves `fit-content` as the web does (measured: a column holding a row with a truncating label came out 393px in a 200px viewport, Chrome 374px; `width: "100%"` gives 200px in both).
- **Workaround:** n/a.
- **Fidelity:** approximated (a vertical area whose content has an unbreakable child wider than the viewport grows on the web and is clamped here; the overflow is clipped by the viewport either way, since a vertical area draws no horizontal thumb).
- **Components it hits:** every vertical `ScrollArea`; only the sidebar content differs visibly (truncation).

## The thumb's 2px nudge is a `left` / `top`, not a translate

- **Cause:** `gpuix gap` (no transforms: [README "Missing features", first row](../README.md#missing-features)).
- **Original:** `-translate-x-0.5` / `-translate-y-0.5` on the thumb (`registry/base/scroll-area.tsx:152-155`).
- **Port:** `left` / `top` animates 1 to 0 with the width / height (`src/components/scroll-area.tsx:181-208`), inside a `<MotionConfig reducedMotion="never">`: the source widens the thumb with a CSS `transition-[background-color,width,height]` (`registry/base/scroll-area.tsx:147`), which reduced motion does not touch, so it keeps easing there and here.
- **Workaround:** the same offset on a layout prop.
- **Fidelity:** exact (end states and timing match).
- **Components it hits:** just this one.

## Touch-primary devices keep the custom scrollbar

- **Cause:** `port choice` (desktop only: the audit notes gpuix has no touch input; `useTouchPrimary` is not ported).
- **Original:** on touch-primary devices the Base UI tree is replaced by a native-overflow `div` (`role="group"`, `aria-roledescription="scroll area"`, `tabIndex=0`) and `ScrollBar` renders nothing (`registry/base/scroll-area.tsx:49-75`, `:109-112`; `registry/default/hooks/use-touch-primary.tsx`).
- **Port:** one path, the drawn scrollbar (`src/components/scroll-area.tsx:138-260`).
- **Workaround:** n/a.
- **Fidelity:** dropped (no touch path).
- **Components it hits:** just this one.

## Keyboard scrolling is re-implemented

- **Cause:** `port choice` (reason not stated). gpuix already scrolls the nearest scroller on arrows, Page, Home, End and Space unless `preventDefault`ed (`FORK.md:653-654`), so the handler duplicates a default.
- **Original:** the viewport is a tab stop while it overflows and the browser scrolls it with the keys (Base UI `Viewport:367-369`; FF sets no `tabIndex` of its own on the Base UI path, `registry/base/scroll-area.tsx:83-92`); keys typed in a descendant input or listbox do not scroll it.
- **Port:** `onKeyDown` on the viewport maps arrows (40px), Page keys and Space (87.5% of the view), Home and End to `scrollTo`, and calls `preventDefault` (`base-ui:src/scroll-area/root/use-scroll-area-root.ts:182-197`, `onKeyDown`). It acts only when the viewport itself is the focused element and the key is not already `defaultPrevented`, so an input inside keeps Space, arrows and Home / End, and a child that handles arrows itself does not also scroll the area (`scripts/check-scroll-area.tsx`).
- **Workaround:** n/a.
- **Fidelity:** exact for the keys it maps; the rest of gpuix's own defaults are unreachable because the handler `preventDefault`s the mapped keys.
- **Components it hits:** just this one.

## Props: class names, `ref` and div props are gone

- **Cause:** `port choice` (no CSS classes in gpuix; `fade` and `divider` stand in for `scroll-fade` / `scroll-divider`).
- **Original:** `className`, `viewportClassName`, `ref`, any `<div>` prop, and a separately exported `ScrollBar` (`registry/base/scroll-area.tsx:29-33`, `:164`).
- **Port:** `width`, `height`, `style` (border and radius), `testId`, `fade`, `fadeSize`, `divider`; no `ref`, `aria-*` or `ScrollBar` export (`src/components/scroll-area.tsx:39-62`).
- **Workaround:** n/a.
- **Fidelity:** approximated (the fade is on only for the vertical axis, or the horizontal one of a horizontal area; the web picks per class).
- **Components it hits:** just this one.

## The sidebar and the command menu do not use it

- **Cause:** `not ported yet`.
- **Original:** the sidebar content and the command-menu list are a `ScrollArea` with `scroll-divider` and `scroll-fade` (`registry/base/sidebar.tsx:297-301`, `registry/default/command-menu.tsx:1069-1138`).
- **Port:** both use a bare `overflowY: "scroll"` scroller (`src/components/sidebar.tsx:608-632`, `src/components/command-menu.tsx:958`); the `divider` prop has no consumer.
- **Workaround:** gpuix's own overlay bar; the sidebar draws fixed hairlines.
- **Fidelity:** dropped for those two components.
- **Components it hits:** sidebar, command-menu (see their drift files).

## Demo: "The problem" is static and smaller

- **Cause:** the script is `not ported yet` (the component has no way to be driven, below); the size and copy are `port choice` (reason not stated).
- **Original:** two 256 x 224 lists (`h-56 w-64`) with a scripted fake cursor that slides in, scrolls down and back and leaves, feeding pointer events to the `ScrollArea` (`app/docs/scrollbars/page.tsx:248-262`, `:262-370`). Captions: "The native scrollbar hides until you scroll, so the list looks cut off" and "ScrollArea shows its scrollbar on hover and fades the edges", each with a leading X / check mark (`:347-366`).
- **Port:** 256 x 168, no cursor script; captions "Plain overflow: nothing says there is more below" and "ScrollArea: scrollbar on hover, faded edges" (`src/demos/scroll-area.tsx:142-165`). The plain panel is `overflowY: "scroll"`, so it shows gpuix's overlay bar, not a hidden macOS one.
- **Why not in the demo:** `ScrollArea` takes its hover and scroll offset only from real pointer and wheel events: no `ref`, no hover prop, no controlled offset (`src/components/scroll-area.tsx:39-62`). A demo cannot feed it a scripted cursor the way the source dispatches `pointermove` and sets `scrollTop` (`page.tsx:283-309`), and a cursor drawn over the lists with the thumb left unshown would be fake.
- **Workaround:** none without a component change.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Demo: the horizontal strip needs an explicit height

- **Cause:** `port choice` (reason not stated; the viewport is `height: 100%` of the root, `src/components/scroll-area.tsx:232`).
- **Original:** `className="w-full"`, no height; the strip is as tall as its tiles (80 + 24 padding, `app/docs/scrollbars/page.tsx:380-405`).
- **Port:** `height={104}` (`src/demos/scroll-area.tsx:171`). Tiles, gap, padding, radius and the faded edges match.
- **Workaround:** the caller passes the height.
- **Fidelity:** exact at that height; an auto-height area is not supported.
- **Components it hits:** just this one.

## Demo: the both-axis table is hand-built, shorter, and framed

- **Cause:** `port choice` (reason not stated; the port's `Table` can overflow the viewport when its cells carry widths, as the Scrollbars page's "Double overflow" does, `src/pages/scrollbars/demos.tsx:251-301`, so the hand-built rows are not needed).
- **Original:** the real `Table` / `TableRow index` / `TableCell` inside `ScrollArea orientation="both"`, `h-80 w-full` = 320px tall, no frame, full month names, `text-right tabular-nums` cells (the port has both on the numbers), row hover from the table (`app/docs/scrollbars/page.tsx:422-462`, snippet `:149-180`).
- **Port:** flex rows of local `Cell`s (36px rows, 104 / 80px columns), 132px tall, inside a bordered 12px-radius frame, month names cut to three letters, no row hover (`src/demos/scroll-area.tsx:99-130`, `:204-264`).
- **Workaround:** fixed column widths, `flexShrink: 0` rows.
- **Fidelity:** approximated.
- **Components it hits:** table (README "Missing features": `display: table`).

## Demo: variants added, and docs prose dropped

- **Cause:** `port choice` (the extra cards are test fixtures; reason for dropping the prose not stated).
- **Original:** sections The problem, The scrollbar, The fade, Examples (Horizontal, Double overflow), API reference, with code snippets and a PropsTable; no divider, rounded-clip or nested examples (`app/docs/scrollbars/page.tsx:492-580`).
- **Port:** the first, horizontal and both-axis cards, plus "Rounded clip" (28px radius, with and without the fade), "Scroll divider" and "Nested scroll areas" (`src/demos/scroll-area.tsx:267-324`). No prose, no snippets, no API table, no `R` shape toggle hint.
- **Workaround:** n/a.
- **Fidelity:** all source variants present (the standalone fade is the last card, 288 x 256 as `w-72 h-64`), except the cursor script (above).
- **Components it hits:** every demo.
