# tooltip

Original: `registry/base/tooltip.tsx` (the docs page `app/docs/tooltip/page.tsx` imports the radix one, same API), demo in `app/docs/tooltip/page.tsx` of the source (fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/tooltip.tsx`, demo in `src/demos/tooltip.tsx`.

The Base UI behaviour rows (hover intent, skip delay, focus, press, Escape) are tracked in `base-ui:BASE-UI-AUDIT.md` ("Tooltip"); this file lists only what still looks or behaves differently.

## The trigger is wrapped in a `div`

- **Cause:** `port choice` (the wrapper hears hover, press and focus through bubbling, `src/components/tooltip.tsx:74`; there is no `render={children}` / ref merging).
- **Original:** `TooltipPrimitive.Trigger render={children}` puts the handlers on the child itself, with no extra box (`registry/base/tooltip.tsx:229-233`).
- **Port:** a `display: flex; flexShrink: 0; position: relative` wrapper around the child (`src/components/tooltip.tsx:143-156`).
- **Workaround:** none. A trigger that relied on `flex: 1`, `width: 100%` or a parent's `gap` / `:first-child` rules sees the wrapper instead of itself.
- **Fidelity:** approximated.
- **Components it hits:** every tooltip trigger (queued-stack, input-copy, input-message, color-picker).

## A string label never wraps

- **Cause:** `port choice` (reason not stated).
- **Original:** the label wraps at the room the popup has (`registry/base/tooltip.tsx:276`, no `whitespace-nowrap`).
- **Port:** `whiteSpace: "nowrap"` on the caption text (`src/components/tooltip.tsx:215-221`), so a long label flips to the far side (demo "Near the window edge", `src/demos/tooltip.tsx:143-160`) or runs off the window instead of wrapping.
- **Workaround:** none; rich content (JSX) wraps as its own text does.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Escape closes the tooltip before a dialog behind it

- **Cause:** `port choice` (settled in `base-ui:BASE-UI-AUDIT.md` "Tooltip", the tooltip joins gpuix's dismiss-layer stack).
- **Original:** Base UI's tooltip and dialog are separate document-level listeners, so one Escape most likely closes both (`base-ui:BASE-UI-AUDIT.md` reading; not run).
- **Port:** `<DismissableLayer onEscapeKeyDown={dismiss}>` while a hover-opened tooltip is open; a `forceOpen` one is not a layer (`src/components/tooltip.tsx:158-161`).
- **Workaround:** n/a.
- **Fidelity:** approximated (two Escapes to close both).
- **Components it hits:** dialog, mobile-drawer.

## A trigger that is several focusable controls is not handled

- **Cause:** `not ported yet`.
- **Original:** Base UI keeps a focus-opened tooltip when focus moves between elements inside one trigger (`base-ui:BASE-UI-AUDIT.md` "Tooltip", keyboard row).
- **Port:** `onFocusOut` closes on any focus-out (`src/components/tooltip.tsx:154`, `base-ui:src/tooltip/trigger/tooltip-trigger.ts:130-133`).
- **Workaround:** none; every port trigger is one control.
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Props that need CSS classes or a portal are gone

- **Cause:** `port choice` (there are no class names, and an `<anchored>` layer replaces the portal).
- **Original:** `className`, `contentClassName`, `TooltipPortalContainer`, `children: ReactElement` (`registry/base/tooltip.tsx:23-37`, `:87-107`).
- **Port:** none of them; `testId` is added and `children` is any JSX (`src/components/tooltip.tsx:72-87`). The chip cannot be restyled by a caller.
- **Workaround:** n/a.
- **Fidelity:** dropped.
- **Components it hits:** just this one.

## Demo: follow-cursor areas are smaller

- **Cause:** `port choice` (reason not stated).
- **Original:** x area `h-12 w-64` = 48 x 256, y area `h-40 w-12` = 160 x 48 with `rotate-90` "Move along me" (`app/docs/tooltip/page.tsx:167`, `:172-174`).
- **Port:** 248 x 48 and 48 x 96 (`src/demos/tooltip.tsx:172-173`); the y label is "Move along me" turned with `rotate: '90deg'` and `whiteSpace: 'nowrap'`, as the source (`src/demos/tooltip.tsx:45-56`, `scripts/check-tooltip.tsx`).
- **Workaround:** none.
- **Fidelity:** approximated (area sizes).
- **Components it hits:** just this one.

## Demo: variants and layout

- **Cause:** `port choice` (the page is one `DemoCard` of `DemoRow`s plus extra test fixtures; reason not stated).
- **Original:** five sections in the order Basic, Placement, Rich Content, Follow cursor, Delay, each with a code snippet, and an API table (`app/docs/tooltip/page.tsx:119-195`).
- **Port:** all five exist (copy identical: "Save your changes", "Keyboard shortcut", "⌘ + S", "No delay", "500ms delay", "Following x" / "y"), in the order Basic, Rich content, Delay, Placement, then Follow cursor in its own card (`src/demos/tooltip.tsx:70-174`). No code snippets, no API table, no page intro. Added: a "Clicked N times, opened N" counter (`:86-88`), "Near the window edge" (`:143-160`), "Forced open" (`:175-194`), and a `TooltipProvider` around the first card (`:71`), which the source demos do not use.
- **Workaround:** n/a.
- **Fidelity:** all source variants present.
- **Components it hits:** every demo (no code snippets or API tables in any port page).
