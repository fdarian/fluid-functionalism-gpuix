# tooltip

Original: `registry/base/tooltip.tsx` (the docs page `app/docs/tooltip/page.tsx` imports the radix one, same API), demo in `app/docs/tooltip/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tooltip.tsx`, demo in `src/demos/tooltip.tsx`.

The Base UI behaviour rows (hover intent, skip delay, focus, press, Escape) are tracked in `BASE-UI-AUDIT.md` ("Tooltip"); this file lists only what still looks or behaves differently.

## The safe polygon needs pointer positions over bare window background

- **Cause:** `gpuix gap`.
- **Original:** the popup is hoverable and Base UI's `safePolygon()` keeps it open while the pointer crosses the gap between trigger and popup, whatever is under the pointer there (`registry/base/tooltip.tsx:222-233`; the polygon is Base UI's default).
- **Port:** a grace timer. Leaving the trigger or the chip schedules a close after `GRACE_MS` (80 ms) unless the pointer reaches the chip or comes back (`src/components/tooltip.tsx:28`, `scheduleClose` `:162-168`, wrapper leave `:239-242`, chip enter / leave `:271-278`).
- **gpuix lacks:** pointer moves over empty space. `window` / `document` `mousemove` listeners fire only when some element on the hit path has a mousemove listener, never over the bare window background, so the polygon cannot be tracked (README "Bugs" table, tooltip row).
- **Workaround:** the grace timer above.
- **Fidelity:** approximated (a pointer that takes longer than 80 ms to cross the 8px gap loses the tooltip).
- **Components it hits:** dropdown submenus (the same polygon).

## The slide and the follow-cursor offset are not transforms

- **Cause:** `gpuix gap` (no transforms: [README "Missing features", first row](../README.md#missing-features)).
- **Original:** the chip enters and exits with `x` / `y` (4px) plus opacity (`registry/base/tooltip.tsx:282-291`); `followCursor` drives a `y` / `x` motion value on the outer box (`:205-219`, `:262-269`). There is no scale on the tooltip, so the README row's "`scaleY: 0.96`" does not apply to it.
- **Port:** the chip animates `top` / `left` (`slideFrom`, `src/components/tooltip.tsx:66-77`, chip `initial` / `animate` `:279-284`); `followCursor` passes the pointer offset to `<anchored offset>` (`:202-212`, `:259`).
- **gpuix lacks:** `transform`, so `translate` / `x` / `y` cannot animate; only layout props can.
- **Workaround:** `top` / `left` tweens, which re-lay out per frame.
- **Fidelity:** approximated (same distance and timing; a layout change per frame instead of a compositor transform).
- **Components it hits:** every popup that slides in (select, combobox, dropdown, color-picker, dialog).

## Pill shape is not ported

- **Cause:** `not ported yet` (README "Not ported there: pill shape").
- **Original:** the chip uses `shape.bg`: `rounded-lg` (8px) or `rounded-[20px]` under a pill `ShapeProvider` (`registry/base/tooltip.tsx:278`, `registry/default/lib/shape-context.tsx:51-79`).
- **Port:** a fixed `radius.item` = 8px (`src/components/tooltip.tsx:292`, `src/lib/theme.ts:281`).
- **Workaround:** none.
- **Fidelity:** exact in the default shape; dropped for pill.
- **Components it hits:** every component that reads `useShape`.

## The label is centred by its full line box

- **Cause:** `gpuix gap` ([README, badge row](../README.md#missing-features): `text-box-trim`).
- **Original:** `[text-box:trim-both_cap_alphabetic]` with `py-2` where supported, `py-1` elsewhere, for about 24px overall (`registry/base/tooltip.tsx:273-277`).
- **Port:** `paddingTop` / `paddingBottom` 4 around the caption's 16px line, 24px overall (`src/components/tooltip.tsx:293-296`, `src/lib/theme.ts:271`).
- **gpuix lacks:** `text-box-trim` / `text-box-edge`.
- **Workaround:** the height matches; the glyphs sit about a pixel off the trimmed centre.
- **Fidelity:** approximated.
- **Components it hits:** badge and any trimmed label.

## Semibold in rich content is 600, not 550

- **Cause:** `gpuix gap` (static font weights: [README, variable-font row](../README.md#missing-features)).
- **Original:** `fontWeights.semibold` (550) on the rich title (`app/docs/tooltip/page.tsx:151`).
- **Port:** `weight.semibold` = 600 (`src/demos/tooltip.tsx:94`).
- **Workaround:** the nearest static cut.
- **Fidelity:** approximated (one weight step).
- **Components it hits:** every semibold label.

## The trigger is wrapped in a `div`

- **Cause:** `port choice` (the wrapper hears hover, press and focus through bubbling, `src/components/tooltip.tsx:81`; there is no `render={children}` / ref merging).
- **Original:** `TooltipPrimitive.Trigger render={children}` puts the handlers on the child itself, with no extra box (`registry/base/tooltip.tsx:229-233`).
- **Port:** a `display: flex; flexShrink: 0; position: relative` wrapper around the child (`src/components/tooltip.tsx:231-247`).
- **Workaround:** none. A trigger that relied on `flex: 1`, `width: 100%` or a parent's `gap` / `:first-child` rules sees the wrapper instead of itself.
- **Fidelity:** approximated.
- **Components it hits:** every tooltip trigger (queued-stack, input-copy, input-message, color-picker).

## A string label never wraps

- **Cause:** `port choice` (reason not stated).
- **Original:** the label wraps at the room the popup has (`registry/base/tooltip.tsx:276`, no `whitespace-nowrap`).
- **Port:** `whiteSpace: "nowrap"` on the caption text (`src/components/tooltip.tsx:303-308`), so a long label flips to the far side (demo "Near the window edge", `src/demos/tooltip.tsx:132-143`) or runs off the window instead of wrapping.
- **Workaround:** none; rich content (JSX) wraps as its own text does.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Escape closes the tooltip before a dialog behind it

- **Cause:** `port choice` (settled in `BASE-UI-AUDIT.md` "Tooltip", the tooltip joins gpuix's dismiss-layer stack).
- **Original:** Base UI's tooltip and dialog are separate document-level listeners, so one Escape most likely closes both (`BASE-UI-AUDIT.md` reading; not run).
- **Port:** `<DismissableLayer onEscapeKeyDown={dismiss}>` while a hover-opened tooltip is open; a `forceOpen` one is not a layer (`src/components/tooltip.tsx:249-252`).
- **Workaround:** n/a.
- **Fidelity:** approximated (two Escapes to close both).
- **Components it hits:** dialog, mobile-drawer.

## A trigger that is several focusable controls is not handled

- **Cause:** `not ported yet`.
- **Original:** Base UI keeps a focus-opened tooltip when focus moves between elements inside one trigger (`BASE-UI-AUDIT.md` "Tooltip", keyboard row).
- **Port:** `onFocusOut` closes on any focus-out (`src/components/tooltip.tsx:226-229`).
- **Workaround:** none; every port trigger is one control.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Props that need CSS classes or a portal are gone

- **Cause:** `port choice` (there are no class names, and an `<anchored>` layer replaces the portal).
- **Original:** `className`, `contentClassName`, `TooltipPortalContainer`, `children: ReactElement` (`registry/base/tooltip.tsx:23-37`, `:87-107`).
- **Port:** none of them; `testId` is added and `children` is any JSX (`src/components/tooltip.tsx:79-94`). The chip cannot be restyled by a caller.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: follow-cursor areas are smaller and the y label is stacked

- **Cause:** the label is `gpuix gap` (no transforms, [README](../README.md#missing-features)); the sizes are `port choice` (reason not stated).
- **Original:** x area `h-12 w-64` = 48 x 256, y area `h-40 w-12` = 160 x 48 with `rotate-90` "Move along me" (`app/docs/tooltip/page.tsx:167`, `:172-174`).
- **Port:** 248 x 48 and 48 x 96; the y label is "Move" / "along" / "me" stacked in three lines (`src/demos/tooltip.tsx:154-155`, `:45`).
- **Workaround:** the stacked words.
- **Fidelity:** approximated.
- **Components it hits:** any rotated label.

## Demo: variants and layout

- **Cause:** `port choice` (the page is one `DemoCard` of `DemoRow`s plus extra test fixtures; reason not stated).
- **Original:** five sections in the order Basic, Placement, Rich Content, Follow cursor, Delay, each with a code snippet, and an API table (`app/docs/tooltip/page.tsx:119-195`).
- **Port:** all five exist (copy identical: "Save your changes", "Keyboard shortcut", "⌘ + S", "No delay", "500ms delay", "Following x" / "y"), in the order Basic, Rich content, Delay, Placement, then Follow cursor in its own card (`src/demos/tooltip.tsx:66-157`). No code snippets, no API table, no page intro. Added: a "Clicked N times, opened N" counter (`:79-81`), "Near the window edge" (`:132-143`), "Forced open" (`:158-177`), and a `TooltipProvider` around the first card (`:67`), which the source demos do not use.
- **Workaround:** n/a.
- **Fidelity:** all source variants present.
- **Components it hits:** every demo (no code snippets or API tables in any port page).
