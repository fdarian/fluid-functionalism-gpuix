# switch

Original: `registry/base/switch.tsx`, demo in `app/docs/switch/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/switch.tsx`,
demo in `src/demos/switch.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(transforms, intrinsic width, variable fonts) get a one-line entry here that links to the README row instead of
repeating it.

## Track and label colours switch instead of crossfading

- **Cause:** `not ported yet`.
- **Original:** the track has `transition-colors duration-80` (`switch.tsx:288`) and the label `transition-[color] duration-80` (`:356`), so on/off and hover ease over 80 ms.
- **Port:** `trackColor()` (`src/components/switch.tsx:140-143`, bound at `:188`) and the label colour (`:223`) change at once. gpuix transitions colours (FORK.md:816) and the port already has `colorFade` (`src/lib/theme.ts:310`, used by select and combobox), but the switch does not spread it.
- **Workaround:** none.
- **Fidelity:** dropped (the thumb still springs; only the colours snap).
- **Components it hits:** just this one. The README translation row that lists `transition-colors` as "none" is out of date.

## The thumb moves on `left` / `top`, not a transform

- **Cause:** `gpuix gap`. See the CSS transforms row in [`README.md`](../README.md#missing-features).
- **Original:** x is a motion value on a transform, y is a transform (`switch.tsx:333-340`); only width and height are layout.
- **Port:** `left`, `top`, `width` and `height` all animate (`src/components/switch.tsx:196-201`), so the track re-lays out each frame. The motion is the same.
- **Workaround:** `motion.div` on layout props.
- **Fidelity:** exact for what is seen.
- **Components it hits:** every spring that FF runs on `x` / `y`.

## Compact row is 2px taller

- **Cause:** `gpuix gap`. See the `text-box-trim` row in [`README.md`](../README.md#missing-features).
- **Original:** the label carries `[text-box:trim-both_cap_alphabetic]` (`switch.tsx:356`), so its box is about the cap height and the 16px track sets the row: 4 + 16 + 4 = 24px compact. The comment at `:354-355` says the layout does not change because the track is taller than the label.
- **Port:** the label keeps its full line box, 18px at the compact step (`src/lib/theme.ts:270`, used at `src/components/switch.tsx:32,220`), which is taller than the 16px track, so the row is 4 + 18 + 4 = 26px. Computed from the code, not measured. The default step is unaffected: its 20px line equals the 20px track (36px both). Letters also sit about half a pixel off the cap-centred position at both steps.
- **Workaround:** none.
- **Fidelity:** approximated (compact rows are 2px taller; the stack of compact switches grows by 2px each).
- **Components it hits:** any component whose layout relies on a trimmed label.

## Thumb shadow is one layer

- **Cause:** `not ported yet`.
- **Original:** `shadow-sm` on the thumb (`switch.tsx:330`), Tailwind 4's `0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)`.
- **Port:** the first layer only (`src/components/switch.tsx:207-213`). `boxShadow` takes a list (`packages/native/js/host.ts:558`), so the second layer can be added. The README rows that say gpuix paints a single shadow (and the comment at `src/lib/theme.ts:329`) are out of date.
- **Workaround:** none.
- **Fidelity:** approximated (the tighter second layer is missing).
- **Components it hits:** any port that copied a multi-layer FF shadow down to one (`shadow3()` in `src/lib/theme.ts:332`).

## Focus ring gap is not filled with the background

- **Cause:** `port choice` (reason not stated; `focusRing()` is the shared outline helper).
- **Original:** `focus-visible:ring-1 ring-[color:var(--focus-ring)] ring-offset-2 ring-offset-background` (`switch.tsx:291`): the 2px gap between track and ring is painted in the page background.
- **Port:** a 1px outline at offset 2 (`src/components/switch.tsx:191`, `focusRing` at `src/lib/theme.ts:317`); the gap shows whatever is behind the switch. On the demo card (surface 2) that is a hair lighter than the source's page background.
- **Workaround:** none.
- **Fidelity:** approximated (position and colour exact, the gap tint differs on non-page surfaces).
- **Components it hits:** every port of a `ring-offset-background` ring.

## A drag starts from the thumb's resting target, not its live position

- **Cause:** `not ported yet`. `MotionValue.get()` is available, but whether it may be read inside a press handler was not tried.
- **Original:** `originX: motionX.get()` (`switch.tsx:143-148`), so a press during a spring picks the thumb up where it is.
- **Port:** `originX: restX()` (`src/components/switch.tsx:88`), the pressed-shape target. A press that starts dragging while the thumb is still springing makes it jump to that target on the first drag frame. Visible only when pressing during a spring.
- **Workaround:** none. Listed in `BASE-UI-AUDIT.md` (Switch, "Drag starts from where the thumb is now").
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Thumb size and height snap while dragging

- **Cause:** `port choice` (reason not stated).
- **Original:** only x is written by the pointer; width, height and y keep springing on `thumbTransition ?? spring.moderate` during the drag (`switch.tsx:341-343`).
- **Port:** one `transition` for all four props, `tween.snap` while `dragX()` is set (`src/components/switch.tsx:202`). A drag that begins before the press squash (160 ms spring) has finished cuts that spring short.
- **Workaround:** none.
- **Fidelity:** approximated (a press-and-drag within about 160 ms shows the squash landing at once).
- **Components it hits:** just this one.

## Props not ported: `thumbTransition`, `className`, `ref`, HTML attributes, the size ladder

- **Cause:** `not ported yet` for `thumbTransition`, `className`, `ref` and rest props; `port choice` (reason not stated, the port has no `SizeProvider`) for the size ladder.
- **Original:** `SwitchProps` (`switch.tsx:27-39`): `thumbTransition` overrides the spring, `size` falls back to the surrounding `SizeProvider` through `useSize` (`:76`), and `className`, `ref` and the rest spread on the row (`:273`).
- **Port:** `label`, `checked`, `onToggle`, `disabled`, `size` (`"default" | "compact"`, default `"default"`) and a harness-only `testId` (`src/components/switch.tsx:41-48`). Row padding, gap and text come from `METRICS` (`:9-34`), which match `sizeMap` (px-3 / gap-2 / body 13/20 default; px-2.5 / gap-1 / 12/18 compact).
- **Workaround:** none.
- **Fidelity:** dropped for the props; exact for the two built-in sizes.
- **Components it hits:** every component with a `size` prop (nothing in the port reads a size context).

## Demo has more rows than the source page, and no code or props table

- **Cause:** `port choice` (the extra rows drive the screenshot scenarios, `src/demos/switch.tsx:71-122`); the missing chrome is `not ported yet`.
- **Original:** `app/docs/switch/page.tsx:43-62`: "Basic" (`Notifications`, stateful) and "Disabled" (`Disabled option`, off), each with a code toggle, and an API Reference props table (`:27-32`, `:64-66`). Page description "Toggle switch with animated thumb and label." (`:41`).
- **Port:** `src/demos/switch.tsx:16-66`: Basic, Disabled, plus On, Keyboard (with a "Keys on/off" caption) and Compact, which the source page does not show (its compact switch only appears through the sizes page's `SizeProvider`). No code toggle, no props table, no description.
- **Workaround:** none.
- **Fidelity:** both source variants present with the same copy; the rest is dropped.
- **Components it hits:** every demo page (the card chrome is in `src/lib/demo-kit.tsx`).
