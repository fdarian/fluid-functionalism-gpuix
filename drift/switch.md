# switch

Original: `registry/base/switch.tsx`, demo in `app/docs/switch/page.tsx` of the source
(fluidfunctionalism.com at 0a0377e, kept at `~/.claude/notes/ff-source/`). Ported in `src/components/switch.tsx`,
demo in `src/demos/switch.tsx`.

One entry per place the port looks or behaves differently from the source, whatever the cause. Shared gpuix gaps
(CSS transforms, selector `:has(.x)` and group-has, collapsed-border transitions) get a one-line entry here that links to the README row instead of
repeating it.

## The thumb moves on `left` / `top`, not a transform

- **Cause:** `gpuix gap`. See the CSS transforms row in [`README.md`](../README.md#missing-features).
- **Original:** x is a motion value on a transform, y is a transform (`switch.tsx:333-340`); only width and height are layout.
- **Port:** `left`, `top`, `width` and `height` all animate (`src/components/switch.tsx:159-197`), so the track re-lays out each frame. The motion is the same. Two layers carry it, because reduced motion treats them differently on the web: the source slides x with `animate()` on a motion value, which `MotionConfig` leaves springing, while its width, height and y jump. The outer layer (`left`) sits in a `reducedMotion="never"` config and the inner one (`top`, `width`, `height`) goes back to `"user"`.
- **Workaround:** `motion.div` on layout props.
- **Fidelity:** exact for what is seen.
- **Components it hits:** every spring that FF runs on `x` / `y`.

## Focus ring gap is not filled with the background

- **Cause:** `port choice` (reason not stated; `focusRing()` is the shared outline helper).
- **Original:** `focus-visible:ring-1 ring-[color:var(--focus-ring)] ring-offset-2 ring-offset-background` (`switch.tsx:291`): the 2px gap between track and ring is painted in the page background.
- **Port:** a 1px outline at offset 2 (`src/components/switch.tsx:156`, `focusRing` at `src/lib/theme.ts:546`); the gap shows whatever is behind the switch. On the demo card (surface 2) that is a hair lighter than the source's page background.
- **Workaround:** none.
- **Fidelity:** approximated (position and colour exact, the gap tint differs on non-page surfaces).
- **Components it hits:** every port of a `ring-offset-background` ring.

## A drag starts from the thumb's resting target, not its live position

- **Cause:** `not ported yet`. `MotionValue.get()` is available, but whether it may be read inside a press handler was not tried.
- **Original:** `originX: motionX.get()` (`switch.tsx:143-148`), so a press during a spring picks the thumb up where it is.
- **Port:** `originX: restX()` (`base-ui:src/switch/thumb/switch-thumb.ts:37`, fed by `restX` at `src/components/switch.tsx:83-86`), the pressed-shape target. A press that starts dragging while the thumb is still springing makes it jump to that target on the first drag frame. Visible only when pressing during a spring.
- **Workaround:** none. Listed in `../base-ui-solid-gpuix/BASE-UI-AUDIT.md` (Switch, "Drag starts from where the thumb is now").
- **Fidelity:** approximated.
- **Components it hits:** just this one.

## Props not ported: `thumbTransition`, `className`, `ref`, HTML attributes

- **Cause:** `not ported yet`.
- **Original:** `SwitchProps` (`switch.tsx:27-39`): `thumbTransition` overrides the spring, `className`, `ref` and the rest spread on the row (`:273`).
- **Port:** `label`, `checked`, `onToggle`, `disabled`, `size` (`"default" | "compact"`, default the Size row) and a harness-only `testId` (`src/components/switch.tsx:53-62`). Row padding, gap and text come from `METRICS` (`:21-46`), which match `sizeMap` (px-3 / gap-2 / body 13/20 default; px-2.5 / gap-1 / 12/18 compact).
- **Workaround:** none.
- **Fidelity:** dropped for the props; exact for the two built-in sizes.
- **Components it hits:** every ported component.

## Demo has more rows than the source page, and no code or props table

- **Cause:** `port choice` (the extra rows drive the screenshot scenarios, `src/demos/switch.tsx:79-129`); the missing chrome is `not ported yet`.
- **Original:** `app/docs/switch/page.tsx:43-62`: "Basic" (`Notifications`, stateful) and "Disabled" (`Disabled option`, off), each with a code toggle, and an API Reference props table (`:27-32`, `:64-66`). Page description "Toggle switch with animated thumb and label." (`:41`).
- **Port:** `src/demos/switch.tsx:16-73`: Basic, Disabled, plus On, Keyboard (with a "Keys on/off" caption) and Compact, which the source page does not show (its compact switch only appears through the sizes page's `SizeProvider`). No code toggle, no props table, no description.
- **Workaround:** none.
- **Fidelity:** both source variants present with the same copy; the rest is dropped.
- **Components it hits:** every demo page (the card chrome is in `src/lib/demo-kit.tsx`).
