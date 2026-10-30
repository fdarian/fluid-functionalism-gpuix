# tooltip

Original: `registry/base/tooltip.tsx` (the docs page `app/docs/tooltip/page.tsx` imports the radix one, same API), demo in `app/docs/tooltip/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tooltip.tsx`, demo in `src/demos/tooltip.tsx`.

The Base UI behaviour rows (hover intent, skip delay, focus, press, Escape) are tracked in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` ("Tooltip"); this file lists only what still looks or behaves differently.

## The follow-cursor offset moves the placement, not a transform

- **Cause:** `not ported yet` (gpuix draws `x` / `y` since #92; the slide uses them).
- **Original:** `followCursor` drives a `y` / `x` motion value on an outer box inside the positioner, so the chip is placed first and the transform moves it (`registry/base/tooltip.tsx:205-219`, `:262-269`).
- **Port:** the pointer offset goes to `<anchored offset>` (`src/components/tooltip.tsx:117-127`, `:160`), so each move re-places the layer, and the flip decision sees the offset.
- **Workaround:** the offset.
- **Fidelity:** approximated (same travel; the placement is redone per move).
- **Components it hits:** just this one.

## The trigger is wrapped in a `div`

- **Cause:** `port choice` (the wrapper hears hover, press and focus through bubbling, `src/components/tooltip.tsx:73`; there is no `render={children}` / ref merging).
- **Original:** `TooltipPrimitive.Trigger render={children}` puts the handlers on the child itself, with no extra box (`registry/base/tooltip.tsx:229-233`).
- **Port:** a `display: flex; flexShrink: 0; position: relative` wrapper around the child (`src/components/tooltip.tsx:135-148`).
- **Workaround:** none. A trigger that relied on `flex: 1`, `width: 100%` or a parent's `gap` / `:first-child` rules sees the wrapper instead of itself.
- **Fidelity:** approximated.
- **Components it hits:** every tooltip trigger (queued-stack, input-copy, input-message, color-picker).

## A string label never wraps

- **Cause:** `port choice` (reason not stated).
- **Original:** the label wraps at the room the popup has (`registry/base/tooltip.tsx:276`, no `whitespace-nowrap`).
- **Port:** `whiteSpace: "nowrap"` on the caption text (`src/components/tooltip.tsx:199-204`), so a long label flips to the far side (demo "Near the window edge", `src/demos/tooltip.tsx:150-167`) or runs off the window instead of wrapping.
- **Workaround:** none; rich content (JSX) wraps as its own text does.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Escape closes the tooltip before a dialog behind it

- **Cause:** `port choice` (settled in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` "Tooltip", the tooltip joins gpuix's dismiss-layer stack).
- **Original:** Base UI's tooltip and dialog are separate document-level listeners, so one Escape most likely closes both (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` reading; not run).
- **Port:** `<DismissableLayer onEscapeKeyDown={dismiss}>` while a hover-opened tooltip is open; a `forceOpen` one is not a layer (`src/components/tooltip.tsx:150-153`).
- **Workaround:** n/a.
- **Fidelity:** approximated (two Escapes to close both).
- **Components it hits:** dialog, mobile-drawer.

## A trigger that is several focusable controls is not handled

- **Cause:** `not ported yet`.
- **Original:** Base UI keeps a focus-opened tooltip when focus moves between elements inside one trigger (`../base-ui-solid-gpuix/BASE-UI-AUDIT.md` "Tooltip", keyboard row).
- **Port:** `onFocusOut` closes on any focus-out (`src/components/tooltip.tsx:146`, `base-ui:src/tooltip/trigger/tooltip-trigger.ts:130-133`).
- **Workaround:** none; every port trigger is one control.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Props that need CSS classes or a portal are gone

- **Cause:** `port choice` (there are no class names, and an `<anchored>` layer replaces the portal).
- **Original:** `className`, `contentClassName`, `TooltipPortalContainer`, `children: ReactElement` (`registry/base/tooltip.tsx:23-37`, `:87-107`).
- **Port:** none of them; `testId` is added and `children` is any JSX (`src/components/tooltip.tsx:71-86`). The chip cannot be restyled by a caller.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: follow-cursor areas are smaller and the y label is stacked

- **Cause:** the label is `gpuix gap` (no transforms, [README](../README.md#missing-features)); the sizes are `port choice` (reason not stated).
- **Original:** x area `h-12 w-64` = 48 x 256, y area `h-40 w-12` = 160 x 48 with `rotate-90` "Move along me" (`app/docs/tooltip/page.tsx:167`, `:172-174`).
- **Port:** 248 x 48 and 48 x 96; the y label is "Move" / "along" / "me" stacked in three lines (`src/demos/tooltip.tsx:178-179`, `:51-54`).
- **Workaround:** the stacked words.
- **Fidelity:** approximated.
- **Components it hits:** any rotated label.

## Demo: variants and layout

- **Cause:** `port choice` (the page is one `DemoCard` of `DemoRow`s plus extra test fixtures; reason not stated).
- **Original:** five sections in the order Basic, Placement, Rich Content, Follow cursor, Delay, each with a code snippet, and an API table (`app/docs/tooltip/page.tsx:119-195`).
- **Port:** all five exist (copy identical: "Save your changes", "Keyboard shortcut", "⌘ + S", "No delay", "500ms delay", "Following x" / "y"), in the order Basic, Rich content, Delay, Placement, then Follow cursor in its own card (`src/demos/tooltip.tsx:77-181`). No code snippets, no API table, no page intro. Added: a "Clicked N times, opened N" counter (`:93-95`), "Near the window edge" (`:150-167`), "Forced open" (`:182-201`), and a `TooltipProvider` around the first card (`:78`), which the source demos do not use.
- **Workaround:** n/a.
- **Fidelity:** all source variants present.
- **Components it hits:** every demo (no code snippets or API tables in any port page).
